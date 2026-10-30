import { TurtleRigController } from './turtle/rig';
import { renderTurtle } from './turtle/renderer';
import { ROSTER_ASSETS } from './roster/catalog';
import type {
  PlacedAnimal,
  PlacedPlant,
  FloatingGreenbit,
  RejectedDropAnimation,
  HabitatZoneId,
  TeleportTowerSpec,
  WeatherType,
} from './game/types';
import {
  WORLD_WIDTH,
  TELEPORT_TOWERS,
  FOOD_CATALOG,
  ASSET_ECO_CONFIG,
  getAquaticSafeBoundsX,
  getZoneAtWorldX,
  getZoneSpec,
  validateAssetDropZone,
  getTerrainFloorY,
  canAnimalEatFood,
  canAnimalGrazePlant,
  getWaterSurfaceY,
  isAnimalResting,
  rollSleepingTouchReaction,
  rollAwakeTapReaction,
} from './game/worldConfig';
import {
  loadSaveState,
  persistSaveState,
  computeAnimalLoveLevel,
  recordAnimalCareInteraction,
} from './game/persistence';
import { soundEngine } from './game/sound';
import {
  getGameString,
  getLocalizedAssetName,
  getLocalizedZoneName,
  getLocalizedFoodName,
  getLocalizedTowerName,
  getShortDescriptionWithBold,
  type GameLanguage,
} from './game/i18n';
import {
  renderEcosystemWorld,
  bindAssetThumbnailImage,
  getAssetThumbnailDataUrl,
  getFoodThumbnailDataUrl,
  getDefaultPlacementY,
  getAnimalRestY,
  getAnimalVisualSize,
  findPerchTree,
  getPlantDrawSize,
  isNightTime,
} from './game/worldRenderer';

type StoreTab = 'animals' | 'plants' | 'food';

interface ActiveDragItem {
  kind: 'asset' | 'food' | 'reposition_animal';
  id: string;
  placedUid?: string;
  label: string;
  thumbUrl: string;
  pointerX: number;
  pointerY: number;
}

const GB_LOGO_HTML = `<img src="/assets/aistudio/image_3961e3ca.png" alt="" referrerpolicy="no-referrer" class="gb-inline-logo" />`;

const CART_SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1.5"/><circle cx="20" cy="21" r="1.5"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`;

const HEART_SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="#db2777" stroke="#db2777" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

const CHEVRON_DOWN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;

const CHEVRON_UP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>`;

const INFO_SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

const TOWER_SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 19 9 12 22 5 9 12 2"/><circle cx="12" cy="9" r="2.5"/></svg>`;

const WORLD_MAP_ROUND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/><circle cx="12" cy="9" r="1.5" fill="currentColor"/><path d="M12 4a3 3 0 0 0-3 3c0 2.5 3 6 3 6s3-3.5 3-6a3 3 0 0 0-3-3z" stroke="currentColor" fill="none" stroke-width="1.6"/></svg>`;

const PET_PAW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 11c-2.4 0-4.3 1.8-4.3 4.2 0 2 1.8 3.3 4.3 3.3s4.3-1.3 4.3-3.3c0-2.4-1.9-4.2-4.3-4.2z"/><circle cx="6.5" cy="9.5" r="2.2" fill="currentColor"/><circle cx="10" cy="5.5" r="2.2" fill="currentColor"/><circle cx="14" cy="5.5" r="2.2" fill="currentColor"/><circle cx="17.5" cy="9.5" r="2.2" fill="currentColor"/></svg>`;

const LOCATION_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;

const CART_ROUND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1.5"/><circle cx="20" cy="21" r="1.5"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`;

const POSTCARD_ROUND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;

const EXIT_DOOR_ROUND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;

const CAMERA_CAPTURE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Maps WMO Weather Interpretation Codes (used by Google Weather / Open-Meteo) to sanctuary WeatherType.
 */
function mapWmoCodeToWeather(code: number, windSpeedKmh = 0): WeatherType {
  if (code >= 51 && code <= 67) return 'rain';
  if (code >= 80 && code <= 99) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (code === 2) return windSpeedKmh >= 20 ? 'windy' : 'rainbow';
  if (code === 3) return 'cloudy';
  if (windSpeedKmh >= 22) return 'windy';
  return 'sunny';
}

/**
 * Returns the current decimal hour (0..24) in Kuala Lumpur (Asia/Kuala_Lumpur, UTC+8)
 */
function getKualaLumpurDecimalHours(): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kuala_Lumpur',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 12);
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return (h % 24) + m / 60;
  } catch {
    const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    return (utcHours + 8) % 24;
  }
}

function getLocalDecimalHours(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

/**
 * Human-readable condition string for the 4-item Animal Inspector card
 */
function getAnimalConditionText(animal: PlacedAnimal, night: boolean): string {
  if (animal.emotionTimerSec > 0) {
    switch (animal.currentEmotion) {
      case 'angry':
        return 'Angry';
      case 'crying':
        return 'Sad';
      case 'laugh':
      case 'blush':
      case 'congratulate':
        return 'Happy';
      case 'wondered':
        return 'Curious';
      case 'waving':
        return 'Friendly';
      case 'sleepy':
        return 'Sleeping';
      default:
        break;
    }
  }
  if (animal.hunger <= 25) return 'Hungry';
  if (night) return 'Sleeping';
  if (animal.hunger >= 80) return 'Happy';
  return 'Calm';
}

export interface SanctuaryGameOptions {
  rootElement?: HTMLElement | null;
  balance?: number;
  userId?: string;
  language?: GameLanguage;
  initialSaveState?: Partial<import('./game/types').SaveState> | null;
  onExit?: () => void;
  onBalanceChange?: (newBalance: number) => void;
  onSaveStateChange?: (state: import('./game/types').SaveState) => void;
}

export function initApp(options?: SanctuaryGameOptions): () => void {
  const root = options?.rootElement ?? document.getElementById('root');
  if (!root) return () => {};
  root.innerHTML = '';

  let isDestroyed = false;
  let animFrameId = 0;

  const loaded = loadSaveState(options?.userId, options?.initialSaveState);
  const saveState = loaded.state;
  if (options?.balance !== undefined && Number.isFinite(options.balance)) {
    saveState.greenbits = Math.max(0, Math.round(options.balance));
  }
  const foodList = Object.values(FOOD_CATALOG);

  let floatingGreenbits: FloatingGreenbit[] = [];
  let rejectedDrops: RejectedDropAnimation[] = [];
  const shoreShells = [
    { id: 'sh1', x: 364000, y: 420 },
    { id: 'sh2', x: 412000, y: 432 },
    { id: 'sh3', x: 441000, y: 428 },
  ];

  // Camera & 4x Vertical Viewport State (Sea Level = 0; Negative = Canopy Up; Positive = Deep Sea Down)
  //
  // The world is laid out in a fixed LOGICAL height (LOGICAL_VIEW_HEIGHT units) and scaled
  // uniformly to the real container. Before, the canvas bitmap was sized from
  // window.innerWidth/innerHeight clamped to at least 320 x 480 while CSS stretched it to
  // the container, so on short or narrow phone screens (landscape, foldables, open keyboard)
  // the whole scene, including the turtle, was squeezed non-uniformly. Terrain also changed
  // shape with every resize because it was proportional to the raw window height.
  const LOGICAL_VIEW_HEIGHT = 800;
  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 2.2;
  let viewScale = 1; // CSS px per logical unit
  let canvasCssLeft = 0;
  let canvasCssTop = 0;
  const initialRect = root.getBoundingClientRect();
  const initialCssW = Math.max(1, initialRect.width || window.innerWidth);
  const initialCssH = Math.max(1, initialRect.height || window.innerHeight);
  viewScale = initialCssH / LOGICAL_VIEW_HEIGHT;
  let viewportWidth = initialCssW / viewScale;
  let viewportHeight = LOGICAL_VIEW_HEIGHT;
  const starterX = saveState.placedAnimals[0]?.x ?? 543600;
  let cameraX = clamp(starterX - viewportWidth * 0.5, 0, WORLD_WIDTH - viewportWidth);
  let targetCameraX = cameraX;
  // First visit: frame the starter animal instead of an empty patch of open water
  const starterAnimal = saveState.placedAnimals[0];
  let cameraY =
    saveState.cameraY ??
    (starterAnimal
      ? clamp(
          getDefaultPlacementY(starterAnimal.assetId, starterAnimal.zoneId, starterAnimal.x, LOGICAL_VIEW_HEIGHT) -
            LOGICAL_VIEW_HEIGHT * 0.42,
          0,
          LOGICAL_VIEW_HEIGHT * 2.65,
        )
      : 0);
  let targetCameraY = cameraY;
  let cameraZoom = 1.0;
  let targetCameraZoom = 1.0;

  /** Converts a pointer's client (CSS) coordinates to logical canvas coordinates. */
  function clientToLogical(clientX: number, clientY: number): { x: number; y: number } {
    return { x: (clientX - canvasCssLeft) / viewScale, y: (clientY - canvasCssTop) / viewScale };
  }

  /** Converts pointer client coordinates to world coordinates. */
  function screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const p = clientToLogical(clientX, clientY);
    return {
      x: clamp(
        cameraX + viewportWidth * 0.5 + (p.x - viewportWidth * 0.5) / cameraZoom,
        40,
        WORLD_WIDTH - 40,
      ),
      y: cameraY + viewportHeight * 0.5 + (p.y - viewportHeight * 0.5) / cameraZoom,
    };
  }

  /**
   * Facing changes are rate-limited. The turtle-style 2.5D turn narrows the body while it
   * turns, so flipping direction every frame (collision nudges, food just behind, finger
   * jitter on a phone) made animals look repeatedly squeezed.
   */
  const lastFacingFlipSec = new Map<string, number>();
  function setFacing(animal: PlacedAnimal, dir: 1 | -1): void {
    if (animal.facing === dir) return;
    const last = lastFacingFlipSec.get(animal.uid) ?? -Infinity;
    if (totalElapsedSec - last < 1.0) return;
    lastFacingFlipSec.set(animal.uid, totalElapsedSec);
    animal.facing = dir;
  }

  let selectedAnimalUid: string | null = saveState.placedAnimals[0]?.uid ?? null;
  let activeStoreTab: StoreTab = 'animals';
  let isHudHidden = false;
  let isDockCollapsed = false;
  let activeDrag: ActiveDragItem | null = null;

  // Pointer 2D panning / petting state
  let isPanningWorld = false;
  let panStartX = 0;
  let panStartY = 0;
  let panStartCameraX = 0;
  let panStartCameraY = 0;
  let pointerMovedDistance = 0;
  let lastScratchAnimalUid: string | null = null;
  let scratchAccumulatedPx = 0;

  // 1. Main World Canvas
  const worldCanvas = document.createElement('canvas');
  worldCanvas.id = 'eco-canvas';
  worldCanvas.setAttribute('aria-label', 'Wild Malaysia Interactive Ecosystem World');
  root.appendChild(worldCanvas);

  const storedLang = (typeof localStorage !== 'undefined' ? localStorage.getItem('unplastica-language') : null) as GameLanguage | null;
  let currentLang: GameLanguage = (storedLang === 'Bahasa Melayu' || storedLang === '中文' || storedLang === 'தமிழ்' || storedLang === 'English')
    ? storedLang
    : (options?.language ?? 'English');

  // 2. Minimalist Top HUD with Circular Buttons (Pets, World Map, Store, Postcard View, Red Exit)
  // Greenbit coin count is intentionally removed from the game HUD (only shown inside Store modal).
  const hudTop = document.createElement('header');
  hudTop.className = 'hud-top';
  hudTop.style.justifyContent = 'flex-end';

  const buttonCluster = document.createElement('div');
  buttonCluster.className = 'hud-cluster';

  // Left of Map: Circular Pets Button (Paw SVG only)
  const petsBtn = document.createElement('button');
  petsBtn.type = 'button';
  petsBtn.className = 'hud-circle-btn pets-btn';
  petsBtn.innerHTML = PET_PAW_SVG;
  petsBtn.setAttribute('aria-label', getGameString('myPets', currentLang));
  petsBtn.title = getGameString('myPets', currentLang);
  petsBtn.addEventListener('click', () => openPetsTeleportModal());

  const mapBtn = document.createElement('button');
  mapBtn.type = 'button';
  mapBtn.className = 'hud-circle-btn map-btn';
  mapBtn.innerHTML = WORLD_MAP_ROUND_SVG;
  mapBtn.setAttribute('aria-label', getGameString('worldMap', currentLang));
  mapBtn.title = getGameString('worldMap', currentLang);
  mapBtn.addEventListener('click', () => openTeleportMapModal());

  const storeBtn = document.createElement('button');
  storeBtn.type = 'button';
  storeBtn.className = 'hud-circle-btn store-btn';
  storeBtn.innerHTML = CART_ROUND_SVG;
  storeBtn.setAttribute('aria-label', getGameString('store', currentLang));
  storeBtn.title = getGameString('store', currentLang);
  storeBtn.addEventListener('click', () => openStoreModal('animals'));

  const postcardBtn = document.createElement('button');
  postcardBtn.type = 'button';
  postcardBtn.className = 'hud-circle-btn postcard-btn';
  postcardBtn.innerHTML = POSTCARD_ROUND_SVG;
  postcardBtn.setAttribute('aria-label', getGameString('postcardView', currentLang));
  postcardBtn.title = getGameString('postcardView', currentLang);
  postcardBtn.addEventListener('click', () => setPostcardView(true));

  buttonCluster.append(petsBtn, mapBtn, storeBtn, postcardBtn);

  let exitBtn: HTMLButtonElement | null = null;
  if (options?.onExit) {
    exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.className = 'hud-circle-btn exit-btn';
    exitBtn.innerHTML = EXIT_DOOR_ROUND_SVG;
    exitBtn.setAttribute('aria-label', getGameString('exit', currentLang));
    exitBtn.title = getGameString('exit', currentLang);
    exitBtn.addEventListener('click', () => {
      options.onExit?.();
    });
    buttonCluster.append(exitBtn);
  }

  const updateHudTooltips = () => {
    petsBtn.setAttribute('aria-label', getGameString('myPets', currentLang));
    petsBtn.title = getGameString('myPets', currentLang);
    mapBtn.setAttribute('aria-label', getGameString('worldMap', currentLang));
    mapBtn.title = getGameString('worldMap', currentLang);
    storeBtn.setAttribute('aria-label', getGameString('store', currentLang));
    storeBtn.title = getGameString('store', currentLang);
    postcardBtn.setAttribute('aria-label', getGameString('postcardView', currentLang));
    postcardBtn.title = getGameString('postcardView', currentLang);
    if (exitBtn) {
      exitBtn.setAttribute('aria-label', getGameString('exit', currentLang));
      exitBtn.title = getGameString('exit', currentLang);
    }
  };

  const handleLangSync = (e: Event) => {
    const raw = (e as CustomEvent).detail;
    const detail = (typeof raw === 'object' && raw ? (raw.language || raw.lang) : raw) as GameLanguage;
    if (detail && (detail === 'English' || detail === 'Bahasa Melayu' || detail === '中文' || detail === 'தமிழ்')) {
      currentLang = detail;
      updateHudTooltips();
      renderEntityCard();
      renderDockCards();
    }
  };
  window.addEventListener('unplastica-sync-game-language', handleLangSync);
  window.addEventListener('storage', (e) => {
    if (e.key === 'unplastica-language' && e.newValue) {
      if (e.newValue === 'English' || e.newValue === 'Bahasa Melayu' || e.newValue === '中文' || e.newValue === 'தமிழ்') {
        currentLang = e.newValue as GameLanguage;
        updateHudTooltips();
        renderEntityCard();
        renderDockCards();
      }
    }
  });

  hudTop.append(buttonCluster);
  root.appendChild(hudTop);

  // Floating Quit Postcard View Button (Clean circular "✕" in corner)
  const quitPostcardBtn = document.createElement('button');
  quitPostcardBtn.type = 'button';
  quitPostcardBtn.className = 'postcard-close-x-btn';
  quitPostcardBtn.innerHTML = '✕';
  quitPostcardBtn.setAttribute('aria-label', getGameString('quitPostcard', currentLang));
  quitPostcardBtn.title = getGameString('quitPostcard', currentLang);
  quitPostcardBtn.style.display = 'none';
  quitPostcardBtn.addEventListener('click', () => setPostcardView(false));
  root.appendChild(quitPostcardBtn);

  // Floating Camera Capture Button at bottom center of Postcard View
  const capturePostcardBtn = document.createElement('button');
  capturePostcardBtn.type = 'button';
  capturePostcardBtn.className = 'postcard-capture-btn';
  capturePostcardBtn.innerHTML = CAMERA_CAPTURE_SVG;
  capturePostcardBtn.setAttribute('aria-label', getGameString('capturePhoto', currentLang));
  capturePostcardBtn.title = getGameString('capturePhoto', currentLang);
  capturePostcardBtn.style.display = 'none';
  capturePostcardBtn.addEventListener('click', () => {
    // Capture screenshot strictly for the scene canvas without external phone UI
    const dataUrl = worldCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `Unplastica_Sanctuary_${Date.now()}.png`;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    a.remove();

    // Camera flash overlay animation
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.inset = '0';
    flash.style.background = '#ffffff';
    flash.style.opacity = '0.9';
    flash.style.zIndex = '99999';
    flash.style.pointerEvents = 'none';
    flash.style.transition = 'opacity 0.35s ease-out';
    document.body.appendChild(flash);
    requestAnimationFrame(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 360);
    });

    soundEngine.playCoinChime();
    showToast(getGameString('savedPostcard', currentLang));
  });
  root.appendChild(capturePostcardBtn);

  function setPostcardView(active: boolean): void {
    isHudHidden = active;
    hudTop.style.display = isHudHidden ? 'none' : 'flex';
    bottomDock.style.display = isHudHidden ? 'none' : 'flex';
    quitPostcardBtn.style.display = isHudHidden ? 'inline-flex' : 'none';
    capturePostcardBtn.style.display = isHudHidden ? 'inline-flex' : 'none';
    renderEntityCard();
  }

  // 3. Simplified 4-Item Animal Inspector Card
  const entityCard = document.createElement('aside');
  entityCard.className = 'entity-card';
  entityCard.setAttribute('aria-label', 'Animal Inspector');
  entityCard.style.display = 'none';
  root.appendChild(entityCard);

  // 4. Clean Toast Banner (No debug strings, no emojis)
  const toastEl = document.createElement('div');
  toastEl.className = 'eco-toast';
  toastEl.style.opacity = '0';
  root.appendChild(toastEl);
  let toastTimeout = 0;

  function showToast(msg: string, durationMs = 2400, isHtml = false): void {
    if (isHtml) {
      toastEl.innerHTML = msg;
    } else {
      toastEl.textContent = msg;
    }
    toastEl.style.opacity = '1';
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => {
      toastEl.style.opacity = '0';
    }, durationMs);
  }

  if (!options?.userId && loaded.offlineGreenbitsEarned > 0) {
    saveState.greenbits += loaded.offlineGreenbitsEarned;
    options?.onBalanceChange?.(saveState.greenbits);
    persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
    window.setTimeout(() => {
      const offlineMsg =
        currentLang === '中文'
          ? `在您离开期间收获了 +${GB_LOGO_HTML} ${loaded.offlineGreenbitsEarned} 硬币`
          : currentLang === 'Bahasa Melayu'
          ? `Mengumpul +${GB_LOGO_HTML} ${loaded.offlineGreenbitsEarned} syiling semasa anda tiada`
          : currentLang === 'தமிழ்'
          ? `நீங்கள் இல்லாத போது +${GB_LOGO_HTML} ${loaded.offlineGreenbitsEarned} நாணயங்கள் பெறப்பட்டன`
          : `Collected +${GB_LOGO_HTML} ${loaded.offlineGreenbitsEarned} while you were away`;
      showToast(offlineMsg, 3500, true);
    }, 400);
  }

  // 5. Collapsible Bottom Panel (Covered line box when hidden with ^ chevron; expands with v chevron)
  const bottomDock = document.createElement('section');
  bottomDock.className = 'bottom-dock';
  bottomDock.setAttribute('aria-label', 'Sanctuary Items Panel');

  const dockCollapseBar = document.createElement('div');
  dockCollapseBar.className = 'dock-collapse-bar';

  const dockToggleBtn = document.createElement('button');
  dockToggleBtn.type = 'button';
  dockToggleBtn.className = 'dock-toggle-btn';
  dockToggleBtn.setAttribute('aria-label', 'Toggle Sanctuary Items Panel');
  dockToggleBtn.innerHTML = CHEVRON_DOWN_SVG;
  dockToggleBtn.addEventListener('click', () => {
    isDockCollapsed = !isDockCollapsed;
    bottomDock.classList.toggle('collapsed', isDockCollapsed);
    dockToggleBtn.innerHTML = isDockCollapsed ? CHEVRON_UP_SVG : CHEVRON_DOWN_SVG;
  });

  dockCollapseBar.appendChild(dockToggleBtn);

  const dockStrip = document.createElement('div');
  dockStrip.className = 'dock-strip';

  bottomDock.append(dockCollapseBar, dockStrip);
  root.appendChild(bottomDock);

  // 6. Drag Ghost Element
  const dragGhost = document.createElement('div');
  dragGhost.className = 'drag-ghost';
  dragGhost.style.display = 'none';
  const dragGhostImg = document.createElement('img');
  dragGhostImg.src = getFoodThumbnailDataUrl('food_seaweed_kelp');
  dragGhostImg.alt = 'Dragging item';
  const dragGhostLabel = document.createElement('div');
  dragGhostLabel.className = 'drag-ghost-label';
  dragGhost.append(dragGhostImg, dragGhostLabel);
  root.appendChild(dragGhost);

  // ============================================================================
  // REAL-TIME GOOGLE WEATHER / OPEN-METEO GEOLOCATION + KUALA LUMPUR SYNC
  // ============================================================================
  async function syncRealTimeWeatherAndClock(): Promise<void> {
    const fetchOpenMeteo = async (lat: number, lon: number, label: string, isKLDefault: boolean) => {
      try {
        saveState.timeOfDayHours = isKLDefault ? getKualaLumpurDecimalHours() : getLocalDecimalHours();
        saveState.weatherLocationLabel = label;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,is_day,weather_code,wind_speed_10m&timezone=auto`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const current = data?.current;
          if (current) {
            const wCode = Number(current.weather_code ?? 0);
            const wind = Number(current.wind_speed_10m ?? 0);
            saveState.currentWeather = mapWmoCodeToWeather(wCode, wind);
            // Follow the real local/KL clock time smoothly without jumping arbitrarily to 21:00 or 12:30 (Fix O4)
            saveState.timeOfDayHours = isKLDefault ? getKualaLumpurDecimalHours() : getLocalDecimalHours();
          }
        }
      } catch {
        // Fallback to Kuala Lumpur solar time if offline
        saveState.timeOfDayHours = isKLDefault ? getKualaLumpurDecimalHours() : getLocalDecimalHours();
        saveState.weatherLocationLabel = label;
      }
      persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
      syncHudDOM();
    };

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void fetchOpenMeteo(pos.coords.latitude, pos.coords.longitude, 'Local Weather', false);
        },
        () => {
          // User denied or unavailable -> Default strictly to Kuala Lumpur
          void fetchOpenMeteo(3.139, 101.6869, 'Kuala Lumpur', true);
        },
        { timeout: 6000, maximumAge: 600000 },
      );
    } else {
      void fetchOpenMeteo(3.139, 101.6869, 'Kuala Lumpur', true);
    }
  }

  // Trigger initial weather sync & refresh every 10 minutes
  saveState.timeOfDayHours = getKualaLumpurDecimalHours();
  saveState.weatherLocationLabel = saveState.weatherLocationLabel || 'Kuala Lumpur';
  void syncRealTimeWeatherAndClock();
  window.setInterval(() => {
    void syncRealTimeWeatherAndClock();
  }, 600000);

  function awardGreenbits(amount: number, worldX?: number, worldY?: number): void {
    saveState.greenbits += amount;
    options?.onBalanceChange?.(saveState.greenbits);
    soundEngine.playCoinChime();
    if (worldX !== undefined && worldY !== undefined) {
      floatingGreenbits.push({
        uid: `gb_${Date.now()}_${Math.random()}`,
        x: worldX,
        y: worldY,
        vy: -42,
        amount,
        alpha: 1,
        collected: false,
      });
    }
    persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
    syncHudDOM();
  }

  // ============================================================================
  // BOTTOM PANEL CARDS (All owned items in one clean strip + "Drag me!" on hover)
  // Hold-to-drag allows smooth horizontal scrolling without accidentally dragging!
  // ============================================================================
  function attachHoldToDrag(
    cardEl: HTMLElement,
    getItem: (clientX: number, clientY: number) => ActiveDragItem | null
  ): void {
    let holdTimer = 0;
    let startX = 0;
    let startY = 0;
    let isHolding = false;

    const clearHold = () => {
      window.clearTimeout(holdTimer);
      cardEl.classList.remove('is-held');
      isHolding = false;
    };

    cardEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      startX = e.clientX;
      startY = e.clientY;
      isHolding = true;

      holdTimer = window.setTimeout(() => {
        if (!isHolding) return;
        const item = getItem(e.clientX, e.clientY);
        if (!item) return;
        cardEl.classList.add('is-held');
        startDraggingItem(item);
      }, 500); // 0.5s hold threshold activates drag; quick swipes/scrolls cancel before this fires
    });

    cardEl.addEventListener('pointermove', (e) => {
      if (!isHolding) return;
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      // If moved more than 8px before 0.5s hold timer fires, user is scrolling or swiping the strip!
      if (dist > 8) {
        clearHold();
      }
    });

    cardEl.addEventListener('pointerup', clearHold);
    cardEl.addEventListener('pointercancel', clearHold);
    cardEl.addEventListener('pointerleave', clearHold);
  }

  function renderDockCards(): void {
    dockStrip.innerHTML = '';
    let totalRendered = 0;
    const dragMsg = currentLang === '中文' ? '拖动我！' : currentLang === 'Bahasa Melayu' ? 'Tarik saya!' : currentLang === 'தமிழ்' ? 'இழுக்கவும்!' : 'Drag me!';

    // 1. Owned Food Cards
    for (const food of foodList) {
      const count = saveState.foodInventory[food.id] ?? 0;
      if (count <= 0) continue;
      totalRendered++;

      const card = document.createElement('div');
      card.className = 'dock-card';
      card.dataset.foodId = food.id;

      const dragPop = document.createElement('span');
      dragPop.className = 'dock-card-drag-pop';
      dragPop.textContent = dragMsg;

      const countSpan = document.createElement('span');
      countSpan.className = 'dock-card-count';
      countSpan.textContent = `x${count}`;

      const img = document.createElement('img');
      img.className = 'dock-card-thumb';
      img.src = getFoodThumbnailDataUrl(food.id);
      img.alt = food.name;

      const title = document.createElement('div');
      title.className = 'dock-card-title';
      title.textContent = food.name;

      card.append(dragPop, countSpan, img, title);

      attachHoldToDrag(card, (clientX, clientY) => {
        if ((saveState.foodInventory[food.id] ?? 0) <= 0) return null;
        return {
          kind: 'food',
          id: food.id,
          label: food.name,
          thumbUrl: img.src,
          pointerX: clientX,
          pointerY: clientY,
        };
      });

      dockStrip.appendChild(card);
    }

    // 2. Owned Animal & Plant Cards (Animals already placed in the world are removed from bottom dock bar)
    for (const asset of ROSTER_ASSETS) {
      const ownedCount = saveState.ownedAssets[asset.id] ?? 0;
      if (ownedCount <= 0) continue;

      let availableInBag = ownedCount;
      if (asset.isAnimal) {
        const placedCount = saveState.placedAnimals.filter((a) => a.assetId === asset.id).length;
        availableInBag = Math.max(0, ownedCount - placedCount);
      }
      if (availableInBag <= 0) continue;
      totalRendered++;

      const card = document.createElement('div');
      card.className = 'dock-card';
      card.dataset.assetId = asset.id;

      const dragPop = document.createElement('span');
      dragPop.className = 'dock-card-drag-pop';
      dragPop.textContent = dragMsg;

      const countSpan = document.createElement('span');
      countSpan.className = 'dock-card-count';
      countSpan.textContent = `x${availableInBag}`;

      const img = document.createElement('img');
      img.className = 'dock-card-thumb';
      bindAssetThumbnailImage(img, asset.id);
      img.alt = asset.name;

      const localizedName = getLocalizedAssetName(asset.id, asset.name, currentLang);
      const title = document.createElement('div');
      title.className = 'dock-card-title';
      title.textContent = localizedName;

      card.append(dragPop, countSpan, img, title);

      attachHoldToDrag(card, (clientX, clientY) => {
        let curCount = saveState.ownedAssets[asset.id] ?? 0;
        if (asset.isAnimal) {
          const placedCount = saveState.placedAnimals.filter((a) => a.assetId === asset.id).length;
          curCount = Math.max(0, curCount - placedCount);
        }
        if (curCount <= 0) return null;
        return {
          kind: 'asset',
          id: asset.id,
          label: localizedName,
          thumbUrl: getAssetThumbnailDataUrl(asset.id),
          pointerX: clientX,
          pointerY: clientY,
        };
      });

      dockStrip.appendChild(card);
    }

    if (totalRendered === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'dock-empty-msg';
      emptyMsg.textContent =
        currentLang === '中文'
          ? '背包暂空，前往商店获取物种或食物吧！'
          : currentLang === 'Bahasa Melayu'
          ? 'Beg anda kosong, buka Kedai untuk dapatkan haiwan atau makanan!'
          : currentLang === 'தமிழ்'
          ? 'பை காலியாக உள்ளது, கடையைத் திறந்து விலங்குகளைப் பெறுங்கள்!'
          : 'Your bag is empty. Open Store to get animals, plants, or food.';
      dockStrip.appendChild(emptyMsg);
    }
  }

  function startDraggingItem(item: ActiveDragItem): void {
    activeDrag = item;
    dragGhost.style.display = 'flex';
    dragGhostImg.src = item.thumbUrl;
    dragGhostLabel.textContent = item.label;
    updateDragGhostPosition(item.pointerX, item.pointerY);
  }

  function updateDragGhostPosition(clientX: number, clientY: number): void {
    if (!activeDrag) return;
    activeDrag.pointerX = clientX;
    activeDrag.pointerY = clientY;
    dragGhost.style.left = `${clientX}px`;
    dragGhost.style.top = `${clientY}px`;
  }

  const onWindowPointerMove = (e: PointerEvent) => {
    if (activeDrag) {
      updateDragGhostPosition(e.clientX, e.clientY);
    }
  };
  window.addEventListener('pointermove', onWindowPointerMove);

  const onWindowPointerUp = (e: PointerEvent) => {
    if (!activeDrag) return;
    const item = activeDrag;
    activeDrag = null;
    dragGhost.style.display = 'none';

    const dockRect = bottomDock.getBoundingClientRect();
    if (e.clientY >= dockRect.top - 20) {
      if (item.kind === 'reposition_animal' && item.placedUid) {
        // Dragged from forest back to bottom dock bar: recall back into bag!
        const idx = saveState.placedAnimals.findIndex((a) => a.uid === item.placedUid);
        if (idx !== -1) {
          const removed = saveState.placedAnimals.splice(idx, 1)[0];
          if (selectedAnimalUid === removed.uid) {
            selectedAnimalUid = saveState.placedAnimals[0]?.uid ?? null;
          }
          soundEngine.playCoinChime();
          const animalName = removed.customName || getLocalizedAssetName(removed.assetId, 'Animal', currentLang);
          showToast(
            currentLang === '中文'
              ? `已将 ${animalName} 收回背包`
              : currentLang === 'Bahasa Melayu'
              ? `${animalName} telah disimpan semula ke dalam beg`
              : currentLang === 'தமிழ்'
              ? `${animalName} பையில் சேர்க்கப்பட்டது`
              : `Returned ${animalName} to your bag`
          );
          renderEntityCard();
          renderDockCards();
          persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
        }
      }
      return;
    }

    const worldPt = screenToWorld(e.clientX, e.clientY);
    const worldX = clamp(worldPt.x, 60, WORLD_WIDTH - 60);
    const worldY = worldPt.y;
    const zoneId = getZoneAtWorldX(worldX);

    if (item.kind === 'reposition_animal' && item.placedUid) {
      handleRepositionPlacedAnimal(item.placedUid, worldX, e.clientX, e.clientY, zoneId);
    } else if (item.kind === 'asset') {
      handleDropAssetOnWorld(item.id, worldX, e.clientX, e.clientY, zoneId);
    } else {
      handleDropFoodOnWorld(item.id, worldX, worldY, zoneId);
    }
  };
  window.addEventListener('pointerup', onWindowPointerUp);

  /**
   * Finds a non-overlapping X coordinate inside the habitat zone when placing or moving an animal
   */
  function findNonOverlappingAnimalX(
    assetId: string,
    desiredX: number,
    zoneId: HabitatZoneId,
    excludeUid?: string,
  ): number {
    const { minX, maxX } = getAquaticSafeBoundsX(assetId, zoneId);
    const myRadius = ASSET_ECO_CONFIG[assetId]?.collisionRadius ?? 78;
    let candidateX = clamp(desiredX, minX, maxX);

    for (let attempt = 0; attempt < 16; attempt++) {
      let conflict = false;
      for (const other of saveState.placedAnimals) {
        if (other.uid === excludeUid) continue;
        if (other.zoneId !== zoneId) continue;
        const otherR = ASSET_ECO_CONFIG[other.assetId]?.collisionRadius ?? 78;
        const minGap = (myRadius + otherR) * 1.15;
        if (Math.abs(candidateX - other.x) < minGap) {
          conflict = true;
          const dir = attempt % 2 === 0 ? 1 : -1;
          candidateX = clamp(
            other.x + dir * (minGap + 14 * (attempt + 1)),
            minX,
            maxX,
          );
          break;
        }
      }
      if (!conflict) break;
    }
    return candidateX;
  }

  function handleRepositionPlacedAnimal(
    placedUid: string,
    worldX: number,
    screenX: number,
    screenY: number,
    zoneId: HabitatZoneId,
  ): void {
    const animal = saveState.placedAnimals.find((a) => a.uid === placedUid);
    if (!animal) return;

    const validation = validateAssetDropZone(animal.assetId, zoneId, worldX);
    if (!validation.valid) {
      soundEngine.playRejectBoing();
      const start = clientToLogical(screenX, screenY);
      rejectedDrops.push({
        assetId: animal.assetId,
        startX: start.x,
        startY: start.y,
        targetBarX: clamp(
          (animal.x - cameraX - viewportWidth * 0.5) * cameraZoom + viewportWidth * 0.5,
          40,
          viewportWidth - 40,
        ),
        targetBarY: clamp(
          (animal.y - cameraY - viewportHeight * 0.5) * cameraZoom + viewportHeight * 0.5,
          40,
          viewportHeight - 60,
        ),
        progress: 0,
        reason: validation.reason,
      });
      showToast(validation.reason, 2800);
      return;
    }

    const safeX = findNonOverlappingAnimalX(animal.assetId, worldX, zoneId, animal.uid);
    // Canopy animals land in a tree if dropped on one, otherwise on the ground (no mid-air perch)
    const targetGroundY = getAnimalRestY({ ...animal, x: safeX, zoneId }, saveState.placedPlants, viewportHeight);
    const releaseWorldY = screenToWorld(0, screenY).y;
    animal.zoneId = zoneId;
    animal.x = safeX;
    animal.y = Math.min(releaseWorldY, targetGroundY - 135);
    animal.vy = 20;
    animal.isFalling = true;
    animal.targetX = safeX + (Math.random() > 0.5 ? 160 : -160);
    animal.targetY = targetGroundY;
    selectedAnimalUid = animal.uid;

    soundEngine.playPluckPop();
    persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
    renderEntityCard();
    syncHudDOM();
    const rawName = ASSET_ECO_CONFIG[animal.assetId]?.name || 'Animal';
    const displayName = animal.customName || getLocalizedAssetName(animal.assetId, rawName, currentLang);
    const locZone = getLocalizedZoneName(zoneId, currentLang);
    showToast(getGameString('movedTo', currentLang).replace('{name}', displayName).replace('{zone}', locZone));
  }

  function handleDropAssetOnWorld(
    assetId: string,
    worldX: number,
    screenX: number,
    screenY: number,
    zoneId: HabitatZoneId,
  ): void {
    const validation = validateAssetDropZone(assetId, zoneId, worldX);
    if (!validation.valid) {
      soundEngine.playRejectBoing();
      const start = clientToLogical(screenX, screenY);
      rejectedDrops.push({
        assetId,
        startX: start.x,
        startY: start.y,
        targetBarX: viewportWidth * 0.5,
        targetBarY: viewportHeight - 55,
        progress: 0,
        reason: validation.reason,
      });
      showToast(validation.reason, 2800);
      return;
    }

    const asset = ROSTER_ASSETS.find((a) => a.id === assetId);
    const eco = ASSET_ECO_CONFIG[assetId];
    if (!asset || !eco) return;

    if (asset.isAnimal) {
      const ownedTotal = Math.max(1, saveState.ownedAssets[asset.id] ?? 1);
      const existingSameAnimals = saveState.placedAnimals.filter((a) => a.assetId === asset.id);
      if (existingSameAnimals.length >= ownedTotal && existingSameAnimals.length > 0) {
        // If all owned copies of this animal are already in the world UI, reposition the existing one with full anti-overlap!
        const targetAnimal = existingSameAnimals[existingSameAnimals.length - 1];
        handleRepositionPlacedAnimal(targetAnimal.uid, worldX, screenX, screenY, zoneId);
        return;
      }

      const safeX = findNonOverlappingAnimalX(asset.id, worldX, zoneId);
      const targetGroundY = getAnimalRestY(
        { assetId: asset.id, x: safeX, zoneId },
        saveState.placedPlants,
        viewportHeight,
      );
      const releaseWorldY = screenToWorld(0, screenY).y;
      const dropStartY = Math.min(releaseWorldY, targetGroundY - 135);
      const uid = `anim_${asset.code.toLowerCase()}_${Date.now()}`;
      const night = isAnimalResting(asset.id, saveState.timeOfDayHours);
      const nowMs = Date.now();
      const newAnimal: PlacedAnimal = {
        uid,
        assetId: asset.id,
        customName: asset.name,
        zoneId,
        x: safeX,
        y: dropStartY,
        targetX: safeX + (Math.random() > 0.5 ? 160 : -160),
        targetY: targetGroundY,
        isFalling: true,
        facing: Math.random() > 0.5 ? 1 : -1,
        hunger: 88,
        happiness: 95,
        bondXp: 100,
        showBabyCompanion: false,
        currentEmotion: night ? 'sleepy' : 'waving',
        emotionTimerSec: night ? 0 : 3.5,
        eatingStage: 'none',
        eatingTimerSec: 0,
        petScratchAccum: 0,
        lastGreenbitDropSec: 0,
        blinkCountdownSec: 2.2,
        blinkActiveSec: 0,
        lastEmoteTriggerMs: nowMs,
        emoteSpamCount: 0,
        lastTapMs: nowMs,
        locoBlend: night ? 0 : 0,
        vx: 0,
        vy: 20,
        careStartTimestampMs: nowMs,
        careDaysCount: 1,
        lastCareDayStamp: new Date(nowMs).toISOString().slice(0, 10),
      };
      saveState.placedAnimals.push(newAnimal);
      selectedAnimalUid = uid;
    } else {
      const placeY = getDefaultPlacementY(asset.id, zoneId, worldX, viewportHeight);
      const uid = `plant_${asset.code.toLowerCase()}_${Date.now()}`;
      // By default newly placed plants start at Stage 1 (no flowers or fruits yet; they grow over time!)
      const newPlant: PlacedPlant = {
        uid,
        assetId: asset.id,
        zoneId,
        x: worldX,
        y: placeY,
        growthStage: 1,
        growthProgress: 0,
        fruitCount: 0,
        hasGoldenFruit: false,
        fruitRegenTimerSec: 25,
        swayImpulse: 1.0,
        grazingBitesRemaining: eco.isAquaticFoodSource ? 5 : 0,
      };
      saveState.placedPlants.push(newPlant);
      // Consume 1 plant from owned bag when planted
      if ((saveState.ownedAssets[asset.id] ?? 0) > 0) {
        saveState.ownedAssets[asset.id] = Math.max(0, (saveState.ownedAssets[asset.id] ?? 1) - 1);
      }
    }

    if (!saveState.discoveredEcoDex.includes(asset.id)) {
      saveState.discoveredEcoDex.push(asset.id);
    }
    soundEngine.playPluckPop();
    persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
    renderDockCards();
    renderEntityCard();
    syncHudDOM();
    const placedDisplayName = getLocalizedAssetName(asset.id, asset.name, currentLang);
    const placedZoneName = getLocalizedZoneName(zoneId, currentLang);
    showToast(getGameString('placedIn', currentLang).replace('{name}', placedDisplayName).replace('{zone}', placedZoneName));
  }

  function handleDropFoodOnWorld(
    foodId: string,
    worldX: number,
    worldY: number,
    zoneId: HabitatZoneId,
  ): void {
    const have = saveState.foodInventory[foodId] ?? 0;
    if (have <= 0) return;

    const foodSpec = FOOD_CATALOG[foodId];
    if (!foodSpec) return;

    let bestAnimal: PlacedAnimal | null = null;
    let bestDist = Infinity;
    for (const a of saveState.placedAnimals) {
      const reach = Math.max(70, 125 * getAnimalVisualSize(a.assetId));
      const d = Math.hypot(a.x - worldX, a.y - worldY);
      if (d < reach && d < bestDist) {
        bestDist = d;
        bestAnimal = a;
      }
    }

    if (bestAnimal) {
      const rawName = ASSET_ECO_CONFIG[bestAnimal.assetId]?.name || 'Animal';
      const displayName = bestAnimal.customName || getLocalizedAssetName(bestAnimal.assetId, rawName, currentLang);
      const locFood = getLocalizedFoodName(foodSpec.id, foodSpec.name, currentLang);
      if (!canAnimalEatFood(bestAnimal.assetId, foodId)) {
        soundEngine.playRejectBoing();
        showToast(getGameString('doesNotEat', currentLang).replace('{name}', displayName).replace('{food}', locFood));
        return;
      }
      saveState.foodInventory[foodId] = Math.max(0, have - 1);
      startAnimalEating(bestAnimal, foodId);
      renderDockCards();
      persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
      return;
    }

    // Food left on the ground must belong to that habitat (no durians on the coral reef,
    // no honeycomb in the river)
    if (!foodSpec.allowedZones.includes(zoneId)) {
      soundEngine.playRejectBoing();
      const locFood = getLocalizedFoodName(foodId, foodSpec.name, currentLang);
      const locZone = getLocalizedZoneName(zoneId, currentLang);
      showToast(getGameString('doesNotBelongIn', currentLang).replace('{food}', locFood).replace('{zone}', locZone), 2600);
      return;
    }

    saveState.foodInventory[foodId] = Math.max(0, have - 1);
    const groundY = getFoodRestY(foodId, worldX);
    saveState.droppedFoods.push({
      uid: `df_${Date.now()}_${Math.random()}`,
      foodId,
      zoneId,
      x: worldX,
      y: Math.min(worldY, groundY - 20),
      vy: 0,
      groundY,
      isGolden: false,
      bitesRemaining: 1,
      createdAtSec: performance.now() / 1000,
    });
    soundEngine.playPluckPop();
    renderDockCards();
    persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
  }

  /**
   * Where a dropped food comes to rest: fruit floats at the water surface, plankton drifts in
   * the water column, everything else sinks to the riverbed/seabed or lies on the ground.
   */
  function getFoodRestY(foodId: string, worldX: number): number {
    const floorY = getTerrainFloorY(worldX, viewportHeight);
    const waterY = getWaterSurfaceY(worldX, viewportHeight);
    if (waterY === null) return floorY - 18;
    const category = FOOD_CATALOG[foodId]?.category;
    if (category === 'fruit') return waterY + 6;
    if (category === 'plankton') return waterY + (floorY - waterY) * 0.3;
    return floorY - 18;
  }

  /** Grazing an aquatic plant in place: the animal eats the plant itself, not a store item. */
  function startAnimalGrazing(animal: PlacedAnimal, plant: PlacedPlant): void {
    const eco = ASSET_ECO_CONFIG[plant.assetId];
    const dropFood = eco?.producesFruitId;
    plant.grazingBitesRemaining = Math.max(0, (plant.grazingBitesRemaining ?? 5) - 1);
    plant.swayImpulse = 1;
    if (dropFood && FOOD_CATALOG[dropFood]) {
      startAnimalEating(animal, dropFood, false);
      return;
    }
    animal.eatingStage = 'pickup';
    animal.eatingTimerSec = 1.8;
    animal.eatingFoodId = undefined;
    animal.hunger = Math.min(100, animal.hunger + 30);
    recordAnimalCareInteraction(animal, 10);
    animal.currentEmotion = 'laugh';
    animal.emotionTimerSec = 3.5;
    animal.locoBlend = 0;
    soundEngine.playEatMunch();
    renderEntityCard();
  }

  function startAnimalEating(animal: PlacedAnimal, foodId: string, isGolden = false): void {
    const foodSpec = FOOD_CATALOG[foodId];
    animal.eatingStage = 'pickup';
    animal.eatingTimerSec = 1.8;
    animal.eatingFoodId = foodId;
    animal.hunger = Math.min(
      100,
      animal.hunger + (foodSpec?.hungerRestore ?? 35) * (isGolden ? 1.5 : 1),
    );
    recordAnimalCareInteraction(animal, 18);
    animal.currentEmotion = 'laugh';
    animal.emotionTimerSec = 3.5;
    animal.locoBlend = 0;

    soundEngine.playEatMunch();
    awardGreenbits(
      (foodSpec?.greenbitsBonus ?? 12) * (isGolden ? 3 : 1),
      animal.x,
      animal.y - 45,
    );
    renderEntityCard();
  }

  // ============================================================================
  // WORLD CANVAS 2D PANNING (X & Y), DIRECT ANIMAL DRAG & DROP, + ANTI-SPAM EMOTES
  // ============================================================================
  let pressedAnimalOnCanvas: PlacedAnimal | null = null;
  let isPinching = false;
  let initialPinchDistance = 0;
  let initialPinchZoom = 1.0;

  worldCanvas.addEventListener('pointerdown', (e) => {
    if (activeDrag || isPinching) return;
    isPanningWorld = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panStartCameraX = targetCameraX;
    panStartCameraY = targetCameraY;
    pointerMovedDistance = 0;
    lastScratchAnimalUid = null;
    scratchAccumulatedPx = 0;
    const pt = screenToWorld(e.clientX, e.clientY);
    pressedAnimalOnCanvas = findAnimalAtPoint(pt.x, pt.y);
    try {
      worldCanvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore synthetic events
    }
  });

  worldCanvas.addEventListener('pointermove', (e) => {
    if (!isPanningWorld || activeDrag || isPinching) return;
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;
    pointerMovedDistance = Math.max(pointerMovedDistance, Math.hypot(dx, dy));

    // If user pressed directly on an already-placed animal in the world and drags it, start drag-and-drop reposition!
    if (pressedAnimalOnCanvas && pointerMovedDistance > 14) {
      const animalToDrag = pressedAnimalOnCanvas;
      pressedAnimalOnCanvas = null;
      isPanningWorld = false;
      try {
        worldCanvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      const asset = ROSTER_ASSETS.find((a) => a.id === animalToDrag.assetId);
      startDraggingItem({
        kind: 'reposition_animal',
        id: animalToDrag.assetId,
        placedUid: animalToDrag.uid,
        label: animalToDrag.customName || asset?.name || 'Animal',
        thumbUrl: getAssetThumbnailDataUrl(animalToDrag.assetId),
        pointerX: e.clientX,
        pointerY: e.clientY,
      });
      return;
    }

    const worldPt = screenToWorld(e.clientX, e.clientY);
    const hitAnimal = findAnimalAtPoint(worldPt.x, worldPt.y);
    if (hitAnimal && Math.abs(e.movementX) + Math.abs(e.movementY) > 2 && pointerMovedDistance < 42) {
      if (lastScratchAnimalUid === hitAnimal.uid) {
        scratchAccumulatedPx += Math.hypot(e.movementX, e.movementY);
        if (scratchAccumulatedPx > 65) {
          scratchAccumulatedPx = 0;
          triggerAnimalEmoteWithAntiSpam(hitAnimal, 'pet');
        }
      } else {
        lastScratchAnimalUid = hitAnimal.uid;
        scratchAccumulatedPx = 0;
      }
      return;
    }

    targetCameraX = clamp(
      panStartCameraX - (dx * 1.15) / viewScale / cameraZoom,
      0,
      Math.max(0, WORLD_WIDTH - viewportWidth),
    );
    targetCameraY = clamp(
      panStartCameraY - (dy * 1.05) / viewScale / cameraZoom,
      -viewportHeight * 0.85,
      viewportHeight * 2.65,
    );
  });

  // 2-Finger Touch Pinch-to-Zoom (diminish or expand the game world)
  worldCanvas.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length === 2) {
        isPinching = true;
        isPanningWorld = false;
        pressedAnimalOnCanvas = null;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialPinchDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        initialPinchZoom = targetCameraZoom;
      }
    },
    { passive: false },
  );

  worldCanvas.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length === 2 && isPinching) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (initialPinchDistance > 10 && currentDist > 10) {
          const factor = currentDist / initialPinchDistance;
          // Same limits as the renderer, so taps keep landing where the finger is
          targetCameraZoom = clamp(initialPinchZoom * factor, MIN_ZOOM, MAX_ZOOM);
        }
      }
    },
    { passive: false },
  );

  const endPinchGesture = () => {
    isPinching = false;
    initialPinchDistance = 0;
  };
  worldCanvas.addEventListener('touchend', endPinchGesture);
  worldCanvas.addEventListener('touchcancel', endPinchGesture);

  // Mouse wheel vertical/horizontal exploration + trackpad pinch zoom
  worldCanvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Trackpad / browser pinch gesture
        const zoomDelta = -e.deltaY * 0.005;
        targetCameraZoom = clamp(targetCameraZoom + zoomDelta, MIN_ZOOM, MAX_ZOOM);
        return;
      }
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        targetCameraX = clamp(
          targetCameraX + (e.deltaX * 1.2) / viewScale / cameraZoom,
          0,
          Math.max(0, WORLD_WIDTH - viewportWidth),
        );
      } else {
        targetCameraY = clamp(
          targetCameraY + (e.deltaY * 0.85) / viewScale / cameraZoom,
          -viewportHeight * 0.85,
          viewportHeight * 2.65,
        );
      }
    },
    { passive: false },
  );

  const endWorldPan = (e: PointerEvent) => {
    pressedAnimalOnCanvas = null;
    if (!isPanningWorld) return;
    isPanningWorld = false;
    try {
      worldCanvas.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (pointerMovedDistance < 10) {
      const pt = screenToWorld(e.clientX, e.clientY);
      handleWorldTap(pt.x, pt.y);
    }
  };

  worldCanvas.addEventListener('pointerup', endWorldPan);
  worldCanvas.addEventListener('pointercancel', endWorldPan);

  function findAnimalAtPoint(worldX: number, worldY: number): PlacedAnimal | null {
    // Hit area follows the drawn body size, with a finger-sized minimum for small species
    let best: PlacedAnimal | null = null;
    let bestD = Infinity;
    for (let i = saveState.placedAnimals.length - 1; i >= 0; i--) {
      const a = saveState.placedAnimals[i];
      const r = clamp(78 * getAnimalVisualSize(a.assetId), 38, 150);
      const d = Math.hypot(a.x - worldX, a.y - worldY);
      if (d <= r && d < bestD) {
        best = a;
        bestD = d;
      }
    }
    return best;
  }

  function findPlantAtPoint(worldX: number, worldY: number): PlacedPlant | null {
    // Tapping anywhere on the trunk or crown counts, not only a circle around the roots
    for (let i = saveState.placedPlants.length - 1; i >= 0; i--) {
      const p = saveState.placedPlants[i];
      const { w, h } = getPlantDrawSize(p);
      const halfW = Math.max(40, w * 0.35);
      if (Math.abs(p.x - worldX) <= halfW && worldY <= p.y + 30 && worldY >= p.y - Math.max(74, h * 0.85)) {
        return p;
      }
    }
    return null;
  }

  /**
   * Enforces:
   * 1. Silent 2-second (2000ms) emote cooldown (not shown in UI).
   * 2. If spammed repeatedly during the 2-second cooldown, the animal becomes Angry!
   * 3. When doing an emote, the animal stops moving on site for 3.5 seconds (3-4s) before resuming idle walking.
   */
  function triggerAnimalEmoteWithAntiSpam(animal: PlacedAnimal, mode: 'tap' | 'pet'): void {
    const nowMs = Date.now();
    const rawAnimalName = ASSET_ECO_CONFIG[animal.assetId]?.name || 'Animal';
    const displayName = animal.customName || getLocalizedAssetName(animal.assetId, rawAnimalName, currentLang);
    const sinceLastEmoteMs = nowMs - (animal.lastEmoteTriggerMs ?? 0);
    const sinceLastTapMs = nowMs - (animal.lastTapMs ?? 0);
    animal.lastTapMs = nowMs;

    selectedAnimalUid = animal.uid;

    // Silent 2-second cooldown check
    if (sinceLastEmoteMs < 2000) {
      animal.emoteSpamCount = (sinceLastTapMs < 1500 ? (animal.emoteSpamCount ?? 0) : 0) + 1;
      // When spammed too much during cooldown -> animal gets Angry!
      if (animal.emoteSpamCount >= 2) {
        animal.currentEmotion = 'angry';
        animal.emotionTimerSec = 3.8;
        animal.locoBlend = 0;
        animal.vx = 0;
        animal.lastEmoteTriggerMs = nowMs;
        animal.emoteSpamCount = 0;
        soundEngine.playRejectBoing();
        renderEntityCard();
        showToast(getGameString('isAngry', currentLang).replace('{name}', displayName));
      } else {
        renderEntityCard();
      }
      return;
    }

    animal.emoteSpamCount = 0;
    animal.lastEmoteTriggerMs = nowMs;
    // Stop walking on site for 3.5 seconds (3-4s)
    animal.locoBlend = 0;
    animal.vx = 0;

    // Waking a resting animal (by its own schedule: nocturnal species sleep by day)
    if (isAnimalResting(animal.assetId, saveState.timeOfDayHours) && animal.emotionTimerSec <= 0) {
      const reaction = rollSleepingTouchReaction(Math.random());
      animal.currentEmotion = reaction;
      animal.emotionTimerSec = 3.6;
      renderEntityCard();
      if (reaction === 'angry') {
        soundEngine.playRejectBoing();
        showToast(getGameString('isAngry', currentLang).replace('{name}', displayName));
      } else {
        soundEngine.playWaveChirp();
        showToast(getGameString('isCurious', currentLang).replace('{name}', displayName));
      }
      return;
    }

    if (mode === 'pet') {
      animal.currentEmotion = 'laugh';
      animal.emotionTimerSec = 3.6;
      recordAnimalCareInteraction(animal, 12);
      soundEngine.playLaughGiggle();
      awardGreenbits(10, animal.x, animal.y - 48);
      renderEntityCard();
      showToast(getGameString('isHappy', currentLang).replace('{name}', displayName));
      return;
    }

    const reaction = rollAwakeTapReaction(Math.random());
    animal.currentEmotion = reaction;
    animal.emotionTimerSec = 3.6;
    recordAnimalCareInteraction(animal, 8);
    soundEngine.playWaveChirp();
    renderEntityCard();
    showToast(
      reaction === 'waving'
        ? getGameString('waves', currentLang).replace('{name}', displayName)
        : getGameString('isCurious', currentLang).replace('{name}', displayName),
    );
  }

  function handleWorldTap(worldX: number, worldY: number): void {
    // 1. Check if tapping a shore shell
    for (const sh of shoreShells) {
      if (Math.hypot(sh.x - worldX, sh.y - worldY) < 32) {
        awardGreenbits(15, sh.x, sh.y - 20);
        sh.x += (Math.random() > 0.5 ? 1 : -1) * (120 + Math.random() * 240);
        return;
      }
    }

    // 2. Check if tapping a dropped fruit/food
    for (const df of saveState.droppedFoods) {
      if (Math.hypot(df.x - worldX, df.y - worldY) < 36) {
        saveState.foodInventory[df.foodId] = (saveState.foodInventory[df.foodId] ?? 0) + 1;
        saveState.droppedFoods = saveState.droppedFoods.filter((item) => item.uid !== df.uid);
        soundEngine.playPluckPop();
        renderDockCards();
        persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
        const fSpec = FOOD_CATALOG[df.foodId];
        const foodName = getLocalizedFoodName(df.foodId, fSpec?.name ?? 'Food', currentLang);
        showToast(getGameString('collectedFood', currentLang).replace('{food}', foodName));
        return;
      }
    }

    // 3. Check if tapping a Teleport Tower in the world
    for (const tower of TELEPORT_TOWERS) {
      const tFloorY = getTerrainFloorY(tower.worldX, viewportHeight);
      if (Math.hypot(tower.worldX - worldX, (tFloorY - 48) - worldY) < 62) {
        openTeleportMapModal(tower.id);
        return;
      }
    }

    // 4. Check if tapping an animal
    const hitAnimal = findAnimalAtPoint(worldX, worldY);
    if (hitAnimal) {
      triggerAnimalEmoteWithAntiSpam(hitAnimal, 'tap');
      return;
    }

    // 5. Check if tapping a plant (Sway + Pluck ripe fruit when growthStage === 3)
    const hitPlant = findPlantAtPoint(worldX, worldY);
    if (hitPlant) {
      hitPlant.swayImpulse = 1.0;
      const eco = ASSET_ECO_CONFIG[hitPlant.assetId];
      const asset = ROSTER_ASSETS.find((a) => a.id === hitPlant.assetId);
      if (hitPlant.growthStage >= 3 && hitPlant.fruitCount > 0 && eco?.producesFruitId) {
        hitPlant.fruitCount -= 1;
        const isGolden = hitPlant.hasGoldenFruit || Math.random() < 0.12;
        hitPlant.hasGoldenFruit = false;
        const dropX = hitPlant.x + (Math.random() - 0.5) * 44;
        const groundY = getFoodRestY(eco.producesFruitId, dropX);
        // Fruit falls from where it hangs in the crown; shoots and seagrass are picked at the base
        const growsAtBase =
          eco.producesFruitId === 'food_bamboo_shoots' || eco.producesFruitId === 'food_seaweed_kelp';
        const startY = growsAtBase ? hitPlant.y - 14 : hitPlant.y - getPlantDrawSize(hitPlant).h * 0.5;
        saveState.droppedFoods.push({
          uid: `fruit_${Date.now()}_${Math.random()}`,
          foodId: eco.producesFruitId,
          zoneId: hitPlant.zoneId,
          x: dropX,
          y: Math.min(startY, groundY - 4),
          vy: -65,
          groundY,
          isGolden,
          bitesRemaining: 1,
          createdAtSec: performance.now() / 1000,
        });
        soundEngine.playPluckPop();
        const foodSpec = FOOD_CATALOG[eco.producesFruitId];
        const foodName = getLocalizedFoodName(eco.producesFruitId, foodSpec?.name ?? 'fruit', currentLang);
        const plantName = getLocalizedAssetName(hitPlant.assetId, asset?.name ?? 'plant', currentLang);
        showToast(getGameString('harvestedFoodFrom', currentLang).replace('{food}', foodName).replace('{plant}', plantName));
      } else if (hitPlant.growthStage < 3) {
        soundEngine.playWaveChirp();
        const plantName = getLocalizedAssetName(hitPlant.assetId, asset?.name ?? 'Plant', currentLang);
        const growthStageText =
          hitPlant.growthStage === 1
            ? getGameString('growthSprouting', currentLang)
            : getGameString('growthBlooming', currentLang);
        showToast(
          getGameString('plantGrowing', currentLang).replace('{plant}', plantName).replace('{growth}', growthStageText),
        );
      } else {
        soundEngine.playWaveChirp();
      }
      persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
      return;
    }

    selectedAnimalUid = null;
    renderEntityCard();
  }

  // ============================================================================
  // SIMPLIFIED 4-ITEM ANIMAL INSPECTOR CARD
  // Strict 4 items only:
  // (i) Name (changeable)
  // (ii) Love Lv.xx (pink color, max 5 — requires 1-3 weeks care)
  // (iii) Fullness
  // (iv) Condition: xxx
  // ============================================================================
  function renderEntityCard(): void {
    if (isHudHidden || !selectedAnimalUid) {
      entityCard.style.display = 'none';
      return;
    }

    const animal = saveState.placedAnimals.find((a) => a.uid === selectedAnimalUid);
    if (!animal) {
      entityCard.style.display = 'none';
      return;
    }

    const asset = ROSTER_ASSETS.find((r) => r.id === animal.assetId);
    const loveLevel = computeAnimalLoveLevel(animal);
    const night = isAnimalResting(animal.assetId, saveState.timeOfDayHours);
    const conditionText = getAnimalConditionText(animal, night);
    const fullnessPct = Math.max(0, Math.min(100, Math.round(animal.hunger)));

    entityCard.style.display = 'flex';
    entityCard.innerHTML = '';

    // (i) Name (changeable)
    const nameRow = document.createElement('div');
    nameRow.className = 'entity-item-row';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'entity-name-input';
    nameInput.value = animal.customName || asset?.name || 'Animal';
    nameInput.setAttribute('aria-label', 'Animal Name');
    nameInput.addEventListener('change', () => {
      animal.customName = nameInput.value.trim() || (asset?.name ?? 'Animal');
      persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
    });
    nameRow.appendChild(nameInput);

    // (ii) Standalone <SVG> Lv. x (pink color, max 5, without rounded container)
    const loveRow = document.createElement('div');
    loveRow.className = 'entity-item-row';
    const loveStandalone = document.createElement('span');
    loveStandalone.className = 'love-standalone';
    loveStandalone.innerHTML = `${HEART_SVG_ICON}<span>Lv. ${loveLevel}</span>`;
    loveRow.appendChild(loveStandalone);

    // (iii) Fullness
    const fullnessWrap = document.createElement('div');
    fullnessWrap.className = 'fullness-wrap';
    const fullnessHeader = document.createElement('div');
    fullnessHeader.className = 'fullness-header';
    const fullnessLabel = getGameString('fullness', currentLang);
    const condLabel = getGameString('condition', currentLang);
    fullnessHeader.innerHTML = `<span>${fullnessLabel}</span><span>${fullnessPct}%</span>`;
    const barTrack = document.createElement('div');
    barTrack.className = 'hunger-bar-track';
    const barFill = document.createElement('div');
    barFill.className = 'hunger-bar-fill';
    barFill.style.width = `${Math.max(4, fullnessPct)}%`;
    if (fullnessPct <= 25) {
      barFill.style.background = '#ba1a1a';
    }
    barTrack.appendChild(barFill);
    fullnessWrap.append(fullnessHeader, barTrack);

    // (iv) Condition: xxx
    const condRow = document.createElement('div');
    condRow.className = 'condition-row';
    condRow.textContent = `${condLabel}: ${conditionText}`;

    // (v) Recall / Store in Bag button
    const recallBtn = document.createElement('button');
    recallBtn.type = 'button';
    recallBtn.className = 'entity-recall-btn';
    recallBtn.textContent = getGameString('recallToBag', currentLang);
    recallBtn.addEventListener('click', () => {
      const idx = saveState.placedAnimals.findIndex((a) => a.uid === animal.uid);
      if (idx !== -1) {
        const removed = saveState.placedAnimals.splice(idx, 1)[0];
        selectedAnimalUid = saveState.placedAnimals[0]?.uid ?? null;
        soundEngine.playCoinChime();
        const animalName = removed.customName || getLocalizedAssetName(removed.assetId, 'Animal', currentLang);
        showToast(
          currentLang === '中文'
            ? `已将 ${animalName} 收回背包`
            : currentLang === 'Bahasa Melayu'
            ? `${animalName} telah disimpan semula ke dalam beg`
            : currentLang === 'தமிழ்'
            ? `${animalName} பையில் சேர்க்கப்பட்டது`
            : `Returned ${animalName} to your bag`
        );
        renderEntityCard();
        renderDockCards();
        persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
      }
    });

    entityCard.append(nameRow, loveRow, fullnessWrap, condRow, recallBtn);
  }

  function syncHudDOM(): void {
    const storeBal = document.getElementById('store-gb-balance');
    if (storeBal) storeBal.textContent = String(saveState.greenbits);
    const centerZoneId = getZoneAtWorldX(cameraX + viewportWidth * 0.5);
    const isNight = isNightTime(saveState.timeOfDayHours);

    document.body.dataset.zone = centerZoneId;
    document.body.dataset.weather = saveState.currentWeather;
    document.body.dataset.timePhase = isNight ? 'night' : 'day';
    document.body.dataset.greenbits = String(saveState.greenbits);
    document.body.dataset.animalsCount = String(saveState.placedAnimals.length);
    document.body.dataset.plantsCount = String(saveState.placedPlants.length);
  }

  // ============================================================================
  // STANDALONE "ARE YOU SURE YOU WANT TO BUY?" CARD (Styled like logout confirm)
  // ============================================================================
  function openBuyConfirmationDialog({
    itemName,
    price,
    thumbSrc,
    onConfirm,
  }: {
    itemName: string;
    price: number;
    thumbSrc: string;
    onConfirm: () => void;
  }): void {
    const existing = document.getElementById('buy-confirm-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop buy-confirm-backdrop';
    backdrop.id = 'buy-confirm-modal';
    backdrop.setAttribute('role', 'dialog');

    const card = document.createElement('div');
    card.className = 'dialog login-required-dialog logout-confirm-dialog';
    card.style.maxWidth = '380px';
    card.style.padding = '24px 20px';
    card.style.position = 'relative';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'dialog-close';
    closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('aria-label', getGameString('cancel', currentLang));
    closeBtn.addEventListener('click', () => backdrop.remove());

    const itemImg = document.createElement('img');
    itemImg.src = thumbSrc;
    itemImg.alt = itemName;
    itemImg.style.width = '76px';
    itemImg.style.height = '76px';
    itemImg.style.objectFit = 'contain';
    itemImg.style.margin = '0 auto 12px';

    const heading = document.createElement('h2');
    heading.textContent = getGameString('buyConfirmTitle', currentLang);
    heading.style.margin = '0 0 8px';
    heading.style.textAlign = 'center';

    const prompt = document.createElement('p');
    const priceSpan = `<span style="display:inline-flex;align-items:center;gap:4px;font-weight:700;">${GB_LOGO_HTML} ${price}</span>`;
    const promptText =
      currentLang === '中文'
        ? `确定要使用 ${priceSpan} 兑换 <strong>${itemName}</strong> 吗？`
        : currentLang === 'Bahasa Melayu'
        ? `Adakah anda pasti mahu membeli <strong>${itemName}</strong> dengan harga ${priceSpan}?`
        : currentLang === 'தமிழ்'
        ? `${priceSpan} செலுத்தி <strong>${itemName}</strong> வாங்க விரும்புகிறீர்களா?`
        : `Are you sure you want to buy <strong>${itemName}</strong> for ${priceSpan}?`;
    prompt.innerHTML = promptText;
    prompt.style.margin = '0 0 20px';
    prompt.style.textAlign = 'center';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'primary-button';
    confirmBtn.style.width = '100%';
    confirmBtn.style.minHeight = '48px';
    confirmBtn.style.marginBottom = '10px';
    confirmBtn.textContent = getGameString('confirmBuy', currentLang);
    confirmBtn.addEventListener('click', () => {
      backdrop.remove();
      onConfirm();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'text-button';
    cancelBtn.style.width = '100%';
    cancelBtn.textContent = getGameString('cancel', currentLang);
    cancelBtn.addEventListener('click', () => backdrop.remove());

    card.append(closeBtn, itemImg, heading, prompt, confirmBtn, cancelBtn);
    backdrop.appendChild(card);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.remove();
    });
    root!.appendChild(backdrop);
  }

  // ============================================================================
  // SEPARATE POPUP CARD FOR (i) CHARACTERISTICS & GOOGLE SEARCH REDIRECT
  // Shorter descriptions with bolded keywords, localized per language
  // ============================================================================
  function openCharacteristicsPopupCard(
    itemId: string,
    itemName: string,
    sentences: [string, string],
    searchQuery: string,
  ): void {
    const existing = document.getElementById('species-info-popup');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'info-popup-backdrop';
    backdrop.id = 'species-info-popup';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-label', `${itemName} Information`);

    const card = document.createElement('div');
    card.className = 'info-popup-card';

    const header = document.createElement('div');
    header.className = 'info-popup-header';

    const title = document.createElement('h3');
    title.className = 'info-popup-title';
    title.textContent = itemName;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close-btn';
    closeBtn.textContent = getGameString('close', currentLang);
    closeBtn.addEventListener('click', () => backdrop.remove());

    header.append(title, closeBtn);

    const text = document.createElement('p');
    text.className = 'info-popup-text';
    text.innerHTML = getShortDescriptionWithBold(itemId, sentences, currentLang);

    const link = document.createElement('a');
    link.className = 'info-click-me-link';
    link.href = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = getGameString('learnMore', currentLang);

    card.append(header, text, link);
    backdrop.appendChild(card);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.remove();
    });
    root!.appendChild(backdrop);
  }

  // ============================================================================
  // MODAL 1: CUTE & CLEAN SANCTUARY STORE
  // Only Name + (i) SVG on right of name + Buy button with Greenbit logo
  // ============================================================================
  function openStoreModal(initialTab: StoreTab = 'animals'): void {
    activeStoreTab = initialTab;
    const existing = document.getElementById('store-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'store-modal';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-label', getGameString('storeTitle', currentLang));

    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet';

    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('h2');
    title.className = 'modal-title';
    title.innerHTML = `${CART_SVG_ICON}<span>${getGameString('storeTitle', currentLang)}</span> <span class="store-balance-badge">${GB_LOGO_HTML}<span id="store-gb-balance">${saveState.greenbits}</span></span>`;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close-btn';
    closeBtn.textContent = getGameString('close', currentLang);
    closeBtn.addEventListener('click', () => backdrop.remove());

    header.append(title, closeBtn);

    const body = document.createElement('div');
    body.className = 'modal-body';

    const tabsRow = document.createElement('div');
    tabsRow.className = 'store-tabs';

    const tabSpecs: Array<{ id: StoreTab; label: string }> = [
      { id: 'animals', label: getGameString('animalsTab', currentLang) },
      { id: 'plants', label: getGameString('plantsTab', currentLang) },
      { id: 'food', label: getGameString('foodTab', currentLang) },
    ];

    let storeSearchQuery = '';

    const searchRow = document.createElement('div');
    searchRow.className = 'store-search-row';
    searchRow.style.display = 'flex';
    searchRow.style.alignItems = 'center';
    searchRow.style.gap = '10px';
    searchRow.style.padding = '8px 16px';
    searchRow.style.margin = '4px 0 14px';
    searchRow.style.background = 'var(--surface-container, rgba(0, 44, 23, 0.05))';
    searchRow.style.borderRadius = '999px';
    searchRow.style.border = '1.5px solid rgba(0, 44, 23, 0.18)';

    const searchIcon = document.createElement('span');
    searchIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6;display:block;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.className = 'store-search-input';
    searchInput.placeholder = getGameString('searchPlaceholder', currentLang);
    searchInput.style.border = 'none';
    searchInput.style.background = 'transparent';
    searchInput.style.outline = 'none';
    searchInput.style.width = '100%';
    searchInput.style.fontSize = '14px';
    searchInput.style.fontFamily = 'inherit';
    searchInput.style.color = 'inherit';
    searchInput.addEventListener('input', () => {
      storeSearchQuery = searchInput.value.trim().toLowerCase();
      renderStoreContent();
    });

    searchRow.append(searchIcon, searchInput);

    const grid = document.createElement('div');
    grid.className = 'store-grid';

    const renderStoreContent = () => {
      const balEl = document.getElementById('store-gb-balance');
      if (balEl) balEl.textContent = String(saveState.greenbits);
      tabsRow.innerHTML = '';
      for (const t of tabSpecs) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'store-tab-btn';
        b.textContent = t.label;
        b.setAttribute('aria-pressed', String(t.id === activeStoreTab));
        b.addEventListener('click', () => {
          activeStoreTab = t.id;
          renderStoreContent();
        });
        tabsRow.appendChild(b);
      }

      grid.innerHTML = '';
      if (activeStoreTab === 'food') {
        const filteredFood = foodList.filter((food) => {
          if (!storeSearchQuery) return true;
          const loc = getLocalizedFoodName(food.id, food.name, currentLang).toLowerCase();
          return loc.includes(storeSearchQuery) || food.name.toLowerCase().includes(storeSearchQuery);
        });

        if (filteredFood.length === 0) {
          const empty = document.createElement('div');
          empty.style.gridColumn = '1 / -1';
          empty.style.textAlign = 'center';
          empty.style.padding = '36px 16px';
          empty.style.color = 'var(--ink-soft, #6b7280)';
          empty.style.fontSize = '14px';
          empty.textContent = getGameString('noStoreResults', currentLang);
          grid.appendChild(empty);
        }

        for (const food of filteredFood) {
          const card = document.createElement('div');
          card.className = 'store-item-card';

          const thumb = document.createElement('img');
          thumb.className = 'store-item-thumb';
          const foodThumbUrl = getFoodThumbnailDataUrl(food.id);
          thumb.src = foodThumbUrl;
          thumb.alt = food.name;

          const nameRow = document.createElement('div');
          nameRow.className = 'store-item-name-row';

          const name = document.createElement('div');
          name.className = 'store-item-name';
          const localizedFoodTitle = getLocalizedFoodName(food.id, food.name, currentLang);
          name.textContent = localizedFoodTitle;

          const infoBtn = document.createElement('button');
          infoBtn.type = 'button';
          infoBtn.className = 'info-svg-btn';
          infoBtn.setAttribute('aria-label', `About ${localizedFoodTitle}`);
          infoBtn.innerHTML = INFO_SVG_ICON;
          infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openCharacteristicsPopupCard(food.id, localizedFoodTitle, food.infoSentences, food.searchQuery);
          });

          nameRow.append(name, infoBtn);

          const buyBtn = document.createElement('button');
          buyBtn.type = 'button';
          buyBtn.className = 'buy-btn';
          buyBtn.disabled = saveState.greenbits < food.price;
          buyBtn.innerHTML = `<span>${getGameString('buyPrefix', currentLang)} (</span>${GB_LOGO_HTML}<span>${food.price})</span>`;
          buyBtn.addEventListener('click', () => {
            if (saveState.greenbits < food.price) {
              showToast(getGameString('notEnoughGreenbits', currentLang));
              return;
            }
            openBuyConfirmationDialog({
              itemName: localizedFoodTitle,
              price: food.price,
              thumbSrc: foodThumbUrl,
              onConfirm: () => {
                if (saveState.greenbits < food.price) return;
                saveState.greenbits -= food.price;
                options?.onBalanceChange?.(saveState.greenbits);
                saveState.foodInventory[food.id] = (saveState.foodInventory[food.id] ?? 0) + 1;
                soundEngine.playCoinChime();
                persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
                renderDockCards();
                syncHudDOM();
                renderStoreContent();
                showToast(`${getGameString('bought', currentLang)} ${localizedFoodTitle}`);
              },
            });
          });

          card.append(thumb, nameRow, buyBtn);
          grid.appendChild(card);
        }
      } else {
        const isAnimTab = activeStoreTab === 'animals';
        const items = ROSTER_ASSETS.filter((a) => a.isAnimal === isAnimTab);
        const filteredItems = items.filter((asset) => {
          if (!storeSearchQuery) return true;
          const loc = getLocalizedAssetName(asset.id, asset.name, currentLang).toLowerCase();
          return loc.includes(storeSearchQuery) || asset.name.toLowerCase().includes(storeSearchQuery);
        });

        if (filteredItems.length === 0) {
          const empty = document.createElement('div');
          empty.style.gridColumn = '1 / -1';
          empty.style.textAlign = 'center';
          empty.style.padding = '36px 16px';
          empty.style.color = 'var(--ink-soft, #6b7280)';
          empty.style.fontSize = '14px';
          empty.textContent = getGameString('noStoreResults', currentLang);
          grid.appendChild(empty);
        }

        for (const asset of filteredItems) {
          const eco = ASSET_ECO_CONFIG[asset.id];
          const price = eco?.price ?? (isAnimTab ? 220 : 110);

          const card = document.createElement('div');
          card.className = 'store-item-card';

          const thumb = document.createElement('img');
          thumb.className = 'store-item-thumb';
          bindAssetThumbnailImage(thumb, asset.id);
          thumb.alt = asset.name;

          const nameRow = document.createElement('div');
          nameRow.className = 'store-item-name-row';

          const name = document.createElement('div');
          name.className = 'store-item-name';
          const localizedAssetTitle = getLocalizedAssetName(asset.id, asset.name, currentLang);
          name.textContent = localizedAssetTitle;

          const infoBtn = document.createElement('button');
          infoBtn.type = 'button';
          infoBtn.className = 'info-svg-btn';
          infoBtn.setAttribute('aria-label', `About ${localizedAssetTitle}`);
          infoBtn.innerHTML = INFO_SVG_ICON;
          infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sentences: [string, string] = eco?.infoSentences ?? [
              `${asset.name} is a native Malaysian species.`,
              `It thrives in the ${getZoneSpec(eco?.allowedZones[0] ?? 'forest').name}.`,
            ];
            const query = eco?.searchQuery ?? `${asset.name} Malaysia characteristics`;
            openCharacteristicsPopupCard(asset.id, localizedAssetTitle, sentences, query);
          });

          nameRow.append(name, infoBtn);

          const buyBtn = document.createElement('button');
          buyBtn.type = 'button';
          buyBtn.className = 'buy-btn';
          buyBtn.disabled = saveState.greenbits < price;
          buyBtn.innerHTML = `<span>${getGameString('buyPrefix', currentLang)} (</span>${GB_LOGO_HTML}<span>${price})</span>`;
          buyBtn.addEventListener('click', () => {
            if (saveState.greenbits < price) {
              showToast(getGameString('notEnoughGreenbits', currentLang));
              return;
            }
            openBuyConfirmationDialog({
              itemName: localizedAssetTitle,
              price,
              thumbSrc: getAssetThumbnailDataUrl(asset.id) || thumb.src,
              onConfirm: () => {
                if (saveState.greenbits < price) return;
                saveState.greenbits -= price;
                options?.onBalanceChange?.(saveState.greenbits);
                saveState.ownedAssets[asset.id] = (saveState.ownedAssets[asset.id] ?? 0) + 1;
                if (!saveState.discoveredEcoDex.includes(asset.id)) {
                  saveState.discoveredEcoDex.push(asset.id);
                }
                soundEngine.playCoinChime();
                persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
                renderDockCards();
                syncHudDOM();
                renderStoreContent();
                showToast(`${getGameString('bought', currentLang)} ${localizedAssetTitle}`);
              },
            });
          });

          card.append(thumb, nameRow, buyBtn);
          grid.appendChild(card);
        }
      }
    };

    renderStoreContent();
    body.append(tabsRow, searchRow, grid);
    sheet.append(header, body);
    backdrop.appendChild(sheet);
    root!.appendChild(backdrop);
  }

  // ============================================================================
  // MODAL 2: PUBG / GENSHIN SQUARE TACTICAL TELEPORT MAP & TURTLE LOADING SCENE
  // ============================================================================
  function openTeleportMapModal(preselectedTowerId?: string): void {
    const existing = document.getElementById('teleport-map-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'teleport-map-modal';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-label', getGameString('teleportTitle', currentLang));

    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet';

    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('h2');
    title.className = 'modal-title';
    title.textContent = getGameString('teleportTitle', currentLang);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close-btn';
    closeBtn.textContent = getGameString('close', currentLang);
    closeBtn.addEventListener('click', () => backdrop.remove());

    header.append(title, closeBtn);

    const body = document.createElement('div');
    body.className = 'modal-body';

    const layout = document.createElement('div');
    layout.className = 'teleport-map-layout';

    // Left: Square Tactical PUBG/Genshin Map Board with Grid & Waypoint Pins
    const board = document.createElement('div');
    board.className = 'square-map-board';

    const mapCanvas = document.createElement('canvas');
    mapCanvas.className = 'square-map-canvas';
    mapCanvas.width = 440;
    mapCanvas.height = 440;
    board.appendChild(mapCanvas);

    // Current camera position indicator ring and "You are here" marker
    const curMapX = clamp((cameraX + viewportWidth * 0.5) / WORLD_WIDTH, 0.04, 0.96) * 440;
    const curMapY = clamp(0.5 + cameraY / (viewportHeight * 2.4), 0.1, 0.9) * 440;

    // Draw tactical terrain & biome contours on the square map canvas (solid colors, no gradients)
    const mCtx = mapCanvas.getContext('2d');
    if (mCtx) {
      const biomeBands: Array<{ x0: number; x1: number; colTop: string; label: string }> = [
        { x0: 0, x1: 112, colTop: '#14532d', label: 'RAINFOREST' },
        { x0: 112, x1: 222, colTop: '#0e7490', label: 'RIVER POND' },
        { x0: 222, x1: 310, colTop: '#78350f', label: 'MUDFLATS' },
        { x0: 310, x1: 440, colTop: '#0369a1', label: 'CORAL SEA' },
      ];
      for (const b of biomeBands) {
        mCtx.fillStyle = b.colTop;
        mCtx.fillRect(b.x0, 0, b.x1 - b.x0, 440);

        mCtx.fillStyle = 'rgba(250, 250, 237, 0.55)';
        mCtx.font = '700 10px "Outfit", sans-serif';
        mCtx.textAlign = 'center';
        mCtx.fillText(b.label, (b.x0 + b.x1) * 0.5, 22);
      }

      // Sea Level 0 datum line across map
      mCtx.strokeStyle = 'rgba(174, 246, 130, 0.45)';
      mCtx.lineWidth = 1.5;
      mCtx.setLineDash([5, 5]);
      mCtx.beginPath();
      mCtx.moveTo(0, 220);
      mCtx.lineTo(440, 220);
      mCtx.stroke();
      mCtx.setLineDash([]);

      // Tactical PUBG-style 8x8 coordinate grid lines (A1..H8)
      mCtx.strokeStyle = 'rgba(250, 250, 237, 0.14)';
      mCtx.lineWidth = 1;
      const cell = 440 / 8;
      for (let i = 1; i < 8; i++) {
        mCtx.beginPath();
        mCtx.moveTo(i * cell, 0);
        mCtx.lineTo(i * cell, 440);
        mCtx.moveTo(0, i * cell);
        mCtx.lineTo(440, i * cell);
        mCtx.stroke();
      }

      // Current camera position radar ripple
      mCtx.strokeStyle = '#aef682';
      mCtx.lineWidth = 2.5;
      mCtx.beginPath();
      mCtx.arc(curMapX, curMapY, 14, 0, Math.PI * 2);
      mCtx.stroke();
      mCtx.fillStyle = 'rgba(174, 246, 130, 0.25)';
      mCtx.fill();
    }

    // "You are here" marker with Location Pin SVG
    const hereMarker = document.createElement('div');
    hereMarker.className = 'you-are-here-marker';
    hereMarker.style.left = `${(curMapX / 440) * 100}%`;
    hereMarker.style.top = `${(curMapY / 440) * 100}%`;
    hereMarker.innerHTML = `
      <div class="you-are-here-pill">
        ${LOCATION_PIN_SVG}
        <span>${getGameString('youAreHere', currentLang)}</span>
      </div>
      <div class="you-are-here-pulse-dot"></div>
    `;
    board.appendChild(hereMarker);

    // Right: List of Teleport Waypoint Towers (clean tower names only, no elevation/zone sub-labels)
    const listPanel = document.createElement('div');
    listPanel.className = 'tower-list-panel';

    for (const tower of TELEPORT_TOWERS) {
      const locTowerName = getLocalizedTowerName(tower.id, tower.name, currentLang);
      // Pin button on the square map
      const pinBtn = document.createElement('button');
      pinBtn.type = 'button';
      pinBtn.className = `tower-pin-btn ${tower.id === preselectedTowerId ? 'active' : ''}`;
      pinBtn.style.left = `${tower.mapNormX * 100}%`;
      pinBtn.style.top = `${tower.mapNormY * 100}%`;
      pinBtn.title = locTowerName;
      pinBtn.innerHTML = TOWER_SVG_ICON;
      pinBtn.addEventListener('click', () => {
        backdrop.remove();
        triggerTurtleTeleportLoadingScene(tower);
      });
      board.appendChild(pinBtn);

      // Row in the tower list (tower name only, no "Rainforest Land • Upper Rainforest Canopy (+45m)")
      const item = document.createElement('div');
      item.className = 'tower-list-item';

      const info = document.createElement('div');
      info.className = 'tower-list-info';

      const nameEl = document.createElement('div');
      nameEl.className = 'tower-list-name';
      nameEl.textContent = locTowerName;

      info.appendChild(nameEl);

      const goBtn = document.createElement('button');
      goBtn.type = 'button';
      goBtn.className = 'teleport-go-btn';
      goBtn.textContent = getGameString('teleportToPet', currentLang);
      goBtn.addEventListener('click', () => {
        backdrop.remove();
        triggerTurtleTeleportLoadingScene(tower);
      });

      item.append(info, goBtn);
      listPanel.appendChild(item);
    }

    layout.append(board, listPanel);
    body.appendChild(layout);
    sheet.append(header, body);
    backdrop.appendChild(sheet);
    root!.appendChild(backdrop);
  }

  // ============================================================================
  // MODAL: MY PETS & TELEPORT TO SPECIFIC PET (With search function bar)
  // ============================================================================
  function openPetsTeleportModal(): void {
    const existing = document.getElementById('pets-teleport-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop pets-teleport-backdrop';
    backdrop.id = 'pets-teleport-modal';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-label', getGameString('myPets', currentLang));

    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet pets-teleport-sheet';

    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('h2');
    title.className = 'modal-title';
    title.innerHTML = `${PET_PAW_SVG}<span>${getGameString('myPets', currentLang)}</span>`;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close-btn';
    closeBtn.textContent = getGameString('close', currentLang);
    closeBtn.addEventListener('click', () => backdrop.remove());

    header.append(title, closeBtn);

    const body = document.createElement('div');
    body.className = 'modal-body';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';

    // Search function bar on top
    const searchRow = document.createElement('div');
    searchRow.className = 'pets-search-row';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'pets-search-input';
    searchInput.placeholder = getGameString('searchPetsPlaceholder', currentLang);
    searchRow.appendChild(searchInput);

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'pets-cards-container';

    let filterText = '';

    const renderPetsList = () => {
      cardsContainer.innerHTML = '';
      const animals = saveState.placedAnimals;

      if (animals.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'pets-empty-state';
        empty.textContent = getGameString('noPetsInWorld', currentLang);
        cardsContainer.appendChild(empty);
        return;
      }

      const q = filterText.toLowerCase().trim();
      const filtered = animals.filter((animal) => {
        if (!q) return true;
        const asset = ROSTER_ASSETS.find((a) => a.id === animal.assetId);
        const localizedName = getLocalizedAssetName(animal.assetId, asset?.name || 'Pet', currentLang).toLowerCase();
        const customName = (animal.customName || '').toLowerCase();
        const zoneName = getLocalizedZoneName(animal.zoneId, currentLang).toLowerCase();
        return localizedName.includes(q) || customName.includes(q) || zoneName.includes(q);
      });

      if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'pets-empty-state';
        empty.textContent = getGameString('noPetsFound', currentLang);
        cardsContainer.appendChild(empty);
        return;
      }

      for (const animal of filtered) {
        const asset = ROSTER_ASSETS.find((a) => a.id === animal.assetId);
        const card = document.createElement('div');
        card.className = 'pet-teleport-card';

        const thumbWrap = document.createElement('div');
        thumbWrap.className = 'pet-card-thumb-wrap';
        const img = document.createElement('img');
        img.className = 'pet-card-thumb';
        bindAssetThumbnailImage(img, animal.assetId);
        img.alt = animal.customName || asset?.name || 'Pet';
        thumbWrap.appendChild(img);

        const info = document.createElement('div');
        info.className = 'pet-card-info';

        const topRow = document.createElement('div');
        topRow.className = 'pet-card-top-row';

        const nameEl = document.createElement('span');
        nameEl.className = 'pet-card-name';
        const animalDisplayName = animal.customName || getLocalizedAssetName(animal.assetId, asset?.name || 'Pet', currentLang);
        nameEl.textContent = animalDisplayName;

        const level = computeAnimalLoveLevel(animal);
        const levelBadge = document.createElement('span');
        levelBadge.className = 'pet-card-level-badge';
        levelBadge.innerHTML = `${HEART_SVG_ICON}Lv.${level}`;

        topRow.append(nameEl, levelBadge);

        const statsRow = document.createElement('div');
        statsRow.className = 'pet-card-stats-row';

        const fullnessPct = Math.max(0, Math.min(100, Math.round(animal.hunger)));
        const fullnessWrap = document.createElement('div');
        fullnessWrap.className = 'pet-card-fullness-wrap';
        fullnessWrap.innerHTML = `
          <span>${getGameString('fullness', currentLang)}</span>
          <div class="pet-card-fullness-track">
            <div class="pet-card-fullness-fill" style="width: ${fullnessPct}%; background: ${fullnessPct <= 25 ? '#ef4444' : fullnessPct <= 55 ? '#f59e0b' : '#22c55e'};"></div>
          </div>
          <span>${fullnessPct}%</span>
        `;

        const isHappy = animal.hunger > 35;
        const condBadge = document.createElement('span');
        condBadge.className = `pet-card-cond-badge ${isHappy ? 'happy' : 'hungry'}`;
        condBadge.textContent = isHappy ? getGameString('happy', currentLang) : getGameString('hungry', currentLang);

        const zoneBadge = document.createElement('span');
        zoneBadge.className = 'pet-card-zone-badge';
        zoneBadge.textContent = getLocalizedZoneName(animal.zoneId, currentLang);

        statsRow.append(fullnessWrap, condBadge, zoneBadge);
        info.append(topRow, statsRow);

        const teleBtn = document.createElement('button');
        teleBtn.type = 'button';
        teleBtn.className = 'pet-card-teleport-btn';
        teleBtn.textContent = getGameString('teleportToPet', currentLang);

        const doTeleport = () => {
          backdrop.remove();
          targetCameraX = clamp(animal.x - viewportWidth * 0.5, 0, Math.max(0, WORLD_WIDTH - viewportWidth));
          targetCameraY = clamp(animal.y - viewportHeight * 0.45, -viewportHeight * 0.85, viewportHeight * 2.65);
          cameraX = targetCameraX;
          cameraY = targetCameraY;
          saveState.cameraY = cameraY;
          selectedAnimalUid = animal.uid;
          renderEntityCard();
          soundEngine.playWaveChirp();
          showToast(
            currentLang === '中文'
              ? `已传送至 ${animalDisplayName}`
              : currentLang === 'Bahasa Melayu'
              ? `Diteleportasikan ke ${animalDisplayName}`
              : currentLang === 'தமிழ்'
              ? `${animalDisplayName} இடம் செல்லப்பட்டது`
              : `Teleported to ${animalDisplayName}!`
          );
        };

        card.addEventListener('click', doTeleport);
        teleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          doTeleport();
        });

        card.append(thumbWrap, info, teleBtn);
        cardsContainer.appendChild(card);
      }
    };

    searchInput.addEventListener('input', () => {
      filterText = searchInput.value;
      renderPetsList();
    });

    renderPetsList();
    body.append(searchRow, cardsContainer);
    sheet.append(header, body);
    backdrop.appendChild(sheet);
    root!.appendChild(backdrop);
  }

  /**
   * Triggers a cool animated Green Sea Turtle loading scene while teleporting to the target tower
   */
  function triggerTurtleTeleportLoadingScene(tower: TeleportTowerSpec): void {
    const existing = document.getElementById('teleport-loading-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'teleport-loading-overlay';
    overlay.id = 'teleport-loading-overlay';

    const loadCanvas = document.createElement('canvas');
    loadCanvas.className = 'teleport-loading-canvas';
    const dpr = Math.min(3, window.devicePixelRatio || 2);
    loadCanvas.width = Math.round(340 * dpr);
    loadCanvas.height = Math.round(250 * dpr);
    loadCanvas.style.width = '340px';
    loadCanvas.style.height = '250px';

    const locTowerName = getLocalizedTowerName(tower.id, tower.name, currentLang);
    const title = document.createElement('div');
    title.className = 'teleport-loading-title';
    title.textContent = getGameString('teleportingTo', currentLang).replace('{name}', locTowerName);

    const track = document.createElement('div');
    track.className = 'teleport-progress-track';
    const fill = document.createElement('div');
    fill.className = 'teleport-progress-fill';
    fill.style.width = '0%';
    track.appendChild(fill);

    overlay.append(loadCanvas, title, track);
    root!.appendChild(overlay);

    const lCtx = loadCanvas.getContext('2d');
    const turtleRig = new TurtleRigController('waving', 'right');
    const startMs = performance.now();
    const durationMs = 1550;
    let lastMs = startMs;

    // Move camera immediately behind the loading curtain so chunks are ready when it fades out
    targetCameraX = clamp(
      tower.worldX - viewportWidth * 0.5,
      0,
      Math.max(0, WORLD_WIDTH - viewportWidth),
    );
    cameraX = targetCameraX;
    // Underwater towers frame the actual water column at that spot (surface to seabed),
    // so arriving at a reef or the deep sea shows the habitat rather than empty water
    const towerWaterY = getWaterSurfaceY(tower.worldX, viewportHeight);
    const underwaterCameraY =
      towerWaterY !== null && tower.worldYOffset > 0
        ? (towerWaterY + getTerrainFloorY(tower.worldX, viewportHeight)) * 0.5 - viewportHeight * 0.5
        : tower.worldYOffset;
    targetCameraY = clamp(
      underwaterCameraY,
      -viewportHeight * 0.85,
      viewportHeight * 2.65,
    );
    cameraY = targetCameraY;
    saveState.cameraY = cameraY;
    soundEngine.playWaveChirp();
    syncHudDOM();

    const stepLoading = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastMs) / 1000));
      lastMs = now;
      const elapsed = now - startMs;
      const progress = clamp(elapsed / durationMs, 0, 1);
      fill.style.width = `${Math.round(progress * 100)}%`;

      if (lCtx) {
        lCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        lCtx.imageSmoothingEnabled = true;
        lCtx.imageSmoothingQuality = 'high';
        lCtx.clearRect(0, 0, 340, 250);
        // Refined micro-current bioluminescent motes around the Green Sea Turtle
        for (let i = 0; i < 14; i++) {
          const bx = ((340 - ((elapsed * 0.28 + i * 26) % 360)) + 360) % 360 - 10;
          const by = 48 + ((i * 31) % 155) + Math.sin(elapsed * 0.006 + i) * 8;
          const dotRadius = 1.3 + (i % 3) * 0.5; // delicate 1.3px - 2.3px micro-motes
          lCtx.fillStyle = i % 2 === 0 ? 'rgba(174, 246, 130, 0.65)' : 'rgba(56, 189, 248, 0.60)';
          lCtx.beginPath();
          lCtx.arc(bx, by, dotRadius, 0, Math.PI * 2);
          lCtx.fill();
        }

        const pose = turtleRig.step(dt);
        renderTurtle(
          lCtx,
          340,
          250,
          {
            ...pose,
            bodyY: pose.bodyY + Math.sin(elapsed * 0.008) * 10,
            bodyRot: Math.sin(elapsed * 0.006) * 0.08,
          },
          [],
          false,
          undefined,
          { skipClear: true, framingScale: 0.88 },
        );
      }

      if (progress < 1) {
        window.requestAnimationFrame(stepLoading);
      } else {
        overlay.remove();
      }
    };

    window.requestAnimationFrame(stepLoading);
  }

  // ============================================================================
  // MAIN 60 FPS SIMULATION & COLLISION-AVOIDANCE ENGINE
  // ============================================================================
  const ctx = worldCanvas.getContext('2d');
  if (!ctx) return () => {};

  const handleResize = () => {
    const prevCenterWorldX = cameraX + viewportWidth * 0.5;
    // Size from the real canvas box (the container), not the window, and keep the bitmap
    // aspect identical to the CSS box so nothing is ever stretched.
    const rect = worldCanvas.getBoundingClientRect();
    const cssW = Math.max(1, rect.width || root.clientWidth || window.innerWidth);
    const cssH = Math.max(1, rect.height || root.clientHeight || window.innerHeight);
    canvasCssLeft = rect.left;
    canvasCssTop = rect.top;
    viewScale = cssH / LOGICAL_VIEW_HEIGHT;
    viewportHeight = LOGICAL_VIEW_HEIGHT;
    viewportWidth = cssW / viewScale;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    worldCanvas.width = Math.round(cssW * dpr);
    worldCanvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr * viewScale, 0, 0, dpr * viewScale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    targetCameraX = clamp(
      prevCenterWorldX - viewportWidth * 0.5,
      0,
      Math.max(0, WORLD_WIDTH - viewportWidth),
    );
    cameraX = targetCameraX;
  };

  handleResize();
  window.addEventListener('resize', handleResize);
  // Mobile browser bars, the on-screen keyboard and layout changes resize the container
  // without always firing window 'resize'
  const containerResizeObserver =
    typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => handleResize()) : null;
  containerResizeObserver?.observe(root);
  renderDockCards();
  renderEntityCard();
  syncHudDOM();

  let lastFrameTime = performance.now();
  let totalElapsedSec = 0;

  // Biological 6-hour hunger decay rate: 100 fullness points over 6 hours (21,600 seconds)
  const HUNGER_DECAY_PER_SEC = 100 / (6 * 3600);

  function stepSimulation(dt: number): void {
    totalElapsedSec += dt;

    // Smooth 2D camera interpolation
    cameraX += (targetCameraX - cameraX) * Math.min(1, dt * 10);
    cameraY += (targetCameraY - cameraY) * Math.min(1, dt * 10);
    saveState.cameraY = cameraY;

    // 1. Update Plants: Growth lifecycle (Stage 1 Leaves -> Stage 2 Flowers -> Stage 3 Ripe Fruits)
    for (const plant of saveState.placedPlants) {
      plant.swayImpulse *= Math.pow(0.2, dt);
      const eco = ASSET_ECO_CONFIG[plant.assetId];
      // Grazed aquatic plants regrow one bite about every 40 seconds (max 5)
      if (eco?.isAquaticFoodSource && (plant.grazingBitesRemaining ?? 0) < 5) {
        plant.grazingBitesRemaining = Math.min(5, (plant.grazingBitesRemaining ?? 0) + dt / 40);
      }

      if (plant.growthStage < 3) {
        // Grow from Stage 1 (0..49) -> Stage 2 (50..99) -> Stage 3 (100)
        plant.growthProgress = Math.min(100, (plant.growthProgress ?? 0) + dt * 2.2);
        if (plant.growthProgress >= 100) {
          plant.growthStage = 3;
          plant.fruitCount = eco?.producesFruitId ? 3 : 0;
        } else if (plant.growthProgress >= 50 && plant.growthStage === 1) {
          plant.growthStage = 2;
        }
      } else if (eco?.producesFruitId && plant.fruitCount < 3) {
        plant.fruitRegenTimerSec -= dt;
        if (plant.fruitRegenTimerSec <= 0) {
          plant.fruitCount += 1;
          plant.fruitRegenTimerSec = 28;
        }
      }
    }

    // 2. Update Dropped Foods (gravity in air; buoyancy and drag in water, so food sinks
    //    slowly to a terminal speed instead of falling through water as fast as through air)
    for (const df of saveState.droppedFoods) {
      if (df.y < df.groundY) {
        const waterY = getWaterSurfaceY(df.x, viewportHeight);
        const submerged = waterY !== null && df.y > waterY;
        if (submerged) {
          df.vy += 120 * dt;
          df.vy = Math.min(df.vy, 70) * Math.pow(0.4, dt);
        } else {
          df.vy += 380 * dt;
        }
        df.y += df.vy * dt;
        if (df.y >= df.groundY) {
          df.y = df.groundY;
          df.vy = submerged ? 0 : -df.vy * 0.32;
          if (Math.abs(df.vy) < 18) df.vy = 0;
        }
      }
    }

    // 3. Update Floating Greenbits Coins
    for (const fg of floatingGreenbits) {
      fg.y += fg.vy * dt;
      fg.alpha -= dt * 0.85;
    }
    floatingGreenbits = floatingGreenbits.filter((fg) => fg.alpha > 0.02);

    // 4. Update Rejected Drop Animations
    for (const rej of rejectedDrops) {
      rej.progress += dt * 1.45;
    }
    rejectedDrops = rejectedDrops.filter((rej) => rej.progress < 1);

    // 5. Update Placed Animals (Stop-on-Site Emotes, 6h Biological Hunger, Foraging & Collision Avoidance)
    const animals = saveState.placedAnimals;

    for (const animal of animals) {
      // Animal Drop & Downward Gravity Simulation
      if (animal.isFalling) {
        const groundY = getAnimalRestY(animal, saveState.placedPlants, viewportHeight);
        const fallWaterY = getWaterSurfaceY(animal.x, viewportHeight);
        const submerged = fallWaterY !== null && animal.y > fallWaterY;
        // In water an animal sinks gently to its depth (buoyancy + drag) and never bounces
        if (submerged) {
          animal.vy = Math.min(140, ((animal.vy ?? 0) + 260 * dt) * Math.pow(0.25, dt));
        } else {
          animal.vy = (animal.vy ?? 0) + 1620 * dt;
        }
        animal.y += (animal.vy ?? 0) * dt;
        if (animal.y >= groundY) {
          animal.y = groundY;
          if (submerged) {
            animal.vy = 0;
            animal.isFalling = false;
          } else if ((animal.vy ?? 0) > 220) {
            animal.vy = -(animal.vy ?? 0) * 0.24;
            animal.fallImpactSec = 0.35;
            soundEngine.playPluckPop();
          } else {
            animal.vy = 0;
            animal.isFalling = false;
            animal.fallImpactSec = 0.32;
            soundEngine.playPluckPop();
          }
        }
      } else if (animal.fallImpactSec && animal.fallImpactSec > 0) {
        animal.fallImpactSec = Math.max(0, animal.fallImpactSec - dt);
      }

      animal.blinkCountdownSec -= dt;
      if (animal.blinkCountdownSec <= 0) {
        animal.blinkActiveSec = 0.18;
        animal.blinkCountdownSec = 2.4 + Math.random() * 3.2;
      }
      if (animal.blinkActiveSec > 0) {
        animal.blinkActiveSec = Math.max(0, animal.blinkActiveSec - dt);
      }

      if (animal.eatingStage !== 'none') {
        animal.eatingTimerSec = Math.max(0, animal.eatingTimerSec - dt);
        if (animal.eatingTimerSec > 1.3) {
          animal.eatingStage = 'pickup';
        } else if (animal.eatingTimerSec > 0.45) {
          animal.eatingStage = 'chew';
        } else if (animal.eatingTimerSec > 0) {
          animal.eatingStage = 'swallow';
        } else {
          animal.eatingStage = 'none';
          animal.eatingFoodId = undefined;
        }
      }

      // 6-hour biological hunger cycle
      const prevHunger = animal.hunger;
      animal.hunger = Math.max(0, animal.hunger - dt * HUNGER_DECAY_PER_SEC);
      if (prevHunger > 22 && animal.hunger <= 22) {
        const rawName = ASSET_ECO_CONFIG[animal.assetId]?.name || 'Animal';
        const displayName = animal.customName || getLocalizedAssetName(animal.assetId, rawName, currentLang);
        showToast(getGameString('isHungry', currentLang).replace('{name}', displayName));
      }

      // Emote timer decay & stop-walking-on-site blend
      if (animal.emotionTimerSec > 0) {
        animal.emotionTimerSec = Math.max(0, animal.emotionTimerSec - dt);
      }

      // Each species keeps its own clock: nocturnal animals forage at night, cathemeral
      // animals (tiger, elephant, sharks, dolphins...) are never forced asleep, and sessile
      // animals (giant clam) never walk.
      const eco = ASSET_ECO_CONFIG[animal.assetId];
      const speedFactor = eco?.moveSpeedFactor ?? 1;
      const resting = isAnimalResting(animal.assetId, saveState.timeOfDayHours);
      const isStoppedOnSite =
        animal.emotionTimerSec > 0 || animal.eatingStage !== 'none' || resting || speedFactor <= 0;
      const targetLoco = isStoppedOnSite ? 0 : 1;
      animal.locoBlend =
        (animal.locoBlend ?? 1) + (targetLoco - (animal.locoBlend ?? 1)) * Math.min(1, dt * 8);

      // Only move/walk when NOT doing an emote on site, NOT falling, and NOT sleeping
      if (!isStoppedOnSite && !animal.isFalling && animal.locoBlend > 0.15) {
        const { minX, maxX } = getAquaticSafeBoundsX(animal.assetId, animal.zoneId);

        const targetDrop = saveState.droppedFoods.find(
          (df) =>
            df.zoneId === animal.zoneId &&
            Math.abs(df.x - animal.x) < 950 &&
            canAnimalEatFood(animal.assetId, df.foodId),
        );

        // Grazers only go for plants they actually eat (a shark no longer "grazes" seagrass
        // and receives fish from it), and only while the plant has bites left.
        const grazePlant =
          animal.hunger < 42 && (animal.zoneId === 'sea' || animal.zoneId === 'river')
            ? saveState.placedPlants.find(
                (p) =>
                  p.zoneId === animal.zoneId &&
                  Math.abs(p.x - animal.x) < 900 &&
                  (p.grazingBitesRemaining ?? 0) >= 1 &&
                  canAnimalGrazePlant(animal.assetId, p.assetId),
              )
            : undefined;

        if (targetDrop) {
          const dx = targetDrop.x - animal.x;
          if (Math.abs(dx) < 32) {
            saveState.droppedFoods = saveState.droppedFoods.filter(
              (item) => item.uid !== targetDrop.uid,
            );
            startAnimalEating(animal, targetDrop.foodId, targetDrop.isGolden);
          } else {
            const speed = 44 * speedFactor * animal.locoBlend;
            animal.x = clamp(animal.x + Math.sign(dx) * speed * dt, minX, maxX);
            if (Math.abs(dx) > 12) setFacing(animal, dx >= 0 ? 1 : -1);
          }
        } else if (grazePlant) {
          const dx = grazePlant.x - animal.x;
          if (Math.abs(dx) < 36) {
            startAnimalGrazing(animal, grazePlant);
          } else {
            const speed = 36 * speedFactor * animal.locoBlend;
            animal.x = clamp(animal.x + Math.sign(dx) * speed * dt, minX, maxX);
            if (Math.abs(dx) > 12) setFacing(animal, dx >= 0 ? 1 : -1);
          }
        } else {
          const dx = animal.targetX - animal.x;
          if (Math.abs(dx) < 16) {
            // Pick a new nearby wander waypoint. Slow species patrol a smaller area, and
            // canopy animals that are in (or near) a tree keep to its crown instead of
            // walking off into thin air.
            const patrolSpan = 420 * clamp(speedFactor, 0.2, 1.3);
            let nextTarget = animal.x + (Math.random() - 0.5) * patrolSpan * 2;
            if (eco?.canopyHabit === 'canopy') {
              const tree = findPerchTree(animal, saveState.placedPlants, 700);
              if (tree) {
                const crownHalf = getPlantDrawSize(tree).w * 0.24;
                nextTarget = tree.x + (Math.random() - 0.5) * 2 * crownHalf;
              }
            }
            animal.targetX = clamp(nextTarget, minX, maxX);
          } else {
            const speed = 22 * speedFactor * animal.locoBlend;
            animal.x = clamp(animal.x + Math.sign(dx) * speed * dt, minX, maxX);
            setFacing(animal, dx >= 0 ? 1 : -1);
          }
        }
      }
    }

    // 6. Pairwise Biological Collision Avoidance & Natural Separation Pass
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i];
      const ecoA = ASSET_ECO_CONFIG[a.assetId];
      const rA = ecoA?.collisionRadius ?? 78;
      const { minX, maxX } = getAquaticSafeBoundsX(a.assetId, a.zoneId);

      for (let j = i + 1; j < animals.length; j++) {
        const b = animals[j];
        if (a.zoneId !== b.zoneId) continue;
        const ecoB = ASSET_ECO_CONFIG[b.assetId];
        // Canopy animals and ground animals at different vertical strata don't collide horizontally
        if ((ecoA?.canopyHabit === 'canopy') !== (ecoB?.canopyHabit === 'canopy')) continue;

        const rB = ecoB?.collisionRadius ?? 78;
        const desiredSep = (rA + rB) * 1.15;
        const diffX = b.x - a.x;
        const dist = Math.abs(diffX);

        if (dist < desiredSep) {
          const dir: 1 | -1 = diffX >= 0 ? 1 : -1;
          const oppDir: 1 | -1 = dir === 1 ? -1 : 1;
          const overlap = desiredSep - dist;
          const push = Math.min(overlap * 0.5, 95 * dt);

          // Sessile animals (giant clam) are never pushed; they are treated as pinned
          const aPinned =
            a.emotionTimerSec > 0 || a.eatingStage !== 'none' || (ecoA?.moveSpeedFactor ?? 1) <= 0;
          const bPinned =
            b.emotionTimerSec > 0 || b.eatingStage !== 'none' || (ecoB?.moveSpeedFactor ?? 1) <= 0;

          if (aPinned && !bPinned) {
            b.x = clamp(b.x + dir * push * 2, minX, maxX);
            b.targetX = clamp(b.x + dir * 220, minX, maxX);
            setFacing(b, dir);
          } else if (!aPinned && bPinned) {
            a.x = clamp(a.x - dir * push * 2, minX, maxX);
            a.targetX = clamp(a.x - dir * 220, minX, maxX);
            setFacing(a, oppDir);
          } else if (!aPinned && !bPinned) {
            a.x = clamp(a.x - dir * push, minX, maxX);
            b.x = clamp(b.x + dir * push, minX, maxX);
            // Politely steer waypoints away from each other so they don't keep walking into each other
            if ((a.targetX - a.x) * dir > 0) {
              a.targetX = clamp(a.x - dir * (160 + Math.random() * 140), minX, maxX);
              setFacing(a, oppDir);
            }
            if ((b.targetX - b.x) * dir < 0) {
              b.targetX = clamp(b.x + dir * (160 + Math.random() * 140), minX, maxX);
              setFacing(b, dir);
            }
          }
        }
      }
    }
  }

  function frameLoop(now: number): void {
    try {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
      lastFrameTime = now;

      cameraZoom += (targetCameraZoom - cameraZoom) * Math.min(1, dt * 10);
      stepSimulation(dt);

      renderEcosystemWorld({
        ctx: ctx!,
        viewportWidth,
        viewportHeight,
        cameraX,
        cameraY,
        zoom: cameraZoom,
        state: saveState,
        elapsedSec: totalElapsedSec,
        floatingCoins: floatingGreenbits,
        rejectedDrops,
        activeDrag: activeDrag
          ? {
              kind: activeDrag.kind,
              id: activeDrag.id,
              screenX: clientToLogical(activeDrag.pointerX, activeDrag.pointerY).x,
              screenY: clientToLogical(activeDrag.pointerX, activeDrag.pointerY).y,
            }
          : null,
        selectedAnimalUid,
        shoreShells,
      });
    } catch (err) {
      console.error('Frame render recovery:', err);
    }

    if (isDestroyed) return;
    animFrameId = window.requestAnimationFrame(frameLoop);
  }

  const handleExternalBalanceSync = (ev: Event) => {
    const detail = (ev as CustomEvent<{ balance?: number }>).detail;
    if (detail && typeof detail.balance === 'number' && Number.isFinite(detail.balance)) {
      const nextBal = Math.max(0, Math.round(detail.balance));
      if (saveState.greenbits !== nextBal) {
        saveState.greenbits = nextBal;
        syncHudDOM();
      }
    }
  };
  window.addEventListener('unplastica-sync-game-balance', handleExternalBalanceSync);

  animFrameId = window.requestAnimationFrame(frameLoop);

  return () => {
    isDestroyed = true;
    window.cancelAnimationFrame(animFrameId);
    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUp);
    window.removeEventListener('resize', handleResize);
    containerResizeObserver?.disconnect();
    window.removeEventListener('unplastica-sync-game-balance', handleExternalBalanceSync);
    window.removeEventListener('unplastica-sync-game-language', handleLangSync);
    root.innerHTML = '';
  };
}

declare global {
  interface Window {
    __UNPLASTICA_APP__?: boolean;
  }
}

function bootstrapApp(): void {
  if (typeof window !== 'undefined' && window.__UNPLASTICA_APP__) {
    return;
  }
  try {
    initApp();
  } catch (err) {
    console.error('Sanctuary bootstrap recovery:', err);
    try {
      window.localStorage.removeItem('malaysia_ecopet_save_v1');
      initApp();
    } catch (innerErr) {
      console.error('Fatal bootstrap error:', innerErr);
    }
  }
}

if (typeof window !== 'undefined' && !window.__UNPLASTICA_APP__) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapApp);
  } else {
    bootstrapApp();
  }
}
