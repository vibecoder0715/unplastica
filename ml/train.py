"""Train a small, first-pass Unplastica habit photo classifier."""

from __future__ import annotations

import argparse
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small


def make_model(class_count: int, pretrained: bool) -> nn.Module:
    weights = MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
    model = mobilenet_v3_small(weights=weights)
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, class_count)
    return model


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("data"), help="Folder with train/ and val/ subfolders")
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--output", type=Path, default=Path("model/best.pt"))
    parser.add_argument("--no-pretrained", action="store_true", help="Do not download ImageNet starting weights")
    args = parser.parse_args()

    train_dir = args.data / "train"
    val_dir = args.data / "val"
    if not train_dir.is_dir() or not val_dir.is_dir():
        raise SystemExit("Expected --data/train and --data/val folders. See TRAIN.md for the image layout.")

    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.12, contrast=0.12, saturation=0.08),
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
    train_loader = DataLoader(train_set, batch_size=args.batch_size, shuffle=True, num_workers=2, pin_memory=use_cuda)
    val_loader = DataLoader(val_set, batch_size=args.batch_size, shuffle=False, num_workers=2, pin_memory=use_cuda)
    model = make_model(len(train_set.classes), pretrained=not args.no_pretrained).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.0003, weight_decay=0.01)
    loss_fn = nn.CrossEntropyLoss()
    scaler = torch.amp.GradScaler("cuda", enabled=use_cuda)

    print(f"Device: {device}; classes: {', '.join(train_set.classes)}")
    print(f"Training images: {len(train_set)}; validation images: {len(val_set)}")
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
        print(f"Epoch {epoch:02}/{args.epochs}: train loss {train_loss / len(train_set):.4f}, val loss {val_loss / max(seen, 1):.4f}, val accuracy {accuracy:.1%}")
        if accuracy > best_accuracy:
            best_accuracy = accuracy
            args.output.parent.mkdir(parents=True, exist_ok=True)
            torch.save({
                "state_dict": model.cpu().state_dict(),
                "classes": train_set.classes,
                "image_size": 224,
                "version": f"mobilenet-v3-small-epoch-{epoch}",
            }, args.output)
            model.to(device)
            print(f"Saved best model to {args.output}")
    print(f"Best validation accuracy: {best_accuracy:.1%}")
    print("Do not treat accuracy alone as proof quality. Review false approvals before setting a score threshold.")


if __name__ == "__main__":
    main()
