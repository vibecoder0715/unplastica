import { renderAnimalAsset } from '../roster/animalRenderer';
import { drawRealisticGrassBlade, renderPlantAsset } from '../roster/plantRenderer';
import { TurtleRigController } from '../turtle/rig';
import type { EmotionType, TearDrop, TurtlePose } from '../turtle/types';
import type {
  FloatingGreenbit,
  HabitatZoneId,
  RejectedDropAnimation,
  SaveState,
  WeatherType,
} from './types';
import {
  ASSET_ECO_CONFIG,
  getAquaticSafeBoundsX,
  getTerrainFloorY,
  getWaterSurfaceY,
  HABITAT_ZONES,
  TELEPORT_TOWERS,
  WORLD_WIDTH,
} from './worldConfig';
import { computeAnimalLoveLevel } from './persistence';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

const thumbnailCache = new Map<string, string>();
const rigCache = new Map<string, TurtleRigController>();

let greenbitsCoinImg: HTMLImageElement | null = null;
if (typeof Image !== 'undefined') {
  greenbitsCoinImg = new Image();
  greenbitsCoinImg.src = '/assets/aistudio/image_3961e3ca.png';
}

export function getGreenbitsCoinImage(): HTMLImageElement | null {
  return greenbitsCoinImg;
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
  } else if (foodId === 'food_wild_figs' || foodId === 'food_rambutan_papaya') {
    // Pair of hairy scarlet Rambutan + golden-orange Papaya & Banyan fig matching P06, P14, P15
    // 1. Ripe pyriform Papaya on left
    ctx.save();
    ctx.translate(-7, 2);
    ctx.rotate(-0.2);
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

    // 2. Realistic hairy crimson Rambutan on right with pliable lime-green spinterns
    ctx.save();
    ctx.translate(7, 4);
    const rGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 13);
    rGrad.addColorStop(0, '#fb7185');
    rGrad.addColorStop(0.5, '#e11d48');
    rGrad.addColorStop(1, '#881337');
    ctx.fillStyle = rGrad;
    ctx.strokeStyle = '#4c0519';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10.5, 12.5, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Soft pliable spinterns (curling hairs with yellow-green tips)
    ctx.strokeStyle = '#bef264';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const baseR = 9.5;
      const curlDir = a % 2 === 0 ? 0.3 : -0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * baseR, Math.sin(ang) * (baseR * 1.15));
      ctx.quadraticCurveTo(
        Math.cos(ang + curlDir) * 15,
        Math.sin(ang + curlDir) * 17,
        Math.cos(ang + curlDir * 1.5) * 16.5,
        Math.sin(ang + curlDir * 1.5) * 18.5,
      );
      ctx.stroke();
    }
    ctx.restore();
  } else if (foodId === 'food_bamboo_honey') {
    // Segmented emerald Bamboo culm shoot + golden Tualang honeycomb wedge matching P02 & P07
    ctx.save();
    ctx.translate(-7, 0);
    ctx.rotate(-0.18);
    ctx.fillStyle = '#84cc16';
    ctx.strokeStyle = '#1a2e05';
    ctx.lineWidth = 1.8;
    drawRoundedRect(ctx, -6, -16, 12, 32, 4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-7, -5);
    ctx.lineTo(7, -5);
    ctx.moveTo(-7, 6);
    ctx.lineTo(7, 6);
    ctx.stroke();
    ctx.restore();

    // Golden Honeycomb on right
    ctx.save();
    ctx.translate(7, 4);
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-11, -10);
    ctx.bezierCurveTo(-10, 14, 10, 14, 11, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#a16207';
    for (const [hx, hy] of [
      [-4, -3],
      [4, -3],
      [0, 3],
    ]) {
      ctx.beginPath();
      ctx.arc(hx, hy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
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
          ctx.fillStyle = nightFactor > 0.5 ? '#334155' : '#64748b';
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.ellipse(0, -rh * 0.35, rw, rh, 0, Math.PI, Math.PI * 2);
          ctx.lineTo(rw, 4);
          ctx.lineTo(-rw, 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Emerald moss cap
          ctx.fillStyle = nightFactor > 0.5 ? '#15803d' : '#4ade80';
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
            ctx.fillStyle = nightFactor > 0.5 ? '#166534' : '#22c55e';
            ctx.strokeStyle = '#052e16';
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
      } else {
        // Coral Sea: Brain coral bommie, branching staghorn coral & sea fan
        const col =
          slot === 0 ? '#f43f5e' : slot === 1 ? '#a855f7' : '#f59e0b';
        const colDark =
          slot === 0 ? '#881337' : slot === 1 ? '#4c1d95' : '#78350f';
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
  const sunAngle = ((hrs - 6) / 12) * Math.PI;
  const celestialX = viewportWidth * 0.5 - Math.cos(sunAngle) * (viewportWidth * 0.34);
  const celestialY = viewportHeight * 0.15 + Math.max(0, -Math.sin(sunAngle)) * 42 - cameraY * 0.18;

  if (nightFactor > 0.25 && celestialY > -120 && cameraY < viewportHeight * 0.5) {
    ctx.save();
    const starAlpha = clamp((nightFactor - 0.25) / 0.75, 0, 1) * (state.currentWeather === 'rain' ? 0.25 : 1);
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

    // Detailed Cratered Moon with Soft Atmospheric Halo
    const moonX = viewportWidth * 0.78;
    const moonY = viewportHeight * 0.14 - cameraY * 0.15;
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
    ctx.restore();
  } else if (nightFactor <= 0.45 && celestialY > -120 && cameraY < viewportHeight * 0.5) {
    // Warm Tropical Sun with Corona Rays
    const sunGlow = ctx.createRadialGradient(celestialX, celestialY, 10, celestialX, celestialY, 92);
    sunGlow.addColorStop(0, 'rgba(254, 249, 195, 0.98)');
    sunGlow.addColorStop(0.35, 'rgba(253, 224, 71, 0.52)');
    sunGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 92, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Realistic Optical Double Rainbow (Primary + Reversed Secondary Bow)
  if (state.currentWeather === 'rainbow' && cameraY < viewportHeight * 0.5) {
    ctx.save();
    const rbCenterX = viewportWidth * 0.52;
    const rbCenterY = viewportHeight * 0.64 - cameraY * 0.35;
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
  ctx.save();
  ctx.translate(viewportWidth * 0.5, viewportHeight * 0.5);
  ctx.scale(zoom, zoom);
  ctx.translate(-viewportWidth * 0.5 - cameraX, -viewportHeight * 0.5 - cameraY);

  const halfWorldW = (viewportWidth * 0.5) / zoom;
  const visStartX = Math.max(0, cameraX + viewportWidth * 0.5 - halfWorldW - 320);
  const visEndX = Math.min(WORLD_WIDTH, cameraX + viewportWidth * 0.5 + halfWorldW + 320);
  const worldBottomY = Math.max(viewportHeight * 4.4, cameraY + viewportHeight + 480);

  // 5. Distant Parallax Rainforest Mountain Ridges & Emergent Canopy Silhouette (Frustum-Culled!)
  const hillColorBack = nightFactor > 0.5 ? '#0f172a' : '#a7f3d0';
  const hillColorMid = nightFactor > 0.5 ? '#1e293b' : '#6ee7b7';
  const mudEndX = HABITAT_ZONES[2].xEnd;
  if (visStartX < mudEndX) {
    const hStart = Math.floor(visStartX / 80) * 80;
    const hEnd = Math.min(mudEndX, Math.ceil(visEndX / 80) * 80);

    ctx.fillStyle = hillColorBack;
    ctx.beginPath();
    ctx.moveTo(hStart, viewportHeight * 0.65);
    for (let wx = hStart; wx <= hEnd; wx += 80) {
      const fadeSea = clamp((mudEndX - wx) / 6000, 0, 1);
      const hillY =
        viewportHeight * 0.54 -
        fadeSea * (95 + Math.sin(wx * 0.0012) * 48 + Math.cos(wx * 0.0031) * 28);
      ctx.lineTo(wx, hillY);
    }
    ctx.lineTo(hEnd, viewportHeight * 0.65);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = hillColorMid;
    ctx.beginPath();
    ctx.moveTo(hStart, viewportHeight * 0.65);
    for (let wx = hStart; wx <= hEnd; wx += 60) {
      const fadeSea = clamp((mudEndX - wx) / 5000, 0, 1);
      const hillY =
        viewportHeight * 0.55 -
        fadeSea * (52 + Math.sin(wx * 0.0025 + 1.2) * 28 + Math.cos(wx * 0.006) * 16);
      ctx.lineTo(wx, hillY);
    }
    ctx.lineTo(hEnd, viewportHeight * 0.65);
    ctx.closePath();
    ctx.fill();
  }

  // 6. Physically Contained Water Basins (Zero Water Leak!) + Depth Darkening
  // Both River Pond and Coral Sea share hydrostatic datum 0.56 * viewportHeight and are bounded by raised levees.
  const waterDatumY = 0.56 * viewportHeight;
  const riverZone = HABITAT_ZONES[1];
  const seaZone = HABITAT_ZONES[3];

  // River Pond Water (Strictly bounded inside River Basin levees)
  const rVisStart = Math.max(riverZone.xStart + 24, visStartX);
  const rVisEnd = Math.min(riverZone.xEnd - 24, visEndX);
  if (rVisEnd > rVisStart) {
    const riverGrad = ctx.createLinearGradient(0, waterDatumY, 0, viewportHeight * 2.2);
    riverGrad.addColorStop(0, nightFactor > 0.5 ? 'rgba(14, 116, 144, 0.88)' : 'rgba(34, 211, 238, 0.80)');
    riverGrad.addColorStop(0.35, nightFactor > 0.5 ? 'rgba(21, 94, 117, 0.94)' : 'rgba(8, 145, 178, 0.90)');
    riverGrad.addColorStop(0.75, 'rgba(12, 54, 68, 0.97)');
    riverGrad.addColorStop(1, 'rgba(4, 24, 34, 0.99)');
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

      // Deep-sea bioluminescent motes visible when diving deeper in the sea
      if (cameraY > 60) {
        const deepY = waterDatumY + 280 + ((wx * 23) % Math.round(viewportHeight * 2.8));
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
    if (zone.id === 'forest') {
      tGrad.addColorStop(0, nightFactor > 0.5 ? '#15803d' : '#4ade80');
      tGrad.addColorStop(0.18, nightFactor > 0.5 ? '#166534' : '#22c55e');
      tGrad.addColorStop(0.55, '#14532d');
      tGrad.addColorStop(1, '#052e16');
    } else if (zone.id === 'river') {
      tGrad.addColorStop(0, '#fde68a');
      tGrad.addColorStop(0.25, '#d97706');
      tGrad.addColorStop(0.65, '#78350f');
      tGrad.addColorStop(1, '#271001');
    } else if (zone.id === 'mud') {
      tGrad.addColorStop(0, nightFactor > 0.5 ? '#78350f' : '#b45309');
      tGrad.addColorStop(0.25, '#92400e');
      tGrad.addColorStop(0.65, '#451a03');
      tGrad.addColorStop(1, '#1c0a00');
    } else {
      tGrad.addColorStop(0, '#fef08a');
      tGrad.addColorStop(0.22, '#eab308');
      tGrad.addColorStop(0.6, '#713f12');
      tGrad.addColorStop(1, '#1e1b4b');
    }
    ctx.fillStyle = tGrad;
    ctx.fill(terrainPath);

    ctx.strokeStyle =
      zone.id === 'forest' ? '#14532d' : zone.id === 'mud' ? '#451a03' : '#78350f';
    ctx.lineWidth = 4.2;
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
          nightFactor > 0.5 ? '#4ade80' : '#bef264',
          nightFactor > 0.5 ? '#15803d' : '#22c55e',
          '#14532d',
          '#052e16',
        );
        drawRealisticGrassBlade(
          ctx,
          gx + 4,
          gy + 1,
          19 + (1 - hSeed) * 10,
          3.9,
          4 + swayPx * 1.1,
          nightFactor > 0.5 ? '#86efac' : '#d9f99d',
          nightFactor > 0.5 ? '#16a34a' : '#4ade80',
          '#15803d',
          '#052e16',
        );
      }
    }
    ctx.restore();
  }

  // 8. Chunked 20–40% Natural Scenery Elements (Rocks, Logs, Reeds, Coral Bommies)
  renderChunkedNaturalScenery(ctx, cameraX, viewportWidth, viewportHeight, elapsedSec, nightFactor);

  // 9. Render Teleport Waypoint Towers in World Space (Genshin/PUBG style Eco-Waypoints)
  for (const tower of TELEPORT_TOWERS) {
    if (tower.worldX < visStartX - 100 || tower.worldX > visEndX + 100) continue;
    const baseFloorY = getTerrainFloorY(tower.worldX, viewportHeight);
    const towerY = baseFloorY + (tower.worldYOffset < 0 ? 0 : 0);
    ctx.save();
    ctx.translate(tower.worldX, towerY);

    // Stone pedestal & glowing emerald resonance obelisk
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.4;
    drawRoundedRect(ctx, -22, -12, 44, 14, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(-14, -12);
    ctx.lineTo(-9, -68);
    ctx.lineTo(0, -82);
    ctx.lineTo(9, -68);
    ctx.lineTo(14, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Floating resonance crystal diamond
    const hoverY = -98 + Math.sin(elapsedSec * 2.8 + tower.worldX) * 5;
    ctx.fillStyle = '#aef682';
    ctx.strokeStyle = '#15432a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, hoverY - 14);
    ctx.lineTo(10, hoverY);
    ctx.lineTo(0, hoverY + 14);
    ctx.lineTo(-10, hoverY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

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

  // 10. Render Placed Plants (`P01`–`P30`) Directly on World Context (Zero Offscreen Clipping!)
  const windSwayBoost =
    state.currentWeather === 'windy'
      ? 2.2
      : state.currentWeather === 'rain'
        ? 1.6
        : 0.75;

  for (const plant of state.placedPlants) {
    if (plant.x < visStartX - 180 || plant.x > visEndX + 180) continue;
    plant.y = getDefaultPlacementY(plant.assetId, plant.zoneId, plant.x, viewportHeight);
    const rigKey = `plant_${plant.uid}`;
    let rig = rigCache.get(rigKey);
    if (!rig) {
      rig = new TurtleRigController();
      rigCache.set(rigKey, rig);
    }
    rig.update(0.016, 1.0);

    const windWave =
      Math.sin(elapsedSec * (state.currentWeather === 'windy' ? 3.4 : 1.6) + plant.x * 0.01) *
      0.16 *
      windSwayBoost;
    const pose: TurtlePose = {
      ...rig.pose,
      headRot: windWave + Math.sin(elapsedSec * 12) * plant.swayImpulse * 0.25,
      waveRaysPhase: elapsedSec * (1.2 + windSwayBoost * 0.6),
    };

    const stageScale = plant.growthStage === 1 ? 0.68 : plant.growthStage === 2 ? 0.88 : 1.04;
    const drawW = 210 * stageScale;
    const drawH = 195 * stageScale;

    ctx.save();
    ctx.translate(plant.x - drawW * 0.5, plant.y - drawH * 0.84);
    renderPlantAsset(ctx, plant.assetId, drawW, drawH, pose, elapsedSec, {
      growthStage: plant.growthStage,
      fruitCount: plant.fruitCount,
      skipClear: true,
    });
    ctx.restore();

    // Draw natural soil / sand lip over the bottom root insertion so the plant base is genuinely stuffed inside the soil
    const isFloatingPlant =
      plant.assetId === 'plant_25_water_hyacinth' ||
      plant.assetId === 'plant_26_lotus' ||
      plant.assetId === 'plant_27_water_lily' ||
      plant.assetId === 'plant_28_duckweed';
    if (!isFloatingPlant) {
      const floorY = getTerrainFloorY(plant.x, viewportHeight);
      ctx.save();
      ctx.fillStyle =
        plant.zoneId === 'forest'
          ? nightFactor > 0.5
            ? '#15803d'
            : '#22c55e'
          : plant.zoneId === 'mud'
            ? '#78350f'
            : '#d97706';
      ctx.strokeStyle =
        plant.zoneId === 'forest' ? '#14532d' : plant.zoneId === 'mud' ? '#451a03' : '#78350f';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.ellipse(plant.x, floorY + 4, 24 * stageScale, 6.5 * stageScale, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // If the plant has ripe harvestable fruits, draw subtle harvest sparkle / golden aura
    // and for plants without built-in custom branch fruit geometry, draw the matching Store fruit icon
    const meta = ASSET_ECO_CONFIG[plant.assetId];
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
        const fruitOffsets: Array<[number, number]> = [
          [-26 * stageScale, -drawH * 0.44],
          [24 * stageScale, -drawH * 0.42],
          [0, -drawH * 0.54],
        ];
        for (let i = 0; i < plant.fruitCount; i++) {
          const [ox, oy] = fruitOffsets[i % fruitOffsets.length];
          const bob = Math.sin(elapsedSec * 2.8 + i) * 2.2;
          const isGold = plant.hasGoldenFruit && i === 0;
          drawFoodIcon(
            ctx,
            meta.producesFruitId,
            plant.x + ox + windWave * 24,
            plant.y + oy + bob,
            13,
            isGold,
          );
        }
      } else if (plant.hasGoldenFruit) {
        // Golden shimmer aura around built-in tree fruits
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
  }

  // 11. Render Dropped Foods / Plucked Fruits on Ground or Floating in Water
  for (const food of state.droppedFoods) {
    if (food.x < visStartX - 80 || food.x > visEndX + 80) continue;
    const bob =
      food.zoneId === 'sea' || food.zoneId === 'river'
        ? Math.sin(elapsedSec * 2.5 + food.x) * 4
        : 0;
    drawFoodIcon(ctx, food.foodId, food.x, food.y + bob, 16, food.isGolden);
  }

  // 12. Render Placed Animals (`A01`–`A41`) Directly on World Context (Zero Boundary Clipping!)
  const sleepingNow = isNightTime(state.timeOfDayHours);

  for (const animal of state.placedAnimals) {
    if (animal.x < visStartX - 240 || animal.x > visEndX + 240) continue;
    const baseDepthY = getDefaultPlacementY(animal.assetId, animal.zoneId, animal.x, viewportHeight);
    const meta = ASSET_ECO_CONFIG[animal.assetId];
    const canopyLift = meta?.canopyHabit === 'canopy' ? -120 : 0;
    const isEmotingNow = animal.emotionTimerSec > 0;
    const locoBlend = animal.locoBlend ?? (isEmotingNow ? 0 : 1);

    const swimBob =
      animal.zoneId === 'sea' || animal.zoneId === 'river'
        ? Math.sin(elapsedSec * 1.8 + animal.x * 0.02) * 12 * (0.3 + 0.7 * locoBlend)
        : Math.sin(elapsedSec * 2.2 + animal.x * 0.03) * 1.8 * locoBlend;
    if (!animal.isFalling) {
      animal.y = baseDepthY + canopyLift + swimBob;
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
    rig.update(0.016, 1.0);

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
        ? 1 + Math.sin(elapsedSec * 14) * 0.04
        : animal.eatingStage === 'swallow'
          ? 1.08
          : rig.pose.headScaleY;

    const pose: TurtlePose = {
      ...rig.pose,
      blinkAmount: Math.max(rig.pose.blinkAmount, animal.blinkActiveSec > 0 ? 0.96 : 0),
      mouthOpen: chewMouth,
      mouthSmile: animal.eatingStage !== 'none' ? 0.85 : rig.pose.mouthSmile,
      blushAlpha: animal.eatingStage !== 'none' ? 0.65 : rig.pose.blushAlpha,
      headScaleY: chewScaleY,
    };

    const drawW = 220;
    const drawH = 200;

    if (selectedAnimalUid === animal.uid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(174, 246, 130, 0.92)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(animal.x, animal.y + 34, 68, 22, 0, 0, Math.PI * 2);
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

    // Direct rendering onto world ctx with skipClear: true — 0% boundary clipping ever!
    ctx.save();
    ctx.translate(animal.x - drawW * 0.5, animal.y - drawH * 0.56);
    if (animal.fallImpactSec && animal.fallImpactSec > 0) {
      const progress = animal.fallImpactSec / 0.35;
      const squash = Math.sin(progress * Math.PI) * 0.24;
      ctx.translate(drawW * 0.5, drawH * 0.56);
      ctx.scale(1 + squash * 0.75, 1 - squash);
      ctx.translate(-drawW * 0.5, -drawH * 0.56);
    }
    renderAnimalAsset(ctx, animal.assetId, drawW, drawH, pose, tears, elapsedSec, {
      skipClear: true,
      locoBlend,
    });
    ctx.restore();

    // If Love Lv.5 reached and baby companion enabled, render mini baby companion directly
    const loveLv = computeAnimalLoveLevel(animal);
    if (loveLv >= 5 && animal.showBabyCompanion) {
      const babyW = drawW * 0.52;
      const babyH = drawH * 0.52;
      ctx.save();
      ctx.translate(
        animal.x - animal.facing * 76 - babyW * 0.5,
        animal.y + 18 - babyH * 0.56,
      );
      renderAnimalAsset(ctx, animal.assetId, babyW, babyH, pose, [], elapsedSec, {
        skipClear: true,
        locoBlend,
      });
      ctx.restore();
    }

    // 3-Stage Eating Animation Visuals (Pick Up -> Chew -> Swallow)
    if (animal.eatingStage !== 'none' && animal.eatingFoodId) {
      const mouthWorldX = animal.x + animal.facing * 46;
      const mouthWorldY = animal.y - 8;
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
        ctx.fillText('Full +', animal.x, animal.y - 74);
      }
    }

    // Hungry Crying Thought Bubble showing desired food
    if (animal.hunger <= 22 && animal.eatingStage === 'none') {
      const desiredFood = meta?.favoriteFoodId ?? 'food_banana_bunch';
      const bx = animal.x + animal.facing * 42;
      const by = animal.y - 84 + Math.sin(elapsedSec * 3.5) * 4;
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

    // Clean Name Tag underneath animal when selected (Only show the animal's name, e.g. "haha")
    if (selectedAnimalUid === animal.uid) {
      const label = animal.customName || meta?.name || 'Animal';
      ctx.save();
      ctx.font = '700 12px "Outfit", sans-serif';
      const tw = Math.max(46, ctx.measureText(label).width + 24);
      ctx.fillStyle = '#002c17';
      drawRoundedRect(ctx, animal.x - tw * 0.5, animal.y + 52, tw, 24, 12);
      ctx.fill();
      ctx.fillStyle = '#fafaed';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, animal.x, animal.y + 64);
      ctx.restore();
    }
  }

  // 13. Floating Greenbits Coins in World Space (Logo + amount, no "GB" text)
  for (const coin of floatingCoins) {
    if (coin.collected) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, coin.alpha));
    ctx.translate(coin.x, coin.y);
    if (greenbitsCoinImg && greenbitsCoinImg.complete && greenbitsCoinImg.naturalWidth > 0) {
      ctx.drawImage(greenbitsCoinImg, -16, -16, 32, 32);
    } else {
      ctx.fillStyle = '#5fa038';
      ctx.strokeStyle = '#002c17';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#aef682';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 4, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fafaed';
    ctx.strokeStyle = '#002c17';
    ctx.lineWidth = 3;
    ctx.font = '800 14px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.strokeText(`+${coin.amount}`, 18, 4);
    ctx.fillText(`+${coin.amount}`, 18, 4);
    ctx.restore();
  }

  // Nighttime Bioluminescent Fireflies in Forest & River
  if (nightFactor > 0.45) {
    ctx.save();
    for (let f = 0; f < 22; f++) {
      const fx = visStartX + ((f * 137 + Math.sin(elapsedSec * 0.8 + f) * 45) % Math.max(200, visEndX - visStartX));
      const fy = viewportHeight * 0.42 + Math.cos(elapsedSec * 1.3 + f * 1.7) * 65;
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
  renderWeatherScreenOverlay(ctx, viewportWidth, viewportHeight, state.currentWeather, elapsedSec);

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

function renderWeatherScreenOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  weather: WeatherType,
  elapsedSec: number,
): void {
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
      const sy = h * (0.56 + ((s * 29) % 28) * 0.01);
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

  // Floating pond plants (Lotus, Water Lily, Water Hyacinth, Duckweed) sit near water surface
  if (
    assetId === 'plant_25_water_hyacinth' ||
    assetId === 'plant_26_lotus' ||
    assetId === 'plant_27_water_lily' ||
    assetId === 'plant_28_duckweed'
  ) {
    return (waterY ?? floorY) + 12;
  }

  if (meta.kind === 'plant') {
    return floorY + 8;
  }

  // Swimming animals in Sea or River swim comfortably between water surface and deep seabed
  if ((zoneId === 'sea' || zoneId === 'river') && waterY !== null) {
    if (
      assetId === 'animal_35_giant_clam' ||
      assetId === 'animal_40_sea_star' ||
      assetId === 'animal_38_harlequin_shrimp' ||
      assetId === 'animal_20_giant_freshwater_prawn' ||
      meta.canopyHabit === 'benthic'
    ) {
      return floorY - 28;
    }
    const midDepth = waterY + (floorY - waterY) * 0.48;
    return midDepth;
  }

  return floorY - 26;
}
