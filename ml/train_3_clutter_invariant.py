"""Phase: train_3 (Clutter-Invariant Model Training)
Trains MobileNetV3-Small with synthetic background blending and clutter injection
to ensure recognition remains accurate even in messy, complex environments.
"""

import os
import random
import time
import json
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
from PIL import Image
import numpy as np

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

class ClutterInvariantDataset(Dataset):
    def __init__(self, items, other_images, transform=None, is_train=False):
        self.items = items
        self.other_images = other_images
        self.transform = transform
        self.is_train = is_train

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        path, label_idx = self.items[idx]
        im = Image.open(path).convert("RGB")

        # In training, inject misc clutter/objects beside habits with 45% probability
        if self.is_train and label_idx != CLASSES.index("other") and self.other_images and random.random() < 0.45:
            try:
                other_path = random.choice(self.other_images)
                other_im = Image.open(other_path).convert("RGB")
                # Pick a random patch of clutter
                cw = random.randint(int(im.width * 0.25), int(im.width * 0.55))
                ch = random.randint(int(im.height * 0.25), int(im.height * 0.55))
                clutter_patch = other_im.resize((cw, ch))
                
                # Paste on one of the 4 corners or edges (leaving center/habit visible)
                paste_x = random.choice([0, im.width - cw])
                paste_y = random.choice([0, im.height - ch])
                im_comp = im.copy()
                im_comp.paste(clutter_patch, (paste_x, paste_y))
                im = im_comp
            except Exception:
                pass

        if self.transform:
            im = self.transform(im)
        return im, label_idx

def build_splits(root_dir="ml/data_multistyle", split_ratio=0.85, seed=42):
    random.seed(seed)
    train_items = []
    val_items = []
    other_train_paths = []

    for c in CLASSES:
        cdir = os.path.join(root_dir, c)
        if not os.path.isdir(cdir):
            continue
        c_idx = CLASSES.index(c)
        files = [os.path.join(cdir, f) for f in os.listdir(cdir) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
        random.shuffle(files)
        
        split_point = int(len(files) * split_ratio)
        c_train = files[:split_point]
        c_val = files[split_point:]

        for p in c_train:
            train_items.append((p, c_idx))
            if c == "other":
                other_train_paths.append(p)
        for p in c_val:
            val_items.append((p, c_idx))

    random.shuffle(train_items)
    print(f"Dataset split: {len(train_items)} train, {len(val_items)} validation (across all 8 classes)")
    return train_items, val_items, other_train_paths

def main():
    print("=== Training Clutter-Invariant Multi-Style MobileNetV3 ===", flush=True)
    device = torch.device("cpu")
    print(f"Using device: {device}", flush=True)

    train_items, val_items, other_train_paths = build_splits()

    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.35, 1.0), ratio=(0.75, 1.33)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.20, contrast=0.20, saturation=0.20, hue=0.03),
        transforms.RandomGrayscale(p=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        transforms.RandomErasing(p=0.35, scale=(0.02, 0.25), value="random"),
    ])

    val_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    train_dataset = ClutterInvariantDataset(train_items, other_train_paths, transform=train_tf, is_train=True)
    val_dataset = ClutterInvariantDataset(val_items, None, transform=val_tf, is_train=False)

    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=0)

    # Initialize MobileNetV3 Small with pretrained weights
    weights = MobileNet_V3_Small_Weights.DEFAULT
    model = mobilenet_v3_small(weights=weights)
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Sequential(
        nn.Dropout(p=0.25),
        nn.Linear(in_features, len(CLASSES)),
    )
    model = model.to(device)

    # Balanced CrossEntropy
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=4.5e-4, weight_decay=1e-4)
    epochs = 12
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)

    best_val_acc = 0.0
    best_checkpoint = None

    for epoch in range(1, epochs + 1):
        t0 = time.time()
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for imgs, labels in train_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * imgs.size(0)
            preds = outputs.argmax(dim=1)
            train_correct += (preds == labels).sum().item()
            train_total += labels.size(0)

        scheduler.step()
        train_acc = (train_correct / train_total) * 100
        train_loss = train_loss / train_total

        # Validation
        model.eval()
        val_correct = 0
        val_total = 0
        per_class_val = {c: {"correct": 0, "total": 0} for c in CLASSES}

        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                outputs = model(imgs)
                preds = outputs.argmax(dim=1)
                val_correct += (preds == labels).sum().item()
                val_total += labels.size(0)
                for p, l in zip(preds.cpu().numpy(), labels.cpu().numpy()):
                    c_name = CLASSES[l]
                    per_class_val[c_name]["total"] += 1
                    if p == l:
                        per_class_val[c_name]["correct"] += 1

        val_acc = (val_correct / val_total) * 100
        elapsed = time.time() - t0

        print(f"Epoch {epoch:02d}/{epochs:02d} [{elapsed:.1f}s] | Train Acc: {train_acc:.2f}% | Val Acc: {val_acc:.2f}%", flush=True)
        # Check per class
        bag_acc = (per_class_val['recycle_bags']['correct'] / per_class_val['recycle_bags']['total'] * 100) if per_class_val['recycle_bags']['total'] else 0
        bot_acc = (per_class_val['self_bottle_refill']['correct'] / per_class_val['self_bottle_refill']['total'] * 100) if per_class_val['self_bottle_refill']['total'] else 0
        box_acc = (per_class_val['box_cutlery']['correct'] / per_class_val['box_cutlery']['total'] * 100) if per_class_val['box_cutlery']['total'] else 0
        oth_acc = (per_class_val['other']['correct'] / per_class_val['other']['total'] * 100) if per_class_val['other']['total'] else 0
        print(f"   Bags: {bag_acc:.1f}% | Bottle: {bot_acc:.1f}% | Bento: {box_acc:.1f}% | Other: {oth_acc:.1f}%", flush=True)

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_checkpoint = {
                "arch": "mobilenet_v3_small",
                "version": "mobilenet_v3_small-v0.1.8-clutter-invariant",
                "classes": CLASSES,
                "val_accuracy": val_acc,
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                "state_dict": model.state_dict(),
            }
            torch.save(best_checkpoint, "ml/model/best.pt")
            print(f"   --> Saved new best checkpoint (Val Acc: {val_acc:.2f}%)", flush=True)

    print(f"\nTraining Complete! Peak Val Accuracy: {best_val_acc:.2f}%", flush=True)

    # Export to ONNX
    print("Exporting to ONNX...", flush=True)
    model.load_state_dict(best_checkpoint["state_dict"])
    model.eval()
    dummy_input = torch.randn(1, 3, 224, 224)
    onnx_path = "ml/model/model.onnx"
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
    )
    print(f"Saved ONNX model to {onnx_path} ({os.path.getsize(onnx_path)} bytes)", flush=True)

    # Copy to apps/web/public/model/model.onnx
    import shutil
    shutil.copy2(onnx_path, "apps/web/public/model/model.onnx")
    print("Copied to apps/web/public/model/model.onnx", flush=True)

    # Save validation items list for 300+ image Vercel verification
    val_manifest = [{"path": p, "expected": CLASSES[l]} for p, l in val_items]
    with open("ml/model/val_300_manifest.json", "w") as f:
        json.dump(val_manifest, f, indent=2)
    print(f"Saved validation manifest ({len(val_manifest)} images) to ml/model/val_300_manifest.json", flush=True)

if __name__ == "__main__":
    main()
