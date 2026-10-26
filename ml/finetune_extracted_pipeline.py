"""Unplastica AI Fine-Tuning Pipeline.

Fine-tunes directly on-top of the existing 'ml/model/best.pt' checkpoint
(without resetting weights) using the extracted habit dataset.
Exports:
- ml/model/best.pt
- ml/model/model.onnx
- apps/web/public/model/model.onnx
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import time
from datetime import datetime
from pathlib import Path
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from torchvision import datasets, transforms
from torchvision.models import mobilenet_v3_small

from ml.extraction_engine import get_extraction_engine

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
    """Dataset that loads extracted habit images or extracts them on the fly if needed."""

    def __init__(self, root_dir: Path, transform=None, cache_dir: Path | None = None):
        self.root_dir = Path(root_dir)
        self.transform = transform
        self.cache_dir = Path(cache_dir) if cache_dir else None
        self.samples = []

        if self.cache_dir:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

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
        img_path, label_idx, class_name = self.samples[idx]

        if self.cache_dir:
            cached_path = self.cache_dir / class_name / f"extracted_{img_path.stem}.png"
            if cached_path.exists():
                im = Image.open(cached_path).convert("RGB")
            else:
                im = Image.open(img_path).convert("RGB")
        else:
            im = Image.open(img_path).convert("RGB")

        if self.transform:
            im = self.transform(im)
        return im, label_idx


def pre_extract_training_dataset(
    train_dir: Path,
    cache_dir: Path,
    model_name: str = "u2net",
) -> None:
    """Pre-extract all training images so epochs train at lightning speed."""
    engine = get_extraction_engine(model_name=model_name)
    print(f"\n⚡ Pre-extracting training subjects to {cache_dir.resolve()}...")
    cache_dir.mkdir(parents=True, exist_ok=True)

    total_extracted = 0
    t0 = time.time()

    from concurrent.futures import ThreadPoolExecutor, as_completed

    def process_image(item):
        img_path, class_name, dst_folder, idx = item
        out_file = dst_folder / f"extracted_{img_path.stem}.png"
        if out_file.exists():
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
            extracted.save(out_file, "PNG")
            return True
        except Exception:
            try:
                im = Image.open(img_path).convert("RGB").resize((224, 224), Image.Resampling.LANCZOS)
                im.save(out_file, "PNG")
                return True
            except:
                return False

    for class_name in CLASSES:
        src_folder = train_dir / class_name
        dst_folder = cache_dir / class_name
        dst_folder.mkdir(parents=True, exist_ok=True)

        if not src_folder.exists():
            continue

        images = [p for p in src_folder.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")]
        print(f"   Extracting class [{class_name}] ({len(images)} images)...")

        items = [(p, class_name, dst_folder, i) for i, p in enumerate(images)]
        done = 0
        with ThreadPoolExecutor(max_workers=4) as ex:
            for fut in as_completed([ex.submit(process_image, it) for it in items]):
                if fut.result():
                    done += 1
                if done % 100 == 0 or done == len(images):
                    print(f"      {done}/{len(images)} done")
        total_extracted += done

    print(f"Pre-extraction complete: {total_extracted} images ready in {time.time() - t0:.1f}s\n")


def load_model_from_checkpoint(checkpoint_path: Path, device: torch.device) -> tuple[nn.Module, dict]:
    """Load MobileNetV3-Small from existing best.pt without resetting weights."""
    print(f"Loading base checkpoint: {checkpoint_path.resolve()}...")
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
    print("Base model weights loaded successfully.")
    return model, ckpt


def export_onnx(model: nn.Module, onnx_path: Path, device: torch.device) -> None:
    """Export the fine-tuned PyTorch model to clean standalone ONNX."""
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


def finetune(
    data_dir: Path = Path("ml/data"),
    checkpoint_path: Path = Path("ml/model/best.pt"),
    epochs: int = 10,
    batch_size: int = 16,
    lr: float = 1.5e-4,
) -> None:
    """Run fine-tuning on top of the existing model checkpoint."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device} ({torch.cuda.get_device_name(0) if device.type == 'cuda' else 'CPU'})")

    train_raw = data_dir / "train"
    train_extracted = data_dir / "train_extracted"

    # Pre-extract all training images with background removal
    pre_extract_training_dataset(train_raw, train_extracted, model_name="u2net")

    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.ColorJitter(brightness=0.12, contrast=0.12, saturation=0.10),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    dataset = ExtractedFolderDataset(train_extracted, transform=train_transform)
    total_samples = len(dataset)
    val_count = int(total_samples * 0.15)
    train_count = total_samples - val_count

    train_set, val_set = torch.utils.data.random_split(
        dataset,
        [train_count, val_count],
        generator=torch.Generator().manual_seed(42),
    )

    train_loader = DataLoader(train_set, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_set, batch_size=batch_size, shuffle=False, num_workers=0)

    print(f"Dataset: {train_count} train samples | {val_count} val samples")

    # Load existing model checkpoint (NO WEIGHT RESET)
    model, old_meta = load_model_from_checkpoint(checkpoint_path, device)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.05)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

    best_val_acc = 0.0
    best_weights = None

    print("\n==========================================================")
    print("🔥 COMMENCING FINE-TUNING ON-TOP OF EXISTING CHECKPOINT")
    print("==========================================================")

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

    print(f"\nBest Validation Accuracy: {best_val_acc*100:.2f}%")

    # Save fine-tuned checkpoint
    new_version = "mobilenet_v3_small-v0.3.0-extracted-habit"
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
    print(f"Updated best checkpoint saved to {checkpoint_path.resolve()}")

    # Load best weights into model for ONNX export
    model.load_state_dict(best_weights)
    onnx_output = Path("ml/model/model.onnx")
    export_onnx(model, onnx_output, device)

    # Sync to web app public directory
    web_model_dir = Path("apps/web/public/model")
    if web_model_dir.exists():
        web_onnx = web_model_dir / "model.onnx"
        shutil.copyfile(onnx_output, web_onnx)
        print(f"Synchronized ONNX model to web client: {web_onnx.resolve()}")
        # Also ensure classes.json is in sync
        with open(web_model_dir / "classes.json", "w", encoding="utf-8") as f:
            json.dump(CLASSES, f, indent=2)


if __name__ == "__main__":
    finetune(epochs=8, batch_size=16)
