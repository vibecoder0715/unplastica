"""Unplastica AI Fine-Tuning Pipeline V2.

Fine-tunes directly on top of the existing 'ml/model/best.pt' checkpoint
(WITHOUT resetting weights) using the expanded extracted dataset (~6,500 images).
Then automatically evaluates the 500 new different test sets to achieve:
All Cases | Total Benchmark | 500 | >95% | N/A | >85%
"""

from __future__ import annotations

import json
import os
import shutil
import time
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from torchvision.models import mobilenet_v3_small

from ml.extraction_engine import get_extraction_engine
from ml.test_cases_500_v2 import run_v2_benchmark

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


class ExtractedFolderDataset(Dataset):
    """Dataset that loads extracted habit images from disk."""

    def __init__(self, root_dir: Path, transform=None):
        self.root_dir = Path(root_dir)
        self.transform = transform
        self.samples = []

        for c_idx, class_name in enumerate(CLASSES):
            class_folder = self.root_dir / class_name
            if not class_folder.exists():
                continue
            for img_path in sorted(class_folder.iterdir()):
                if img_path.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"):
                    self.samples.append((img_path, c_idx, class_name))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label_idx, _ = self.samples[idx]
        im = Image.open(img_path).convert("RGB")
        if self.transform:
            im = self.transform(im)
        return im, label_idx


def pre_extract_training_dataset(
    train_dir: Path,
    cache_dir: Path,
    model_name: str = "u2net",
    max_workers: int = 6,
) -> None:
    """Pre-extract all training subjects so training epochs run at high speed."""
    engine = get_extraction_engine(model_name=model_name)
    print(f"\n⚡ Pre-extracting training images to {cache_dir.resolve()}...")
    cache_dir.mkdir(parents=True, exist_ok=True)

    t0 = time.time()
    total_needed = 0

    def process_item(item):
        img_path, class_name, dst_file, idx = item
        if dst_file.exists():
            return True
        try:
            if class_name == "other":
                if idx % 2 == 0:
                    extracted, _ = engine.extract_main_character(img_path, mode="composite", target_size=(224, 224))
                else:
                    im = Image.open(img_path).convert("RGB")
                    extracted = im.resize((224, 224), Image.Resampling.LANCZOS)
            else:
                extracted, _ = engine.extract_main_character(img_path, mode="crop_composite", target_size=(224, 224))
            extracted.save(dst_file, "PNG")
            return True
        except Exception:
            try:
                im = Image.open(img_path).convert("RGB").resize((224, 224), Image.Resampling.LANCZOS)
                im.save(dst_file, "PNG")
                return True
            except:
                return False

    for class_name in CLASSES:
        src_folder = train_dir / class_name
        dst_folder = cache_dir / class_name
        dst_folder.mkdir(parents=True, exist_ok=True)

        if not src_folder.exists():
            continue

        images = sorted([p for p in src_folder.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")])
        items = []
        for i, p in enumerate(images):
            dst_file = dst_folder / f"extracted_{p.stem}.png"
            if not dst_file.exists():
                items.append((p, class_name, dst_file, i))

        if not items:
            print(f"   [{class_name}] All {len(images)} images already pre-extracted.")
            continue

        print(f"   [{class_name}] Extracting {len(items)} new images (already done: {len(images) - len(items)})...")
        done = 0
        with ThreadPoolExecutor(max_workers=max_workers) as ex:
            for fut in as_completed([ex.submit(process_item, it) for it in items]):
                if fut.result():
                    done += 1
                if done % 100 == 0 or done == len(items):
                    print(f"      {done}/{len(items)} completed")
        total_needed += done

    print(f"Pre-extraction complete: {total_needed} new images extracted in {time.time() - t0:.1f}s\n")


def load_model_from_checkpoint(checkpoint_path: Path, device: torch.device) -> tuple[nn.Module, dict]:
    """Load MobileNetV3-Small from existing best.pt without resetting weights."""
    print(f"Loading base checkpoint: {checkpoint_path.resolve()} (NO RESET)...")
    ckpt = torch.load(checkpoint_path, map_location="cpu", weights_only=False)

    model = mobilenet_v3_small(weights=None)
    state_dict = ckpt.get("state_dict", ckpt)
    has_dropout_seq = any(k.startswith("classifier.3.1.") for k in state_dict.keys())

    if has_dropout_seq:
        model.classifier[3] = nn.Sequential(
            nn.Dropout(p=0.2),
            nn.Linear(model.classifier[3].in_features, len(CLASSES)),
        )
    else:
        model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(CLASSES))

    model.load_state_dict(state_dict)
    model.to(device)
    print(f"Base model loaded. Prior validation accuracy: {ckpt.get('val_accuracy', 0)*100:.2f}%.")
    return model, ckpt


def export_onnx(model: nn.Module, onnx_path: Path, device: torch.device) -> None:
    """Export the fine-tuned model to clean standalone ONNX."""
    print(f"Exporting model to ONNX: {onnx_path.resolve()}...")
    model.eval()
    dummy_input = torch.randn(1, 3, 224, 224, device=device)

    onnx_path.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_path),
        input_names=["input"],
        output_names=["output"],
        opset_version=17,
        do_constant_folding=True,
        dynamo=False,
    )
    data_file = onnx_path.with_suffix(".onnx.data")
    if data_file.exists():
        data_file.unlink()
    print(f"ONNX exported successfully ({onnx_path.stat().st_size / (1024*1024):.2f} MB).")


def finetune_v2(
    data_dir: Path = Path("ml/data"),
    checkpoint_path: Path = Path("ml/model/best.pt"),
    epochs: int = 10,
    batch_size: int = 32,
    lr: float = 1.2e-4,
) -> None:
    """Run fine-tuning directly on-top of best.pt with expanded dataset."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("==========================================================")
    print("🔥 UNPLASTICA FINE-TUNING PIPELINE V2")
    print(f"Device              : {device}")
    print(f"Base Checkpoint     : {checkpoint_path.resolve()} (Weights Preserved)")
    print(f"Target Epochs       : {epochs}")
    print(f"Batch Size          : {batch_size}")
    print("==========================================================\n")

    train_raw = data_dir / "train"
    train_extracted = data_dir / "train_extracted"

    # Step A: Pre-extract any newly added images
    pre_extract_training_dataset(train_raw, train_extracted, model_name="u2net", max_workers=6)

    # Step B: Load dataset
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.ColorJitter(brightness=0.10, contrast=0.10, saturation=0.08),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    full_dataset = ExtractedFolderDataset(train_extracted, transform=train_transform)
    total_samples = len(full_dataset)
    val_count = int(total_samples * 0.15)
    train_count = total_samples - val_count

    train_set, val_set = torch.utils.data.random_split(
        full_dataset,
        [train_count, val_count],
        generator=torch.Generator().manual_seed(42),
    )

    train_loader = DataLoader(train_set, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_set, batch_size=batch_size, shuffle=False, num_workers=0)

    print(f"Loaded Extracted Dataset: {train_count} train samples | {val_count} val samples (Total: {total_samples})")

    # Step C: Load existing checkpoint (NO RESET)
    model, old_meta = load_model_from_checkpoint(checkpoint_path, device)

    # Differential learning rate: finer adjustment on backbone, stronger learning on classifier
    backbone_params = [p for n, p in model.named_parameters() if not n.startswith("classifier")]
    head_params = [p for n, p in model.named_parameters() if n.startswith("classifier")]

    optimizer = torch.optim.AdamW([
        {"params": backbone_params, "lr": lr * 0.4},
        {"params": head_params, "lr": lr * 1.5},
    ], weight_decay=1e-4)

    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.01)

    best_val_acc = 0.0
    best_weights = None

    print("\n--- BEGIN TRAINING ON EXPANDED DATASET ---")
    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()

        scheduler.step()
        train_acc = correct / total
        train_loss = running_loss / total

        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)
                val_loss += loss.item() * inputs.size(0)
                _, predicted = outputs.max(1)
                val_total += targets.size(0)
                val_correct += predicted.eq(targets).sum().item()

        val_acc = val_correct / val_total
        val_loss = val_loss / val_total

        print(
            f"Epoch {epoch:02d}/{epochs:02d} | "
            f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc*100:.2f}% | "
            f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc*100:.2f}%"
        )

        if val_acc >= best_val_acc:
            best_val_acc = val_acc
            best_weights = {k: v.cpu().clone() for k, v in model.state_dict().items()}

    print(f"\nTraining Complete. Best Validation Accuracy: {best_val_acc*100:.2f}%\n")

    # Save updated weights
    new_version = "mobilenet_v3_small-v0.4.0-extracted-habit-v2"
    checkpoint_data = {
        "arch": "mobilenet_v3_small",
        "version": new_version,
        "classes": CLASSES,
        "val_accuracy": round(best_val_acc, 4),
        "created_at": datetime.utcnow().isoformat() + "Z",
        "classifier_style": "dropout_sequential" if any(k.startswith("classifier.3.1.") for k in best_weights.keys()) else "linear",
        "state_dict": best_weights,
    }

    torch.save(checkpoint_data, checkpoint_path)
    print(f"Updated checkpoint saved to {checkpoint_path.resolve()}")

    # Export ONNX and synchronize to apps/web/public/model
    model.load_state_dict(best_weights)
    onnx_output = Path("ml/model/model.onnx")
    export_onnx(model, onnx_output, device)

    web_model_dir = Path("apps/web/public/model")
    if web_model_dir.exists():
        web_onnx = web_model_dir / "model.onnx"
        shutil.copyfile(onnx_output, web_onnx)
        print(f"Synchronized ONNX model to web client: {web_onnx.resolve()}")
        with open(web_model_dir / "classes.json", "w", encoding="utf-8") as f:
            json.dump(CLASSES, f, indent=2)

    # Step D: Run benchmark evaluation on 500 new different test sets!
    print("\n==========================================================")
    print("🎯 EVALUATING 500 NEW DIFFERENT TEST SETS...")
    print("==========================================================")
    run_v2_benchmark(
        test_noisy_dir=data_dir / "test_noisy_v2",
        checkpoint_path=checkpoint_path,
        output_report_path=Path("ml/test_results/direct_test_report.md"),
    )


if __name__ == "__main__":
    finetune_v2(epochs=10, batch_size=32)
