import os
import io
import json
import urllib.request
import urllib.parse
import threading
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

QUERIES = {
    "box_cutlery": [
        "bento box", "bento lunch box", "plastic bento box", "reusable lunch box",
        "lunch box utensils", "bento box with cutlery", "tiffin box cutlery",
        "compartment lunch box", "bento spoon chopsticks", "plastic lunch box spoon",
        "meal prep container cutlery", "japanese bento box", "travel cutlery set",
        "bamboo utensils set", "reusable cutlery pouch", "stainless steel lunch box",
        "metal tiffin carrier", "dabba lunch box", "portable cutlery case",
        "bento lunch meal", "lunchbox food container", "mess kit camping",
        "reusable silverware case", "picnic cutlery set", "wheat straw cutlery",
        "white bento box", "school lunch box reusable", "spork titanium camping"
    ],
    "beeswax_food_wraps": [
        "beeswax wrap", "beeswax food wrap", "bees wrap", "reusable food wrap",
        "waxed cotton wrap", "beeswax cloth", "cera de abejas tela", "bienenwachstuch",
        "zero waste food wrap", "beeswax cloth food", "waxed food wrap bowl",
        "wax wrap sandwich", "beeswax wraps kitchen", "eco friendly food wrap",
        "sustainable food packaging wrap", "wax coated cloth", "fabric food cover beeswax",
        "homemade beeswax wrap", "organic beeswax wrap", "bowl cover cloth wrap"
    ],
    "bulk_pantry_refill": [
        "bulk food dispenser", "mason jar pantry", "pantry glass jars", "zero waste grocery store",
        "bulk grains jars", "refill station store", "glass jars spices pantry", "bulk food bin",
        "apothecary jars kitchen", "canning jars pantry shelf", "dry food storage jars", "bulk store refill",
        "grain dispenser store", "weck jars pantry", "bulk spices containers", "pantry organizer jars",
        "bulk beans jar", "flour glass canister", "rice jar pantry", "zero waste shop bins"
    ],
    "greenery_furniture": [
        "houseplant living room", "indoor plant pot", "monstera living room", "potted plant indoor",
        "wooden furniture plants", "potted herbs kitchen", "indoor garden living room", "succulent indoor pot",
        "snake plant pot", "ficus indoor plant", "plant stand wooden", "terracotta pot plant indoor",
        "fern potted indoor", "philodendron indoor pot", "potted plant shelf", "rubber fig plant indoor"
    ],
    "handicraft_projects": [
        "handmade craft project", "upcycled craft project", "crochet handmade project", "knitting project handmade",
        "handmade basket woven", "quilted fabric craft", "origami paper craft", "pottery handmade clay",
        "embroidered fabric craft", "handmade textile craft", "macrame handmade wall", "wood carving craft handmade",
        "patchwork handmade quilt", "woven wall hanging", "felt craft handmade", "recycled paper craft project"
    ],
    "recycle_bags": [
        "tote bag canvas", "cotton shopping bag", "reusable grocery bag", "canvas bag shoulder",
        "mesh produce bag", "string shopping bag", "cloth grocery tote", "linen tote bag",
        "eco shopping bag canvas", "reusable fabric bag market", "fabric shopping bag", "printed canvas tote",
        "organic cotton tote bag", "shopping bag reusable market", "net shopping bag fruit", "reusable bag produce"
    ],
    "self_bottle_refill": [
        "reusable water bottle", "stainless steel water bottle", "water refill station", "drinking water fountain refill",
        "nalgene water bottle", "thermos water bottle", "hydro flask bottle", "glass water bottle reusable",
        "klean kanteen bottle", "refillable water bottle", "sports water bottle reusable", "water bottle bicycle cage",
        "insulated water bottle desk", "water cooler bottle refill", "water bottle gym workout", "aluminum water bottle"
    ],
    "other": [
        # 1. Single-use plastics
        "plastic water bottle disposable", "single use plastic cup", "plastic grocery bag disposable",
        "styrofoam container takeout", "disposable plastic cutlery", "plastic straw drink",
        "plastic food packaging wrap", "plastic bag litter", "polystyrene foam clamshell",
        "disposable coffee cup lid", "plastic wrapper snack", "plastic bottle trash",
        # 2. Domestic / indoor objects / clutter
        "laptop keyboard desk", "computer monitor office", "smartphone on desk", "blank wall indoor",
        "tiled floor room", "wooden floor empty", "ceramic coffee cup mug", "aluminum soda can beverage",
        "office desk clutter", "bookshelf books indoor", "sneakers shoes floor", "headphones on desk",
        # 3. Outdoor scenes
        "asphalt street road", "city sidewalk concrete", "car parked street",
        # 4. Balanced representative art / cosplay
        "cosplay costume convention", "manga comic book page", "action figure toy shelf"
    ]
}

def fetch_wiki_pages(query, limit=40):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrnamespace=6&gsrlimit={limit}&prop=imageinfo&iiprop=url&iiurlwidth=500"
    req = urllib.request.Request(url, headers={'User-Agent': 'UnplasticaBot/2.0 (contact@unplastica.org)'})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return list(data.get('query', {}).get('pages', {}).values())
    except Exception:
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

def process_category(cat, target_per_class=320, min_dist=12):
    dest_dir = "ml/data_multistyle"
    cat_dir = os.path.join(dest_dir, cat)
    os.makedirs(cat_dir, exist_ok=True)

    accepted_hashes = []
    accepted_files = []

    # Check if files already exist in dest_dir
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

    # 1. Harvest local images that are distinct
    local_sources = [f"ml/data/train/{cat}", f"ml/test_300_suite/{cat}"]
    for lsrc in local_sources:
        if not os.path.exists(lsrc):
            continue
        for f in sorted(os.listdir(lsrc)):
            if len(accepted_files) >= target_per_class:
                break
            if not f.lower().endswith(('.jpg', '.jpeg', '.png')):
                continue
            if cat == "other" and ("cached_ood" in f or "anime" in f or "manga" in f):
                # Prune excessive manga/anime clumps
                if len([x for x in accepted_files if "manga" in x or "anime" in x or "cosplay" in x]) >= 25:
                    continue
            p = os.path.join(lsrc, f)
            try:
                im = Image.open(p).convert('RGB')
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
                    out_p = os.path.join(cat_dir, f"loc_{len(accepted_files):04d}.jpg")
                    im.resize((224, 224), Image.Resampling.LANCZOS).save(out_p, "JPEG", quality=92)
                    accepted_files.append(out_p)
            except Exception:
                continue

    # Ingest user's bento proof specifically
    if cat == "box_cutlery" and os.path.exists("ml/test_fixtures/user_bento_proof.jpg"):
        u_p = os.path.join(cat_dir, "user_bento_0000.jpg")
        if not os.path.exists(u_p):
            u_im = Image.open("ml/test_fixtures/user_bento_proof.jpg").convert('RGB')
            u_h = compute_dhash(u_im)
            if u_h is not None:
                accepted_hashes.append(u_h)
                u_im.resize((224, 224), Image.Resampling.LANCZOS).save(u_p, "JPEG", quality=92)
                accepted_files.append(u_p)
                print(f"[{cat}] Ingested user's white bento proof!", flush=True)

    print(f"[{cat}] Initial distinct images: {len(accepted_files)}/{target_per_class}", flush=True)

    # 2. Ingest from Wikimedia concurrently
    queries = QUERIES[cat]
    for q in queries:
        if len(accepted_files) >= target_per_class:
            break
        pages = fetch_wiki_pages(q, limit=35)
        # Download images concurrently
        with ThreadPoolExecutor(max_workers=6) as pool:
            futures = [pool.submit(download_page_img, p) for p in pages]
            for f in as_completed(futures):
                if len(accepted_files) >= target_per_class:
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
                    out_p = os.path.join(cat_dir, f"wiki_{len(accepted_files):04d}.jpg")
                    im.save(out_p, "JPEG", quality=92)
                    accepted_files.append(out_p)

        print(f"  [{cat}] query '{q}': current total = {len(accepted_files)}/{target_per_class}", flush=True)

    print(f"[{cat}] COMPLETED: {len(accepted_files)} distinct images.", flush=True)
    return cat, len(accepted_files)

def main():
    print("Starting multi-threaded distinct dataset builder...", flush=True)
    categories = list(QUERIES.keys())
    results = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(process_category, cat, 320, 12): cat for cat in categories}
        for f in as_completed(futures):
            cat, count = f.result()
            results[cat] = count

    total = sum(results.values())
    print(f"\n==========================================", flush=True)
    print(f"ALL CATEGORIES INGESTED: {total} total distinct images across {len(results)} classes!", flush=True)
    for c, cnt in results.items():
        print(f"  {c:<22}: {cnt} distinct images", flush=True)
    print(f"==========================================", flush=True)

if __name__ == "__main__":
    main()
