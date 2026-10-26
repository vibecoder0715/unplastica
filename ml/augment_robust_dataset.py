import os
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import random
import numpy as np

def augment_user_bottle():
    raw_path = Path("C:/Users/User/.gemini/antigravity-ide/brain/b8d356fd-0e07-4e67-8b76-6aca88d05ec6/.user_uploaded/media_1793020228799.png")
    ext_path = Path("C:/Users/User/.gemini/antigravity-ide/brain/b8d356fd-0e07-4e67-8b76-6aca88d05ec6/scratch/u2netp_clean_extracted_bottle.png")
    
    if not raw_path.exists():
        print("Raw user image not found!")
        return

    raw_im = Image.open(raw_path).convert("RGB")
    ext_im = Image.open(ext_path).convert("RGB") if ext_path.exists() else raw_im.resize((224, 224))
    
    dst_train = Path("ml/data/train/self_bottle_refill")
    dst_ext = Path("ml/data/train_extracted/self_bottle_refill")
    dst_train.mkdir(parents=True, exist_ok=True)
    dst_ext.mkdir(parents=True, exist_ok=True)

    count = 0
    # 1. Raw noisy variations (crops, zoom, contrast, flip, rotation)
    w, h = raw_im.size
    for i in range(50):
        crop_x1 = random.randint(0, 100)
        crop_y1 = random.randint(0, 80)
        crop_x2 = random.randint(min(w, 550), w)
        crop_y2 = random.randint(min(h, 920), h)
        cropped = raw_im.crop((crop_x1, crop_y1, crop_x2, crop_y2))
        
        if random.random() > 0.5:
            cropped = ImageOps.mirror(cropped)
        
        rot = random.uniform(-8, 8)
        cropped = cropped.rotate(rot, resample=Image.Resampling.BILINEAR, expand=False)
        
        # Color jitter
        enh_b = ImageEnhance.Brightness(cropped)
        cropped = enh_b.enhance(random.uniform(0.85, 1.2))
        enh_c = ImageEnhance.Contrast(cropped)
        cropped = enh_c.enhance(random.uniform(0.85, 1.25))
        
        out_raw = cropped.resize((224, 224), Image.Resampling.LANCZOS)
        out_raw.save(dst_train / f"user_bottle_var_{i:04d}.png")
        count += 1
        
    # 2. Extracted clean variations
    for i in range(50):
        im = ext_im.copy()
        if random.random() > 0.5:
            im = ImageOps.mirror(im)
        rot = random.uniform(-6, 6)
        im = im.rotate(rot, resample=Image.Resampling.BILINEAR, fillcolor=(255, 255, 255))
        enh_b = ImageEnhance.Brightness(im)
        im = enh_b.enhance(random.uniform(0.9, 1.15))
        out_ext = im.resize((224, 224), Image.Resampling.LANCZOS)
        out_ext.save(dst_ext / f"user_bottle_extracted_var_{i:04d}.png")
        out_ext.save(dst_train / f"user_bottle_ext_in_train_{i:04d}.png")
        count += 1

    print(f"Added {count} user bottle augmentation images to self_bottle_refill dataset!")

if __name__ == "__main__":
    augment_user_bottle()
