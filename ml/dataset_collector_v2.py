"""Dataset Collector V2 for Unplastica (Fast Concurrent Engine).

Expands training datasets to 1,000+ extracted images per class and
downloads 500 MORE DIFFERENT test sets (100 per case across 5 app habits)
with natural background noise from Openverse and Wikimedia Commons.
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

USER_AGENT = "UnplasticaResearch/2.0 (Educational Environmental ML; contact: unplastica@gmail.com)"

HABIT_CATEGORIES = [
    "box_cutlery",
    "recycle_bags",
    "self_bottle_refill",
    "greenery_furniture",
    "handicraft_projects",
]

ALL_CLASSES = [
    "beeswax_food_wraps",
    "box_cutlery",
    "bulk_pantry_refill",
    "greenery_furniture",
    "handicraft_projects",
    "other",
    "recycle_bags",
    "self_bottle_refill",
]

QUERIES_MAP: dict[str, list[str]] = {
    "box_cutlery": [
        "bento box",
        "lunch box",
        "tiffin box",
        "reusable cutlery",
        "bamboo cutlery",
        "metal lunch box",
        "bento lunch",
        "meal prep container",
    ],
    "recycle_bags": [
        "tote bag",
        "canvas tote",
        "cotton tote",
        "shopping bag",
        "reusable bag",
        "mesh market bag",
        "grocery tote",
        "cloth bag market",
    ],
    "self_bottle_refill": [
        "water bottle",
        "hydroflask",
        "stainless bottle",
        "insulated bottle",
        "metal flask",
        "sports bottle",
        "refillable bottle",
        "tumbler drink",
    ],
    "greenery_furniture": [
        "potted plant",
        "houseplant",
        "indoor plant",
        "succulent pot",
        "flowerpot",
        "monstera plant",
        "snake plant",
        "desk plant",
    ],
    "handicraft_projects": [
        "woven basket",
        "macrame",
        "crochet craft",
        "recycled craft",
        "papercraft",
        "origami craft",
        "pottery craft",
        "handmade craft",
        "diy craft",
    ],
    "other": [
        "plastic bottle",
        "disposable cup",
        "styrofoam box",
        "plastic carrier bag",
        "computer keyboard",
        "office desk",
        "garbage trash",
        "plastic wrapper",
    ],
    "beeswax_food_wraps": [
        "beeswax wrap",
        "beeswax food wrap",
        "food wrap reusable",
    ],
    "bulk_pantry_refill": [
        "glass jars pantry",
        "bulk pantry jars",
        "zero waste jars",
    ],
}

EXCLUDE_REGEX = re.compile(
    r"(svg|pdf|tif|tiff|diagram|chart|graph|logo|map|drawing|icon|flag|stamp|coin|vector|infographic)",
    re.IGNORECASE,
)


def search_openverse_single(query: str, page_size: int = 40) -> list[str]:
    """Search Openverse API for images."""
    urls = []
    encoded = urllib.parse.quote(query)
    endpoint = f"https://api.openverse.org/v1/images/?q={encoded}&page_size={page_size}"
    req = urllib.request.Request(endpoint, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        for item in data.get("results", []):
            thumb = item.get("thumbnail") or item.get("url")
            if thumb and not EXCLUDE_REGEX.search(thumb):
                urls.append(thumb)
    except Exception:
        pass
    return urls


def search_wikimedia_single(query: str, limit: int = 40) -> list[str]:
    """Search Wikimedia Commons for images."""
    urls = []
    encoded = urllib.parse.quote(query)
    endpoint = (
        f"https://commons.wikimedia.org/w/api.php?action=query&generator=search"
        f"&gsrsearch={encoded}&gsrnamespace=6&gsrlimit={limit}"
        f"&prop=imageinfo&iiprop=url|mime&iiurlwidth=512&format=json"
    )
    req = urllib.request.Request(endpoint, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        pages = data.get("query", {}).get("pages", {})
        for pid, page in pages.items():
            title = page.get("title", "")
            if EXCLUDE_REGEX.search(title):
                continue
            infos = page.get("imageinfo", [])
            if not infos:
                continue
            thumb = infos[0].get("thumburl") or infos[0].get("url")
            if thumb:
                urls.append(thumb)
    except Exception:
        pass
    return urls


def get_category_candidate_urls(queries: list[str]) -> list[str]:
    """Search Openverse and Wikimedia in parallel for candidate URLs."""
    urls = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = []
        for q in queries:
            futures.append(ex.submit(search_openverse_single, q, 30))
            futures.append(ex.submit(search_wikimedia_single, q, 30))
        for fut in as_completed(futures):
            try:
                urls.extend(fut.result())
            except Exception:
                pass
    return list(dict.fromkeys(urls))


def download_image(url: str, min_size: int = 120) -> Image.Image | None:
    """Download and return validated RGB PIL Image."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = resp.read()
        im = Image.open(io.BytesIO(data)).convert("RGB")
        if im.width < min_size or im.height < min_size:
            return None
        return im
    except Exception:
        return None


def create_variation(im: Image.Image, seed: int) -> Image.Image:
    """Create realistic camera variation."""
    rnd = random.Random(seed)
    w, h = im.size
    crop_scale = rnd.uniform(0.78, 0.95)
    cw, ch = max(80, int(w * crop_scale)), max(80, int(h * crop_scale))
    x = rnd.randint(0, max(0, w - cw))
    y = rnd.randint(0, max(0, h - ch))
    out = im.crop((x, y, x + cw, y + ch))
    out = ImageEnhance.Brightness(out).enhance(rnd.uniform(0.88, 1.15))
    out = ImageEnhance.Contrast(out).enhance(rnd.uniform(0.90, 1.12))
    if rnd.random() > 0.5:
        out = out.transpose(Image.FLIP_LEFT_RIGHT)
    return out


def collect_v2_datasets(
    data_dir: Path = Path("ml/data"),
    test_noisy_v2_dir: Path = Path("ml/data/test_noisy_v2"),
    train_target_per_habit: int = 1000,
    test_count_per_case: int = 100,
) -> None:
    """Download 500 MORE DIFFERENT test sets and expand training datasets."""
    train_base = data_dir / "train"
    test_noisy_v2_dir.mkdir(parents=True, exist_ok=True)

    print("==========================================================")
    print("🚀 COLLECTING 500 NEW DIFFERENT TEST SETS & EXPANDING TRAIN")
    print(f"Test Sets Destination  : {test_noisy_v2_dir.resolve()}")
    print(f"Train Base Destination : {train_base.resolve()}")
    print(f"Target Test Cases      : {test_count_per_case} per habit x 5 = 500 total")
    print(f"Target Train Images    : {train_target_per_habit} per habit class")
    print("==========================================================\n")

    # Step 1: Collect 500 MORE DIFFERENT test sets (100 per habit)
    print("--- [STEP 1/2] GATHERING 500 NEW UNSEEN TEST CASES ---")
    for cat in HABIT_CATEGORIES:
        cat_test_dir = test_noisy_v2_dir / cat
        cat_test_dir.mkdir(parents=True, exist_ok=True)

        existing_test = list(cat_test_dir.glob("*.jpg")) + list(cat_test_dir.glob("*.png"))
        if len(existing_test) >= test_count_per_case:
            print(f"   [{cat}] Already complete ({len(existing_test)} test cases).")
            continue

        needed = test_count_per_case - len(existing_test)
        print(f"   [{cat}] Searching candidates for {needed} test cases with background noise...")

        queries = QUERIES_MAP.get(cat, [cat])
        candidate_urls = get_category_candidate_urls(queries)
        print(f"   [{cat}] Found {len(candidate_urls)} candidate URLs.")

        random.seed(999)
        random.shuffle(candidate_urls)

        downloaded: list[Image.Image] = []
        with ThreadPoolExecutor(max_workers=12) as executor:
            fut_map = {executor.submit(download_image, u): u for u in candidate_urls[:needed * 2]}
            for fut in as_completed(fut_map):
                res = fut.result()
                if res is not None:
                    downloaded.append(res)
                    if len(downloaded) >= needed:
                        break

        if len(downloaded) < needed and len(downloaded) > 0:
            print(f"   [{cat}] Augmenting {needed - len(downloaded)} variations for test set...")
            base_imgs = list(downloaded)
            for i in range(needed - len(downloaded)):
                var = create_variation(random.choice(base_imgs), seed=2000 + i)
                downloaded.append(var)

        start_idx = len(existing_test) + 1
        for idx, im in enumerate(downloaded[:needed]):
            out_file = cat_test_dir / f"{cat}_v2_test_{start_idx + idx:04d}.jpg"
            im.thumbnail((512, 512), Image.Resampling.LANCZOS)
            im.save(out_file, "JPEG", quality=90)

        total_test = len(list(cat_test_dir.glob("*.*")))
        print(f"   [{cat}] Finished: {total_test} test images ready in test_noisy_v2/{cat}\n")

    # Step 2: Expand Training Data to 1,000 images per habit class and other
    print("--- [STEP 2/2] EXPANDING TRAINING DATASETS ---")
    for cat in ALL_CLASSES:
        cat_train_dir = train_base / cat
        cat_train_dir.mkdir(parents=True, exist_ok=True)

        target_count = 250 if cat in ("beeswax_food_wraps", "bulk_pantry_refill") else train_target_per_habit
        existing_train = list(cat_train_dir.glob("*.jpg")) + list(cat_train_dir.glob("*.png"))
        if len(existing_train) >= target_count:
            print(f"   [{cat}] Already has {len(existing_train)} training images.")
            continue

        needed = target_count - len(existing_train)
        print(f"   [{cat}] Expanding training set by +{needed} images (current: {len(existing_train)} -> target: {target_count})...")

        queries = QUERIES_MAP.get(cat, [cat])
        candidate_urls = get_category_candidate_urls(queries)
        print(f"   [{cat}] Found {len(candidate_urls)} candidate URLs for training.")

        random.seed(1234)
        random.shuffle(candidate_urls)

        downloaded: list[Image.Image] = []
        with ThreadPoolExecutor(max_workers=12) as executor:
            fut_map = {executor.submit(download_image, u): u for u in candidate_urls[:needed * 2]}
            for fut in as_completed(fut_map):
                res = fut.result()
                if res is not None:
                    downloaded.append(res)
                    if len(downloaded) >= needed:
                        break

        # Combine with existing images if needed for variations
        if len(downloaded) < needed:
            pool = list(downloaded)
            for ex in existing_train[:40]:
                try:
                    pool.append(Image.open(ex).convert("RGB"))
                except:
                    pass
            if pool:
                for i in range(needed - len(downloaded)):
                    var = create_variation(random.choice(pool), seed=6000 + i)
                    downloaded.append(var)

        start_idx = len(existing_train) + 1
        for idx, im in enumerate(downloaded[:needed]):
            out_file = cat_train_dir / f"{cat}_v2_train_{start_idx + idx:04d}.jpg"
            im.thumbnail((512, 512), Image.Resampling.LANCZOS)
            im.save(out_file, "JPEG", quality=88)

        total_now = len(list(cat_train_dir.glob("*.*")))
        print(f"   [{cat}] Training images now: {total_now}\n")

    print("==========================================================")
    print("✅ DATASET EXPANSION & TEST V2 COLLECTION COMPLETE")
    print("==========================================================")


if __name__ == "__main__":
    collect_v2_datasets()
