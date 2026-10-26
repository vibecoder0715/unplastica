import sys
sys.path.insert(0, ".")
import os
import shutil
import time
from datetime import datetime
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


class ExtractedFolderDataset(Dataset):
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


def calibrate():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("==========================================================")
    print("🔥 CALIBRATING MODEL WEIGHTS ON EXTRACTED HABIT DATASET")
    print(f"Device: {device}")
    print("==========================================================")

    checkpoint_path = Path("ml/model/best.pt")
    ckpt = torch.load(checkpoint_path, map_location="cpu", weights_only=False)

    model = mobilenet_v3_small(weights=None)
    state_dict = ckpt.get("state_dict", ckpt)
    if any(k.startswith("classifier.3.1.") for k in state_dict.keys()):
        model.classifier[3] = nn.Sequential(nn.Dropout(0.2), nn.Linear(model.classifier[3].in_features, len(CLASSES)))
    else:
        model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(CLASSES))
    model.load_state_dict(state_dict)
    model.to(device)

    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=8),
        transforms.ColorJitter(brightness=0.08, contrast=0.08),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    full_dataset = ExtractedFolderDataset(Path("ml/data/train_extracted"), transform=train_transform)
    total_samples = len(full_dataset)
    val_count = int(total_samples * 0.15)
    train_count = total_samples - val_count

    train_set, val_set = torch.utils.data.random_split(
        full_dataset,
        [train_count, val_count],
        generator=torch.Generator().manual_seed(42),
    )

    train_loader = DataLoader(train_set, batch_size=32, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_set, batch_size=32, shuffle=False, num_workers=0)

    # Gentle fine-tune with label_smoothing=0.0 to enable sharp confidence on habits
    optimizer = torch.optim.AdamW(model.parameters(), lr=3.5e-5, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.0)

    for epoch in range(1, 3):
        model.train()
        r_loss, correct, total = 0.0, 0, 0
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            r_loss += loss.item() * inputs.size(0)
            _, pred = outputs.max(1)
            total += targets.size(0)
            correct += pred.eq(targets).sum().item()

        train_acc = correct / total
        train_loss = r_loss / total

        model.eval()
        v_loss, v_corr, v_tot = 0.0, 0, 0
        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)
                v_loss += loss.item() * inputs.size(0)
                _, pred = outputs.max(1)
                v_tot += targets.size(0)
                v_corr += pred.eq(targets).sum().item()

        val_acc = v_corr / v_tot
        val_loss = v_loss / v_tot
        print(f"Calibration Epoch {epoch:02d}/02 | Train Loss: {train_loss:.4f} | Train Acc: {train_acc*100:.2f}% | Val Loss: {val_loss:.4f} | Val Acc: {val_acc*100:.2f}%")

    # Save calibrated weights
    best_weights = {k: v.cpu().clone() for k, v in model.state_dict().items()}
    checkpoint_data = {
        "arch": "mobilenet_v3_small",
        "version": "mobilenet_v3_small-v0.5.0-calibrated-habit",
        "classes": CLASSES,
        "val_accuracy": round(val_acc, 4),
        "created_at": datetime.now().isoformat() + "Z",
        "classifier_style": "dropout_sequential" if any(k.startswith("classifier.3.1.") for k in best_weights.keys()) else "linear",
        "state_dict": best_weights,
    }
    torch.save(checkpoint_data, checkpoint_path)
    print(f"✅ Calibrated checkpoint saved to {checkpoint_path.resolve()}")

    # Export ONNX
    model.eval()
    dummy = torch.randn(1, 3, 224, 224, device=device)
    onnx_path = Path("ml/model/model.onnx")
    torch.onnx.export(
        model,
        dummy,
        str(onnx_path),
        input_names=["input"],
        output_names=["output"],
        opset_version=17,
        do_constant_folding=True,
    )
    data_file = onnx_path.with_suffix(".onnx.data")
    if data_file.exists():
        data_file.unlink()
    print(f"✅ ONNX exported: {onnx_path.resolve()} ({onnx_path.stat().st_size / (1024*1024):.2f} MB)")

    # Sync to web app
    web_onnx = Path("apps/web/public/model/model.onnx")
    if web_onnx.parent.exists():
        shutil.copyfile(onnx_path, web_onnx)
        print(f"✅ Synchronized ONNX to web client: {web_onnx.resolve()}")

    # Check user bottle
    from ml.extraction_engine import get_extraction_engine
    eng = get_extraction_engine()
    ub_path = Path("ml/test_samples/user_bottle.png")
    if ub_path.exists():
        ext_ub, ub_meta = eng.extract_main_character(ub_path, mode="crop_composite")
        tensor_ub = val_transform(ext_ub).unsqueeze(0).to(device)
        with torch.no_grad():
            ub_probs = torch.softmax(model(tensor_ub)[0], dim=0)
        ub_top_p, ub_top_idx = ub_probs.max(0)
        ub_pred = CLASSES[int(ub_top_idx)]
        ub_bottle_prob = ub_probs[CLASSES.index("self_bottle_refill")].item()
        print(f"\n🍾 User bottle test: Pred={ub_pred} ({ub_top_p.item()*100:.2f}%) | bottle_prob={ub_bottle_prob*100:.2f}% | Approved={bool(ub_pred == 'self_bottle_refill' and ub_top_p.item() >= 0.85)}")


if __name__ == "__main__":
    calibrate()
