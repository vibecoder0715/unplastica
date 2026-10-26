"""Unplastica Dataset Web Collector.

Downloads images with natural background noise from the web (Wikimedia Commons):
- 2,500 training images (500 per case for the 5 active app habits:
  'box_cutlery', 'recycle_bags', 'self_bottle_refill', 'greenery_furniture', 'handicraft_projects')
- 500 negative training images ('other' class: single-use plastics, cups, office clutter)
- 500 test images with background noise (100 per case across the 5 active app habits)
"""

from __future__ import annotations

import io
import json
import os
import random
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from PIL import Image, ImageEnhance

USER_AGENT = "UnplasticaResearch/1.0 (Educational Environmental ML project; APU Malaysia; contact: unplastica@gmail.com)"

HABIT_CATEGORIES = [
    "box_cutlery",
    "recycle_bags",
    "self_bottle_refill",
    "greenery_furniture",
    "handicraft_projects",
]

ALL_CATEGORIES = HABIT_CATEGORIES + ["other"]

CATEGORIES_QUERIES: dict[str, list[str]] = {
    "self_bottle_refill": [
        "reusable water bottle",
        "stainless steel water bottle",
        "insulated water bottle",
        "metal flask bottle",
        "sports water bottle",
        "water tumbler drink",
        "water bottle desk",
        "water bottle refill",
        "drinking flask table",
        "refillable bottle drink",
        "vacuum insulated bottle",
    ],
    "box_cutlery": [
        "lunch box",
        "bento box",
        "tiffin carrier",
        "reusable cutlery",
        "bento lunch meal",
        "stainless steel lunch box",
        "metal lunch box",
        "lunch container food",
        "cutlery travel set spoon",
        "bamboo cutlery set",
        "food container bento",
    ],
    "recycle_bags": [
        "tote bag",
        "canvas bag",
        "shopping bag reusable",
        "cotton tote bag",
        "mesh shopping bag",
        "string bag market",
        "fabric shopping bag",
        "reusable grocery tote",
        "canvas shopping tote",
        "grocery bag canvas",
    ],
    "greenery_furniture": [
        "potted plant",
        "houseplant",
        "indoor plant",
        "succulent pot",
        "potted flower",
        "desk plant",
        "houseplant windowsill",
        "indoor potted plant room",
        "plant pot indoor table",
        "flowerpot houseplant room",
    ],
    "handicraft_projects": [
        "handmade craft",
        "woven basket craft",
        "handicraft textile",
        "upcycled craft",
        "macrame craft",
        "paper craft handmade",
        "recycled craft",
        "handmade basket woven",
        "upcycled plastic craft",
        "woven craft handmade",
    ],
    "other": [
        "plastic bottle PET",
        "single use plastic bottle",
        "disposable plastic cup",
        "plastic carrier bag single use",
        "styrofoam food container",
        "computer keyboard desk",
        "classroom chair table",
        "disposable plastic cutlery",
        "trash bin garbage",
        "office desk laptop monitor",
    ],
}

EXCLUDE_REGEX = re.compile(
    r"(svg|pdf|tif|tiff|diagram|chart|graph|logo|map|drawing|icon|flag|stamp|coin|vector|infographic)",
    re.IGNORECASE,
)


def search_wikimedia_category(queries: list[str], max_urls: int = 650) -> list[str]:
    """Search Wikimedia Commons for File images across queries with pagination."""
    found_urls: list[str] = []
    seen: set[str] = set()

    for q in queries:
        if len(found_urls) >= max_urls:
            break
        offset = 0
        while len(found_urls) < max_urls and offset <= 200:
            encoded = urllib.parse.quote(q)
            url = (
                f"https://commons.wikimedia.org/w/api.php?action=query&generator=search"
                f"&gsrsearch={encoded}&gsrnamespace=6&gsrlimit=50&gsroffset={offset}"
                f"&prop=imageinfo&iiprop=url|mime&iiurlwidth=512&format=json"
            )
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
            except Exception:
                break

            pages = data.get("query", {}).get("pages", {})
            if not pages:
                break

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
                thumb = info.get("thumburl") or info.get("url")
                if thumb and thumb not in seen:
                    seen.add(thumb)
                    found_urls.append(thumb)
                    if len(found_urls) >= max_urls:
                        break

            if "continue" in data and "gsroffset" in data["continue"]:
                offset = data["continue"]["gsroffset"]
            else:
                break

    return found_urls


def download_single_image(url: str, min_size: int = 140) -> Image.Image | None:
    """Download image and return validated RGB PIL Image."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = resp.read()
        im = Image.open(io.BytesIO(data)).convert("RGB")
        if im.width < min_size or im.height < min_size:
            return None
        return im
    except Exception:
        return None


def create_variation(im: Image.Image, seed: int) -> Image.Image:
    """Create a realistic camera variation (zoom, angle, lighting)."""
    rnd = random.Random(seed)
    w, h = im.size
    crop_scale = rnd.uniform(0.78, 0.95)
    cw, ch = max(100, int(w * crop_scale)), max(100, int(h * crop_scale))
    x = rnd.randint(0, max(0, w - cw))
    y = rnd.randint(0, max(0, h - ch))
    out = im.crop((x, y, x + cw, y + ch))
    out = ImageEnhance.Brightness(out).enhance(rnd.uniform(0.88, 1.15))
    out = ImageEnhance.Contrast(out).enhance(rnd.uniform(0.90, 1.12))
    if rnd.random() > 0.5:
        out = out.transpose(Image.FLIP_LEFT_RIGHT)
    return out


def collect_dataset(
    output_dir: Path,
    train_count_per_cat: int = 500,
    test_count_per_habit: int = 100,
) -> None:
    """Collect full dataset: 2,500 habit train + 500 other train, and 500 habit test."""
    train_base = output_dir / "train"
    test_base = output_dir / "test_noisy"

    for cat in ALL_CATEGORIES:
        (train_base / cat).mkdir(parents=True, exist_ok=True)
    for cat in HABIT_CATEGORIES:
        (test_base / cat).mkdir(parents=True, exist_ok=True)

    print("==========================================================")
    print("🚀 UNPLASTICA DATASET COLLECTOR: Web Gathering Initiated")
    print(f"Target Train Images : {train_count_per_cat} per class x {len(ALL_CATEGORIES)} = {train_count_per_cat * len(ALL_CATEGORIES)}")
    print(f"Target Test Images  : {test_count_per_habit} per habit x {len(HABIT_CATEGORIES)} = {test_count_per_habit * len(HABIT_CATEGORIES)}")
    print("==========================================================\n")

    for cat in ALL_CATEGORIES:
        is_habit = cat in HABIT_CATEGORIES
        total_needed = train_count_per_cat + (test_count_per_habit if is_habit else 0)
        print(f"🔍 Searching URLs for [{cat}] (Target: {total_needed} images)...")

        urls = search_wikimedia_category(CATEGORIES_QUERIES[cat], max_urls=int(total_needed * 1.3))
        print(f"   Found {len(urls)} candidates on Wikimedia Commons. Downloading with 12 workers...")

        downloaded_images: list[Image.Image] = []
        with ThreadPoolExecutor(max_workers=12) as executor:
            future_to_url = {executor.submit(download_single_image, u): u for u in urls}
            for fut in as_completed(future_to_url):
                res = fut.result()
                if res is not None:
                    downloaded_images.append(res)
                    if len(downloaded_images) >= total_needed:
                        break

        print(f"   Successfully downloaded {len(downloaded_images)} raw web images.")

        # If slightly below target, synthesize realistic camera variations from existing downloads
        if len(downloaded_images) < total_needed and len(downloaded_images) > 0:
            needed = total_needed - len(downloaded_images)
            print(f"   Augmenting {needed} realistic phone camera variations...")
            base_imgs = list(downloaded_images)
            for i in range(needed):
                source_im = random.choice(base_imgs)
                var = create_variation(source_im, seed=1000 + i)
                downloaded_images.append(var)

        random.seed(42)
        random.shuffle(downloaded_images)

        # Split into train and test_noisy
        train_slice = downloaded_images[:train_count_per_cat]
        test_slice = downloaded_images[train_count_per_cat:train_count_per_cat + test_count_per_habit] if is_habit else []

        print(f"   Saving {len(train_slice)} to train/{cat}...")
        for idx, im in enumerate(train_slice):
            out_path = train_base / cat / f"{cat}_train_{idx+1:04d}.jpg"
            # Normalize to maximum 512px for efficient training
            im.thumbnail((512, 512), Image.Resampling.LANCZOS)
            im.save(out_path, "JPEG", quality=88)

        if is_habit:
            print(f"   Saving {len(test_slice)} to test_noisy/{cat}...")
            for idx, im in enumerate(test_slice):
                out_path = test_base / cat / f"{cat}_noisy_test_{idx+1:04d}.jpg"
                im.thumbnail((512, 512), Image.Resampling.LANCZOS)
                im.save(out_path, "JPEG", quality=90)

        print(f"   [DONE] {cat}: {len(train_slice)} train | {len(test_slice)} test_noisy\n")

    print("==========================================================")
    print("✅ DATASET COLLECTION COMPLETE")
    print(f"Train Base Directory: {train_base.resolve()}")
    print(f"Test Base Directory : {test_base.resolve()}")
    print("==========================================================")


if __name__ == "__main__":
    out_dir = Path("ml/data")
    collect_dataset(out_dir, train_count_per_cat=500, test_count_per_habit=100)
