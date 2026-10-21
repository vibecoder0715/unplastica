"""Deep stress test for the Unplastica habit-verification model.

READ-ONLY contract
-------------------
This script never writes to `ml/model/best.pt`, `ml/model/model.onnx`,
`apps/web/public/model/model.onnx` or anything under `ml/data/`.
Every artefact lands in `ml/stress_report/`.

Test batteries
--------------
A. Provenance & serving parity (PyTorch vs ONNX, class order, thresholds)
B. Data-leakage audit (exact SHA-256 + perceptual dHash near-duplicates)
C. Generalisation on every split + freshly fetched unseen positives
D. Calibration (ECE / NLL / confidence histogram)
E. Robustness under real phone-camera conditions
F. OOD false-approval rate (the security metric that decides the award)
G. Adversarial capability (PGD + optimisable patch / "sticker" attack)
H. Threshold sweep (utility vs false-approval trade-off)
I. Serving-path audit (code-level threshold drift, class order, mock scorer)
J. Determinism & resampling sensitivity

Usage:
    python ml/stress_test.py --battery all
    python ml/stress_test.py --battery a,b,c --fresh-per-class 40
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from collections import defaultdict
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))

from stress_lib import (  # noqa: E402
    CATEGORIES,
    HABITS,
    IMAGENET_MEAN,
    IMAGENET_STD,
    REPO_ROOT,
    REPORT_DIR,
    confusion_matrix,
    dhash,
    download_image,
    expected_calibration_error,
    fetch_fresh_images,
    hamming,
    image_paths,
    load_checkpoint,
    negative_log_likelihood,
    per_class_metrics,
    perturb,
    predict_probs,
    sha256_file,
    to_tensor_batch,
    wikimedia_urls,
    wilson_interval,
)

MODEL_PT = REPO_ROOT / "ml" / "model" / "best.pt"
MODEL_ONNX = REPO_ROOT / "ml" / "model" / "model.onnx"
MODEL_ONNX_WEB = REPO_ROOT / "apps" / "web" / "public" / "model" / "model.onnx"

# Fresh, never-trained-on positive queries per habit (generalisation probe).
FRESH_POSITIVE_QUERIES = {
    "beeswax_food_wraps": ["beeswax wrap cloth kitchen", "food wrap beeswax sandwich",
                           "wax cloth reusable bread", "beeswax food wrap roll"],
    "box_cutlery": ["metal lunch box food", "bento box japanese", "tiffin carrier steel",
                    "reusable cutlery set spoon", "steel food container lunch"],
    "bulk_pantry_refill": ["glass jar filled grains", "pantry jars shelf kitchen", "bulk beans container",
                           "rice jar kitchen counter", "dried food storage jars"],
    "greenery_furniture": ["potted plant on table", "houseplant in pot", "fern plant indoors",
                           "plant pot windowsill", "small green plant pot"],
    "handicraft_projects": ["woven basket handmade", "macrame wall hanging", "knitted textile craft",
                            "handmade ceramic bowl pottery", "handwoven rug"],
    "recycle_bags": ["tote bag cotton", "jute shopping bag", "canvas bag market",
                     "string net bag produce", "reusable cloth bag"],
    "self_bottle_refill": ["stainless steel water bottle", "metal flask outdoors", "insulated tumbler",
                           "refill water bottle", "vacuum flask drink"],
}

# Out-of-distribution negatives: none of these are habit proofs.
OOD_QUERIES = [
    "Hu Tao", "Genshin Impact character", "anime character illustration", "anime wallpaper art",
    "manga panel drawing", "cosplay convention costume", "cartoon character", "video game screenshot",
    "comic book cover", "digital art painting", "illustration fantasy girl", "character design art",
    "sticker sheet", "graffiti wall art", "tattoo art design", "stained glass window",
    "plastic drink bottle disposable", "plastic carrier bag supermarket", "styrofoam food container",
    "aluminium drink can", "instant noodles packet", "paper food tray", "wrapping paper roll",
    "portrait selfie person", "family photo", "kitten cat", "golden retriever puppy",
    "pizza slice food", "birthday cake", "coffee cup paper", "cooked dinner plate",
    "city street traffic", "car vehicle road", "airplane sky", "mountain landscape", "beach sunset",
    "computer desktop", "printed document letter", "paper receipt", "hand writing notebook",
    "soccer match stadium", "concert crowd stage", "graduation ceremony", "office meeting people",
    "book open pages", "chalkboard mathematics", "whiteboard diagram", "motorcycle riding",
    "sneaker shoes", "wrist watch", "wallet money", "house keys", "screwdriver tools",
    "hammer toolbox", "paint brush art", "notebook pen desk", "library books shelf",
    "sewing machine", "makeup cosmetics", "hairdresser scissors", "dentist clinic",
    "skateboard park", "surfboard beach", "guitar musician", "camera photograph tripod",
]

FRESH_PER_CLASS_DEFAULT = 40
OOD_TARGET_DEFAULT = 120


def _now() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


def _pct(x: float) -> float:
    return round(100.0 * x, 3)


# ==========================================================================
# A. Provenance & serving parity
# ==========================================================================
def battery_a(model, classes, meta) -> dict:
    out: dict = {"checkpoint": meta, "class_order": classes,
                 "class_order_matches_app": classes == CATEGORIES}

    pt_bytes = MODEL_PT.read_bytes()
    out["best_pt_sha256"] = __import__("hashlib").sha256(pt_bytes).hexdigest()
    out["best_pt_bytes"] = len(pt_bytes)
    for name, path in (("ml/model/model.onnx", MODEL_ONNX),
                       ("apps/web/public/model/model.onnx", MODEL_ONNX_WEB)):
        if path.is_file():
            data = path.read_bytes()
            out.setdefault("onnx", {})[name] = {
                "sha256": __import__("hashlib").sha256(data).hexdigest(),
                "bytes": len(data),
            }
    if "onnx" in out and len(out["onnx"]) == 2:
        hashes = {v["sha256"] for v in out["onnx"].values()}
        out["onnx_web_matches_ml"] = len(hashes) == 1
    else:
        out["onnx_web_matches_ml"] = False

    # ONNX vs PyTorch numerical parity on real images.
    try:
        import onnxruntime as ort

        sess = ort.InferenceSession(str(MODEL_ONNX), providers=["CPUExecutionProvider"])
        in_name = sess.get_inputs()[0].name
        out_name = sess.get_outputs()[0].name
        out["onnx_input"] = {"name": in_name, "shape": sess.get_inputs()[0].shape}
        out["onnx_output"] = {"name": out_name, "shape": sess.get_outputs()[0].shape}

        probe_files = []
        for cls in CATEGORIES:
            d = REPO_ROOT / "ml" / "data" / "evals" / cls
            probe_files.extend(image_paths(d)[:4])
        images = []
        for p in probe_files:
            with Image.open(p) as im:
                images.append(im.convert("RGB"))
        x = to_tensor_batch(images).numpy()
        onnx_logits = sess.run([out_name], {in_name: x})[0]
        with torch.inference_mode():
            pt_logits = model(torch.from_numpy(x)).numpy()
        max_abs = float(np.max(np.abs(onnx_logits - pt_logits)))
        argmax_agree = float(np.mean(onnx_logits.argmax(1) == pt_logits.argmax(1)))
        out["onnx_parity"] = {"images": len(images), "max_abs_logit_delta": max_abs,
                              "argmax_agreement": argmax_agree}
    except Exception as exc:
        out["onnx_parity"] = {"error": str(exc)}

    return out


# ==========================================================================
# B. Data-leakage audit
# ==========================================================================
def _hash_index(paths):
    idx = []
    for p in paths:
        try:
            with Image.open(p) as im:
                h = dhash(im)
            idx.append((p, h))
        except Exception:
            continue
    return idx


def battery_b() -> dict:
    splits = {
        "train": REPO_ROOT / "ml" / "data" / "train",
        "val": REPO_ROOT / "ml" / "data" / "val",
        "evals": REPO_ROOT / "ml" / "data" / "evals",
        "test_50_mixed": REPO_ROOT / "ml" / "test_50_mixed",
        "test_300_suite": REPO_ROOT / "ml" / "test_300_suite",
        "test_adversarial": REPO_ROOT / "ml" / "test_adversarial",
    }
    files = {k: image_paths(v) for k, v in splits.items()}

    sha = {k: {sha256_file(p): p for p in v} for k, v in files.items()}
    train_sha = set(sha["train"])
    result = {"split_sizes": {k: len(v) for k, v in files.items()}}

    exact = {}
    for name, mapping in sha.items():
        if name == "train":
            continue
        overlap = sorted(set(mapping) & train_sha)
        exact[name] = {"exact_sha256_overlap_with_train": len(overlap),
                       "examples": [str(sha[name][h].relative_to(REPO_ROOT)) for h in overlap[:10]]}
    result["exact_duplicates"] = exact

    # Perceptual near-duplicate audit (dHash Hamming distance).
    train_idx = _hash_index(files["train"])
    train_hashes = [h for _, h in train_idx]
    train_sha_by_hash = defaultdict(list)
    for p, h in train_idx:
        train_sha_by_hash[h].append(p)

    near = {}
    for name in ("evals", "test_50_mixed", "test_300_suite"):
        idx = _hash_index(files[name])
        dup10 = dup16 = 0
        worst_examples = []
        for p, h in idx:
            best = 64
            for th in train_hashes:
                d = hamming(h, th)
                if d < best:
                    best = d
                    if best == 0:
                        break
            if best <= 10:
                dup10 += 1
            if best <= 16:
                dup16 += 1
            if best <= 10 and len(worst_examples) < 8:
                worst_examples.append({"file": str(p.relative_to(REPO_ROOT)),
                                       "nearest_train_hamming": best})
        near[name] = {"images_checked": len(idx),
                      "near_duplicate_hamming_le_10": dup10,
                      "near_duplicate_hamming_le_16": dup16,
                      "near_duplicate_rate_le_10": _pct(dup10 / max(1, len(idx))),
                      "examples": worst_examples}
    result["perceptual_near_duplicates_vs_train"] = near
    return result


# ==========================================================================
# C. Generalisation
# ==========================================================================
def _eval_paths(paths_by_class: dict[str, list[Path]], model, classes):
    flat_paths, flat_true = [], []
    for cls, paths in paths_by_class.items():
        for p in paths:
            flat_paths.append(p)
            flat_true.append(classes.index(cls))
    images = []
    for p in flat_paths:
        with Image.open(p) as im:
            images.append(im.convert("RGB"))
    probs = predict_probs(model, images)
    pred = probs.argmax(1)
    true = np.array(flat_true)
    return flat_paths, probs, true, pred


def _summary_for(true, pred, probs, classes, threshold):
    cm = confusion_matrix(true, pred, len(classes))
    metrics = per_class_metrics(cm, classes)
    correct = int((true == pred).sum())
    n = len(true)
    # Habit-level false approvals: model says habit H with p>=thr on a non-H image.
    fp_per_habit = {}
    for h in HABITS:
        hi = classes.index(h)
        mask = (pred == hi) & (probs[:, hi] >= threshold)
        fp = int((mask & (true != hi)).sum())
        tp = int((mask & (true == hi)).sum())
        fn = int(((true == hi) & ~((pred == hi) & (probs[:, hi] >= threshold))).sum())
        fp_per_habit[h] = {"tp": tp, "fp": fp, "fn": fn,
                           "precision": tp / (tp + fp) if (tp + fp) else 0.0,
                           "recall": tp / (tp + fn) if (tp + fn) else 0.0}
    false_approvals = int(sum(v["fp"] for v in fp_per_habit.values()))
    # "other" images approved as some habit
    oi = classes.index("other")
    other_mask = true == oi
    other_false_approved = int(((pred != oi) & (probs.max(1) >= threshold) & other_mask).sum())
    return {
        "n": n,
        "accuracy": _pct(correct / max(1, n)),
        "correct": correct,
        "threshold": threshold,
        "false_approvals_total": false_approvals,
        "other_class_images_false_approved": other_false_approved,
        "other_class_images": int(other_mask.sum()),
        "per_class": {k: {kk: (round(vv, 4) if isinstance(vv, float) else vv)
                          for kk, vv in v.items()} for k, v in metrics.items()},
        "per_habit_binary": fp_per_habit,
        "confusion_matrix": cm.tolist(),
    }


def battery_c(model, classes, fresh_per_class: int) -> dict:
    out: dict = {}

    eval_dirs = {
        "evals": REPO_ROOT / "ml" / "data" / "evals",
        "test_50_mixed": REPO_ROOT / "ml" / "test_50_mixed",
        "test_300_suite": REPO_ROOT / "ml" / "test_300_suite",
    }
    for name, root in eval_dirs.items():
        by_class = {}
        for cls in CATEGORIES:
            d = root / cls
            by_class[cls] = image_paths(d) if d.is_dir() else []
        if not any(by_class.values()):
            continue
        paths, probs, true, pred = _eval_paths(by_class, model, classes)
        out[name] = _summary_for(true, pred, probs, classes, 0.85)
        out[name]["per_class"] = {k: v for k, v in out[name]["per_class"].items()}

    # Fresh positives fetched from the web at test time (never in training).
    fresh: dict[str, list[Path]] = {}
    for cls, queries in FRESH_POSITIVE_QUERIES.items():
        got = fetch_fresh_images(queries, f"fresh_pos_{cls}", fresh_per_class)
        fresh[cls] = [p for p, _ in got]
    if fresh:
        paths, probs, true, pred = _eval_paths(fresh, model, classes)
        out["fresh_web_positives"] = _summary_for(true, pred, probs, classes, 0.85)
        out["fresh_web_positives"]["note"] = (
            "Images downloaded from Wikimedia Commons at stress-test time; "
            "SHA-256/perceptual de-duplication against ml/data/train applied.")
    return out


# ==========================================================================
# D. Calibration
# ==========================================================================
def battery_d(model, classes) -> dict:
    by_class = {cls: image_paths(REPO_ROOT / "ml" / "data" / "evals" / cls) for cls in CATEGORIES}
    paths, probs, true, pred = _eval_paths(by_class, model, classes)
    ece, buckets = expected_calibration_error(probs, true)
    conf = probs.max(1)
    return {
        "split": "ml/data/evals",
        "n": len(true),
        "accuracy": _pct(float((true == pred).mean())),
        "ece_15_bins": round(ece, 4),
        "nll": round(negative_log_likelihood(probs, true), 4),
        "mean_confidence": round(float(conf.mean()), 4),
        "median_confidence": round(float(np.median(conf)), 4),
        "fraction_confident_above_0_99": _pct(float((conf >= 0.99).mean())),
        "fraction_confident_above_0_999": _pct(float((conf >= 0.999).mean())),
        "mean_confidence_when_wrong": round(float(conf[true != pred].mean()), 4) if int((true != pred).sum()) else None,
        "n_wrong": int((true != pred).sum()),
        "buckets": buckets,
    }


# ==========================================================================
# E. Robustness
# ==========================================================================
ROBUSTNESS_CASES = [
    ("identity", None),
    ("phone_chain", None),
    ("jpeg", 70),
    ("jpeg", 40),
    ("jpeg", 15),
    ("downscale", 0.5),
    ("downscale", 0.25),
    ("brightness", 0.6),
    ("brightness", 1.5),
    ("contrast", 0.6),
    ("saturation", 0.0),
    ("saturation", 2.0),
    ("rotate", 12),
    ("rotate", 25),
    ("blur", 2.0),
    ("noise", 0.05),
    ("noise", 0.12),
    ("grayscale", None),
    ("crop", 0.6),
    ("pad_letterbox", None),
]


def battery_e(model, classes) -> dict:
    by_class = {cls: image_paths(REPO_ROOT / "ml" / "data" / "evals" / cls) for cls in CATEGORIES}
    by_class_mixed = {cls: image_paths(REPO_ROOT / "ml" / "test_50_mixed" / cls) for cls in CATEGORIES}
    for cls, paths in by_class_mixed.items():
        if paths:
            by_class[cls] = by_class.get(cls, []) + paths
    paths, probs0, true, pred0 = _eval_paths(by_class, model, classes)
    base_correct = (true == pred0)

    results = []
    flip_count = 0
    for kind, param in ROBUSTNESS_CASES:
        images = []
        for p in paths:
            with Image.open(p) as im:
                images.append(perturb(im, kind, param, seed=abs(hash(p.name)) % 100000))
        probs = predict_probs(model, images)
        pred = probs.argmax(1)
        conf = probs.max(1)
        correct = (true == pred)
        # A prediction that stays in the same class but drops below the award threshold.
        still_right_but_unawardable = (correct & (conf < 0.85)).sum()
        # A prediction that moves to a DIFFERENT habit class and is awardable:
        # the user simply claims that habit instead -> false approval.
        wrong_habit = np.zeros_like(correct)
        for i, (t, p_) in enumerate(zip(true, pred)):
            if t != p_ and classes[p_] != "other" and conf[i] >= 0.85:
                wrong_habit[i] = True
        results.append({
            "perturbation": kind,
            "param": param,
            "accuracy": _pct(float(correct.mean())),
            "accuracy_drop_pp": round(_pct(float(base_correct.mean())) - _pct(float(correct.mean())), 3),
            "mean_confidence": round(float(conf.mean()), 4),
            "still_correct_but_below_0.85": int(still_right_but_unawardable),
            "awarded_to_wrong_habit": int(wrong_habit.sum()),
            "false_approval_rate": _pct(float(wrong_habit.mean())),
        })
        flip_count += int(wrong_habit.sum())

    return {
        "n_images": len(paths),
        "baseline_accuracy": _pct(float(base_correct.mean())),
        "cases": results,
        "worst_accuracy": min(r["accuracy"] for r in results),
        "total_awardable_misclassifications": flip_count,
    }


# @@PART2@@
