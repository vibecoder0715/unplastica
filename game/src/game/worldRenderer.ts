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
  TeleportTowerSpec,
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
  TELEPORT_TOWERS,
  WORLD_WIDTH,
} from './worldConfig';
import { computeAnimalLoveLevel } from './persistence';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

const thumbnailCache = new Map<string, string>();
const rigCache = new Map<string, TurtleRigController>();
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

  const bob = Math.sin(elapsedSec * 4.5) * 2.5;
  ctx.translate(0, bob);

  const r = 18;
  // Speech bubble pointer tail pointing down
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#002c17';
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.arc(0, 0, r, 0.38, Math.PI * 2 - 0.38);
  ctx.lineTo(0, r + 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Vector icon based on emotion
  if (emotion === 'laugh') {
    // Laughing hearts / sparkles
    ctx.fillStyle = '#f43f5e';
    ctx.strokeStyle = '#881337';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-9, -1, -8, -8, 0, -4);
    ctx.bezierCurveTo(8, -8, 9, -1, 0, 5);
    ctx.fill();
    ctx.stroke();
  } else if (emotion === 'waving') {
    // Golden waving arcs
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 7 + i * 4, -0.9 + i * 0.2, 0.3 + i * 0.2);
      ctx.stroke();
    }
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(-2, 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (emotion === 'wondered') {
    // Bright cyan question mark
    ctx.fillStyle = '#0284c7';
    ctx.font = '800 20px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, 1);
  } else if (emotion === 'angry') {
    // Red 💢 anger cross mark
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, -7);
    ctx.quadraticCurveTo(0, -2, 7, -7);
    ctx.moveTo(-7, 7);
    ctx.quadraticCurveTo(0, 2, 7, 7);
    ctx.moveTo(-7, -7);
    ctx.quadraticCurveTo(-2, 0, -7, 7);
    ctx.moveTo(7, -7);
    ctx.quadraticCurveTo(2, 0, 7, 7);
    ctx.stroke();
  } else if (emotion === 'crying') {
    // Blue teardrop
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.quadraticCurveTo(7, 0, 0, 7);
    ctx.quadraticCurveTo(-7, 0, 0, -8);
    ctx.fill();
    ctx.stroke();
  } else if (emotion === 'sleepy') {
    // Purple Zzz
    ctx.fillStyle = '#7c3aed';
    ctx.font = '800 14px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Zzz', 0, 1);
  } else if (emotion === 'blush') {
    // Pink twin hearts
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(-2, 4);
    ctx.bezierCurveTo(-7, 0, -6, -5, -2, -2);
    ctx.bezierCurveTo(2, -5, 3, 0, -2, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, -1);
    ctx.bezierCurveTo(1, -4, 2, -8, 4, -6);
    ctx.bezierCurveTo(7, -8, 8, -4, 4, -1);
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

      if (zone.id === 'forest') {
        if (slot === 0) {
          // Mossy Rainforest Granite Boulder & Fern Tuft
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

          // Moss cap (real moss is olive green, not neon)
          ctx.fillStyle = nightFactor > 0.5 ? '#34482a' : '#6f8f44';
          ctx.beginPath();
          ctx.ellipse(0, -rh * 0.85, rw * 0.78, rh * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (slot === 1) {
          // Fallen Rainforest Nurse Log with Shelf Mushrooms
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
        } else {
          // Wild Rainforest Undergrowth Fern Rosette
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
        }
      } else if (zone.id === 'river') {
        // Submerged smooth river cobbles & swaying aquatic vallisneria grass
        ctx.fillStyle = '#78716c';
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(-14, -4, 16, 8, -0.1, 0, Math.PI * 2);
        ctx.ellipse(12, -3, 13, 7, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const sway = Math.sin(elapsedSec * 2.1 + wx * 0.02) * 8;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        for (const ox of [-8, 0, 8]) {
          ctx.beginPath();
          ctx.moveTo(ox, -4);
          ctx.quadraticCurveTo(ox + sway * 0.5, -24, ox + sway, -44 - h2 * 18);
          ctx.stroke();
        }
      } else if (zone.id === 'mud') {
        // Estuarine breathing pneumatophore root spikes & tidal mud mound
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
      } else if (getWaterDepthNorm(wx) > SHALLOW_SUNLIT_DEPTH_NORM + 0.1) {
        // Deep sea: reef-building corals need sunlight, so the deep floor gets bare rock and
        // pale glass sponges instead of bright coral.
        ctx.fillStyle = '#2b3442';
        ctx.strokeStyle = '#151b24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 26 + h1 * 22, 10 + h2 * 8, 0, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (slot === 1) {
          ctx.fillStyle = 'rgba(203, 213, 225, 0.35)';
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.5)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(-6, -6);
          ctx.quadraticCurveTo(-9, -34, -4, -52);
          ctx.lineTo(5, -52);
          ctx.quadraticCurveTo(10, -34, 6, -6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else {
        // Shallow reef: brain coral bommie, branching staghorn coral & sea fan.
        // Living coral is mostly ochre, olive and soft pink-purple, not neon.
        const col =
          slot === 0 ? '#c49a6c' : slot === 1 ? '#a0789f' : '#c98b7c';
        const colDark =
          slot === 0 ? '#6e5236' : slot === 1 ? '#4f3a52' : '#6e3f35';
        ctx.fillStyle = col;
        ctx.strokeStyle = colDark;
        ctx.lineWidth = 2.2;
        if (slot === 0) {
          // Brain coral dome
          ctx.beginPath();
          ctx.arc(0, 0, 22 + h1 * 10, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Branching staghorn coral / sea fan
          const sway = Math.sin(elapsedSec * 1.6 + wx * 0.01) * 4;
          ctx.lineCap = 'round';
          ctx.lineWidth = 5.5;
          ctx.strokeStyle = col;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(sway * 0.5, -22, sway, -42);
          ctx.moveTo(sway * 0.3, -14);
          ctx.lineTo(-16 + sway, -34);
          ctx.moveTo(sway * 0.4, -18);
          ctx.lineTo(18 + sway, -36);
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
 * Renders 100% realistic habitat waypoint scenery (resolving Open Item O6).
 * Replaces fantasy underwater stone obelisks with realistic marine research buoys /
 * hydrological pylons / mangrove observation posts / forest ranger cairns.
 */
function drawRealisticSanctuaryWaypoint(
  ctx: CanvasRenderingContext2D,
  tower: TeleportTowerSpec,
  elapsedSec: number,
): void {
  const outline = '#0f172a';
  const pulse = Math.sin(elapsedSec * 2.4 + tower.worldX * 0.001) * 0.5 + 0.5;

  if (tower.zoneId === 'sea') {
    // 100% Realistic Marine Research Oceanographic Spar Buoy & Reef Monitoring Station
    // Mooring chain to seabed
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -22);
    ctx.stroke();

    // Cylindrical flotation spar (safety orange & yellow with reflective stripe)
    const sparP = new Path2D();
    sparP.rect(-14, -68, 28, 46);
    ctx.fillStyle = '#f97316';
    ctx.fill(sparP);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.4;
    ctx.stroke(sparP);

    // Reflective yellow warning band
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-14, -54, 28, 14);
    ctx.strokeRect(-14, -54, 28, 14);

    // Weather-sealed marine instrumentation collar & pylon cage
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(-10, -84, 20, 16);

    // Solar PV panel
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(-12, -88, 24, 4);
    ctx.strokeRect(-12, -88, 24, 4);

    // Antenna whip
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -88);
    ctx.lineTo(0, -112);
    ctx.stroke();

    // Flashing marine navigation lantern (amber pulse)
    ctx.fillStyle = `rgba(251, 191, 36, ${0.4 + pulse * 0.6})`;
    ctx.beginPath();
    ctx.arc(0, -96, 6 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -96, 2.5, 0, Math.PI * 2);
    ctx.fill();

  } else if (tower.zoneId === 'river') {
    // 100% Realistic River Hydrological Stream Gauge & Telemetry Pylon
    // Heavy timber pile driven into riverbed
    ctx.fillStyle = '#522509';
    ctx.strokeStyle = '#27170a';
    ctx.lineWidth = 2.4;
    ctx.fillRect(-12, -72, 24, 72);
    ctx.strokeRect(-12, -72, 24, 72);

    // Enamel water staff gauge with black-and-white metric measurement lines
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-6, -66, 12, 60);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    for (let gy = -62; gy <= -10; gy += 6) {
      ctx.beginPath();
      ctx.moveTo(-6, gy);
      ctx.lineTo(gy % 12 === 0 ? 3 : 0, gy);
      ctx.stroke();
    }

    // Solar sensor head with status pulse
    ctx.fillStyle = '#334155';
    ctx.fillRect(-14, -84, 28, 12);
    ctx.strokeRect(-14, -84, 28, 12);
    ctx.fillStyle = `rgba(34, 197, 94, ${0.3 + pulse * 0.7})`;
    ctx.beginPath();
    ctx.arc(0, -78, 4, 0, Math.PI * 2);
    ctx.fill();

  } else if (tower.zoneId === 'mud') {
    // 100% Realistic Mangrove Boardwalk Survey Post & Stilt Marker
    ctx.fillStyle = '#44403c';
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2.4;
    ctx.fillRect(-11, -78, 22, 78);
    ctx.strokeRect(-11, -78, 22, 78);

    // Timber cross-braces
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-22, -18);
    ctx.lineTo(22, -54);
    ctx.moveTo(-22, -54);
    ctx.lineTo(22, -18);
    ctx.stroke();

    // Zinc weather cap & marker plaque
    ctx.fillStyle = '#78716c';
    ctx.beginPath();
    ctx.moveTo(-16, -78);
    ctx.lineTo(0, -92);
    ctx.lineTo(16, -78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-8, -48, 16, 12);
    ctx.strokeRect(-8, -48, 16, 12);

  } else {
    // 100% Realistic Rainforest Granite Ranger Cairn & Trail Marker
    // Carved weathered granite monolith
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.4;
    const cairnP = new Path2D();
    cairnP.moveTo(-18, 0);
    cairnP.lineTo(-14, -72);
    cairnP.lineTo(0, -84);
    cairnP.lineTo(14, -72);
    cairnP.lineTo(18, 0);
    cairnP.closePath();
    ctx.fill(cairnP);
    ctx.stroke(cairnP);

    // Epiphytic moss cushions on rock
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(-10, -28, 5.5, 0, Math.PI * 2);
    ctx.arc(11, -44, 4.8, 0, Math.PI * 2);
    ctx.arc(-8, -58, 4.2, 0, Math.PI * 2);
    ctx.fill();

    // Carved sanctuary crest plate
    ctx.fillStyle = '#ca8a04';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.4;
    ctx.fillRect(-8, -52, 16, 18);
    ctx.strokeRect(-8, -52, 16, 18);

    // Bronze solar beacon lantern on peak
    ctx.fillStyle = `rgba(253, 224, 71, ${0.4 + pulse * 0.6})`;
    ctx.beginPath();
    ctx.arc(0, -84, 7 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -84, 3, 0, Math.PI * 2);
    ctx.fill();
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

    // 64 multi-spectral twinkling stars with individual scintillation frequencies
    const starTints = ['#ffffff', '#fef9c3', '#bae6fd', '#fde68a'];
    for (let s = 0; s < 64; s++) {
      const sx = ((s * 173.7 + cameraX * 0.03) % viewportWidth + viewportWidth) % viewportWidth;
      const sy = ((s * 61.3) % (viewportHeight * 0.48)) - cameraY * 0.14;
      if (sy < -10 || sy > viewportHeight * 0.55) continue;
      const twinkle = 0.45 + 0.55 * Math.sin(elapsedSec * (1.6 + (s % 5) * 0.7) + s * 2.1);
      const sr = (s % 7 === 0 ? 1.9 : 1.1) * twinkle;
      ctx.fillStyle = starTints[s % starTints.length];
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.4, sr), 0, Math.PI * 2);
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

  // 4. Layered Volumetric Parallax Clouds
  if (cameraY < viewportHeight * 0.65) {
    const windSpeed = state.currentWeather === 'windy' ? 34 : state.currentWeather === 'rain' ? 22 : 9;
    ctx.save();
    ctx.globalAlpha = state.currentWeather === 'cloudy' || state.currentWeather === 'rain' ? 0.88 : 0.62;
    const cloudTopCol =
      state.currentWeather === 'rain'
        ? '#64748b'
        : nightFactor > 0.5
          ? '#334155'
          : '#ffffff';
    const cloudUnderCol =
      state.currentWeather === 'rain'
        ? '#334155'
        : nightFactor > 0.5
          ? '#1e293b'
          : '#e2e8f0';

    for (let c = 0; c < 14; c++) {
      const screenCx =
        (((c * 240 + elapsedSec * windSpeed - cameraX * 0.22) % (viewportWidth + 360)) +
          (viewportWidth + 360)) %
        (viewportWidth + 360) -
        180;
      const cy = 54 + (c % 4) * 32 - cameraY * 0.25;
      if (cy < -90 || cy > viewportHeight) continue;

      ctx.fillStyle = cloudUnderCol;
      ctx.beginPath();
      ctx.ellipse(screenCx + 24, cy + 10, 58, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = cloudTopCol;
      ctx.beginPath();
      ctx.arc(screenCx, cy, 26, 0, Math.PI * 2);
      ctx.arc(screenCx + 24, cy - 10, 34, 0, Math.PI * 2);
      ctx.arc(screenCx + 52, cy - 2, 27, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Translate into 2D World Space (-cameraX, -cameraY) with smooth pinch zoom scaling
  const zoom = Math.max(0.4, Math.min(2.5, params.zoom ?? 1.0));

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

    // 70% Realistic / 30% Cute Rainforest Ground Grass Blades along the Forest Floor (Frustum-Culled)
    if (zone.id === 'forest') {
      const grassStep = 36;
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
    } else if (zone.id === 'mud') {
      renderIntertidalMangroveTide(ctx, zStart, zEnd, viewportHeight, elapsedSec, nightFactor);
    }
    ctx.restore();
  }

  // 8. Chunked 20–40% Natural Scenery Elements (Rocks, Logs, Reeds, Coral Bommies)
  renderChunkedNaturalScenery(ctx, cameraX, viewportWidth, viewportHeight, elapsedSec, nightFactor);

  // 9. Render Teleport Waypoints in World Space (100% Realistic Scenery)
  for (const tower of TELEPORT_TOWERS) {
    if (tower.worldX < visStartX - 100 || tower.worldX > visEndX + 100) continue;
    const baseFloorY = getTerrainFloorY(tower.worldX, viewportHeight);
    const towerY = baseFloorY + (tower.worldYOffset < 0 ? 0 : 0);
    ctx.save();
    ctx.translate(tower.worldX, towerY);
    drawRealisticSanctuaryWaypoint(ctx, tower, elapsedSec);
    ctx.restore();
  }

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
    const rigKey = `plant_${plant.uid}`;
    let rig = rigCache.get(rigKey);
    if (!rig) {
      rig = new TurtleRigController();
      rigCache.set(rigKey, rig);
    }
    rig.update(worldFrameDt, 1.0);

    const windWave =
      Math.sin(elapsedSec * (state.currentWeather === 'windy' ? 3.4 : 1.6) + plant.x * 0.01) *
      0.16 *
      windSwayBoost;
    const pose: TurtlePose = {
      ...rig.pose,
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

    const restY = getAnimalRestY(animal, state.placedPlants, viewportHeight);
    const prevRest = animalRestYCache.get(animal.uid);
    const easedRest =
      prevRest === undefined || Math.abs(prevRest - restY) > viewportHeight
        ? restY
        : prevRest + clamp(restY - prevRest, -150 * 0.016, 150 * 0.016);
    animalRestYCache.set(animal.uid, easedRest);

    const swimBob =
      inWater && !isBenthic && !isSessile
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
    };

    const drawW = 220 * worldScale;
    const drawH = 200 * worldScale;

    // Depth computation for proper 2.5D visual layering
    const perchTree = meta?.canopyHabit === 'canopy' && !inWater
      ? findPerchTree(animal, state.placedPlants)
      : null;
    let depthY: number;
    if (perchTree && Math.abs(animal.y - (perchTree.y - getPlantDrawSize(perchTree).h * 0.5)) < 70) {
      // Perched in tree branches: render immediately in front of that tree trunk
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

        const tears: TearDrop[] =
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
        renderAnimalAsset(ctx, animal.assetId, drawW, drawH, pose, tears, elapsedSec, {
          skipClear: true,
          locoBlend: isSessile ? 0 : locoBlend,
          swimming: inWater && isLandStandingAnimal(animal.assetId),
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

        // Active Emotion Overhead Comic Badge (100% obvious visual reaction)
        if (animal.emotionTimerSec > 0 && animal.eatingStage === 'none') {
          const pop = Math.min(1, (3.6 - animal.emotionTimerSec) * 4);
          const fade = Math.min(1, animal.emotionTimerSec * 3);
          const alpha = pop * fade;
          if (alpha > 0.05) {
            const bx = animal.x + animal.facing * 36 * Math.max(0.6, bodySize);
            const by = animal.y - 88 * Math.max(0.6, bodySize);
            drawOverheadEmotionBadge(ctx, bx, by, animal.currentEmotion, alpha, elapsedSec);
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
  // Rain stops at the water surface (it used to keep falling through the sea and riverbed)
  const viewCenterX = cameraX + viewportWidth * 0.5;
  const centerWaterY = getWaterSurfaceY(viewCenterX, viewportHeight);
  const surfaceWorldY = centerWaterY ?? getTerrainFloorY(viewCenterX, viewportHeight);
  const surfaceScreenY = (surfaceWorldY - viewportHeight * 0.5 - cameraY) * zoom + viewportHeight * 0.5;
  renderWeatherScreenOverlay(
    ctx,
    viewportWidth,
    viewportHeight,
    state.currentWeather,
    elapsedSec,
    surfaceScreenY,
    centerWaterY !== null,
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
    for (let sx = 0; sx <= w + 24; sx += 24) {
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
  surfaceScreenY: number,
  surfaceIsWater: boolean,
): void {
  if (weather === 'rain' && surfaceIsWater && surfaceScreenY <= 0) {
    return; // fully underwater view: no rain, no splashes
  }
  if (weather === 'windy') {
    ctx.save();
    ctx.strokeStyle = 'rgba(250, 250, 237, 0.36)';
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const wx = ((elapsedSec * 440 + i * 197) % (w + 260)) - 130;
      const wy = ((i * 71) % (h * 0.78)) + 36;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(wx + 54, wy - 9, wx + 108, wy + 5);
      ctx.stroke();
    }
    ctx.restore();
  } else if (weather === 'rain') {
    ctx.save();
    if (surfaceIsWater) {
      ctx.beginPath();
      ctx.rect(0, 0, w, Math.min(h, surfaceScreenY + 4));
      ctx.clip();
    }
    ctx.lineCap = 'round';
    // 3 Depth Planes of Slanted Monsoon Rain + Surface Splash Ripples
    const layers = [
      { count: 42, speedY: 620, speedX: -140, len: 16, width: 1.2, alpha: 0.28 },
      { count: 38, speedY: 840, speedX: -190, len: 24, width: 1.7, alpha: 0.46 },
      { count: 24, speedY: 1080, speedX: -240, len: 34, width: 2.2, alpha: 0.65 },
    ];
    for (const layer of layers) {
      ctx.strokeStyle = `rgba(224, 242, 254, ${layer.alpha})`;
      ctx.lineWidth = layer.width;
      ctx.beginPath();
      for (let i = 0; i < layer.count; i++) {
        const seedX = i * 131.7 + layer.len * 19;
        const seedY = i * 83.3 + layer.len * 31;
        const rx = (((seedX + elapsedSec * layer.speedX) % (w + 120)) + (w + 120)) % (w + 120) - 60;
        const ry = (((seedY + elapsedSec * layer.speedY) % (h + 80)) + (h + 80)) % (h + 80) - 40;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - layer.len * 0.24, ry + layer.len);
      }
      ctx.stroke();
    }

    // Ground & Water Surface Rain Splash Rings
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.42)';
    ctx.lineWidth = 1.4;
    for (let s = 0; s < 18; s++) {
      const phase = (elapsedSec * 2.8 + s * 0.37) % 1;
      const sx = ((s * 149.3) % Math.max(100, w - 40)) + 20;
      // Splashes sit on the actual water surface / ground line on screen
      const sy = surfaceScreenY + ((s * 29) % 28) * (surfaceIsWater ? 0.15 : 0.9);
      ctx.globalAlpha = (1 - phase) * 0.55;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 4 + phase * 14, 1.5 + phase * 4.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  } else if (weather === 'fog') {
    ctx.save();
    for (let band = 0; band < 3; band++) {
      const by = h * (0.36 + band * 0.16);
      const mistGrad = ctx.createLinearGradient(0, by - 55, 0, by + 55);
      mistGrad.addColorStop(0, 'rgba(241, 245, 249, 0)');
      mistGrad.addColorStop(0.5, 'rgba(241, 245, 249, 0.34)');
      mistGrad.addColorStop(1, 'rgba(241, 245, 249, 0)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect(0, by - 55, w, 110);
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
 * The tree a canopy animal (orangutan, hornbill, squirrel...) is currently climbing,
 * or null when there is no tree under it. Canopy animals no longer float in mid-air.
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
    if (!ASSET_ECO_CONFIG[p.assetId]?.isPerchTree || p.growthStage < 2) continue;
    const reach = getPlantDrawSize(p).w * 0.3 + extraReach;
    const dx = Math.abs(p.x - animal.x);
    if (dx <= reach && dx < bestDx) {
      best = p;
      bestDx = dx;
    }
  }
  return best;
}

/**
 * Where an animal rests vertically: on the ground, in the water column, or on the
 * branches of the tree it has climbed.
 */
export function getAnimalRestY(
  animal: Pick<PlacedAnimal, 'assetId' | 'zoneId' | 'x'>,
  plants: PlacedPlant[],
  canvasHeight: number,
): number {
  const base = getDefaultPlacementY(animal.assetId, animal.zoneId, animal.x, canvasHeight);
  const meta = ASSET_ECO_CONFIG[animal.assetId];
  if (meta?.canopyHabit !== 'canopy' || getWaterSurfaceY(animal.x, canvasHeight) !== null) return base;
  const tree = findPerchTree(animal, plants);
  if (!tree) return base;
  const branchY = tree.y - getPlantDrawSize(tree).h * 0.5;
  return Math.min(base, branchY - getAnimalGroundContactOffset(animal.assetId, false) + 8);
}
