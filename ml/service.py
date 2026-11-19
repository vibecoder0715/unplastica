"""Unplastica FastAPI ML Scoring & Task-Routing Service."""
from __future__ import annotations

import base64
import binascii
import hmac
import io
import os
from pathlib import Path
from typing import Optional

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps
from torchvision import transforms

from extraction_engine import extract_foreground

app = FastAPI(title="Unplastica ML Scorer Service", version="0.7.0")

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
SIMPLE_HABITS = {"self_bottle_refill", "recycle_bags"}
ACTIVE_HABITS = {
    "self_bottle_refill",
    "recycle_bags",
    "box_cutlery",
    "greenery_furniture",
    "handicraft_projects",
}
CLASSES = [
    "beeswax_food_wraps",
    "box_cutlery",
    "bulk_pantry_refill",
    "greenery_furniture",
    "handicraft_projects",
    "other",
    "recycle_bags",
    "self_bottle_refill",
]
APPROVAL_THRESHOLD = 0.85

MODEL_DIR = Path(__file__).parent / "model"
LIGHTWEIGHT_ONNX_PATH = MODEL_DIR / "lightweight.onnx"
FALLBACK_ONNX_PATH = MODEL_DIR / "model.onnx"
HEAVY_ONNX_PATH = MODEL_DIR / "heavy.onnx"

_sessions: dict[str, ort.InferenceSession] = {}

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def select_model_tier(habit_code: Optional[str]) -> str:
    code = (habit_code or "").strip()
    if code and code in SIMPLE_HABITS:
        return "lightweight"
    return "heavy"


def get_session(tier: str) -> Optional[ort.InferenceSession]:
    if tier in _sessions:
        return _sessions[tier]

    if tier == "lightweight":
        candidates = [LIGHTWEIGHT_ONNX_PATH, FALLBACK_ONNX_PATH]
    else:
        candidates = [HEAVY_ONNX_PATH, LIGHTWEIGHT_ONNX_PATH, FALLBACK_ONNX_PATH]

    for candidate in candidates:
        if candidate.exists():
            sess = ort.InferenceSession(str(candidate), providers=["CPUExecutionProvider"])
            _sessions[tier] = sess
            return sess
    return None


@app.on_event("startup")
def preload_models() -> None:
    for tier in ("lightweight", "heavy"):
        try:
            get_session(tier)
        except Exception as exc:
            print(f"[ML Service] Warning preloading {tier} session: {exc}")


def verify_magic_bytes(data: bytes) -> bool:
    if len(data) < 12:
        return False
    is_jpeg = data[0] == 0xFF and data[1] == 0xD8 and data[2] == 0xFF
    is_png = data[:4] == b"\x89PNG"
    is_webp = data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    return is_jpeg or is_png or is_webp


def verify_auth(authorization: Optional[str]) -> None:
    expected_key = os.environ.get("ML_SCORER_API_KEY", "").strip()
    if not expected_key:
        return
    if not authorization or not hmac.compare_digest(authorization, f"Bearer {expected_key}"):
        raise HTTPException(status_code=401, detail="Unauthorized")


def run_tiered_inference(image_bytes: bytes, habit_code: Optional[str]) -> dict:
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image payload exceeds 5MB limit")
    if not verify_magic_bytes(image_bytes):
        raise HTTPException(status_code=415, detail="Invalid image magic bytes")

    try:
        pil_image = Image.open(io.BytesIO(image_bytes))
        pil_image = ImageOps.exif_transpose(pil_image).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Malformed image payload") from exc

    normalized_habit = (habit_code or "").strip()
    tier = select_model_tier(normalized_habit)
    sess = get_session(tier)
    if sess is None:
        raise HTTPException(status_code=503, detail="Inference model unavailable")

    extracted = extract_foreground(pil_image)
    tensor = transform(extracted).unsqueeze(0).numpy().astype(np.float32)
    input_name = sess.get_inputs()[0].name
    logits = sess.run(None, {input_name: tensor})[0][0]

    shifted = logits - np.max(logits)
    exps = np.exp(shifted)
    probs = exps / np.sum(exps)

    probabilities = {CLASSES[i]: round(float(probs[i]), 6) for i in range(len(CLASSES))}
    top_idx = int(np.argmax(probs))
    predicted_class = CLASSES[top_idx]
    top_prob = float(probs[top_idx])

    if normalized_habit and normalized_habit in ACTIVE_HABITS:
        target_prob = float(probabilities.get(normalized_habit, 0.0))
        if predicted_class == normalized_habit:
            habit_score = target_prob
            approved = habit_score >= APPROVAL_THRESHOLD
        else:
            habit_score = round(min(target_prob, 0.49), 6)
            approved = False
    else:
        approved = predicted_class != "other" and top_prob >= APPROVAL_THRESHOLD
        habit_score = top_prob if predicted_class != "other" else round(1.0 - top_prob, 6)

    return {
        "score": round(habit_score, 6),
        "approved": approved,
        "predictedClass": predicted_class,
        "confidence": round(top_prob, 6),
        "habitScore": round(habit_score, 6),
        "modelTier": tier,
        "modelVersion": (
            "mobilenet_v3_small-v0.7.0-lightweight"
            if tier == "lightweight"
            else "mobilenet_v3_large-v0.7.0-heavy"
        ),
        "probabilities": probabilities,
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "lightweightLoaded": get_session("lightweight") is not None,
        "heavyLoaded": get_session("heavy") is not None,
    }


@app.post("/score")
@app.post("/infer")
async def score_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(default=None),
    habit_code: Optional[str] = Form(default=None),
    authorization: Optional[str] = Header(default=None),
):
    verify_auth(authorization)

    image_bytes: Optional[bytes] = None
    resolved_habit = habit_code

    content_type = (request.headers.get("content-type") or "").lower()
    if "application/json" in content_type:
        body = await request.json()
        b64 = body.get("image") or body.get("file")
        resolved_habit = body.get("habit_code") or body.get("habitCode") or resolved_habit
        if not b64 or not isinstance(b64, str):
            raise HTTPException(status_code=400, detail="Missing base64 image field")
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        try:
            image_bytes = base64.b64decode(b64, validate=True)
        except binascii.Error as exc:
            raise HTTPException(status_code=400, detail="Invalid base64 encoding") from exc
    elif file is not None:
        if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=415, detail="Unsupported content type")
        image_bytes = await file.read(MAX_UPLOAD_BYTES + 1)
    else:
        raise HTTPException(status_code=400, detail="Expected JSON or multipart image upload")

    result = run_tiered_inference(image_bytes, resolved_habit)
    return JSONResponse(content=result)
