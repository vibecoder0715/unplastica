"""Small, API-key-protected image scoring service for the Edge Function."""

from __future__ import annotations

import hmac
import os
from pathlib import Path

import torch
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from torchvision import transforms
from torchvision.models import mobilenet_v3_small, mobilenet_v3_large, efficientnet_b0

MODEL_PATH = Path(os.environ.get("MODEL_PATH", "model/best.pt"))
API_KEY = os.environ.get("ML_SCORER_API_KEY", "")
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

if not API_KEY:
    raise RuntimeError("Set ML_SCORER_API_KEY before starting the scoring service.")
if not MODEL_PATH.is_file():
    raise RuntimeError(f"Model file not found: {MODEL_PATH}")

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

checkpoint = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
    classes: list[str] = checkpoint.get("classes", DEFAULT_CLASSES)
    model_version: str = checkpoint.get("version", "mobilenet_v3_small-v0.1.5")
    arch: str = checkpoint.get("arch", "mobilenet_v3_small")
    state_dict = checkpoint["state_dict"]
elif isinstance(checkpoint, dict):
    classes = checkpoint.get("classes", DEFAULT_CLASSES) if "classes" in checkpoint else DEFAULT_CLASSES
    model_version = checkpoint.get("version", "mobilenet_v3_small-v0.1.5") if "version" in checkpoint else "mobilenet_v3_small-v0.1.5"
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

preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])
app = FastAPI(title="Unplastica image scorer", docs_url=None, redoc_url=None)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ready", "model_version": model_version}


@app.post("/score")
async def score(file: UploadFile = File(...), authorization: str | None = Header(default=None)) -> dict[str, object]:
    expected = f"Bearer {API_KEY}"
    if authorization is None or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Not allowed")
    content = await file.read(MAX_IMAGE_BYTES + 1)
    if not content or len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be smaller than 10 MB")
    try:
        with Image.open(__import__("io").BytesIO(content)) as opened:
            if opened.width * opened.height > MAX_IMAGE_PIXELS:
                raise HTTPException(status_code=413, detail="Image dimensions are too large")
            image = opened.convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=415, detail="Unsupported image") from None
    tensor = preprocess(image).unsqueeze(0).to(DEVICE)
    with torch.inference_mode():
        probabilities = torch.softmax(model(tensor)[0], dim=0)
    score_value, index = probabilities.max(dim=0)
    return {
        "predicted_label": classes[int(index)],
        "confidence": float(score_value),
        "model_version": model_version,
    }
