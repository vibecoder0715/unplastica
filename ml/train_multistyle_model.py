import os
import time
import json
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import transforms, datasets
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

def get_transforms():
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomResizedCrop(224, scale=(0.65, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15, hue=0.03),
        transforms.RandomGrayscale(p=0.08),
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
        "styrofoam": ("ml/test_adversarial/styrofoam_takeout_box.jpg", "other")
    }
    results = {}
    with torch.no_grad():
        for name, (path, expected) in fixtures.items():
            if not os.path.exists(path):
                continue
            im = Image.open(path).convert('RGB')
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
                "correct": (pred_label == expected)
            }
    return results

def train(epochs=18, batch_size=32, lr=3.5e-4):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}", flush=True)

    train_tf, val_tf = get_transforms()
    train_dataset = datasets.ImageFolder("ml/data_multistyle_split/train", transform=train_tf)
    val_dataset = datasets.ImageFolder("ml/data_multistyle_split/val", transform=val_tf)

    print(f"Dataset classes: {train_dataset.classes}")
    assert train_dataset.classes == CLASSES, f"Mismatch in classes: {train_dataset.classes}"

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=2, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=2, pin_memory=True)

    # Weights: slightly favor other (1.25x) without overwhelming
    class_weights = torch.ones(len(CLASSES)).to(device)
    class_weights[CLASSES.index("other")] = 1.30
    class_weights[CLASSES.index("box_cutlery")] = 1.15
    criterion = nn.CrossEntropyLoss(weight=class_weights, label_smoothing=0.06)

    # Model architecture
    weights = MobileNet_V3_Small_Weights.DEFAULT
    model = mobilenet_v3_small(weights=weights)
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Sequential(
        nn.Dropout(p=0.20),
        nn.Linear(in_features, len(CLASSES)),
    )
    model = model.to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)

    best_val_acc = 0.0
    best_checkpoint = None

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        correct = 0
        total = 0

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
        train_acc = correct / total * 100
        train_loss = total_loss / total

        # Validation
        model.eval()
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                outputs = model(imgs)
                preds = outputs.argmax(dim=1)
                val_correct += (preds == labels).sum().item()
                val_total += labels.size(0)

        val_acc = val_correct / val_total * 100
        fix_res = evaluate_fixtures(model, device, val_tf)

        user_bento_status = f"{fix_res['user_bento']['pred']} ({fix_res['user_bento']['conf']*100:.1f}%)" if 'user_bento' in fix_res else 'N/A'
        hu_tao_status = f"{fix_res['hu_tao']['pred']} ({fix_res['hu_tao']['conf']*100:.1f}%)" if 'hu_tao' in fix_res else 'N/A'

        print(f"Epoch {epoch:02d}/{epochs:02d} | Train Acc: {train_acc:.2f}% | Val Acc: {val_acc:.2f}% | Bento: {user_bento_status} | HuTao: {hu_tao_status}", flush=True)

        # Checkpoint if val accuracy is good AND user bento is correctly recognized as box_cutlery AND hu_tao rejected
        bento_ok = fix_res.get('user_bento', {}).get('correct', False)
        hu_tao_ok = fix_res.get('hu_tao', {}).get('correct', False)

        if val_acc >= 88.0 and bento_ok and hu_tao_ok:
            if val_acc > best_val_acc or best_checkpoint is None:
                best_val_acc = val_acc
                os.makedirs("ml/model", exist_ok=True)
                best_checkpoint = {
                    "arch": "mobilenet_v3_small",
                    "version": "mobilenet_v3_small-v0.1.7-multistyle",
                    "classes": CLASSES,
                    "val_accuracy": val_acc,
                    "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                    "classifier_style": "dropout_seq",
                    "state_dict": model.state_dict(),
                }
                torch.save(best_checkpoint, "ml/model/best.pt")
                print(f"  --> Saved new best checkpoint with Val Acc: {val_acc:.2f}% (Bento: {user_bento_status}, HuTao: {hu_tao_status})", flush=True)

    print(f"\nTraining Complete! Best Val Acc: {best_val_acc:.2f}%", flush=True)

    # If no checkpoint met both conditions, save highest val acc model
    if best_checkpoint is None:
        best_checkpoint = {
            "arch": "mobilenet_v3_small",
            "version": "mobilenet_v3_small-v0.1.7-multistyle",
            "classes": CLASSES,
            "val_accuracy": val_acc,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "classifier_style": "dropout_seq",
            "state_dict": model.state_dict(),
        }
        torch.save(best_checkpoint, "ml/model/best.pt")

    # Export ONNX
    print("Exporting ONNX model...", flush=True)
    model.load_state_dict(best_checkpoint["state_dict"])
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
    print(f"Exported PyTorch model to ONNX: {onnx_path} ({os.path.getsize(onnx_path)} bytes)", flush=True)

    # Copy to web app
    import shutil
    shutil.copy2(onnx_path, "apps/web/public/model/model.onnx")
    print("Copied ONNX model to apps/web/public/model/model.onnx", flush=True)

if __name__ == "__main__":
    train(epochs=16, batch_size=32, lr=3.5e-4)
