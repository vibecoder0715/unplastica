"""Unplastica Foreground Extraction Engine.

Extracts the main character / salient habit object from images, stripping away
complex background noise (desks, laptops, cafeteria clutter, rooms) prior to
feeding into the habit classification neural network.
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Literal, Tuple, Union

import numpy as np
from PIL import Image, ImageOps

try:
    import rembg
except ImportError:
    rembg = None


class ExtractionEngine:
    """Extracts salient foreground subjects and removes background noise."""

    def __init__(self, model_name: str = "u2net"):
        """Initialize the extraction engine with a specified model ('u2net' or 'u2netp')."""
        self.model_name = model_name
        self._session = None

    @property
    def session(self):
        """Lazy-load the rembg inference session."""
        if self._session is None:
            if rembg is None:
                raise RuntimeError("rembg is required for ExtractionEngine. Install via `pip install rembg`.")
            self._session = rembg.new_session(self.model_name)
        return self._session

    def remove_background(
        self,
        image: Union[Image.Image, bytes, str, Path],
        alpha_matting: bool = False,
    ) -> Image.Image:
        """Strips background from the image and returns RGBA PIL Image."""
        if isinstance(image, (str, Path)):
            pil_img = Image.open(image).convert("RGB")
        elif isinstance(image, bytes):
            pil_img = Image.open(io.BytesIO(image)).convert("RGB")
        else:
            pil_img = image.convert("RGB")

        # Downscale ultra-high-resolution images to max 1280px for speed while maintaining fine edges
        w, h = pil_img.size
        max_side = 1280
        if max(w, h) > max_side:
            scale = max_side / max(w, h)
            pil_img = pil_img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

        rgba = rembg.remove(
            pil_img,
            session=self.session,
            alpha_matting=alpha_matting,
        )
        return rgba

    def extract_main_character(
        self,
        image: Union[Image.Image, bytes, str, Path],
        target_size: Tuple[int, int] = (224, 224),
        mode: Literal["crop_composite", "composite", "raw_rgba"] = "crop_composite",
        bg_color: Tuple[int, int, int] = (255, 255, 255),
        pad_margin: float = 0.08,
    ) -> Tuple[Image.Image, dict]:
        """Extract the main subject, strip background clutter, and format for the AI engine.

        Modes:
        - 'crop_composite': Isolates the bounding box of the main character with a padding margin,
          centers it on a clean studio background, and fits into target_size.
        - 'composite': Keeps full original perspective with all background pixels replaced by bg_color.
        - 'raw_rgba': Returns original resolution RGBA image.

        Returns:
            (processed_pil_image, metadata_dict)
        """
        rgba = self.remove_background(image)
        alpha = np.array(rgba.split()[3])

        total_pixels = alpha.size
        fg_pixels = int(np.count_nonzero(alpha > 30))
        fg_ratio = fg_pixels / max(1, total_pixels)
        bg_removed_ratio = 1.0 - fg_ratio

        # Find bounding box of extracted foreground
        bbox = rgba.getbbox()
        has_subject = bool(bbox is not None and fg_ratio >= 0.02)

        if not has_subject or bbox is None:
            # Fallback if image has no foreground subject
            if isinstance(image, (str, Path)):
                fallback = Image.open(image).convert("RGB").resize(target_size, Image.Resampling.LANCZOS)
            elif isinstance(image, bytes):
                fallback = Image.open(io.BytesIO(image)).convert("RGB").resize(target_size, Image.Resampling.LANCZOS)
            else:
                fallback = image.convert("RGB").resize(target_size, Image.Resampling.LANCZOS)
            return fallback, {
                "has_subject": False,
                "bbox": None,
                "foreground_ratio": 0.0,
                "background_removed_ratio": 0.0,
                "model_name": self.model_name,
            }

        min_x, min_y, max_x, max_y = bbox
        bw = max_x - min_x
        bh = max_y - min_y

        if mode == "raw_rgba":
            return rgba, {
                "has_subject": True,
                "bbox": bbox,
                "foreground_ratio": fg_ratio,
                "background_removed_ratio": bg_removed_ratio,
                "model_name": self.model_name,
            }

        if mode == "crop_composite":
            # Expand bounding box slightly by pad_margin for natural framing
            pad_w = int(bw * pad_margin)
            pad_h = int(bh * pad_margin)
            crop_x1 = max(0, min_x - pad_w)
            crop_y1 = max(0, min_y - pad_h)
            crop_x2 = min(rgba.width, max_x + pad_w)
            crop_y2 = min(rgba.height, max_y + pad_h)

            cropped_fg = rgba.crop((crop_x1, crop_y1, crop_x2, crop_y2))

            # Maintain aspect ratio inside target_size
            cw, ch = cropped_fg.size
            scale = min(target_size[0] / cw, target_size[1] / ch)
            new_w = max(1, int(cw * scale))
            new_h = max(1, int(ch * scale))
            scaled_fg = cropped_fg.resize((new_w, new_h), Image.Resampling.LANCZOS)

            # Center on target_size canvas
            canvas = Image.new("RGB", target_size, bg_color)
            offset_x = (target_size[0] - new_w) // 2
            offset_y = (target_size[1] - new_h) // 2
            canvas.paste(scaled_fg, (offset_x, offset_y), mask=scaled_fg.split()[3])
            out_img = canvas

        else:  # 'composite'
            # Full frame on clean studio background, then resize
            canvas = Image.new("RGB", rgba.size, bg_color)
            canvas.paste(rgba, (0, 0), mask=rgba.split()[3])
            out_img = canvas.resize(target_size, Image.Resampling.LANCZOS)

        metadata = {
            "has_subject": True,
            "bbox": bbox,
            "foreground_ratio": round(fg_ratio, 4),
            "background_removed_ratio": round(bg_removed_ratio, 4),
            "model_name": self.model_name,
            "extracted_dimensions": (bw, bh),
        }
        return out_img, metadata


_GLOBAL_ENGINE = None

def get_extraction_engine(model_name: str = "u2net") -> ExtractionEngine:
    """Singleton getter for ExtractionEngine."""
    global _GLOBAL_ENGINE
    if _GLOBAL_ENGINE is None or _GLOBAL_ENGINE.model_name != model_name:
        _GLOBAL_ENGINE = ExtractionEngine(model_name=model_name)
    return _GLOBAL_ENGINE
