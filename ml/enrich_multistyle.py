import os
import io
import json
import time
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
import numpy as np
from PIL import Image

def compute_dhash(img):
    try:
        im = img.convert('L').resize((9, 8), Image.Resampling.LANCZOS)
        p = np.array(im)
        return p[:, :-1] > p[:, 1:]
    except Exception:
        return None

def hamming_dist(h1, h2):
    return int(np.sum(h1 != h2))

EXTRA_QUERIES = {
    "recycle_bags": [
        "canvas tote bag", "cotton tote bag", "grocery tote bag", "reusable grocery bag",
        "mesh shopping bag", "string bag", "market bag", "jute shopping bag",
        "fabric tote", "shoulder tote bag", "cloth shopping bag", "reusable shopping sack",
        "farmers market bag", "shopper bag canvas", "cotton bag", "calico bag",
        "burlap tote bag", "reusable bag store", "canvas grocery bag", "net shopping bag"
    ],
    "bulk_pantry_refill": [
        "glass storage jar", "mason jar food", "glass jar kitchen", "glass canister kitchen",
        "pantry food storage", "bulk food storage", "spices glass jar", "pantry shelf jars",
        "glass jar rice", "glass jar pasta", "glass jar beans", "mason jar beans",
        "apothecary jar kitchen", "canning jar food", "preserving jar pantry", "zero waste pantry",
        "bulk store grains", "bulk dispenser nuts", "spice jars kitchen", "glass spice jars"
    ],
    "handicraft_projects": [
        "crochet blanket", "crochet bag", "knitted sweater", "knitted scarf",
        "handmade pottery", "handmade ceramic bowl", "handmade ceramic mug", "woven basket handmade",
        "handmade macrame", "quilting fabric", "origami paper", "wood carving handmade",
        "handmade embroidery", "handmade cross stitch", "recycled art craft", "diy upcycling project",
        "beaded jewelry handmade", "handmade wool craft", "handmade rug woven"
    ],
    "box_cutlery": [
        "bento lunch box", "lunch box cutlery", "plastic bento box", "reusable lunchbox spoon",
        "bento box utensils", "food container cutlery", "travel cutlery pouch", "travel utensils set",
        "bamboo cutlery pouch", "tiffin lunchbox", "meal prep container spoon", "lunch box bento",
        "camping mess tin spork", "reusable bento container", "lunch tin sandwich box"
    ],
    "greenery_furniture": [
        "potted plant indoor room", "indoor plant shelf wooden", "houseplant desk office",
        "hanging plant macrame", "succulent indoor planter", "terracotta plant window",
        "potted herbs windowsill", "wooden plant stand indoor"
    ],
    "beeswax_food_wraps": [
        "beeswax wrap kitchen", "reusable beeswax wrap", "waxed food wrap sheet",
        "beeswax bowl cover", "cloth food wrap reusable"
    ],
    "self_bottle_refill": [
        "stainless steel water bottle desk", "reusable water bottle gym", "drinking bottle gym fitness",
        "nalgene bottle hiking", "water refill cooler office", "water dispenser canteen"
    ]
}

def fetch_wiki_pages(query, limit=40):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrnamespace=6&gsrlimit={limit}&prop=imageinfo&iiprop=url&iiurlwidth=500"
    req = urllib.request.Request(url, headers={'User-Agent': 'UnplasticaBot/2.0 (contact@unplastica.org)'})
    try:
        time.sleep(0.4) # polite rate limit for Wikimedia API
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return list(data.get('query', {}).get('pages', {}).values())
    except Exception as e:
        return []

def download_page_img(page):
    ii = page.get('imageinfo', [{}])[0]
    thumb = ii.get('thumburl') or ii.get('url')
    if not thumb:
        return None
    url_clean = thumb.split('?')[0].lower()
    if not (url_clean.endswith('.jpg') or url_clean.endswith('.jpeg') or url_clean.endswith('.png')):
        return None
    try:
        req = urllib.request.Request(thumb, headers={'User-Agent': 'UnplasticaBot/2.0 (contact@unplastica.org)'})
        with urllib.request.urlopen(req, timeout=6) as r:
            raw = r.read()
            if len(raw) < 4000:
                return None
            im = Image.open(io.BytesIO(raw))
            if im.width < 120 or im.height < 120:
                return None
            return im.convert('RGB').resize((224, 224), Image.Resampling.LANCZOS)
    except Exception:
        return None

def top_up_category(cat, target_count=260, min_dist=12):
    dest_dir = "ml/data_multistyle"
    cat_dir = os.path.join(dest_dir, cat)
    os.makedirs(cat_dir, exist_ok=True)

    accepted_hashes = []
    accepted_files = []

    existing = [os.path.join(cat_dir, f) for f in os.listdir(cat_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    for p in existing:
        try:
            im = Image.open(p).convert('RGB')
            h = compute_dhash(im)
            if h is not None:
                accepted_hashes.append(h)
                accepted_files.append(p)
        except Exception:
            pass

    print(f"[{cat}] Starting with {len(accepted_files)} existing distinct images. Target: {target_count}", flush=True)

    if len(accepted_files) >= target_count:
        print(f"[{cat}] Already reached target {len(accepted_files)} >= {target_count}.", flush=True)
        return cat, len(accepted_files)

    queries = EXTRA_QUERIES.get(cat, [])
    for q in queries:
        if len(accepted_files) >= target_count:
            break
        pages = fetch_wiki_pages(q, limit=40)
        added = 0
        with ThreadPoolExecutor(max_workers=6) as pool:
            futures = [pool.submit(download_page_img, p) for p in pages]
            for f in as_completed(futures):
                if len(accepted_files) >= target_count:
                    break
                im = f.result()
                if im is None:
                    continue
                h = compute_dhash(im)
                if h is None:
                    continue
                is_distinct = True
                for prev_h in accepted_hashes:
                    if hamming_dist(h, prev_h) < min_dist:
                        is_distinct = False
                        break
                if is_distinct:
                    accepted_hashes.append(h)
                    out_p = os.path.join(cat_dir, f"wiki_enrich_{len(accepted_files):04d}.jpg")
                    im.save(out_p, "JPEG", quality=92)
                    accepted_files.append(out_p)
                    added += 1

        print(f"  [{cat}] query '{q}': added {added} (Current total: {len(accepted_files)}/{target_count})", flush=True)

    print(f"[{cat}] Finished: {len(accepted_files)} distinct images.", flush=True)
    return cat, len(accepted_files)

if __name__ == "__main__":
    for cat in ["recycle_bags", "bulk_pantry_refill", "handicraft_projects", "box_cutlery", "greenery_furniture", "self_bottle_refill", "beeswax_food_wraps"]:
        top_up_category(cat, target_count=260, min_dist=12)
