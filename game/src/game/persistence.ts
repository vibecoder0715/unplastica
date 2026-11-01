import {
  ASSET_ECO_CONFIG,
  BASE_WORLD_WIDTH,
  createDefaultSanctuaryPlants,
  FOOD_CATALOG,
  createInitialSaveState,
  getPlantPlacementProblem,
  getZoneSpec,
  WORLD_SCALE_X,
  WORLD_WIDTH,
} from './worldConfig';
import type { PlacedAnimal, PlacedPlant, SaveState } from './types';

export const SAVE_STORAGE_KEY = 'malaysia_ecopet_save_v1';

export interface LoadedSaveResult {
  state: SaveState;
  offlineGreenbitsEarned: number;
  offlineMinutes: number;
}

/**
 * Sanitizes an untrusted object by stripping prototype pollution attack vectors (__proto__, constructor, prototype).
 */
export function sanitizeKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeKeys);
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    clean[k] = sanitizeKeys(v);
  }
  return clean;
}

/**
 * Computes Love Level (1 .. 5) based on sustained care (1-3 weeks / 7-21 care days + bondXp).
 * Only reaches max Level 5 with sufficient care milestones and time!
 */
export function computeAnimalLoveLevel(animal: PlacedAnimal | null | undefined): number {
  if (!animal) return 1;
  const xp = typeof animal.bondXp === 'number' && Number.isFinite(animal.bondXp) ? Math.max(0, animal.bondXp) : 100;
  const days = typeof animal.careDaysCount === 'number' && Number.isFinite(animal.careDaysCount) ? Math.max(1, Math.floor(animal.careDaysCount)) : 1;

  // XP tiers: 100 (Lv1), 200 (Lv2), 300 (Lv3), 400 (Lv4), 500 (Lv5)
  const xpTier = Math.min(5, Math.max(1, Math.floor(xp / 100)));

  // Care time gates:
  // Lv.1: Day 1+
  // Lv.2: Day 2+ or >= 180 XP
  // Lv.3: Day 4+ or >= 280 XP
  // Lv.4: Day 7+ (1 week) or >= 390 XP
  // Lv.5: Day 14+ (2-3 weeks of care) and 500 XP
  if (xp >= 500 && days >= 14) return 5;
  if (xp >= 400 && days >= 7) return 4;
  if (xp >= 300 && days >= 3) return 3;
  if (xp >= 200) return 2;
  return Math.min(4, xpTier);
}

/**
 * Records a daily care interaction (feeding or gentle petting) for the 1-3 week Love Level progression.
 */
export function recordAnimalCareInteraction(animal: PlacedAnimal | null | undefined, xpGain: number): void {
  if (!animal) return;
  const gain = typeof xpGain === 'number' && Number.isFinite(xpGain) ? Math.max(0, xpGain) : 0;
  const todayStamp = new Date().toISOString().slice(0, 10);
  if (!animal.careStartTimestampMs || !Number.isFinite(animal.careStartTimestampMs)) {
    animal.careStartTimestampMs = Date.now();
  }
  if (!animal.careDaysCount || !Number.isFinite(animal.careDaysCount)) {
    animal.careDaysCount = 1;
  }
  if (animal.lastCareDayStamp !== todayStamp) {
    animal.lastCareDayStamp = todayStamp;
    animal.careDaysCount += 1;
  }
  // Also factor in real elapsed days since adoption if the animal has been kept fed
  const elapsedDaysSinceAdoption = Math.floor(
    Math.max(0, Date.now() - animal.careStartTimestampMs) / (1000 * 60 * 60 * 24),
  );
  const currentHunger = Number.isFinite(animal.hunger) ? animal.hunger : 50;
  if (currentHunger > 30 && elapsedDaysSinceAdoption + 1 > animal.careDaysCount) {
    animal.careDaysCount = Math.min(21, elapsedDaysSinceAdoption + 1);
  }
  // Progress bondXp steadily toward 500
  const currentXp = Number.isFinite(animal.bondXp) ? animal.bondXp : 100;
  animal.bondXp = Math.min(500, Math.max(0, currentXp + gain));
}

function migrateWorldX(rawX: number | undefined, fallbackX: number, version: number): number {
  if (typeof rawX !== 'number' || !Number.isFinite(rawX)) return fallbackX;
  if (version < 2 && rawX <= BASE_WORLD_WIDTH) {
    return Math.max(120, Math.min(WORLD_WIDTH - 120, rawX * WORLD_SCALE_X));
  }
  return Math.max(120, Math.min(WORLD_WIDTH - 120, rawX));
}

/**
 * Old combined food items that were split into real, single foods.
 * A player who owned one "Rambutan & Papaya" keeps one rambutan AND one papaya.
 */
const LEGACY_FOOD_SPLITS: Record<string, string[]> = {
  food_rambutan_papaya: ['food_rambutan_fruit', 'food_papaya_fruit'],
  food_papaya_rambutan: ['food_rambutan_fruit', 'food_papaya_fruit'],
  food_bamboo_honey_pellet: ['food_bamboo_shoots', 'food_wild_honeycomb'],
  food_bamboo_honey: ['food_bamboo_shoots', 'food_wild_honeycomb'],
};

function migrateFoodInventory(raw: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, count] of Object.entries(raw ?? {})) {
    const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    const targets = LEGACY_FOOD_SPLITS[id] ?? [id];
    for (const t of targets) {
      if (!FOOD_CATALOG[t]) continue;
      out[t] = (out[t] ?? 0) + n;
    }
  }
  return out;
}

function migrateFoodId(id: string | undefined): string | undefined {
  if (!id) return id;
  const mapped = LEGACY_FOOD_SPLITS[id]?.[0] ?? id;
  return FOOD_CATALOG[mapped] ? mapped : undefined;
}

/**
 * Default scenery plants are regenerated from the current layout (for example the bamboo
 * that used to stand at the bottom of the river), keeping their growth by species.
 */
function refreshDefaultScenery<T extends { uid?: string; assetId: string; isDefaultScenery?: boolean; growthStage: 1 | 2 | 3; growthProgress: number; fruitCount: number }>(
  plants: T[],
): T[] {
  const isDefault = (p: T) => Boolean(p.isDefaultScenery || (typeof p.uid === 'string' && p.uid.startsWith('default_plant_')));
  const userPlants = plants.filter((p) => !isDefault(p));
  const savedDefaults = plants.filter((p) => isDefault(p));
  const fresh = createDefaultSanctuaryPlants().map((d) => {
    const prev = savedDefaults.find((p) => p.uid === d.uid || p.assetId === d.assetId);
    return prev
      ? { ...d, growthStage: prev.growthStage, growthProgress: prev.growthProgress, fruitCount: prev.fruitCount }
      : d;
  });
  return [...(fresh as unknown as T[]), ...userPlants];
}

export function getSaveStorageKey(userId?: string): string {
  return userId ? `${SAVE_STORAGE_KEY}_${userId}` : SAVE_STORAGE_KEY;
}

export function loadSaveState(
  userId?: string,
  cloudState?: Partial<SaveState> | null,
): LoadedSaveResult {
  try {
    const key = getSaveStorageKey(userId);
    let raw: string | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        raw = window.localStorage.getItem(key);
        // Fallback to guest save if user key is empty, to preserve progress upon sign-in
        if (!raw && userId) {
          raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
        }
      } catch (err) {
        console.warn('Sanctuary load localStorage read error:', err);
      }
    }

    if (!raw && (!cloudState || typeof cloudState !== 'object')) {
      return {
        state: createInitialSaveState(),
        offlineGreenbitsEarned: 0,
        offlineMinutes: 0,
      };
    }

    let localParsed: Partial<SaveState> = {};
    if (raw && raw !== 'undefined' && raw !== 'null') {
      try {
        localParsed = sanitizeKeys(JSON.parse(raw)) as Partial<SaveState>;
      } catch (err) {
        console.warn('Sanctuary save state JSON parse error:', err);
      }
    }

    const safeCloud = cloudState && typeof cloudState === 'object' ? sanitizeKeys(cloudState) : null;
    const localTs = typeof localParsed.lastSavedTimestampMs === 'number' && Number.isFinite(localParsed.lastSavedTimestampMs)
      ? localParsed.lastSavedTimestampMs
      : 0;
    const cloudTs = typeof safeCloud?.lastSavedTimestampMs === 'number' && Number.isFinite(safeCloud.lastSavedTimestampMs)
      ? safeCloud.lastSavedTimestampMs
      : 0;

    const parsed: Partial<SaveState> =
      safeCloud && cloudTs >= localTs
        ? { ...localParsed, ...safeCloud }
        : { ...(safeCloud ?? {}), ...localParsed };

    const base = createInitialSaveState();
    const saveVersion = typeof parsed.version === 'number' && Number.isFinite(parsed.version) ? parsed.version : 1;

    const lastTs = Math.max(localTs, cloudTs);
    const elapsedMs = lastTs > 0 ? Math.max(0, Date.now() - lastTs) : 0;
    const offlineMinutes = Math.min(720, Math.floor(elapsedMs / 60000));
    // Biology: 6 hours (360 minutes) from 100% full to 0% hungry
    const offlineHungerDrop = (offlineMinutes / 360) * 100;

    // Pick candidate animals from parsed, falling back to local or base
    const animalSources = [
      parsed.placedAnimals,
      localParsed.placedAnimals,
      safeCloud?.placedAnimals,
    ];
    let candidateAnimals: any[] | undefined = undefined;
    for (const src of animalSources) {
      if (Array.isArray(src) && src.length > 0) {
        candidateAnimals = src;
        break;
      }
    }

    const sanitizedAnimals: PlacedAnimal[] =
      candidateAnimals && candidateAnimals.length > 0
        ? candidateAnimals
            .filter((a) => a && typeof a.assetId === 'string' && ASSET_ECO_CONFIG[a.assetId])
            .map((a, idx) => {
              const nativeZone = ASSET_ECO_CONFIG[a.assetId]?.allowedZones[0] ?? 'forest';
              const targetZone = a.zoneId && getZoneSpec(a.zoneId) ? a.zoneId : nativeZone;
              const zoneSpec = getZoneSpec(targetZone);
              const defaultCenter = (zoneSpec.xStart + zoneSpec.xEnd) * 0.5;
              const migratedX = migrateWorldX(a.x, defaultCenter, saveVersion);
              const migratedTargetX = migrateWorldX(a.targetX, migratedX + 140, saveVersion);
              const rawHunger = typeof a.hunger === 'number' && Number.isFinite(a.hunger) ? a.hunger : 85;
              return {
                uid: typeof a.uid === 'string' && a.uid.trim() ? a.uid.trim() : `anim_restored_${idx}`,
                assetId: a.assetId,
                customName: typeof a.customName === 'string' && a.customName.trim() ? a.customName.trim() : undefined,
                zoneId: targetZone,
                x: migratedX,
                y: typeof a.y === 'number' && Number.isFinite(a.y) ? a.y : 380,
                targetX: migratedTargetX,
                targetY: typeof a.targetY === 'number' && Number.isFinite(a.targetY) ? a.targetY : 380,
                vx: 0,
                vy: 0,
                facing: (a.facing === -1 ? -1 : 1) as 1 | -1,
                hunger: Math.max(0, Math.min(100, rawHunger - offlineHungerDrop)),
                happiness: typeof a.happiness === 'number' && Number.isFinite(a.happiness) ? Math.max(0, Math.min(100, a.happiness)) : 90,
                bondXp: typeof a.bondXp === 'number' && Number.isFinite(a.bondXp) ? Math.max(0, Math.min(500, a.bondXp)) : 100,
                careStartTimestampMs:
                  typeof a.careStartTimestampMs === 'number' && Number.isFinite(a.careStartTimestampMs)
                    ? a.careStartTimestampMs
                    : Date.now(),
                careDaysCount:
                  typeof a.careDaysCount === 'number' && Number.isFinite(a.careDaysCount)
                    ? Math.max(1, Math.floor(a.careDaysCount))
                    : 1,
                lastCareDayStamp:
                  typeof a.lastCareDayStamp === 'string' ? a.lastCareDayStamp : new Date().toISOString().slice(0, 10),
                showBabyCompanion: Boolean(a.showBabyCompanion),
                currentEmotion: typeof a.currentEmotion === 'string' ? a.currentEmotion : 'idle',
                emotionTimerSec: typeof a.emotionTimerSec === 'number' && Number.isFinite(a.emotionTimerSec) ? Math.max(0, a.emotionTimerSec) : 0,
                lastEmoteTriggerMs: 0,
                emoteSpamCount: 0,
                locoBlend: typeof a.locoBlend === 'number' && Number.isFinite(a.locoBlend) ? a.locoBlend : 1,
                eatingStage: a.eatingStage ?? 'none',
                eatingFoodId: migrateFoodId(a.eatingFoodId),
                eatingTimerSec: typeof a.eatingTimerSec === 'number' && Number.isFinite(a.eatingTimerSec) ? Math.max(0, a.eatingTimerSec) : 0,
                petScratchAccum: typeof a.petScratchAccum === 'number' && Number.isFinite(a.petScratchAccum) ? a.petScratchAccum : 0,
                lastGreenbitDropSec: typeof a.lastGreenbitDropSec === 'number' && Number.isFinite(a.lastGreenbitDropSec) ? a.lastGreenbitDropSec : 0,
                blinkCountdownSec: typeof a.blinkCountdownSec === 'number' && Number.isFinite(a.blinkCountdownSec) ? a.blinkCountdownSec : 2.0,
                blinkActiveSec: typeof a.blinkActiveSec === 'number' && Number.isFinite(a.blinkActiveSec) ? a.blinkActiveSec : 0,
                isFalling: Boolean(a.isFalling),
                fallImpactSec: typeof a.fallImpactSec === 'number' && Number.isFinite(a.fallImpactSec) ? a.fallImpactSec : 0,
              };
            })
        : base.placedAnimals;

    const plantSources = [
      parsed.placedPlants,
      localParsed.placedPlants,
      safeCloud?.placedPlants,
    ];
    let candidatePlants: any[] | undefined = undefined;
    for (const src of plantSources) {
      if (Array.isArray(src) && src.length > 0) {
        candidatePlants = src;
        break;
      }
    }

    const sanitizedPlants: PlacedPlant[] =
      candidatePlants && candidatePlants.length > 0
        ? candidatePlants
            .filter((p) => p && typeof p.assetId === 'string' && ASSET_ECO_CONFIG[p.assetId])
            .map((p, idx) => {
              const zoneSpec = getZoneSpec(p.zoneId ?? 'forest');
              const defaultCenter = (zoneSpec.xStart + zoneSpec.xEnd) * 0.5;
              let finalX = migrateWorldX(p.x, defaultCenter, saveVersion);
              if (getPlantPlacementProblem(p.assetId, finalX)) {
                finalX = defaultCenter;
              }
              return {
                ...p,
                uid: typeof p.uid === 'string' && p.uid.trim() ? p.uid.trim() : `plant_restored_${idx}`,
                assetId: p.assetId,
                zoneId: p.zoneId ?? 'forest',
                x: finalX,
                y: typeof p.y === 'number' && Number.isFinite(p.y) ? p.y : 380,
                growthStage: (p.growthStage === 1 || p.growthStage === 2 || p.growthStage === 3
                  ? p.growthStage
                  : 1) as 1 | 2 | 3,
                growthProgress: typeof p.growthProgress === 'number' && Number.isFinite(p.growthProgress) ? Math.max(0, Math.min(100, p.growthProgress)) : 25,
                fruitCount: typeof p.fruitCount === 'number' && Number.isFinite(p.fruitCount) ? Math.max(0, Math.floor(p.fruitCount)) : 0,
                hasGoldenFruit: Boolean(p.hasGoldenFruit),
                fruitRegenTimerSec: typeof p.fruitRegenTimerSec === 'number' && Number.isFinite(p.fruitRegenTimerSec) ? Math.max(0, p.fruitRegenTimerSec) : 28,
                swayImpulse: typeof p.swayImpulse === 'number' && Number.isFinite(p.swayImpulse) ? p.swayImpulse : 0,
                grazingBitesRemaining: typeof p.grazingBitesRemaining === 'number' && Number.isFinite(p.grazingBitesRemaining)
                  ? Math.max(0, Math.floor(p.grazingBitesRemaining))
                  : 4,
                isDefaultScenery: Boolean(p.isDefaultScenery),
              };
            })
        : createDefaultSanctuaryPlants();

    const finalAnimals = sanitizedAnimals.length > 0 ? sanitizedAnimals : base.placedAnimals;
    const finalPlants = refreshDefaultScenery(sanitizedPlants);

    // Build unified ownedAssets: Starter turtle is always owned; placed animals/plants are preserved; non-zero counts kept.
    const ownedAssetsMap: Record<string, number> = {
      animal_28_green_sea_turtle: 1,
    };
    const mergeOwned = (src: Record<string, any> | undefined) => {
      if (!src || typeof src !== 'object') return;
      for (const [id, count] of Object.entries(src)) {
        if (typeof id === 'string' && ASSET_ECO_CONFIG[id]) {
          const num = typeof count === 'number' && Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;
          ownedAssetsMap[id] = Math.max(ownedAssetsMap[id] ?? 0, num);
        }
      }
    };
    mergeOwned(localParsed.ownedAssets);
    mergeOwned(safeCloud?.ownedAssets);
    mergeOwned(parsed.ownedAssets);
    for (const a of finalAnimals) {
      if (a?.assetId && ASSET_ECO_CONFIG[a.assetId]) {
        ownedAssetsMap[a.assetId] = Math.max(1, ownedAssetsMap[a.assetId] ?? 1);
      }
    }
    for (const p of finalPlants) {
      if (p?.assetId && !p.isDefaultScenery && ASSET_ECO_CONFIG[p.assetId]) {
        ownedAssetsMap[p.assetId] = Math.max(1, ownedAssetsMap[p.assetId] ?? 1);
      }
    }

    // Merge food inventory across sources so purchases are never wiped
    const localFood = migrateFoodInventory(localParsed.foodInventory);
    const cloudFood = safeCloud ? migrateFoodInventory(safeCloud.foodInventory) : {};
    const parsedFood = parsed.foodInventory ? migrateFoodInventory(parsed.foodInventory) : {};
    const mergedFood: Record<string, number> = { ...base.foodInventory };
    for (const [k, v] of Object.entries(localFood)) {
      mergedFood[k] = Math.max(mergedFood[k] ?? 0, v);
    }
    for (const [k, v] of Object.entries(cloudFood)) {
      mergedFood[k] = Math.max(mergedFood[k] ?? 0, v);
    }
    for (const [k, v] of Object.entries(parsedFood)) {
      mergedFood[k] = Math.max(mergedFood[k] ?? 0, v);
    }

    // Merge EcoDex and Favorite Foods discoveries additively
    const ecoDexSet = new Set<string>([
      ...base.discoveredEcoDex,
      ...(Array.isArray(localParsed.discoveredEcoDex) ? localParsed.discoveredEcoDex : []),
      ...(Array.isArray(safeCloud?.discoveredEcoDex) ? safeCloud.discoveredEcoDex : []),
      ...(Array.isArray(parsed.discoveredEcoDex) ? parsed.discoveredEcoDex : []),
    ]);
    for (const a of finalAnimals) if (a?.assetId) ecoDexSet.add(a.assetId);
    for (const p of finalPlants) if (p?.assetId) ecoDexSet.add(p.assetId);

    const favFoodsSet = new Set<string>([
      ...(Array.isArray(localParsed.discoveredFavoriteFoods) ? localParsed.discoveredFavoriteFoods : []),
      ...(Array.isArray(safeCloud?.discoveredFavoriteFoods) ? safeCloud.discoveredFavoriteFoods : []),
      ...(Array.isArray(parsed.discoveredFavoriteFoods) ? parsed.discoveredFavoriteFoods : []),
    ]);

    const state: SaveState = {
      ...base,
      ...parsed,
      version: 2,
      greenbits:
        typeof parsed.greenbits === 'number' && Number.isFinite(parsed.greenbits)
          ? Math.max(0, Math.round(parsed.greenbits))
          : typeof localParsed.greenbits === 'number' && Number.isFinite(localParsed.greenbits)
          ? Math.max(0, Math.round(localParsed.greenbits))
          : base.greenbits,
      harmonyXp:
        typeof parsed.harmonyXp === 'number' && Number.isFinite(parsed.harmonyXp)
          ? Math.max(0, Math.round(parsed.harmonyXp))
          : base.harmonyXp,
      timeOfDayHours:
        typeof parsed.timeOfDayHours === 'number' && Number.isFinite(parsed.timeOfDayHours)
          ? Math.max(0, Math.min(24, parsed.timeOfDayHours))
          : base.timeOfDayHours,
      autoCycleTime: typeof parsed.autoCycleTime === 'boolean' ? parsed.autoCycleTime : base.autoCycleTime,
      currentWeather: parsed.currentWeather ?? base.currentWeather,
      autoCycleWeather: typeof parsed.autoCycleWeather === 'boolean' ? parsed.autoCycleWeather : base.autoCycleWeather,
      soundMuted: typeof parsed.soundMuted === 'boolean' ? parsed.soundMuted : base.soundMuted,
      streakDays: typeof parsed.streakDays === 'number' && Number.isFinite(parsed.streakDays) ? Math.max(1, Math.floor(parsed.streakDays)) : base.streakDays,
      cameraY: typeof parsed.cameraY === 'number' && Number.isFinite(parsed.cameraY) ? parsed.cameraY : base.cameraY,
      ownedAssets: ownedAssetsMap,
      foodInventory: mergedFood,
      placedAnimals: finalAnimals,
      placedPlants: finalPlants,
      droppedFoods: Array.isArray(parsed.droppedFoods)
        ? parsed.droppedFoods
          .filter((df) => df && typeof df.x === 'number' && Number.isFinite(df.x) && typeof df.y === 'number' && Number.isFinite(df.y))
          .map((df) => ({
            ...df,
            foodId: migrateFoodId(df.foodId) ?? '',
            x: migrateWorldX(df.x, 543600, saveVersion),
          }))
          .filter((df) => df.foodId !== '')
        : [],
      discoveredEcoDex: Array.from(ecoDexSet),
      discoveredFavoriteFoods: Array.from(favFoodsSet),
      discoveredEmotions: parsed.discoveredEmotions ?? base.discoveredEmotions,
      dailyQuests:
        Array.isArray(parsed.dailyQuests) && parsed.dailyQuests.length > 0
          ? parsed.dailyQuests
          : base.dailyQuests,
      lastSavedTimestampMs: Date.now(),
    };

    const cappedOfflineMins = Math.min(240, offlineMinutes);
    let passivePerMin = 0;
    for (const a of state.placedAnimals) {
      passivePerMin += ASSET_ECO_CONFIG[a.assetId]?.passiveGreenbitsPerMin ?? 8;
    }
    for (const p of state.placedPlants) {
      if (!p.isDefaultScenery) {
        passivePerMin += ASSET_ECO_CONFIG[p.assetId]?.passiveGreenbitsPerMin ?? 5;
      }
    }
    const offlineGreenbitsEarned =
      cappedOfflineMins >= 2
        ? Math.min(600, Math.round(cappedOfflineMins * passivePerMin * 0.35))
        : 0;

    return {
      state,
      offlineGreenbitsEarned,
      offlineMinutes: cappedOfflineMins,
    };
  } catch (err) {
    console.error('Fatal error loading Sanctuary save state, fallback to initial state:', err);
    return {
      state: createInitialSaveState(),
      offlineGreenbitsEarned: 0,
      offlineMinutes: 0,
    };
  }
}

export function persistSaveState(
  state: SaveState,
  userId?: string,
  onSaveStateChange?: (state: SaveState) => void,
): void {
  if (!state || typeof state !== 'object') return;
  try {
    state.lastSavedTimestampMs = Date.now();
  } catch {
    // Non-extensible state guard
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const key = getSaveStorageKey(userId);
      const json = JSON.stringify(state);
      window.localStorage.setItem(key, json);
      if (!userId) {
        window.localStorage.setItem(SAVE_STORAGE_KEY, json);
      }
    } catch (e) {
      // Storage quota exceeded or disabled, continue to invoke cloud sync callback
      console.warn('Sanctuary save state localStorage write failed:', e);
    }
  }

  try {
    onSaveStateChange?.(state);
  } catch (e) {
    console.warn('onSaveStateChange callback error:', e);
  }
}

export function resetSaveState(): SaveState {
  const fresh = createInitialSaveState();
  persistSaveState(fresh);
  return fresh;
}

export function exportSaveStateJson(state: SaveState): string {
  return JSON.stringify(state, null, 2);
}

export function importSaveStateJson(jsonText: string): SaveState | null {
  try {
    if (typeof jsonText !== 'string' || !jsonText.trim()) return null;
    const rawParsed = JSON.parse(jsonText);
    if (!rawParsed || typeof rawParsed !== 'object') return null;
    const sanitized = sanitizeKeys(rawParsed) as Partial<SaveState>;
    // Pass sanitized object through loadSaveState pipeline for comprehensive validation and migration
    const result = loadSaveState(undefined, sanitized);
    persistSaveState(result.state);
    return result.state;
  } catch (err) {
    console.warn('Failed to import save state JSON:', err);
    return null;
  }
}
