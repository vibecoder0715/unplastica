import {
  getSpeciesFramingScale,
  isLandStandingAnimal,
  renderAnimalAsset,
} from '../roster/animalRenderer';
import { drawRealisticGrassBlade, renderPlantAsset } from '../roster/plantRenderer';
import { REFINED_FOOD_ICONS } from '../roster/flora/foodIcons';
import { TurtleRigController } from '../turtle/rig';
import type { EmotionType, TearDrop, TurtlePose } from '../turtle/types';
import type {
  FloatingGreenbit,
  HabitatZoneId,
  PlacedAnimal,
  PlacedPlant,
  RejectedDropAnimation,
  SaveState,
  WeatherType,
} from './types';
import {
  ASSET_ECO_CONFIG,
  getAquaticSafeBoundsX,
  getTerrainFloorY,
  getWaterDepthNorm,
  getWaterSurfaceY,
  HABITAT_ZONES,
  isAnimalResting,
  isFloatingPlantAsset,
  SHALLOW_SUNLIT_DEPTH_NORM,
  WORLD_WIDTH,
} from './worldConfig';
import { computeAnimalLoveLevel } from './persistence';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

const thumbnailCache = new Map<string, string>();
const rigCache = new Map<string, TurtleRigController>();
/** Static immutable base pose for flora - saves 30+ full skeletal matrix kinematics per frame */
const STATIC_PLANT_BASE_POSE: TurtlePose = new TurtleRigController('idle', 'right').pose;
/** Eased vertical rest position per animal (smooth climbing into and out of trees). */
const animalRestYCache = new Map<string, number>();
/**
 * Real time between world frames. Rigs used to advance a fixed 0.016 s per frame, so on a
 * phone running at 20-30 fps every animation, including the left/right turn that narrows the
 * turtle's body, ran 2-3x slower in real time and the turtle looked squeezed for long stretches.
 */
let lastWorldElapsedSec = -1;
let worldFrameDt = 0.016;

/**
 * Pure Canvas2D Vector Greenbits Coin.
 * 100% Vector replacement for raster coin bitmap: metallic gold rim, concentric milled edge,
 * glossy radial specular gradient, embossed green sprout/leaf insignia, and ambient glow.
 */
export function drawVectorGreenbitsCoin(ctx: CanvasRenderingContext2D, radius = 16): void {
  ctx.save();

  // 1. Subtle outer drop shadow & ambient glow
  const glowGrad = ctx.createRadialGradient(0, 0, radius * 0.7, 0, 0, radius * 1.25);
  glowGrad.addColorStop(0, 'rgba(234, 179, 8, 0.35)');
  glowGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.25, 0, Math.PI * 2);
  ctx.fill();

  // 2. Outer golden coin rim (milled edge)
  const rimGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
  rimGrad.addColorStop(0, '#fef08a');
  rimGrad.addColorStop(0.3, '#eab308');
  rimGrad.addColorStop(0.7, '#ca8a04');
  rimGrad.addColorStop(1, '#854d0e');
  ctx.fillStyle = rimGrad;
  ctx.strokeStyle = '#422006';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Concentric milled inner ring
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.6)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.86, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Inner recessed coin face
  const faceGrad = ctx.createRadialGradient(-radius * 0.25, -radius * 0.3, 1, 0, 0, radius * 0.82);
  faceGrad.addColorStop(0, '#fef9c3');
  faceGrad.addColorStop(0.5, '#eab308');
  faceGrad.addColorStop(1, '#a16207');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
  ctx.fill();

  // 4. Embossed Greenbits Insignia (Lush green leaf / sprout with drop shadow)
  ctx.fillStyle = '#713f12';
  ctx.beginPath();
  ctx.moveTo(1, radius * 0.42);
  ctx.bezierCurveTo(-radius * 0.38, radius * 0.1, -radius * 0.48, -radius * 0.28, 1, -radius * 0.48);
  ctx.bezierCurveTo(radius * 0.48, -radius * 0.28, radius * 0.38, radius * 0.1, 1, radius * 0.42);
  ctx.closePath();
  ctx.fill();

  const leafGrad = ctx.createLinearGradient(0, -radius * 0.5, 0, radius * 0.4);
  leafGrad.addColorStop(0, '#86efac');
  leafGrad.addColorStop(0.5, '#22c55e');
  leafGrad.addColorStop(1, '#15803d');
  ctx.fillStyle = leafGrad;
  ctx.strokeStyle = '#14532d';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, radius * 0.38);
  ctx.bezierCurveTo(-radius * 0.4, radius * 0.08, -radius * 0.48, -radius * 0.3, 0, -radius * 0.5);
  ctx.bezierCurveTo(radius * 0.48, -radius * 0.3, radius * 0.4, radius * 0.08, 0, radius * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Leaf midrib
  ctx.strokeStyle = '#dcfce7';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(0, radius * 0.32);
  ctx.lineTo(0, -radius * 0.42);
  ctx.stroke();

  // 5. Specular highlight crescent across top rim
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.88, -Math.PI * 0.85, -Math.PI * 0.15);
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders an unmistakable, floating comic overhead emotion badge above an animal in sanctuary.
 */
export function drawOverheadEmotionBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  emotion: string,
  alpha: number,
  elapsedSec: number,
): void {
  if (alpha <= 0.01 || emotion === 'normal' || emotion === 'idle') return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y);

  const bob = Math.sin(elapsedSec * 2.2) * 1.5;
  ctx.translate(0, bob);

  const r = 18;
  // Speech bubble pointer tail pointing down (clean closed comic bubble)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#002c17';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  // Seamless counter-clockwise arc across top of bubble from bottom-right to bottom-left
  ctx.arc(0, -3, r, 0.22 * Math.PI, 0.78 * Math.PI, true);
  // Symmetrical downward comic pointer tail
  ctx.lineTo(0, r + 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Vector icon based on emotion (aligned directly to the center of the bubble sphere)
  ctx.save();
  ctx.translate(0, -3);

  if (emotion === 'laugh') {
    // Laughing hearts / sparkles
    ctx.fillStyle = '#f43f5e';
    ctx.strokeStyle = '#881337';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(-8, -2, -7, -7, 0, -3);
    ctx.bezierCurveTo(7, -7, 8, -2, 0, 4);
    ctx.fill();
    ctx.stroke();
  } else if (emotion === 'waving') {
    // Golden radio/broadcast wave signal (concentric upward radiating arcs + solid base dot, perfectly centered)
    const dotY = 4.2;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, dotY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.3;
    ctx.lineCap = 'round';

    // 3 concentric wave arcs radiating upwards symmetrically
    const radii = [6.2, 10.2, 14.2];
    for (const rad of radii) {
      ctx.beginPath();
      ctx.arc(0, dotY, rad, -Math.PI * 0.74, -Math.PI * 0.26);
      ctx.stroke();
    }
  } else if (emotion === 'wondered') {
    // Bright cyan question mark
    ctx.fillStyle = '#0284c7';
    ctx.font = '800 20px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, 0);
  } else if (emotion === 'angry') {
    // Red 💢 anger cross mark
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.quadraticCurveTo(0, -2, 6, -6);
    ctx.moveTo(-6, 6);
    ctx.quadraticCurveTo(0, 2, 6, 6);
    ctx.moveTo(-6, -6);
    ctx.quadraticCurveTo(-2, 0, -6, 6);
    ctx.moveTo(6, -6);
    ctx.quadraticCurveTo(2, 0, 6, 6);
    ctx.stroke();
  } else if (emotion === 'crying') {
    // Blue teardrop
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.quadraticCurveTo(6, 0, 0, 6);
    ctx.quadraticCurveTo(-6, 0, 0, -7);
    ctx.fill();
    ctx.stroke();
  } else if (emotion === 'sleepy') {
    // Purple Zzz
    ctx.fillStyle = '#7c3aed';
    ctx.font = '800 13px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Zzz', 0, 0);
  } else if (emotion === 'blush') {
    // Pink twin hearts
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(-3, 3);
    ctx.bezierCurveTo(-7, 0, -6, -4, -3, -1);
    ctx.bezierCurveTo(0, -4, 1, 0, -3, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, -1);
    ctx.bezierCurveTo(0, -4, 1, -7, 3, -5);
    ctx.bezierCurveTo(6, -7, 7, -4, 3, -1);
    ctx.fill();
  } else if (emotion === 'congratulate') {
    // Golden star
    ctx.fillStyle = '#eab308';
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let s = 0; s < 5; s++) {
      const a1 = (s * Math.PI * 2) / 5 - Math.PI / 2;
      const a2 = a1 + Math.PI / 5;
      if (s === 0) ctx.moveTo(Math.cos(a1) * 8, Math.sin(a1) * 8);
      else ctx.lineTo(Math.cos(a1) * 8, Math.sin(a1) * 8);
      ctx.lineTo(Math.cos(a2) * 4, Math.sin(a2) * 4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}

/** Legacy stub: coin is now 100% pure Canvas2D vector graphics */
export function getGreenbitsCoinImage(): HTMLImageElement | null {
  return null;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) * 0.5));
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}

const PLACEHOLDER_THUMB_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="150" viewBox="0 0 180 150"><circle cx="90" cy="75" r="38" fill="#e4e6d5" opacity="0.7"/></svg>',
  );

const pendingThumbQueue: string[] = [];
const queuedThumbSet = new Set<string>();
let thumbWorkerScheduled = false;

function processPendingThumbQueue(): void {
  thumbWorkerScheduled = false;
  if (typeof document === 'undefined') return;
  const start = performance.now();
  let count = 0;
  while (pendingThumbQueue.length > 0 && count < 2 && performance.now() - start < 7) {
    const nextId = pendingThumbQueue.shift()!;
    queuedThumbSet.delete(nextId);
    const dataUrl = getAssetThumbnailDataUrl(nextId);
    if (dataUrl) {
      const imgs = document.querySelectorAll<HTMLImageElement>(
        `img[data-thumb-asset="${nextId}"]`,
      );
      imgs.forEach((img) => {
        if (img.src !== dataUrl) {
          img.src = dataUrl;
        }
      });
    }
    count++;
  }
  if (pendingThumbQueue.length > 0) {
    scheduleThumbWorker();
  }
}

function scheduleThumbWorker(): void {
  if (thumbWorkerScheduled || typeof window === 'undefined') return;
  thumbWorkerScheduled = true;
  window.setTimeout(processPendingThumbQueue, 20);
}

/**
 * Binds an `<img>` element to an asset thumbnail without blocking the main thread.
 */
export function bindAssetThumbnailImage(img: HTMLImageElement, assetId: string): void {
  img.dataset.thumbAsset = assetId;
  const cached = thumbnailCache.get(assetId);
  if (cached) {
    img.src = cached;
    return;
  }
  img.src = PLACEHOLDER_THUMB_URL;
  if (!queuedThumbSet.has(assetId)) {
    queuedThumbSet.add(assetId);
    pendingThumbQueue.push(assetId);
    scheduleThumbWorker();
  }
}

/**
 * Generates or returns a cached crisp 220x185 data URL thumbnail with 0.76x framing scale
 * so long tails (Malayan Tiger, Macaque, Reticulated Python) and tall crowns are never cut off!
 */
export function getAssetThumbnailDataUrl(assetId: string): string {
  const existing = thumbnailCache.get(assetId);
  if (existing) return existing;
  if (typeof document === 'undefined') return '';

  try {
    const c = document.createElement('canvas');
    const dpr = 2.5; // Significantly increase resolution for assets / stickers
    c.width = Math.round(220 * dpr);
    c.height = Math.round(185 * dpr);
    const cCtx = c.getContext('2d');
    if (!cCtx) return PLACEHOLDER_THUMB_URL;
    cCtx.scale(dpr, dpr);
    cCtx.imageSmoothingEnabled = true;
    cCtx.imageSmoothingQuality = 'high';

    const meta = ASSET_ECO_CONFIG[assetId];
    const controller = new TurtleRigController();
    controller.setEmotion('normal');
    controller.update(0.016, 1.0);

    if (meta?.kind === 'plant') {
      // Show mature fruiting/flowering botanical thumbnail in Store/Bag preview
      renderPlantAsset(cCtx, assetId, 220, 185, controller.pose, 1.0, {
        growthStage: 3,
        fruitCount: 3,
        framingScale: 0.82,
      });
    } else {
      renderAnimalAsset(cCtx, assetId, 220, 185, controller.pose, [], 1.0, {
        framingScale: 0.76,
        locoBlend: 0,
      });
    }

    const url = c.toDataURL('image/png');
    thumbnailCache.set(assetId, url);
    return url;
  } catch {
    return PLACEHOLDER_THUMB_URL;
  }
}

const foodThumbCache = new Map<string, string>();

export function getFoodThumbnailDataUrl(foodId: string): string {
  const existing = foodThumbCache.get(foodId);
  if (existing) return existing;
  if (typeof document === 'undefined') return '';

  try {
    const c = document.createElement('canvas');
    const dpr = 2.5; // Significantly increase resolution for food icons / stickers
    c.width = Math.round(120 * dpr);
    c.height = Math.round(104 * dpr);
    const cCtx = c.getContext('2d');
    if (!cCtx) return PLACEHOLDER_THUMB_URL;
    cCtx.scale(dpr, dpr);
    cCtx.imageSmoothingEnabled = true;
    cCtx.imageSmoothingQuality = 'high';

    drawFoodIcon(cCtx, foodId, 60, 54, 30, false);
    const url = c.toDataURL('image/png');
    foodThumbCache.set(foodId, url);
    return url;
  } catch {
    return PLACEHOLDER_THUMB_URL;
  }
}

/** Lunar phase in [0, 1): 0 new moon, 0.5 full moon (synodic month from a known new moon). */
export function getMoonPhase(nowMs: number): number {
  const synodicDays = 29.530588853;
  const knownNewMoonMs = Date.UTC(2000, 0, 6, 18, 14, 0);
  const days = (nowMs - knownNewMoonMs) / 86_400_000;
  return (((days / synodicDays) % 1) + 1) % 1;
}

/** Paints the unlit part of the moon disc for the given phase (northern-tropics view). */
function drawMoonShadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, phase: number): void {
  const k = Math.cos(phase * Math.PI * 2); // 1 = new, -1 = full
  if (k < -0.985) return; // full moon, nothing in shadow
  ctx.save();
  ctx.fillStyle = 'rgba(12, 20, 38, 0.93)';
  ctx.beginPath();
  if (phase < 0.5) {
    // Waxing: lit on the right, shadow on the left
    ctx.arc(x, y, r, Math.PI / 2, (Math.PI * 3) / 2, false);
    ctx.ellipse(x, y, Math.abs(k) * r, r, 0, (Math.PI * 3) / 2, Math.PI / 2, k < 0);
  } else {
    // Waning: lit on the left, shadow on the right
    ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, false);
    ctx.ellipse(x, y, Math.abs(k) * r, r, 0, Math.PI / 2, (Math.PI * 3) / 2, k < 0);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function isNightTime(hours: number): boolean {
  return hours < 6.2 || hours >= 19.3;
}

function parseColorRgb(color: string): [number, number, number] {
  const trimmed = (color || '').trim();
  if (trimmed.startsWith('rgb')) {
    const matches = trimmed.match(/\d+(\.\d+)?/g);
    if (matches && matches.length >= 3) {
      return [
        Math.max(0, Math.min(255, Math.round(Number(matches[0])))),
        Math.max(0, Math.min(255, Math.round(Number(matches[1])))),
        Math.max(0, Math.min(255, Math.round(Number(matches[2])))),
      ];
    }
  }
  const clean = trimmed.replace('#', '');
  const full =
    clean.length === 3
      ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
      : clean.padEnd(6, '0');
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [
    Number.isFinite(r) ? r : 56,
    Number.isFinite(g) ? g : 189,
    Number.isFinite(b) ? b : 248,
  ];
}

export function lerpColor(colorA: string, colorB: string, t: number): string {
  const safeT = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;
  const [ar, ag, ab] = parseColorRgb(colorA);
  const [br, bg, bb] = parseColorRgb(colorB);
  const r = Math.max(0, Math.min(255, Math.round(ar + (br - ar) * safeT)));
  const g = Math.max(0, Math.min(255, Math.round(ag + (bg - ag) * safeT)));
  const bl = Math.max(0, Math.min(255, Math.round(ab + (bb - ab) * safeT)));
  return `rgb(${r}, ${g}, ${bl})`;
}

/**
 * Renders hyper-detailed botanical & ecological food icons that are 100% consistent
 * between the Store cards, the Bag, dropped foods, and ripe fruits grown on trees.
 */
export function drawFoodIcon(
  ctx: CanvasRenderingContext2D,
  foodId: string,
  x: number,
  y: number,
  radius: number,
  isGolden = false,
): void {
  ctx.save();
  ctx.translate(x, y);

  if (isGolden) {
    const glow = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 1.9);
    glow.addColorStop(0, 'rgba(250, 204, 21, 0.88)');
    glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.9, 0, Math.PI * 2);
    ctx.fill();
  }

  const sc = radius / 22;
  ctx.scale(sc, sc);

  // Refined vector food icons (game/src/roster/flora/foodIcons.ts) in a 22-unit radius frame.
  const refinedFood = REFINED_FOOD_ICONS[foodId];
  if (refinedFood) {
    refinedFood(ctx);
    ctx.restore();
    return;
  }

  if (foodId === 'food_durian_fruit') {
    // Detailed 3D thorny Durian matching plant_03_durian_tree
    ctx.strokeStyle = '#4d3319';
    ctx.lineWidth = 3.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(0, -17);
    ctx.stroke();

    ctx.fillStyle = '#78522b';
    ctx.strokeStyle = '#26170a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, -20, 4.2, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const rx = 18;
    const ry = 21;
    const numSpikes = 20;
    const rim = new Path2D();
    for (let i = 0; i < numSpikes; i++) {
      const a0 = (i / numSpikes) * Math.PI * 2;
      const aMid = ((i + 0.5) / numSpikes) * Math.PI * 2;
      const a1 = ((i + 1) / numSpikes) * Math.PI * 2;
      const bx0 = Math.cos(a0) * rx * 0.9;
      const by0 = Math.sin(a0) * ry * 0.9 + 2;
      const tx = Math.cos(aMid) * (rx + 5.2);
      const ty = Math.sin(aMid) * (ry + 5.2) + 2;
      const bx1 = Math.cos(a1) * rx * 0.9;
      const by1 = Math.sin(a1) * ry * 0.9 + 2;
      if (i === 0) rim.moveTo(bx0, by0);
      rim.lineTo(tx, ty);
      rim.lineTo(bx1, by1);
    }
    rim.closePath();
    const dGrad = ctx.createRadialGradient(-6, -6, 2, 0, 2, 24);
    dGrad.addColorStop(0, isGolden ? '#fef08a' : '#d9f99d');
    dGrad.addColorStop(0.55, isGolden ? '#eab308' : '#65a30d');
    dGrad.addColorStop(1, '#365314');
    ctx.fillStyle = dGrad;
    ctx.fill(rim);
    ctx.strokeStyle = '#1a2e05';
    ctx.lineWidth = 2.0;
    ctx.stroke(rim);

    // Interior 3D pyramidal thorns
    for (let row = -2; row <= 2; row++) {
      const ty = 2 + row * 5.2;
      const halfW = Math.sqrt(Math.max(0, 1 - (row / 2.6) ** 2)) * 12;
      for (let ox = -halfW; ox <= halfW + 0.1; ox += 5.5) {
        ctx.fillStyle = '#ecfccb';
        ctx.strokeStyle = '#1a2e05';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(ox - 2.6, ty + 2);
        ctx.lineTo(ox, ty - 3.6);
        ctx.lineTo(ox + 2.6, ty + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  } else if (foodId === 'food_mangosteen_fruit') {
    // Deep purple Mangosteen with 4-sepal green crown & bottom stigma rosette matching plant_04_mangosteen_tree
    ctx.strokeStyle = '#365314';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, -23);
    ctx.lineTo(0, -14);
    ctx.stroke();

    const mGrad = ctx.createRadialGradient(-6, -4, 2, 0, 2, 20);
    mGrad.addColorStop(0, isGolden ? '#fef08a' : '#c084fc');
    mGrad.addColorStop(0.45, isGolden ? '#ca8a04' : '#581c87');
    mGrad.addColorStop(1, '#1e0936');
    ctx.fillStyle = mGrad;
    ctx.strokeStyle = '#140524';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 2, 17.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Gloss highlight
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.beginPath();
    ctx.ellipse(-6, -3, 5.5, 3.2, -0.45, 0, Math.PI * 2);
    ctx.fill();

    // 4-sepal green calyx cap
    for (const [cxOff, cyOff, rot] of [
      [-8.5, -12, -0.45],
      [8.5, -12, 0.45],
      [-3.5, -14, -0.15],
      [3.5, -14, 0.15],
    ] as const) {
      ctx.fillStyle = '#84cc16';
      ctx.strokeStyle = '#1a2e05';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(cxOff, cyOff, 6.2, 4.0, rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Bottom 6-petal Tampuk Manggis rosette star
    ctx.fillStyle = '#d8b4fe';
    for (let st = 0; st < 6; st++) {
      const sa = (st * Math.PI) / 3;
      ctx.beginPath();
      ctx.ellipse(Math.cos(sa) * 3.0, 13 + Math.sin(sa) * 2.0, 2.0, 1.2, sa, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (foodId === 'food_banana_bunch') {
    // Detailed hand of curved golden-yellow Pisang Emas bananas with green crown cushion matching plant_05_banana_plant
    for (let c = -2; c <= 2; c++) {
      const fx = c * 5.2;
      const curve = c * 3.0;
      ctx.fillStyle = isGolden ? '#fef08a' : '#facc15';
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(fx - 3.4, -10);
      ctx.quadraticCurveTo(fx + curve - 4.5, 4, fx + curve * 0.9, 16);
      ctx.quadraticCurveTo(fx + curve + 4.5, 4, fx + 3.4, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Floral remnant tip dot
      ctx.fillStyle = '#291504';
      ctx.beginPath();
      ctx.arc(fx + curve * 0.9, 15.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Green pedicel cushion collar at top
    ctx.fillStyle = '#65a30d';
    ctx.strokeStyle = '#1a2e05';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, -11, 14, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (foodId === 'food_wild_figs') {
    // Cluster of small red-purple figs (syconia) with stalks, matching P14 Banyan
    ctx.strokeStyle = '#3f2a14';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.quadraticCurveTo(-2, -12, -9, -6);
    ctx.moveTo(0, -20);
    ctx.quadraticCurveTo(3, -12, 9, -7);
    ctx.moveTo(0, -20);
    ctx.lineTo(0, -2);
    ctx.stroke();
    for (const [fx, fy, fr] of [
      [-9, 2, 8.5],
      [9, 1, 8.5],
      [0, 9, 9.5],
    ] as const) {
      const fg = ctx.createRadialGradient(fx - 3, fy - 3, 1, fx, fy, fr + 2);
      fg.addColorStop(0, isGolden ? '#fef08a' : '#f87171');
      fg.addColorStop(0.55, isGolden ? '#eab308' : '#b91c1c');
      fg.addColorStop(1, '#450a0a');
      ctx.fillStyle = fg;
      ctx.strokeStyle = '#2b0606';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(fx, fy, fr * 0.92, fr, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Pale lenticel speckles and the ostiole at the fig's tip
      ctx.fillStyle = 'rgba(254, 243, 199, 0.75)';
      for (const [sx, sy] of [
        [-2.5, -2],
        [2, 1.5],
        [-1, 3.5],
      ] as const) {
        ctx.beginPath();
        ctx.arc(fx + sx, fy + sy, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#2b0606';
      ctx.beginPath();
      ctx.arc(fx, fy + fr * 0.82, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (foodId === 'food_coconut') {
    // Green husked coconut with three-sided ridges and calyx cap, matching P13
    const cg = ctx.createRadialGradient(-6, -6, 2, 0, 2, 22);
    cg.addColorStop(0, isGolden ? '#fef08a' : '#bef264');
    cg.addColorStop(0.55, isGolden ? '#ca8a04' : '#4d7c0f');
    cg.addColorStop(1, '#1a2e05');
    ctx.fillStyle = cg;
    ctx.strokeStyle = '#14240a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(16, -16, 19, 6, 12, 15);
    ctx.bezierCurveTo(6, 21, -6, 21, -12, 15);
    ctx.bezierCurveTo(-19, 6, -16, -16, 0, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(217, 249, 157, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.quadraticCurveTo(3, 2, 0, 18);
    ctx.stroke();
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#3b1a06';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, -17, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (foodId === 'food_rambutan_fruit') {
    // Cluster of three hairy red rambutans on a branched stalk, matching P15
    ctx.strokeStyle = '#4d3319';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-7, -9);
    ctx.moveTo(0, -22);
    ctx.lineTo(8, -10);
    ctx.moveTo(0, -22);
    ctx.lineTo(0, -2);
    ctx.stroke();
    for (const [rx, ry, rs] of [
      [-8, -1, 0.62],
      [8, -2, 0.6],
      [0, 8, 0.7],
    ] as const) {
      ctx.save();
      ctx.translate(rx, ry);
      ctx.scale(rs, rs);
      const rg = ctx.createRadialGradient(-3, -3, 2, 0, 0, 13);
      rg.addColorStop(0, isGolden ? '#fef08a' : '#fb7185');
      rg.addColorStop(0.5, isGolden ? '#eab308' : '#e11d48');
      rg.addColorStop(1, '#881337');
      ctx.fillStyle = rg;
      ctx.strokeStyle = '#4c0519';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10.5, 12.5, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#bef264';
      ctx.lineWidth = 1.7;
      ctx.lineCap = 'round';
      for (let a = 0; a < 14; a++) {
        const ang = (a / 14) * Math.PI * 2;
        const curl = a % 2 === 0 ? 0.3 : -0.3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 9.5, Math.sin(ang) * 11);
        ctx.quadraticCurveTo(
          Math.cos(ang + curl) * 15,
          Math.sin(ang + curl) * 17,
          Math.cos(ang + curl * 1.5) * 16.5,
          Math.sin(ang + curl * 1.5) * 18.5,
        );
        ctx.stroke();
      }
      ctx.restore();
    }
  } else if (foodId === 'food_bamboo_shoots') {
    // Young bamboo shoot (rebung): conical, wrapped in overlapping brown culm sheaths
    for (const [ox, sc, rot] of [
      [-7, 0.8, -0.18],
      [6, 1, 0.1],
    ] as const) {
      ctx.save();
      ctx.translate(ox, 4);
      ctx.rotate(rot);
      ctx.scale(sc, sc);
      for (let s = 0; s < 4; s++) {
        const y0 = 14 - s * 8;
        const half = 10 - s * 2.2;
        ctx.fillStyle = s % 2 === 0 ? (isGolden ? '#facc15' : '#a16207') : isGolden ? '#fde047' : '#ca8a04';
        ctx.strokeStyle = '#422006';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-half, y0);
        ctx.quadraticCurveTo(-half * 0.8, y0 - 10, 0, y0 - 14);
        ctx.quadraticCurveTo(half * 0.8, y0 - 10, half, y0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.moveTo(-2, -16);
      ctx.lineTo(0, -24);
      ctx.lineTo(2, -16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else if (foodId === 'food_wild_honeycomb') {
    // Slab of giant honeybee comb with hexagonal cells and a honey drip, matching P02
    ctx.fillStyle = isGolden ? '#fde047' : '#f59e0b';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-17, -12);
    ctx.quadraticCurveTo(0, -18, 17, -12);
    ctx.quadraticCurveTo(19, 4, 10, 15);
    ctx.quadraticCurveTo(0, 20, -10, 15);
    ctx.quadraticCurveTo(-19, 4, -17, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.75)';
    ctx.lineWidth = 1.1;
    const hexR = 3.6;
    for (let row = -2; row <= 2; row++) {
      for (let col = -2; col <= 2; col++) {
        const hx = col * hexR * 1.75 + (row % 2 === 0 ? 0 : hexR * 0.87);
        const hy = row * hexR * 1.5 + 1;
        if (Math.hypot(hx / 15, hy / 13) > 1) continue;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = Math.PI / 6 + (k * Math.PI) / 3;
          const px = hx + Math.cos(a) * hexR;
          const py = hy + Math.sin(a) * hexR;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(4, 16);
    ctx.quadraticCurveTo(6, 22, 5, 25);
    ctx.arc(5, 24, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (foodId === 'food_ants_termites') {
    // Chunk of termite mound (clay with tunnels) and a few termites and ants
    ctx.fillStyle = '#a16207';
    ctx.strokeStyle = '#422006';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, 14);
    ctx.quadraticCurveTo(-16, -6, -6, -16);
    ctx.quadraticCurveTo(0, -20, 6, -15);
    ctx.quadraticCurveTo(16, -4, 18, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#422006';
    for (const [tx, ty, tr] of [
      [-6, -4, 2.4],
      [5, -8, 2],
      [2, 4, 2.6],
      [-9, 8, 1.8],
      [10, 6, 2],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(tx, ty, tr, tr * 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pale termites
    for (const [bx, by, rot] of [
      [-12, 18, 0.3],
      [12, 19, -0.4],
    ] as const) {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rot);
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.9;
      for (const sx of [-3.2, 0, 3.4]) {
        ctx.beginPath();
        ctx.ellipse(sx, 0, 2.2, 1.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    // A dark ant on top
    ctx.fillStyle = '#1c1917';
    for (const sx of [-3, 0, 3]) {
      ctx.beginPath();
      ctx.arc(sx, -19, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (foodId === 'food_papaya_fruit') {
    // Ripe pyriform papaya with stalk scar, matching P06
    ctx.save();
    ctx.translate(0, 2);
    ctx.scale(1.35, 1.35);
    ctx.rotate(-0.12);
    const pGrad = ctx.createRadialGradient(-3, -4, 1, 0, 0, 15);
    pGrad.addColorStop(0, '#fde047');
    pGrad.addColorStop(0.55, '#f97316');
    pGrad.addColorStop(1, '#c2410c');
    ctx.fillStyle = pGrad;
    ctx.strokeStyle = '#431407';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.bezierCurveTo(8, -12, 11, 0, 9, 10);
    ctx.bezierCurveTo(6, 15, -6, 15, -9, 10);
    ctx.bezierCurveTo(-11, 0, -8, -12, 0, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle papaya longitudinal groove highlights
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(5, 0, 3, 11);
    ctx.stroke();
    ctx.restore();

    // Short green stalk scar at the top where it grew from the trunk
    ctx.save();
    ctx.translate(0, 2);
    ctx.scale(1.35, 1.35);
    ctx.fillStyle = isGolden ? '#facc15' : '#4d7c0f';
    ctx.strokeStyle = '#1a2e05';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -14, 3, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (foodId === 'food_seaweed_kelp') {
    // Ribbon Seagrass & Turtle Grass blades with creeping rhizome matching P22-P24
    ctx.fillStyle = '#92400e';
    ctx.strokeStyle = '#271001';
    ctx.lineWidth = 1.6;
    drawRoundedRect(ctx, -15, 12, 30, 5, 2.5);
    ctx.fill();
    ctx.stroke();

    for (const [ox, h, bend, col] of [
      [-9, 26, -4, '#10b981'],
      [0, 30, 3, '#34d399'],
      [9, 25, 5, '#059669'],
    ] as const) {
      ctx.fillStyle = col;
      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ox - 3.5, 13);
      ctx.quadraticCurveTo(ox + bend * 0.5 - 3, 13 - h * 0.5, ox + bend, 13 - h);
      ctx.quadraticCurveTo(ox + bend * 0.5 + 3, 13 - h * 0.5, ox + 3.5, 13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (foodId === 'food_plankton_bloom') {
    // Bioluminescent Copepod & Diatom Plankton Bloom
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    g.addColorStop(0, 'rgba(125, 211, 252, 0.95)');
    g.addColorStop(0.55, 'rgba(56, 189, 248, 0.55)');
    g.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();

    for (const [px, py, pr] of [
      [-7, -5, 4.2],
      [7, -6, 3.6],
      [0, 5, 4.5],
      [-5, 9, 3.0],
      [9, 4, 3.2],
    ] as const) {
      ctx.fillStyle = '#e0f2fe';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // food_freshwater_crustacean: Detailed River Prawn / Minnow with segmented carapace & feelers
    ctx.fillStyle = isGolden ? '#fde047' : '#fb923c';
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 2, 13, Math.PI * 0.85, Math.PI * 2.15);
    ctx.quadraticCurveTo(6, 12, -8, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Prawn antennae & tail fan
    ctx.beginPath();
    ctx.moveTo(11, -2);
    ctx.quadraticCurveTo(19, -10, 22, -4);
    ctx.moveTo(11, 1);
    ctx.quadraticCurveTo(18, -3, 21, 3);
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(7, -3, 2.0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export interface WorldRenderParams {
  ctx: CanvasRenderingContext2D;
  viewportWidth: number;
  viewportHeight: number;
  cameraX: number;
  cameraY?: number;
  zoom?: number;
  state: SaveState;
  elapsedSec: number;
  floatingCoins: FloatingGreenbit[];
  rejectedDrops: RejectedDropAnimation[];
  activeDrag: {
    kind: 'asset' | 'food' | 'reposition_plant' | 'reposition_animal';
    id: string;
    screenX: number;
    screenY: number;
  } | null;
  selectedAnimalUid: string | null;
  shoreShells: Array<{ id: string; x: number; y: number }>;
}

/**
 * Deterministic pseudo-random helper in [0, 1) for chunked natural scenery
 */
function seededHash(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Renders deterministic natural scenery (25–35% density) for visible 1200px chunks only:
 * - Rainforest: Mossy granite boulders, fallen nurse logs with bracket fungi, fern clumps, canopy vines
 * - River Pond: Submerged river pebbles, cattail reeds, floating duckweed & driftwood
 * - Mudflats: Tidal mud mounds, breathing pneumatophore roots, fiddler crab burrows
 * - Coral Sea: Staghorn & brain coral bommies, sea fans, tube sponges, kelp ribbons
 */
function renderChunkedNaturalScenery(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  viewportWidth: number,
  viewportHeight: number,
  elapsedSec: number,
  nightFactor: number,
): void {
  const chunkSize = 1100;
  const firstChunk = Math.max(0, Math.floor((cameraX - 300) / chunkSize));
  const lastChunk = Math.min(
    Math.floor(WORLD_WIDTH / chunkSize),
    Math.ceil((cameraX + viewportWidth + 300) / chunkSize),
  );

  for (let c = firstChunk; c <= lastChunk; c++) {
    const chunkStart = c * chunkSize;
    // Place 3 natural props per 1100px chunk (~28% visual coverage, never overcrowded)
    for (let slot = 0; slot < 3; slot++) {
      const h1 = seededHash(c * 31 + slot * 7 + 1);
      const h2 = seededHash(c * 31 + slot * 7 + 2);
      const wx = chunkStart + 140 + slot * 340 + (h1 - 0.5) * 140;
      if (wx < 80 || wx > WORLD_WIDTH - 80) continue;

      const floorY = getTerrainFloorY(wx, viewportHeight);
      const zone =
        HABITAT_ZONES.find((z) => wx >= z.xStart && wx <= z.xEnd) ?? HABITAT_ZONES[0];

      ctx.save();
      ctx.translate(wx, floorY);

      const styleIdx = Math.abs(c * 5 + slot * 3) % 5;

      if (zone.id === 'forest') {
        if (styleIdx === 0) {
          // 1. Mossy Rainforest Granite Boulder & Lichen Patch
          const rw = 34 + h2 * 18;
          const rh = 20 + h1 * 12;
          ctx.fillStyle = nightFactor > 0.5 ? '#3b3f44' : '#7b7d78';
          ctx.strokeStyle = '#2a2c2a';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.ellipse(0, -rh * 0.35, rw, rh, 0, Math.PI, Math.PI * 2);
          ctx.lineTo(rw, 4);
          ctx.lineTo(-rw, 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = nightFactor > 0.5 ? '#34482a' : '#6f8f44';
          ctx.beginPath();
          ctx.ellipse(0, -rh * 0.85, rw * 0.78, rh * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (styleIdx === 1) {
          // 2. Fallen Rainforest Nurse Log with Bracket Shelf Fungi
          ctx.fillStyle = '#5c3a21';
          ctx.strokeStyle = '#2b180b';
          ctx.lineWidth = 2.4;
          drawRoundedRect(ctx, -42, -14, 84, 18, 8);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(-14, -14, 7, Math.PI, 0);
          ctx.arc(16, -12, 6, Math.PI, 0);
          ctx.fill();
        } else if (styleIdx === 2) {
          // 3. Wild Rainforest Undergrowth Fern Rosette
          const sway = Math.sin(elapsedSec * 1.8 + wx * 0.01) * 0.08;
          for (const ang of [-2.4, -1.9, -1.2, -0.7]) {
            ctx.save();
            ctx.rotate(ang + sway);
            ctx.fillStyle = nightFactor > 0.5 ? '#2c4a2a' : '#4f8a3a';
            ctx.strokeStyle = '#1d3318';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(22, 0, 22, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        } else if (styleIdx === 3) {
          // 4. Broad-Leaf Alocasia / Elephant-Ear Forest Floor Clump
          const sway = Math.sin(elapsedSec * 1.5 + wx * 0.015) * 3.5;
          for (const [lx, ly, rot, sc] of [
            [-14, -22, -0.45, 0.85],
            [14, -24, 0.42, 0.9],
            [0, -30, 0.04, 1.05],
          ] as const) {
            ctx.strokeStyle = '#2f5222';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(0, 2);
            ctx.quadraticCurveTo(lx * 0.5, ly * 0.5, lx + sway * 0.5, ly);
            ctx.stroke();
            ctx.save();
            ctx.translate(lx + sway * 0.5, ly);
            ctx.rotate(rot);
            ctx.scale(sc, sc);
            ctx.fillStyle = nightFactor > 0.5 ? '#2e5930' : '#4d8c40';
            ctx.strokeStyle = '#1b3618';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(0, 6);
            ctx.bezierCurveTo(-12, 12, -14, -8, 0, -16);
            ctx.bezierCurveTo(14, -8, 12, 12, 0, 6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        } else {
          // 5. Weathered Buttress Root Stump with Wild Ginger Shoot
          ctx.fillStyle = '#4a2e18';
          ctx.strokeStyle = '#241408';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(-28, 4);
          ctx.quadraticCurveTo(-14, -6, -10, -26);
          ctx.lineTo(10, -24);
          ctx.quadraticCurveTo(15, -6, 30, 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.ellipse(18, -8, 5, 8, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (zone.id === 'river') {
        const sway = Math.sin(elapsedSec * 2.1 + wx * 0.02) * 7;
        if (styleIdx === 0) {
          // 1. Submerged smooth river cobbles & swaying Vallisneria tape-grass
          ctx.fillStyle = '#78716c';
          ctx.strokeStyle = '#292524';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(-14, -4, 16, 8, -0.1, 0, Math.PI * 2);
          ctx.ellipse(12, -3, 13, 7, 0.15, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 3.0;
          ctx.lineCap = 'round';
          for (const ox of [-8, 0, 8]) {
            ctx.beginPath();
            ctx.moveTo(ox, -4);
            ctx.quadraticCurveTo(ox + sway * 0.5, -24, ox + sway, -44 - h2 * 18);
            ctx.stroke();
          }
        } else if (styleIdx === 1) {
          // 2. Submerged Sunken Driftwood Branch & Cryptocoryne Water Trumpet Rosette
          ctx.fillStyle = '#473323';
          ctx.strokeStyle = '#1f140c';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(-34, 2);
          ctx.quadraticCurveTo(-4, -14, 28, -22);
          ctx.lineTo(30, -16);
          ctx.quadraticCurveTo(0, -6, -28, 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          for (const [lx, rot] of [
            [-12, -0.35],
            [-2, 0.05],
            [8, 0.38],
          ] as const) {
            ctx.save();
            ctx.translate(lx, -4);
            ctx.rotate(rot + sway * 0.02);
            ctx.fillStyle = '#15803d';
            ctx.strokeStyle = '#052e16';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.ellipse(0, -14, 4.5, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        } else if (styleIdx === 2) {
          // 3. Layered Slate River Ledge & Java Moss Cushion
          ctx.fillStyle = '#57534e';
          ctx.strokeStyle = '#1c1917';
          ctx.lineWidth = 2.0;
          drawRoundedRect(ctx, -32, -8, 64, 10, 4);
          ctx.fill();
          ctx.stroke();
          drawRoundedRect(ctx, -22, -16, 44, 9, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#166534';
          ctx.beginPath();
          ctx.ellipse(0, -17, 18, 4.5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (styleIdx === 3) {
          // 4. Emergent Horsetail Rush / Scirpus Reed Cluster
          ctx.strokeStyle = '#15803d';
          ctx.lineWidth = 2.4;
          for (const [rx, rh] of [
            [-14, 48],
            [-6, 62],
            [3, 56],
            [11, 44],
          ] as const) {
            ctx.beginPath();
            ctx.moveTo(rx, 0);
            ctx.quadraticCurveTo(rx + sway * 0.3, -rh * 0.5, rx + sway * 0.7, -rh);
            ctx.stroke();
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.ellipse(rx + sway * 0.7, -rh, 2.2, 5.0, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // 5. Smooth Quartz River Boulders & Freshwater Mussel Shells
          ctx.fillStyle = '#a8a29e';
          ctx.strokeStyle = '#44403c';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(-8, -5, 18, 10, -0.08, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#312e81';
          ctx.beginPath();
          ctx.ellipse(16, -2, 7, 4, 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (zone.id === 'mud') {
        if (styleIdx === 0) {
          // 1. Sonneratia / Avicennia Breathing Pneumatophore Root Spikes
          ctx.fillStyle = '#57361c';
          ctx.beginPath();
          ctx.ellipse(0, 0, 28, 9, 0, Math.PI, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#3e2723';
          ctx.lineWidth = 3.0;
          for (const rx of [-18, -9, 2, 11, 20]) {
            const rh = 12 + ((Math.abs(rx * 3) + c) % 14);
            ctx.beginPath();
            ctx.moveTo(rx, 0);
            ctx.lineTo(rx, -rh);
            ctx.stroke();
          }
        } else if (styleIdx === 1) {
          // 2. Mud Lobster (Thalassina) Volcano Mound & Fiddler Crab Pellets
          ctx.fillStyle = '#4a3222';
          ctx.strokeStyle = '#26170e';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(-26, 2);
          ctx.quadraticCurveTo(-14, -22, -6, -24);
          ctx.lineTo(6, -24);
          ctx.quadraticCurveTo(14, -22, 26, 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#1c1008';
          ctx.beginPath();
          ctx.ellipse(0, -24, 5.5, 2.2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (styleIdx === 2) {
          // 3. Bruguiera Knee-Root Arch Loops on Estuarine Silt
          ctx.strokeStyle = '#4e342e';
          ctx.lineWidth = 4.2;
          ctx.lineCap = 'round';
          for (const [kx, kw, kh] of [
            [-18, 12, 18],
            [2, 14, 22],
            [18, 10, 15],
          ] as const) {
            ctx.beginPath();
            ctx.moveTo(kx - kw * 0.5, 2);
            ctx.quadraticCurveTo(kx, -kh, kx + kw * 0.5, 2);
            ctx.stroke();
          }
        } else if (styleIdx === 3) {
          // 4. Driftwood Mangrove Log Encrusted with Estuarine Barnacles
          ctx.fillStyle = '#3e2723';
          ctx.strokeStyle = '#1b0f0a';
          ctx.lineWidth = 2.0;
          drawRoundedRect(ctx, -34, -10, 68, 12, 5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#e7e5e4';
          for (const bx of [-18, -6, 8, 20]) {
            ctx.beginPath();
            ctx.arc(bx, -10, 2.8, Math.PI, 0);
            ctx.fill();
          }
        } else {
          // 5. Brackish Tidal Puddle with Fallen Mangrove Propagule Spears
          ctx.fillStyle = 'rgba(56, 120, 112, 0.48)';
          ctx.strokeStyle = '#3e2723';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, 30, 6.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = '#4d7c0f';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(-8, 1);
          ctx.lineTo(-12, -19);
          ctx.stroke();
        }
      } else if (getWaterDepthNorm(wx) > SHALLOW_SUNLIT_DEPTH_NORM + 0.1) {
        // Deep sea floor: varied volcanic basalt pillows, glass sponge chimneys & abyssal crinoids
        ctx.fillStyle = '#2b3442';
        ctx.strokeStyle = '#151b24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 26 + h1 * 22, 10 + h2 * 8, 0, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (styleIdx === 1 || styleIdx === 3) {
          // Venus flower-basket glass sponge (Euplectella) chimney
          ctx.fillStyle = 'rgba(203, 213, 225, 0.38)';
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
          ctx.lineWidth = 1.4;
          for (const [gx, gh] of styleIdx === 1 ? [[0, 52]] : [[-8, 44], [7, 56]]) {
            ctx.beginPath();
            ctx.moveTo(gx - 6, -6);
            ctx.quadraticCurveTo(gx - 9, -gh * 0.65, gx - 4, -gh);
            ctx.lineTo(gx + 5, -gh);
            ctx.quadraticCurveTo(gx + 10, -gh * 0.65, gx + 6, -6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        } else if (styleIdx === 2) {
          // Deep-sea stalked crinoid (sea lily)
          const sway = Math.sin(elapsedSec * 1.3 + wx * 0.01) * 4;
          ctx.strokeStyle = 'rgba(244, 114, 182, 0.55)';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(0, -6);
          ctx.quadraticCurveTo(sway * 0.5, -26, sway, -44);
          for (let a = -2; a <= 2; a++) {
            ctx.moveTo(sway, -44);
            ctx.quadraticCurveTo(sway + a * 6, -54, sway + a * 10, -60);
          }
          ctx.stroke();
        }
      } else {
        // Shallow sunlit coral reef: 5 distinct reef structures
        const sway = Math.sin(elapsedSec * 1.6 + wx * 0.01) * 4;
        if (styleIdx === 0) {
          // 1. Grooved Diploria Brain Coral Dome
          ctx.fillStyle = '#c49a6c';
          ctx.strokeStyle = '#6e5236';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, 22 + h1 * 10, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = 'rgba(110, 82, 54, 0.55)';
          ctx.lineWidth = 1.4;
          for (const r of [8, 15]) {
            ctx.beginPath();
            ctx.arc(0, 0, r, Math.PI * 1.15, Math.PI * 1.85);
            ctx.stroke();
          }
        } else if (styleIdx === 1) {
          // 2. Branching Acropora Staghorn Coral Colony
          ctx.lineCap = 'round';
          ctx.lineWidth = 5.2;
          ctx.strokeStyle = '#a0789f';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(sway * 0.5, -22, sway, -42);
          ctx.moveTo(sway * 0.3, -14);
          ctx.lineTo(-16 + sway, -34);
          ctx.moveTo(sway * 0.4, -18);
          ctx.lineTo(18 + sway, -36);
          ctx.stroke();
        } else if (styleIdx === 2) {
          // 3. Tiered Acropora Table Coral Plate
          ctx.fillStyle = '#8b9d77';
          ctx.strokeStyle = '#3f4d32';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(-6, 0);
          ctx.lineTo(-3, -18);
          ctx.lineTo(4, -18);
          ctx.lineTo(6, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(0, -18, 28, 6.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(6, -26, 20, 5.0, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (styleIdx === 3) {
          // 4. Clustered Barrel Sponge (Xestospongia) Chimneys
          for (const [bx, bw, bh, col] of [
            [-9, 7, 26, '#c98b7c'],
            [7, 6, 20, '#b56e5e'],
          ] as const) {
            ctx.fillStyle = col;
            ctx.strokeStyle = '#5c2d24';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(bx - bw, 0);
            ctx.quadraticCurveTo(bx - bw * 1.15, -bh * 0.5, bx - bw * 0.9, -bh);
            ctx.lineTo(bx + bw * 0.9, -bh);
            ctx.quadraticCurveTo(bx + bw * 1.15, -bh * 0.5, bx + bw, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#2d1510';
            ctx.beginPath();
            ctx.ellipse(bx, -bh, bw * 0.85, 2.4, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // 5. Lacy Gorgonian Sea Fan & Coralline Limestone Outcrop
          ctx.fillStyle = '#78716c';
          ctx.beginPath();
          ctx.ellipse(0, 0, 18, 6, 0, Math.PI, 0);
          ctx.fill();
          ctx.strokeStyle = '#d97757';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          for (const ang of [-0.5, -0.25, 0, 0.25, 0.5]) {
            ctx.moveTo(0, -4);
            ctx.quadraticCurveTo(Math.sin(ang) * 18 + sway * 0.5, -22, Math.sin(ang) * 28 + sway, -38 + Math.abs(ang) * 10);
          }
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }
}

/**
 * Intertidal Mangrove Tide Dynamics (Resolving Open Item O10):
 * Simulates the real semi-diurnal / lunar ebb and flow of brackish estuarine tides across
 * the Matang / coastal mudflats (Zone 3).
 * - High tide: Rising brackish estuarine water laps over the lower mud bank and between stilt roots.
 * - Ebb tide: Receding water exposes glistening wet organic mudflats, shallow tidal pools, and wet specular ribbons.
 */
function renderIntertidalMangroveTide(
  ctx: CanvasRenderingContext2D,
  zStart: number,
  zEnd: number,
  viewportHeight: number,
  elapsedSec: number,
  nightFactor: number,
): void {
  // Tide oscillation: smooth sine curve 0 (low tide) to 1 (high tide)
  const tideCycle = (Math.sin(elapsedSec * 0.045) + 1) * 0.5;
  const mudFloorY = viewportHeight * 0.545;
  const tideWaterY = mudFloorY - 2 + (1 - tideCycle) * 12;

  const step = 28;
  const startX = Math.floor(zStart / step) * step;
  const endX = Math.ceil(zEnd / step) * step;

  // 1. Glistening wet mud gloss & tidal ribbons on the exposed mud flat
  const wetSheenAlpha = (0.16 + (1 - tideCycle) * 0.22) * (1 - nightFactor * 0.4);
  ctx.save();
  ctx.strokeStyle = nightFactor > 0.5 ? `rgba(148, 163, 184, ${wetSheenAlpha * 0.6})` : `rgba(254, 240, 138, ${wetSheenAlpha})`;
  ctx.lineWidth = 2.4;
  for (let wx = startX; wx < endX; wx += 64) {
    const fy = getTerrainFloorY(wx, viewportHeight);
    const waveSheen = Math.sin(wx * 0.015 + elapsedSec * 0.8) * 18;
    ctx.beginPath();
    ctx.moveTo(wx - 16 + waveSheen, fy - 1);
    ctx.lineTo(wx + 22 + waveSheen, fy - 1);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Rising / ebbing brackish estuarine tidal water sheet
  if (tideCycle > 0.18) {
    const waterAlpha = (tideCycle - 0.18) / 0.82;
    ctx.save();
    const tideGrad = ctx.createLinearGradient(0, tideWaterY, 0, mudFloorY + 28);
    const topCol = nightFactor > 0.5
      ? `rgba(22, 45, 36, ${0.45 * waterAlpha})`
      : `rgba(88, 122, 92, ${0.48 * waterAlpha})`;
    const botCol = nightFactor > 0.5
      ? `rgba(14, 28, 22, ${0.72 * waterAlpha})`
      : `rgba(54, 76, 50, ${0.68 * waterAlpha})`;
    tideGrad.addColorStop(0, topCol);
    tideGrad.addColorStop(1, botCol);
    ctx.fillStyle = tideGrad;

    // Build flooded polygon between tide water line and terrain floor
    ctx.beginPath();
    let hasFlooded = false;
    for (let wx = startX; wx <= endX; wx += step) {
      const fy = getTerrainFloorY(wx, viewportHeight);
      if (fy > tideWaterY) {
        if (!hasFlooded) {
          ctx.moveTo(wx, tideWaterY);
          hasFlooded = true;
        }
        ctx.lineTo(wx, fy);
      } else if (hasFlooded) {
        ctx.lineTo(wx, tideWaterY);
      }
    }
    if (hasFlooded) {
      ctx.lineTo(endX, tideWaterY);
      ctx.closePath();
      ctx.fill();
    }

    // Gentle lapping estuarine wavelets and froth line along the water's edge
    ctx.strokeStyle = nightFactor > 0.5 ? 'rgba(186, 230, 253, 0.32)' : 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = 1.6;
    for (let wx = startX; wx < endX; wx += 80) {
      const fy = getTerrainFloorY(wx, viewportHeight);
      if (fy > tideWaterY - 4) {
        const lapX = Math.sin(elapsedSec * 2.2 + wx * 0.03) * 6;
        ctx.beginPath();
        ctx.moveTo(wx + lapX, tideWaterY + 1);
        ctx.lineTo(wx + 34 + lapX, tideWaterY + 1);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 3. At low tide (tideCycle <= 0.65), shallow glistening tide pools trapped in mud hollows
  if (tideCycle < 0.65) {
    const poolAlpha = ((0.65 - tideCycle) / 0.65) * 0.55;
    ctx.save();
    for (let wx = startX + 32; wx < endX - 32; wx += 140) {
      const fy = getTerrainFloorY(wx, viewportHeight);
      const h = seededHash(wx * 0.07);
      if (h > 0.45) {
        const pw = 24 + h * 20;
        const ph = 5 + h * 3;
        ctx.fillStyle = nightFactor > 0.5
          ? `rgba(30, 58, 62, ${poolAlpha})`
          : `rgba(125, 175, 160, ${poolAlpha * 0.8})`;
        ctx.strokeStyle = `rgba(38, 26, 15, ${poolAlpha * 0.9})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(wx, fy + 1, pw, ph, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Tiny sky specular glint in pool center
        ctx.fillStyle = nightFactor > 0.5
          ? `rgba(226, 232, 240, ${poolAlpha * 0.7})`
          : `rgba(255, 255, 255, ${poolAlpha * 0.85})`;
        ctx.beginPath();
        ctx.ellipse(wx - 4, fy + 0.5, pw * 0.28, ph * 0.3, -0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

/**
 * Dynamic reef life and mangrove regeneration.
 * - Sunlit sea floor: large branching staghorn / elkhorn colonies, giant brain & plate corals,
 *   tall gorgonian sea fans, soft leather corals, giant clams and colourful sea stars, all gently
 *   swaying with the current (polyps breathe, fans flex).
 * - Mudflats: Rhizophora propagule seedlings at different growth stages, Avicennia saplings,
 *   Nipa / fern sprouts and drifting fallen mangrove leaves that rustle with the tide.
 * Deterministic per world-x so the scene is stable but every patch looks different.
 */
function renderDynamicReefAndMangroveLife(
  ctx: CanvasRenderingContext2D,
  visStartX: number,
  visEndX: number,
  viewportHeight: number,
  elapsedSec: number,
  nightFactor: number,
): void {
  const seaZone = HABITAT_ZONES.find((z) => z.id === 'sea');
  const mudZone = HABITAT_ZONES.find((z) => z.id === 'mud');
  const dim = (c: string) => lerpColor(c, '#0b1726', nightFactor * 0.45);

  // ---------------- SEA: big corals & sea stars ----------------
  if (seaZone) {
    const spacing = 230;
    const start = Math.max(seaZone.xStart + 160, Math.floor(visStartX / spacing) * spacing);
    const end = Math.min(seaZone.xEnd - 60, visEndX);
    for (let base = start; base <= end; base += spacing) {
      const h1 = seededHash(base * 0.0137 + 3.1);
      const h2 = seededHash(base * 0.0291 + 7.7);
      const h3 = seededHash(base * 0.0419 + 1.9);
      const wx = base + (h1 - 0.5) * 120;
      if (wx < seaZone.xStart + 140 || wx > seaZone.xEnd - 40) continue;
      const depth = getWaterDepthNorm(wx);
      const isDeep = depth > SHALLOW_SUNLIT_DEPTH_NORM + 0.25;
      const fy = getTerrainFloorY(wx, viewportHeight);
      const current = Math.sin(elapsedSec * 0.9 + wx * 0.006);
      const kind = Math.floor(h2 * 6);
      const size = (isDeep ? 0.75 : 1.0) * (1.05 + h3 * 0.75);

      ctx.save();
      ctx.translate(wx, fy + 2);
      ctx.scale(size, size);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      if (isDeep) {
        // Deep cold-water: tall pale sea whip + bamboo coral (no zooxanthellae colour)
        ctx.strokeStyle = dim('#e2e8f0');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(current * 4, -40, current * 10, -80, current * 16, -118);
        ctx.stroke();
        ctx.fillStyle = dim('#fda4af');
        for (let k = 1; k < 9; k++) {
          const t = k / 9;
          ctx.beginPath();
          ctx.arc(current * 16 * t * t, -118 * t, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (kind === 0) {
        // Large branching staghorn (Acropora) colony – every branch grows from a parent branch
        const col = dim(['#c084fc', '#f0abfc', '#93c5fd'][Math.floor(h1 * 3)]);
        const tip = dim('#fdf4ff');
        const drawBranch = (x: number, y: number, ang: number, len: number, w: number, depthLv: number): void => {
          const bend = current * 0.05 * (4 - depthLv);
          const ex = x + Math.cos(ang + bend) * len;
          const ey = y + Math.sin(ang + bend) * len;
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo((x + ex) / 2 + bend * 10, (y + ey) / 2, ex, ey);
          ctx.stroke();
          if (depthLv >= 3 || len < 10) {
            ctx.fillStyle = tip;
            ctx.beginPath();
            ctx.arc(ex, ey, w * 0.55, 0, Math.PI * 2);
            ctx.fill();
            return;
          }
          drawBranch(ex, ey, ang - 0.45, len * 0.72, w * 0.72, depthLv + 1);
          drawBranch(ex, ey, ang + 0.42, len * 0.68, w * 0.72, depthLv + 1);
        };
        drawBranch(0, 0, -Math.PI / 2, 34, 9, 0);
        drawBranch(-6, 0, -Math.PI / 2 - 0.6, 26, 7, 1);
        drawBranch(6, 0, -Math.PI / 2 + 0.6, 26, 7, 1);
      } else if (kind === 1) {
        // Giant brain coral boulder with meandering grooves
        const r = 44;
        const g = ctx.createRadialGradient(-12, -r * 0.7, 6, 0, -r * 0.3, r * 1.1);
        g.addColorStop(0, dim('#fde68a'));
        g.addColorStop(0.6, dim('#d9a35f'));
        g.addColorStop(1, dim('#8a5a2b'));
        ctx.fillStyle = g;
        ctx.strokeStyle = dim('#5b3a1a');
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.55, r * 1.15, r * 0.75, 0, Math.PI, Math.PI * 2);
        ctx.lineTo(r * 1.15, 0);
        ctx.lineTo(-r * 1.15, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = 'rgba(91, 58, 26, 0.55)';
        ctx.lineWidth = 2;
        for (let row = 0; row < 6; row++) {
          ctx.beginPath();
          const yy = -r * 1.2 + row * 11;
          for (let xx = -r * 1.2; xx <= r * 1.2; xx += 6) {
            const wob = Math.sin(xx * 0.18 + row * 1.7) * 4;
            if (xx === -r * 1.2) ctx.moveTo(xx, yy + wob);
            else ctx.lineTo(xx, yy + wob);
          }
          ctx.stroke();
        }
        ctx.restore();
      } else if (kind === 2) {
        // Tall gorgonian sea fan: a mesh of branches all joined to one holdfast stalk
        const fanCol = dim(['#f97316', '#ef4444', '#facc15'][Math.floor(h3 * 3)]);
        ctx.strokeStyle = fanCol;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(current * 2, -14);
        ctx.stroke();
        ctx.lineWidth = 1.6;
        const rays = 9;
        const tips: Array<[number, number]> = [];
        for (let i = 0; i < rays; i++) {
          const a = -Math.PI / 2 + (i / (rays - 1) - 0.5) * 1.5;
          const tx = Math.cos(a) * 80 + current * 9;
          const ty = -14 + Math.sin(a) * 80;
          tips.push([tx, ty]);
          ctx.beginPath();
          ctx.moveTo(current * 2, -14);
          ctx.quadraticCurveTo(tx * 0.5, (ty - 14) * 0.5 - 6, tx, ty);
          ctx.stroke();
        }
        // Cross-linking mesh (anastomosing branches)
        ctx.globalAlpha = 0.7;
        for (const t of [0.4, 0.6, 0.8]) {
          ctx.beginPath();
          tips.forEach(([tx, ty], i) => {
            const px = current * 2 + (tx - current * 2) * t;
            const py = -14 + (ty + 14) * t;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (kind === 3) {
        // Tiered table / plate corals stacked on a short trunk
        ctx.fillStyle = dim('#86a873');
        ctx.strokeStyle = dim('#3f5a32');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(-5, -26);
        ctx.lineTo(5, -26);
        ctx.lineTo(7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        for (const [py, rx, off] of [
          [-26, 58, 0],
          [-42, 42, 8],
          [-55, 26, -4],
        ] as const) {
          ctx.fillStyle = dim('#a3c48f');
          ctx.beginPath();
          ctx.ellipse(off + current * 1.5, py, rx, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = 'rgba(63, 90, 50, 0.4)';
          ctx.beginPath();
          ctx.ellipse(off + current * 1.5, py - 1, rx * 0.6, 4, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = dim('#3f5a32');
          if (py !== -55) {
            ctx.beginPath();
            ctx.moveTo(off - 3, py);
            ctx.lineTo(off - 3, py - 16);
            ctx.moveTo(off + 3, py);
            ctx.lineTo(off + 3, py - 16);
            ctx.stroke();
          }
        }
      } else if (kind === 4) {
        // Soft leather coral with breathing polyps + giant clam at its foot
        const breathe = 1 + Math.sin(elapsedSec * 1.4 + wx) * 0.06;
        ctx.fillStyle = dim('#d6c7a1');
        ctx.strokeStyle = dim('#7a6a43');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.quadraticCurveTo(-12, -26, -36 * breathe, -46);
        ctx.quadraticCurveTo(0, -64 * breathe, 36 * breathe, -46);
        ctx.quadraticCurveTo(12, -26, 10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = dim('#fef9c3');
        for (let p = 0; p < 14; p++) {
          const px = -30 + p * 4.6;
          const py = -48 - Math.sin((p / 13) * Math.PI) * 10 * breathe;
          ctx.beginPath();
          ctx.arc(px, py, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        // Giant clam (Tridacna) with wavy blue mantle
        ctx.save();
        ctx.translate(30, 0);
        ctx.fillStyle = dim('#e7e5e4');
        ctx.strokeStyle = dim('#78716c');
        ctx.beginPath();
        ctx.ellipse(0, -6, 20, 9, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = dim('#2563eb');
        ctx.beginPath();
        for (let x = -16; x <= 16; x += 4) {
          ctx.lineTo(x, -8 - (x % 8 === 0 ? 3 : 0));
        }
        ctx.lineTo(16, -4);
        ctx.lineTo(-16, -4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        // Elkhorn coral: broad flattened antler-like branches
        ctx.fillStyle = dim('#d4a373');
        ctx.strokeStyle = dim('#7c5530');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.quadraticCurveTo(-10, -20, -34 + current * 3, -40);
        ctx.lineTo(-44 + current * 3, -58);
        ctx.lineTo(-30 + current * 3, -50);
        ctx.lineTo(-20 + current * 3, -66);
        ctx.lineTo(-14 + current * 2, -44);
        ctx.quadraticCurveTo(0, -36, 14 + current * 2, -48);
        ctx.lineTo(22 + current * 3, -70);
        ctx.lineTo(30 + current * 3, -52);
        ctx.lineTo(46 + current * 3, -60);
        ctx.lineTo(34 + current * 3, -38);
        ctx.quadraticCurveTo(12, -18, 8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Sea stars & a cushion star scattered on the sand around each coral
      if (!isDeep) {
        const starCount = 1 + Math.floor(h3 * 3);
        for (let s = 0; s < starCount; s++) {
          const sx = (s - (starCount - 1) / 2) * 34 + (h1 - 0.5) * 20 + 50;
          const starCol = dim(['#f97316', '#dc2626', '#2563eb', '#a855f7', '#facc15'][Math.floor(seededHash(wx + s * 9.1) * 5)]);
          const rot = seededHash(wx * 0.3 + s) * Math.PI + Math.sin(elapsedSec * 0.15 + s) * 0.05;
          ctx.save();
          ctx.translate(sx, -3);
          ctx.scale(1, 0.55);
          ctx.rotate(rot);
          ctx.fillStyle = starCol;
          ctx.strokeStyle = 'rgba(30, 20, 10, 0.55)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let k = 0; k < 10; k++) {
            const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
            const rr = k % 2 === 0 ? 13 : 5;
            if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
            else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * 7, Math.sin(a) * 7, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }

  // ---------------- MUD: mangrove shoots, saplings & fallen leaves ----------------
  if (mudZone) {
    const spacing = 120;
    const start = Math.max(mudZone.xStart + 50, Math.floor(visStartX / spacing) * spacing);
    const end = Math.min(mudZone.xEnd - 50, visEndX);
    const breeze = Math.sin(elapsedSec * 1.3);
    for (let base = start; base <= end; base += spacing) {
      const h1 = seededHash(base * 0.0173 + 5.3);
      const h2 = seededHash(base * 0.0377 + 2.2);
      const wx = base + (h1 - 0.5) * 70;
      if (wx < mudZone.xStart + 40 || wx > mudZone.xEnd - 40) continue;
      const fy = getTerrainFloorY(wx, viewportHeight);
      const sway = Math.sin(elapsedSec * 1.6 + wx * 0.03) * 0.06;
      const kind = Math.floor(h2 * 4);
      ctx.save();
      ctx.translate(wx, fy + 1);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (kind === 0) {
        // Rhizophora propagule: green spear stuck in the mud, first leaf pair sprouting from its top
        const hgt = 30 + h1 * 22;
        ctx.rotate(sway);
        ctx.strokeStyle = dim('#4d7c0f');
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(0, -hgt);
        ctx.stroke();
        ctx.strokeStyle = dim('#7c2d12');
        ctx.lineWidth = 4.6;
        ctx.beginPath();
        ctx.moveTo(0, -hgt);
        ctx.lineTo(0, -hgt - 4);
        ctx.stroke();
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.translate(0, -hgt - 4);
          ctx.rotate(side * (0.75 + breeze * 0.06));
          ctx.fillStyle = dim('#65a30d');
          ctx.strokeStyle = dim('#365314');
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(side * 4, -7, 0, -15);
          ctx.quadraticCurveTo(-side * 4, -7, 0, 0);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        // tiny anchoring roots
        ctx.strokeStyle = dim('#3f2a17');
        ctx.lineWidth = 1.2;
        for (const rx of [-5, -2, 3, 6]) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(rx, 2, rx * 1.4, 5);
          ctx.stroke();
        }
      } else if (kind === 1) {
        // Young Rhizophora sapling with arching prop roots and opposite leaf pairs
        const hgt = 56 + h1 * 26;
        ctx.strokeStyle = dim('#5b3a1e');
        ctx.lineWidth = 2;
        for (const rx of [-16, -8, 9, 17]) {
          ctx.beginPath();
          ctx.moveTo(0, -18);
          ctx.quadraticCurveTo(rx * 0.6, -16, rx, 2);
          ctx.stroke();
        }
        ctx.save();
        ctx.rotate(sway);
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -hgt);
        ctx.stroke();
        for (let n = 0; n < 4; n++) {
          const ny = -hgt * (0.45 + n * 0.17);
          for (const side of [-1, 1]) {
            ctx.strokeStyle = dim('#5b3a1e');
            ctx.lineWidth = 1.3;
            const lx = side * 7;
            ctx.beginPath();
            ctx.moveTo(0, ny);
            ctx.lineTo(lx, ny - 3);
            ctx.stroke();
            ctx.save();
            ctx.translate(lx, ny - 3);
            ctx.rotate(side * (1.0 + breeze * 0.08) - Math.PI / 2 * 0);
            ctx.fillStyle = dim(n % 2 ? '#3f7d20' : '#4d8f2a');
            ctx.strokeStyle = dim('#1f3d10');
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(side * 7, -2, 9, 4, side * -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }
        ctx.restore();
      } else if (kind === 2) {
        // Avicennia seedlings + pencil pneumatophores around them
        ctx.strokeStyle = dim('#6b4a2b');
        ctx.lineWidth = 2.4;
        for (const px of [-22, -14, 15, 24, 31]) {
          ctx.beginPath();
          ctx.moveTo(px, 1);
          ctx.lineTo(px + 0.5, -8 - seededHash(px + wx) * 8);
          ctx.stroke();
        }
        for (const ox of [-4, 6]) {
          ctx.save();
          ctx.translate(ox, 0);
          ctx.rotate(sway * 1.4);
          ctx.strokeStyle = dim('#78a045');
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -20);
          ctx.stroke();
          for (const side of [-1, 1]) {
            ctx.fillStyle = dim('#8fb35a');
            ctx.beginPath();
            ctx.ellipse(side * 5, -20, 6, 2.6, side * -0.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      } else {
        // Mangrove fern (Acrostichum) sprout – pinnate fronds rising from one crown
        for (const ang of [-1.05, -0.55, -0.1, 0.4, 0.9]) {
          ctx.save();
          ctx.rotate(ang * 0.6 + sway + breeze * 0.03);
          ctx.strokeStyle = dim('#4d7c0f');
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(4, -18, 2, -34);
          ctx.stroke();
          ctx.fillStyle = dim('#65a30d');
          for (let k = 1; k < 6; k++) {
            const py = -k * 6;
            ctx.beginPath();
            ctx.ellipse(-3.5, py, 4, 1.8, 0.4, 0, Math.PI * 2);
            ctx.ellipse(5.5, py, 4, 1.8, -0.4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      // Fallen mangrove leaves (green, yellow, brown) that drift slightly with the tide
      const leafCount = 2 + Math.floor(h1 * 3);
      for (let l = 0; l < leafCount; l++) {
        const lh = seededHash(wx * 0.11 + l * 3.7);
        const lx = (lh - 0.5) * 80 + Math.sin(elapsedSec * 0.7 + l + wx) * 2.5;
        ctx.save();
        ctx.translate(lx, 0);
        ctx.scale(1, 0.45);
        ctx.rotate(lh * Math.PI * 2);
        ctx.fillStyle = dim(['#a3a832', '#d4a017', '#8b5a2b', '#5f8a2a'][Math.floor(lh * 4)]);
        ctx.strokeStyle = 'rgba(40, 25, 10, 0.5)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(7, 0);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }
}

export function renderEcosystemWorld(params: WorldRenderParams): void {
  const {
    ctx,
    viewportWidth,
    viewportHeight,
    cameraX,
    state,
    elapsedSec,
    floatingCoins,
    rejectedDrops,
    activeDrag,
    selectedAnimalUid,
    shoreShells,
  } = params;
  const cameraY = params.cameraY ?? state.cameraY ?? 0;
  worldFrameDt =
    lastWorldElapsedSec < 0 || elapsedSec <= lastWorldElapsedSec
      ? 0.016
      : clamp(elapsedSec - lastWorldElapsedSec, 0.001, 0.1);
  lastWorldElapsedSec = elapsedSec;

  ctx.save();
  ctx.clearRect(0, 0, viewportWidth, viewportHeight);

  // 1. Astronomical Day/Night Sky & Depth-Aware Atmosphere
  const hrs = state.timeOfDayHours;
  let nightFactor = 0;
  let sunsetFactor = 0;
  if (hrs < 5.5 || hrs >= 20.0) {
    nightFactor = 1;
  } else if (hrs >= 5.5 && hrs < 7.5) {
    nightFactor = 1 - (hrs - 5.5) / 2.0;
    sunsetFactor = Math.sin(((hrs - 5.5) / 2.0) * Math.PI);
  } else if (hrs >= 17.5 && hrs < 20.0) {
    nightFactor = (hrs - 17.5) / 2.5;
    sunsetFactor = Math.sin(((hrs - 17.5) / 2.5) * Math.PI);
  }

  // Deeper in the sea/river = progressively darker abyssal light attenuation
  const depthDarkness = clamp(cameraY / (viewportHeight * 2.4), 0, 0.92);
  const effectiveNight = clamp(nightFactor + depthDarkness * 0.65, 0, 1);

  let skyTop = lerpColor('#2dd4bf', '#060b19', effectiveNight);
  if (effectiveNight < 0.5) {
    skyTop = lerpColor('#0284c7', '#060b19', effectiveNight);
  }
  let skyMid = lerpColor('#bae6fd', '#0f172a', effectiveNight);
  let skyBot = lerpColor('#fafaed', '#1e293b', effectiveNight);

  if (sunsetFactor > 0.05) {
    skyTop = lerpColor(skyTop, '#311042', sunsetFactor * 0.55);
    skyMid = lerpColor(skyMid, '#f97316', sunsetFactor * 0.68);
    skyBot = lerpColor(skyBot, '#fda4af', sunsetFactor * 0.72);
  }
  if (state.currentWeather === 'rain' || state.currentWeather === 'cloudy') {
    const stormDark = state.currentWeather === 'rain' ? 0.68 : 0.45;
    skyTop = lerpColor(skyTop, '#1e293b', stormDark);
    skyMid = lerpColor(skyMid, '#475569', stormDark);
    skyBot = lerpColor(skyBot, '#64748b', stormDark);
  }

  const skyGrad = ctx.createLinearGradient(0, 0, 0, viewportHeight);
  skyGrad.addColorStop(0, skyTop);
  skyGrad.addColorStop(0.52, skyMid);
  skyGrad.addColorStop(1, skyBot);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);

  // 2. Realistic Starfield, Milky Way Dust Band, Cratered Moon & Tropical Sun
  // The sun rises at the left horizon at 06:00, peaks at noon and sets at the right at 18:00.
  // (Before, it slid sideways at a fixed height, so it was "at noon height" at sunrise.)
  const horizonScreenY = viewportHeight * 0.54 - cameraY * 0.18;
  const sunT = (hrs - 6) / 12;
  const celestialX = viewportWidth * (0.08 + 0.84 * clamp(sunT, 0, 1));
  const celestialY = horizonScreenY - Math.sin(Math.PI * clamp(sunT, 0, 1)) * viewportHeight * 0.42;
  const sunAboveHorizon = sunT > -0.02 && sunT < 1.02;
  // How much direct sky light gets through the cloud deck
  const skyClarity =
    state.currentWeather === 'rain'
      ? 0
      : state.currentWeather === 'fog'
        ? 0.15
        : state.currentWeather === 'cloudy'
          ? 0.2
          : 1;

  if (nightFactor > 0.25 && cameraY < viewportHeight * 0.5) {
    ctx.save();
    const starAlpha = clamp((nightFactor - 0.25) / 0.75, 0, 1) * skyClarity;
    ctx.globalAlpha = starAlpha;

    // Subtle diagonal Milky Way galactic glow band
    ctx.save();
    ctx.translate(viewportWidth * 0.5, viewportHeight * 0.22 - cameraY * 0.12);
    ctx.rotate(-0.28);
    const mwGrad = ctx.createLinearGradient(0, -48, 0, 48);
    mwGrad.addColorStop(0, 'rgba(148, 163, 184, 0)');
    mwGrad.addColorStop(0.5, 'rgba(186, 230, 253, 0.10)');
    mwGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
    ctx.fillStyle = mwGrad;
    ctx.fillRect(-viewportWidth, -48, viewportWidth * 2, 96);
    ctx.restore();

    // Multi-spectral twinkling stars batched into 4 color passes (64 draw calls reduced to 4)
    const starQuality = state.graphicQuality || 'dynamic';
    const starCount = starQuality === 'performance' ? 24 : starQuality === 'quality' ? 64 : 44;
    const starTints = ['#ffffff', '#fef9c3', '#bae6fd', '#fde68a'];
    for (let tIdx = 0; tIdx < starTints.length; tIdx++) {
      ctx.fillStyle = starTints[tIdx];
      ctx.beginPath();
      for (let s = tIdx; s < starCount; s += starTints.length) {
        const sx = ((s * 173.7 + cameraX * 0.03) % viewportWidth + viewportWidth) % viewportWidth;
        const sy = ((s * 61.3) % (viewportHeight * 0.48)) - cameraY * 0.14;
        if (sy < -10 || sy > viewportHeight * 0.55) continue;
        const twinkle = 0.45 + 0.55 * Math.sin(elapsedSec * (1.6 + (s % 5) * 0.7) + s * 2.1);
        const sr = (s % 7 === 0 ? 1.9 : 1.1) * twinkle;
        const r = Math.max(0.4, sr);
        ctx.moveTo(sx + r, sy);
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Moon crosses the night sky (18:00 -> 06:00) with its real phase for today's date
    const moonT = (((hrs - 18) % 24) + 24) % 24 / 12;
    const moonX = viewportWidth * (0.08 + 0.84 * clamp(moonT, 0, 1));
    const moonY = horizonScreenY - Math.sin(Math.PI * clamp(moonT, 0, 1)) * viewportHeight * 0.38;
    const moonHalo = ctx.createRadialGradient(moonX, moonY, 18, moonX, moonY, 84);
    moonHalo.addColorStop(0, 'rgba(254, 249, 195, 0.35)');
    moonHalo.addColorStop(0.5, 'rgba(186, 230, 253, 0.12)');
    moonHalo.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.fillStyle = moonHalo;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 84, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fefce8';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 27, 0, Math.PI * 2);
    ctx.fill();

    // Lunar maria craters
    ctx.fillStyle = 'rgba(203, 213, 225, 0.48)';
    for (const [cxOff, cyOff, cr] of [
      [-8, -6, 6.5],
      [7, 5, 5.2],
      [-4, 10, 4.0],
      [9, -8, 3.5],
    ] as const) {
      ctx.beginPath();
      ctx.arc(moonX + cxOff, moonY + cyOff, cr, 0, Math.PI * 2);
      ctx.fill();
    }
    drawMoonShadow(ctx, moonX, moonY, 27.5, getMoonPhase(Date.now()));
    ctx.restore();
  } else if (nightFactor <= 0.45 && sunAboveHorizon && cameraY < viewportHeight * 0.5) {
    // Tropical sun: disc plus glow, dimmed behind cloud, fog and rain
    const sunAlpha = 0.15 + 0.85 * skyClarity;
    ctx.save();
    ctx.globalAlpha = sunAlpha;
    const sunGlow = ctx.createRadialGradient(celestialX, celestialY, 10, celestialX, celestialY, 92);
    sunGlow.addColorStop(0, 'rgba(254, 249, 195, 0.98)');
    sunGlow.addColorStop(0.35, 'rgba(253, 224, 71, 0.52)');
    sunGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sunsetFactor > 0.3 ? '#fed7aa' : '#fffbeb';
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 3. Double rainbow: only in daylight with the sun out, centred on the antisolar point
  //    (opposite the sun and below the horizon by the sun's height), so a high sun gives a low bow.
  const rainbowVisible =
    state.currentWeather === 'rainbow' && nightFactor < 0.35 && sunAboveHorizon && celestialY < horizonScreenY;
  if (rainbowVisible && cameraY < viewportHeight * 0.5) {
    ctx.save();
    const rbCenterX = viewportWidth - celestialX;
    const rbCenterY = horizonScreenY + (horizonScreenY - celestialY) * 0.6;
    const baseR = Math.min(viewportWidth, viewportHeight) * 0.54;
    const rbColors = [
      'rgba(239, 68, 68, 0.34)',
      'rgba(249, 115, 22, 0.32)',
      'rgba(234, 179, 8, 0.32)',
      'rgba(34, 197, 94, 0.30)',
      'rgba(56, 189, 248, 0.30)',
      'rgba(99, 102, 241, 0.28)',
      'rgba(168, 85, 247, 0.26)',
    ];
    // Primary bow
    rbColors.forEach((col, idx) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.arc(rbCenterX, rbCenterY, baseR - idx * 5.8, Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();
    });
    // Faint secondary bow (reversed color order outside primary bow)
    ctx.globalAlpha = 0.38;
    [...rbColors].reverse().forEach((col, idx) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(rbCenterX, rbCenterY, baseR + 54 - idx * 4.2, Math.PI * 1.09, Math.PI * 1.91);
      ctx.stroke();
    });
    ctx.restore();
  }

  // Translate into 2D World Space (-cameraX, -cameraY) with smooth pinch zoom scaling
  const zoom = Math.max(0.4, Math.min(2.5, params.zoom ?? 1.0));
  const seaLevelScreenY = (0.56 * viewportHeight - viewportHeight * 0.5 - cameraY) * zoom + viewportHeight * 0.5;

  // 4. Layered Volumetric Parallax Cumulus & Nimbus Cloud Formations (strictly above horizon/water surface)
  if (seaLevelScreenY > 12) {
    const windSpeed = state.currentWeather === 'windy' ? 32 : state.currentWeather === 'rain' ? 20 : 8.5;
    const isStorm = state.currentWeather === 'rain';
    const isCloudy = state.currentWeather === 'cloudy' || isStorm;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, viewportWidth, Math.min(viewportHeight, seaLevelScreenY));
    ctx.clip();

    const cloudTopCol = isStorm
      ? '#94a3b8'
      : nightFactor > 0.5
        ? '#475569'
        : sunsetFactor > 0.2
          ? '#fff1e6'
          : '#ffffff';
    const cloudMidCol = isStorm
      ? '#64748b'
      : nightFactor > 0.5
        ? '#334155'
        : sunsetFactor > 0.2
          ? '#fed7aa'
          : '#f1f5f9';
    const cloudBaseCol = isStorm
      ? '#334155'
      : nightFactor > 0.5
        ? '#1e293b'
        : sunsetFactor > 0.2
          ? '#cbd5e1'
          : '#cbd5e1';

    const drawVolumetricCloud = (
      cx: number,
      cy: number,
      scaleX: number,
      scaleY: number,
      variant: number,
      alpha: number,
    ) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scaleX, scaleY);
      ctx.globalAlpha = alpha;

      const hexToRgba = (hex: string, a: number): string => {
        const clean = hex.replace('#', '');
        const num = parseInt(clean, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      };

      // 0. Distant virga rain shafts beneath storm clouds (strictly in sky above horizon)
      if (isStorm) {
        const virgaGrad = ctx.createLinearGradient(0, 10, -18, 92);
        virgaGrad.addColorStop(0, hexToRgba(cloudBaseCol, 0.34));
        virgaGrad.addColorStop(0.6, hexToRgba(cloudMidCol, 0.14));
        virgaGrad.addColorStop(1, hexToRgba(cloudMidCol, 0));
        ctx.fillStyle = virgaGrad;
        ctx.beginPath();
        ctx.moveTo(-64, 12);
        ctx.lineTo(74, 12);
        ctx.lineTo(48, 92);
        ctx.lineTo(-90, 92);
        ctx.closePath();
        ctx.fill();
      }

      // 1. Soft atmospheric vapor halo & diffused anvil mist around cloud base
      const mistGrad = ctx.createRadialGradient(6, 8, 10, 6, 12, 112);
      mistGrad.addColorStop(0, hexToRgba(cloudBaseCol, 0.65));
      mistGrad.addColorStop(0.55, hexToRgba(cloudMidCol, 0.28));
      mistGrad.addColorStop(1, hexToRgba(cloudMidCol, 0));
      ctx.fillStyle = mistGrad;
      ctx.beginPath();
      ctx.ellipse(6, 12, 108, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Continuous sculpted cumulus silhouette path (seamless billowing domes + flat condensation base)
      const sil = new Path2D();
      if (variant === 0) {
        sil.moveTo(-84, 15);
        sil.bezierCurveTo(-92, 6, -78, -8, -60, -6);
        sil.bezierCurveTo(-54, -22, -32, -28, -18, -18);
        sil.bezierCurveTo(-8, -42, 26, -44, 38, -20);
        sil.bezierCurveTo(52, -26, 74, -16, 76, -2);
        sil.bezierCurveTo(92, -2, 100, 8, 90, 15);
        sil.bezierCurveTo(42, 20, -36, 20, -84, 15);
      } else if (variant === 1) {
        sil.moveTo(-88, 15);
        sil.bezierCurveTo(-96, 5, -80, -10, -62, -8);
        sil.bezierCurveTo(-50, -30, -18, -36, -2, -22);
        sil.bezierCurveTo(10, -46, 46, -42, 56, -16);
        sil.bezierCurveTo(72, -18, 90, -6, 86, 8);
        sil.bezierCurveTo(96, 12, 92, 17, 78, 16);
        sil.bezierCurveTo(28, 20, -40, 20, -88, 15);
      } else {
        sil.moveTo(-80, 14);
        sil.bezierCurveTo(-88, 4, -72, -12, -50, -10);
        sil.bezierCurveTo(-36, -34, 2, -38, 16, -20);
        sil.bezierCurveTo(28, -32, 60, -28, 68, -8);
        sil.bezierCurveTo(84, -8, 94, 6, 82, 14);
        sil.bezierCurveTo(32, 19, -32, 19, -80, 14);
      }
      sil.closePath();

      const bodyGrad = ctx.createLinearGradient(0, -44, 0, 19);
      bodyGrad.addColorStop(0, cloudTopCol);
      bodyGrad.addColorStop(0.52, cloudMidCol);
      bodyGrad.addColorStop(0.84, cloudBaseCol);
      bodyGrad.addColorStop(1, hexToRgba(cloudBaseCol, 0.88));
      ctx.fillStyle = bodyGrad;
      ctx.fill(sil);

      // 3. Soft radial-gradient 3D volumetric puffs clipped inside and along the cumulus turrets
      // (Zero hard concentric ellipse rings — every puff feathers smoothly to 0 alpha!)
      const puffs: ReadonlyArray<readonly [number, number, number]> =
        variant === 0
          ? [
              [-52, 0, 26],
              [-24, -10, 32],
              [10, -20, 38],
              [44, -8, 30],
              [70, 3, 22],
              [-6, 2, 30],
              [28, 3, 28],
            ]
          : variant === 1
            ? [
                [-56, 1, 25],
                [-22, -14, 35],
                [18, -22, 40],
                [50, -8, 30],
                [72, 4, 22],
                [0, 2, 32],
              ]
            : [
                [-46, -1, 28],
                [-12, -16, 36],
                [26, -14, 34],
                [58, -2, 26],
                [8, 3, 30],
              ];

      for (const [px, py, pr] of puffs) {
        const pGrad = ctx.createRadialGradient(
          px - pr * 0.28,
          py - pr * 0.32,
          pr * 0.08,
          px,
          py,
          pr,
        );
        pGrad.addColorStop(0, hexToRgba(cloudTopCol, 0.92));
        pGrad.addColorStop(0.55, hexToRgba(cloudMidCol, 0.45));
        pGrad.addColorStop(1, hexToRgba(cloudMidCol, 0));
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Flat atmospheric condensation base shadow band
      ctx.save();
      ctx.clip(sil);
      const baseShadow = ctx.createLinearGradient(0, 2, 0, 20);
      baseShadow.addColorStop(0, hexToRgba(cloudBaseCol, 0));
      baseShadow.addColorStop(0.65, hexToRgba(cloudBaseCol, 0.55));
      baseShadow.addColorStop(1, hexToRgba(cloudBaseCol, 0.85));
      ctx.fillStyle = baseShadow;
      ctx.fillRect(-100, 2, 200, 20);
      ctx.restore();

      ctx.restore();
    };

    // Distant high-altitude altocumulus layer + closer main cumulus bank
    const cloudCount = isCloudy ? 14 : 9;
    for (let c = 0; c < cloudCount; c++) {
      const depthLayer = c % 2; // 0 = far, 1 = near
      const par = depthLayer === 0 ? 0.14 : 0.24;
      const spd = windSpeed * (depthLayer === 0 ? 0.65 : 1.08);
      const wrapW = viewportWidth + 460;
      const screenCx =
        (((c * 255 + elapsedSec * spd - cameraX * par) % wrapW) + wrapW) % wrapW - 230;
      const cy = (depthLayer === 0 ? 44 : 78) + (c % 4) * 28 - cameraY * (depthLayer === 0 ? 0.18 : 0.28);
      if (cy < -110 || cy > seaLevelScreenY - 18) continue;

      const scX = (depthLayer === 0 ? 0.78 : 1.12) * (0.9 + (c % 3) * 0.14);
      const scY = (depthLayer === 0 ? 0.72 : 1.04) * (0.9 + ((c + 1) % 3) * 0.1);
      const baseAlpha = isCloudy ? (depthLayer === 0 ? 0.72 : 0.92) : (depthLayer === 0 ? 0.48 : 0.68);
      drawVolumetricCloud(screenCx, cy, scX, scY, c % 3, baseAlpha);
    }
    ctx.restore();
  }

  // 4b. Parallax ridges with atmospheric perspective (farther = paler and bluer, moves slower)
  renderParallaxRidges(ctx, viewportWidth, viewportHeight, cameraX, cameraY, zoom, nightFactor, sunsetFactor);
  ctx.save();
  ctx.translate(viewportWidth * 0.5, viewportHeight * 0.5);
  ctx.scale(zoom, zoom);
  ctx.translate(-viewportWidth * 0.5 - cameraX, -viewportHeight * 0.5 - cameraY);

  const halfWorldW = (viewportWidth * 0.5) / zoom;
  const visStartX = Math.max(0, cameraX + viewportWidth * 0.5 - halfWorldW - 320);
  const visEndX = Math.min(WORLD_WIDTH, cameraX + viewportWidth * 0.5 + halfWorldW + 320);
  const worldBottomY = Math.max(viewportHeight * 4.4, cameraY + viewportHeight + 480);

  // 5. Distant ridges are drawn in screen space before the world transform (see
  //    renderParallaxRidges): they used to be locked to the ground and scrolled 1:1 with it.

  // 6. Physically Contained Water Basins (Zero Water Leak!) + Depth Darkening
  // Both River Pond and Coral Sea share hydrostatic datum 0.56 * viewportHeight and are bounded by raised levees.
  const waterDatumY = 0.56 * viewportHeight;
  const riverZone = HABITAT_ZONES[1];
  const seaZone = HABITAT_ZONES[3];

  // River Pond Water (Strictly bounded inside River Basin levees)
  const rVisStart = Math.max(riverZone.xStart + 24, visStartX);
  const rVisEnd = Math.min(riverZone.xEnd - 24, visEndX);
  if (rVisEnd > rVisStart) {
    // Malaysian lowland rivers are tea-brown/olive (tannins and silt), not swimming-pool cyan
    const riverGrad = ctx.createLinearGradient(0, waterDatumY, 0, viewportHeight * 2.2);
    riverGrad.addColorStop(0, nightFactor > 0.5 ? 'rgba(40, 62, 52, 0.86)' : 'rgba(104, 138, 104, 0.74)');
    riverGrad.addColorStop(0.3, nightFactor > 0.5 ? 'rgba(30, 46, 36, 0.92)' : 'rgba(78, 102, 70, 0.86)');
    riverGrad.addColorStop(0.75, 'rgba(38, 44, 28, 0.95)');
    riverGrad.addColorStop(1, 'rgba(16, 18, 10, 0.99)');
    ctx.fillStyle = riverGrad;
    ctx.fillRect(rVisStart, waterDatumY, rVisEnd - rVisStart, worldBottomY - waterDatumY);

    // Shimmering river surface ripples
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 2.2;
    const rippleStart = Math.ceil((rVisStart + 40) / 90) * 90;
    for (let wx = rippleStart; wx < rVisEnd - 40; wx += 90) {
      const waveOff = Math.sin(elapsedSec * 2.1 + wx * 0.02) * 8;
      ctx.beginPath();
      ctx.moveTo(wx + waveOff, waterDatumY + 3.5);
      ctx.lineTo(wx + 42 + waveOff, waterDatumY + 3.5);
      ctx.stroke();
    }
  }

  // Coral Sea Water (Strictly bounded inside Sea Basin right of Coastal Mud Levee, darkening into the deep pelagic & abyssal trench)
  const sVisStart = Math.max(seaZone.xStart + 24, visStartX);
  const sVisEnd = Math.min(seaZone.xEnd, visEndX);
  if (sVisEnd > sVisStart) {
    const seaGrad = ctx.createLinearGradient(0, waterDatumY, 0, viewportHeight * 3.8);
    seaGrad.addColorStop(0, nightFactor > 0.5 ? 'rgba(3, 105, 161, 0.88)' : 'rgba(56, 189, 248, 0.82)');
    seaGrad.addColorStop(0.22, nightFactor > 0.5 ? 'rgba(7, 89, 133, 0.94)' : 'rgba(2, 132, 199, 0.91)');
    seaGrad.addColorStop(0.48, 'rgba(12, 45, 72, 0.96)');
    seaGrad.addColorStop(0.75, 'rgba(6, 24, 44, 0.985)');
    seaGrad.addColorStop(1, 'rgba(2, 8, 20, 0.998)');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(sVisStart, waterDatumY, sVisEnd - sVisStart, worldBottomY - waterDatumY);

    // Underwater sun-ray caustic shafts near surface & bioluminescent deep plankton in the dark zone
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2.4;
    const waveStart = Math.ceil((sVisStart + 40) / 95) * 95;
    for (let wx = waveStart; wx < sVisEnd - 40; wx += 95) {
      const waveOff = Math.sin(elapsedSec * 2.4 + wx * 0.02) * 10;
      ctx.beginPath();
      ctx.moveTo(wx + waveOff, waterDatumY + 4);
      ctx.lineTo(wx + 48 + waveOff, waterDatumY + 4);
      ctx.stroke();

      // Deep-sea bioluminescent motes: only in the dark deep water beyond the reef drop-off
      if (cameraY > 60 && getWaterDepthNorm(wx) > 0.9) {
        const deepY = waterDatumY + viewportHeight * 0.75 + ((wx * 23) % Math.round(viewportHeight * 2.2));
        const glowA = 0.25 + 0.42 * Math.sin(elapsedSec * 2.6 + wx);
        ctx.fillStyle = `rgba(56, 189, 248, ${glowA})`;
        ctx.beginPath();
        ctx.arc(wx + waveOff * 1.5, deepY, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 7. Sculpted Terrain Cross-Section Contour (Frustum-Culled per Visible Zone Window)
  for (const zone of HABITAT_ZONES) {
    const zStart = Math.max(zone.xStart, visStartX);
    const zEnd = Math.min(zone.xEnd, visEndX);
    if (zEnd <= zStart) continue;

    ctx.save();
    ctx.beginPath();
    ctx.rect(zStart, -viewportHeight * 2, zEnd - zStart, worldBottomY + viewportHeight * 2);
    ctx.clip();

    const step = 20;
    const loopStart = Math.floor((zStart - 20) / step) * step;
    const loopEnd = Math.ceil((zEnd + 20) / step) * step;

    const terrainPath = new Path2D();
    terrainPath.moveTo(loopStart, worldBottomY);
    for (let wx = loopStart; wx <= loopEnd; wx += step) {
      terrainPath.lineTo(wx, getTerrainFloorY(wx, viewportHeight));
    }
    terrainPath.lineTo(loopEnd, worldBottomY);
    terrainPath.closePath();

    const topY = viewportHeight * 0.54;
    const tGrad = ctx.createLinearGradient(0, topY, 0, worldBottomY);
    // Real ground colours: rainforest floor is brown leaf litter and soil under a thin
    // moss/grass layer (it was neon green all the way down), riverbeds are silty, seabeds sandy.
    const dark = (c: string) => lerpColor(c, '#05070d', nightFactor * 0.55);
    if (zone.id === 'forest') {
      tGrad.addColorStop(0, dark('#5e7a3a'));
      tGrad.addColorStop(0.012, dark('#6b5335'));
      tGrad.addColorStop(0.06, dark('#4f3b25'));
      tGrad.addColorStop(0.35, '#2e2116');
      tGrad.addColorStop(1, '#120c07');
    } else if (zone.id === 'river') {
      tGrad.addColorStop(0, dark('#b9a47c'));
      tGrad.addColorStop(0.2, dark('#8a7250'));
      tGrad.addColorStop(0.6, '#4a3a26');
      tGrad.addColorStop(1, '#1d150c');
    } else if (zone.id === 'mud') {
      tGrad.addColorStop(0, dark('#6e5235'));
      tGrad.addColorStop(0.03, dark('#5a3f26'));
      tGrad.addColorStop(0.4, '#382614');
      tGrad.addColorStop(1, '#170d05');
    } else {
      tGrad.addColorStop(0, dark('#e6d8b0'));
      tGrad.addColorStop(0.12, dark('#cdb98d'));
      tGrad.addColorStop(0.45, '#7d6a4b');
      tGrad.addColorStop(1, '#1b1726');
    }
    ctx.fillStyle = tGrad;
    ctx.fill(terrainPath);

    ctx.strokeStyle =
      zone.id === 'forest'
        ? dark('#4d6b2c')
        : zone.id === 'mud'
          ? dark('#3d2a17')
          : zone.id === 'river'
            ? dark('#6f5c3e')
            : dark('#b8a27a');
    ctx.lineWidth = zone.id === 'forest' ? 5 : 3;
    ctx.beginPath();
    for (let wx = loopStart; wx <= loopEnd; wx += step) {
      const ty = getTerrainFloorY(wx, viewportHeight);
      if (wx === loopStart) ctx.moveTo(wx, ty);
      else ctx.lineTo(wx, ty);
    }
    ctx.stroke();

    // 70% Realistic / 30% Cute Rainforest Ground Grass Blades along the Forest Floor (Frustum-Culled & Dynamic)
    if (zone.id === 'forest') {
      const gQuality = state.graphicQuality || 'dynamic';
      const grassStep = gQuality === 'performance' ? 64 : gQuality === 'quality' ? 34 : 46;
      const gStart = Math.max(zone.xStart + 24, Math.floor(zStart / grassStep) * grassStep);
      const gEnd = Math.min(zone.xEnd - 24, Math.ceil(zEnd / grassStep) * grassStep);
      for (let gx = gStart; gx <= gEnd; gx += grassStep) {
        const gy = getTerrainFloorY(gx, viewportHeight) + 2;
        const hSeed = seededHash(gx * 0.13);
        const swayPx = Math.sin(elapsedSec * 2.1 + gx * 0.025) * 4.5;
        drawRealisticGrassBlade(
          ctx,
          gx - 5,
          gy,
          16 + hSeed * 11,
          3.6,
          -4 + swayPx,
          nightFactor > 0.5 ? '#3f5a35' : '#9fb865',
          nightFactor > 0.5 ? '#2c4226' : '#6a8f3c',
          '#3d5a24',
          '#26361a',
        );
        if (gQuality !== 'performance') {
          drawRealisticGrassBlade(
            ctx,
            gx + 4,
            gy + 1,
            19 + (1 - hSeed) * 10,
            3.9,
            4 + swayPx * 1.1,
            nightFactor > 0.5 ? '#4a6640' : '#b5c97a',
            nightFactor > 0.5 ? '#324a2a' : '#7c9c48',
            '#4a6a2c',
            '#26361a',
          );
        }
      }
    } else if (zone.id === 'mud') {
      renderIntertidalMangroveTide(ctx, zStart, zEnd, viewportHeight, elapsedSec, nightFactor);
    }
    ctx.restore();
  }

  // 8. Chunked 20–40% Natural Scenery Elements (Rocks, Logs, Reeds, Coral Bommies)
  renderChunkedNaturalScenery(ctx, cameraX, viewportWidth, viewportHeight, elapsedSec, nightFactor);

  // 8b. Dynamic reef life (large corals, sea stars) and mangrove regeneration (propagule shoots, leaf litter)
  renderDynamicReefAndMangroveLife(ctx, visStartX, visEndX, viewportHeight, elapsedSec, nightFactor);

  // 9. Teleport waypoints are no longer drawn in the world (map + teleport mechanics remain in the HUD map)

  // Highlight valid drop zones during active drag (including shallow-shore restrictions)
  if (activeDrag && (activeDrag.kind === 'asset' || activeDrag.kind === 'reposition_animal')) {
    const meta = ASSET_ECO_CONFIG[activeDrag.id];
    if (meta) {
      for (const zone of HABITAT_ZONES) {
        const zStart = Math.max(zone.xStart, visStartX);
        const zEnd = Math.min(zone.xEnd, visEndX);
        if (zEnd <= zStart) continue;
        const isAllowed = meta.allowedZones.includes(zone.id);
        ctx.save();
        if (!isAllowed) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
          ctx.fillRect(zStart, cameraY, zEnd - zStart, viewportHeight);
        } else {
          const bounds = getAquaticSafeBoundsX(activeDrag.id, zone.id);
          if (bounds.blocksShallowShore) {
            const safeStart = Math.max(zStart, bounds.minX);
            const safeEnd = Math.min(zEnd, bounds.maxX);
            if (safeStart > zStart) {
              ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
              ctx.fillRect(zStart, cameraY, safeStart - zStart, viewportHeight);
            }
            if (safeEnd > safeStart) {
              ctx.fillStyle = 'rgba(95, 160, 56, 0.16)';
              ctx.fillRect(safeStart, cameraY, safeEnd - safeStart, viewportHeight);
            }
            if (zEnd > safeEnd) {
              ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
              ctx.fillRect(safeEnd, cameraY, zEnd - safeEnd, viewportHeight);
            }
          } else {
            ctx.fillStyle = 'rgba(95, 160, 56, 0.16)';
            ctx.fillRect(zStart, cameraY, zEnd - zStart, viewportHeight);
          }
        }
        ctx.restore();
      }
    }
  }

  // Shore Flotsam Shells (Tap to collect bonus Greenbits)
  for (const sh of shoreShells) {
    if (sh.x < visStartX || sh.x > visEndX) continue;
    const shY = getTerrainFloorY(sh.x, viewportHeight) - 8;
    sh.y = shY;
    ctx.save();
    ctx.translate(sh.x, shY);
    const pulse = 1 + Math.sin(elapsedSec * 3.2) * 0.08;
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#fbcfe8';
    ctx.strokeStyle = '#9d174d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 12, Math.PI, 0);
    ctx.lineTo(8, 8);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 10-12. Unified Depth-Sorted Render Queue for Placed Plants, Dropped Foods, and Animals (Resolving Open Item O12)
  // Ensures true 2.5D visual layering: animals standing behind trees render behind them; animals downstage render in front.
  interface DepthRenderEntry {
    depthY: number;
    render: () => void;
  }
  const depthRenderQueue: DepthRenderEntry[] = [];

  // 10. Queue Placed Plants (`P01`–`P30`)
  const windSwayBoost =
    state.currentWeather === 'windy'
      ? 2.2
      : state.currentWeather === 'rain'
        ? 1.6
        : 0.75;

  for (const plant of state.placedPlants) {
    if (plant.x < visStartX - 280 || plant.x > visEndX + 280) continue;
    plant.y = getDefaultPlacementY(plant.assetId, plant.zoneId, plant.x, viewportHeight);

    const windWave =
      Math.sin(elapsedSec * (state.currentWeather === 'windy' ? 3.4 : 1.6) + plant.x * 0.01) *
      0.16 *
      windSwayBoost;
    const pose: TurtlePose = {
      ...STATIC_PLANT_BASE_POSE,
      headRot: windWave + Math.sin(elapsedSec * 12) * plant.swayImpulse * 0.25,
      waveRaysPhase: elapsedSec * (1.2 + windSwayBoost * 0.6),
    };

    const plantSize = ASSET_ECO_CONFIG[plant.assetId]?.visualSize ?? 1;
    const { w: drawW, h: drawH } = getPlantDrawSize(plant);
    const stageScale = (drawW / 210) / plantSize;
    const isFloatingPlant = isFloatingPlantAsset(plant.assetId) && getWaterSurfaceY(plant.x, viewportHeight) !== null;
    const meta = ASSET_ECO_CONFIG[plant.assetId];

    depthRenderQueue.push({
      depthY: plant.y,
      render: () => {
        ctx.save();
        ctx.translate(plant.x - drawW * 0.5, plant.y - drawH * 0.84);
        renderPlantAsset(ctx, plant.assetId, drawW, drawH, pose, elapsedSec, {
          growthStage: plant.growthStage,
          fruitCount: plant.fruitCount,
          skipClear: true,
        });
        ctx.restore();

        // Draw natural soil / sand lip over the bottom root insertion
        if (!isFloatingPlant) {
          const floorY = getTerrainFloorY(plant.x, viewportHeight);
          const lipScale = stageScale * Math.max(0.6, Math.sqrt(plantSize));
          ctx.save();
          ctx.fillStyle =
            plant.zoneId === 'forest'
              ? nightFactor > 0.5
                ? '#3b2c1c'
                : '#5a4229'
              : plant.zoneId === 'mud'
                ? '#5b3a1e'
                : '#b59a6a';
          ctx.strokeStyle =
            plant.zoneId === 'forest' ? '#2a1d10' : plant.zoneId === 'mud' ? '#3a220f' : '#7a6440';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.ellipse(plant.x, floorY + 4, 24 * lipScale, 6.5 * lipScale, 0, Math.PI, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        const hasBuiltInBranchFruit =
          plant.assetId === 'plant_02_tualang_tree' ||
          plant.assetId === 'plant_03_durian_tree' ||
          plant.assetId === 'plant_04_mangosteen_tree' ||
          plant.assetId === 'plant_05_banana_plant' ||
          plant.assetId === 'plant_06_papaya_tree' ||
          plant.assetId === 'plant_13_coconut_palm' ||
          plant.assetId === 'plant_14_banyan_fig' ||
          plant.assetId === 'plant_15_rambutan_tree' ||
          plant.assetId === 'plant_16_sugar_palm' ||
          plant.assetId === 'plant_21_nipa_palm';

        if (meta?.producesFruitId && plant.growthStage >= 3 && plant.fruitCount > 0) {
          if (!hasBuiltInBranchFruit) {
            const growsAtBase =
              meta.producesFruitId === 'food_bamboo_shoots' || meta.producesFruitId === 'food_seaweed_kelp';
            const fruitOffsets: Array<[number, number]> = growsAtBase
              ? [
                [-30 * stageScale * plantSize, -10],
                [28 * stageScale * plantSize, -8],
                [4, -12],
              ]
              : [
                [-26 * stageScale, -drawH * 0.44],
                [24 * stageScale, -drawH * 0.42],
                [0, -drawH * 0.54],
              ];
            for (let i = 0; i < plant.fruitCount; i++) {
              const [ox, oy] = fruitOffsets[i % fruitOffsets.length];
              const bob = growsAtBase ? 0 : Math.sin(elapsedSec * 2.8 + i) * 2.2;
              const isGold = plant.hasGoldenFruit && i === 0;
              drawFoodIcon(
                ctx,
                meta.producesFruitId,
                plant.x + ox + (growsAtBase ? 0 : windWave * 24),
                plant.y + oy + bob,
                13,
                isGold,
              );
            }
          } else if (plant.hasGoldenFruit) {
            ctx.save();
            const g = ctx.createRadialGradient(
              plant.x,
              plant.y - drawH * 0.48,
              6,
              plant.x,
              plant.y - drawH * 0.48,
              44,
            );
            g.addColorStop(0, 'rgba(250, 204, 21, 0.48)');
            g.addColorStop(1, 'rgba(250, 204, 21, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(plant.x, plant.y - drawH * 0.48, 44, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      },
    });
  }

  // 11. Queue Dropped Foods / Plucked Fruits
  for (const food of state.droppedFoods) {
    if (food.x < visStartX - 80 || food.x > visEndX + 80) continue;
    const bob =
      food.zoneId === 'sea' || food.zoneId === 'river'
        ? Math.sin(elapsedSec * 2.5 + food.x) * 4
        : 0;
    depthRenderQueue.push({
      depthY: food.y + bob,
      render: () => {
        drawFoodIcon(ctx, food.foodId, food.x, food.y + bob, 16, food.isGolden);
      },
    });
  }

  // 12. Queue Placed Animals (`A01`–`A41`)
  for (const animal of state.placedAnimals) {
    if (animal.x < visStartX - 240 || animal.x > visEndX + 240) continue;
    const meta = ASSET_ECO_CONFIG[animal.assetId];
    const isEmotingNow = animal.emotionTimerSec > 0;
    const locoBlend = animal.locoBlend ?? (isEmotingNow ? 0 : 1);
    const sleepingNow = isAnimalResting(animal.assetId, state.timeOfDayHours);
    const worldScale = getAnimalWorldScale(animal.assetId);
    const bodySize = getAnimalVisualSize(animal.assetId);
    const inWater =
      (animal.zoneId === 'sea' || animal.zoneId === 'river') &&
      getWaterSurfaceY(animal.x, viewportHeight) !== null;
    const isBenthic = meta?.canopyHabit === 'benthic';
    const isSessile = (meta?.moveSpeedFactor ?? 1) === 0;
    const isCanopyHabit = meta?.canopyHabit === 'canopy' && !inWater;
    const isSeaTurtleAsset =
      animal.assetId.startsWith('animal_28_green_sea_turtle') ||
      animal.assetId === 'animal_29_hawksbill_sea_turtle';

    const restY = getAnimalRestY(animal, state.placedPlants, viewportHeight);
    const prevRest = animalRestYCache.get(animal.uid);
    const diff = Math.abs((prevRest ?? restY) - restY);
    const climbStep = isCanopyHabit ? 145 * worldFrameDt : 320 * worldFrameDt;
    const snapThreshold = isCanopyHabit ? 380 : 24;
    const easedRest =
      prevRest === undefined || diff > snapThreshold || animal.fallImpactSec
        ? restY
        : prevRest + clamp(restY - prevRest, -climbStep, climbStep);
    animalRestYCache.set(animal.uid, easedRest);

    const perchTree = isCanopyHabit
      ? findPerchTree(animal, state.placedPlants, 32)
      : null;
    const groundRefY = getDefaultPlacementY(animal.assetId, animal.zoneId, animal.x, viewportHeight);
    const isOnTreeTrunkOrCrown = Boolean(perchTree && easedRest < groundRefY - 10);
    const isClimbingNow = Boolean(
      animal.isClimbing ||
        (isOnTreeTrunkOrCrown && (Math.abs(easedRest - restY) > 2.5 || locoBlend > 0.15)),
    );

    const swimBob =
      inWater && !isBenthic && !isSessile && !isSeaTurtleAsset
        ? Math.sin(elapsedSec * 1.8 + animal.x * 0.02) * 8 * Math.min(1.4, worldScale) * (0.3 + 0.7 * locoBlend)
        : 0;
    if (!animal.isFalling) {
      animal.y = easedRest + swimBob;
    }

    let rig = rigCache.get(animal.uid);
    if (!rig) {
      rig = new TurtleRigController();
      rigCache.set(animal.uid, rig);
    }

    let targetEmotion: EmotionType = 'normal';
    if (animal.emotionTimerSec > 0) {
      targetEmotion = animal.currentEmotion;
    } else if (animal.hunger <= 22) {
      targetEmotion = 'crying';
    } else if (sleepingNow) {
      targetEmotion = 'sleepy';
    }

    rig.setEmotion(targetEmotion);
    rig.setFacing(animal.facing);
    rig.update(worldFrameDt, 1.0);

    const chewMouth =
      animal.eatingStage === 'pickup'
        ? 0.85
        : animal.eatingStage === 'chew'
          ? 0.25 + Math.abs(Math.sin(elapsedSec * 14)) * 0.65
          : animal.eatingStage === 'swallow'
            ? 0.1
            : rig.pose.mouthOpen;

    const chewScaleY =
      animal.eatingStage === 'chew'
        ? 1 + Math.sin(elapsedSec * 14) * 0.02
        : animal.eatingStage === 'swallow'
          ? 1.02
          : rig.pose.headScaleY;

    const pose: TurtlePose = {
      ...rig.pose,
      blinkAmount: Math.max(rig.pose.blinkAmount, animal.blinkActiveSec > 0 ? 0.96 : 0),
      mouthOpen: chewMouth,
      mouthSmile: animal.eatingStage !== 'none' ? 0.85 : rig.pose.mouthSmile,
      blushAlpha: animal.eatingStage !== 'none' ? 0.65 : rig.pose.blushAlpha,
      headScaleY: chewScaleY,
      questionMarkAlpha: rig.pose.questionMarkAlpha,
      laughMarksAlpha: rig.pose.laughMarksAlpha,
      angryVeinAlpha: rig.pose.angryVeinAlpha,
    };

    const drawW = 220 * worldScale;
    const drawH = 200 * worldScale;

    // Depth computation for proper 2.5D visual layering
    let depthY: number;
    if (perchTree && isOnTreeTrunkOrCrown) {
      // Climbing or perched in tree branches: render immediately in front of that tree trunk
      depthY = perchTree.y + 0.5;
    } else if (inWater) {
      depthY = animal.y;
    } else {
      depthY = animal.y + getAnimalGroundContactOffset(animal.assetId, false);
    }

    depthRenderQueue.push({
      depthY,
      render: () => {
        if (selectedAnimalUid === animal.uid) {
          const ringY = inWater ? animal.y + 34 * bodySize : animal.y + getAnimalGroundContactOffset(animal.assetId, false);
          ctx.save();
          ctx.strokeStyle = 'rgba(174, 246, 130, 0.92)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(animal.x, ringY, Math.max(30, 68 * bodySize), Math.max(10, 22 * bodySize), 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        const fallbackTears: TearDrop[] =
          targetEmotion === 'crying'
            ? [
              {
                id: 1,
                side: 'left',
                x: -64,
                y: 120 + ((elapsedSec * 90) % 65),
                vx: -8,
                vy: 85,
                radius: 11,
                alpha: 0.9,
              },
              {
                id: 2,
                side: 'right',
                x: 112,
                y: 132 + ((elapsedSec * 90 + 30) % 65),
                vx: 8,
                vy: 85,
                radius: 11,
                alpha: 0.9,
              },
            ]
            : [];
        const activeTears = rig.tearDrops.length > 0 ? rig.tearDrops : fallbackTears;

        ctx.save();
        ctx.translate(animal.x - drawW * 0.5, animal.y - drawH * 0.56);
        if (animal.fallImpactSec && animal.fallImpactSec > 0 && !inWater) {
          const progress = animal.fallImpactSec / 0.35;
          const squash = Math.sin(progress * Math.PI) * 0.06;
          const sy = 1 - squash;
          ctx.translate(drawW * 0.5, drawH * 0.56);
          ctx.scale(1 / sy, sy);
          ctx.translate(-drawW * 0.5, -drawH * 0.56);
        }
        renderAnimalAsset(ctx, animal.assetId, drawW, drawH, pose, activeTears, elapsedSec, {
          skipClear: true,
          locoBlend: isSessile ? 0 : locoBlend,
          swimming: inWater && isLandStandingAnimal(animal.assetId),
          climbing: isClimbingNow,
        });
        ctx.restore();

        // Baby companion
        const loveLv = computeAnimalLoveLevel(animal);
        if (loveLv >= 5 && animal.showBabyCompanion) {
          const babyW = drawW * 0.52;
          const babyH = drawH * 0.52;
          ctx.save();
          const parentContact = inWater ? 0 : getAnimalGroundContactOffset(animal.assetId, false);
          ctx.translate(
            animal.x - animal.facing * 76 * bodySize - babyW * 0.5,
            animal.y + parentContact * 0.48 - babyH * 0.56,
          );
          renderAnimalAsset(ctx, animal.assetId, babyW, babyH, pose, [], elapsedSec, {
            skipClear: true,
            locoBlend: isSessile ? 0 : locoBlend,
            swimming: inWater && isLandStandingAnimal(animal.assetId),
            climbing: isClimbingNow,
          });
          ctx.restore();
        }

        // 3-Stage Eating Animation Visuals
        if (animal.eatingStage !== 'none' && animal.eatingFoodId) {
          const mouthWorldX = animal.x + animal.facing * 46 * bodySize;
          const mouthWorldY = animal.y - 8 * bodySize;
          if (animal.eatingStage === 'pickup') {
            const liftT = Math.min(1, (1.8 - animal.eatingTimerSec) / 0.5);
            drawFoodIcon(
              ctx,
              animal.eatingFoodId,
              mouthWorldX + animal.facing * (1 - liftT) * 24,
              mouthWorldY + (1 - liftT) * 28,
              15,
            );
          } else if (animal.eatingStage === 'chew') {
            const shrink = 0.55 + Math.sin(elapsedSec * 16) * 0.15;
            drawFoodIcon(ctx, animal.eatingFoodId, mouthWorldX, mouthWorldY, 14 * shrink);
            ctx.fillStyle = '#fde047';
            for (let c = 0; c < 3; c++) {
              const ang = elapsedSec * 6 + c * 2.1;
              ctx.beginPath();
              ctx.arc(
                mouthWorldX + Math.cos(ang) * 18,
                mouthWorldY + Math.sin(ang) * 14,
                3.2,
                0,
                Math.PI * 2,
              );
              ctx.fill();
            }
          } else if (animal.eatingStage === 'swallow') {
            ctx.fillStyle = '#f43f5e';
            ctx.font = '700 15px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Full +', animal.x, animal.y - 74 * Math.max(0.6, bodySize));
          }
        }

        // Hungry Crying Thought Bubble
        if (animal.hunger <= 22 && animal.eatingStage === 'none') {
          const desiredFood = meta?.favoriteFoodId ?? 'food_banana_bunch';
          const bx = animal.x + animal.facing * 42 * Math.max(0.6, bodySize);
          const by = animal.y - 84 * Math.max(0.6, bodySize) + Math.sin(elapsedSec * 3.5) * 4;
          ctx.save();
          ctx.fillStyle = '#fafaed';
          ctx.strokeStyle = '#15432a';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(bx, by, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          drawFoodIcon(ctx, desiredFood, bx, by, 11);
          ctx.restore();
        }

        // Clean Name Tag
        if (selectedAnimalUid === animal.uid) {
          const label = animal.customName || meta?.name || 'Animal';
          ctx.save();
          ctx.font = '700 12px "Outfit", sans-serif';
          const tw = Math.max(46, ctx.measureText(label).width + 24);
          const tagY = inWater
            ? animal.y + 52 * Math.max(0.6, bodySize)
            : animal.y + getAnimalGroundContactOffset(animal.assetId, false) + 14;
          ctx.fillStyle = '#002c17';
          drawRoundedRect(ctx, animal.x - tw * 0.5, tagY, tw, 24, 12);
          ctx.fill();
          ctx.fillStyle = '#fafaed';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, animal.x, tagY + 12);
          ctx.restore();
        }
      },
    });
  }

  // Execute Depth-Sorted Render Queue (Lowest Depth Y / Furthest Upstage first)
  depthRenderQueue.sort((a, b) => a.depthY - b.depthY);
  for (const item of depthRenderQueue) {
    item.render();
  }

  // 13. Floating Greenbits Coins in World Space (Logo + amount, no "GB" text)
  for (const coin of floatingCoins) {
    if (coin.collected) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, coin.alpha));
    ctx.translate(coin.x, coin.y);
    drawVectorGreenbitsCoin(ctx, 16);
    ctx.fillStyle = '#fafaed';
    ctx.strokeStyle = '#002c17';
    ctx.lineWidth = 3;
    ctx.font = '800 14px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.strokeText(`+${coin.amount}`, 18, 4);
    ctx.fillText(`+${coin.amount}`, 18, 4);
    ctx.restore();
  }

  // Nighttime fireflies: over land, banks and mangroves only (never over open sea or underwater),
  // hovering in the undergrowth above the ground
  if (nightFactor > 0.45 && state.currentWeather !== 'rain') {
    ctx.save();
    for (let f = 0; f < 22; f++) {
      const fx = visStartX + ((f * 137 + Math.sin(elapsedSec * 0.8 + f) * 45) % Math.max(200, visEndX - visStartX));
      if (fx >= HABITAT_ZONES[3].xStart) continue;
      const fWater = getWaterSurfaceY(fx, viewportHeight);
      const fGround = fWater ?? getTerrainFloorY(fx, viewportHeight);
      const fy = fGround - 50 - ((f * 37) % 90) + Math.cos(elapsedSec * 1.3 + f * 1.7) * 22;
      const glowA = (0.35 + Math.sin(elapsedSec * 3.8 + f * 2) * 0.35) * nightFactor;
      ctx.fillStyle = `rgba(174, 246, 130, ${Math.max(0, glowA)})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore(); // Exit World Space camera translation

  // 14. Depth Darkness Vignette when diving deep into sea or river trenches
  if (depthDarkness > 0.04) {
    ctx.save();
    const abyssGrad = ctx.createLinearGradient(0, 0, 0, viewportHeight);
    abyssGrad.addColorStop(0, `rgba(2, 10, 24, ${depthDarkness * 0.55})`);
    abyssGrad.addColorStop(1, `rgba(1, 6, 16, ${depthDarkness * 0.88})`);
    ctx.fillStyle = abyssGrad;
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);
    ctx.restore();
  }

  // 15. Screen-Space Realistic Weather Overlay (Multi-layer Rain + Splash Rings, Wind, Fog)
  // Strictly clipped to the air above the water surface and ground contour across all screen X!
  renderWeatherScreenOverlay(
    ctx,
    viewportWidth,
    viewportHeight,
    state.currentWeather,
    elapsedSec,
    cameraX,
    cameraY,
    zoom,
  );

  // 16. Wrong-Zone Rejection Snap-Back Animations (Renders the actual Asset Icon inside the disallowed circle!)
  for (const rej of rejectedDrops) {
    const t = rej.progress;
    const curX = rej.startX + (rej.targetBarX - rej.startX) * t;
    const arcLift = Math.sin(t * Math.PI) * -120;
    const curY = rej.startY + (rej.targetBarY - rej.startY) * t + arcLift;
    const shakeX = Math.sin(t * Math.PI * 10) * 14 * (1 - t);

    ctx.save();
    ctx.translate(curX + shakeX, curY);
    const scale = 1 - t * 0.35;
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(186, 26, 26, 0.28)';
    ctx.strokeStyle = '#ba1a1a';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Render the actual rejected animal or plant asset inside the circle so it is clearly visible!
    let previewRig = rigCache.get(`rej_${rej.assetId}`);
    if (!previewRig) {
      previewRig = new TurtleRigController();
      rigCache.set(`rej_${rej.assetId}`, previewRig);
    }
    ctx.save();
    ctx.translate(-42, -40);
    if (rej.assetId.startsWith('animal_')) {
      renderAnimalAsset(ctx, rej.assetId, 84, 80, previewRig.pose, [], elapsedSec, {
        skipClear: true,
        locoBlend: 0,
      });
    } else {
      renderPlantAsset(ctx, rej.assetId, 84, 80, previewRig.pose, elapsedSec, {
        growthStage: 2,
        fruitCount: 1,
        skipClear: true,
      });
    }
    ctx.restore();

    ctx.fillStyle = '#fafaed';
    ctx.strokeStyle = '#410002';
    ctx.lineWidth = 3;
    ctx.font = '700 13px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText(rej.reason, 0, -56);
    ctx.fillText(rej.reason, 0, -56);
    ctx.restore();
  }

  // 17. Active Drag Preview Ghost under finger/cursor
  if (activeDrag) {
    ctx.save();
    ctx.translate(activeDrag.screenX, activeDrag.screenY);
    if (activeDrag.kind === 'food') {
      drawFoodIcon(ctx, activeDrag.id, 0, 0, 22);
    } else {
      ctx.fillStyle = 'rgba(174, 246, 130, 0.25)';
      ctx.strokeStyle = '#15432a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      let dragRig = rigCache.get(`drag_${activeDrag.id}`);
      if (!dragRig) {
        dragRig = new TurtleRigController();
        rigCache.set(`drag_${activeDrag.id}`, dragRig);
      }
      ctx.save();
      ctx.translate(-42, -40);
      if (activeDrag.id.startsWith('animal_')) {
        renderAnimalAsset(ctx, activeDrag.id, 84, 80, dragRig.pose, [], elapsedSec, {
          skipClear: true,
          locoBlend: 0,
        });
      } else {
        renderPlantAsset(ctx, activeDrag.id, 84, 80, dragRig.pose, elapsedSec, {
          growthStage: 2,
          fruitCount: 1,
          skipClear: true,
        });
      }
      ctx.restore();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Three distant ridge bands behind the land zones. Each band scrolls at a fraction of the
 * camera speed (parallax) and is tinted towards the sky colour with distance (aerial
 * perspective). The bands fade out over the open sea where there is no land behind.
 */
function renderParallaxRidges(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cameraX: number,
  cameraY: number,
  zoom: number,
  nightFactor: number,
  sunsetFactor: number,
): void {
  const mudEndX = HABITAT_ZONES[2].xEnd;
  const seaLevelWorldY = 0.56 * h;
  const horizon = (seaLevelWorldY - h * 0.5 - cameraY) * zoom + h * 0.5;
  if (horizon < -40) return;
  const layers = [
    { par: 0.08, height: 150, freq: 0.0021, day: '#a9c7c4', night: '#18233a', dusk: '#c9a2a8' },
    { par: 0.16, height: 110, freq: 0.0034, day: '#86ad9c', night: '#142033', dusk: '#a88a86' },
    { par: 0.28, height: 72, freq: 0.0052, day: '#5f8c6c', night: '#101b2a', dusk: '#7f6d5e' },
  ];
  for (const layer of layers) {
    let col = lerpColor(layer.day, layer.night, nightFactor);
    if (sunsetFactor > 0.05) col = lerpColor(col, layer.dusk, sunsetFactor * 0.5);
    ctx.fillStyle = col;
    ctx.beginPath();
    // Base sits exactly on the horizon so the ridges never show through translucent water
    ctx.moveTo(0, horizon + 1);
    let any = false;
    for (let sx = 0; sx <= w + 24; sx += 36) {
      const worldX = cameraX + w * 0.5 + (sx - w * 0.5) / zoom;
      const fade = clamp((mudEndX - worldX) / 7000, 0, 1);
      if (fade > 0) any = true;
      const px = cameraX * layer.par + sx;
      const ridge =
        0.62 +
        Math.sin(px * layer.freq) * 0.22 +
        Math.sin(px * layer.freq * 2.7 + 1.3) * 0.11 +
        Math.sin(px * layer.freq * 6.1 + 0.4) * 0.05;
      const scaleH = layer.height * (0.65 + 0.35 * Math.min(1.6, zoom));
      ctx.lineTo(sx, horizon - fade * ridge * scaleH);
    }
    ctx.lineTo(w + 24, horizon + 1);
    ctx.closePath();
    if (any) ctx.fill();
  }
}

function renderWeatherScreenOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  weather: WeatherType,
  elapsedSec: number,
  cameraX: number,
  cameraY: number,
  zoom: number,
): void {
  if (weather === 'sunny' || weather === 'cloudy' || weather === 'rainbow') return;

  const waterDatumWorldY = 0.56 * h;
  const seaLevelScreenY = (waterDatumWorldY - h * 0.5 - cameraY) * zoom + h * 0.5;

  // Helper: exact screen-space Y of the water surface or ground contour at screen X.
  // Crucially, surfaceWorldY is clamped to Math.min(waterDatumWorldY, floorWorldY) so rain
  // NEVER crosses below the hydrostatic water surface plane (0.56 * h) anywhere in the world!
  const getSurfaceInfoAtScreenX = (sx: number): { screenY: number; isWater: boolean } => {
    const worldX = cameraX + w * 0.5 + (sx - w * 0.5) / zoom;
    const waterWorldY = getWaterSurfaceY(worldX, h);
    const inRiverOrSeaBasin =
      (worldX >= HABITAT_ZONES[1].xStart && worldX <= HABITAT_ZONES[1].xEnd) ||
      worldX >= HABITAT_ZONES[3].xStart;
    const floorWorldY = getTerrainFloorY(worldX, h);
    const isWater = waterWorldY !== null || inRiverOrSeaBasin || floorWorldY > waterDatumWorldY;
    const surfaceWorldY = Math.min(waterDatumWorldY, floorWorldY);
    const screenY = (surfaceWorldY - h * 0.5 - cameraY) * zoom + h * 0.5;
    return { screenY, isWater };
  };

  // Sample across screen columns to build the exact Air-Above-Surface clipping polygon
  let maxAirBottomY = -9999;
  const stepX = 32;
  const samples: Array<{ sx: number; screenY: number; isWater: boolean }> = [];
  for (let sx = 0; sx <= w + stepX; sx += stepX) {
    const clampedSx = Math.min(w, sx);
    const info = getSurfaceInfoAtScreenX(clampedSx);
    samples.push({ sx: clampedSx, ...info });
    if (info.screenY > maxAirBottomY) maxAirBottomY = info.screenY;
    if (clampedSx === w) break;
  }

  // If the camera is deep underwater (water surface is above top of screen), zero weather is visible!
  if (maxAirBottomY <= 2) {
    return;
  }

  // When diving underwater (cameraY > 35), airborne rain streaks fade out rapidly so that
  // underwater you only see the raindrop impact ripples on the surface above you!
  const airStreakVisibility = clamp(1 - (cameraY - 35) / 75, 0, 1);

  ctx.save();
  // Clip strictly to the air column above the water surface / ground contour
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  for (let i = samples.length - 1; i >= 0; i--) {
    ctx.lineTo(samples[i].sx, Math.min(h, samples[i].screenY + 2));
  }
  ctx.closePath();
  ctx.clip();

  if (weather === 'windy') {
    if (airStreakVisibility > 0.02) {
      ctx.lineCap = 'round';
      for (let i = 0; i < 18; i++) {
        const depth = (i % 3) / 2;
        const spd = 340 + depth * 220;
        const wx = ((elapsedSec * spd + i * 197) % (w + 320)) - 160;
        const wy = ((i * 67) % Math.max(80, Math.min(h * 0.72, maxAirBottomY - 24))) + 24;
        const len = 85 + depth * 65;
        const wGrad = ctx.createLinearGradient(wx, wy, wx + len, wy);
        wGrad.addColorStop(0, 'rgba(248, 250, 252, 0)');
        wGrad.addColorStop(0.35, `rgba(241, 245, 249, ${(0.14 + depth * 0.14) * airStreakVisibility})`);
        wGrad.addColorStop(0.7, `rgba(255, 255, 255, ${(0.22 + depth * 0.16) * airStreakVisibility})`);
        wGrad.addColorStop(1, 'rgba(248, 250, 252, 0)');
        ctx.strokeStyle = wGrad;
        ctx.lineWidth = 1.1 + depth * 0.9;
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.bezierCurveTo(
          wx + len * 0.35,
          wy - 8 - (i % 2) * 5,
          wx + len * 0.7,
          wy + 7 + (i % 2) * 4,
          wx + len,
          wy - 2,
        );
        ctx.stroke();
      }
    }
  } else if (weather === 'rain') {
    const clipBottomY = Math.min(h, maxAirBottomY);

    if (airStreakVisibility > 0.02) {
      // 1. Atmospheric rain-curtain mist & slanting precipitation shafts in the sky
      const curtainGrad = ctx.createLinearGradient(0, 0, 0, clipBottomY);
      curtainGrad.addColorStop(0, `rgba(148, 163, 184, ${0.15 * airStreakVisibility})`);
      curtainGrad.addColorStop(0.65, `rgba(186, 230, 253, ${0.07 * airStreakVisibility})`);
      curtainGrad.addColorStop(1, `rgba(224, 242, 254, ${0.14 * airStreakVisibility})`);
      ctx.fillStyle = curtainGrad;
      ctx.fillRect(0, 0, w, clipBottomY);

      ctx.lineCap = 'round';
      const windTilt = -0.18 + Math.sin(elapsedSec * 0.75) * 0.02;

      // 2. 4 Depth Planes of 100% Realistic Tapered Optical Raindrop Needles
      // Uses non-periodic hash distribution + 3-stage tapered alpha-gradient segments
      // (feathered upper tail -> translucent mid -> crisp glistening lower meniscus tip)
      const layers = [
        { id: 1, count: 56, speedY: 760, speedX: -138, len: 24, width: 0.65, alpha: 0.24 },
        { id: 2, count: 46, speedY: 980, speedX: -176, len: 34, width: 0.88, alpha: 0.38 },
        { id: 3, count: 34, speedY: 1220, speedX: -220, len: 46, width: 1.12, alpha: 0.52 },
        { id: 4, count: 20, speedY: 1480, speedX: -268, len: 58, width: 1.35, alpha: 0.68 },
      ];

      const spanW = w + 180;
      const spanH = Math.max(160, clipBottomY + 90);

      for (const layer of layers) {
        const effAlpha = layer.alpha * airStreakVisibility;

        // Pass A: Feathered upper-to-mid motion trail (top 100% of streak, slender & faint)
        ctx.strokeStyle = `rgba(203, 232, 252, ${effAlpha * 0.36})`;
        ctx.lineWidth = layer.width * 0.62;
        ctx.beginPath();
        for (let i = 0; i < layer.count; i++) {
          const h1 = seededHash(i * 19.37 + layer.id * 71.3);
          const h2 = seededHash(i * 43.11 + layer.id * 113.7);
          const h3 = seededHash(i * 79.23 + layer.id * 37.9);
          const dLen = layer.len * (0.78 + h3 * 0.44);
          const spdMul = 0.9 + h3 * 0.2;
          const rx = (((h1 * spanW + elapsedSec * layer.speedX * spdMul) % spanW) + spanW) % spanW - 90;
          const ry = (((h2 * spanH + elapsedSec * layer.speedY * spdMul) % spanH) + spanH) % spanH - 60;
          const dx = dLen * windTilt;
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx + dx, ry + dLen);
        }
        ctx.stroke();

        // Pass B: Translucent mid-to-lower body (bottom 58% of streak)
        ctx.strokeStyle = `rgba(224, 242, 254, ${effAlpha * 0.68})`;
        ctx.lineWidth = layer.width * 0.85;
        ctx.beginPath();
        for (let i = 0; i < layer.count; i++) {
          const h1 = seededHash(i * 19.37 + layer.id * 71.3);
          const h2 = seededHash(i * 43.11 + layer.id * 113.7);
          const h3 = seededHash(i * 79.23 + layer.id * 37.9);
          const dLen = layer.len * (0.78 + h3 * 0.44);
          const spdMul = 0.9 + h3 * 0.2;
          const rx = (((h1 * spanW + elapsedSec * layer.speedX * spdMul) % spanW) + spanW) % spanW - 90;
          const ry = (((h2 * spanH + elapsedSec * layer.speedY * spdMul) % spanH) + spanH) % spanH - 60;
          const dx = dLen * windTilt;
          ctx.moveTo(rx + dx * 0.42, ry + dLen * 0.42);
          ctx.lineTo(rx + dx, ry + dLen);
        }
        ctx.stroke();

        // Pass C: Bright specular droplet tip (bottom 22% of streak)
        ctx.strokeStyle = `rgba(248, 250, 252, ${Math.min(0.95, effAlpha * 1.12)})`;
        ctx.lineWidth = layer.width;
        ctx.beginPath();
        for (let i = 0; i < layer.count; i++) {
          const h1 = seededHash(i * 19.37 + layer.id * 71.3);
          const h2 = seededHash(i * 43.11 + layer.id * 113.7);
          const h3 = seededHash(i * 79.23 + layer.id * 37.9);
          const dLen = layer.len * (0.78 + h3 * 0.44);
          const spdMul = 0.9 + h3 * 0.2;
          const rx = (((h1 * spanW + elapsedSec * layer.speedX * spdMul) % spanW) + spanW) % spanW - 90;
          const ry = (((h2 * spanH + elapsedSec * layer.speedY * spdMul) % spanH) + spanH) % spanH - 60;
          const dx = dLen * windTilt;
          ctx.moveTo(rx + dx * 0.78, ry + dLen * 0.78);
          ctx.lineTo(rx + dx, ry + dLen);
        }
        ctx.stroke();
      }
    }
  } else if (weather === 'fog') {
    if (airStreakVisibility > 0.02) {
      for (let band = 0; band < 4; band++) {
        const by = Math.min(maxAirBottomY - 25, h * (0.24 + band * 0.16));
        if (by < -40) continue;
        const driftX = Math.sin(elapsedSec * 0.35 + band * 1.4) * 45;
        const mistGrad = ctx.createLinearGradient(0, by - 65, 0, by + 65);
        mistGrad.addColorStop(0, 'rgba(241, 245, 249, 0)');
        mistGrad.addColorStop(0.5, `rgba(241, 245, 249, ${0.32 * airStreakVisibility})`);
        mistGrad.addColorStop(1, 'rgba(241, 245, 249, 0)');
        ctx.fillStyle = mistGrad;
        ctx.fillRect(-60 + driftX, by - 65, w + 120, 130);
      }
    }
  }

  ctx.restore();

  // 3. Water-Surface & Ground Rain Impacts (drawn right on the water surface meniscus / ground contour!)
  // Visible whenever the surface line is on screen (0 < sy < h), even when looking at the surface from shallow water!
  if (weather === 'rain' && seaLevelScreenY > -12 && seaLevelScreenY < h + 12) {
    ctx.save();
    for (let s = 0; s < 26; s++) {
      const cycle = elapsedSec * 2.4 + s * 0.37;
      const phase = cycle % 1;
      const pulseIdx = Math.floor(cycle);
      const sx = 16 + seededHash(s * 97.3 + pulseIdx * 31.7) * Math.max(60, w - 32);
      const surf = getSurfaceInfoAtScreenX(sx);
      const sy = surf.screenY + (surf.isWater ? (seededHash(s * 13.1) - 0.5) * 3 : (seededHash(s * 17.9) - 0.5) * 6);
      if (sy < 2 || sy > h - 2) continue;

      const fade = (1 - phase) * (1 - phase * 0.35);
      const rx = (surf.isWater ? 4.5 : 3.0) + phase * (surf.isWater ? 20 : 11);
      const ry = rx * (surf.isWater ? 0.22 : 0.26);

      // Outer expanding capillary wave ring
      ctx.strokeStyle = `rgba(224, 242, 254, ${(surf.isWater ? 0.64 : 0.44) * fade})`;
      ctx.lineWidth = surf.isWater ? 1.35 : 1.05;
      ctx.beginPath();
      ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Secondary inner concentric ripple on water surface
      if (surf.isWater && phase > 0.16) {
        const innerRx = rx * 0.52;
        const innerRy = ry * 0.52;
        ctx.strokeStyle = `rgba(248, 250, 252, ${0.46 * fade})`;
        ctx.lineWidth = 0.95;
        ctx.beginPath();
        ctx.ellipse(sx, sy, innerRx, innerRy, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Upward rebounding Worthington crown splash jet & micro-droplets at impact start
      if (phase < 0.34) {
        const crownT = phase / 0.34;
        const lift = Math.sin(crownT * Math.PI) * (surf.isWater ? 9.0 : 5.5);
        const spread = crownT * (surf.isWater ? 7.0 : 4.5);
        ctx.fillStyle = `rgba(248, 250, 252, ${0.82 * (1 - crownT)})`;
        ctx.beginPath();
        ctx.arc(sx - spread, sy - lift * 0.85, 1.15, 0, Math.PI * 2);
        ctx.arc(sx, sy - lift * 1.25, 1.35, 0, Math.PI * 2);
        ctx.arc(sx + spread, sy - lift * 0.85, 1.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

export function getDefaultPlacementY(
  assetId: string,
  zoneId: HabitatZoneId,
  worldX: number,
  canvasHeight: number,
): number {
  const floorY = getTerrainFloorY(worldX, canvasHeight);
  const waterY = getWaterSurfaceY(worldX, canvasHeight);
  const meta = ASSET_ECO_CONFIG[assetId];

  if (!meta) return floorY - 24;

  if (meta.kind === 'plant') {
    // Floating plants (lotus, lilies, hyacinth, duckweed, kangkung) sit at the water surface
    if (isFloatingPlantAsset(assetId) && waterY !== null) return waterY + 12;
    return floorY + 8;
  }

  const w = getAnimalWorldScale(assetId);
  const inWater = (zoneId === 'sea' || zoneId === 'river') && waterY !== null;

  if (inWater) {
    if (meta.canopyHabit === 'benthic') {
      // Bottom dwellers rest on the seabed / riverbed
      return floorY + 4 - getAnimalGroundContactOffset(assetId, true);
    }
    if (isLandStandingAnimal(assetId)) {
      // Semi-aquatic walkers (otter, terrapin, monitor, tapir) swim at the surface to breathe
      return waterY + 30 * w;
    }
    // Swimmers stay inside the water column: never poking out of the surface or into the seabed
    const top = waterY + 62 * w;
    const bottom = floorY - 58 * w;
    const mid = waterY + (floorY - waterY) * 0.48;
    return bottom > top ? clamp(mid, top, bottom) : (waterY + floorY) * 0.5;
  }

  // Land: put the feet (contact shadow) on the same ground line for every species and size
  return floorY + 22 - getAnimalGroundContactOffset(assetId, false);
}

/** Internal framing multiplier of the Green Sea Turtle reference inside its box. */
const TURTLE_REFERENCE_FRAMING = 1.12;

/**
 * Multiplier for the 220 x 200 world drawing box of an animal, so that its body appears at
 * `visualSize` relative to the Green Sea Turtle. Thumbnails and store cards are not affected.
 */
export function getAnimalWorldScale(assetId: string): number {
  const size = ASSET_ECO_CONFIG[assetId]?.visualSize ?? 1;
  if (assetId.startsWith('animal_28_green_sea_turtle')) return size;
  return (size * TURTLE_REFERENCE_FRAMING) / getSpeciesFramingScale(assetId);
}

/** Body size relative to the Green Sea Turtle, for hit areas, labels and bubbles. */
export function getAnimalVisualSize(assetId: string): number {
  return ASSET_ECO_CONFIG[assetId]?.visualSize ?? 1;
}

/**
 * Distance from an animal's anchor (animal.y) down to where its feet or belly touch the
 * ground, for its world scale. Derived from the drawing box: the box centre sits 0.06 box
 * heights above the anchor and the contact shadow sits 186 (walkers) units below the
 * centre in the 650-unit rig frame.
 */
export function getAnimalGroundContactOffset(assetId: string, benthic: boolean): number {
  const w = getAnimalWorldScale(assetId);
  const rigScale = (Math.min(220 * w, 200 * w * 1.08) / 650) * getSpeciesFramingScale(assetId);
  const contactLocal = benthic ? 205 : 186;
  return -0.06 * 200 * w + contactLocal * rigScale;
}

/** World drawing box of a plant (growth stage and species height applied). */
export function getPlantDrawSize(plant: Pick<PlacedPlant, 'assetId' | 'growthStage'>): { w: number; h: number } {
  const stageScale = plant.growthStage === 1 ? 0.68 : plant.growthStage === 2 ? 0.88 : 1.04;
  const size = ASSET_ECO_CONFIG[plant.assetId]?.visualSize ?? 1;
  return { w: 210 * stageScale * size, h: 195 * stageScale * size };
}

/**
 * The tree a canopy animal (orangutan, sun bear, pangolin, macaque, langur, python, monitor, squirrel, panda, hornbill...)
 * is currently climbing or perched in, or null when there is no tree nearby.
 */
export function findPerchTree(
  animal: Pick<PlacedAnimal, 'x' | 'zoneId'>,
  plants: PlacedPlant[],
  extraReach = 0,
): PlacedPlant | null {
  let best: PlacedPlant | null = null;
  let bestDx = Infinity;
  for (const p of plants) {
    if (p.zoneId !== animal.zoneId) continue;
    if (!ASSET_ECO_CONFIG[p.assetId]?.isPerchTree || p.growthStage < 1) continue;
    const reach = getPlantDrawSize(p).w * 0.36 + extraReach;
    const dx = Math.abs(p.x - animal.x);
    if (dx <= reach && dx < bestDx) {
      best = p;
      bestDx = dx;
    }
  }
  return best;
}

/** Clears cached vertical position for placed or moved animals so they never float. */
export function clearAnimalRestCache(uid?: string): void {
  if (uid) {
    animalRestYCache.delete(uid);
  } else {
    animalRestYCache.clear();
  }
}

/**
 * Where an animal rests vertically: firmly on the ground terrain, in the water column,
 * or climbing up into a host tree's canopy boughs when a canopy/arboreal species is near a perch tree.
 */
export function getAnimalRestY(
  animal: Pick<PlacedAnimal, 'assetId' | 'zoneId' | 'x'>,
  plants: PlacedPlant[],
  canvasHeight: number,
): number {
  const groundY = getDefaultPlacementY(animal.assetId, animal.zoneId, animal.x, canvasHeight);
  const meta = ASSET_ECO_CONFIG[animal.assetId];
  if (meta?.canopyHabit === 'canopy') {
    const tree = findPerchTree(animal, plants, 28);
    if (tree) {
      const { w: treeW, h: treeH } = getPlantDrawSize(tree);
      const maxReach = treeW * 0.36 + 28;
      const dx = Math.abs(animal.x - tree.x);
      // Crown perch height in the main boughs
      const crownPerchY = tree.y - treeH * 0.48 + (dx / Math.max(1, maxReach)) * (treeH * 0.14);
      // Smoothly climb up the trunk as the animal moves from the outer reach into the trunk/crown
      const trunkZone = treeW * 0.26;
      if (dx <= trunkZone) {
        return Math.min(groundY, crownPerchY);
      }
      const climbT = clamp(1 - (dx - trunkZone) / Math.max(1, maxReach - trunkZone), 0, 1);
      return groundY + (Math.min(groundY, crownPerchY) - groundY) * climbT;
    }
  }
  return groundY;
}
