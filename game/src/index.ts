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
  renderEcosystemWorld,
  bindAssetThumbnailImage,
  getAssetThumbnailDataUrl,
  getFoodThumbnailDataUrl,
  getDefaultPlacementY,
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
  let viewportWidth = Math.max(320, window.innerWidth);
  let viewportHeight = Math.max(480, window.innerHeight);
  const starterX = saveState.placedAnimals[0]?.x ?? 543600;
  let cameraX = clamp(starterX - viewportWidth * 0.5, 0, WORLD_WIDTH - viewportWidth);
  let targetCameraX = cameraX;
  let cameraY = saveState.cameraY ?? 0;
  let targetCameraY = cameraY;

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

  // 2. Minimalist Top HUD (Removed Harmony, Call Pets, Close-Up Studio, Night/Day toggle, Weather cycle, Sound toggle)
  const hudTop = document.createElement('header');
  hudTop.className = 'hud-top';

  const leftCluster = document.createElement('div');
  leftCluster.className = 'hud-cluster';

  const greenbitsPill = document.createElement('button');
  greenbitsPill.type = 'button';
  greenbitsPill.className = 'greenbits-pill';
  greenbitsPill.setAttribute('aria-label', 'Balance');
  const gbImg = document.createElement('img');
  gbImg.src = '/assets/aistudio/image_3961e3ca.png';
  gbImg.alt = '';
  gbImg.setAttribute('referrerpolicy', 'no-referrer');
  gbImg.className = 'greenbits-coin-img';
  const gbCountSpan = document.createElement('span');
  gbCountSpan.id = 'greenbits-count';
  gbCountSpan.textContent = String(saveState.greenbits);
  greenbitsPill.append(gbImg, gbCountSpan);
  greenbitsPill.addEventListener('click', () => openStoreModal('animals'));

  leftCluster.append(greenbitsPill);

  const rightCluster = document.createElement('div');
  rightCluster.className = 'hud-cluster';

  const mapBtn = document.createElement('button');
  mapBtn.type = 'button';
  mapBtn.className = 'hud-btn map-btn';
  mapBtn.textContent = 'World Map';
  mapBtn.setAttribute('aria-label', 'Open Teleport World Map');
  mapBtn.addEventListener('click', () => openTeleportMapModal());

  const storeBtn = document.createElement('button');
  storeBtn.type = 'button';
  storeBtn.className = 'hud-btn store-btn';
  storeBtn.innerHTML = `${CART_SVG_ICON}<span>Store</span>`;
  storeBtn.setAttribute('aria-label', 'Open Sanctuary Store');
  storeBtn.addEventListener('click', () => openStoreModal('animals'));

  const postcardBtn = document.createElement('button');
  postcardBtn.type = 'button';
  postcardBtn.className = 'hud-btn';
  postcardBtn.textContent = 'Postcard View';
  postcardBtn.setAttribute('aria-label', 'Enter Postcard View');
  postcardBtn.addEventListener('click', () => setPostcardView(true));

  rightCluster.append(mapBtn, storeBtn, postcardBtn);

  if (options?.onExit) {
    const exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.className = 'hud-btn exit-btn';
    exitBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><span>Exit</span>`;
    exitBtn.setAttribute('aria-label', 'Exit Sanctuary');
    exitBtn.addEventListener('click', () => {
      options.onExit?.();
    });
    rightCluster.append(exitBtn);
  }

  hudTop.append(leftCluster, rightCluster);
  root.appendChild(hudTop);

  // Floating Quit Postcard View Button (Visible whenever in Postcard View so user can always quit)
  const quitPostcardBtn = document.createElement('button');
  quitPostcardBtn.type = 'button';
  quitPostcardBtn.className = 'postcard-quit-btn';
  quitPostcardBtn.textContent = 'Quit Postcard View';
  quitPostcardBtn.style.display = 'none';
  quitPostcardBtn.addEventListener('click', () => setPostcardView(false));
  root.appendChild(quitPostcardBtn);

  function setPostcardView(active: boolean): void {
    isHudHidden = active;
    hudTop.style.display = isHudHidden ? 'none' : 'flex';
    bottomDock.style.display = isHudHidden ? 'none' : 'flex';
    quitPostcardBtn.style.display = isHudHidden ? 'inline-flex' : 'none';
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
      showToast(
        `Collected +${GB_LOGO_HTML} ${loaded.offlineGreenbitsEarned} while you were away`,
        3200,
        true,
      );
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
            if (typeof current.is_day === 'number') {
              const localHrs = isKLDefault ? getKualaLumpurDecimalHours() : getLocalDecimalHours();
              // Keep exact solar hour aligned with live day/night state
              if (current.is_day === 0 && !isNightTime(localHrs)) {
                saveState.timeOfDayHours = 21.0;
              } else if (current.is_day === 1 && isNightTime(localHrs)) {
                saveState.timeOfDayHours = 12.5;
              } else {
                saveState.timeOfDayHours = localHrs;
              }
            }
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
  // ============================================================================
  function renderDockCards(): void {
    dockStrip.innerHTML = '';
    let totalRendered = 0;

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
      dragPop.textContent = 'Drag me!';

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

      card.addEventListener('pointerdown', (e) => {
        if ((saveState.foodInventory[food.id] ?? 0) <= 0) return;
        e.preventDefault();
        startDraggingItem({
          kind: 'food',
          id: food.id,
          label: food.name,
          thumbUrl: img.src,
          pointerX: e.clientX,
          pointerY: e.clientY,
        });
      });

      dockStrip.appendChild(card);
    }

    // 2. Owned Animal & Plant Cards
    for (const asset of ROSTER_ASSETS) {
      const ownedCount = saveState.ownedAssets[asset.id] ?? 0;
      if (ownedCount <= 0) continue;
      totalRendered++;

      const card = document.createElement('div');
      card.className = 'dock-card';
      card.dataset.assetId = asset.id;

      const dragPop = document.createElement('span');
      dragPop.className = 'dock-card-drag-pop';
      dragPop.textContent = 'Drag me!';

      const countSpan = document.createElement('span');
      countSpan.className = 'dock-card-count';
      countSpan.textContent = `x${ownedCount}`;

      const img = document.createElement('img');
      img.className = 'dock-card-thumb';
      bindAssetThumbnailImage(img, asset.id);
      img.alt = asset.name;

      const title = document.createElement('div');
      title.className = 'dock-card-title';
      title.textContent = asset.name;

      card.append(dragPop, countSpan, img, title);

      card.addEventListener('pointerdown', (e) => {
        if ((saveState.ownedAssets[asset.id] ?? 0) <= 0) return;
        e.preventDefault();
        startDraggingItem({
          kind: 'asset',
          id: asset.id,
          label: asset.name,
          thumbUrl: getAssetThumbnailDataUrl(asset.id),
          pointerX: e.clientX,
          pointerY: e.clientY,
        });
      });

      dockStrip.appendChild(card);
    }

    if (totalRendered === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'dock-empty-msg';
      emptyMsg.textContent = 'Open Store to get animals, plants, or food.';
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
    if (!isDockCollapsed && e.clientY >= dockRect.top - 10) {
      return;
    }

    const worldX = clamp(cameraX + e.clientX, 60, WORLD_WIDTH - 60);
    const worldY = cameraY + e.clientY;
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
      rejectedDrops.push({
        assetId: animal.assetId,
        startX: screenX,
        startY: screenY,
        targetBarX: clamp(animal.x - cameraX, 40, viewportWidth - 40),
        targetBarY: clamp(animal.y - cameraY, 40, viewportHeight - 60),
        progress: 0,
        reason: validation.reason,
      });
      showToast(validation.reason, 2800);
      return;
    }

    const safeX = findNonOverlappingAnimalX(animal.assetId, worldX, zoneId, animal.uid);
    const placeY = getDefaultPlacementY(animal.assetId, zoneId, safeX, viewportHeight);
    const meta = ASSET_ECO_CONFIG[animal.assetId];
    const canopyLift = meta?.canopyHabit === 'canopy' ? -120 : 0;
    const targetGroundY = placeY + canopyLift;
    const releaseWorldY = cameraY + screenY;
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
    const displayName = animal.customName || ASSET_ECO_CONFIG[animal.assetId]?.name || 'Animal';
    showToast(`Moved ${displayName} to ${getZoneSpec(zoneId).name}`);
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
      rejectedDrops.push({
        assetId,
        startX: screenX,
        startY: screenY,
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
      const placeY = getDefaultPlacementY(asset.id, zoneId, safeX, viewportHeight);
      const canopyLift = eco.canopyHabit === 'canopy' ? -120 : 0;
      const targetGroundY = placeY + canopyLift;
      const releaseWorldY = cameraY + screenY;
      const dropStartY = Math.min(releaseWorldY, targetGroundY - 135);
      const uid = `anim_${asset.code.toLowerCase()}_${Date.now()}`;
      const night = isNightTime(saveState.timeOfDayHours);
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
    showToast(`Placed ${asset.name} in ${getZoneSpec(zoneId).name}`);
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
    let bestDist = 125;
    for (const a of saveState.placedAnimals) {
      const d = Math.hypot(a.x - worldX, a.y - worldY);
      if (d < bestDist) {
        bestDist = d;
        bestAnimal = a;
      }
    }

    if (bestAnimal) {
      const displayName = bestAnimal.customName || ASSET_ECO_CONFIG[bestAnimal.assetId]?.name || 'Animal';
      if (!canAnimalEatFood(bestAnimal.assetId, foodId)) {
        soundEngine.playRejectBoing();
        showToast(`${displayName} does not eat ${foodSpec.name}`);
        return;
      }
      saveState.foodInventory[foodId] = Math.max(0, have - 1);
      startAnimalEating(bestAnimal, foodId);
      renderDockCards();
      persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
      return;
    }

    saveState.foodInventory[foodId] = Math.max(0, have - 1);
    const groundY = getTerrainFloorY(worldX, viewportHeight) - 18;
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

  worldCanvas.addEventListener('pointerdown', (e) => {
    if (activeDrag) return;
    isPanningWorld = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panStartCameraX = targetCameraX;
    panStartCameraY = targetCameraY;
    pointerMovedDistance = 0;
    lastScratchAnimalUid = null;
    scratchAccumulatedPx = 0;
    pressedAnimalOnCanvas = findAnimalAtPoint(cameraX + e.clientX, cameraY + e.clientY);
    try {
      worldCanvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore synthetic events
    }
  });

  worldCanvas.addEventListener('pointermove', (e) => {
    if (!isPanningWorld || activeDrag) return;
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

    const worldX = cameraX + e.clientX;
    const worldY = cameraY + e.clientY;

    const hitAnimal = findAnimalAtPoint(worldX, worldY);
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
      panStartCameraX - dx * 1.15,
      0,
      Math.max(0, WORLD_WIDTH - viewportWidth),
    );
    targetCameraY = clamp(
      panStartCameraY - dy * 1.05,
      -viewportHeight * 0.85,
      viewportHeight * 2.65,
    );
  });

  // Mouse wheel vertical/horizontal exploration
  worldCanvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        targetCameraX = clamp(
          targetCameraX + e.deltaX * 1.2,
          0,
          Math.max(0, WORLD_WIDTH - viewportWidth),
        );
      } else {
        targetCameraY = clamp(
          targetCameraY + e.deltaY * 0.85,
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
      handleWorldTap(cameraX + e.clientX, cameraY + e.clientY);
    }
  };

  worldCanvas.addEventListener('pointerup', endWorldPan);
  worldCanvas.addEventListener('pointercancel', endWorldPan);

  function findAnimalAtPoint(worldX: number, worldY: number): PlacedAnimal | null {
    for (let i = saveState.placedAnimals.length - 1; i >= 0; i--) {
      const a = saveState.placedAnimals[i];
      if (Math.hypot(a.x - worldX, a.y - worldY) <= 78) {
        return a;
      }
    }
    return null;
  }

  function findPlantAtPoint(worldX: number, worldY: number): PlacedPlant | null {
    for (let i = saveState.placedPlants.length - 1; i >= 0; i--) {
      const p = saveState.placedPlants[i];
      if (Math.hypot(p.x - worldX, p.y - worldY) <= 74) {
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
    const displayName = animal.customName || ASSET_ECO_CONFIG[animal.assetId]?.name || 'Animal';
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
        showToast(`${displayName} is angry`);
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

    if (isNightTime(saveState.timeOfDayHours) && animal.emotionTimerSec <= 0) {
      const reaction = rollSleepingTouchReaction(Math.random());
      animal.currentEmotion = reaction;
      animal.emotionTimerSec = 3.6;
      renderEntityCard();
      if (reaction === 'angry') {
        soundEngine.playRejectBoing();
        showToast(`${displayName} is angry`);
      } else {
        soundEngine.playWaveChirp();
        showToast(`${displayName} is curious`);
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
      showToast(`${displayName} is happy`);
      return;
    }

    const reaction = rollAwakeTapReaction(Math.random());
    animal.currentEmotion = reaction;
    animal.emotionTimerSec = 3.6;
    recordAnimalCareInteraction(animal, 8);
    soundEngine.playWaveChirp();
    renderEntityCard();
    showToast(reaction === 'waving' ? `${displayName} waves` : `${displayName} is curious`);
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
        showToast(`Collected ${fSpec?.name ?? 'Food'}`);
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
        const groundY = getTerrainFloorY(hitPlant.x, viewportHeight) - 16;
        saveState.droppedFoods.push({
          uid: `fruit_${Date.now()}_${Math.random()}`,
          foodId: eco.producesFruitId,
          zoneId: hitPlant.zoneId,
          x: hitPlant.x + (Math.random() - 0.5) * 44,
          y: hitPlant.y - 48,
          vy: -65,
          groundY,
          isGolden,
          bitesRemaining: 1,
          createdAtSec: performance.now() / 1000,
        });
        soundEngine.playPluckPop();
        const foodSpec = FOOD_CATALOG[eco.producesFruitId];
        showToast(`Harvested ${foodSpec?.name ?? 'fruit'} from ${asset?.name ?? 'plant'}`);
      } else if (hitPlant.growthStage < 3) {
        soundEngine.playWaveChirp();
        showToast(
          `${asset?.name ?? 'Plant'} is growing (${hitPlant.growthStage === 1 ? 'Sprouting leaves' : 'Blooming flowers'})`,
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
    const night = isNightTime(saveState.timeOfDayHours);
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
    fullnessHeader.innerHTML = `<span>Fullness</span><span>${fullnessPct}%</span>`;
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
    condRow.textContent = `Condition: ${conditionText}`;

    entityCard.append(nameRow, loveRow, fullnessWrap, condRow);
  }

  function syncHudDOM(): void {
    gbCountSpan.textContent = String(saveState.greenbits);
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
  // SEPARATE POPUP CARD FOR (i) CHARACTERISTICS & GOOGLE SEARCH REDIRECT
  // ============================================================================
  function openCharacteristicsPopupCard(
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
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => backdrop.remove());

    header.append(title, closeBtn);

    const text = document.createElement('p');
    text.className = 'info-popup-text';
    text.textContent = `${sentences[0]} ${sentences[1]}`;

    const link = document.createElement('a');
    link.className = 'info-click-me-link';
    link.href = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Click me!';

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
    backdrop.setAttribute('aria-label', 'Sanctuary Store');

    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet';

    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('h2');
    title.className = 'modal-title';
    title.innerHTML = `${CART_SVG_ICON}<span>Store</span> <span class="store-balance-badge">${GB_LOGO_HTML}<span id="store-gb-balance">${saveState.greenbits}</span></span>`;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close-btn';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => backdrop.remove());

    header.append(title, closeBtn);

    const body = document.createElement('div');
    body.className = 'modal-body';

    const tabsRow = document.createElement('div');
    tabsRow.className = 'store-tabs';

    const tabSpecs: Array<{ id: StoreTab; label: string }> = [
      { id: 'animals', label: 'Animals' },
      { id: 'plants', label: 'Plants' },
      { id: 'food', label: 'Food' },
    ];

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
        for (const food of foodList) {
          const card = document.createElement('div');
          card.className = 'store-item-card';

          const thumb = document.createElement('img');
          thumb.className = 'store-item-thumb';
          thumb.src = getFoodThumbnailDataUrl(food.id);
          thumb.alt = food.name;

          const nameRow = document.createElement('div');
          nameRow.className = 'store-item-name-row';

          const name = document.createElement('div');
          name.className = 'store-item-name';
          name.textContent = food.name;

          const infoBtn = document.createElement('button');
          infoBtn.type = 'button';
          infoBtn.className = 'info-svg-btn';
          infoBtn.setAttribute('aria-label', `About ${food.name}`);
          infoBtn.innerHTML = INFO_SVG_ICON;
          infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openCharacteristicsPopupCard(food.name, food.infoSentences, food.searchQuery);
          });

          nameRow.append(name, infoBtn);

          const buyBtn = document.createElement('button');
          buyBtn.type = 'button';
          buyBtn.className = 'buy-btn';
          buyBtn.disabled = saveState.greenbits < food.price;
          buyBtn.innerHTML = `<span>Buy (</span>${GB_LOGO_HTML}<span>${food.price})</span>`;
          buyBtn.addEventListener('click', () => {
            if (saveState.greenbits < food.price) return;
            saveState.greenbits -= food.price;
            options?.onBalanceChange?.(saveState.greenbits);
            saveState.foodInventory[food.id] = (saveState.foodInventory[food.id] ?? 0) + 1;
            soundEngine.playCoinChime();
            persistSaveState(saveState, options?.userId, options?.onSaveStateChange);
            renderDockCards();
            syncHudDOM();
            renderStoreContent();
            showToast(`Bought ${food.name}`);
          });

          card.append(thumb, nameRow, buyBtn);
          grid.appendChild(card);
        }
      } else {
        const isAnimTab = activeStoreTab === 'animals';
        const items = ROSTER_ASSETS.filter((a) => a.isAnimal === isAnimTab);
        for (const asset of items) {
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
          name.textContent = asset.name;

          const infoBtn = document.createElement('button');
          infoBtn.type = 'button';
          infoBtn.className = 'info-svg-btn';
          infoBtn.setAttribute('aria-label', `About ${asset.name}`);
          infoBtn.innerHTML = INFO_SVG_ICON;
          infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sentences: [string, string] = eco?.infoSentences ?? [
              `${asset.name} is a native Malaysian species.`,
              `It thrives in the ${getZoneSpec(eco?.allowedZones[0] ?? 'forest').name}.`,
            ];
            const query = eco?.searchQuery ?? `${asset.name} Malaysia characteristics`;
            openCharacteristicsPopupCard(asset.name, sentences, query);
          });

          nameRow.append(name, infoBtn);

          const buyBtn = document.createElement('button');
          buyBtn.type = 'button';
          buyBtn.className = 'buy-btn';
          buyBtn.disabled = saveState.greenbits < price;
          buyBtn.innerHTML = `<span>Buy (</span>${GB_LOGO_HTML}<span>${price})</span>`;
          buyBtn.addEventListener('click', () => {
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
            showToast(`Bought ${asset.name}`);
          });

          card.append(thumb, nameRow, buyBtn);
          grid.appendChild(card);
        }
      }
    };

    renderStoreContent();
    body.append(tabsRow, grid);
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
    backdrop.setAttribute('aria-label', 'Sanctuary Teleport Map');

    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet';

    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('h2');
    title.className = 'modal-title';
    title.textContent = 'Sanctuary Teleport Map';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close-btn';
    closeBtn.textContent = 'Close';
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

      // Current camera position indicator ring on the square map
      const curMapX = clamp((cameraX + viewportWidth * 0.5) / WORLD_WIDTH, 0.04, 0.96) * 440;
      const curMapY = clamp(0.5 + cameraY / (viewportHeight * 2.4), 0.1, 0.9) * 440;
      mCtx.strokeStyle = '#aef682';
      mCtx.lineWidth = 2.5;
      mCtx.beginPath();
      mCtx.arc(curMapX, curMapY, 12, 0, Math.PI * 2);
      mCtx.stroke();
    }

    // Right: List of Teleport Waypoint Towers (clean tower names only, no elevation/zone sub-labels)
    const listPanel = document.createElement('div');
    listPanel.className = 'tower-list-panel';

    for (const tower of TELEPORT_TOWERS) {
      // Pin button on the square map
      const pinBtn = document.createElement('button');
      pinBtn.type = 'button';
      pinBtn.className = `tower-pin-btn ${tower.id === preselectedTowerId ? 'active' : ''}`;
      pinBtn.style.left = `${tower.mapNormX * 100}%`;
      pinBtn.style.top = `${tower.mapNormY * 100}%`;
      pinBtn.title = tower.name;
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
      nameEl.textContent = tower.name;

      info.appendChild(nameEl);

      const goBtn = document.createElement('button');
      goBtn.type = 'button';
      goBtn.className = 'teleport-go-btn';
      goBtn.textContent = 'Teleport';
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
    loadCanvas.width = 340;
    loadCanvas.height = 250;

    const title = document.createElement('div');
    title.className = 'teleport-loading-title';
    title.textContent = `Teleporting to ${tower.name}`;

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
    targetCameraY = clamp(
      tower.worldYOffset,
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
        lCtx.clearRect(0, 0, 340, 250);
        // Swirling bioluminescent eco-current rings around the Green Sea Turtle
        for (let i = 0; i < 12; i++) {
          const bx = ((340 - ((elapsed * 0.28 + i * 32) % 360)) + 360) % 360 - 10;
          const by = 45 + ((i * 37) % 160) + Math.sin(elapsed * 0.006 + i) * 10;
          lCtx.fillStyle = i % 2 === 0 ? 'rgba(174, 246, 130, 0.45)' : 'rgba(56, 189, 248, 0.42)';
          lCtx.beginPath();
          lCtx.arc(bx, by, 3.5 + (i % 3) * 1.8, 0, Math.PI * 2);
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
    viewportWidth = Math.max(320, window.innerWidth);
    viewportHeight = Math.max(420, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    worldCanvas.width = Math.round(viewportWidth * dpr);
    worldCanvas.height = Math.round(viewportHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    targetCameraX = clamp(
      prevCenterWorldX - viewportWidth * 0.5,
      0,
      Math.max(0, WORLD_WIDTH - viewportWidth),
    );
    cameraX = targetCameraX;
  };

  handleResize();
  window.addEventListener('resize', handleResize);
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

    // 2. Update Dropped Foods (gravity & bounce onto ground/seafloor)
    for (const df of saveState.droppedFoods) {
      if (df.y < df.groundY) {
        df.vy += 380 * dt;
        df.y += df.vy * dt;
        if (df.y >= df.groundY) {
          df.y = df.groundY;
          df.vy = -df.vy * 0.32;
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
    const night = isNightTime(saveState.timeOfDayHours);
    const animals = saveState.placedAnimals;

    for (const animal of animals) {
      // Animal Drop & Downward Gravity Simulation
      if (animal.isFalling) {
        const baseDepthY = getDefaultPlacementY(animal.assetId, animal.zoneId, animal.x, viewportHeight);
        const meta = ASSET_ECO_CONFIG[animal.assetId];
        const canopyLift = meta?.canopyHabit === 'canopy' ? -120 : 0;
        const groundY = baseDepthY + canopyLift;
        const isAquaticZone = animal.zoneId === 'sea' || animal.zoneId === 'river';
        const gravAccel = isAquaticZone ? 1050 : 1620;
        animal.vy = (animal.vy ?? 0) + gravAccel * dt;
        animal.y += (animal.vy ?? 0) * dt;
        if (animal.y >= groundY) {
          animal.y = groundY;
          if ((animal.vy ?? 0) > 220) {
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
        const displayName = animal.customName || ASSET_ECO_CONFIG[animal.assetId]?.name || 'Animal';
        showToast(`${displayName} is hungry`);
      }

      // Emote timer decay & stop-walking-on-site blend
      if (animal.emotionTimerSec > 0) {
        animal.emotionTimerSec = Math.max(0, animal.emotionTimerSec - dt);
      }

      const isStoppedOnSite =
        animal.emotionTimerSec > 0 || animal.eatingStage !== 'none' || night;
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

        if (targetDrop) {
          const dx = targetDrop.x - animal.x;
          if (Math.abs(dx) < 32) {
            saveState.droppedFoods = saveState.droppedFoods.filter(
              (item) => item.uid !== targetDrop.uid,
            );
            startAnimalEating(animal, targetDrop.foodId, targetDrop.isGolden);
          } else {
            const speed = 44 * animal.locoBlend;
            animal.x = clamp(animal.x + Math.sign(dx) * speed * dt, minX, maxX);
            animal.facing = dx >= 0 ? 1 : -1;
          }
        } else if (
          animal.hunger < 42 &&
          (animal.zoneId === 'sea' || animal.zoneId === 'river')
        ) {
          const aquaticPlant = saveState.placedPlants.find(
            (p) => p.zoneId === animal.zoneId && Math.abs(p.x - animal.x) < 900,
          );
          if (aquaticPlant) {
            const dx = aquaticPlant.x - animal.x;
            if (Math.abs(dx) < 36) {
              const eco = ASSET_ECO_CONFIG[animal.assetId];
              const grazeFood = eco?.favoriteFoodId ?? 'food_seaweed_kelp';
              startAnimalEating(animal, grazeFood, false);
            } else {
              const speed = 36 * animal.locoBlend;
              animal.x = clamp(animal.x + Math.sign(dx) * speed * dt, minX, maxX);
              animal.facing = dx >= 0 ? 1 : -1;
            }
          }
        } else {
          const dx = animal.targetX - animal.x;
          if (Math.abs(dx) < 16) {
            // Pick a new nearby wander waypoint within a comfortable local radius
            const patrolSpan = 420;
            const nextTarget = animal.x + (Math.random() - 0.5) * patrolSpan * 2;
            animal.targetX = clamp(nextTarget, minX, maxX);
          } else {
            const speed = 22 * animal.locoBlend;
            animal.x = clamp(animal.x + Math.sign(dx) * speed * dt, minX, maxX);
            animal.facing = dx >= 0 ? 1 : -1;
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

          const aPinned = a.emotionTimerSec > 0 || a.eatingStage !== 'none';
          const bPinned = b.emotionTimerSec > 0 || b.eatingStage !== 'none';

          if (aPinned && !bPinned) {
            b.x = clamp(b.x + dir * push * 2, minX, maxX);
            b.targetX = clamp(b.x + dir * 220, minX, maxX);
            b.facing = dir;
          } else if (!aPinned && bPinned) {
            a.x = clamp(a.x - dir * push * 2, minX, maxX);
            a.targetX = clamp(a.x - dir * 220, minX, maxX);
            a.facing = oppDir;
          } else if (!aPinned && !bPinned) {
            a.x = clamp(a.x - dir * push, minX, maxX);
            b.x = clamp(b.x + dir * push, minX, maxX);
            // Politely steer waypoints away from each other so they don't keep walking into each other
            if ((a.targetX - a.x) * dir > 0) {
              a.targetX = clamp(a.x - dir * (160 + Math.random() * 140), minX, maxX);
              a.facing = oppDir;
            }
            if ((b.targetX - b.x) * dir < 0) {
              b.targetX = clamp(b.x + dir * (160 + Math.random() * 140), minX, maxX);
              b.facing = dir;
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

      stepSimulation(dt);

      renderEcosystemWorld({
        ctx: ctx!,
        viewportWidth,
        viewportHeight,
        cameraX,
        cameraY,
        state: saveState,
        elapsedSec: totalElapsedSec,
        floatingCoins: floatingGreenbits,
        rejectedDrops,
        activeDrag: activeDrag
          ? {
              kind: activeDrag.kind,
              id: activeDrag.id,
              screenX: activeDrag.pointerX,
              screenY: activeDrag.pointerY,
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
    window.removeEventListener('unplastica-sync-game-balance', handleExternalBalanceSync);
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
