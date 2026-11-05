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

export const MAX_ANIMAL_LEVEL = 100;

let activeUserMeterSalt = 0;

export function setActiveUserMeterIdentity(userId?: string, seed?: number): void {
  const raw = `${userId || 'guest'}_${seed ?? 0}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  activeUserMeterSalt = Math.abs(h >>> 0);
}

function getDistinctMeterFactor(animal?: Pick<PlacedAnimal, 'uid' | 'assetId'> | null): number {
  if (!animal) return 1.0;
  const key = `${animal.assetId}_${animal.uid}_${activeUserMeterSalt}`;
  let h = 2166136261 ^ activeUserMeterSalt;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const norm = ((h >>> 0) % 1000) / 1000; // 0 .. 1
  return 0.94 + norm * 0.14; // Distinct between users & animals (0.94x .. 1.08x)
}

/**
 * Minimum bondXp required to reach a given Love Level (1 .. 100).
 * - Baseline bondXp is 100 for Lv.1.
 * - Lv.1 -> Lv.2 requires ~100 XP (5 consecutive feeds at +20 XP each, or 100 interactions at +1 XP each).
 * - Higher levels scale progressively and distinctly per user/animal.
 */
export function getXpRequiredForLevel(
  level: number,
  animal?: Pick<PlacedAnimal, 'uid' | 'assetId'> | null,
): number {
  const clamped = Math.max(1, Math.min(MAX_ANIMAL_LEVEL, Math.floor(level)));
  if (clamped <= 1) return 100;
  const steps = clamped - 1;
  const factor = getDistinctMeterFactor(animal);
  // Step 1 (Lv.1 -> Lv.2) is 100 XP base; subsequent levels scale smoothly
  const rawDelta = 100 * steps + 25 * steps * (steps - 1) + 2 * steps * (steps - 1) * (steps - 2);
  return 100 + Math.max(90, Math.round(rawDelta * factor));
}

/**
 * Computes Love Level (1 .. 100) from an animal's bondXp.
 */
export function computeAnimalLoveLevel(animal: PlacedAnimal | null | undefined): number {
  if (!animal) return 1;
  const xp = typeof animal.bondXp === 'number' && Number.isFinite(animal.bondXp) ? Math.max(0, animal.bondXp) : 100;
  let lvl = 1;
  while (lvl < MAX_ANIMAL_LEVEL && xp >= getXpRequiredForLevel(lvl + 1, animal)) {
    lvl += 1;
  }
  return lvl;
}

export interface LoveMeterProgress {
  level: number;
  currentStepXp: number;
  requiredStepXp: number;
  progressPct: number;
  consecutiveFeeds: number;
}

/**
 * Returns the metered progress within the animal's current Love Level.
 */
export function getAnimalLoveMeterProgress(animal: PlacedAnimal | null | undefined): LoveMeterProgress {
  if (!animal) {
    return { level: 1, currentStepXp: 0, requiredStepXp: 100, progressPct: 0, consecutiveFeeds: 0 };
  }
  const level = computeAnimalLoveLevel(animal);
  if (level >= MAX_ANIMAL_LEVEL) {
    return {
      level: MAX_ANIMAL_LEVEL,
      currentStepXp: 100,
      requiredStepXp: 100,
      progressPct: 100,
      consecutiveFeeds: animal.consecutiveFeeds ?? 0,
    };
  }
  const xp = typeof animal.bondXp === 'number' && Number.isFinite(animal.bondXp) ? Math.max(100, animal.bondXp) : 100;
  const floorXp = getXpRequiredForLevel(level, animal);
  const nextXp = getXpRequiredForLevel(level + 1, animal);
  const requiredStepXp = Math.max(1, nextXp - floorXp);
  const currentStepXp = Math.max(0, Math.min(requiredStepXp, Math.round(xp - floorXp)));
  const progressPct = Math.max(0, Math.min(100, Math.round((currentStepXp / requiredStepXp) * 100)));
  return {
    level,
    currentStepXp,
    requiredStepXp,
    progressPct,
    consecutiveFeeds: animal.consecutiveFeeds ?? 0,
  };
}

/**
 * Computes Greenbits earned when an animal levels up from `fromLevel` to `toLevel`.
 * Rule:
 * - Lv.1 -> Lv.2: +5 Greenbits
 * - Lv.2 -> Lv.3: +10 Greenbits
 * - Lv.3 -> Lv.4: +20 Greenbits
 * - Multiplied by 2 each time, up to Lv.100 maximum.
 */
export function computeLevelUpGreenbitsReward(fromLevel: number, toLevel: number): number {
  const start = Math.max(1, Math.floor(fromLevel));
  const end = Math.min(MAX_ANIMAL_LEVEL, Math.floor(toLevel));
  if (end <= start) return 0;
  let total = 0;
  for (let lv = start; lv < end; lv++) {
    const stepReward = 5 * Math.pow(2, lv - 1);
    total += Number.isFinite(stepReward) ? Math.min(Number.MAX_SAFE_INTEGER - total, Math.round(stepReward)) : 0;
  }
  return total;
}

export interface AnimalCareLevelResult {
  oldLevel: number;
  newLevel: number;
  greenbitsEarned: number;
}

/**
 * Records a care interaction (feeding or petting) and returns any level-up Greenbits reward.
 * Only animal Lv. increments award Greenbits (up to Lv.100).
 */
export function recordAnimalCareInteraction(
  animal: PlacedAnimal | null | undefined,
  xpGain: number,
  interactionKind: 'feed' | 'interact' = 'interact',
): AnimalCareLevelResult {
  if (!animal) return { oldLevel: 1, newLevel: 1, greenbitsEarned: 0 };
  const oldLevel = computeAnimalLoveLevel(animal);
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
  const elapsedDaysSinceAdoption = Math.floor(
    Math.max(0, Date.now() - animal.careStartTimestampMs) / (1000 * 60 * 60 * 24),
  );
  const currentHunger = Number.isFinite(animal.hunger) ? animal.hunger : 50;
  if (currentHunger > 30 && elapsedDaysSinceAdoption + 1 > animal.careDaysCount) {
    animal.careDaysCount = Math.min(365, elapsedDaysSinceAdoption + 1);
  }

  const currentXp = Number.isFinite(animal.bondXp) ? animal.bondXp : 100;
  const maxXpCap = getXpRequiredForLevel(MAX_ANIMAL_LEVEL, animal);

  if (interactionKind === 'feed') {
    animal.consecutiveFeeds = (animal.consecutiveFeeds ?? 0) + 1;
    // At Lv.1, 5 consecutive feeds guarantees completing the Lv.1 -> Lv.2 meter!
    const nextLvXp = getXpRequiredForLevel(oldLevel + 1, animal);
    const stepReq = Math.max(1, nextLvXp - getXpRequiredForLevel(oldLevel, animal));
    const feedStepGain = Math.max(gain, Math.ceil(stepReq / (5 + (oldLevel - 1) * 2)));
    animal.bondXp = Math.min(maxXpCap, Math.max(0, currentXp + feedStepGain));
  } else {
    animal.consecutiveFeeds = 0;
    animal.bondXp = Math.min(maxXpCap, Math.max(0, currentXp + gain));
  }

  const newLevel = computeAnimalLoveLevel(animal);
  if (newLevel > oldLevel) {
    animal.consecutiveFeeds = 0;
  }
  const greenbitsEarned = computeLevelUpGreenbitsReward(oldLevel, newLevel);
  return { oldLevel, newLevel, greenbitsEarned };
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
    const prev = savedDefaults.find((p) => p.uid === d.uid && p.assetId === d.assetId);
    return prev
      ? {
          ...d,
          growthStage: Math.max(d.growthStage, prev.growthStage) as 1 | 2 | 3,
          growthProgress: Math.max(d.growthProgress, prev.growthProgress),
          fruitCount: prev.fruitCount,
        }
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
              const allowedZones = ASSET_ECO_CONFIG[a.assetId]?.allowedZones ?? ['forest'];
              const nativeZone = allowedZones[0] ?? 'forest';
              const isZoneValid = Boolean(a.zoneId && getZoneSpec(a.zoneId) && allowedZones.includes(a.zoneId));
              const targetZone = isZoneValid ? a.zoneId : nativeZone;
              const zoneSpec = getZoneSpec(targetZone);
              const defaultCenter = (zoneSpec.xStart + zoneSpec.xEnd) * 0.5;
              const migratedX = isZoneValid ? migrateWorldX(a.x, defaultCenter, saveVersion) : defaultCenter;
              const migratedTargetX = isZoneValid
                ? migrateWorldX(a.targetX, migratedX + 140, saveVersion)
                : migratedX + 140;
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
                bondXp: typeof a.bondXp === 'number' && Number.isFinite(a.bondXp) ? Math.max(0, Math.min(getXpRequiredForLevel(MAX_ANIMAL_LEVEL), a.bondXp)) : 100,
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
                lastGrowthDayStamp: typeof p.lastGrowthDayStamp === 'string' ? p.lastGrowthDayStamp : new Date().toISOString().slice(0, 10),
                plantedTimestampMs: typeof p.plantedTimestampMs === 'number' && Number.isFinite(p.plantedTimestampMs) ? p.plantedTimestampMs : Date.now(),
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
      graphicQuality:
        parsed.graphicQuality === 'performance' || parsed.graphicQuality === 'quality' || parsed.graphicQuality === 'dynamic'
          ? parsed.graphicQuality
          : 'dynamic',
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
      dailyEarnedGreenbits:
        typeof parsed.dailyEarnedGreenbits === 'number' && Number.isFinite(parsed.dailyEarnedGreenbits)
          ? Math.max(0, parsed.dailyEarnedGreenbits)
          : 0,
      lastEarnDayStamp: typeof parsed.lastEarnDayStamp === 'string' ? parsed.lastEarnDayStamp : '',
      fieldExpansions:
        typeof parsed.fieldExpansions === 'number' && Number.isFinite(parsed.fieldExpansions)
          ? Math.max(0, Math.floor(parsed.fieldExpansions))
          : 0,
      userMeterSeed:
        typeof parsed.userMeterSeed === 'number' && Number.isFinite(parsed.userMeterSeed)
          ? parsed.userMeterSeed
          : Math.floor(Math.random() * 1000000),
      lastSavedTimestampMs: Date.now(),
    };

    setActiveUserMeterIdentity(userId, state.userMeterSeed);

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
    const offlineGreenbitsEarned = 0;

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
