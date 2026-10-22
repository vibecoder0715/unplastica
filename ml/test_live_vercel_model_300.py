import json
import time
import os
import random
import onnxruntime as ort
import numpy as np
from PIL import Image

def main():
    print("=" * 70)
    print("TESTING ACTUAL MODEL RUNNING IN VERCEL (300+ HELD-OUT IMAGES)")
    print("Source: https://unplastica.vercel.app/model/model.onnx")
    print("=" * 70)

    model_path = "ml/model/live_downloaded_from_vercel.onnx"
    assert os.path.exists(model_path), "Downloaded Vercel model not found"

    session = ort.InferenceSession(model_path)
    manifest = json.load(open("ml/model/val_300_manifest.json"))
    print(f"Total test images in manifest: {len(manifest)}")

    classes = [
        "beeswax_food_wraps",
        "box_cutlery",
        "bulk_pantry_refill",
        "greenery_furniture",
        "handicraft_projects",
        "other",
        "recycle_bags",
        "self_bottle_refill",
    ]

    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(1, 3, 1, 1)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(1, 3, 1, 1)

    other_items = [x["path"] for x in manifest if x["expected"] == "other"]

    def infer(image_obj):
        im_r = image_obj.resize((224, 224))
        arr = np.array(im_r, dtype=np.float32) / 255.0
        arr = np.transpose(arr, (2, 0, 1))[np.newaxis, ...]
        arr = (arr - mean) / std
        out = session.run(None, {"input": arr.astype(np.float32)})[0][0]
        e_x = np.exp(out - np.max(out))
        probs = e_x / e_x.sum()
        return probs

    def verify_habit(probs, target_habit):
        top_idx = int(np.argmax(probs))
        top_label = classes[top_idx]
        target_idx = classes.index(target_habit)
        target_prob = float(probs[target_idx])
        other_idx = classes.index("other")
        other_prob = float(probs[other_idx])

        # Clutter-tolerant verification logic as deployed in App.tsx
        is_habit_target = target_habit and target_habit != "other"
        verified = bool(
            is_habit_target and (
                (top_label == target_habit and target_prob >= 0.28) or
                (target_prob >= 0.28 and other_prob < 0.62 and target_prob >= (other_prob * 0.80))
            )
        )
        return verified, top_label, target_prob, other_prob

    # Statistics
    stats = {h: {"total": 0, "clean_approved": 0, "clutter_approved": 0} for h in classes if h != "other"}
    other_total = 0
    other_falsely_approved = 0

    t0 = time.time()
    random.seed(42)

    for i, item in enumerate(manifest, 1):
        path = item["path"]
        exp = item["expected"]

        try:
            im = Image.open(path).convert("RGB")
        except Exception as e:
            print(f"Skipping {path}: {e}")
            continue

        probs = infer(im)

        if exp == "other":
            other_total += 1
            # Negative check: Should be rejected across all 7 habit engines
            any_approved = False
            for h in stats:
                is_app, _, _, _ = verify_habit(probs, h)
                if is_app:
                    any_approved = True
                    break
            if any_approved:
                other_falsely_approved += 1
        else:
            stats[exp]["total"] += 1
            # 1. Clean image verification
            is_app, top_lbl, t_prob, o_prob = verify_habit(probs, exp)
            if is_app:
                stats[exp]["clean_approved"] += 1

            # 2. Clutter image verification (misc objects injected beside habit item)
            other_im = Image.open(random.choice(other_items)).convert("RGB")
            cw = int(im.width * 0.35)
            ch = int(im.height * 0.35)
            clutter_patch = other_im.resize((cw, ch))
            im_clutter = im.copy()
            # Paste clutter on corner/edge
            im_clutter.paste(clutter_patch, (0, 0))

            probs_c = infer(im_clutter)
            is_app_c, _, _, _ = verify_habit(probs_c, exp)
            if is_app_c:
                stats[exp]["clutter_approved"] += 1

    elapsed = time.time() - t0

    print(f"\nEvaluated {len(manifest)} images in {elapsed:.2f}s ({elapsed/len(manifest)*1000:.1f}ms/image)\n")

    print("-" * 75)
    print(f"{'HABIT ENGINE':<24} | {'TEST IMGS':<10} | {'CLEAN APPROVAL':<16} | {'CLUTTER APPROVAL':<16}")
    print("-" * 75)

    total_habit_imgs = 0
    total_clean_pass = 0
    total_clutter_pass = 0

    for h, d in stats.items():
        tot = d["total"]
        cp = d["clean_approved"]
        clp = d["clutter_approved"]
        total_habit_imgs += tot
        total_clean_pass += cp
        total_clutter_pass += clp

        clean_pct = (cp / tot * 100) if tot > 0 else 0
        clutter_pct = (clp / tot * 100) if tot > 0 else 0
        print(f"{h:<24} | {tot:<10} | {cp:3d}/{tot:3d} ({clean_pct:5.1f}%) | {clp:3d}/{tot:3d} ({clutter_pct:5.1f}%)")

    print("-" * 75)
    overall_clean_pct = total_clean_pass / total_habit_imgs * 100
    overall_clutter_pct = total_clutter_pass / total_habit_imgs * 100
    print(f"{'ALL 7 HABIT ENGINES':<24} | {total_habit_imgs:<10} | {total_clean_pass:3d}/{total_habit_imgs:3d} ({overall_clean_pct:5.1f}%) | {total_clutter_pass:3d}/{total_habit_imgs:3d} ({overall_clutter_pct:5.1f}%)")
    print("-" * 75)

    other_correctly_rejected = other_total - other_falsely_approved
    other_rejection_pct = other_correctly_rejected / other_total * 100
    print(f"\nNegative/Non-Habit Images Correctly Rejected: {other_correctly_rejected}/{other_total} ({other_rejection_pct:.1f}%)")

    results_report = {
        "model_source": "https://unplastica.vercel.app/model/model.onnx",
        "total_images_tested": len(manifest),
        "habit_images_tested": total_habit_imgs,
        "negative_images_tested": other_total,
        "clean_habit_approval_rate": f"{overall_clean_pct:.2f}%",
        "clutter_habit_approval_rate": f"{overall_clutter_pct:.2f}%",
        "negative_rejection_rate": f"{other_rejection_pct:.2f}%",
        "per_habit_stats": stats,
    }

    with open("ml/model/live_vercel_300_test_results.json", "w") as f:
        json.dump(results_report, f, indent=2)
    print("Saved test results to ml/model/live_vercel_300_test_results.json\n")

if __name__ == "__main__":
    main()
