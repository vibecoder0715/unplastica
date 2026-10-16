"""Detailed evaluation and false-approval analysis for Unplastica habit classifier."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

import torch
from PIL import Image
from torchvision import transforms
from torchvision.models import mobilenet_v3_small, mobilenet_v3_large, efficientnet_b0


def load_model(model_path: Path, device: torch.device):
    if not model_path.is_file():
        raise SystemExit(f"Model file not found: {model_path}. Train the model first.")
    checkpoint = torch.load(model_path, map_location="cpu", weights_only=True)
    classes = checkpoint["classes"]
    arch = checkpoint.get("arch", "mobilenet_v3_small")
    version = checkpoint.get("version", "unknown")

    if arch == "mobilenet_v3_large":
        model = mobilenet_v3_large(weights=None)
        model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, len(classes))
    elif arch == "efficientnet_b0":
        model = efficientnet_b0(weights=None)
        model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, len(classes))
    else:
        model = mobilenet_v3_small(weights=None)
        model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, len(classes))

    model.load_state_dict(checkpoint["state_dict"])
    model.to(device).eval()
    return model, classes, version


def evaluate(data_dir: Path, model_path: Path, batch_size: int = 16, threshold: float = 0.85):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Loading model from {model_path} onto {device}...")
    model, classes, version = load_model(model_path, device)
    class_to_idx = {cls: idx for idx, cls in enumerate(classes)}

    preprocess = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    # Scan directory
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
    images_by_class: dict[str, list[Path]] = {}
    for cls in classes:
        cls_folder = data_dir / cls
        if cls_folder.is_dir():
            images_by_class[cls] = [p for p in cls_folder.iterdir() if p.suffix.lower() in valid_exts]
        else:
            images_by_class[cls] = []

    total_images = sum(len(imgs) for imgs in images_by_class.values())
    if total_images == 0:
        raise SystemExit(f"No valid images found in {data_dir}. Check folder paths.")

    print(f"\nEvaluating {total_images} images across {len(classes)} classes from {data_dir}...")
    print(f"Model version: {version}; Default award threshold: {threshold:.2f}")

    # Results tracking
    # confusion_matrix[true_idx][pred_idx]
    n_classes = len(classes)
    matrix = [[0] * n_classes for _ in range(n_classes)]
    errors: list[dict] = []
    threshold_results = defaultdict(lambda: {"approved": 0, "false_approved": 0, "correct_approved": 0})
    test_thresholds = [0.70, 0.75, 0.80, 0.85, 0.90, 0.95]

    for true_cls, img_paths in images_by_class.items():
        true_idx = class_to_idx[true_cls]
        for img_path in img_paths:
            try:
                with Image.open(img_path) as im:
                    tensor = preprocess(im.convert("RGB")).unsqueeze(0).to(device)
            except Exception as e:
                print(f"Skipping unreadable image {img_path}: {e}")
                continue

            with torch.inference_mode():
                probs = torch.softmax(model(tensor)[0], dim=0)

            max_prob, pred_idx = probs.max(dim=0)
            confidence = float(max_prob)
            pred_cls = classes[int(pred_idx)]

            matrix[true_idx][int(pred_idx)] += 1

            is_correct = (pred_cls == true_cls)
            if not is_correct:
                errors.append({
                    "image": str(img_path),
                    "true_label": true_cls,
                    "predicted_label": pred_cls,
                    "confidence": round(confidence, 4),
                })

            for th in test_thresholds:
                if confidence >= th:
                    # Would be accepted by verifier if user selected true_cls
                    if pred_cls != "other":
                        threshold_results[th]["approved"] += 1
                        if true_cls == "other":
                            # Critical: 'other' photo erroneously rewarded!
                            threshold_results[th]["false_approved"] += 1
                        elif is_correct:
                            threshold_results[th]["correct_approved"] += 1

    # Print Confusion Matrix
    print("\n--- Confusion Matrix (Rows = Actual, Columns = Predicted) ---")
    header = f"{'Actual':<22} | " + " | ".join(f"{cls[:6]:>6}" for cls in classes) + " | Total"
    print(header)
    print("-" * len(header))
    for i, cls in enumerate(classes):
        row_str = f"{cls:<22} | " + " | ".join(f"{matrix[i][j]:>6}" for j in range(n_classes))
        print(f"{row_str} | {sum(matrix[i]):>5}")

    # Metrics per class
    print("\n--- Per-Class Performance ---")
    print(f"{'Class':<22} | {'Precision':>9} | {'Recall':>9} | {'F1-Score':>9} | {'Samples':>7}")
    print("-" * 65)
    total_correct = 0
    for i, cls in enumerate(classes):
        tp = matrix[i][i]
        fp = sum(matrix[r][i] for r in range(n_classes)) - tp
        fn = sum(matrix[i][c] for c in range(n_classes)) - tp
        total_samples = sum(matrix[i])
        total_correct += tp

        prec = (tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        rec = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0

        print(f"{cls:<22} | {prec:>8.1%} | {rec:>8.1%} | {f1:>8.1%} | {total_samples:>7}")

    accuracy = total_correct / max(total_images, 1)
    print("-" * 65)
    print(f"Overall Accuracy: {accuracy:.1%} ({total_correct}/{total_images})")

    # Threshold analysis
    print("\n--- Greenbits Award Security Analysis by Threshold ---")
    print(f"{'Threshold':>9} | {'Approved Count':>14} | {'Valid Awards':>12} | {'False Approvals (Exploits)':>26}")
    print("-" * 70)
    for th in test_thresholds:
        res = threshold_results[th]
        print(f"{th:>9.2f} | {res['approved']:>14} | {res['correct_approved']:>12} | {res['false_approved']:>26}")

    # Output error report
    err_file = model_path.parent / "eval_errors.json"
    with open(err_file, "w", encoding="utf-8") as f:
        json.dump(errors, f, indent=2)
    print(f"\nMisclassification report written to {err_file} ({len(errors)} errors logged).")
    print("Recommendation: Inspect images in eval_errors.json to add hard examples or retrain.")


def main():
    default_data = Path("ml/data/evals") if (Path("ml/data").exists() or (Path("ml").is_dir() and not Path("evaluate.py").exists())) else Path("data/evals")
    default_model = Path("ml/model/best.pt") if (Path("ml/data").exists() or (Path("ml").is_dir() and not Path("evaluate.py").exists())) else Path("model/best.pt")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=default_data, help="Folder with test/evals images")
    parser.add_argument("--model", type=Path, default=default_model, help="Path to checkpoint")
    parser.add_argument("--threshold", type=float, default=0.85, help="Award confidence threshold")
    args = parser.parse_args()

    # Fallback if evals doesn't exist yet but val does
    target_dir = args.data
    if not target_dir.exists():
        fallback_val = target_dir.parent / "val"
        if fallback_val.exists():
            print(f"'{target_dir}' not found, falling back to '{fallback_val}'...")
            target_dir = fallback_val

    evaluate(target_dir, args.model, threshold=args.threshold)


if __name__ == "__main__":
    main()
