"""Unplastica AI Image Scoring & Foreground Extraction Microservice."""

from __future__ import annotations

import hmac
import io
import os
from pathlib import Path

import torch
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image, UnidentifiedImageError
from torchvision import transforms
from torchvision.models import efficientnet_b0, mobilenet_v3_large, mobilenet_v3_small

from ml.extraction_engine import get_extraction_engine

MODEL_PATH = Path(os.environ.get("MODEL_PATH", "ml/model/best.pt" if Path("ml/model/best.pt").exists() else "model/best.pt"))
API_KEY = os.environ.get("ML_SCORER_API_KEY", "")
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
EXTRACTION_MODEL = os.environ.get("EXTRACTION_MODEL", "u2net")
SCORE_THRESHOLD = float(os.environ.get("SCORE_THRESHOLD", "0.85"))

DEFAULT_CLASSES: list[str] = [
    "beeswax_food_wraps",
    "box_cutlery",
    "bulk_pantry_refill",
    "greenery_furniture",
    "handicraft_projects",
    "other",
    "recycle_bags",
    "self_bottle_refill",
]

# Load classifier checkpoint
if not MODEL_PATH.is_file():
    raise RuntimeError(f"Model file not found: {MODEL_PATH}")

try:
    checkpoint = torch.load(MODEL_PATH, map_location="cpu", weights_only=False)
except Exception:
    checkpoint = torch.load(MODEL_PATH, map_location="cpu")

if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
    classes: list[str] = checkpoint.get("classes", DEFAULT_CLASSES)
    model_version: str = checkpoint.get("version", "mobilenet_v3_small-v0.3.0-extracted-habit")
    arch: str = checkpoint.get("arch", "mobilenet_v3_small")
    state_dict = checkpoint["state_dict"]
elif isinstance(checkpoint, dict):
    classes = checkpoint.get("classes", DEFAULT_CLASSES) if "classes" in checkpoint else DEFAULT_CLASSES
    model_version = checkpoint.get("version", "mobilenet_v3_small-v0.3.0-extracted-habit") if "version" in checkpoint else "mobilenet_v3_small-v0.3.0-extracted-habit"
    arch = checkpoint.get("arch", "mobilenet_v3_small") if "arch" in checkpoint else "mobilenet_v3_small"
    state_dict = {k: v for k, v in checkpoint.items() if isinstance(v, torch.Tensor)}
else:
    raise RuntimeError(f"Unexpected checkpoint format in {MODEL_PATH}")

has_dropout_seq = any(k.startswith("classifier.3.1.") for k in state_dict.keys())

if arch == "mobilenet_v3_large":
    model = mobilenet_v3_large(weights=None)
    if has_dropout_seq:
        model.classifier[3] = torch.nn.Sequential(
            torch.nn.Dropout(p=0.2),
            torch.nn.Linear(model.classifier[3].in_features, len(classes)),
        )
    else:
        model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, len(classes))
elif arch == "efficientnet_b0":
    model = efficientnet_b0(weights=None)
    model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, len(classes))
else:
    model = mobilenet_v3_small(weights=None)
    if has_dropout_seq:
        model.classifier[3] = torch.nn.Sequential(
            torch.nn.Dropout(p=0.2),
            torch.nn.Linear(model.classifier[3].in_features, len(classes)),
        )
    else:
        model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, len(classes))

model.load_state_dict(state_dict)
model.to(DEVICE).eval()

# Preprocessing for 224x224 MobileNetV3
preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# Initialize and warm up extraction engine
extraction_engine = get_extraction_engine(model_name=EXTRACTION_MODEL)

app = FastAPI(title="Unplastica Habit Verification Engine", docs_url=None, redoc_url=None)


def verify_auth(authorization: str | None) -> None:
    """Validate Bearer API key if configured."""
    if not API_KEY:
        return
    expected = f"Bearer {API_KEY}"
    if authorization is None or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Not allowed")


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ready",
        "model_version": model_version,
        "classes": classes,
        "extraction_model": EXTRACTION_MODEL,
        "device": str(DEVICE),
    }


@app.post("/extract")
async def extract_endpoint(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
) -> Response:
    """Strips background clutter and returns the extracted main character image (PNG)."""
    verify_auth(authorization)
    content = await file.read(MAX_IMAGE_BYTES + 1)
    if not content or len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be smaller than 10 MB")
    try:
        raw_img = Image.open(io.BytesIO(content)).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=415, detail="Unsupported image format")

    extracted_img, _ = extraction_engine.extract_main_character(
        raw_img,
        target_size=(384, 384),
        mode="crop_composite",
        bg_color=(255, 255, 255),
    )
    buf = io.BytesIO()
    extracted_img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


@app.post("/score")
async def score_endpoint(
    file: UploadFile = File(...),
    habit_code: str = Form(default=""),
    skip_extraction: bool = Form(default=False),
    authorization: str | None = Header(default=None),
) -> dict[str, object]:
    """Execute complete pipeline: Extraction -> AI Classification -> Backend Approval."""
    verify_auth(authorization)
    content = await file.read(MAX_IMAGE_BYTES + 1)
    if not content or len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be smaller than 10 MB")
    try:
        with Image.open(io.BytesIO(content)) as opened:
            if opened.width * opened.height > MAX_IMAGE_PIXELS:
                raise HTTPException(status_code=413, detail="Image dimensions are too large")
            raw_img = opened.convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=415, detail="Unsupported image") from None

    # Step 1: Extraction engine strips background noise and extracts main character
    if skip_extraction:
        processed_img = raw_img
        extraction_meta = {"has_subject": True, "background_removed_ratio": 0.0, "foreground_ratio": 1.0}
    else:
        processed_img, extraction_meta = extraction_engine.extract_main_character(
            raw_img,
            target_size=(224, 224),
            mode="crop_composite",
            bg_color=(255, 255, 255),
        )

    # Step 2: AI engine inference
    tensor = preprocess(processed_img).unsqueeze(0).to(DEVICE)
    with torch.inference_mode():
        probabilities = torch.softmax(model(tensor)[0], dim=0)

    score_value, index = probabilities.max(dim=0)
    predicted_label = classes[int(index)]
    confidence = float(score_value)

    # Step 3: Backend Approval / Rejection Decision Gate
    # Approved iff:
    # 1. Target habit matches predicted label (or if no habit_code is requested, label != 'other')
    # 2. Confidence meets threshold (>= 0.85)
    # 3. Object is not 'other' (disposable plastic / adversarial clutter)
    target = habit_code.strip()
    if target:
        verified = bool(predicted_label == target and confidence >= SCORE_THRESHOLD and predicted_label != "other")
    else:
        verified = bool(predicted_label != "other" and confidence >= SCORE_THRESHOLD)

    return {
        "status": "approved" if verified else "rejected",
        "predicted_label": predicted_label,
        "confidence": confidence,
        "verified": verified,
        "model_version": model_version,
        "extraction": {
            "has_subject": extraction_meta.get("has_subject", True),
            "background_removed_ratio": extraction_meta.get("background_removed_ratio", 0.0),
            "foreground_ratio": extraction_meta.get("foreground_ratio", 0.0),
            "model_name": extraction_engine.model_name,
        },
    }
