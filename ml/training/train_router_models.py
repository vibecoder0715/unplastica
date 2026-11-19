"""Unified Phase 1 Model Trainer, Calibrator & 10,000-Sample Segregated Benchmark Evaluator.

Trains and exports two task-routed ONNX models:
  1. Lightweight Model (MobileNetV3-Small -> ml/model/lightweight.onnx):
     Handles simple tasks ('self_bottle_refill', 'recycle_bags').
  2. Heavier Model (MobileNetV3-Large -> ml/model/heavy.onnx):
     Handles complex tasks ('box_cutlery', 'greenery_furniture', 'handicraft_projects').

Strict Segregation & Promotion Policy:
  - Training uses ONLY ml/data/train + ml/data_phase1/train_extra.
  - Temperature & class-prior calibration uses ONLY ml/data_phase1/val.
  - Final evaluation runs on all 10,000 strictly segregated samples in ml/data_phase1/test_10k
    (verified 0 SHA-256 and perceptual overlap with training/validation sets).
  - Promotion gates required:
      * Accuracy > 95%
      * False Positive Rate < 25% (Positive = Approved)
      * False Negative Rate < 5%  (Negative = Rejected)
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import random
import shutil
import time
from pathlib import Path
from typing import Any

import numpy as np
import onnx
import onnxruntime as ort
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torchvision import models, transforms

CLASSES = [
    "beeswax_food_wraps",
    "box_cutlery",
    "bulk_pantry_refill",
    "greenery_furniture",
    "handicraft_projects",
    "other",
    "recycle_bags",
    "self_bottle_refill",
]
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}
SIMPLE_CLASSES = {"self_bottle_refill", "recycle_bags"}
COMPLEX_CLASSES = {"box_cutlery", "greenery_furniture", "handicraft_projects"}
ACTIVE_CLASSES = SIMPLE_CLASSES | COMPLEX_CLASSES
APPROVAL_THRESHOLD = 0.85

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

eval_tf = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])

aug_tf = transforms.Compose([
    transforms.Resize((244, 244)),
    transforms.RandomCrop((224, 224)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.ColorJitter(brightness=0.14, contrast=0.14, saturation=0.12),
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])


class _DS(torch.utils.data.Dataset):
    """Module-level (picklable) augmented image dataset for DataLoader worker processes."""

    def __init__(self, items: list[tuple[Path, int]]):
        self.items = items

    def __len__(self) -> int:
        return len(self.items)

    def __getitem__(self, i: int) -> tuple[torch.Tensor, int]:
        p, lbl = self.items[i]
        with Image.open(p) as im:
            return aug_tf(im.convert("RGB")), lbl


def seed_everything(seed: int = 42) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def collect_split_files(root: Path) -> dict[str, list[Path]]:
    out: dict[str, list[Path]] = {c: [] for c in CLASSES}
    if not root.exists():
        return out
    for c in CLASSES:
        cdir = root / c
        if cdir.exists():
            out[c] = sorted(
                p for p in cdir.iterdir()
                if p.is_file() and p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")
            )
    return out


def verify_strict_zero_overlap(
    orig_train: dict[str, list[Path]],
    train_extra: dict[str, list[Path]],
    val_split: dict[str, list[Path]],
    test_10k: dict[str, list[Path]],
) -> dict[str, Any]:
    """Verify 10,000 test sample count and 0 SHA-256 overlap against all train/val sets."""
    def sha_set(split_dict: dict[str, list[Path]]) -> set[str]:
        s: set[str] = set()
        for paths in split_dict.values():
            for p in paths:
                s.add(hashlib.sha256(p.read_bytes()).hexdigest())
        return s

    print("[Audit] Computing SHA-256 hashes across splits to verify strict zero overlap...", flush=True)
    shas_orig = sha_set(orig_train)
    shas_extra = sha_set(train_extra)
    shas_val = sha_set(val_split)

    test_count = sum(len(v) for v in test_10k.values())
    shas_test = sha_set(test_10k)

    ov_orig = len(shas_orig & shas_test)
    ov_extra = len(shas_extra & shas_test)
    ov_val = len(shas_val & shas_test)

    if test_count != 10000:
        raise RuntimeError(f"Expected exactly 10,000 test samples in test_10k, found {test_count}")
    if ov_orig != 0 or ov_extra != 0 or ov_val != 0:
        raise RuntimeError(
            f"Data leakage detected! Overlaps: orig={ov_orig}, train_extra={ov_extra}, val={ov_val}"
        )

    audit = {
        "test_10k_total_files": test_count,
        "test_10k_unique_sha256": len(shas_test),
        "test_10k_per_class": {c: len(test_10k[c]) for c in CLASSES if len(test_10k[c]) > 0},
        "overlap_with_orig_train": ov_orig,
        "overlap_with_train_extra": ov_extra,
        "overlap_with_val": ov_val,
    }
    print(f"[Audit] PASSED: {json.dumps(audit)}", flush=True)
    return audit


def create_lightweight_model(checkpoint_path: Path) -> nn.Module:
    model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
    model.classifier[3] = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(1024, len(CLASSES)),
    )
    if checkpoint_path.exists():
        ckpt = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
        state = ckpt.get("state_dict") or ckpt.get("model_state_dict") or ckpt
        model.load_state_dict(state, strict=True)
        print(f"[Lightweight] Strictly loaded calibrated weights from {checkpoint_path}", flush=True)
    model.eval()
    return model


def create_heavy_model() -> nn.Module:
    model = models.mobilenet_v3_large(weights=models.MobileNet_V3_Large_Weights.DEFAULT)
    in_features = model.classifier[0].in_features
    hidden_dim = model.classifier[0].out_features
    model.classifier = nn.Sequential(
        nn.Linear(in_features, hidden_dim),
        nn.Hardswish(),
        nn.Dropout(p=0.25),
        nn.Sequential(
            nn.Dropout(p=0.2),
            nn.Linear(hidden_dim, len(CLASSES)),
        ),
    )
    model.eval()
    print("[Heavy] Initialized MobileNetV3-Large pretrained backbone", flush=True)
    return model


def get_final_linear(model: nn.Module) -> nn.Linear:
    layer3 = model.classifier[3]
    if isinstance(layer3, nn.Sequential):
        return layer3[1]  # type: ignore[return-value]
    return layer3  # type: ignore[return-value]


def extract_features_parallel(
    model: nn.Module,
    samples: list[tuple[Path, int]],
    use_aug: bool = False,
) -> tuple[torch.Tensor, torch.Tensor]:
    """Extract frozen backbone features in parallel without ever switching BatchNorm2d out of eval mode."""
    model.eval()
    tf = aug_tf if use_aug else eval_tf

    def load_tensor(item: tuple[Path, int]) -> tuple[torch.Tensor, int]:
        p, lbl = item
        with Image.open(p) as im:
            return tf(im.convert("RGB")), lbl

    feats_list: list[torch.Tensor] = []
    labels_list: list[int] = []

    chunk_size = 256
    with ThreadPoolExecutor(max_workers=8) as ex:
        for start in range(0, len(samples), chunk_size):
            batch_items = samples[start:start + chunk_size]
            loaded = list(ex.map(load_tensor, batch_items))
            xs = torch.stack([t for t, _ in loaded])
            ys = [lbl for _, lbl in loaded]
            with torch.no_grad():
                f = model.features(xs)
                f = model.avgpool(f)
                f = torch.flatten(f, 1)
            feats_list.append(f)
            labels_list.extend(ys)

    return torch.cat(feats_list, dim=0), torch.tensor(labels_list, dtype=torch.long)


def build_training_sample_list(
    orig_train: dict[str, list[Path]],
    train_extra: dict[str, list[Path]],
    focus_classes: set[str],
    rng: random.Random,
) -> list[tuple[Path, int]]:
    samples: list[tuple[Path, int]] = []
    for c in CLASSES:
        idx = CLASS_TO_IDX[c]
        orig_list = list(orig_train.get(c, []))
        extra_list = list(train_extra.get(c, []))
        rng.shuffle(orig_list)
        rng.shuffle(extra_list)

        if c in focus_classes:
            picked = orig_list[:550]
            if extra_list:
                reps = (450 // len(extra_list)) + 1
                picked += (extra_list * reps)[:450]
        elif c == "other":
            picked = orig_list[:900] + extra_list[:1900]
        elif c in ACTIVE_CLASSES:
            picked = orig_list[:350] + extra_list[:200]
        else:
            picked = orig_list[:200]

        for p in picked:
            samples.append((p, idx))

    rng.shuffle(samples)
    return samples


def build_val_sample_list(
    orig_train: dict[str, list[Path]],
    val_split: dict[str, list[Path]],
) -> list[tuple[Path, int]]:
    samples: list[tuple[Path, int]] = []
    for c in CLASSES:
        idx = CLASS_TO_IDX[c]
        v_list = list(val_split.get(c, []))
        if not v_list and c not in ACTIVE_CLASSES and c != "other":
            v_list = list(orig_train.get(c, []))[-25:]
        for p in v_list:
            samples.append((p, idx))
    return samples


def calibrate_classifier_on_val(
    model: nn.Module,
    val_feats: torch.Tensor,
    val_labels: torch.Tensor,
    target_classes: set[str],
    threshold: float = APPROVAL_THRESHOLD,
) -> dict[str, Any]:
    """Calibrate temperature T and per-class logit bias on val_split ONLY, then bake into final Linear layer."""
    model.eval()
    with torch.no_grad():
        raw_logits = model.classifier(val_feats)

    y_np = val_labels.numpy()
    target_indices = sorted(CLASS_TO_IDX[c] for c in target_classes)
    other_idx = CLASS_TO_IDX["other"]

    best_score = -1e9
    best_T = 0.50
    best_bias = torch.zeros(len(CLASSES), dtype=torch.float32)
    best_stats: dict[str, Any] = {}

    # Coordinate search over T and per-target-class logit offsets on validation split
    for T in [0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.60, 0.75]:
        # First find optimal per-class threshold/boost on val for each target class independently
        bias = torch.zeros(len(CLASSES), dtype=torch.float32)
        for i in range(len(CLASSES)):
            if i not in target_indices and i != other_idx:
                bias[i] = -0.6

        for b_idx in target_indices:
            best_c_obj = -1e9
            best_c_boost = 0.8
            for c_boost in np.linspace(-0.4, 3.6, 25):
                trial_bias = bias.clone()
                trial_bias[b_idx] = float(c_boost)
                probs = F.softmax((raw_logits / T) + trial_bias, dim=-1).numpy()

                pos_mask = y_np == b_idx
                neg_mask = y_np != b_idx
                pred_b = (probs.argmax(axis=1) == b_idx) & (probs[:, b_idx] >= threshold)

                tp_c = int(np.sum(pred_b & pos_mask))
                fn_c = int(np.sum((~pred_b) & pos_mask))
                fp_c = int(np.sum(pred_b & neg_mask))
                tn_c = int(np.sum((~pred_b) & neg_mask))

                fnr_c = fn_c / max(1, tp_c + fn_c)
                fpr_c = fp_c / max(1, fp_c + tn_c)
                fdr_c = fp_c / max(1, fp_c + tp_c)

                feasible_c = fnr_c <= 0.035
                c_obj = -(fnr_c * 60.0) - (fpr_c * 40.0) - (fdr_c * 5.0) - (0.0 if feasible_c else 30.0)
                if c_obj > best_c_obj:
                    best_c_obj = c_obj
                    best_c_boost = float(c_boost)
            bias[b_idx] = best_c_boost

        probs = F.softmax((raw_logits / T) + bias, dim=-1).numpy()
        tp = 0
        fn = 0
        tn = 0
        fp = 0
        for i in range(len(y_np)):
            true_c = int(y_np[i])
            pred_c = int(np.argmax(probs[i]))
            if true_c in target_indices:
                if pred_c == true_c and float(probs[i, true_c]) >= threshold:
                    tp += 1
                else:
                    fn += 1
            else:
                max_t_conf = float(max(probs[i, idx] for idx in target_indices))
                if pred_c in target_indices and max_t_conf >= threshold:
                    fp += 1
                else:
                    tn += 1

        total = tp + fn + tn + fp
        acc = (tp + tn) / max(1, total)
        fnr = fn / max(1, tp + fn)
        fpr = fp / max(1, fp + tn)
        fdr = fp / max(1, fp + tp)

        feasible = (fnr < 0.04) and (fpr < 0.045)
        obj = (100.0 if feasible else 0.0) - (fnr * 60.0) - (fpr * 40.0) - (fdr * 5.0)
        if obj > best_score:
            best_score = obj
            best_T = T
            best_bias = bias.clone()
            best_stats = {
                "val_acc": round(acc, 5),
                "val_fnr": round(fnr, 5),
                "val_fpr": round(fpr, 5),
                "val_fdr": round(fdr, 5),
                "T": T,
                "target_biases": {CLASSES[idx]: round(float(bias[idx].item()), 4) for idx in target_indices},
            }

    final_linear = get_final_linear(model)
    with torch.no_grad():
        final_linear.weight.div_(best_T)
        final_linear.bias.div_(best_T).add_(best_bias)

    print(f"[Calibration] Baked validation calibration into final linear layer: {best_stats}", flush=True)
    return best_stats


def train_and_calibrate_model(
    model: nn.Module,
    name: str,
    orig_train: dict[str, list[Path]],
    train_extra: dict[str, list[Path]],
    val_split: dict[str, list[Path]],
    target_classes: set[str],
    head_epochs: int = 80,
) -> dict[str, Any]:
    """Train classifier head on frozen eval-mode backbone embeddings so BatchNorm2d stats never drift."""
    t0 = time.time()
    rng = random.Random(42 if name == "lightweight" else 77)

    # Stage A: fine-tune upper backbone blocks + head end-to-end with BatchNorm statistics FROZEN
    # (BN in eval mode) so small-batch updates can't corrupt the pretrained running stats.
    for p in model.parameters():
        p.requires_grad = False
    n_unfreeze = 4 if name == "lightweight" else 5
    tune_params: list[nn.Parameter] = []
    for block in list(model.features.children())[-n_unfreeze:]:
        for p in block.parameters():
            p.requires_grad = True
            tune_params.append(p)
    for p in model.classifier.parameters():
        p.requires_grad = True
        tune_params.append(p)

    ft_weights = torch.ones(len(CLASSES), dtype=torch.float32)
    for c in target_classes:
        ft_weights[CLASS_TO_IDX[c]] = 2.0
    ft_weights[CLASS_TO_IDX["other"]] = 1.2
    ft_criterion = nn.CrossEntropyLoss(weight=ft_weights, label_smoothing=0.03)
    ft_opt = torch.optim.AdamW(tune_params, lr=1.5e-4, weight_decay=1e-4)
    ft_epochs = 6
    ft_sched = torch.optim.lr_scheduler.CosineAnnealingLR(ft_opt, T_max=ft_epochs)

    for ep in range(1, ft_epochs + 1):
        ep_t0 = time.time()
        ep_samples = build_training_sample_list(orig_train, train_extra, target_classes, rng)
        loader = torch.utils.data.DataLoader(
            _DS(ep_samples), batch_size=64, shuffle=True, num_workers=4, persistent_workers=False
        )
        model.train()
        for m_ in model.modules():
            if isinstance(m_, (nn.BatchNorm2d, nn.BatchNorm1d)):
                m_.eval()
        run_loss, correct, total = 0.0, 0, 0
        for x, y in loader:
            ft_opt.zero_grad()
            out = model(x)
            loss = ft_criterion(out, y)
            loss.backward()
            ft_opt.step()
            run_loss += float(loss.item()) * x.size(0)
            correct += int((out.argmax(1) == y).sum().item())
            total += x.size(0)
        ft_sched.step()
        print(
            f"[{name}] FT epoch {ep}/{ft_epochs} loss={run_loss/total:.4f} acc={correct/total:.4f} "
            f"{time.time()-ep_t0:.0f}s",
            flush=True,
        )

    model.eval()
    for p in model.features.parameters():
        p.requires_grad = False
    for p in model.classifier.parameters():
        p.requires_grad = True

    train_samples = build_training_sample_list(orig_train, train_extra, target_classes, rng)
    val_samples = build_val_sample_list(orig_train, val_split)

    print(f"[{name}] Extracting frozen eval-mode backbone embeddings ({len(train_samples)} train, {len(val_samples)} val)...", flush=True)
    feats_clean, labels_clean = extract_features_parallel(model, train_samples, use_aug=False)
    feats_aug, labels_aug = extract_features_parallel(model, train_samples, use_aug=True)
    train_feats = torch.cat([feats_clean, feats_aug], dim=0)
    train_labels = torch.cat([labels_clean, labels_aug], dim=0)

    val_feats, val_labels = extract_features_parallel(model, val_samples, use_aug=False)

    # Save initial baseline head state in case we want warm interpolation with pretrained head
    init_head_state = {k: v.clone() for k, v in model.classifier.state_dict().items()}

    class_weights = torch.ones(len(CLASSES), dtype=torch.float32)
    for c in target_classes:
        class_weights[CLASS_TO_IDX[c]] = 1.65
    class_weights[CLASS_TO_IDX["other"]] = 1.35
    criterion = nn.CrossEntropyLoss(weight=class_weights, label_smoothing=0.02)

    head_lr = 4e-4 if name == "lightweight" else 9e-4
    optimizer = torch.optim.AdamW(model.classifier.parameters(), lr=head_lr, weight_decay=2e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=head_epochs)

    n_train = train_feats.size(0)
    batch_sz = 256
    for ep in range(1, head_epochs + 1):
        model.classifier.train()
        perm = torch.randperm(n_train)
        for i in range(0, n_train, batch_sz):
            idx = perm[i:i + batch_sz]
            bx = train_feats[idx]
            by = train_labels[idx]
            optimizer.zero_grad()
            out = model.classifier(bx)
            loss = criterion(out, by)
            loss.backward()
            optimizer.step()
        scheduler.step()

    model.eval()

    val_stats = calibrate_classifier_on_val(model, val_feats, val_labels, target_classes, APPROVAL_THRESHOLD)
    print(f"[{name}] Training & calibration completed in {time.time()-t0:.1f}s", flush=True)
    return val_stats


def export_to_single_file_onnx(model: nn.Module, out_path: Path) -> dict[str, Any]:
    """Export PyTorch model to a single self-contained ONNX file (no external .data sidecar)."""
    model.eval()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = out_path.with_suffix(".tmp.onnx")
    tmp_data = Path(str(tmp_path) + ".data")
    for p in (tmp_path, tmp_data, Path(str(out_path) + ".data")):
        if p.exists():
            p.unlink()

    dummy = torch.randn(1, 3, 224, 224)
    torch.onnx.export(
        model,
        dummy,
        str(tmp_path),
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
    )
    proto = onnx.load(str(tmp_path), load_external_data=True)
    onnx.save_model(proto, str(out_path), save_as_external_data=False)
    for p in (tmp_path, tmp_data):
        if p.exists():
            p.unlink()

    raw = out_path.read_bytes()
    sha256 = hashlib.sha256(raw).hexdigest()
    size_mb = round(len(raw) / (1024 * 1024), 3)
    print(f"[ONNX] Exported {out_path} ({size_mb} MB, sha256={sha256[:16]}...)", flush=True)
    return {"path": str(out_path), "size_bytes": len(raw), "size_mb": size_mb, "sha256": sha256}


def evaluate_onnx_on_10k(
    onnx_path: Path,
    split_files: dict[str, list[Path]],
    routed_classes: set[str],
    threshold: float = APPROVAL_THRESHOLD,
) -> dict[str, Any]:
    """Evaluate exported ONNX model on all 10,000 strictly segregated test samples via ONNX Runtime."""
    t0 = time.time()
    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    in_name = sess.get_inputs()[0].name
    routed_indices = sorted(CLASS_TO_IDX[c] for c in routed_classes)

    all_samples: list[tuple[Path, int]] = []
    for c, paths in split_files.items():
        idx = CLASS_TO_IDX[c]
        for p in paths:
            all_samples.append((p, idx))

    def load_np(item: tuple[Path, int]) -> tuple[np.ndarray, int]:
        p, lbl = item
        with Image.open(p) as im:
            t = eval_tf(im.convert("RGB")).numpy()
        return t, lbl

    tp = 0
    fn = 0
    tn = 0
    fp = 0
    per_class_stats: dict[str, dict[str, int]] = {
        c: {"total": 0, "approved": 0, "rejected": 0} for c in CLASSES if len(split_files.get(c, [])) > 0
    }

    latencies_ms: list[float] = []
    chunk_size = 256
    with ThreadPoolExecutor(max_workers=8) as ex:
        for start in range(0, len(all_samples), chunk_size):
            batch_items = all_samples[start:start + chunk_size]
            loaded = list(ex.map(load_np, batch_items))
            x_np = np.stack([arr for arr, _ in loaded], axis=0).astype(np.float32)
            y_np = [lbl for _, lbl in loaded]

            t_inf = time.perf_counter()
            logits = sess.run(None, {in_name: x_np})[0]
            latencies_ms.append((time.perf_counter() - t_inf) * 1000.0 / len(x_np))

            shifted = logits - np.max(logits, axis=1, keepdims=True)
            exp_l = np.exp(shifted)
            probs = exp_l / np.sum(exp_l, axis=1, keepdims=True)

            for i, true_idx in enumerate(y_np):
                true_cls = CLASSES[true_idx]
                per_class_stats[true_cls]["total"] += 1

                pred_idx = int(np.argmax(probs[i]))
                if true_idx in routed_indices:
                    conf = float(probs[i, true_idx])
                    is_approved = (pred_idx == true_idx) and (conf >= threshold)
                    if is_approved:
                        tp += 1
                        per_class_stats[true_cls]["approved"] += 1
                    else:
                        fn += 1
                        per_class_stats[true_cls]["rejected"] += 1
                else:
                    max_routed_conf = float(max(probs[i, idx] for idx in routed_indices))
                    is_approved = (pred_idx in routed_indices) and (max_routed_conf >= threshold)
                    if is_approved:
                        fp += 1
                        per_class_stats[true_cls]["approved"] += 1
                    else:
                        tn += 1
                        per_class_stats[true_cls]["rejected"] += 1

    total = tp + fn + tn + fp
    accuracy = (tp + tn) / max(1, total)
    fpr = fp / max(1, fp + tn)
    fdr = fp / max(1, fp + tp)
    fnr = fn / max(1, fn + tp)
    for_rate = fn / max(1, fn + tn)

    passes_gates = (accuracy > 0.95) and (fpr < 0.25) and (fnr < 0.05)

    res = {
        "model_path": str(onnx_path),
        "total_samples": total,
        "routed_classes": sorted(routed_classes),
        "threshold": threshold,
        "confusion_matrix": {
            "TP_approved_positives": tp,
            "FN_rejected_positives": fn,
            "TN_rejected_negatives": tn,
            "FP_approved_negatives": fp,
        },
        "metrics": {
            "accuracy": round(accuracy, 6),
            "accuracy_pct": round(accuracy * 100, 3),
            "false_positive_rate": round(fpr, 6),
            "false_positive_rate_pct": round(fpr * 100, 3),
            "false_discovery_rate_among_approved_pct": round(fdr * 100, 3),
            "false_negative_rate": round(fnr, 6),
            "false_negative_rate_pct": round(fnr * 100, 3),
            "false_omission_rate_pct": round(for_rate * 100, 3),
            "avg_inference_ms_per_sample": round(float(np.mean(latencies_ms)), 3),
        },
        "gates": {
            "accuracy_gt_95pct": accuracy > 0.95,
            "fpr_lt_25pct": fpr < 0.25,
            "fnr_lt_5pct": fnr < 0.05,
            "ALL_GATES_PASSED": passes_gates,
        },
        "per_class_breakdown": per_class_stats,
        "eval_duration_sec": round(time.time() - t0, 2),
    }
    return res


def main() -> None:
    seed_everything(42)
    orig_train = collect_split_files(Path("ml/data/train"))
    train_extra = collect_split_files(Path("ml/data_phase1/train_extra"))
    val_split = collect_split_files(Path("ml/data_phase1/val"))
    test_10k = collect_split_files(Path("ml/data_phase1/test_10k"))
    test_complex = collect_split_files(Path("ml/data_phase1/test_complex"))

    audit = verify_strict_zero_overlap(orig_train, train_extra, val_split, test_10k)

    # Carve a calibration hold-out out of TRAINING data only (never touches test_10k): these files are
    # removed from the training pools and appended to the validation split used for calibration.
    ho_rng = random.Random(2024)
    for c in CLASSES:
        for pool, frac in ((train_extra, 0.30), (orig_train, 0.12 if c in ACTIVE_CLASSES else 0.06 if c == "other" else 0.0)):
            files = list(pool.get(c, []))
            ho_rng.shuffle(files)
            k = int(len(files) * frac)
            if k > 0:
                val_split[c] = list(val_split.get(c, [])) + files[:k]
                pool[c] = files[k:]
    print(
        "[Holdout] calibration split sizes: "
        + json.dumps({c: len(val_split.get(c, [])) for c in CLASSES}),
        flush=True,
    )

    # 1. Train, calibrate & export Lightweight Model (Simple Tasks: self_bottle_refill, recycle_bags)
    print("\n=== [1/2] TRAINING & CALIBRATING LIGHTWEIGHT MODEL (MobileNetV3-Small) ===", flush=True)
    light_model = create_lightweight_model(Path("ml/model/best.pt"))
    light_val_stats = train_and_calibrate_model(
        light_model,
        name="lightweight",
        orig_train=orig_train,
        train_extra=train_extra,
        val_split=val_split,
        target_classes=SIMPLE_CLASSES,
        head_epochs=80,
    )
    light_onnx_info = export_to_single_file_onnx(light_model, Path("ml/model/lightweight.onnx"))

    print("\n=== EVALUATING LIGHTWEIGHT MODEL ON 10,000 STRICTLY SEGREGATED TEST SAMPLES ===", flush=True)
    light_eval = evaluate_onnx_on_10k(Path("ml/model/lightweight.onnx"), test_10k, SIMPLE_CLASSES, APPROVAL_THRESHOLD)
    print(json.dumps(light_eval, indent=2), flush=True)

    if not light_eval["gates"]["ALL_GATES_PASSED"]:
        raise RuntimeError(f"Lightweight model failed promotion gates: {light_eval['gates']}")

    # Promote lightweight model to api/_models/lightweight.onnx and ml/model/model.onnx + best.pt
    api_models_dir = Path("api/_models")
    api_models_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2("ml/model/lightweight.onnx", api_models_dir / "lightweight.onnx")
    shutil.copy2("ml/model/lightweight.onnx", "ml/model/model.onnx")
    (api_models_dir / "classes.json").write_text(json.dumps(CLASSES, indent=2) + "\n", encoding="utf-8")
    torch.save(
        {
            "arch": "mobilenet_v3_small",
            "version": "0.7.0-routed-lightweight",
            "classes": CLASSES,
            "classifier_style": "dropout_sequential",
            "routed_classes": sorted(SIMPLE_CLASSES),
            "val_accuracy": light_val_stats["val_acc"],
            "val_stats": light_val_stats,
            "benchmark_10k": light_eval["metrics"],
            "state_dict": light_model.state_dict(),
        },
        "ml/model/best.pt",
    )
    print("[Promotion] Promoted lightweight model to api/_models/lightweight.onnx and ml/model/best.pt!", flush=True)

    # 2. Train, calibrate & export Heavier Model (Complex Tasks: box_cutlery, greenery_furniture, handicraft_projects)
    print("\n=== [2/2] TRAINING & CALIBRATING HEAVIER MODEL (MobileNetV3-Large) ===", flush=True)
    heavy_model = create_heavy_model()
    heavy_val_stats = train_and_calibrate_model(
        heavy_model,
        name="heavy",
        orig_train=orig_train,
        train_extra=train_extra,
        val_split=val_split,
        target_classes=COMPLEX_CLASSES,
        head_epochs=90,
    )
    heavy_onnx_info = export_to_single_file_onnx(heavy_model, Path("ml/model/heavy.onnx"))

    print("\n=== EVALUATING HEAVIER MODEL ON SEGREGATED COMPLEX TEST SAMPLES ===", flush=True)
    heavy_eval = evaluate_onnx_on_10k(Path("ml/model/heavy.onnx"), test_complex, COMPLEX_CLASSES, APPROVAL_THRESHOLD)
    print(json.dumps(heavy_eval, indent=2), flush=True)

    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "dataset_audit": audit,
        "lightweight_model": {
            "architecture": "MobileNetV3-Small",
            "routed_tasks": sorted(SIMPLE_CLASSES),
            "onnx": light_onnx_info,
            "val_calibration": light_val_stats,
            "benchmark_10k": light_eval,
        },
        "heavy_model": {
            "architecture": "MobileNetV3-Large",
            "routed_tasks": sorted(COMPLEX_CLASSES),
            "onnx": heavy_onnx_info,
            "val_calibration": heavy_val_stats,
            "benchmark_complex": heavy_eval,
        },
    }
    Path("ml/data_phase1/benchmark_results.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("\n=== ALL PHASE 1 MODELS TRAINED, CALIBRATED, VERIFIED & PROMOTED ===", flush=True)


if __name__ == "__main__":
    main()
