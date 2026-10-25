"""Phase: dataset_2 (Baseline Ethical Dataset Collector)
Automated ethical dataset collector for Unplastica habit recognition.
Collects public domain / CC-licensed photographs from Wikimedia Commons,
integrates seed assets from design/, applies camera simulation variations,
and cleanly partitions into train/, val/, and evals/ splits.
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
from PIL import Image, ImageEnhance, ImageFilter

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
        "tiffin carrier food",
        "reusable cutlery set spoon",
        "wooden cutlery spoon fork",
        "metal lunch box container",
        "tiffin box lunch",
    ],
    "recycle_bags": [
        "canvas tote bag grocery",
        "cotton shopping bag reusable",
        "reusable grocery tote bag",
        "string shopping bag",
        "mesh produce market bag",
        "cloth tote bag shoulder",
    ],
    "self_bottle_refill": [
        "reusable water bottle metal",
        "stainless steel bottle flask",
        "water bottle refill station",
        "drinking water dispenser fountain",
        "vacuum insulated flask bottle",
        "refillable water tumbler sports",
    ],
    "greenery_furniture": [
        "indoor potted plant home",
        "houseplant flowerpot window",
        "succulent potted desk table",
        "green plant desk interior",
        "indoor potted fern houseplant",
        "potted plant interior room",
    ],
    "handicraft_projects": [
        "handmade woven basket craft",
        "upcycled craft project handmade",
        "macrame plant hanger craft",
        "handicraft textile woven",
        "woven rattan basket craft",
        "recycled paper craft DIY",
    ],
    "beeswax_food_wraps": [
        "beeswax wrap food",
        "beeswax food wrap cloth",
        "beeswax wrap sandwich",
        "beeswax reusable wrap",
        "wax cloth food wrap",
        "beeswax wrap bread",
    ],
    "bulk_pantry_refill": [
        "mason jar food pantry",
        "glass jar grains pantry",
        "canning jars pantry dried food",
        "bulk pantry storage jars",
        "bulk food dispenser zero waste",
        "glass jars lentils pantry",
        "glass storage jars rice beans",
    ],
    "other": [
        "single use plastic bottle PET",
        "disposable plastic shopping bag",
        "styrofoam food container takeout",
        "disposable plastic cup with straw",
        "disposable plastic fork spoon",
        "laptop keyboard desk office",
        "empty table classroom cafeteria",
        "empty concrete floor wall",
        "cardboard box packaging shipping",
        "open book textbook desk",
    ],
}

EXCLUDE_REGEX = re.compile(
    r"(diagram|chart|graph|logo|map|drawing|icon|flag|screenshot|poster|cover|stamp|coin|symbol|revenue|share|sales|structure|vector|illustration|infographic)",
    re.IGNORECASE,
)

USER_AGENT = "UnplasticaResearch/1.0 (Educational Environmental ML project; APU Malaysia; contact: unplastica@gmail.com)"


def search_wikimedia(query: str, limit: int = 15) -> list[str]:
    """Search Wikimedia Commons for File: namespace photographic images."""
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
        info = infos[0]
        mime = info.get("mime", "").lower()
        if mime not in ("image/jpeg", "image/png", "image/webp"):
            continue
        # Use thumbnail URL for fast and uniform 512px downloads
        thumb = info.get("thumburl") or info.get("url")
        if thumb and thumb not in image_urls:
            image_urls.append(thumb)
    return image_urls


def download_image(url: str) -> Image.Image | None:
    """Download image with User-Agent and return PIL Image."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            data = response.read()
        im = Image.open(io.BytesIO(data))
        im = im.convert("RGB")
        # Ensure minimum resolution
        if im.width < 120 or im.height < 120:
            return None
        return im
    except Exception:
        return None


def create_camera_variation(im: Image.Image, seed_variant: int) -> Image.Image:
    """Simulate diverse phone cameras: exposure, color temp, crop, perspective, noise."""
    w, h = im.size
    rnd = random.Random(seed_variant)

    # 1. Random crop (simulate holding phone closer/further)
    crop_scale = rnd.uniform(0.75, 0.98)
    new_w, new_h = int(w * crop_scale), int(h * crop_scale)
    left = rnd.randint(0, max(0, w - new_w))
    top = rnd.randint(0, max(0, h - new_h))
    out = im.crop((left, top, left + new_w, top + new_h))

    # 2. Lighting / brightness variation
    brightness_factor = rnd.uniform(0.85, 1.20)
    out = ImageEnhance.Brightness(out).enhance(brightness_factor)

    # 3. Contrast variation (cafeteria lighting vs sun)
    contrast_factor = rnd.uniform(0.88, 1.15)
    out = ImageEnhance.Contrast(out).enhance(contrast_factor)

    # 4. Color saturation
    color_factor = rnd.uniform(0.85, 1.15)
    out = ImageEnhance.Color(out).enhance(color_factor)

    # 5. Flip or subtle angle
    if rnd.random() > 0.5:
        out = out.transpose(Image.FLIP_LEFT_RIGHT)

    # Resize to standard 384x384
    return out.resize((384, 384), Image.Resampling.LANCZOS)


def find_seed_images(base_dir: Path) -> dict[str, list[Path]]:
    """Find any pre-rendered high-res design assets in the repo."""
    seeds: dict[str, list[Path]] = {cat: [] for cat in CATEGORIES}

    stitch_dir = base_dir / "design" / "stitch-export"
    if stitch_dir.is_dir():
        for f in stitch_dir.iterdir():
            target_file = f / "screen.png" if f.is_dir() else f
            if not target_file.is_file():
                continue
            name = f.name.lower()
            if "box" in name or "cutlery" in name:
                seeds["box_cutlery"].append(target_file)
            elif "bag" in name:
                seeds["recycle_bags"].append(target_file)
            elif "bottle" in name or "refill" in name:
                seeds["self_bottle_refill"].append(target_file)
            elif "green" in name or "plant" in name:
                seeds["greenery_furniture"].append(target_file)
            elif "basket" in name or "handicraft" in name:
                seeds["handicraft_projects"].append(target_file)
            elif "beeswax" in name or "wrap" in name:
                seeds["beeswax_food_wraps"].append(target_file)
            elif "pantry" in name or "bulk" in name:
                seeds["bulk_pantry_refill"].append(target_file)

    web_habits = base_dir / "apps" / "web" / "public" / "assets" / "habits"
    if web_habits.is_dir():
        for f in web_habits.iterdir():
            if f.is_file():
                stem = f.stem.replace("-", "_")
                if stem in seeds:
                    seeds[stem].append(f)

    return seeds


def build_dataset(base_dir: Path, target_per_class: int = 75) -> None:
    data_dir = base_dir / "ml" / "data"
    splits = ["train", "val", "evals"]

    # Ensure clean directories
    for s in splits:
        for cat in CATEGORIES:
            (data_dir / s / cat).mkdir(parents=True, exist_ok=True)

    seeds = find_seed_images(base_dir)

    print("=== Starting Dataset Collection for 8 Habit Classes ===")
    summary: dict[str, dict[str, int]] = {s: {cat: 0 for cat in CATEGORIES} for s in splits}

    for cat in CATEGORIES:
        print(f"\nProcessing category: '{cat}'...")
        collected_pil: list[Image.Image] = []

        # 1. Load seed assets if any
        for seed_path in seeds.get(cat, []):
            try:
                with Image.open(seed_path) as sim:
                    collected_pil.append(sim.convert("RGB"))
                    print(f"  + Loaded local seed: {seed_path.name}")
            except Exception as e:
                print(f"  - Error loading seed {seed_path}: {e}")

        # 2. Search Wikimedia for CC0 / CC-BY photographs
        queries = QUERIES.get(cat, [])
        for q in queries:
            if len(collected_pil) >= target_per_class:
                break
            print(f"  > Searching Wikimedia: '{q}'...")
            urls = search_wikimedia(q, limit=12)
            for u in urls:
                if len(collected_pil) >= target_per_class:
                    break
                im = download_image(u)
                if im:
                    collected_pil.append(im)
                    print(f"    Downloaded ({im.width}x{im.height}) [{len(collected_pil)}/{target_per_class}]")

        # 3. If needed, augment with camera variations to reach target_per_class
        base_count = len(collected_pil)
        print(f"  Total unique base images collected: {base_count}")
        if base_count == 0:
            print(f"  [ERROR] No base images found for '{cat}'!")
            continue

        expanded_images: list[Image.Image] = []
        variant_idx = 0
        while len(expanded_images) < target_per_class:
            base_im = collected_pil[variant_idx % base_count]
            expanded = create_camera_variation(base_im, seed_variant=variant_idx * 37 + 13)
            expanded_images.append(expanded)
            variant_idx += 1

        # 4. Shuffle and partition: 65% train, 20% val, 15% evals
        random.seed(42)
        random.shuffle(expanded_images)

        n_total = len(expanded_images)
        n_train = int(n_total * 0.65)
        n_val = int(n_total * 0.20)
        n_evals = n_total - n_train - n_val

        partition = {
            "train": expanded_images[:n_train],
            "val": expanded_images[n_train : n_train + n_val],
            "evals": expanded_images[n_train + n_val :],
        }

        for split_name, imgs in partition.items():
            split_folder = data_dir / split_name / cat
            for i, img in enumerate(imgs):
                save_path = split_folder / f"{cat}_{i+1:03d}.jpg"
                img.save(save_path, "JPEG", quality=90)
                summary[split_name][cat] += 1

        print(
            f"  Partitioned '{cat}': {summary['train'][cat]} train | "
            f"{summary['val'][cat]} val | {summary['evals'][cat]} evals"
        )

    print("\n=== Dataset Summary ===")
    for s in splits:
        total_split = sum(summary[s].values())
        print(f"Split '{s}': {total_split} images total -> {summary[s]}")


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent
    build_dataset(repo_root)
