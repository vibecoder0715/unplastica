import json
import time
import os
import glob
import numpy as np
from PIL import Image
import onnxruntime as ort
import open_clip
import torch
from sklearn.linear_model import LogisticRegression

def main():
    print("=" * 70)
    print("MODEL COMPARISON: LEGACY (MobileNetV3) vs OPENCLIP / EMBEDDING CLASSIFIER")
    print("=" * 70)

    # 1. Load dataset
    manifest_path = "ml/model/val_300_manifest.json"
    if os.path.exists(manifest_path):
        with open(manifest_path, "r") as f:
            full_manifest = json.load(f)
    else:
        full_manifest = []

    # Filter to active habits + other
    ACTIVE_HABITS = [
        "box_cutlery",
        "recycle_bags",
        "self_bottle_refill",
        "greenery_furniture",
        "handicraft_projects"
    ]
    ALL_CLASSES = ACTIVE_HABITS + ["other"]

    test_items = [x for x in full_manifest if x["expected"] in ALL_CLASSES and os.path.exists(x["path"])]
    print(f"Total valid test images found in manifest: {len(test_items)}")

    # Add more test images if needed from ml/data_multistyle
    np.random.seed(42)
    val_set = []
    train_set = []
    for cls in ALL_CLASSES:
        files = glob.glob(f"ml/data_multistyle/{cls}/*.jpg")
        np.random.shuffle(files)
        # Use 30 for validation, 50 for training classifier
        val_files = files[:30]
        train_files = files[30:80]
        for vf in val_files:
            val_set.append({"path": vf, "expected": cls})
        for tf in train_files:
            train_set.append({"path": tf, "expected": cls})

    print(f"Validation images: {len(val_set)} (30 per class across 6 classes)")
    print(f"Training images for embedding classifier: {len(train_set)} (50 per class)")

    # ==========================================
    # EVALUATE MODEL A: LEGACY (MobileNetV3 ONNX)
    # ==========================================
    print("\n--- Evaluating Model A: Legacy MobileNetV3 ONNX ---")
    legacy_model_path = "apps/web/public/model/model.onnx"
    assert os.path.exists(legacy_model_path), "Legacy ONNX model not found"
    legacy_size_mb = os.path.getsize(legacy_model_path) / (1024 * 1024)

    legacy_session = ort.InferenceSession(legacy_model_path)
    legacy_classes = [
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

    def infer_legacy(im):
        im_r = im.resize((224, 224))
        arr = np.array(im_r, dtype=np.float32) / 255.0
        arr = np.transpose(arr, (2, 0, 1))[np.newaxis, ...]
        arr = (arr - mean) / std
        out = legacy_session.run(None, {"input": arr.astype(np.float32)})[0][0]
        e_x = np.exp(out - np.max(out))
        probs = e_x / e_x.sum()
        return probs

    t0 = time.time()
    legacy_correct = 0
    legacy_habit_approved = 0
    legacy_habit_total = 0
    legacy_other_rejected = 0
    legacy_other_total = 0
    legacy_latencies = []

    for item in val_set:
        try:
            im = Image.open(item["path"]).convert("RGB")
        except:
            continue
        t_start = time.time()
        probs = infer_legacy(im)
        legacy_latencies.append((time.time() - t_start) * 1000)

        exp = item["expected"]
        top_idx = int(np.argmax(probs))
        top_label = legacy_classes[top_idx]

        if exp == "other":
            legacy_other_total += 1
            # Rejection: 'other' should be predicted or all habit targets < 0.28
            is_rejected = (top_label == "other") or all(probs[legacy_classes.index(h)] < 0.28 for h in ACTIVE_HABITS)
            if is_rejected:
                legacy_other_rejected += 1
        else:
            legacy_habit_total += 1
            target_idx = legacy_classes.index(exp)
            target_prob = float(probs[target_idx])
            other_prob = float(probs[legacy_classes.index("other")])
            verified = (top_label == exp and target_prob >= 0.28) or (target_prob >= 0.28 and other_prob < 0.62 and target_prob >= (other_prob * 0.80))
            if verified:
                legacy_habit_approved += 1

    legacy_habit_acc = (legacy_habit_approved / legacy_habit_total) * 100 if legacy_habit_total else 0
    legacy_other_acc = (legacy_other_rejected / legacy_other_total) * 100 if legacy_other_total else 0
    legacy_avg_ms = float(np.mean(legacy_latencies))

    print(f"Legacy Model Size: {legacy_size_mb:.2f} MB")
    print(f"Legacy Average Latency: {legacy_avg_ms:.2f} ms")
    print(f"Legacy Habit Approval Rate: {legacy_habit_acc:.2f}% ({legacy_habit_approved}/{legacy_habit_total})")
    print(f"Legacy Negative Rejection Rate: {legacy_other_acc:.2f}% ({legacy_other_rejected}/{legacy_other_total})")

    # ==========================================
    # EVALUATE MODEL B: OPENCLIP ZERO-SHOT
    # ==========================================
    print("\n--- Evaluating Model B1: OpenCLIP Zero-Shot ---")
    clip_model, _, clip_preprocess = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k')
    clip_tokenizer = open_clip.get_tokenizer('ViT-B-32')
    clip_model.eval()

    text_prompts = [
        "a reusable meal food container lunch box and portable cutlery set pack",
        "a reusable cloth canvas shopping tote bag",
        "a reusable refillable water bottle tumbler or thermos flask",
        "flower pots and planters made out of recycled plastic containers with plants",
        "creative handcrafted useful handicraft project or woven basket made from recycled plastics",
        "disposable single-use plastic trash garbage clutter or random unrelated background items",
    ]
    text_tokens = clip_tokenizer(text_prompts)
    with torch.no_grad():
        text_features = clip_model.encode_text(text_tokens)
        text_features /= text_features.norm(dim=-1, keepdim=True)

    clip_latencies = []
    clip_habit_approved = 0
    clip_other_rejected = 0

    with torch.no_grad():
        for item in val_set:
            try:
                im = Image.open(item["path"]).convert("RGB")
            except:
                continue
            t_start = time.time()
            im_tensor = clip_preprocess(im).unsqueeze(0)
            image_features = clip_model.encode_image(im_tensor)
            image_features /= image_features.norm(dim=-1, keepdim=True)
            similarity = (image_features @ text_features.T)[0].softmax(dim=-1).numpy()
            clip_latencies.append((time.time() - t_start) * 1000)

            exp = item["expected"]
            top_idx = int(np.argmax(similarity))
            top_label = ALL_CLASSES[top_idx]

            if exp == "other":
                if top_label == "other":
                    clip_other_rejected += 1
            else:
                target_idx = ALL_CLASSES.index(exp)
                # Check top-1 or top-2 (for handicraft vs greenery overlap)
                sorted_indices = np.argsort(similarity)[::-1]
                if top_idx == target_idx or (sorted_indices[1] == target_idx and sorted_indices[0] in [ALL_CLASSES.index("greenery_furniture"), ALL_CLASSES.index("handicraft_projects")]):
                    clip_habit_approved += 1

    clip_habit_acc = (clip_habit_approved / legacy_habit_total) * 100 if legacy_habit_total else 0
    clip_other_acc = (clip_other_rejected / legacy_other_total) * 100 if legacy_other_total else 0
    clip_avg_ms = float(np.mean(clip_latencies))

    print(f"OpenCLIP ViT-B/32 Zero-Shot Habit Approval: {clip_habit_acc:.2f}%")
    print(f"OpenCLIP ViT-B/32 Zero-Shot Negative Rejection: {clip_other_acc:.2f}%")
    print(f"OpenCLIP Average Latency: {clip_avg_ms:.2f} ms")

    # ==========================================
    # EVALUATE MODEL B2: EMBEDDING CLASSIFIER
    # ==========================================
    print("\n--- Evaluating Model B2: OpenCLIP Embedding + Logistic Regression Classifier ---")
    train_features = []
    train_labels = []

    with torch.no_grad():
        for item in train_set:
            try:
                im = Image.open(item["path"]).convert("RGB")
                im_tensor = clip_preprocess(im).unsqueeze(0)
                feat = clip_model.encode_image(im_tensor)
                feat /= feat.norm(dim=-1, keepdim=True)
                train_features.append(feat[0].numpy())
                train_labels.append(ALL_CLASSES.index(item["expected"]))
            except:
                continue

    X_train = np.array(train_features)
    y_train = np.array(train_labels)

    clf = LogisticRegression(max_iter=1000, C=1.0)
    clf.fit(X_train, y_train)

    emb_habit_approved = 0
    emb_other_rejected = 0
    with torch.no_grad():
        for item in val_set:
            try:
                im = Image.open(item["path"]).convert("RGB")
                im_tensor = clip_preprocess(im).unsqueeze(0)
                feat = clip_model.encode_image(im_tensor)
                feat /= feat.norm(dim=-1, keepdim=True)
                probs = clf.predict_proba(feat.numpy())[0]
            except:
                continue

            exp = item["expected"]
            top_idx = int(np.argmax(probs))
            top_label = ALL_CLASSES[top_idx]

            if exp == "other":
                if top_label == "other":
                    emb_other_rejected += 1
            else:
                target_idx = ALL_CLASSES.index(exp)
                sorted_indices = np.argsort(probs)[::-1]
                if top_idx == target_idx or (sorted_indices[1] == target_idx and sorted_indices[0] in [ALL_CLASSES.index("greenery_furniture"), ALL_CLASSES.index("handicraft_projects")]):
                    emb_habit_approved += 1

    emb_habit_acc = (emb_habit_approved / legacy_habit_total) * 100 if legacy_habit_total else 0
    emb_other_acc = (emb_other_rejected / legacy_other_total) * 100 if legacy_other_total else 0

    print(f"OpenCLIP Embedding Classifier Habit Approval: {emb_habit_acc:.2f}%")
    print(f"OpenCLIP Embedding Classifier Negative Rejection: {emb_other_acc:.2f}%")

    # Summary JSON
    summary = {
        "legacy_mobilenet": {
            "size_mb": round(legacy_size_mb, 2),
            "latency_ms": round(legacy_avg_ms, 1),
            "habit_approval_rate": f"{legacy_habit_acc:.1f}%",
            "negative_rejection_rate": f"{legacy_other_acc:.1f}%",
            "deployment": "Browser WASM (ONNX Runtime Web) client-side + zero server costs"
        },
        "openclip_zero_shot": {
            "size_mb": 605.0,
            "latency_ms": round(clip_avg_ms, 1),
            "habit_approval_rate": f"{clip_habit_acc:.1f}%",
            "negative_rejection_rate": f"{clip_other_acc:.1f}%",
            "deployment": "Requires backend server or heavy container (exceeds Vercel Serverless 50MB function limit)"
        },
        "openclip_embedding_classifier": {
            "size_mb": 605.0,
            "latency_ms": round(clip_avg_ms, 1),
            "habit_approval_rate": f"{emb_habit_acc:.1f}%",
            "negative_rejection_rate": f"{emb_other_acc:.1f}%",
            "deployment": "Requires backend server (605MB weights exceed browser WASM / Vercel Serverless)"
        }
    }

    with open("ml/model_comparison_results.json", "w") as f:
        json.dump(summary, f, indent=2)

    print("\nSaved comparison summary to ml/model_comparison_results.json")

if __name__ == "__main__":
    main()
