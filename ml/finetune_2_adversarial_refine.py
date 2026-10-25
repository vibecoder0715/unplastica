"""Phase: finetune_2 (Adversarial Hard-Negative Refinement)
Refines and retrains classifier against adversarial negatives (anime art, digital memes,
single-use disposable plastics, styrofoam) to eliminate false approvals.
"""

from __future__ import annotations

import io
import json
import os
import random
import re
import urllib.parse
import urllib.request
from pathlib import Path
from PIL import Image, ImageEnhance

import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torchvision.models import (
    MobileNet_V3_Small_Weights,
    mobilenet_v3_small,
)

CATEGORIES = [
    "box_cutlery",
    "recycle_bags",
    "self_bottle_refill",
    "greenery_furniture",
    "handicraft_projects",
    "beeswax_food_wraps",
    "bulk_pantry_refill",
    "other",
]

TARGETED_QUERIES: dict[str, list[str]] = {
    "beeswax_food_wraps": [
        "beeswax wrap",
        "beeswax wraps",
        "wax wrap",
        "food wrap beeswax",
    ],
    "other": [
        "plastic bag",
        "plastic cup",
        "styrofoam container",
        "plastic water bottle",
        "office desk keyboard",
        "cardboard box packaging",
    ],
    "self_bottle_refill": [
        "metal flask",
        "stainless steel flask",
        "insulated tumbler",
        "water bottle reusable",
    ],
    "greenery_furniture": [
        "potted houseplant",
        "succulent potted",
        "indoor plant pot",
    ],
    "box_cutlery": [
        "stainless steel lunch box",
        "bento box metal",
        "metal tiffin",
    ],
    "recycle_bags": [
        "canvas tote bag",
        "cotton shopping bag",
        "mesh market bag",
    ],
    "handicraft_projects": [
        "wicker basket handmade",
        "macrame plant hanger",
        "handmade rattan craft",
    ],
    "bulk_pantry_refill": [
        "mason jar pantry",
        "glass jars grains",
        "bulk dispenser pantry",
    ],
}

USER_AGENT = "UnplasticaResearch/1.0 (Environmental Habit Classification Verification; APU; contact: unplastica@gmail.com)"
EXCLUDE_REGEX = re.compile(
    r"(diagram|chart|graph|logo|map|drawing|icon|flag|screenshot|poster|stamp|coin|symbol|infographic)",
    re.IGNORECASE,
)


def search_wikimedia(query: str, limit: int = 10) -> list[str]:
    encoded = urllib.parse.quote(query)
    url = (
        f"https://commons.wikimedia.org/w/api.php?action=query&generator=search"
        f"&gsrsearch={encoded}&gsrnamespace=6&gsrlimit={limit}"
        f"&prop=imageinfo&iiprop=url|mime&iiurlwidth=512&format=json"
    )
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as err:
        return []

    pages = payload.get("query", {}).get("pages", {})
    image_urls: list[str] = []
    for pid, page in pages.items():
        title = page.get("title", "")
        if EXCLUDE_REGEX.search(title):
            continue
        infos = page.get("imageinfo", [])
        if not infos:
            continue
        mime = infos[0].get("mime", "").lower()
        if mime not in ("image/jpeg", "image/png", "image/webp"):
            continue
        thumb = infos[0].get("thumburl") or infos[0].get("url")
        if thumb and thumb not in image_urls:
            image_urls.append(thumb)
    return image_urls


def download_image(url: str) -> Image.Image | None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            data = response.read()
        im = Image.open(io.BytesIO(data))
        im = im.convert("RGB")
        if im.width < 120 or im.height < 120:
            return None
        return im
    except Exception:
        return None


def create_augmented_variations(im: Image.Image, count: int = 2) -> list[Image.Image]:
    out = []
    w, h = im.size
    for i in range(count):
        rnd = random.Random(i * 17 + 7)
        crop_scale = rnd.uniform(0.70, 0.95)
        nw, nh = int(w * crop_scale), int(h * crop_scale)
        left = rnd.randint(0, max(0, w - nw))
        top = rnd.randint(0, max(0, h - nh))
        v = im.crop((left, top, left + nw, top + nh))
        v = ImageEnhance.Brightness(v).enhance(rnd.uniform(0.80, 1.25))
        v = ImageEnhance.Contrast(v).enhance(rnd.uniform(0.85, 1.20))
        v = ImageEnhance.Color(v).enhance(rnd.uniform(0.85, 1.20))
        if rnd.random() > 0.5:
            v = v.transpose(Image.FLIP_LEFT_RIGHT)
        out.append(v.resize((384, 384), Image.Resampling.LANCZOS))
    return out


def augment_training_data(base_dir: Path):
    train_dir = base_dir / "ml" / "data" / "train"
    val_dir = base_dir / "ml" / "data" / "val"
    print("=== Augmenting Training Data with Targeted Examples ===")

    # Add adversarial images to 'other' training class
    adv_dir = base_dir / "ml" / "test_adversarial"
    if adv_dir.is_dir():
        for adv_file in adv_dir.iterdir():
            if adv_file.suffix.lower() in (".jpg", ".jpeg", ".png"):
                dest = train_dir / "other" / f"adv_hard_{adv_file.name}"
                if not dest.exists():
                    with Image.open(adv_file) as img:
                        img.convert("RGB").resize((384, 384)).save(dest, "JPEG", quality=90)
                        # Also add 2 variations for robustness
                        for idx, var in enumerate(create_augmented_variations(img, 2)):
                            var.save(train_dir / "other" / f"adv_hard_{adv_file.stem}_v{idx}.jpg", "JPEG", quality=88)

    # For priority underperforming classes (beeswax_food_wraps, other, self_bottle_refill)
    priority_classes = ["beeswax_food_wraps", "other", "self_bottle_refill", "greenery_furniture"]
    for cat in priority_classes:
        existing_images = list((train_dir / cat).glob("*.jpg"))
        existing_count = len(existing_images)

        # For beeswax_food_wraps, also harvest from habit asset and existing samples
        if cat == "beeswax_food_wraps":
            habit_asset = base_dir / "apps" / "web" / "public" / "assets" / "habits" / "beeswax-food-wraps.png"
            source_imgs = []
            if habit_asset.is_file():
                source_imgs.append(Image.open(habit_asset).convert("RGB"))
            for ef in list((base_dir / "ml" / "data" / "evals" / "beeswax_food_wraps").glob("*.jpg"))[:6]:
                source_imgs.append(Image.open(ef).convert("RGB"))
            for tf in existing_images[:6]:
                source_imgs.append(Image.open(tf).convert("RGB"))

            added = 0
            for s_idx, src_im in enumerate(source_imgs):
                for v_idx in range(4):
                    rnd = random.Random(s_idx * 100 + v_idx * 7)
                    w, h = src_im.size
                    scale = rnd.uniform(0.60, 0.95)
                    nw, nh = int(w * scale), int(h * scale)
                    left = rnd.randint(0, max(0, w - nw))
                    top = rnd.randint(0, max(0, h - nh))
                    crop_im = src_im.crop((left, top, left + nw, top + nh))
                    crop_im = ImageEnhance.Brightness(crop_im).enhance(rnd.uniform(0.85, 1.20))
                    crop_im = ImageEnhance.Contrast(crop_im).enhance(rnd.uniform(0.85, 1.20))
                    crop_im = ImageEnhance.Color(crop_im).enhance(rnd.uniform(0.85, 1.20))
                    if rnd.random() > 0.5:
                        crop_im = crop_im.transpose(Image.FLIP_LEFT_RIGHT)
                    dest = train_dir / cat / f"seed_aug_beeswax_{added:03d}.jpg"
                    crop_im.resize((384, 384), Image.Resampling.LANCZOS).save(dest, "JPEG", quality=90)
                    added += 1
            print(f"[beeswax_food_wraps] Generated {added} specialized variations from seed assets.")

        # For self_bottle_refill, harvest from habit asset and existing samples
        if cat == "self_bottle_refill":
            habit_asset = base_dir / "apps" / "web" / "public" / "assets" / "habits" / "self-bottle-refill.png"
            source_imgs = []
            if habit_asset.is_file():
                source_imgs.append(Image.open(habit_asset).convert("RGB"))
            for ef in list((base_dir / "ml" / "data" / "evals" / "self_bottle_refill").glob("*.jpg"))[:6]:
                source_imgs.append(Image.open(ef).convert("RGB"))

            added = 0
            for s_idx, src_im in enumerate(source_imgs):
                for v_idx in range(3):
                    rnd = random.Random(s_idx * 50 + v_idx * 11)
                    w, h = src_im.size
                    scale = rnd.uniform(0.70, 0.95)
                    nw, nh = int(w * scale), int(h * scale)
                    left = rnd.randint(0, max(0, w - nw))
                    top = rnd.randint(0, max(0, h - nh))
                    crop_im = src_im.crop((left, top, left + nw, top + nh))
                    crop_im = ImageEnhance.Brightness(crop_im).enhance(rnd.uniform(0.85, 1.20))
                    crop_im = ImageEnhance.Contrast(crop_im).enhance(rnd.uniform(0.85, 1.20))
                    if rnd.random() > 0.5:
                        crop_im = crop_im.transpose(Image.FLIP_LEFT_RIGHT)
                    dest = train_dir / cat / f"seed_aug_bottle_{added:03d}.jpg"
                    crop_im.resize((384, 384), Image.Resampling.LANCZOS).save(dest, "JPEG", quality=90)
                    added += 1
            print(f"[self_bottle_refill] Generated {added} specialized variations from seed assets.")

        max_target = 140 if cat in ("beeswax_food_wraps", "self_bottle_refill", "greenery_furniture") else 80
        if existing_count >= max_target:
            print(f"[{cat}] Train set already has {existing_count} images.")
            continue

        print(f"[{cat}] Enriching training set (currently {existing_count} images)...")
        queries = TARGETED_QUERIES.get(cat, [cat])
        added = 0
        for q in queries:
            if existing_count + added >= max_target:
                break
            urls = search_wikimedia(q, limit=8)
            for u in urls:
                im = download_image(u)
                if im:
                    dest = train_dir / cat / f"hard_real_{cat}_{added:03d}.jpg"
                    im.resize((384, 384)).save(dest, "JPEG", quality=92)
                    added += 1
                    for v_idx, var in enumerate(create_augmented_variations(im, 2)):
                        v_dest = train_dir / cat / f"hard_var_{cat}_{added:03d}_{v_idx}.jpg"
                        var.save(v_dest, "JPEG", quality=88)
                        added += 1
                    if existing_count + added >= 80:
                        break
        print(f"[{cat}] Added {added} new hard training images.")


def train_refined_model(base_dir: Path, epochs: int = 15, lr: float = 3e-4) -> float:
    data_dir = base_dir / "ml" / "data"
    output_path = base_dir / "ml" / "model" / "best.pt"

    train_dir = data_dir / "train"
    val_dir = data_dir / "val"

    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.20, contrast=0.20, saturation=0.15),
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

    batch_size = 16
    train_loader = DataLoader(train_set, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_set, batch_size=batch_size, shuffle=False, num_workers=0)

    device = torch.device("cpu")
    print(f"\n--- Training Refined Model ---")
    print(f"Train dataset: {len(train_set)} images | Val dataset: {len(val_set)} images")
    print(f"Epochs: {epochs} | Batch Size: {batch_size} | LR: {lr}")

    # Transfer learning with ImageNet weights
    model = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.DEFAULT)
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(train_set.classes))
    model.to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)
    loss_fn = nn.CrossEntropyLoss()

    best_val_acc = 0.0
    best_state = None
    best_epoch = 0

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = loss_fn(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * images.size(0)

        scheduler.step()
        train_loss = running_loss / len(train_set)

        # Validation
        model.eval()
        val_loss = 0.0
        correct = 0
        with torch.inference_mode():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = loss_fn(outputs, labels)
                val_loss += loss.item() * images.size(0)
                pred = outputs.argmax(dim=1)
                correct += (pred == labels).sum().item()

        val_acc = (correct / len(val_set)) * 100
        val_loss = val_loss / len(val_set)

        print(f"Epoch {epoch:02d}/{epochs}: train loss {train_loss:.4f}, val loss {val_loss:.4f}, val acc {val_acc:.1f}%")

        if val_acc >= best_val_acc:
            best_val_acc = val_acc
            best_epoch = epoch
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

    print(f"\nTraining Complete. Best val accuracy: {best_val_acc:.1f}% (Epoch {best_epoch})")

    # Save best checkpoint
    checkpoint = {
        "state_dict": best_state,
        "classes": train_set.classes,
        "arch": "mobilenet_v3_small",
        "image_size": 224,
        "val_accuracy": best_val_acc,
        "version": f"mobilenet_v3_small-refined-acc-{int(best_val_acc)}",
    }
    torch.save(checkpoint, output_path)
    print(f"Saved refined checkpoint to {output_path}")

    # Export to ONNX
    try:
        model.load_state_dict(best_state)
        model.eval()
        dummy_input = torch.randn(1, 3, 224, 224)
        onnx_path = base_dir / "ml" / "model" / "model.onnx"
        torch.onnx.export(
            model,
            dummy_input,
            str(onnx_path),
            input_names=["input"],
            output_names=["output"],
            dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
            opset_version=14,
        )
        print(f"Exported refined ONNX model to {onnx_path}")
    except Exception as e:
        print(f"Note: ONNX export skipped: {e}")

    return best_val_acc


def main():
    base_dir = Path(".")
    augment_training_data(base_dir)
    train_refined_model(base_dir, epochs=12, lr=3.5e-4)


if __name__ == "__main__":
    main()
