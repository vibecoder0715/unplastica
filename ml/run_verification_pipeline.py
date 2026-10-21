"""Script to generate/find a mixed 50-image test set, run the Unplastica visual verification pipeline,
document the per-image results, and evaluate whether model refinement is needed.
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
from torchvision import transforms
from torchvision.models import mobilenet_v3_small, mobilenet_v3_large, efficientnet_b0

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

QUERIES: dict[str, list[str]] = {
    "box_cutlery": [
        "stainless steel lunch box",
        "bento box food",
        "tiffin carrier lunch",
    ],
    "recycle_bags": [
        "canvas tote bag grocery",
        "cotton shopping bag reusable",
        "mesh produce market bag",
    ],
    "self_bottle_refill": [
        "stainless steel water bottle flask",
        "metal drinking tumbler",
        "vacuum insulated flask bottle",
    ],
    "greenery_furniture": [
        "indoor potted plant houseplant",
        "succulent potted indoor plant",
        "houseplant flowerpot window table",
    ],
    "handicraft_projects": [
        "woven rattan basket craft handmade",
        "macrame plant hanger craft",
        "upcycled handmade craft project",
    ],
    "beeswax_food_wraps": [
        "beeswax wrap",
        "beeswax wraps",
        "wax wrap",
    ],
    "bulk_pantry_refill": [
        "mason jar food pantry grains",
        "glass storage jars rice beans pantry",
        "bulk food dispenser zero waste",
    ],
    "other": [
        "disposable plastic cup straw drink",
        "disposable plastic cutlery fork",
        "plastic shopping bag single use",
        "cardboard shipping box packaging",
    ],
}

USER_AGENT = "UnplasticaResearch/1.0 (Environmental Habit Classification Verification; APU; contact: unplastica@gmail.com)"
EXCLUDE_REGEX = re.compile(
    r"(diagram|chart|graph|logo|map|drawing|icon|flag|screenshot|poster|stamp|coin|symbol|infographic)",
    re.IGNORECASE,
)


def search_wikimedia(query: str, limit: int = 8) -> list[str]:
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
        print(f"  [warn] Wikimedia query failed for '{query}': {err}")
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


def create_phone_camera_simulation(im: Image.Image, seed: int) -> Image.Image:
    w, h = im.size
    rnd = random.Random(seed)
    crop_scale = rnd.uniform(0.75, 0.95)
    nw, nh = int(w * crop_scale), int(h * crop_scale)
    left = rnd.randint(0, max(0, w - nw))
    top = rnd.randint(0, max(0, h - nh))
    out = im.crop((left, top, left + nw, top + nh))
    out = ImageEnhance.Brightness(out).enhance(rnd.uniform(0.85, 1.20))
    out = ImageEnhance.Contrast(out).enhance(rnd.uniform(0.88, 1.15))
    out = ImageEnhance.Color(out).enhance(rnd.uniform(0.85, 1.15))
    if rnd.random() > 0.5:
        out = out.transpose(Image.FLIP_LEFT_RIGHT)
    return out.resize((384, 384), Image.Resampling.LANCZOS)


def prepare_50_images(output_dir: Path) -> list[tuple[Path, str, str]]:
    """Build a balanced 50-image dataset (6 per 7 habits + 8 other = 50 total)."""
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest: list[tuple[Path, str, str]] = []  # (path, true_label, source_type)

    print("--- Curating 50 Mixed Test Images Across 8 Classes ---")

    for cat in CATEGORIES:
        cat_dir = output_dir / cat
        cat_dir.mkdir(exist_ok=True)
        target_count = 8 if cat == "other" else 6
        current_images: list[tuple[Path, str]] = []

        # Check existing images in test directory first
        existing = [p for p in cat_dir.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")]
        if len(existing) >= target_count:
            print(f"[{cat}] Already has {len(existing)} images ready.")
            for p in existing[:target_count]:
                manifest.append((p, cat, "cached_mixed"))
            continue

        # For adversarial 'other', incorporate from ml/test_adversarial if available
        if cat == "other":
            adv_dir = Path("ml/test_adversarial")
            if adv_dir.is_dir():
                for adv_file in adv_dir.iterdir():
                    if adv_file.suffix.lower() in (".jpg", ".jpeg", ".png") and len(current_images) < 4:
                        dest = cat_dir / f"adv_{adv_file.name}"
                        with Image.open(adv_file) as img:
                            img.convert("RGB").resize((384, 384)).save(dest, "JPEG", quality=90)
                        current_images.append((dest, "adversarial_real"))

        # Fetch from Wikimedia Commons
        queries = QUERIES.get(cat, [cat.replace("_", " ")])
        collected_pil: list[Image.Image] = []
        for q in queries:
            if len(collected_pil) >= target_count:
                break
            urls = search_wikimedia(q, limit=6)
            for u in urls:
                im = download_image(u)
                if im:
                    collected_pil.append(im)
                    if len(collected_pil) >= target_count:
                        break

        # Fallback to seed/evals if needed
        if len(collected_pil) < 3:
            eval_cat = Path("ml/data/evals") / cat
            if eval_cat.is_dir():
                for ef in eval_cat.iterdir():
                    if ef.suffix.lower() in (".jpg", ".png"):
                        with Image.open(ef) as eim:
                            collected_pil.append(eim.convert("RGB"))
                    if len(collected_pil) >= target_count:
                        break

        idx = 1
        # Save downloaded real images
        for im in collected_pil:
            if len(current_images) >= target_count:
                break
            dest = cat_dir / f"real_{cat}_{idx:02d}.jpg"
            im.resize((384, 384), Image.Resampling.LANCZOS).save(dest, "JPEG", quality=92)
            current_images.append((dest, "wikimedia_real"))
            idx += 1

        # Generate phone camera simulations to reach target_count
        sim_idx = 1
        while len(current_images) < target_count and collected_pil:
            base_im = collected_pil[(sim_idx - 1) % len(collected_pil)]
            dest = cat_dir / f"sim_camera_{cat}_{sim_idx:02d}.jpg"
            sim = create_phone_camera_simulation(base_im, seed=sim_idx * 42)
            sim.save(dest, "JPEG", quality=88)
            current_images.append((dest, "phone_camera_sim"))
            sim_idx += 1

        print(f"[{cat}] Prepared {len(current_images)} images.")
        for p, src in current_images:
            manifest.append((p, cat, src))

    print(f"Total test images prepared: {len(manifest)} (Target: 50)\n")
    return manifest


def load_scoring_pipeline(model_path: Path):
    DEFAULT_CLASSES = [
        "beeswax_food_wraps",
        "box_cutlery",
        "bulk_pantry_refill",
        "greenery_furniture",
        "handicraft_projects",
        "other",
        "recycle_bags",
        "self_bottle_refill",
    ]
    checkpoint = torch.load(model_path, map_location="cpu", weights_only=True)
    if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
        classes = checkpoint.get("classes", DEFAULT_CLASSES)
        arch = checkpoint.get("arch", "mobilenet_v3_small")
        version = checkpoint.get("version", "mobilenet_v3_small-v0.1.5")
        state_dict = checkpoint["state_dict"]
    elif isinstance(checkpoint, dict):
        classes = checkpoint.get("classes", DEFAULT_CLASSES) if "classes" in checkpoint else DEFAULT_CLASSES
        arch = checkpoint.get("arch", "mobilenet_v3_small") if "arch" in checkpoint else "mobilenet_v3_small"
        version = checkpoint.get("version", "mobilenet_v3_small-v0.1.5") if "version" in checkpoint else "mobilenet_v3_small-v0.1.5"
        state_dict = {k: v for k, v in checkpoint.items() if isinstance(v, torch.Tensor)}
    else:
        raise RuntimeError(f"Unexpected checkpoint format in {model_path}")

    has_dropout_seq = any(k.startswith("classifier.3.1.") for k in state_dict.keys())

    if arch == "mobilenet_v3_large":
        model = mobilenet_v3_large(weights=None)
        if has_dropout_seq:
            model.classifier[3] = torch.nn.Sequential(
                torch.nn.Dropout(p=0.2),
                torch.nn.Linear(model.classifier[3].in_features, len(classes)),
            )
        else:
            model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, len(classes))
    elif arch == "efficientnet_b0":
        model = efficientnet_b0(weights=None)
        model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, len(classes))
    else:
        model = mobilenet_v3_small(weights=None)
        if has_dropout_seq:
            model.classifier[3] = torch.nn.Sequential(
                torch.nn.Dropout(p=0.2),
                torch.nn.Linear(model.classifier[3].in_features, len(classes)),
            )
        else:
            model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, len(classes))

    model.load_state_dict(state_dict)
    model.eval()

    preprocess = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    return model, classes, version, preprocess


def run_pipeline(manifest: list[tuple[Path, str, str]], model_path: Path, threshold: float = 0.75):
    model, classes, version, preprocess = load_scoring_pipeline(model_path)
    results = []

    print(f"=== Running Visual Verification Pipeline ===")
    print(f"Model Version: {version}")
    print(f"Award Threshold: {threshold:.2f}\n")

    correct_count = 0
    approved_count = 0
    false_approved_count = 0
    rejected_count = 0

    for idx, (img_path, true_label, src_type) in enumerate(manifest, 1):
        with Image.open(img_path) as im:
            tensor = preprocess(im.convert("RGB")).unsqueeze(0)

        with torch.inference_mode():
            logits = model(tensor)[0]
            probs = torch.softmax(logits, dim=0)

        confidence, pred_idx = probs.max(dim=0)
        conf_float = float(confidence)
        pred_label = classes[int(pred_idx)]

        is_correct = (pred_label == true_label)
        if is_correct:
            correct_count += 1

        # Visual Verification Pipeline Award Logic:
        # If true_label != 'other' and pred_label == true_label and conf >= threshold -> Approved
        # If true_label == 'other' and pred_label != 'other' and conf >= threshold -> FALSE APPROVAL (Security Vulnerability!)
        # Otherwise -> Rejected (Safe)
        if true_label == "other":
            if pred_label != "other" and conf_float >= threshold:
                status = "FALSE_APPROVAL"
                false_approved_count += 1
            else:
                status = "REJECTED_SAFE"
                rejected_count += 1
        else:
            if pred_label == true_label and conf_float >= threshold:
                status = "APPROVED"
                approved_count += 1
            elif pred_label == true_label and conf_float < threshold:
                status = "REJECTED_LOW_CONFIDENCE"
                rejected_count += 1
            else:
                status = "REJECTED_MISCLASSIFIED"
                rejected_count += 1

        results.append({
            "index": idx,
            "filename": img_path.name,
            "path": str(img_path),
            "true_label": true_label,
            "predicted_label": pred_label,
            "confidence": round(conf_float, 4),
            "source_type": src_type,
            "status": status,
            "is_correct": is_correct,
        })

    accuracy = (correct_count / len(manifest)) * 100
    summary = {
        "total_images": len(manifest),
        "correct_predictions": correct_count,
        "accuracy_percent": round(accuracy, 2),
        "approved": approved_count,
        "rejected": rejected_count,
        "false_approvals": false_approved_count,
        "threshold": threshold,
        "model_version": version,
    }

    return results, summary


def main():
    test_dir = Path("ml/test_50_mixed")
    manifest = prepare_50_images(test_dir)
    model_path = Path("ml/model/best.pt")

    results, summary = run_pipeline(manifest, model_path, threshold=0.75)

    print("=== Visual Verification Results Summary ===")
    print(f"Total Evaluated : {summary['total_images']}")
    print(f"Accuracy        : {summary['accuracy_percent']}% ({summary['correct_predictions']}/{summary['total_images']})")
    print(f"Approved Awards : {summary['approved']}")
    print(f"Rejected Safe   : {summary['rejected']}")
    print(f"False Approvals : {summary['false_approvals']} (Target: 0)")
    print("===========================================\n")

    output_json = Path("ml/model/verification_50_results.json")
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump({"summary": summary, "results": results}, f, indent=2)
    print(f"Detailed results saved to {output_json}")


if __name__ == "__main__":
    main()
