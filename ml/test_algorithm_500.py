"""Test for the Extraction Algorithm on 500 Web Images with Background Noise.

Specification:
'Take 500 images from websites with background noise -> the engine must return an
extracted image without background.'
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from PIL import Image

from ml.extraction_engine import get_extraction_engine

HABIT_CATEGORIES = [
    "box_cutlery",
    "recycle_bags",
    "self_bottle_refill",
    "greenery_furniture",
    "handicraft_projects",
]


def run_extraction_algorithm_test(
    test_noisy_dir: Path = Path("ml/data/test_noisy"),
    output_dir: Path = Path("ml/test_results/extracted_500"),
    model_name: str = "u2net",
) -> dict:
    """Execute the extraction test across 500 noisy web images."""
    output_dir.mkdir(parents=True, exist_ok=True)
    engine = get_extraction_engine(model_name=model_name)

    print("==========================================================")
    print("🧪 RUNNING ALGORITHM EXTRACTION TEST: 500 Noisy Web Images")
    print(f"Extraction Model     : {model_name}")
    print(f"Source Directory     : {test_noisy_dir.resolve()}")
    print(f"Output Extracted Dir : {output_dir.resolve()}")
    print("==========================================================\n")

    results_by_category = {}
    total_processed = 0
    total_success = 0
    all_bg_removed = []
    all_fg_ratios = []

    t_start = time.time()

    for cat in HABIT_CATEGORIES:
        cat_dir = test_noisy_dir / cat
        cat_out = output_dir / cat
        cat_out.mkdir(parents=True, exist_ok=True)

        if not cat_dir.exists():
            print(f"[!] Directory missing: {cat_dir}")
            continue

        images = sorted([p for p in cat_dir.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")])
        print(f"Processing category [{cat}]: {len(images)} images...")

        cat_success = 0
        cat_bg_removed = []
        cat_fg_ratios = []

        for idx, img_path in enumerate(images):
            try:
                # 1. Extract main character and strip background noise
                extracted_img, meta = engine.extract_main_character(
                    img_path,
                    target_size=(224, 224),
                    mode="crop_composite",
                    bg_color=(255, 255, 255),
                )

                # 2. Verify engine returned an extracted image without background
                has_subject = meta.get("has_subject", False)
                bg_removed = meta.get("background_removed_ratio", 0.0)
                fg_ratio = meta.get("foreground_ratio", 0.0)

                # An image is successfully extracted if a salient subject is isolated
                # and background clutter is stripped (bg_removed > 0)
                is_valid_extraction = bool(
                    extracted_img is not None
                    and extracted_img.size == (224, 224)
                    and has_subject
                    and bg_removed > 0.05
                )

                if is_valid_extraction:
                    cat_success += 1
                    total_success += 1

                cat_bg_removed.append(bg_removed)
                cat_fg_ratios.append(fg_ratio)
                all_bg_removed.append(bg_removed)
                all_fg_ratios.append(fg_ratio)

                # Save extracted image without background
                save_path = cat_out / f"extracted_{img_path.stem}.png"
                extracted_img.save(save_path, "PNG")

            except Exception as err:
                print(f"   [Error] Failed on {img_path.name}: {err}")

            total_processed += 1
            if (idx + 1) % 25 == 0 or (idx + 1) == len(images):
                print(f"   Processed {idx + 1}/{len(images)} | Category Valid: {cat_success}/{idx + 1}")

        results_by_category[cat] = {
            "total": len(images),
            "successfully_extracted": cat_success,
            "success_rate": round(cat_success / max(1, len(images)) * 100, 2),
            "avg_bg_removed_pct": round((sum(cat_bg_removed) / max(1, len(cat_bg_removed))) * 100, 2),
            "avg_fg_ratio_pct": round((sum(cat_fg_ratios) / max(1, len(cat_fg_ratios))) * 100, 2),
        }
        print(f"   -> [{cat}] Result: {cat_success}/{len(images)} ({results_by_category[cat]['success_rate']}%) | Avg Background Removed: {results_by_category[cat]['avg_bg_removed_pct']}%\n")

    elapsed = time.time() - t_start

    summary = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_images_tested": total_processed,
        "successfully_extracted": total_success,
        "overall_success_rate": round((total_success / max(1, total_processed)) * 100, 2),
        "avg_background_removed_pct": round((sum(all_bg_removed) / max(1, len(all_bg_removed))) * 100, 2),
        "avg_foreground_pct": round((sum(all_fg_ratios) / max(1, len(all_fg_ratios))) * 100, 2),
        "elapsed_seconds": round(elapsed, 2),
        "categories": results_by_category,
    }

    report_path = Path("ml/test_results/extraction_summary.json")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("==========================================================")
    print("📊 ALGORITHM EXTRACTION TEST SUMMARY")
    print(f"Total Images Tested       : {total_processed}")
    print(f"Cleanly Extracted Subjects: {total_success} / {total_processed} ({summary['overall_success_rate']}%)")
    print(f"Average Background Removed: {summary['avg_background_removed_pct']}%")
    print(f"Average Subject Coverage  : {summary['avg_foreground_pct']}%")
    print(f"Elapsed Time              : {summary['elapsed_seconds']}s")
    print(f"Summary Report Saved to   : {report_path.resolve()}")
    print("==========================================================")

    return summary


if __name__ == "__main__":
    run_extraction_algorithm_test()
