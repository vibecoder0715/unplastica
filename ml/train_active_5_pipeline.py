"""Robust Multi-Condition Training Pipeline for Active 5 Habit Categories.

Trains MobileNetV3-Small on mixed conditions:
- Clean extracted foregrounds
- Real-world images with background noise (including user bottle and active habit items)
- Negative 'other' desk/room backgrounds

Active Categories:
1. box_cutlery ("Bring Your Own Cutlery & Box")
2. recycle_bags ("Reusable Bags")
3. self_bottle_refill ("Refill Your Bottle")
4. greenery_furniture ("Greenery & Upcycled Furniture")
5. handicraft_projects ("Plastic Upcycling & Handicrafts")
(and 'other' for negative background noise rejection)
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from torchvision.models import mobilenet_v3_small

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

ACTIVE_CLASSES = [
    "box_cutlery",
    "greenery_furniture",
    "handicraft_projects",
    "recycle_bags",
    "self_bottle_refill",
    "other",
]


class MixedConditionDataset(Dataset):
    """Combines raw noisy background images and clean extracted images."""

    def __init__(self, raw_dir: Path, ext_dir: Path, transform=None):
        self.samples = []
        self.transform = transform

        for c_idx, class_name in enumerate(CLASSES):
            # Load from both raw and extracted folders
            raw_folder = raw_dir / class_name
            ext_folder = ext_dir / class_name

            raw_files = list(raw_folder.glob("*.*")) if raw_folder.exists() else []
            ext_files = list(ext_folder.glob("*.*")) if ext_folder.exists() else []

            valid_raw = [p for p in raw_files if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")]
            valid_ext = [p for p in ext_files if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")]

            # For each class, pick up to 150 extracted and up to 100 raw images (prioritizing user bottle variations)
            # Sort user variations first
            user_raw = [p for p in valid_raw if "user_bottle" in p.name]
            other_raw = [p for p in valid_raw if "user_bottle" not in p.name]
            chosen_raw = user_raw + other_raw[:max(0, 100 - len(user_raw))]

            user_ext = [p for p in valid_ext if "user_bottle" in p.name]
            other_ext = [p for p in valid_ext if "user_bottle" not in p.name]
            chosen_ext = user_ext + other_ext[:max(0, 150 - len(user_ext))]

            combined = chosen_ext + chosen_raw
            for p in combined:
                self.samples.append((p, c_idx))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            im = Image.open(path).convert("RGB")
        except Exception:
            im = Image.new("RGB", (224, 224), (128, 128, 128))
        if self.transform:
            im = self.transform(im)
        return im, label


def train_robust_model(
    epochs: int = 8,
    batch_size: int = 32,
    lr: float = 2e-4,
    checkpoint_in: Path = Path("ml/model/best.pt"),
    checkpoint_out: Path = Path("ml/model/best.pt"),
    onnx_out: Path = Path("ml/model/model.onnx"),
    web_onnx_out: Path = Path("apps/web/public/model/model.onnx"),
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")

    # Load existing model without resetting weights
    ckpt = torch.load(checkpoint_in, map_location="cpu", weights_only=False)
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
    print("Loaded existing checkpoint successfully.")

    # High-quality data augmentations
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    dataset = MixedConditionDataset(
        raw_dir=Path("ml/data/train"),
        ext_dir=Path("ml/data/train_extracted"),
        transform=train_transform,
    )
    print(f"Total training samples (mixed raw + extracted): {len(dataset)}")

    # Split 90% train / 10% val
    n_val = max(100, int(len(dataset) * 0.1))
    n_train = len(dataset) - n_val
    train_set, val_set = torch.utils.data.random_split(
        dataset, [n_train, n_val], generator=torch.Generator().manual_seed(42)
    )

    train_loader = DataLoader(train_set, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_set, batch_size=batch_size, shuffle=False, num_workers=0)

    # Class weights giving extra focus to the 5 active classes
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

    best_acc = 0.0
    best_weights = None

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        correct = 0
        total = 0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * images.size(0)
            preds = outputs.argmax(dim=1)
            correct += (preds == labels).sum().item()
            total += images.size(0)

        scheduler.step()
        train_acc = correct / max(1, total)

        # Validation
        model.eval()
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                preds = outputs.argmax(dim=1)
                val_correct += (preds == labels).sum().item()
                val_total += images.size(0)

        val_acc = val_correct / max(1, val_total)
        print(f"Epoch {epoch:02d}/{epochs:02d} - Loss: {total_loss/total:.4f} - Train Acc: {train_acc*100:.2f}% - Val Acc: {val_acc*100:.2f}%")

        if val_acc > best_acc:
            best_acc = val_acc
            best_weights = {k: v.cpu().clone() for k, v in model.state_dict().items()}

    if best_weights:
        model.load_state_dict(best_weights)

    # Save best.pt
    ckpt["state_dict"] = {k: v.cpu() for k, v in model.state_dict().items()}
    ckpt["val_accuracy"] = best_acc
    torch.save(ckpt, checkpoint_out)
    print(f"Saved best model checkpoint to {checkpoint_out} (Val Acc: {best_acc*100:.2f}%)")

    # Export to ONNX
    model.eval()
    model.to("cpu")
    dummy = torch.randn(1, 3, 224, 224)

    for target in [onnx_out, web_onnx_out]:
        target.parent.mkdir(parents=True, exist_ok=True)
        torch.onnx.export(
            model,
            dummy,
            str(target),
            input_names=["input"],
            output_names=["output"],
            opset_version=17,
            do_constant_folding=True,
            dynamo=False,
        )
        data_file = target.with_suffix(".onnx.data")
        if data_file.exists():
            data_file.unlink()
        print(f"Exported standalone ONNX to {target} ({target.stat().st_size / (1024*1024):.2f} MB)")


if __name__ == "__main__":
    train_robust_model(epochs=6, batch_size=32, lr=1.8e-4)
