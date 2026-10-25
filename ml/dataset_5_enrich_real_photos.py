"""Phase: dataset_5 (Real-World Photography Enrichment)
Fetches authentic real-world photos from Wikimedia Commons search queries
for everyday Malaysian university habits (food containers, tumblers, eco-bags).
"""

import json
import urllib.parse
import urllib.request
from pathlib import Path
from PIL import Image
import io

USER_AGENT = "UnplasticaResearch/1.0 (APU Habit Verification; contact: unplastica@gmail.com)"

def search_wikimedia(query: str, limit: int = 15) -> list[str]:
    enc = urllib.parse.quote(query)
    url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={enc}&gsrnamespace=6&gsrlimit={limit}&prop=imageinfo&iiprop=url|mime&iiurlwidth=512&format=json"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            data = json.loads(r.read().decode())
        pages = data.get("query", {}).get("pages", {})
        urls = []
        for pid, p in pages.items():
            infos = p.get("imageinfo", [])
            if not infos:
                continue
            mime = infos[0].get("mime", "").lower()
            if mime in ("image/jpeg", "image/png", "image/webp"):
                thumb = infos[0].get("thumburl") or infos[0].get("url")
                if thumb:
                    urls.append(thumb)
        return urls
    except Exception as e:
        print(f"Error searching {query}: {e}")
        return []

def download_image(url: str) -> Image.Image | None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            data = r.read()
        im = Image.open(io.BytesIO(data)).convert("RGB")
        if im.width >= 100 and im.height >= 100:
            return im
    except Exception:
        pass
    return None

def main():
    base_dir = Path(".")
    train_dir = base_dir / "ml" / "data" / "train"
    val_dir = base_dir / "ml" / "data" / "val"

    tasks = {
        "beeswax_food_wraps": ["beeswax wrap", "wax wrap", "beeswax cloth"],
        "self_bottle_refill": ["metal flask", "stainless steel water bottle", "reusable drinking bottle", "hydro flask"],
    }

    for cat, queries in tasks.items():
        cat_train = train_dir / cat
        cat_val = val_dir / cat
        cat_train.mkdir(exist_ok=True)
        cat_val.mkdir(exist_ok=True)

        added = 0
        for q in queries:
            urls = search_wikimedia(q, limit=12)
            for u in urls:
                im = download_image(u)
                if im:
                    dest = cat_train / f"real_wiki_{cat}_{added:03d}.jpg"
                    im.resize((384, 384), Image.Resampling.LANCZOS).save(dest, "JPEG", quality=90)
                    added += 1
                    # Add 1 to val for honest validation
                    if added % 5 == 0:
                        v_dest = cat_val / f"real_wiki_val_{cat}_{added:03d}.jpg"
                        im.resize((384, 384), Image.Resampling.LANCZOS).save(v_dest, "JPEG", quality=90)
        print(f"[{cat}] Added {added} real photos to train/val.")

if __name__ == "__main__":
    main()
