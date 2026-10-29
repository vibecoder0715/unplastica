import {
  ASSET_ECO_CONFIG,
  BASE_WORLD_WIDTH,
  createDefaultSanctuaryPlants,
  createInitialSaveState,
  getZoneSpec,
  WORLD_SCALE_X,
  WORLD_WIDTH,
} from './worldConfig';
import type { PlacedAnimal, SaveState } from './types';

export const SAVE_STORAGE_KEY = 'malaysia_ecopet_save_v1';

export interface LoadedSaveResult {
  state: SaveState;
  offlineGreenbitsEarned: number;
  offlineMinutes: number;
}

/**
 * Computes Love Level (1 .. 5) based on sustained care (1-3 weeks / 7-21 care days + bondXp).
 * Only reaches max Level 5 with sufficient care milestones and time!
 */
export function computeAnimalLoveLevel(animal: PlacedAnimal): number {
  const xp = Math.max(0, animal.bondXp ?? 100);
  const days = Math.max(1, animal.careDaysCount ?? 1);

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
export function recordAnimalCareInteraction(animal: PlacedAnimal, xpGain: number): void {
  const todayStamp = new Date().toISOString().slice(0, 10);
  if (!animal.careStartTimestampMs) {
    animal.careStartTimestampMs = Date.now();
  }
  if (!animal.careDaysCount) {
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
  if (animal.hunger > 30 && elapsedDaysSinceAdoption + 1 > animal.careDaysCount) {
    animal.careDaysCount = Math.min(21, elapsedDaysSinceAdoption + 1);
  }
  // Progress bondXp steadily toward 500
  animal.bondXp = Math.min(500, (animal.bondXp ?? 100) + xpGain);
}

function migrateWorldX(rawX: number | undefined, fallbackX: number, version: number): number {
  if (typeof rawX !== 'number' || !Number.isFinite(rawX)) return fallbackX;
  if (version < 2 && rawX <= BASE_WORLD_WIDTH) {
    return Math.max(120, Math.min(WORLD_WIDTH - 120, rawX * WORLD_SCALE_X));
  }
  return Math.max(120, Math.min(WORLD_WIDTH - 120, rawX));
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
    const raw =
      typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem(key) ?? (!userId ? window.localStorage.getItem(SAVE_STORAGE_KEY) : null)
        : null;
    if (!raw && (!cloudState || typeof cloudState !== 'object')) {
      return {
        state: createInitialSaveState(),
        offlineGreenbitsEarned: 0,
        offlineMinutes: 0,
      };
    }
    const localParsed = raw ? (JSON.parse(raw) as Partial<SaveState>) : {};
    const localTs = Number(localParsed.lastSavedTimestampMs || 0);
    const cloudTs = Number(cloudState?.lastSavedTimestampMs || 0);
    const parsed: Partial<SaveState> =
      cloudState && cloudTs >= localTs
        ? { ...localParsed, ...cloudState }
        : { ...(cloudState ?? {}), ...localParsed };
    const base = createInitialSaveState();
    const saveVersion = typeof parsed.version === 'number' ? parsed.version : 1;

    const elapsedMs = Math.max(0, Date.now() - (parsed.lastSavedTimestampMs || Date.now()));
    const offlineMinutes = Math.min(720, Math.floor(elapsedMs / 60000));
    // Biology: 6 hours (360 minutes) from 100% full to 0% hungry
    const offlineHungerDrop = (offlineMinutes / 360) * 100;

    const sanitizedAnimals =
      Array.isArray(parsed.placedAnimals) && parsed.placedAnimals.length > 0
        ? parsed.placedAnimals
            .filter((a) => a && typeof a.assetId === 'string' && ASSET_ECO_CONFIG[a.assetId])
            .map((a, idx) => {
              const zoneSpec = getZoneSpec(a.zoneId ?? 'sea');
              const defaultCenter = (zoneSpec.xStart + zoneSpec.xEnd) * 0.5;
              const migratedX = migrateWorldX(a.x, defaultCenter, saveVersion);
              const migratedTargetX = migrateWorldX(a.targetX, migratedX + 140, saveVersion);
              const rawHunger = Number.isFinite(a.hunger) ? a.hunger : 85;
              return {
                ...base.placedAnimals[0],
                ...a,
                uid: a.uid || `anim_restored_${idx}`,
                x: migratedX,
                y: Number.isFinite(a.y) ? a.y : 380,
                targetX: migratedTargetX,
                targetY: Number.isFinite(a.targetY) ? a.targetY : 380,
                vx: 0,
                vy: 0,
                facing: (a.facing === -1 ? -1 : 1) as 1 | -1,
                hunger: Math.max(0, Math.min(100, rawHunger - offlineHungerDrop)),
                happiness: Number.isFinite(a.happiness) ? Math.max(0, Math.min(100, a.happiness)) : 90,
                bondXp: Number.isFinite(a.bondXp) ? a.bondXp : 100,
                careStartTimestampMs: a.careStartTimestampMs || Date.now(),
                careDaysCount: a.careDaysCount || 1,
                lastCareDayStamp: a.lastCareDayStamp || new Date().toISOString().slice(0, 10),
                emotionTimerSec: Number.isFinite(a.emotionTimerSec) ? a.emotionTimerSec : 0,
                lastEmoteTriggerMs: 0,
                emoteSpamCount: 0,
                locoBlend: 1,
                eatingStage: a.eatingStage ?? 'none',
                eatingTimerSec: Number.isFinite(a.eatingTimerSec) ? a.eatingTimerSec : 0,
                blinkCountdownSec: Number.isFinite(a.blinkCountdownSec) ? a.blinkCountdownSec : 2.0,
                blinkActiveSec: Number.isFinite(a.blinkActiveSec) ? a.blinkActiveSec : 0,
              };
            })
        : base.placedAnimals;

    const sanitizedPlants =
      Array.isArray(parsed.placedPlants) && parsed.placedPlants.length > 0
        ? parsed.placedPlants
            .filter((p) => p && typeof p.assetId === 'string' && ASSET_ECO_CONFIG[p.assetId])
            .map((p, idx) => {
              const zoneSpec = getZoneSpec(p.zoneId ?? 'forest');
              const defaultCenter = (zoneSpec.xStart + zoneSpec.xEnd) * 0.5;
              return {
                ...p,
                uid: p.uid || `plant_restored_${idx}`,
                x: migrateWorldX(p.x, defaultCenter, saveVersion),
                y: Number.isFinite(p.y) ? p.y : 380,
                growthStage: (p.growthStage === 1 || p.growthStage === 2 || p.growthStage === 3
                  ? p.growthStage
                  : 1) as 1 | 2 | 3,
                growthProgress: Number.isFinite(p.growthProgress) ? p.growthProgress : 25,
                fruitCount: Number.isFinite(p.fruitCount) ? p.fruitCount : 0,
                hasGoldenFruit: Boolean(p.hasGoldenFruit),
                fruitRegenTimerSec: Number.isFinite(p.fruitRegenTimerSec) ? p.fruitRegenTimerSec : 28,
                swayImpulse: Number.isFinite(p.swayImpulse) ? p.swayImpulse : 0,
                grazingBitesRemaining: Number.isFinite(p.grazingBitesRemaining)
                  ? p.grazingBitesRemaining
                  : 4,
              };
            })
        : createDefaultSanctuaryPlants();

    const state: SaveState = {
      ...base,
      ...parsed,
      version: 2,
      greenbits:
        typeof parsed.greenbits === 'number' && Number.isFinite(parsed.greenbits)
          ? Math.max(0, Math.round(parsed.greenbits))
          : base.greenbits,
      harmonyXp:
        typeof parsed.harmonyXp === 'number' && Number.isFinite(parsed.harmonyXp)
          ? Math.max(0, parsed.harmonyXp)
          : base.harmonyXp,
      timeOfDayHours:
        typeof parsed.timeOfDayHours === 'number' && Number.isFinite(parsed.timeOfDayHours)
          ? parsed.timeOfDayHours
          : base.timeOfDayHours,
      ownedAssets: {
        animal_28_green_sea_turtle: 1,
        ...(parsed.ownedAssets ?? {}),
      },
      foodInventory: {
        ...base.foodInventory,
        ...(parsed.foodInventory ?? {}),
      },
      placedAnimals: sanitizedAnimals.length > 0 ? sanitizedAnimals : base.placedAnimals,
      placedPlants: sanitizedPlants,
      droppedFoods: Array.isArray(parsed.droppedFoods)
        ? parsed.droppedFoods
            .filter((df) => df && Number.isFinite(df.x) && Number.isFinite(df.y))
            .map((df) => ({
              ...df,
              x: migrateWorldX(df.x, 543600, saveVersion),
            }))
        : [],
      discoveredEcoDex: Array.isArray(parsed.discoveredEcoDex)
        ? parsed.discoveredEcoDex
        : base.discoveredEcoDex,
      discoveredFavoriteFoods: Array.isArray(parsed.discoveredFavoriteFoods)
        ? parsed.discoveredFavoriteFoods
        : [],
      discoveredEmotions: parsed.discoveredEmotions ?? base.discoveredEmotions,
      dailyQuests:
        Array.isArray(parsed.dailyQuests) && parsed.dailyQuests.length > 0
          ? parsed.dailyQuests
          : base.dailyQuests,
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
  } catch {
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
  try {
    state.lastSavedTimestampMs = Date.now();
    const key = getSaveStorageKey(userId);
    window.localStorage.setItem(key, JSON.stringify(state));
    if (!userId) {
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(state));
    }
    onSaveStateChange?.(state);
  } catch {
    // Ignore storage quota errors
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
    const parsed = JSON.parse(jsonText) as Partial<SaveState>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.greenbits !== 'number') {
      return null;
    }
    const base = createInitialSaveState();
    const merged: SaveState = {
      ...base,
      ...parsed,
      version: 2,
      ownedAssets: {
        animal_28_green_sea_turtle: 1,
        ...(parsed.ownedAssets ?? {}),
      },
    };
    persistSaveState(merged);
    return merged;
  } catch {
    return null;
  }
}
