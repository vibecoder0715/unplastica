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
    training_hashes,
    wikimedia_urls,
    wilson_interval,
)

MODEL_PT = REPO_ROOT / "ml" / "model" / "best.pt"
MODEL_ONNX = REPO_ROOT / "ml" / "model" / "model.onnx"
MODEL_ONNX_WEB = REPO_ROOT / "apps" / "web" / "public" / "model" / "model.onnx"

# Fresh, never-trained-on positive queries per habit (generalisation probe).
FRESH_POSITIVE_QUERIES = {
    "beeswax_food_wraps": ["beeswax wrap", "beeswax wraps food", "wax wrap food",
                           "beeswax paper cloth", "food wrap beeswax sandwich", "beeswax food wrap roll"],
    "box_cutlery": ["metal lunch box food", "bento box japanese", "tiffin carrier steel",
                    "reusable cutlery set spoon", "steel food container lunch"],
    "bulk_pantry_refill": ["glass jar filled grains", "pantry jars shelf kitchen", "bulk beans container",
                           "rice jar kitchen counter", "dried food storage jars", "jars of food storage"],
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
def battery_a(model, classes, meta, model_path: Path | None = None,
              onnx_path: Path | None = None) -> dict:
    model_path = model_path or MODEL_PT
    onnx_path = onnx_path or MODEL_ONNX
    out: dict = {"checkpoint": meta, "class_order": classes,
                 "class_order_matches_app": classes == CATEGORIES,
                 "model_path": str(model_path)}

    pt_bytes = model_path.read_bytes()
    out["best_pt_sha256"] = __import__("hashlib").sha256(pt_bytes).hexdigest()
    out["best_pt_bytes"] = len(pt_bytes)
    for name, path in ((str(onnx_path), onnx_path),
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

        sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
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
        # The shipped ONNX has a FIXED batch dim of 1, so run one image at a time.
        onnx_logits = np.concatenate(
            [sess.run([out_name], {in_name: x[i:i + 1]})[0] for i in range(len(images))], axis=0)
        with torch.inference_mode():
            pt_logits = model(torch.from_numpy(x)).numpy()
        max_abs = float(np.max(np.abs(onnx_logits - pt_logits)))
        argmax_agree = float(np.mean(onnx_logits.argmax(1) == pt_logits.argmax(1)))
        out["onnx_parity"] = {"images": len(images), "max_abs_logit_delta": max_abs,
                              "argmax_agreement": argmax_agree,
                              "onnx_batch_dim_fixed_to_1": True}
        if argmax_agree < 1.0:
            out["onnx_parity"]["note"] = (
                "ONNX and best.pt DISAGREE on at least one image: the deployed "
                "browser model is not the checkpoint in ml/model/best.pt.")
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

    # Effective dataset size: how many DISTINCT scenes does each split really
    # contain? A split of N augmented copies of k base photos is not N samples.
    def distinct_scenes(paths: list[Path], thr: int = 10) -> tuple[int, int, list[int]]:
        reps: list[list] = []
        for p in paths:
            try:
                with Image.open(p) as im:
                    h = dhash(im)
            except Exception:
                continue
            for rep in reps:
                if hamming(h, rep[0]) <= thr:
                    rep[1] += 1
                    break
            else:
                reps.append([h, 1])
        sizes = sorted((r[1] for r in reps), reverse=True)
        return len(paths), len(reps), sizes[:5]

    diversity = {}
    for name, paths in files.items():
        per_class = {}
        total_n = total_scenes = 0
        for cls in CATEGORIES:
            cls_paths = [p for p in paths if p.parent.name == cls]
            if not cls_paths:
                continue
            n, scenes, biggest = distinct_scenes(cls_paths)
            total_n += n
            total_scenes += scenes
            per_class[cls] = {"images": n, "distinct_scenes": scenes,
                              "duplication_factor": round(n / max(1, scenes), 2),
                              "largest_identical_cluster": biggest[0] if biggest else 0}
        diversity[name] = {"images": total_n, "distinct_scenes": total_scenes,
                           "duplication_factor": round(total_n / max(1, total_scenes), 2),
                           "per_class": per_class}
    result["effective_diversity"] = diversity
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
    train_hashes = training_hashes()
    fresh: dict[str, list[Path]] = {}
    titles: dict[str, str] = {}
    for cls, queries in FRESH_POSITIVE_QUERIES.items():
        got = fetch_fresh_images(queries, f"fresh_pos_{cls}", fresh_per_class,
                                 dedup_hashes=train_hashes)
        fresh[cls] = [p for p, _ in got]
        for p, title in got:
            titles[f"{cls}/{p.name}"] = title
    if fresh:
        paths, probs, true, pred = _eval_paths(fresh, model, classes)
        summary = _summary_for(true, pred, probs, classes, 0.85)
        summary["note"] = (
            "Images downloaded from Wikimedia Commons at stress-test time. "
            "Perceptual de-duplication against ml/data/train applied (dHash "
            "Hamming <= 10 discarded), so none of these are training photos.")
        # Auditable per-file errors with the Wikimedia title, so the ground truth
        # labels can be checked by a human.
        errors = []
        conf = probs.max(axis=1)
        for i, (p, t, pr) in enumerate(zip(paths, true, pred)):
            if int(t) != int(pr):
                errors.append({
                    "file": str(p.relative_to(REPO_ROOT)),
                    "true_label": classes[int(t)],
                    "predicted_label": classes[int(pr)],
                    "confidence": round(float(conf[i]), 4),
                    "wikimedia_title": titles.get(f"{classes[int(t)]}/{p.name}", ""),
                })
        summary["errors"] = errors
        out["fresh_web_positives"] = summary
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
            # The metric that actually matters in the field: of the images the model
            # still classifies correctly, how many are still ABOVE the award
            # threshold? A correct-but-unawardable photo is a rejected real user.
            "awardable_recall_pct": _pct(float((correct & (conf >= 0.85)).sum()) /
                                         max(1.0, float(correct.sum()))),
            "awardable_photos": int((correct & (conf >= 0.85)).sum()),
        })
        flip_count += int(wrong_habit.sum())

    return {
        "n_images": len(paths),
        "baseline_accuracy": _pct(float(base_correct.mean())),
        "cases": results,
        "worst_accuracy": min(r["accuracy"] for r in results),
        "total_awardable_misclassifications": flip_count,
    }


# ==========================================================================
# F. OOD false-approval rate
# ==========================================================================
def battery_f(model, classes, ood_target: int, threshold: float = 0.85) -> dict:
    got = fetch_fresh_images(OOD_QUERIES, "ood", ood_target)
    paths = [p for p, _ in got]
    if not paths:
        return {"error": "no OOD images could be fetched"}

    images = []
    for p in paths:
        with Image.open(p) as im:
            images.append(im.convert("RGB"))
    probs = predict_probs(model, images)
    pred = probs.argmax(1)
    conf = probs.max(1)

    per_class_counts = defaultdict(int)
    for p, tag in got:
        per_class_counts[tag] += 1

    fp_per_habit = {}
    for h in HABITS:
        hi = classes.index(h)
        mask = (pred == hi) & (probs[:, hi] >= threshold)
        fp_per_habit[h] = {"false_approvals": int(mask.sum()),
                           "rate_pct": _pct(float(mask.mean())),
                           "mean_conf_when_fired": round(float(probs[mask, hi].mean()), 4) if int(mask.sum()) else None}

    oi = classes.index("other")
    other_mask = (pred == oi)
    approved_mask = (conf >= threshold) & (pred != oi)
    worst = []
    for i, p in enumerate(paths):
        if approved_mask[i]:
            worst.append({"file": str(p.relative_to(REPO_ROOT)),
                          "predicted": classes[pred[i]],
                          "confidence": round(float(conf[i]), 4)})
    worst.sort(key=lambda r: -r["confidence"])

    return {
        "n_ood_images": len(paths),
        "threshold": threshold,
        "predicted_as_other": _pct(float(other_mask.mean())),
        "false_approval_rate_any_habit": _pct(float(approved_mask.mean())),
        "false_approval_count": int(approved_mask.sum()),
        "wilson_95ci_false_approval_rate": [round(x, 5) for x in wilson_interval(int(approved_mask.sum()), len(paths))],
        "mean_confidence_on_ood": round(float(conf.mean()), 4),
        "per_habit_false_approvals": fp_per_habit,
        "ood_source_queries": dict(per_class_counts),
        "false_approval_examples": worst[:40],
    }


# ==========================================================================
# G. Adversarial capability
# ==========================================================================
def _denorm(x: torch.Tensor) -> torch.Tensor:
    mean = torch.tensor(IMAGENET_MEAN).view(1, 3, 1, 1)
    std = torch.tensor(IMAGENET_STD).view(1, 3, 1, 1)
    return x * std + mean


def _norm(x: torch.Tensor) -> torch.Tensor:
    mean = torch.tensor(IMAGENET_MEAN).view(1, 3, 1, 1)
    std = torch.tensor(IMAGENET_STD).view(1, 3, 1, 1)
    return (x - mean) / std


def pgd_attack(model, images: list[Image.Image], target_idx: int,
               eps: float = 8 / 255, alpha: float = 2 / 255, steps: int = 20) -> tuple[list[Image.Image], np.ndarray]:
    """Targeted PGD in pixel space (Linfinity). The attacker only needs to
    choose which habit to claim - the target class is therefore free."""
    base = torch.stack([
        torch.from_numpy(np.asarray(im.convert("RGB").resize((224, 224)), dtype=np.float32) / 255.0)
        for im in images
    ]).permute(0, 3, 1, 2)
    x = base.clone()
    target = torch.full((x.size(0),), int(target_idx), dtype=torch.long)
    for _ in range(steps):
        x.requires_grad_(True)
        logits = model(_norm(x))
        loss = F.cross_entropy(logits, target)
        grad = torch.autograd.grad(loss, x)[0]
        x = x.detach() - alpha * grad.sign()
        x = torch.clamp(x, base - eps, base + eps)
        x = x.detach()
    adv = [(x[i].permute(1, 2, 0).numpy() * 255.0).clip(0, 255).astype(np.uint8) for i in range(x.size(0))]
    return [Image.fromarray(a) for a in adv], x


def patch_attack(model, images: list[Image.Image], target_idx: int,
                 patch: int = 40, steps: int = 60, lr: float = 0.05) -> tuple[list[Image.Image], np.ndarray]:
    """Optimisable 'sticker' attack: a small square pasted on a photo, optimised
    so the model awards the chosen habit. This is the realistic threat model for
    a photo-proof system (print a sticker, hold it next to the camera)."""
    base = torch.stack([
        torch.from_numpy(np.asarray(im.convert("RGB").resize((224, 224)), dtype=np.float32) / 255.0)
        for im in images
    ]).permute(0, 3, 1, 2)
    patch_param = torch.zeros(1, 3, patch, patch, requires_grad=True)
    optimizer = torch.optim.Adam([patch_param], lr=lr)
    positions = [(12, 12), (180, 12), (12, 180), (180, 180), (92, 92), (12, 92), (180, 92), (92, 12)]
    for i, _ in enumerate(images):
        px, py = positions[i % len(positions)]
        for _ in range(steps):
            canvas = base[i:i + 1].clone()
            canvas[:, :, py:py + patch, px:px + patch] = patch_param
            logits = model(_norm(canvas))
            loss = F.cross_entropy(logits, torch.tensor([int(target_idx)]))
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            with torch.no_grad():
                patch_param.clamp_(0.0, 1.0)
    out = []
    for i, _ in enumerate(images):
        px, py = positions[i % len(positions)]
        canvas = base[i:i + 1].clone()
        canvas[:, :, py:py + patch, px:px + patch] = patch_param.detach()
        out.append(Image.fromarray((canvas[0].permute(1, 2, 0).numpy() * 255).clip(0, 255).astype(np.uint8)))
    x = torch.stack([torch.from_numpy(np.asarray(o, dtype=np.float32) / 255.0).permute(2, 0, 1) for o in out])
    return out, x


G_IMAGES = 24
G_PGD_STEPS = 20
G_PATCH_STEPS = 60
G_EPSILONS = (4 / 255, 8 / 255, 16 / 255)


def battery_g(model, classes, ood_target: int | None = None) -> dict:
    ood_target = ood_target or G_IMAGES
    got = fetch_fresh_images(OOD_QUERIES, "ood", 120)
    ood_paths = [p for p, _ in got][:ood_target]
    if not ood_paths:
        return {"error": "no OOD images available for the attack test"}
    ood_images = []
    for p in ood_paths:
        with Image.open(p) as im:
            ood_images.append(im.convert("RGB"))

    base_probs = predict_probs(model, ood_images)
    base_pred = base_probs.argmax(1)
    base_conf = base_probs.max(1)

    results = {"n_ood_images": len(ood_images),
               "baseline_false_approval_rate": _pct(float(((base_conf >= 0.85) & (base_pred != classes.index("other"))).mean())),
               "pgd": {}, "patch": {}}

    for eps in G_EPSILONS:
        hits = 0
        total = 0
        worst = []
        for h in HABITS:
            hi = classes.index(h)
            adv_imgs, _ = pgd_attack(model, ood_images, hi, eps=eps, steps=G_PGD_STEPS)
            probs = predict_probs(model, adv_imgs)
            hit = (probs.argmax(1) == hi) & (probs[:, hi] >= 0.85)
            hits += int(hit.sum())
            total += len(ood_images)
            for i in range(len(ood_images)):
                if hit[i]:
                    worst.append({"target": h, "confidence": round(float(probs[i, hi]), 4),
                                  "file": str(ood_paths[i].relative_to(REPO_ROOT))})
        worst.sort(key=lambda r: -r["confidence"])
        results["pgd"][f"eps_{int(round(eps * 255))}_over_255"] = {
            "attempts": total,
            "successful_approvals": hits,
            "success_rate_pct": _pct(hits / max(1, total)),
        }

    if G_PATCH_STEPS <= 0:
        results["patch"] = {"skipped": True}
        return results

    for h in HABITS:
        hi = classes.index(h)
        adv_imgs, _ = patch_attack(model, ood_images, hi, steps=G_PATCH_STEPS)
        probs = predict_probs(model, adv_imgs)
        hit = (probs.argmax(1) == hi) & (probs[:, hi] >= 0.85)
        results["patch"][h] = {
            "attempts": len(ood_images),
            "successful_approvals": int(hit.sum()),
            "success_rate_pct": _pct(float(hit.mean())),
            "mean_confidence_in_target": round(float(probs[:, hi].mean()), 4),
            "example_confidences": [round(float(c), 4) for c in sorted(probs[:, hi], reverse=True)[:10]],
        }
    patch_tot = sum(v["successful_approvals"] for v in results["patch"].values())
    patch_att = sum(v["attempts"] for v in results["patch"].values())
    results["patch"]["overall"] = {"attempts": patch_att, "successful_approvals": patch_tot,
                                   "success_rate_pct": _pct(patch_tot / max(1, patch_att))}
    return results


# ==========================================================================
# H. Threshold sweep
# ==========================================================================
def battery_h(model, classes) -> dict:
    by_class = {}
    for cls in CATEGORIES:
        by_class[cls] = image_paths(REPO_ROOT / "ml" / "data" / "evals" / cls)
        by_class[cls] += image_paths(REPO_ROOT / "ml" / "test_50_mixed" / cls)
    paths, probs, true, pred = _eval_paths(by_class, model, classes)
    oi = classes.index("other")

    rows = []
    for thr in [0.50, 0.60, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 0.99, 0.999]:
        awarded = (probs.max(1) >= thr) & (pred != oi)
        true_habit = (true != oi)
        tp = int((awarded & true_habit).sum())
        fp = int((awarded & ~true_habit).sum())
        fn = int((~awarded & true_habit).sum())
        tn = int((~awarded & ~true_habit).sum())
        rows.append({
            "threshold": thr,
            "awarded": tp + fp,
            "tp": tp, "fp": fp, "fn": fn, "tn": tn,
            "false_approval_rate_on_non_habit_pct": _pct(fp / max(1, fp + tn)),
            "habit_recall_pct": _pct(tp / max(1, tp + fn)),
            "precision_pct": _pct(tp / max(1, tp + fp)),
        })
    return {"n_images": len(paths), "rows": rows}


# ==========================================================================
# I. Serving-path audit (static analysis of the deployed code)
# ==========================================================================
def battery_i() -> dict:
    out: dict = {"thresholds_found": [], "notes": []}

    def scan(rel: str, patterns: list[str]) -> list[dict]:
        path = REPO_ROOT / rel
        if not path.is_file():
            return []
        text = path.read_text(encoding="utf-8", errors="replace")
        hits = []
        for pat in patterns:
            for m in re.finditer(pat, text):
                line = text.count("\n", 0, m.start()) + 1
                hits.append({"file": rel, "line": line, "match": m.group(0).strip()})
        return hits

    out["thresholds_found"] = (
        scan("api/score.ts", [r"threshold:\s*[\d.]+", r"confidence:\s*0\.\d+", r"verified:\s*true"]) +
        scan("apps/web/src/app/App.tsx", [r"bestProb\s*>=\s*[\d.]+", r"confidence:\s*0\.\d+", r"verified:\s*true"]) +
        scan("supabase/functions/verify-scan/index.ts", [r"ML_SCORE_THRESHOLD[^\n]*", r"\?\?\s*\"[\d.]+\""]) +
        scan("ml/evaluate.py", [r"threshold:\s*float\s*=\s*[\d.]+"]) +
        scan("ml/run_verification_pipeline.py", [r"threshold:\s*float\s*=\s*[\d.]+", r"threshold=[\d.]+"]) +
        scan("ml/service.py", [r"MAX_IMAGE_\w+\s*=\s*[\d_]+"]) +
        scan("docs/verification-rules.md", [r"ML_SCORE_THRESHOLD[^\n]*", r"default\s+[\d.]+"])
    )

    # Mock scorer check: does /api/score actually classify an image?
    score_ts = REPO_ROOT / "api" / "score.ts"
    if score_ts.is_file():
        text = score_ts.read_text(encoding="utf-8", errors="replace")
        out["score_ts_uses_model"] = bool(re.search(r"(onnx|InferenceSession|ML_SCORER_URL|fetch\()", text))
        out["score_ts_echoes_requested_habit"] = bool(
            re.search(r"predicted_label:\s*habitCode", text)) and bool(
            re.search(r"verified:\s*true", text))
        out["score_ts_accepts_image_without_classifying"] = bool(
            re.search(r"imageBase64", text)) and not out["score_ts_uses_model"]

    # Client class order vs checkpoint class order.
    app = REPO_ROOT / "apps" / "web" / "src" / "app" / "App.tsx"
    if app.is_file():
        text = app.read_text(encoding="utf-8", errors="replace")
        m = re.search(r"const classes = \[(.*?)\]", text, re.S)
        if m:
            client_classes = re.findall(r'"([a-z_]+)"', m.group(1))
            out["client_class_order"] = client_classes
            out["client_class_order_matches_checkpoint"] = client_classes == CATEGORIES

    # Does the browser send the image to the server-side scorer?
    out["client_fallback_posts_only_habit_code"] = bool(
        re.search(r"body:\s*JSON\.stringify\(\{\s*habit_code", (app.read_text(encoding="utf-8", errors="replace") if app.is_file() else "")))
    return out


# ==========================================================================
# J. Determinism & resampling sensitivity
# ==========================================================================
def battery_j(model, classes) -> dict:
    by_class = {cls: image_paths(REPO_ROOT / "ml" / "data" / "evals" / cls) for cls in CATEGORIES}
    paths, probs_bilinear, true, pred_bilinear = _eval_paths(by_class, model, classes)

    out = {"n_images": len(paths)}
    # Repeat-run determinism
    images = []
    for p in paths:
        with Image.open(p) as im:
            images.append(im.convert("RGB"))
    probs_again = predict_probs(model, images)
    out["repeat_run_max_delta"] = float(np.max(np.abs(probs_again - probs_bilinear)))

    # Resampling sensitivity (train/serve skew between PIL and browser canvas).
    res = {}
    for mode in ("bilinear", "lanczos", "nearest", "box"):
        probs = predict_probs(model, images) if mode == "bilinear" else None
        if probs is None:
            from stress_lib import to_tensor_batch as _t
            probs = []
            for i in range(0, len(images), 32):
                chunk = images[i:i + 32]
                x = _t(chunk, resize_mode=mode)
                with torch.inference_mode():
                    probs.append(torch.softmax(model(x), dim=1).numpy())
            probs = np.concatenate(probs, axis=0)
        pred = probs.argmax(1)
        agree = float((pred == pred_bilinear).mean())
        res[mode] = {
            "accuracy": _pct(float((pred == true).mean())),
            "agreement_with_bilinear": _pct(agree),
            "max_abs_prob_delta_vs_bilinear": round(float(np.max(np.abs(probs - probs_bilinear))), 5),
            "images_flipping_class": int((pred != pred_bilinear).sum()),
        }
    out["resampling_sensitivity"] = res
    return out


# ==========================================================================
# main
# ==========================================================================
BATTERIES = {
    "a": ("Provenance & serving parity", battery_a),
    "b": ("Data-leakage audit", battery_b),
    "c": ("Generalisation", battery_c),
    "d": ("Calibration", battery_d),
    "e": ("Robustness", battery_e),
    "f": ("OOD false approvals", battery_f),
    "g": ("Adversarial capability", battery_g),
    "h": ("Threshold sweep", battery_h),
    "i": ("Serving-path audit", battery_i),
    "j": ("Determinism & resampling", battery_j),
}


def main() -> None:
    global G_IMAGES, G_PGD_STEPS, G_PATCH_STEPS
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--battery", default="all",
                    help="comma separated battery letters (a..j) or 'all'")
    ap.add_argument("--fresh-per-class", type=int, default=FRESH_PER_CLASS_DEFAULT)
    ap.add_argument("--ood-target", type=int, default=OOD_TARGET_DEFAULT)
    ap.add_argument("--out", type=Path, default=REPORT_DIR / "stress_report.json")
    ap.add_argument("--model", type=Path, default=MODEL_PT,
                    help="checkpoint to audit; pin a copy so the artefact cannot move mid-test")
    ap.add_argument("--onnx", type=Path, default=MODEL_ONNX)
    ap.add_argument("--g-images", type=int, default=G_IMAGES, help="OOD images per adversarial trial")
    ap.add_argument("--g-pgd-steps", type=int, default=G_PGD_STEPS)
    ap.add_argument("--g-patch-steps", type=int, default=G_PATCH_STEPS)
    ap.add_argument("--g-pgd-only", action="store_true", help="skip the patch attack (much faster)")
    args = ap.parse_args()
    G_IMAGES, G_PGD_STEPS, G_PATCH_STEPS = args.g_images, args.g_pgd_steps, args.g_patch_steps
    if args.g_pgd_only:
        G_PATCH_STEPS = 0

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    selected = list(BATTERIES) if args.battery == "all" else [b.strip().lower() for b in args.battery.split(",")]

    model, classes, meta = load_checkpoint(args.model)
    print(f"Loaded {args.model}  version={meta['version']}  arch={meta['arch']}")

    report: dict = {
        "generated_at_utc": _now(),
        "model_under_test": str(args.model),
        "model_sha256": sha256_file(args.model),
        "onnx_under_test": str(args.onnx),
        "onnx_sha256": sha256_file(args.onnx) if args.onnx.is_file() else None,
        "model_version": meta["version"],
        "torch_version": torch.__version__,
        "read_only": True,
        "batteries": {},
    }

    for key in selected:
        if key not in BATTERIES:
            print(f"unknown battery {key!r}")
            continue
        name, fn = BATTERIES[key]
        print(f"\n=== Battery {key.upper()}: {name} ===", flush=True)
        t0 = time.time()
        try:
            if key == "a":
                res = fn(model, classes, meta, args.model, args.onnx)
            elif key == "b":
                res = fn()
            elif key == "c":
                res = fn(model, classes, args.fresh_per_class)
            elif key == "d":
                res = fn(model, classes)
            elif key == "e":
                res = fn(model, classes)
            elif key == "f":
                res = fn(model, classes, args.ood_target)
            elif key == "g":
                res = fn(model, classes)
            elif key == "h":
                res = fn(model, classes)
            elif key == "i":
                res = fn()
            elif key == "j":
                res = fn(model, classes)
            else:
                res = {"error": "not implemented"}
        except Exception as exc:  # keep going, record the failure
            import traceback
            res = {"error": f"{type(exc).__name__}: {exc}", "traceback": traceback.format_exc()[-2500:]}
        res["_elapsed_sec"] = round(time.time() - t0, 1)
        report["batteries"][key.upper()] = res
        print(f"--- battery {key.upper()} finished in {res['_elapsed_sec']}s", flush=True)
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")

    args.out.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(f"\nReport written to {args.out}")


if __name__ == "__main__":
    main()
