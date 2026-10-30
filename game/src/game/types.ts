import type { EmotionType } from '../turtle/types';

export type HabitatZoneId = 'forest' | 'river' | 'mud' | 'sea';

export type WeatherType = 'sunny' | 'windy' | 'cloudy' | 'rain' | 'fog' | 'rainbow';

export type TimePhase = 'dawn' | 'day' | 'dusk' | 'night';

/**
 * Food categories follow what the animals really eat.
 * - fruit: fleshy fruit (durian, mangosteen, banana, rambutan, papaya, figs, coconut)
 * - seaweed: seagrass and other aquatic plants
 * - plankton: drifting microscopic food for filter feeders
 * - river_treat: small fish and prawns for fish and crustacean eaters
 * - bamboo: bamboo shoots and leaves
 * - honey: wild honeycomb
 * - insects: ants, termites and other small invertebrates
 */
export type FoodCategory =
  | 'fruit'
  | 'seaweed'
  | 'plankton'
  | 'river_treat'
  | 'bamboo'
  | 'honey'
  | 'insects';

/** When an animal is naturally awake. Cathemeral animals are active in short bouts day and night. */
export type ActivityPattern = 'diurnal' | 'nocturnal' | 'cathemeral';

/**
 * Where a plant can physically grow.
 * - land: needs dry ground (never under water)
 * - floating: leaves float on fresh water
 * - submerged: grows fully under fresh water
 * - shallow_marine: needs shallow, sunlit sea water (seagrass)
 */
export type PlantPlacement = 'land' | 'floating' | 'submerged' | 'shallow_marine';

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
  /**
   * On-screen size relative to the Green Sea Turtle (1.0), compressed from real body length
   * so a clownfish is visibly smaller than a whale shark. Plants: relative height of the plant.
   */
  visualSize: number;
  /** Animals only: when the species is awake. */
  activityPattern?: ActivityPattern;
  /** Animals only: walking or swimming speed factor. 0 means sessile (never moves). */
  moveSpeedFactor?: number;
  /** Plants only: where the plant can physically grow. */
  plantPlacement?: PlantPlacement;
  /** Plants only: trees with a crown that canopy animals can climb and perch in. */
  isPerchTree?: boolean;
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
