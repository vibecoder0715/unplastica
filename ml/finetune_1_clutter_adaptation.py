"""Phase: finetune_1 (Clutter Adaptation Fine-Tuning)
Fine-tunes trained MobileNetV3 weights against high-clutter campus scenarios
(messy cafeteria tables, backpacks, dorm desks) to prevent background confusion.
"""

import os
import random
import time
import json
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from torchvision.models import mobilenet_v3_small
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

class ClutterDataset(Dataset):
    def __init__(self, items, other_images, transform=None, is_train=True):
        self.items = items
        self.other_images = other_images
        self.transform = transform
        self.is_train = is_train

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        path, label_idx = self.items[idx]
        im = Image.open(path).convert("RGB")

        # In training, augment habits with realistic side-by-side clutter
        if self.is_train and label_idx != CLASSES.index("other") and self.other_images and random.random() < 0.50:
            try:
                other_path = random.choice(self.other_images)
                other_im = Image.open(other_path).convert("RGB")
                cw = random.randint(int(im.width * 0.20), int(im.width * 0.50))
                ch = random.randint(int(im.height * 0.20), int(im.height * 0.50))
                clutter_patch = other_im.resize((cw, ch))
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

def main():
    print("Fine-tuning clutter-invariant model...", flush=True)
    manifest = json.load(open("ml/model/val_300_manifest.json"))
    val_items = [(x["path"], CLASSES.index(x["expected"])) for x in manifest]
    val_paths = set(x["path"] for x in manifest)

    root_dir = "ml/data_multistyle"
    train_items = []
    other_train_paths = []
    for c in CLASSES:
        cdir = os.path.join(root_dir, c)
        if not os.path.isdir(cdir):
            continue
        c_idx = CLASSES.index(c)
        for f in os.listdir(cdir):
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                p = os.path.join(cdir, f)
                if p not in val_paths:
                    train_items.append((p, c_idx))
                    if c == "other":
                        other_train_paths.append(p)

    print(f"Train samples: {len(train_items)}, Val samples: {len(val_items)}")

    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.45, 1.0), ratio=(0.8, 1.25)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    train_loader = DataLoader(ClutterDataset(train_items, other_train_paths, transform=train_tf, is_train=True), batch_size=32, shuffle=True)
    val_loader = DataLoader(ClutterDataset(val_items, None, transform=val_tf, is_train=False), batch_size=32, shuffle=False)

    model = mobilenet_v3_small(weights=None)
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Sequential(
        nn.Dropout(p=0.25),
        nn.Linear(in_features, len(CLASSES)),
    )

    ckpt = torch.load("ml/model/best.pt", map_location="cpu")
    model.load_state_dict(ckpt["state_dict"])
    best_val_acc = ckpt.get("val_accuracy", 74.46)
    print(f"Loaded previous checkpoint with val_acc: {best_val_acc:.2f}%")

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=1.8e-4, weight_decay=5e-5)
    epochs = 8
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)

    for epoch in range(1, epochs + 1):
        t0 = time.time()
        model.train()
        train_loss, train_correct, train_total = 0.0, 0, 0
        for imgs, labels in train_loader:
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * imgs.size(0)
            train_correct += (outputs.argmax(dim=1) == labels).sum().item()
            train_total += labels.size(0)

        scheduler.step()
        train_acc = (train_correct / train_total) * 100

        model.eval()
        val_correct, val_total = 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                outputs = model(imgs)
                val_correct += (outputs.argmax(dim=1) == labels).sum().item()
                val_total += labels.size(0)

        val_acc = (val_correct / val_total) * 100
        print(f"Epoch {epoch}/{epochs} [{time.time()-t0:.1f}s] | Train Acc: {train_acc:.2f}% | Val Acc: {val_acc:.2f}%", flush=True)

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            ckpt["val_accuracy"] = val_acc
            ckpt["state_dict"] = model.state_dict()
            torch.save(ckpt, "ml/model/best.pt")
            print(f"  --> Saved new best checkpoint ({val_acc:.2f}%)")

    # Load best and export ONNX
    print(f"\nFinal Best Val Acc: {best_val_acc:.2f}%. Exporting to ONNX...")
    best_ckpt = torch.load("ml/model/best.pt", map_location="cpu")
    model.load_state_dict(best_ckpt["state_dict"])
    model.eval()
    dummy_input = torch.randn(1, 3, 224, 224)
    torch.onnx.export(
        model,
        dummy_input,
        "ml/model/model.onnx",
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
    )
    import shutil
    shutil.copy2("ml/model/model.onnx", "apps/web/public/model/model.onnx")
    print("Exported and updated apps/web/public/model/model.onnx")

if __name__ == "__main__":
    main()
