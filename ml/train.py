"""Train a lightweight Unplastica habit photo classifier with transfer learning."""

from __future__ import annotations

import argparse
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torchvision.models import (
    MobileNet_V3_Small_Weights,
    mobilenet_v3_small,
    MobileNet_V3_Large_Weights,
    mobilenet_v3_large,
    EfficientNet_B0_Weights,
    efficientnet_b0,
)


def make_model(arch: str, class_count: int, pretrained: bool) -> nn.Module:
    if arch == "mobilenet_v3_large":
        weights = MobileNet_V3_Large_Weights.DEFAULT if pretrained else None
        model = mobilenet_v3_large(weights=weights)
        model.classifier[3] = nn.Linear(model.classifier[3].in_features, class_count)
    elif arch == "efficientnet_b0":
        weights = EfficientNet_B0_Weights.DEFAULT if pretrained else None
        model = efficientnet_b0(weights=weights)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, class_count)
    else:  # mobilenet_v3_small (default)
        weights = MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
        model = mobilenet_v3_small(weights=weights)
        model.classifier[3] = nn.Linear(model.classifier[3].in_features, class_count)
    return model


def get_default_paths() -> tuple[Path, Path]:
    if Path("ml/data").exists() or (Path("ml").is_dir() and not Path("train.py").exists()):
        return Path("ml/data"), Path("ml/model/best.pt")
    return Path("data"), Path("model/best.pt")


def main() -> None:
    default_data, default_output = get_default_paths()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=default_data, help="Folder with train/ and val/ subfolders")
    parser.add_argument("--arch", type=str, default="mobilenet_v3_small", choices=["mobilenet_v3_small", "mobilenet_v3_large", "efficientnet_b0"])
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--output", type=Path, default=default_output)
    parser.add_argument("--no-pretrained", action="store_true", help="Do not download ImageNet starting weights")
    args = parser.parse_args()

    train_dir = args.data / "train"
    val_dir = args.data / "val"
    if not train_dir.is_dir() or not val_dir.is_dir():
        raise SystemExit("Expected --data/train and --data/val folders. Run python setup_dataset.py first.")

    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.10),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    train_set = datasets.ImageFolder(train_dir, transform=train_transform)
    val_set = datasets.ImageFolder(val_dir, transform=val_transform)
    if len(train_set) == 0 or len(val_set) == 0:
        raise SystemExit("Add at least one image to both train and val folders.")
    if train_set.classes != val_set.classes:
        raise SystemExit("Train and val must have the same class folders, spelled the same way.")
    if len(train_set.classes) < 2:
        raise SystemExit("Add at least two classes, including an 'other' class.")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    use_cuda = device.type == "cuda"
    num_workers = 2 if use_cuda else 0
    train_loader = DataLoader(train_set, batch_size=args.batch_size, shuffle=True, num_workers=num_workers, pin_memory=use_cuda)
    val_loader = DataLoader(val_set, batch_size=args.batch_size, shuffle=False, num_workers=num_workers, pin_memory=use_cuda)
    
    print(f"\n--- Initializing Training ---")
    print(f"Architecture : {args.arch}")
    print(f"Compute Device: {device} ({torch.cuda.get_device_name(0) if use_cuda else 'CPU'})")
    print(f"Classes ({len(train_set.classes)}): {', '.join(train_set.classes)}")
    print(f"Dataset      : {len(train_set)} train images | {len(val_set)} val images")
    print(f"Batch Size   : {args.batch_size} | Epochs: {args.epochs} | Learning Rate: {args.lr}")

    model = make_model(args.arch, len(train_set.classes), pretrained=not args.no_pretrained).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)
    loss_fn = nn.CrossEntropyLoss()
    scaler = torch.amp.GradScaler("cuda", enabled=use_cuda)

    best_accuracy = 0.0
    for epoch in range(1, args.epochs + 1):
        model.train()
        train_loss = 0.0
        for images, labels in train_loader:
            images, labels = images.to(device, non_blocking=use_cuda), labels.to(device, non_blocking=use_cuda)
            optimizer.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda", enabled=use_cuda):
                loss = loss_fn(model(images), labels)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            train_loss += loss.item() * images.size(0)

        scheduler.step()

        model.eval()
        correct, seen, val_loss = 0, 0, 0.0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device, non_blocking=use_cuda), labels.to(device, non_blocking=use_cuda)
                with torch.amp.autocast("cuda", enabled=use_cuda):
                    logits = model(images)
                    loss = loss_fn(logits, labels)
                val_loss += loss.item() * images.size(0)
                correct += (logits.argmax(dim=1) == labels).sum().item()
                seen += labels.size(0)

        accuracy = correct / max(seen, 1)
        curr_lr = optimizer.param_groups[0]["lr"]
        print(f"Epoch {epoch:02}/{args.epochs}: train loss {train_loss / len(train_set):.4f}, val loss {val_loss / max(seen, 1):.4f}, val acc {accuracy:.1%} (lr: {curr_lr:.2e})")

        if accuracy > best_accuracy:
            best_accuracy = accuracy
            args.output.parent.mkdir(parents=True, exist_ok=True)
            torch.save({
                "state_dict": model.cpu().state_dict(),
                "classes": train_set.classes,
                "arch": args.arch,
                "image_size": 224,
                "val_accuracy": best_accuracy,
                "version": f"{args.arch}-epoch-{epoch}-acc-{int(best_accuracy * 100)}",
            }, args.output)
            model.to(device)
            print(f"  --> Saved new best checkpoint to {args.output}")

    print(f"\nTraining Complete. Best validation accuracy: {best_accuracy:.1%}")
    print("Next step: Run `python evaluate.py --data data/evals` to inspect false approval rates.")


if __name__ == "__main__":
    main()
