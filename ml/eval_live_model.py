import os
import onnxruntime as ort
import numpy as np
from PIL import Image

session = ort.InferenceSession("ml/model/live_vercel_model.onnx")
val_dir = "ml/data_multistyle_split/val"
CLASSES = sorted([d for d in os.listdir(val_dir) if os.path.isdir(os.path.join(val_dir, d))])
print("Classes:", CLASSES)

mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
std = np.array([0.229, 0.224, 0.225], dtype=np.float32)

total = 0
correct = 0
strict_correct = 0
class_counts = {c: {"total": 0, "correct": 0, "strict_pass": 0, "pred_as_other": 0} for c in CLASSES}

for c in CLASSES:
    cdir = os.path.join(val_dir, c)
    files = [f for f in os.listdir(cdir) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
    for f in files:
        fpath = os.path.join(cdir, f)
        im = Image.open(fpath).convert("RGB").resize((224, 224))
        arr = (np.array(im, dtype=np.float32) / 255.0 - mean) / std
        tensor = np.transpose(arr, (2, 0, 1))[np.newaxis, ...]
        logits = session.run(None, {"input": tensor})[0][0]
        exp = np.exp(logits - np.max(logits))
        probs = exp / np.sum(exp)
        pred_idx = int(np.argmax(probs))
        pred_label = CLASSES[pred_idx]
        best_prob = probs[pred_idx]
        sorted_probs = np.sort(probs)
        margin = sorted_probs[-1] - sorted_probs[-2]

        is_correct = (pred_label == c)
        is_strict = is_correct and (best_prob >= 0.85) and (margin >= 0.20)

        total += 1
        if is_correct: correct += 1
        if is_strict: strict_correct += 1
        class_counts[c]["total"] += 1
        if is_correct: class_counts[c]["correct"] += 1
        if is_strict: class_counts[c]["strict_pass"] += 1
        if pred_label == "other" and c != "other":
            class_counts[c]["pred_as_other"] += 1

acc_pct = (correct / total) * 100
strict_pct = (strict_correct / total) * 100
print(f"\nTotal: {total}, Raw Accuracy: {correct}/{total} ({acc_pct:.2f}%)")
print(f"Strict Client Rule (Prob >= 0.85 & Margin >= 0.20): {strict_correct}/{total} ({strict_pct:.2f}%)\n")

for c in CLASSES:
    cnt = class_counts[c]
    t = cnt["total"]
    r_acc = (cnt["correct"] / t) * 100 if t else 0
    s_acc = (cnt["strict_pass"] / t) * 100 if t else 0
    print(f"{c:20s}: Raw Acc={cnt['correct']}/{t} ({r_acc:.1f}%) | Strict Pass={cnt['strict_pass']}/{t} ({s_acc:.1f}%) | Falsely called 'other'={cnt['pred_as_other']}")
