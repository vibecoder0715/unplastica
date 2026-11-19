import {
  isLandStandingAnimal,
  renderAnimalAsset,
} from '../roster/animalRenderer';
import { drawRealisticGrassBlade, renderPlantAsset } from '../roster/plantRenderer';
import { TurtleRigController } from '../turtle/rig';
import type { EmotionType, TearDrop, TurtlePose } from '../turtle/types';
import { globalQualityController } from '../engine/deviceProfile';
import {
  framePerfTracker,
  getOrRenderCachedCloud,
  isEntityVisibleInFrustum,
} from '../engine/renderCache';
import type {
  FloatingGreenbit,
  PlacedPlant,
  RejectedDropAnimation,
  SaveState,
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
  WORLD_WIDTH,
} from './worldConfig';
import { computeAnimalLoveLevel } from './persistence';
import {
  drawOverheadEmotionBadge,
  drawRoundedRect,
  drawVectorGreenbitsCoin,
  getGreenbitsCoinImage,
} from './renderers/coinAndEmotionRenderer';
import { drawFoodIcon, getFoodThumbnailDataUrl } from './renderers/foodRenderer';
import {
  renderChunkedNaturalScenery,
  renderDynamicReefAndMangroveLife,
  renderIntertidalMangroveTide,
  seededHash,
} from './renderers/habitatSceneryRenderer';
import { renderWeatherScreenOverlay } from './renderers/weatherOverlayRenderer';
import {
  animalRestYCache,
  clearAnimalRestCache,
  findPerchTree,
  getAnimalGroundContactOffset,
  getAnimalRestY,
  getAnimalVisualSize,
  getAnimalWorldScale,
  getDefaultPlacementY,
  getPlantDrawSize,
} from './renderers/entityPlacement';

export {
  clearAnimalRestCache,
  drawFoodIcon,
  drawOverheadEmotionBadge,
  drawVectorGreenbitsCoin,
  findPerchTree,
  getAnimalGroundContactOffset,
  getAnimalRestY,
  getAnimalVisualSize,
  getAnimalWorldScale,
  getDefaultPlacementY,
  getFoodThumbnailDataUrl,
  getGreenbitsCoinImage,
  getPlantDrawSize,
};

let lastWorldElapsedSec = -1;
let worldFrameDt = 1 / 60;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

const thumbnailCache = new Map<string, string>();
const rigCache = new Map<string, TurtleRigController>();
/** Static immutable base pose for flora - saves 30+ full skeletal matrix kinematics per frame */
const STATIC_PLANT_BASE_POSE: TurtlePose = new TurtleRigController('idle', 'right').pose;

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
    const dpr = 1.5; // Balanced crispness & fast lag-free thumbnail generation
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

const plantSpriteCache = new Map<string, HTMLCanvasElement>();
function getPlantInstanceVariant(plant: Pick<PlacedPlant, 'uid' | 'x' | 'assetId'>): number {
  let h = Math.round(plant.x * 0.13);
  const s = `${plant.uid || ''}_${plant.assetId}`;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h ^ s.charCodeAt(i), 16777619)) >>> 0;
  }
  return Math.abs(h) % 4;
}

function getCachedPlantSprite(
  assetId: string,
  drawW: number,
  drawH: number,
  growthStage: 1 | 2 | 3,
  fruitCount: number,
  variant = 0,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const w = Math.max(64, Math.round(drawW));
  const h = Math.max(64, Math.round(drawH));
  const v = ((variant % 4) + 4) % 4;
  const key = `${assetId}|${w}x${h}|${growthStage}|${fruitCount}|v${v}`;
  const cached = plantSpriteCache.get(key);
  if (cached) return cached;

  try {
    const c = document.createElement('canvas');
    const padX = Math.round(w * 0.28);
    const padY = Math.round(h * 0.22);
    c.width = w + padX * 2;
    c.height = h + padY * 2;
    const cCtx = c.getContext('2d');
    if (!cCtx) return null;
    cCtx.save();
    cCtx.translate(padX, padY);
    renderPlantAsset(cCtx, assetId, w, h, STATIC_PLANT_BASE_POSE, 1.0 + v * 1.7, {
      growthStage,
      fruitCount,
      variant: v,
      skipClear: true,
    });
    cCtx.restore();
    plantSpriteCache.set(key, c);
    return c;
  } catch {
    return null;
  }
}


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
      ? '#cbd5e1'
      : nightFactor > 0.5
        ? '#64748b'
        : sunsetFactor > 0.2
          ? '#fff7ed'
          : '#ffffff';
    const cloudMidCol = isStorm
      ? '#64748b'
      : nightFactor > 0.5
        ? '#334155'
        : sunsetFactor > 0.2
          ? '#fed7aa'
          : '#e2e8f0';
    const cloudBaseCol = isStorm
      ? '#1e293b'
      : nightFactor > 0.5
        ? '#0f172a'
        : sunsetFactor > 0.2
          ? '#94a3b8'
          : '#94a3b8';

    const qualityCfg = globalQualityController.getConfig();
    const renderCloudGeometry = (targetCtx: CanvasRenderingContext2D, variant: number) => {
      const hexToRgba = (hex: string, a: number): string => {
        const clean = hex.replace('#', '');
        const num = parseInt(clean, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      };

      if (isStorm) {
        const virgaGrad = targetCtx.createLinearGradient(0, 12, -16, 86);
        virgaGrad.addColorStop(0, hexToRgba(cloudBaseCol, 0.28));
        virgaGrad.addColorStop(0.55, hexToRgba(cloudMidCol, 0.12));
        virgaGrad.addColorStop(1, hexToRgba(cloudMidCol, 0));
        targetCtx.fillStyle = virgaGrad;
        targetCtx.beginPath();
        targetCtx.moveTo(-66, 12);
        targetCtx.lineTo(74, 12);
        targetCtx.lineTo(54, 86);
        targetCtx.lineTo(-86, 86);
        targetCtx.closePath();
        targetCtx.fill();
      }

      const mistGrad = targetCtx.createRadialGradient(4, 8, 12, 4, 12, 118);
      mistGrad.addColorStop(0, hexToRgba(cloudBaseCol, 0.42));
      mistGrad.addColorStop(0.55, hexToRgba(cloudMidCol, 0.18));
      mistGrad.addColorStop(1, hexToRgba(cloudMidCol, 0));
      targetCtx.fillStyle = mistGrad;
      targetCtx.beginPath();
      targetCtx.ellipse(4, 12, 114, 22, 0, 0, Math.PI * 2);
      targetCtx.fill();

      const sil = new Path2D();
      if (variant === 0) {
        sil.moveTo(-92, 15);
        sil.bezierCurveTo(-104, 11, -100, -2, -84, -4);
        sil.bezierCurveTo(-80, -18, -62, -24, -48, -16);
        sil.bezierCurveTo(-42, -34, -18, -40, -4, -26);
        sil.bezierCurveTo(6, -50, 38, -52, 48, -24);
        sil.bezierCurveTo(62, -30, 82, -18, 82, -4);
        sil.bezierCurveTo(98, -4, 106, 9, 94, 15);
        sil.bezierCurveTo(46, 19, -42, 19, -92, 15);
      } else if (variant === 1) {
        sil.moveTo(-96, 15);
        sil.bezierCurveTo(-108, 10, -102, -4, -84, -6);
        sil.bezierCurveTo(-74, -24, -48, -30, -34, -18);
        sil.bezierCurveTo(-22, -46, 14, -50, 28, -26);
        sil.bezierCurveTo(42, -38, 70, -30, 76, -10);
        sil.bezierCurveTo(94, -8, 104, 8, 90, 15);
        sil.bezierCurveTo(38, 19, -44, 19, -96, 15);
      } else {
        sil.moveTo(-88, 14);
        sil.bezierCurveTo(-98, 9, -92, -5, -74, -6);
        sil.bezierCurveTo(-64, -26, -34, -34, -18, -20);
        sil.bezierCurveTo(-6, -42, 26, -44, 38, -20);
        sil.bezierCurveTo(52, -28, 76, -20, 80, -4);
        sil.bezierCurveTo(96, -3, 102, 9, 88, 14);
        sil.bezierCurveTo(36, 18, -36, 18, -88, 14);
      }
      sil.closePath();

      const bodyGrad = targetCtx.createLinearGradient(0, -50, 0, 18);
      bodyGrad.addColorStop(0, cloudTopCol);
      bodyGrad.addColorStop(0.46, cloudMidCol);
      bodyGrad.addColorStop(0.82, cloudBaseCol);
      bodyGrad.addColorStop(1, hexToRgba(cloudBaseCol, 0.92));
      targetCtx.fillStyle = bodyGrad;
      targetCtx.fill(sil);

      targetCtx.save();
      targetCtx.clip(sil);

      const shadowLobes: ReadonlyArray<readonly [number, number, number]> = [
        [-54, 8, 28],
        [-14, 6, 34],
        [28, 7, 34],
        [64, 9, 26],
      ];
      for (const [sx, sy, sr] of shadowLobes) {
        const sGrad = targetCtx.createRadialGradient(sx, sy + sr * 0.2, sr * 0.1, sx, sy, sr);
        sGrad.addColorStop(0, hexToRgba(cloudBaseCol, 0.52));
        sGrad.addColorStop(0.6, hexToRgba(cloudBaseCol, 0.22));
        sGrad.addColorStop(1, hexToRgba(cloudBaseCol, 0));
        targetCtx.fillStyle = sGrad;
        targetCtx.beginPath();
        targetCtx.arc(sx, sy, sr, 0, Math.PI * 2);
        targetCtx.fill();
      }

      const puffs: ReadonlyArray<readonly [number, number, number]> =
        variant === 0
          ? [
              [-62, -6, 24],
              [-26, -18, 30],
              [16, -26, 36],
              [52, -10, 28],
              [76, 2, 22],
              [-6, -2, 28],
              [30, 0, 26],
            ]
          : variant === 1
            ? [
                [-64, -6, 24],
                [-32, -14, 28],
                [2, -26, 38],
                [46, -16, 30],
                [74, 1, 22],
                [14, -2, 30],
              ]
            : [
                [-56, -8, 26],
                [-18, -18, 32],
                [16, -24, 34],
                [52, -10, 26],
                [74, 2, 20],
                [4, 0, 28],
              ];

      for (const [px, py, pr] of puffs) {
        const pGrad = targetCtx.createRadialGradient(
          px - pr * 0.3,
          py - pr * 0.34,
          pr * 0.06,
          px,
          py,
          pr,
        );
        pGrad.addColorStop(0, hexToRgba(cloudTopCol, 0.96));
        pGrad.addColorStop(0.52, hexToRgba(cloudTopCol, 0.48));
        pGrad.addColorStop(0.82, hexToRgba(cloudMidCol, 0.15));
        pGrad.addColorStop(1, hexToRgba(cloudMidCol, 0));
        targetCtx.fillStyle = pGrad;
        targetCtx.beginPath();
        targetCtx.arc(px, py, pr, 0, Math.PI * 2);
        targetCtx.fill();
      }

      const baseShadow = targetCtx.createLinearGradient(0, 1, 0, 19);
      baseShadow.addColorStop(0, hexToRgba(cloudBaseCol, 0));
      baseShadow.addColorStop(0.62, hexToRgba(cloudBaseCol, 0.48));
      baseShadow.addColorStop(0.9, hexToRgba(cloudBaseCol, 0.76));
      baseShadow.addColorStop(1, hexToRgba(cloudMidCol, 0.55));
      targetCtx.fillStyle = baseShadow;
      targetCtx.fillRect(-110, 1, 220, 19);

      targetCtx.strokeStyle = hexToRgba('#ffffff', isStorm ? 0.38 : nightFactor > 0.5 ? 0.25 : 0.72);
      targetCtx.lineWidth = 1.8;
      targetCtx.stroke(sil);

      targetCtx.restore();
    };

    const drawVolumetricCloud = (
      cx: number,
      cy: number,
      scaleX: number,
      scaleY: number,
      variant: number,
      alpha: number,
    ) => {
      const cacheKey = `cloud_${variant}_${cloudTopCol}_${cloudMidCol}_${cloudBaseCol}_${isStorm ? 1 : 0}_${nightFactor > 0.5 ? 1 : 0}`;
      const cached = qualityCfg.enableOffscreenCloudCache
        ? getOrRenderCachedCloud(
            cacheKey,
            260,
            160,
            (offCtx, ox, oy) => {
              offCtx.save();
              offCtx.translate(ox, oy);
              renderCloudGeometry(offCtx, variant);
              offCtx.restore();
            },
            130,
            64,
          )
        : null;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scaleX, scaleY);
      ctx.globalAlpha = alpha;
      if (cached) {
        ctx.drawImage(cached, -130, -64, 260, 160);
        framePerfTracker.addDrawCalls(1);
      } else {
        renderCloudGeometry(ctx, variant);
        framePerfTracker.addDrawCalls(14);
      }
      ctx.restore();
    };

    // Distant high-altitude altocumulus layer + closer main cumulus bank (scaled by device quality tier)
    const rawCloudCount = isCloudy ? 14 : 9;
    const cloudCount = Math.max(4, Math.round(rawCloudCount * qualityCfg.cloudCountScale));
    for (let c = 0; c < cloudCount; c++) {
      const depthLayer = c % 2; // 0 = far, 1 = near
      const par = depthLayer === 0 ? 0.14 : 0.24;
      const spd = windSpeed * (depthLayer === 0 ? 0.65 : 1.08);
      const wrapW = viewportWidth + 460;
      const screenCx =
        (((c * 255 + elapsedSec * spd - cameraX * par) % wrapW) + wrapW) % wrapW - 230;
      const cy = (depthLayer === 0 ? 44 : 78) + (c % 4) * 28 - cameraY * (depthLayer === 0 ? 0.18 : 0.28);
      if (cy < -110 || cy > seaLevelScreenY - 18) {
        framePerfTracker.addCulled(1);
        continue;
      }

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
      const activeTier = globalQualityController.getConfig();
      const baseGrassStep = gQuality === 'performance' ? 64 : gQuality === 'quality' ? 34 : 42;
      const grassStep = gQuality === 'dynamic' ? baseGrassStep * activeTier.grassStepMultiplier : baseGrassStep;
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
    plant.y = getDefaultPlacementY(plant.assetId, plant.zoneId, plant.x, viewportHeight);
    if (!isEntityVisibleInFrustum(plant.x, plant.y, cameraX, cameraY, viewportWidth, viewportHeight, 280, 320)) {
      framePerfTracker.addCulled(1);
      continue;
    }
    framePerfTracker.addDrawCalls(1);

    const windWave =
      Math.sin(elapsedSec * (state.currentWeather === 'windy' ? 3.4 : 1.6) + plant.x * 0.01) *
      0.16 *
      windSwayBoost;
    const pose: TurtlePose = {
      ...STATIC_PLANT_BASE_POSE,
      headRot: windWave + Math.sin(elapsedSec * 12) * plant.swayImpulse * 0.25,
      waveRaysPhase: elapsedSec * (1.2 + windSwayBoost * 0.6),
    };

    const plantVariant = getPlantInstanceVariant(plant);
    const variantScale = 0.94 + (plantVariant - 1.5) * 0.04;
    const plantSize = (ASSET_ECO_CONFIG[plant.assetId]?.visualSize ?? 1) * variantScale;
    const rawDrawSize = getPlantDrawSize(plant);
    const drawW = rawDrawSize.w * variantScale;
    const drawH = rawDrawSize.h * variantScale;
    const stageScale = (drawW / 210) / Math.max(0.2, plantSize);
    const isFloatingPlant = isFloatingPlantAsset(plant.assetId) && getWaterSurfaceY(plant.x, viewportHeight) !== null;
    const meta = ASSET_ECO_CONFIG[plant.assetId];

    depthRenderQueue.push({
      depthY: plant.y,
      render: () => {
        const cachedSprite = getCachedPlantSprite(
          plant.assetId,
          drawW,
          drawH,
          plant.growthStage,
          plant.fruitCount,
          plantVariant,
        );
        if (cachedSprite) {
          const w = Math.max(64, Math.round(drawW));
          const h = Math.max(64, Math.round(drawH));
          const padX = Math.round(w * 0.28);
          const padY = Math.round(h * 0.22);
          ctx.save();
          ctx.translate(plant.x, plant.y);
          ctx.rotate(pose.headRot * 0.14);
          ctx.drawImage(
            cachedSprite,
            -drawW * 0.5 - padX,
            -drawH * 0.84 - padY,
            drawW + padX * 2,
            drawH + padY * 2,
          );
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(plant.x - drawW * 0.5, plant.y - drawH * 0.84);
          renderPlantAsset(ctx, plant.assetId, drawW, drawH, pose, elapsedSec, {
            growthStage: plant.growthStage,
            fruitCount: plant.fruitCount,
            variant: plantVariant,
            skipClear: true,
          });
          ctx.restore();
        }

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
    if (!isEntityVisibleInFrustum(food.x, food.y, cameraX, cameraY, viewportWidth, viewportHeight, 80, 120)) {
      framePerfTracker.addCulled(1);
      continue;
    }
    framePerfTracker.addDrawCalls(1);
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
    if (!isEntityVisibleInFrustum(animal.x, animal.y, cameraX, cameraY, viewportWidth, viewportHeight, 240, 280)) {
      framePerfTracker.addCulled(1);
      continue;
    }
    framePerfTracker.addDrawCalls(2);
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
      animal.assetId === 'animal_29_hawksbill_sea_turtle' ||
      animal.assetId === 'animal_23_southern_river_terrapin' ||
      animal.assetId === 'animal_24_southeast_asian_box_turtle';

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

    const pose: TurtlePose = isSeaTurtleAsset && animal.eatingStage === 'none'
      ? rig.pose
      : {
          ...rig.pose,
          blinkAmount: isSeaTurtleAsset
            ? rig.pose.blinkAmount
            : Math.max(rig.pose.blinkAmount, animal.blinkActiveSec > 0 ? 0.96 : 0),
          mouthOpen: chewMouth,
          mouthSmile: animal.eatingStage !== 'none' ? 0.85 : rig.pose.mouthSmile,
          blushAlpha: animal.eatingStage !== 'none' ? 0.65 : rig.pose.blushAlpha,
          headScaleY: chewScaleY,
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

