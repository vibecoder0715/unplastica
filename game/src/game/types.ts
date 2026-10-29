import type { EmotionType } from '../turtle/types';

export type HabitatZoneId = 'forest' | 'river' | 'mud' | 'sea';

export type WeatherType = 'sunny' | 'windy' | 'cloudy' | 'rain' | 'fog' | 'rainbow';

export type TimePhase = 'dawn' | 'day' | 'dusk' | 'night';

export type FoodCategory =
  | 'fruit'
  | 'seaweed'
  | 'plankton'
  | 'omnivore_pellet'
  | 'river_treat';

export interface HabitatZoneSpec {
  id: HabitatZoneId;
  name: string;
  subtitle: string;
  xStart: number;
  xEnd: number;
  badgeColor: string;
  waterSurfaceY?: number;
}

export interface TeleportTowerSpec {
  id: string;
  name: string;
  zoneId: HabitatZoneId;
  worldX: number;
  worldYOffset: number; // 0 = sea/ground level, negative = high canopy, positive = deep trench
  mapNormX: number; // 0 .. 1 on square PUBG/Genshin map
  mapNormY: number; // 0 .. 1 on square PUBG/Genshin map
  regionLabel: string;
}

export interface FoodItemSpec {
  id: string;
  name: string;
  category: FoodCategory;
  price: number;
  hungerRestore: number;
  greenbitsBonus: number;
  colorPrimary: string;
  colorSecondary: string;
  description: string;
  infoSentences: [string, string];
  searchQuery: string;
  allowedZones: HabitatZoneId[];
}

export interface AssetEcoMetadata {
  assetId: string;
  code: string;
  name: string;
  kind: 'animal' | 'plant';
  allowedZones: HabitatZoneId[];
  price: number;
  passiveGreenbitsPerMin: number;
  dietCategories?: FoodCategory[];
  favoriteFoodId?: string;
  producesFruitId?: string;
  isAquaticFoodSource?: boolean;
  aquaticFoodCategory?: 'seaweed' | 'plankton';
  defaultScale: number;
  collisionRadius: number;
  canopyHabit?: 'ground' | 'canopy' | 'pelagic' | 'benthic';
  conservationStatus: string;
  funFact: string;
  infoSentences: [string, string];
  searchQuery: string;
  phase2Iterations: [string[], string[], string[]];
}

export type EatingStage = 'none' | 'pickup' | 'chew' | 'swallow';

export interface PlacedAnimal {
  uid: string;
  assetId: string;
  customName?: string;
  zoneId: HabitatZoneId;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx?: number;
  vy?: number;
  facing: 1 | -1;
  hunger: number; // 0 (starving/crying) .. 100 (full), 6 hours full decay
  happiness: number; // 0 .. 100
  bondXp: number; // 0 .. 500 (100 per Love Lv, max Love Lv.5)
  careStartTimestampMs?: number;
  careDaysCount?: number;
  lastCareDayStamp?: string;
  showBabyCompanion: boolean;
  currentEmotion: EmotionType;
  emotionTimerSec: number;
  lastEmoteTriggerMs?: number;
  emoteSpamCount?: number;
  lastTapMs?: number;
  locoBlend?: number; // 0 = stationary on site (emoting), 1 = full walking/swimming
  eatingStage: EatingStage;
  eatingTimerSec: number;
  eatingFoodId?: string;
  petScratchAccum: number;
  lastGreenbitDropSec: number;
  blinkCountdownSec: number;
  blinkActiveSec: number;
  isFalling?: boolean;
  fallImpactSec?: number;
}

export interface PlacedPlant {
  uid: string;
  assetId: string;
  zoneId: HabitatZoneId;
  x: number;
  y: number;
  growthStage: 1 | 2 | 3; // 1 = Sapling/Leaves Only, 2 = Flowering, 3 = Fruiting
  growthProgress: number; // 0 .. 100
  fruitCount: number; // 0 .. 3 ripe pluckable fruits
  hasGoldenFruit: boolean;
  fruitRegenTimerSec: number;
  swayImpulse: number;
  grazingBitesRemaining: number; // for aquatic food plants
  isDefaultScenery?: boolean;
}

export interface DroppedFood {
  uid: string;
  foodId: string;
  zoneId: HabitatZoneId;
  x: number;
  y: number;
  vy: number;
  groundY: number;
  isGolden: boolean;
  bitesRemaining: number;
  createdAtSec: number;
}

export interface FloatingGreenbit {
  uid: string;
  x: number;
  y: number;
  vy: number;
  amount: number;
  label?: string;
  alpha: number;
  collected: boolean;
}

export interface RejectedDropAnimation {
  assetId: string;
  startX: number;
  startY: number;
  targetBarX: number;
  targetBarY: number;
  progress: number; // 0 .. 1
  reason: string;
}

export interface DailyQuest {
  id: string;
  title: string;
  target: number;
  progress: number;
  rewardGreenbits: number;
  claimed: boolean;
}

export interface SaveState {
  version: number;
  greenbits: number;
  harmonyXp: number;
  ownedAssets: Record<string, number>; // assetId -> total owned count
  foodInventory: Record<string, number>; // foodId -> count in bag
  placedAnimals: PlacedAnimal[];
  placedPlants: PlacedPlant[];
  droppedFoods: DroppedFood[];
  discoveredEcoDex: string[]; // assetIds placed at least once
  discoveredFavoriteFoods: string[]; // animal assetIds fed their favorite food
  discoveredEmotions: Record<string, EmotionType[]>;
  dailyQuests: DailyQuest[];
  streakDays: number;
  lastSavedTimestampMs: number;
  timeOfDayHours: number; // 0 .. 24
  autoCycleTime: boolean;
  currentWeather: WeatherType;
  autoCycleWeather: boolean;
  soundMuted: boolean;
  weatherLocationLabel?: string;
  cameraY?: number;
}
