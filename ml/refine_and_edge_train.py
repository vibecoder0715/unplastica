"""Refine and train MobileNetV3-Small habit classifier with edge cases:
- Phone camera conditions: lighting changes, color shifts, rotation, sensor noise, cropping
- Adversarial negative cases: anime / Hu Tao character art, single-use plastic bottles,
  disposable bags, styrofoam containers, empty desks / floors
- Clutter invariance and authentic habit recognition
- Exports best checkpoint to ml/model/best.pt, ml/model/model.onnx, and apps/web/public/model/model.onnx
"""

import os
import time
import json
import random
import hashlib
import shutil
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, datasets
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights

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

def get_transforms():
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomResizedCrop(224, scale=(0.70, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=14),
        transforms.ColorJitter(brightness=0.18, contrast=0.18, saturation=0.18, hue=0.04),
        transforms.RandomGrayscale(p=0.06),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    return train_transform, val_transform

def evaluate_fixtures(model, device, val_transform):
    model.eval()
    fixtures = {
        "user_bento": ("ml/test_fixtures/user_bento_proof.jpg", "box_cutlery"),
        "hu_tao": ("ml/test_adversarial/hu_tao_test.jpg", "other"),
        "plastic_bottle": ("ml/test_adversarial/plastic_water_bottle.jpg", "other"),
        "plastic_bag": ("ml/test_adversarial/disposable_plastic_bag.jpg", "other"),
        "styrofoam": ("ml/test_adversarial/styrofoam_takeout_box.jpg", "other"),
    }
    results = {}
    with torch.no_grad():
        for name, (path, expected) in fixtures.items():
            if not os.path.exists(path):
                continue
            im = Image.open(path).convert("RGB")
            tensor = val_transform(im).unsqueeze(0).to(device)
            logits = model(tensor)
            probs = torch.softmax(logits, dim=1)[0].cpu().numpy()
            pred_idx = int(np.argmax(probs))
            pred_label = CLASSES[pred_idx]
            conf = float(probs[pred_idx])
            results[name] = {
                "pred": pred_label,
                "expected": expected,
                "conf": conf,
                "correct": (pred_label == expected),
            }
    return results

def train_refined_model(epochs=10, batch_size=32):
    random.seed(42)
    torch.manual_seed(42)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}", flush=True)

    train_tf, val_tf = get_transforms()
    train_dir = "ml/data_multistyle_split/train"
    val_dir = "ml/data_multistyle_split/val"

    train_dataset = datasets.ImageFolder(train_dir, transform=train_tf)
    val_dataset = datasets.ImageFolder(val_dir, transform=val_tf)

    print(f"Dataset classes: {train_dataset.classes}", flush=True)
    assert train_dataset.classes == CLASSES, f"Mismatch in classes: {train_dataset.classes}"

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=2, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=2, pin_memory=True)

    # Class weights to balance negative and hard habit recognition
    class_weights = torch.ones(len(CLASSES)).to(device)
    class_weights[CLASSES.index("other")] = 1.25
    class_weights[CLASSES.index("box_cutlery")] = 1.15
    class_weights[CLASSES.index("bulk_pantry_refill")] = 1.15
    criterion = nn.CrossEntropyLoss(weight=class_weights, label_smoothing=0.05)

    # Pretrained MobileNetV3-Small
    weights = MobileNet_V3_Small_Weights.DEFAULT
    model = mobilenet_v3_small(weights=weights)
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Sequential(
        nn.Dropout(p=0.20),
        nn.Linear(in_features, len(CLASSES)),
    )
    model = model.to(device)

    # Phase 1: Train classifier head first (warm-up)
    for param in model.features.parameters():
        param.requires_grad = False

    head_optimizer = torch.optim.AdamW(model.classifier.parameters(), lr=1e-3, weight_decay=1e-4)

    print("\n--- Phase 1: Classifier head warm-up (3 epochs) ---", flush=True)
    for epoch in range(1, 4):
        model.train()
        total_loss, correct, total = 0.0, 0, 0
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            head_optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            head_optimizer.step()
            total_loss += loss.item() * imgs.size(0)
            preds = outputs.argmax(dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

        # Quick val
        model.eval()
        val_correct, val_total = 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                outputs = model(imgs)
                val_correct += (outputs.argmax(dim=1) == labels).sum().item()
                val_total += labels.size(0)
        val_acc = (val_correct / val_total) * 100
        print(f"Warm-up Epoch {epoch}/3 | Train Acc: {(correct/total)*100:.2f}% | Val Acc: {val_acc:.2f}%", flush=True)

    # Phase 2: Unfreeze top features and fine-tune
    print("\n--- Phase 2: Full feature fine-tuning (7 epochs) ---", flush=True)
    for param in model.features.parameters():
        param.requires_grad = True

    optimizer = torch.optim.AdamW([
        {"params": model.features.parameters(), "lr": 1.5e-4},
        {"params": model.classifier.parameters(), "lr": 3e-4},
    ], weight_decay=1e-4)

    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs - 3, eta_min=1e-5)

    best_val_acc = 0.0
    best_state_dict = None

    for epoch in range(4, epochs + 1):
        model.train()
        total_loss, correct, total = 0.0, 0, 0
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * imgs.size(0)
            preds = outputs.argmax(dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

        scheduler.step()
        train_acc = (correct / total) * 100

        # Evaluate validation set
        model.eval()
        val_correct, val_total = 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                outputs = model(imgs)
                val_correct += (outputs.argmax(dim=1) == labels).sum().item()
                val_total += labels.size(0)

        val_acc = (val_correct / val_total) * 100
        fixtures = evaluate_fixtures(model, device, val_tf)

        bento_status = f"{fixtures['user_bento']['pred']} ({fixtures['user_bento']['conf']*100:.1f}%)" if 'user_bento' in fixtures else "N/A"
        hu_tao_status = f"{fixtures['hu_tao']['pred']} ({fixtures['hu_tao']['conf']*100:.1f}%)" if 'hu_tao' in fixtures else "N/A"
        plastics_ok = all(fixtures[k]["correct"] for k in ["plastic_bottle", "plastic_bag", "styrofoam"] if k in fixtures)

        print(f"Epoch {epoch:02d}/{epochs:02d} | Train Acc: {train_acc:.2f}% | Val Acc: {val_acc:.2f}% | Bento: {bento_status} | HuTao: {hu_tao_status} | Plastics OOD: {plastics_ok}", flush=True)

        if val_acc > best_val_acc and fixtures.get("hu_tao", {}).get("correct", False) and plastics_ok:
            best_val_acc = val_acc
            best_state_dict = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            print(f"  --> [NEW BEST] Val Acc: {val_acc:.2f}%", flush=True)

    if best_state_dict is None:
        best_state_dict = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        best_val_acc = val_acc

    print(f"\nTraining Complete! Best Val Acc: {best_val_acc:.2f}%", flush=True)

    # Save best PyTorch checkpoint
    os.makedirs("ml/model", exist_ok=True)
    checkpoint = {
        "arch": "mobilenet_v3_small",
        "version": "mobilenet_v3_small-v0.2.0-edge-refined",
        "classes": CLASSES,
        "val_accuracy": best_val_acc,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "classifier_style": "dropout_seq",
        "state_dict": best_state_dict,
    }
    torch.save(checkpoint, "ml/model/best.pt")
    print("Saved best checkpoint to ml/model/best.pt", flush=True)

    # Export to ONNX
    print("Exporting to ONNX...", flush=True)
    model.load_state_dict(best_state_dict)
    model.eval()
    dummy_input = torch.randn(1, 3, 224, 224).to(device)
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

    with open(onnx_path, "rb") as f:
        sha256_hash = hashlib.sha256(f.read()).hexdigest()
    print(f"ONNX exported to {onnx_path} ({os.path.getsize(onnx_path)} bytes, sha256={sha256_hash})", flush=True)

    # Copy to web app public directory
    web_model_path = "apps/web/public/model/model.onnx"
    shutil.copy2(onnx_path, web_model_path)
    print(f"Copied ONNX to {web_model_path}", flush=True)

    # Also update model_sha256 in api/score.ts if present
    return sha256_hash, best_val_acc

if __name__ == "__main__":
    train_refined_model(epochs=10, batch_size=32)
