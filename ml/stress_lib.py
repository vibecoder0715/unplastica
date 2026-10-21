"""Shared helpers for the Unplastica habit-verification model stress test.

READ-ONLY contract
-------------------
Nothing in this module writes to `ml/model/`, `ml/data/`, `apps/web/public/model/`
or any application source file. The only directory it writes to is
`ml/stress_report/` (results + a cache of freshly downloaded evaluation images).
"""

from __future__ import annotations

import hashlib
import io
import json
import math
import random
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Iterable, Sequence

import numpy as np
import torch
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from torchvision import transforms
from torchvision.models import mobilenet_v3_large, mobilenet_v3_small, efficientnet_b0

REPO_ROOT = Path(__file__).resolve().parent.parent
REPORT_DIR = REPO_ROOT / "ml" / "stress_report"
CACHE_DIR = REPORT_DIR / "cache"

# Canonical class order used by ImageFolder (alphabetical) and mirrored in
# apps/web/src/app/App.tsx -> runModelDetection().
CATEGORIES = [
    "beeswax_food_wraps",
    "box_cutlery",
    "bulk_pantry_refill",
    "greenery_furniture",
    "handicraft_projects",
    "other",
    "recycle_bags",
    "self_bottle_refill",
]
HABITS = [c for c in CATEGORIES if c != "other"]

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)

USER_AGENT = "UnplasticaResearch/3.0 (Model Stress Test / Red-Team Evaluation; APU; contact: unplastica@gmail.com)"


# --------------------------------------------------------------------------
# Model loading
# --------------------------------------------------------------------------
def build_model(arch: str, class_count: int, classifier_style: str = "plain") -> torch.nn.Module:
    """`classifier_style`:
      "plain"        -> classifier[3] = Linear(in, n)          (train.py / refine_model.py)
      "dropout_seq"  -> classifier[3] = Sequential(Dropout, Linear)  (train_and_verify_300.py)
    """
    if arch == "mobilenet_v3_large":
        model = mobilenet_v3_large(weights=None)
        model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, class_count)
    elif arch == "efficientnet_b0":
        model = efficientnet_b0(weights=None)
        model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, class_count)
    else:
        model = mobilenet_v3_small(weights=None)
        if classifier_style == "dropout_seq":
            model.classifier[3] = torch.nn.Sequential(
                torch.nn.Dropout(p=0.2),
                torch.nn.Linear(model.classifier[3].in_features, class_count),
            )
        else:
            model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, class_count)
    return model


def load_checkpoint(model_path: Path):
    """Loads BOTH on-disk formats and reports which one is present.

    The shipped ml/model/best.pt is a *raw* state_dict (no 'classes'/'arch'/'version'
    metadata), which is exactly why ml/service.py, ml/evaluate.py and
    ml/run_verification_pipeline.py crash on it.
    """
    checkpoint = torch.load(model_path, map_location="cpu", weights_only=True)
    fmt = "state_dict_with_metadata" if isinstance(checkpoint, dict) and "state_dict" in checkpoint else "raw_state_dict"
    if fmt == "state_dict_with_metadata":
        classes = list(checkpoint["classes"])
        arch = checkpoint.get("arch", "mobilenet_v3_small")
        version = checkpoint.get("version", "unknown")
        val_acc = checkpoint.get("val_accuracy", None)
        image_size = checkpoint.get("image_size", 224)
        state = checkpoint["state_dict"]
        style = checkpoint.get("classifier_style", "dropout_seq" if any(k.startswith("classifier.3.1.") for k in state) else "plain")
    else:
        state = checkpoint
        classes = list(CATEGORIES)
        arch = "mobilenet_v3_small"
        version = "UNVERSIONED (raw state_dict, no metadata)"
        val_acc = None
        image_size = 224
        style = "dropout_seq" if any(k.startswith("classifier.3.1.") for k in state) else "plain"

    model = build_model(arch, len(classes), style)
    model.load_state_dict(state)
    model.eval()
    meta = {"arch": arch, "version": version, "val_accuracy": val_acc,
            "image_size": image_size, "checkpoint_format": fmt,
            "classifier_style": style,
            "metadata_present": fmt == "state_dict_with_metadata"}
    return model, classes, meta


def server_preprocess() -> transforms.Compose:
    """Exactly the transform used by ml/service.py (the production scorer)."""
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=list(IMAGENET_MEAN), std=list(IMAGENET_STD)),
    ])


def to_tensor_batch(images: Sequence[Image.Image], resize_mode: str = "bilinear") -> torch.Tensor:
    """Replicates the server preprocessing path (torchvision Resize -> ToTensor -> Normalize).

    `resize_mode` selects the PIL filter used by transforms.Resize so we can measure
    train/serve skew between different resamplers.
    """
    filt = {
        "bilinear": Image.Resampling.BILINEAR,
        "lanczos": Image.Resampling.LANCZOS,
        "nearest": Image.Resampling.NEAREST,
        "box": Image.Resampling.BOX,      # approximate browser/canvas high-quality downscale
    }[resize_mode]
    tensors = []
    for im in images:
        im = im.convert("RGB").resize((224, 224), filt)
        arr = np.asarray(im, dtype=np.float32) / 255.0
        arr = (arr - np.array(IMAGENET_MEAN, dtype=np.float32)) / np.array(IMAGENET_STD, dtype=np.float32)
        tensors.append(torch.from_numpy(arr.transpose(2, 0, 1)))
    return torch.stack(tensors, dim=0)


@torch.inference_mode()
def predict_probs(model, images: Sequence[Image.Image], batch_size: int = 32) -> np.ndarray:
    probs_out = []
    for i in range(0, len(images), batch_size):
        chunk = list(images[i:i + batch_size])
        x = to_tensor_batch(chunk)
        probs = torch.softmax(model(x), dim=1).numpy()
        probs_out.append(probs)
    return np.concatenate(probs_out, axis=0) if probs_out else np.zeros((0, len(CATEGORIES)))


# --------------------------------------------------------------------------
# Hashing / duplicate detection
# --------------------------------------------------------------------------
def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        while chunk := fh.read(65536):
            h.update(chunk)
    return h.hexdigest()


def dhash(image: Image.Image, hash_size: int = 8) -> int:
    """64-bit difference hash (perceptual, rotation/jpeg tolerant)."""
    im = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    data = np.frombuffer(im.tobytes(), dtype=np.uint8).reshape(hash_size, hash_size + 1)
    bits = data[:, :-1] > data[:, 1:]
    out = 0
    for bit in bits.flatten():
        out = (out << 1) | int(bit)
    return out


def hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def image_paths(root: Path) -> list[Path]:
    if not root.is_dir():
        return []
    return sorted(p for p in root.rglob("*") if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"))


# --------------------------------------------------------------------------
# Perturbation battery (simulates real phone-camera conditions)
# --------------------------------------------------------------------------
def _jpeg_roundtrip(im: Image.Image, quality: int) -> Image.Image:
    buf = io.BytesIO()
    im.convert("RGB").save(buf, "JPEG", quality=quality)
    buf.seek(0)
    return Image.open(buf).convert("RGB")


def perturb(im: Image.Image, kind: str, param: float | int | None = None, seed: int = 0) -> Image.Image:
    """Apply a single named perturbation. Deterministic for a given (kind, param, seed)."""
    rng = random.Random(seed)
    im = im.convert("RGB")
    if kind == "identity":
        return im
    if kind == "jpeg":
        return _jpeg_roundtrip(im, int(param or 92))
    if kind == "downscale":
        scale = float(param or 0.5)
        w, h = im.size
        small = im.resize((max(8, int(w * scale)), max(8, int(h * scale))), Image.Resampling.LANCZOS)
        return small.resize((w, h), Image.Resampling.LANCZOS)
    if kind == "brightness":
        return ImageEnhance.Brightness(im).enhance(float(param or 1.0))
    if kind == "contrast":
        return ImageEnhance.Contrast(im).enhance(float(param or 1.0))
    if kind == "saturation":
        return ImageEnhance.Color(im).enhance(float(param or 1.0))
    if kind == "grayscale":
        return ImageOps.grayscale(im).convert("RGB")
    if kind == "rotate":
        return im.rotate(float(param or 10), resample=Image.Resampling.BILINEAR, expand=False, fillcolor=(255, 255, 255))
    if kind == "blur":
        return im.filter(ImageFilter.GaussianBlur(radius=float(param or 1.5)))
    if kind == "noise":
        sigma = float(param or 0.05)
        arr = np.asarray(im, dtype=np.float32)
        rng_np = np.random.default_rng(seed)
        noise = rng_np.normal(0.0, sigma * 255.0, arr.shape).astype(np.float32)
        return Image.fromarray(np.clip(arr + noise, 0, 255).astype(np.uint8))
    if kind == "crop":
        frac = float(param or 0.7)
        w, h = im.size
        nw, nh = int(w * frac), int(h * frac)
        left = rng.randint(0, max(0, w - nw))
        top = rng.randint(0, max(0, h - nh))
        return im.crop((left, top, left + nw, top + nh))
    if kind == "jpeg_plus_downscale":
        return _jpeg_roundtrip(perturb(im, "downscale", 0.5, seed), int(param or 70))
    if kind == "phone_chain":
        # realistic: phone camera -> jpeg 88 -> slight downscale -> mild brightness/contrast
        out = _jpeg_roundtrip(im, 88)
        out = perturb(out, "downscale", 0.8, seed)
        out = ImageEnhance.Brightness(out).enhance(rng.uniform(0.9, 1.1))
        out = ImageEnhance.Contrast(out).enhance(rng.uniform(0.9, 1.1))
        return out
    if kind == "pad_letterbox":
        # simulate a different aspect ratio (e.g. 4:3 photo shown in a 1:1 frame)
        w, h = im.size
        side = max(w, h)
        canvas = Image.new("RGB", (side, side), (255, 255, 255))
        canvas.paste(im, ((side - w) // 2, (side - h) // 2))
        return canvas
    raise ValueError(f"unknown perturbation {kind}")


# --------------------------------------------------------------------------
# Fresh web images (never used for training) for honest generalisation tests
# --------------------------------------------------------------------------
def wikimedia_urls(query: str, limit: int = 20) -> list[str]:
    encoded = urllib.parse.quote(query)
    url = (
        f"https://commons.wikimedia.org/w/api.php?action=query&generator=search"
        f"&gsrsearch={encoded}&gsrnamespace=6&gsrlimit={limit}"
        f"&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=768&format=json"
    )
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:  # pragma: no cover - network flakiness
        print(f"    [warn] search failed for {query!r}: {exc}")
        return []
    urls: list[str] = []
    for page in payload.get("query", {}).get("pages", {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        thumb = info.get("thumburl") or info.get("url")
        mime = (info.get("mime") or "").lower()
        if not thumb or not any(m in mime for m in ("jpeg", "jpg", "png", "webp")):
            continue
        if any(w in (page.get("title") or "").lower() for w in
               ("logo", "icon", "map", "diagram", "chart", "svg", "signature", "stamp")):
            continue
        urls.append(thumb)
    return urls


def download_image(url: str) -> Image.Image | None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read()
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        if im.width < 160 or im.height < 160:
            return None
        return im
    except Exception:
        return None


def wikimedia_images(query: str, limit: int = 20) -> list[dict]:
    """Search Wikimedia Commons and return [{url, title, query}, ...]."""
    encoded = urllib.parse.quote(query)
    url = (
        f"https://commons.wikimedia.org/w/api.php?action=query&generator=search"
        f"&gsrsearch={encoded}&gsrnamespace=6&gsrlimit={limit}"
        f"&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=768&format=json"
    )
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:  # pragma: no cover - network flakiness
        print(f"    [warn] search failed for {query!r}: {exc}")
        return []
    out: list[dict] = []
    for page in payload.get("query", {}).get("pages", {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        thumb = info.get("thumburl") or info.get("url")
        mime = (info.get("mime") or "").lower()
        title = page.get("title") or ""
        if not thumb or not any(m in mime for m in ("jpeg", "jpg", "png", "webp")):
            continue
        if any(w in title.lower() for w in
               ("logo", "icon", "map", "diagram", "chart", "svg", "signature", "stamp")):
            continue
        out.append({"url": thumb, "title": title, "query": query})
    return out


def fetch_fresh_images(queries: Sequence[str], label: str, target: int,
                       dedup_hashes: Sequence[int] | None = None,
                       dedup_threshold: int = 10) -> list[tuple[Path, str]]:
    """Download fresh images into the report cache; returns (path, source_title) pairs.

    `dedup_hashes` is an optional list of perceptual hashes (e.g. of the training
    set). Any candidate whose dHash is within `dedup_threshold` Hamming distance of
    one of them is discarded, so the fresh set cannot silently re-use training
    photos. A manifest.json records the Wikimedia title of every cached image so
    the ground-truth labels can be audited.
    """
    out_dir = CACHE_DIR / label
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "manifest.json"
    manifest: dict[str, str] = {}
    if manifest_path.is_file():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    existing = image_paths(out_dir)
    results: list[tuple[Path, str]] = [(p, manifest.get(p.name, "cached")) for p in existing]
    if len(results) >= target:
        return results[:target]

    seen_hashes = {sha256_file(p) for p in existing}
    index = len(existing)
    for query in queries:
        if len(results) >= target:
            break
        for item in wikimedia_images(query, limit=12):
            if len(results) >= target:
                break
            im = download_image(item["url"])
            if im is None:
                continue
            if dedup_hashes:
                h = dhash(im)
                if any(hamming(h, t) <= dedup_threshold for t in dedup_hashes):
                    continue
            buf = io.BytesIO()
            im.save(buf, "JPEG", quality=92)
            digest = hashlib.sha256(buf.getvalue()).hexdigest()
            if digest in seen_hashes:
                continue
            seen_hashes.add(digest)
            dest = out_dir / f"fresh_{index:04d}.jpg"
            im.save(dest, "JPEG", quality=92)
            manifest[dest.name] = item["title"]
            results.append((dest, item["title"]))
            index += 1
    manifest_path.write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    return results


def training_hashes() -> list[int]:
    """dHash of every image in ml/data/train (for de-duplication of fresh sets)."""
    hashes: list[int] = []
    for p in image_paths(REPO_ROOT / "ml" / "data" / "train"):
        try:
            with Image.open(p) as im:
                hashes.append(dhash(im))
        except Exception:
            continue
    return hashes


# --------------------------------------------------------------------------
# Metrics
# --------------------------------------------------------------------------
def confusion_matrix(true_idx: Sequence[int], pred_idx: Sequence[int], n: int) -> np.ndarray:
    cm = np.zeros((n, n), dtype=np.int64)
    for t, p in zip(true_idx, pred_idx):
        cm[t, p] += 1
    return cm


def per_class_metrics(cm: np.ndarray, class_names: Sequence[str]) -> dict:
    out = {}
    for i, name in enumerate(class_names):
        tp = int(cm[i, i])
        fp = int(cm[:, i].sum() - tp)
        fn = int(cm[i, :].sum() - tp)
        support = int(cm[i, :].sum())
        prec = tp / (tp + fp) if (tp + fp) else 0.0
        rec = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
        out[name] = {"tp": tp, "fp": fp, "fn": fn, "tn": int(cm.sum() - tp - fp - fn),
                     "precision": prec, "recall": rec, "f1": f1, "support": support}
    return out


def expected_calibration_error(probs: np.ndarray, labels: np.ndarray, bins: int = 15) -> tuple[float, list[dict]]:
    confidences = probs.max(axis=1)
    predictions = probs.argmax(axis=1)
    correct = (predictions == labels).astype(np.float64)
    edges = np.linspace(0.0, 1.0, bins + 1)
    ece = 0.0
    buckets = []
    for i in range(bins):
        lo, hi = edges[i], edges[i + 1]
        mask = (confidences > lo) & (confidences <= hi) if i > 0 else (confidences >= lo) & (confidences <= hi)
        count = int(mask.sum())
        if count == 0:
            buckets.append({"bin": f"({lo:.2f},{hi:.2f}]", "count": 0, "avg_confidence": None, "accuracy": None})
            continue
        acc = float(correct[mask].mean())
        avg_conf = float(confidences[mask].mean())
        ece += (count / len(confidences)) * abs(avg_conf - acc)
        buckets.append({"bin": f"({lo:.2f},{hi:.2f}]", "count": count,
                        "avg_confidence": round(avg_conf, 4), "accuracy": round(acc, 4)})
    return float(ece), buckets


def negative_log_likelihood(probs: np.ndarray, labels: np.ndarray) -> float:
    p = np.clip(probs[np.arange(len(labels)), labels], 1e-12, 1.0)
    return float(-np.log(p).mean())


def wilson_interval(successes: int, total: int, z: float = 1.96) -> tuple[float, float]:
    if total == 0:
        return (0.0, 0.0)
    phat = successes / total
    denom = 1 + z * z / total
    centre = phat + z * z / (2 * total)
    margin = z * math.sqrt((phat * (1 - phat) + z * z / (4 * total)) / total)
    return ((centre - margin) / denom, (centre + margin) / denom)
