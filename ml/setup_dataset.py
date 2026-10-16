"""Dataset structure setup and verification utility for Unplastica habit classifier."""

from __future__ import annotations

import argparse
from pathlib import Path
from PIL import Image

HABIT_CLASSES = [
    "box_cutlery",
    "recycle_bags",
    "self_bottle_refill",
    "greenery_furniture",
    "handicraft_projects",
    "beeswax_food_wraps",
    "bulk_pantry_refill",
    "other",
]

SPLITS = ["train", "val", "evals"]

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def setup_folders(base_dir: Path) -> None:
    print(f"Setting up dataset directories under {base_dir.resolve()}...")
    for split in SPLITS:
        for cls in HABIT_CLASSES:
            folder = base_dir / split / cls
            folder.mkdir(parents=True, exist_ok=True)
    print("Folders created successfully:")
    for split in SPLITS:
        print(f"  {base_dir.name}/{split}/ [{len(HABIT_CLASSES)} class folders]")


def inspect_dataset(base_dir: Path) -> None:
    print(f"\n--- Dataset Status Check: {base_dir.resolve()} ---")
    total_images = 0
    issues: list[str] = []

    for split in SPLITS:
        split_dir = base_dir / split
        if not split_dir.exists():
            print(f"[!] Split folder '{split}' does not exist.")
            continue

        print(f"\nSplit: [{split.upper()}]")
        split_count = 0
        for cls in HABIT_CLASSES:
            cls_dir = split_dir / cls
            if not cls_dir.exists():
                print(f"  - {cls:<22}: Missing folder!")
                issues.append(f"Missing folder: {split}/{cls}")
                continue

            images = [p for p in cls_dir.iterdir() if p.suffix.lower() in VALID_EXTENSIONS]
            split_count += len(images)
            total_images += len(images)
            status = f"{len(images)} images"
            if len(images) == 0:
                status += " (EMPTY - needs photos!)"
            elif len(images) < 20:
                status += " (low count - aim for 50-100+)"

            print(f"  - {cls:<22}: {status}")

            # Verify integrity of images
            for img_path in images:
                try:
                    with Image.open(img_path) as im:
                        im.verify()
                except Exception as e:
                    issues.append(f"Corrupt image {img_path}: {e}")

        print(f"  Total for {split}: {split_count} images")

    print(f"\nTotal Dataset Images: {total_images}")
    if issues:
        print("\nWarnings / Issues found:")
        for issue in issues[:10]:
            print(f"  * {issue}")
        if len(issues) > 10:
            print(f"  ... and {len(issues) - 10} more issues.")
    else:
        print("Integrity check: No corrupt images detected.")


def get_default_data_dir() -> Path:
    if Path("ml/data").exists() or (Path("ml").is_dir() and not Path("setup_dataset.py").exists()):
        return Path("ml/data")
    return Path("data")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=get_default_data_dir(), help="Path to data folder")
    parser.add_argument("--check-only", action="store_true", help="Only check existing dataset without creating dirs")
    args = parser.parse_args()

    if not args.check_only:
        setup_folders(args.data)
    inspect_dataset(args.data)


if __name__ == "__main__":
    main()
