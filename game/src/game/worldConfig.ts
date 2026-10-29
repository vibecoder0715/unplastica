import { ROSTER_ASSETS } from '../roster/catalog';
import type {
  AssetEcoMetadata,
  FoodCategory,
  FoodItemSpec,
  HabitatZoneId,
  HabitatZoneSpec,
  PlacedPlant,
  SaveState,
  TeleportTowerSpec,
} from './types';

export const BASE_WORLD_WIDTH = 3600;
export const WORLD_SCALE_X = 180;
export const WORLD_WIDTH = BASE_WORLD_WIDTH * WORLD_SCALE_X; // 648,000 px (180x longer!)
export const WORLD_HEIGHT_MULTIPLIER = 4; // 4x higher vertical exploration range!
export const WORLD_BASE_HEIGHT = 760 * WORLD_HEIGHT_MULTIPLIER;

/**
 * Approved Left-to-Right Habitat Zone Order across the 180x world (0 .. 648,000):
 * 1. Forest / Land (x: 0 .. 171,000)
 * 2. River / Pond Basin (x: 171,000 .. 324,000)
 * 3. Mud / Mangrove Shore (x: 324,000 .. 459,000)
 * 4. Sea / Coral Reef (x: 459,000 .. 648,000)
 */
export const HABITAT_ZONES: HabitatZoneSpec[] = [
  {
    id: 'forest',
    name: 'Rainforest Land',
    subtitle: 'Tropical Canopy & Orchard Floor',
    xStart: 0,
    xEnd: 950 * WORLD_SCALE_X,
    badgeColor: '#2e6c02',
  },
  {
    id: 'river',
    name: 'River Pond',
    subtitle: 'Freshwater Basin & Lily Shallows',
    xStart: 950 * WORLD_SCALE_X,
    xEnd: 1800 * WORLD_SCALE_X,
    badgeColor: '#0284c7',
    waterSurfaceY: 0.56,
  },
  {
    id: 'mud',
    name: 'Mud Shore',
    subtitle: 'Intertidal Mangrove Bank',
    xStart: 1800 * WORLD_SCALE_X,
    xEnd: 2550 * WORLD_SCALE_X,
    badgeColor: '#b45309',
  },
  {
    id: 'sea',
    name: 'Coral Sea',
    subtitle: 'Turquoise Reef & Pelagic Deep',
    xStart: 2550 * WORLD_SCALE_X,
    xEnd: 3600 * WORLD_SCALE_X,
    badgeColor: '#0369a1',
    waterSurfaceY: 0.56,
  },
];

/**
 * Genshin Impact / PUBG Square Map Teleport Towers across all 4 zones & vertical elevations
 */
export const TELEPORT_TOWERS: TeleportTowerSpec[] = [
  {
    id: 'tower_forest_canopy',
    name: 'Tualang High Canopy',
    zoneId: 'forest',
    worldX: 42000,
    worldYOffset: -460,
    mapNormX: 0.12,
    mapNormY: 0.18,
    regionLabel: 'Upper Rainforest Canopy (+45m)',
  },
  {
    id: 'tower_forest_grove',
    name: 'Taman Negara Glade',
    zoneId: 'forest',
    worldX: 85500,
    worldYOffset: 0,
    mapNormX: 0.16,
    mapNormY: 0.50,
    regionLabel: 'Rainforest Floor (0m)',
  },
  {
    id: 'tower_forest_orchard',
    name: 'Durian & Hibiscus Valley',
    zoneId: 'forest',
    worldX: 142000,
    worldYOffset: 0,
    mapNormX: 0.22,
    mapNormY: 0.76,
    regionLabel: 'Lowland Orchard (0m)',
  },
  {
    id: 'tower_river_shallows',
    name: 'Lotus & Lily Shallows',
    zoneId: 'river',
    worldX: 202000,
    worldYOffset: 0,
    mapNormX: 0.35,
    mapNormY: 0.28,
    regionLabel: 'Freshwater Surface (0m)',
  },
  {
    id: 'tower_river_basin',
    name: 'Kinabatangan River Bend',
    zoneId: 'river',
    worldX: 247500,
    worldYOffset: 110,
    mapNormX: 0.41,
    mapNormY: 0.54,
    regionLabel: 'Mid-River Stream (-8m)',
  },
  {
    id: 'tower_river_deep',
    name: 'Arowana Deep Pool',
    zoneId: 'river',
    worldX: 292000,
    worldYOffset: 320,
    mapNormX: 0.46,
    mapNormY: 0.82,
    regionLabel: 'Deep River Basin (-22m)',
  },
  {
    id: 'tower_mud_mangrove',
    name: 'Matang Mangrove Crown',
    zoneId: 'mud',
    worldX: 356000,
    worldYOffset: -180,
    mapNormX: 0.57,
    mapNormY: 0.26,
    regionLabel: 'Mangrove Boughs (+15m)',
  },
  {
    id: 'tower_mud_estuary',
    name: 'Intertidal Stilt-Root Bank',
    zoneId: 'mud',
    worldX: 391500,
    worldYOffset: 0,
    mapNormX: 0.62,
    mapNormY: 0.56,
    regionLabel: 'Estuary Mudflat (0m)',
  },
  {
    id: 'tower_sea_reef',
    name: 'Sipadan Sunlit Reef',
    zoneId: 'sea',
    worldX: 495000,
    worldYOffset: 0,
    mapNormX: 0.77,
    mapNormY: 0.24,
    regionLabel: 'Coral Crest (0m)',
  },
  {
    id: 'tower_sea_sanctuary',
    name: 'Turtle Seagrass Sanctuary',
    zoneId: 'sea',
    worldX: 543600,
    worldYOffset: 160,
    mapNormX: 0.84,
    mapNormY: 0.50,
    regionLabel: 'Seagrass Meadow (-24m)',
  },
  {
    id: 'tower_sea_pelagic',
    name: 'Whale Shark Pelagic Drift',
    zoneId: 'sea',
    worldX: 594000,
    worldYOffset: 680,
    mapNormX: 0.90,
    mapNormY: 0.72,
    regionLabel: 'Twilight Reef Dropoff (-85m)',
  },
  {
    id: 'tower_sea_abyss',
    name: 'Midnight Pelagic Trench',
    zoneId: 'sea',
    worldX: 630000,
    worldYOffset: 1380,
    mapNormX: 0.95,
    mapNormY: 0.90,
    regionLabel: 'Abyssal Seafloor (-180m)',
  },
];

export function getZoneAtWorldX(worldX: number): HabitatZoneId {
  const clamped = Math.max(0, Math.min(WORLD_WIDTH - 1, worldX));
  for (const z of HABITAT_ZONES) {
    if (clamped >= z.xStart && clamped < z.xEnd) {
      return z.id;
    }
  }
  return 'sea';
}

export function getZoneSpec(zoneId: HabitatZoneId): HabitatZoneSpec {
  return HABITAT_ZONES.find((z) => z.id === zoneId) ?? HABITAT_ZONES[3];
}

/**
 * Computes the physical terrain / riverbed / seabed Y coordinate.
 * Strictly obeys hydrological containment:
 * - Sea Level (0m reference) is at 0.56 * canvasHeight.
 * - Forest (0 .. 171,000) and Mud Shore (324,000 .. 459,000) stay strictly above water level (0.52 .. 0.555 * canvasHeight),
 *   forming natural retaining levees at x=171,000, x=324,000, and x=459,000 so water NEVER leaks!
 * - River Pond (171,000 .. 324,000) carves a deep freshwater basin below 0.56 down to 1.45 * canvasHeight.
 * - Coral Sea (459,000 .. 648,000) slopes from 0.56 at the shoreline down to 1.95 * canvasHeight in the deep abyss.
 */
export function getTerrainFloorY(worldX: number, canvasHeight: number): number {
  const x = Math.max(0, Math.min(WORLD_WIDTH, worldX));
  const fEnd = HABITAT_ZONES[0].xEnd; // 171,000
  const rEnd = HABITAT_ZONES[1].xEnd; // 324,000
  const mEnd = HABITAT_ZONES[2].xEnd; // 459,000

  let normY = 0.55;

  if (x <= fEnd) {
    // Rolling rainforest hills strictly above sea level (0.56), rising gently to levee at fEnd
    const edgeDist = Math.min(1, (fEnd - x) / 4000);
    const undulation =
      Math.sin(x * 0.0012) * 0.014 +
      Math.cos(x * 0.00035) * 0.012;
    normY = 0.545 + undulation * edgeDist;
  } else if (x <= rEnd) {
    // Contained River Pond Basin: starts at 0.545 at left bank (fEnd), dips deeply, rises to 0.545 at right bank (rEnd)
    const t = (x - fEnd) / (rEnd - fEnd); // 0 .. 1
    const bowl = Math.sin(t * Math.PI); // 0 at both banks, 1 in center
    const deepChannel = Math.pow(bowl, 0.75) * 0.82;
    const ripples = Math.sin(x * 0.0025) * 0.018 * bowl;
    normY = 0.545 + deepChannel + ripples;
  } else if (x <= mEnd) {
    // Intertidal Mud Shore plateau between River and Sea, staying above water level
    const t = (x - rEnd) / (mEnd - rEnd);
    const bankCurve = Math.sin(t * Math.PI);
    const micro = Math.sin(x * 0.0018) * 0.008 * bankCurve;
    normY = 0.545 - bankCurve * 0.012 + micro;
  } else {
    // Coral Sea: slopes smoothly from shoreline (mEnd at 0.545) down into a much deeper pelagic & abyssal trench
    const t = (x - mEnd) / (WORLD_WIDTH - mEnd); // 0 .. 1
    const shelf = Math.min(1, t / 0.12) * 0.42;
    const dropoff = Math.max(0, Math.min(1, (t - 0.12) / 0.35)) * 0.78;
    const abyss = Math.max(0, (t - 0.12) / 0.88) * 1.95;
    const reefRidges = Math.sin(x * 0.0022) * 0.026 * Math.min(1, t * 8);
    normY = 0.545 + shelf + dropoff + abyss + reefRidges;
  }

  return normY * canvasHeight;
}

/**
 * Water surface is strictly at Sea Level 0 (0.56 * canvasHeight) ONLY inside the River Basin
 * and Coral Sea Basin where the terrain floor drops below 0.555 * canvasHeight.
 */
export function getWaterSurfaceY(worldX: number, canvasHeight: number): number | null {
  const fEnd = HABITAT_ZONES[0].xEnd;
  const rEnd = HABITAT_ZONES[1].xEnd;
  const mEnd = HABITAT_ZONES[2].xEnd;

  if (worldX > fEnd + 450 && worldX < rEnd - 450) {
    return 0.56 * canvasHeight;
  }
  if (worldX > mEnd + 450) {
    return 0.56 * canvasHeight;
  }
  return null;
}

/**
 * Store Food & Pluckable / Plantable Food Chain Catalog
 * Prices updated to 10 -> 50 GB / one, with 2-sentence simple info & Google Search query.
 */
export const FOOD_CATALOG: Record<string, FoodItemSpec> = {
  food_durian_fruit: {
    id: 'food_durian_fruit',
    name: 'Whole Spiky Durian',
    category: 'fruit',
    price: 50,
    hungerRestore: 48,
    greenbitsBonus: 25,
    colorPrimary: '#84cc16',
    colorSecondary: '#365314',
    description: 'Whole spiky rainforest fruit grown on tall Durian trees.',
    infoSentences: [
      'Known as the King of Fruits in Malaysia, the durian has a hard thorny green husk and rich, creamy golden flesh inside.',
      'Many rainforest animals like orangutans, elephants, sun bears, and tigers love eating fallen ripe durians for energy.',
    ],
    searchQuery: 'Durian fruit Malaysia characteristics wildlife diet',
    allowedZones: ['forest', 'mud'],
  },
  food_mangosteen_fruit: {
    id: 'food_mangosteen_fruit',
    name: 'Queen Mangosteen',
    category: 'fruit',
    price: 45,
    hungerRestore: 38,
    greenbitsBonus: 20,
    colorPrimary: '#6d28d9',
    colorSecondary: '#84cc16',
    description: 'Sweet dark-purple mangosteen crowned with a four-leaf green cap.',
    infoSentences: [
      'The mangosteen is called the Queen of Fruits and features a smooth deep-purple rind with snow-white, sweet-tangy segments inside.',
      'Forest monkeys, mousedeer, tapirs, and hornbills eagerly forage for ripe mangosteens in shady Malaysian orchards.',
    ],
    searchQuery: 'Mangosteen Garcinia mangostana Malaysia characteristics',
    allowedZones: ['forest', 'mud'],
  },
  food_banana_bunch: {
    id: 'food_banana_bunch',
    name: 'Pisang Emas Bunch',
    category: 'fruit',
    price: 50,
    hungerRestore: 35,
    greenbitsBonus: 20,
    colorPrimary: '#facc15',
    colorSecondary: '#ca8a04',
    description: 'Sweet golden Malaysian bananas harvested in curved bunches.',
    infoSentences: [
      'Pisang Emas is a beloved small golden banana variety in Malaysia that grows in tiered hands on giant leafy pseudostems.',
      'It is rich in natural sugars and potassium, making it a favorite daily meal for macaques, orangutans, flying foxes, and elephants.',
    ],
    searchQuery: 'Pisang Emas banana Malaysia characteristics',
    allowedZones: ['forest', 'mud'],
  },
  food_rambutan_papaya: {
    id: 'food_rambutan_papaya',
    name: 'Rambutan & Papaya',
    category: 'fruit',
    price: 50,
    hungerRestore: 40,
    greenbitsBonus: 22,
    colorPrimary: '#ef4444',
    colorSecondary: '#f97316',
    description: 'Bright red hairy rambutan and ripe orange papaya fruit.',
    infoSentences: [
      'Rambutan gets its name from the Malay word for hair due to its soft red spines, while papaya has sweet orange flesh packed with vitamins.',
      'Rainforest birds, deer, squirrels, and box turtles rely on these juicy tropical fruits throughout the fruiting season.',
    ],
    searchQuery: 'Malaysian Rambutan and Papaya fruit characteristics',
    allowedZones: ['forest', 'river', 'mud'],
  },
  food_seaweed_kelp: {
    id: 'food_seaweed_kelp',
    name: 'Emerald Seagrass',
    category: 'seaweed',
    price: 50,
    hungerRestore: 42,
    greenbitsBonus: 22,
    colorPrimary: '#10b981',
    colorSecondary: '#047857',
    description: 'Fresh marine turtle grass and ribbon seagrass blades.',
    infoSentences: [
      'Tropical seagrass meadows grow in sunlit coastal waters and river estuaries, producing oxygen and stabilizing the sandy seabed.',
      'They are the primary natural food source for Green Sea Turtles, Dugongs, and herbivorous river terrapins.',
    ],
    searchQuery: 'Tropical seagrass Thalassia Enhalus Malaysia marine life',
    allowedZones: ['sea', 'river', 'mud'],
  },
  food_plankton_bloom: {
    id: 'food_plankton_bloom',
    name: 'Marine Plankton',
    category: 'plankton',
    price: 50,
    hungerRestore: 46,
    greenbitsBonus: 24,
    colorPrimary: '#38bdf8',
    colorSecondary: '#818cf8',
    description: 'Nutrient-rich microscopic marine and freshwater plankton.',
    infoSentences: [
      'Plankton consists of tiny drifting organisms that form the foundational base of the entire aquatic food web.',
      'Gentle ocean giants like the Whale Shark, Giant Clam, Harlequin Shrimp, and Clownfish filter plankton from the water to thrive.',
    ],
    searchQuery: 'Marine plankton coral reef food web Malaysia',
    allowedZones: ['sea', 'river'],
  },
  food_river_minnow_treat: {
    id: 'food_river_minnow_treat',
    name: 'River Prawn & Fish',
    category: 'river_treat',
    price: 50,
    hungerRestore: 45,
    greenbitsBonus: 24,
    colorPrimary: '#fb923c',
    colorSecondary: '#c2410c',
    description: 'Freshwater minnows and prawns for carnivorous wildlife.',
    infoSentences: [
      'Small schooling river fish and crustaceans inhabit clean Malaysian streams, mangrove roots, and coastal coral reefs.',
      'They provide essential protein for Smooth-Coated Otters, Arowanas, Dolphins, Reef Sharks, and Water Monitors.',
    ],
    searchQuery: 'Malaysian river fish and freshwater prawn ecosystem',
    allowedZones: ['forest', 'river', 'mud', 'sea'],
  },
  food_bamboo_honey_pellet: {
    id: 'food_bamboo_honey_pellet',
    name: 'Bamboo & Wild Honey',
    category: 'omnivore_pellet',
    price: 50,
    hungerRestore: 44,
    greenbitsBonus: 23,
    colorPrimary: '#4ade80',
    colorSecondary: '#eab308',
    description: 'Crisp young bamboo shoots drizzled with golden Tualang honey.',
    infoSentences: [
      'Wild Tualang honey is harvested from giant honeycombs high in rainforest trees, paired with tender green bamboo shoots.',
      'Sun Bears, Giant Pandas, and Sunda Pangolins adore this nutrient-dense forest treat.',
    ],
    searchQuery: 'Tualang honey and bamboo shoots Malaysia wildlife',
    allowedZones: ['forest', 'river', 'mud', 'sea'],
  },
};

/**
 * Habitat Zone, Price (300 GB), Collision Radius, and 2-Sentence Characteristics for all 41 Animals
 */
const ANIMAL_ZONE_OVERRIDES: Record<
  string,
  {
    zones: HabitatZoneId[];
    price: number;
    passive: number;
    diet: FoodCategory[];
    favFood: string;
    radius: number;
    habit?: 'ground' | 'canopy' | 'pelagic' | 'benthic';
    sentences: [string, string];
  }
> = {
  animal_01_malayan_tiger: {
    zones: ['forest'],
    price: 300,
    passive: 15,
    diet: ['river_treat', 'omnivore_pellet', 'fruit'],
    favFood: 'food_durian_fruit',
    radius: 82,
    habit: 'ground',
    sentences: [
      'The Malayan Tiger is Malaysia’s national symbol and a critically endangered apex predator with bold black stripes on orange fur.',
      'It patrols dense tropical rainforests alone and is anstrong swimmer that crosses jungle rivers with ease.',
    ],
  },
  animal_02_asian_elephant: {
    zones: ['forest'],
    price: 300,
    passive: 16,
    diet: ['fruit', 'omnivore_pellet'],
    favFood: 'food_banana_bunch',
    radius: 112,
    habit: 'ground',
    sentences: [
      'The Asian Elephant is the largest land mammal in Malaysia, recognized by its rounded ears and dexterous muscular trunk.',
      'Living in close family herds, these gentle giants disperse seeds across miles of rainforest and love eating bananas and bamboo.',
    ],
  },
  animal_03_malayan_tapir: {
    zones: ['forest', 'river'],
    price: 300,
    passive: 12,
    diet: ['fruit', 'omnivore_pellet', 'seaweed'],
    favFood: 'food_mangosteen_fruit',
    radius: 78,
    habit: 'ground',
    sentences: [
      'The Malayan Tapir has a striking black-and-white saddle pattern that camouflages its body in moonlit rainforest shadows.',
      'It uses its flexible, prehensile snout to pluck tender leaves and fallen fruits along forest streams.',
    ],
  },
  animal_04_orangutan: {
    zones: ['forest'],
    price: 300,
    passive: 14,
    diet: ['fruit', 'omnivore_pellet'],
    favFood: 'food_durian_fruit',
    radius: 76,
    habit: 'canopy',
    sentences: [
      'Known as the Person of the Forest in Malay, the Bornean Orangutan has shaggy reddish-orange hair and long, powerful arms.',
      'Highly intelligent and gentle, it spends most of its life high in the tree canopy eating wild durians, figs, and young leaves.',
    ],
  },
  animal_05_sun_bear: {
    zones: ['forest'],
    price: 300,
    passive: 12,
    diet: ['omnivore_pellet', 'fruit'],
    favFood: 'food_bamboo_honey_pellet',
    radius: 68,
    habit: 'ground',
    sentences: [
      'The Malayan Sun Bear is the world’s smallest bear species, named after the golden crescent patch on its chest.',
      'It has strong curved claws for climbing tall trees and an extra-long tongue for extracting wild honey from Tualang beehives.',
    ],
  },
  animal_06_sunda_pangolin: {
    zones: ['forest', 'mud'],
    price: 300,
    passive: 11,
    diet: ['omnivore_pellet', 'fruit'],
    favFood: 'food_bamboo_honey_pellet',
    radius: 62,
    habit: 'ground',
    sentences: [
      'The Sunda Pangolin is the only mammal covered entirely in overlapping protective scales made of keratin.',
      'When threatened, it curls into a tight, impenetrable ball and uses its sticky tongue to forage in hollow logs.',
    ],
  },
  animal_07_sambar_deer: {
    zones: ['forest'],
    price: 300,
    passive: 10,
    diet: ['fruit', 'omnivore_pellet'],
    favFood: 'food_rambutan_papaya',
    radius: 80,
    habit: 'ground',
    sentences: [
      'The Sambar Deer is a large, shaggy-coated forest deer whose males grow impressive three-tined antlers.',
      'It browses quietly at dawn and dusk near rainforest rivers on grasses, fallen orchard fruits, and leafy shoots.',
    ],
  },
  animal_08_greater_mousedeer: {
    zones: ['forest'],
    price: 300,
    passive: 10,
    diet: ['fruit', 'omnivore_pellet'],
    favFood: 'food_mangosteen_fruit',
    radius: 48,
    habit: 'ground',
    sentences: [
      'Famous as Sang Kancil in Malaysian folklore, the Greater Mousedeer is a tiny, clever hoofed mammal with slender legs.',
      'Shy and agile, it darts through dense jungle undergrowth feeding on fallen figs, mangosteens, and tender herbs.',
    ],
  },
  animal_09_long_tailed_macaque: {
    zones: ['forest', 'mud'],
    price: 300,
    passive: 10,
    diet: ['fruit', 'omnivore_pellet', 'river_treat'],
    favFood: 'food_banana_bunch',
    radius: 56,
    habit: 'canopy',
    sentences: [
      'The Long-Tailed Macaque is an expressive, social primate with a tail longer than its body for balancing in tree branches.',
      'It thrives in both lowland rainforests and coastal mangroves, foraging for bananas, berries, and small crabs.',
    ],
  },
  animal_10_dusky_leaf_monkey: {
    zones: ['forest'],
    price: 300,
    passive: 11,
    diet: ['fruit', 'omnivore_pellet'],
    favFood: 'food_mangosteen_fruit',
    radius: 58,
    habit: 'canopy',
    sentences: [
      'Also called the Spectacled Langur, this gentle monkey has distinctive white rings around its large eyes and mouth.',
      'Its infants are born bright golden-orange before turning smoky grey as they grow up in the forest canopy.',
    ],
  },
  animal_11_malayan_porcupine: {
    zones: ['forest'],
    price: 300,
    passive: 10,
    diet: ['fruit', 'omnivore_pellet'],
    favFood: 'food_durian_fruit',
    radius: 62,
    habit: 'ground',
    sentences: [
      'The Malayan Porcupine is stoutly built and protected by sharp black-and-white quills along its back and tail.',
      'It rattles its hollow tail quills to warn predators while foraging at night for roots, bark, and fallen durians.',
    ],
  },
  animal_12_malayan_flying_fox: {
    zones: ['forest', 'mud'],
    price: 300,
    passive: 11,
    diet: ['fruit', 'omnivore_pellet'],
    favFood: 'food_banana_bunch',
    radius: 64,
    habit: 'canopy',
    sentences: [
      'The Malayan Flying Fox is one of the world’s largest fruit bats, boasting a wingspan of up to 1.5 meters.',
      'It plays a vital ecological role by pollinating nocturnal Durian blossoms and dispersing rainforest seeds.',
    ],
  },
  animal_13_raffles_banded_langur: {
    zones: ['forest'],
    price: 300,
    passive: 12,
    diet: ['fruit', 'omnivore_pellet'],
    favFood: 'food_rambutan_papaya',
    radius: 58,
    habit: 'canopy',
    sentences: [
      'Raffles’ Banded Langur is a critically endangered primate with glossy black fur and crisp white chest markings.',
      'Native only to southern Peninsular Malaysia and Singapore, it leaps gracefully between tall rainforest crowns.',
    ],
  },
  animal_14_malayan_crested_fireback: {
    zones: ['forest'],
    price: 300,
    passive: 11,
    diet: ['fruit', 'omnivore_pellet'],
    favFood: 'food_rambutan_papaya',
    radius: 60,
    habit: 'ground',
    sentences: [
      'The Malayan Crested Fireback is a vibrant lowland rainforest pheasant crowned with a tuft of iridescent blue feathers.',
      'It struts across the shaded forest floor displaying its fiery golden rump and fan-shaped tail.',
    ],
  },
  animal_15_rhinoceros_hornbill: {
    zones: ['forest'],
    price: 300,
    passive: 14,
    diet: ['fruit', 'omnivore_pellet'],
    favFood: 'food_rambutan_papaya',
    radius: 72,
    habit: 'canopy',
    sentences: [
      'Honored as the state bird of Sarawak, the Rhinoceros Hornbill features a magnificent upturned red-and-amber casque.',
      'Monogamous pairs soar above the emergent rainforest canopy, feeding on wild figs and tropical fruits.',
    ],
  },
  animal_16_reticulated_python: {
    zones: ['forest', 'river', 'mud'],
    price: 300,
    passive: 12,
    diet: ['river_treat', 'omnivore_pellet'],
    favFood: 'food_river_minnow_treat',
    radius: 74,
    habit: 'ground',
    sentences: [
      'The Reticulated Python is the longest snake in the world, adorned with an intricate diamond geometric pattern.',
      'Found near rainforest rivers and mangroves, it is an agile climber and a graceful swimmer.',
    ],
  },
  animal_17_clouded_monitor_lizard: {
    zones: ['forest'],
    price: 300,
    passive: 10,
    diet: ['river_treat', 'fruit', 'omnivore_pellet'],
    favFood: 'food_river_minnow_treat',
    radius: 64,
    habit: 'ground',
    sentences: [
      'The Clouded Monitor Lizard has olive-brown scales patterned with pale yellow spots and a long muscular tail.',
      'It climbs high into rainforest trees using its sharp claws and flicks its forked tongue to sense the environment.',
    ],
  },
  animal_18_black_giant_squirrel: {
    zones: ['forest'],
    price: 300,
    passive: 10,
    diet: ['fruit', 'omnivore_pellet'],
    favFood: 'food_durian_fruit',
    radius: 54,
    habit: 'canopy',
    sentences: [
      'The Black Giant Squirrel is one of the largest squirrels on Earth, with a jet-black back and cream underbelly.',
      'Its bushy tail is longer than its body, acting as a counterbalance as it leaps between tall orchard branches.',
    ],
  },
  animal_19_smooth_coated_otter: {
    zones: ['river', 'mud'],
    price: 300,
    passive: 12,
    diet: ['river_treat', 'plankton'],
    favFood: 'food_river_minnow_treat',
    radius: 62,
    habit: 'pelagic',
    sentences: [
      'The Smooth-Coated Otter has sleek, velvety waterproof fur and webbed paws built for agile swimming.',
      'Playful and affectionate, it lives in tight-knit family groups along Malaysian rivers and mangrove mudflats.',
    ],
  },
  animal_20_giant_freshwater_prawn: {
    zones: ['river', 'mud'],
    price: 300,
    passive: 10,
    diet: ['plankton', 'seaweed', 'river_treat'],
    favFood: 'food_plankton_bloom',
    radius: 52,
    habit: 'benthic',
    sentences: [
      'Known locally as Udang Galah, the Giant Freshwater Prawn is famous for its long, sapphire-blue pincers.',
      'It walks along sandy river bottoms and brackish estuaries, grazing on aquatic plants and tiny organisms.',
    ],
  },
  animal_21_asian_arowana: {
    zones: ['river'],
    price: 300,
    passive: 14,
    diet: ['river_treat', 'plankton'],
    favFood: 'food_river_minnow_treat',
    radius: 68,
    habit: 'pelagic',
    sentences: [
      'Revered as the Dragon Fish, the Asian Arowana gleams with large metallic scales and twin sensory chin barbels.',
      'Native to slow-flowing Malaysian blackwater streams, it glides near the water surface with undulating grace.',
    ],
  },
  animal_22_clown_featherback: {
    zones: ['river'],
    price: 300,
    passive: 11,
    diet: ['river_treat', 'plankton'],
    favFood: 'food_river_minnow_treat',
    radius: 64,
    habit: 'pelagic',
    sentences: [
      'The Clown Featherback is an arched silver knifefish decorated with a row of dark, white-rimmed eyespots.',
      'Its long ribbon-like anal fin ripples continuously, allowing it to swim effortlessly both forward and backward.',
    ],
  },
  animal_23_southern_river_terrapin: {
    zones: ['river', 'mud'],
    price: 300,
    passive: 12,
    diet: ['fruit', 'seaweed', 'omnivore_pellet'],
    favFood: 'food_seaweed_kelp',
    radius: 64,
    habit: 'pelagic',
    sentences: [
      'Called Tuntung Sungai in Malay, this critically endangered river turtle has a smooth olive shell and upturned snout.',
      'It inhabits tidal rivers and estuaries, feeding on overhanging mangrove fruits and aquatic greens.',
    ],
  },
  animal_24_southeast_asian_box_turtle: {
    zones: ['river', 'mud', 'forest'],
    price: 300,
    passive: 11,
    diet: ['fruit', 'seaweed', 'omnivore_pellet'],
    favFood: 'food_rambutan_papaya',
    radius: 58,
    habit: 'ground',
    sentences: [
      'The Southeast Asian Box Turtle has a high-domed dark shell and three bright yellow stripes along its head.',
      'Semi-aquatic and peaceful, it rests in shallow ponds and forages along muddy banks for fallen berries.',
    ],
  },
  animal_25_asian_water_monitor: {
    zones: ['river', 'mud'],
    price: 300,
    passive: 11,
    diet: ['river_treat', 'omnivore_pellet'],
    favFood: 'food_river_minnow_treat',
    radius: 72,
    habit: 'pelagic',
    sentences: [
      'The Asian Water Monitor is a large, semi-aquatic lizard that propels through rivers using its flattened tail.',
      'It basks on sunny riverbanks and mangrove roots after swimming in search of fish and freshwater crabs.',
    ],
  },
  animal_26_giant_snakehead: {
    zones: ['river'],
    price: 300,
    passive: 12,
    diet: ['river_treat', 'plankton'],
    favFood: 'food_river_minnow_treat',
    radius: 68,
    habit: 'pelagic',
    sentences: [
      'Known locally as Ikan Toman, the Giant Snakehead displays striking emerald-and-indigo chevron stripes.',
      'It can breathe atmospheric air at the river surface and fiercely guards its schooling young in deep pools.',
    ],
  },
  animal_27_dugong: {
    zones: ['sea'],
    price: 300,
    passive: 14,
    diet: ['seaweed', 'plankton'],
    favFood: 'food_seaweed_kelp',
    radius: 92,
    habit: 'pelagic',
    sentences: [
      'The Dugong is a gentle marine mammal with a plump streamlined body, paddle flippers, and a fluke tail.',
      'Often called the Sea Cow, it spends its days peacefully grazing on tropical seagrass meadows in shallow bays.',
    ],
  },
  animal_28_green_sea_turtle: {
    zones: ['sea'],
    price: 300, // Starter is owned for free; buying additional turtles costs 300 GB!
    passive: 12,
    diet: ['seaweed', 'plankton'],
    favFood: 'food_seaweed_kelp',
    radius: 74,
    habit: 'pelagic',
    sentences: [
      'The Green Sea Turtle is a graceful marine reptile with a teardrop shell and long wing-like front flippers.',
      'Adult turtles are herbivores that keep coral reefs healthy by grazing on lush tropical turtle grass.',
    ],
  },
  animal_29_hawksbill_sea_turtle: {
    zones: ['sea'],
    price: 300,
    passive: 13,
    diet: ['seaweed', 'plankton', 'river_treat'],
    favFood: 'food_seaweed_kelp',
    radius: 72,
    habit: 'pelagic',
    sentences: [
      'The Hawksbill Sea Turtle is named for its narrow curved beak and amber-patterned overlapping shell scutes.',
      'It glides around vibrant Malaysian coral reefs, helping corals grow by feeding on reef sponges and algae.',
    ],
  },
  animal_30_whale_shark: {
    zones: ['sea'],
    price: 300,
    passive: 18,
    diet: ['plankton', 'seaweed'],
    favFood: 'food_plankton_bloom',
    radius: 125,
    habit: 'pelagic',
    sentences: [
      'The Whale Shark is the largest fish in the ocean, decorated with a starry pattern of white spots and stripes.',
      'Despite its massive size, this gentle giant is a peaceful filter feeder that swims with its wide mouth open to catch plankton.',
    ],
  },
  animal_31_indo_pacific_humpback_dolphin: {
    zones: ['sea'],
    price: 300,
    passive: 15,
    diet: ['river_treat', 'plankton'],
    favFood: 'food_river_minnow_treat',
    radius: 88,
    habit: 'pelagic',
    sentences: [
      'Known as the Pink Dolphin, this coastal species develops a rose-pink hue as it matures in tropical waters.',
      'Intelligent and playful, it leaps through waves near Malaysian islands and mangrove estuaries.',
    ],
  },
  animal_32_false_killer_whale: {
    zones: ['sea'],
    price: 300,
    passive: 16,
    diet: ['river_treat', 'plankton'],
    favFood: 'food_river_minnow_treat',
    radius: 98,
    habit: 'pelagic',
    sentences: [
      'The False Killer Whale is a sleek, dark oceanic dolphin known for its curved dorsal fin and friendly social pods.',
      'Pod members form lifelong bonds and even share food with one another while cruising deep tropical seas.',
    ],
  },
  animal_33_blacktip_reef_shark: {
    zones: ['sea'],
    price: 300,
    passive: 14,
    diet: ['river_treat', 'plankton'],
    favFood: 'food_river_minnow_treat',
    radius: 86,
    habit: 'pelagic',
    sentences: [
      'The Blacktip Reef Shark is easily recognized by the crisp black tips with white borders on its fins.',
      'Agile and streamlined, it patrols sunlit coral lagoons and shallow reef drop-offs across Malaysia.',
    ],
  },
  animal_34_clownfish: {
    zones: ['sea'],
    price: 300,
    passive: 10,
    diet: ['plankton', 'seaweed'],
    favFood: 'food_plankton_bloom',
    radius: 48,
    habit: 'pelagic',
    sentences: [
      'The Ocellaris Clownfish shines in bright orange with three white bars edged in thin black outlines.',
      'It lives in harmony with sea anemones on coral reefs, feeding on drifting plankton and algae.',
    ],
  },
  animal_35_giant_clam: {
    zones: ['sea'],
    price: 300,
    passive: 11,
    diet: ['plankton'],
    favFood: 'food_plankton_bloom',
    radius: 66,
    habit: 'benthic',
    sentences: [
      'The Giant Clam is the largest mollusk on Earth, featuring a heavy fluted shell and a glowing blue-green mantle.',
      'Sitting on the coral seabed, it filters plankton from seawater and partners with sunlight-loving algae.',
    ],
  },
  animal_36_bluespotted_ribbontail_ray: {
    zones: ['sea', 'mud'],
    price: 300,
    passive: 12,
    diet: ['river_treat', 'plankton'],
    favFood: 'food_plankton_bloom',
    radius: 74,
    habit: 'benthic',
    sentences: [
      'The Bluespotted Ribbontail Ray has an olive disc covered in electric-blue spots and two blue stripes along its tail.',
      'It glides like a flying carpet over sandy coral flats by undulating its wide pectoral fins.',
    ],
  },
  animal_37_coconut_octopus: {
    zones: ['sea', 'mud'],
    price: 300,
    passive: 12,
    diet: ['river_treat', 'plankton'],
    favFood: 'food_river_minnow_treat',
    radius: 64,
    habit: 'benthic',
    sentences: [
      'The veined Coconut Octopus is a remarkably smart cephalopod with glowing blue-white suction cups.',
      'It collects fallen coconut shells and clam halves on the seafloor to carry around as a portable shelter.',
    ],
  },
  animal_38_harlequin_shrimp: {
    zones: ['sea'],
    price: 300,
    passive: 11,
    diet: ['plankton', 'river_treat'],
    favFood: 'food_plankton_bloom',
    radius: 50,
    habit: 'benthic',
    sentences: [
      'The Harlequin Shrimp has a porcelain-white shell painted with orchid-purple spots and petal-like claws.',
      'It dances across crevices in tropical coral reefs, waving its flat pincers like floral fans.',
    ],
  },
  animal_39_cuttlefish: {
    zones: ['sea'],
    price: 300,
    passive: 12,
    diet: ['river_treat', 'plankton'],
    favFood: 'food_river_minnow_treat',
    radius: 64,
    habit: 'pelagic',
    sentences: [
      'The Broadclub Cuttlefish hovers effortlessly using a rippling fin skirt that wraps around its oval mantle.',
      'It can change its skin color and texture in milliseconds using specialized pigment cells called chromatophores.',
    ],
  },
  animal_40_sea_star: {
    zones: ['sea', 'mud'],
    price: 300,
    passive: 10,
    diet: ['plankton', 'seaweed'],
    favFood: 'food_plankton_bloom',
    radius: 54,
    habit: 'benthic',
    sentences: [
      'The Horned Sea Star, or Chocolate Chip Starfish, has five warm orange arms crowned with dark conical knobs.',
      'It crawls slowly over shallow seagrass beds and sandy coral lagoons using hundreds of tiny tube feet.',
    ],
  },
  animal_41_giant_panda: {
    zones: ['forest'],
    price: 300,
    passive: 16,
    diet: ['omnivore_pellet', 'fruit'],
    favFood: 'food_bamboo_honey_pellet',
    radius: 82,
    habit: 'ground',
    sentences: [
      'The Giant Panda is a beloved conservation icon with distinctive black eye patches, ears, and limbs on snowy white fur.',
      'Using a modified wrist bone like a thumb, it grasps fresh green bamboo stalks and enjoys sweet forest honey treats.',
    ],
  },
};

/**
 * Habitat Zone, Price (150 GB), Fruit Production, and 2-Sentence Botanical Info for all 30 Plants
 * Matching exact IDs in `src/roster/catalog.ts` (`plant_01_rafflesia` .. `plant_30_water_spinach`)!
 */
const PLANT_ZONE_OVERRIDES: Record<
  string,
  {
    zones: HabitatZoneId[];
    price: number;
    passive: number;
    producesFruitId?: string;
    isAquaticFoodSource?: boolean;
    aquaticFoodCategory?: 'seaweed' | 'plankton';
    sentences: [string, string];
  }
> = {
  plant_01_rafflesia: {
    zones: ['forest'],
    price: 150,
    passive: 9,
    sentences: [
      'Rafflesia is the world’s largest single flower, growing up to a meter wide on the shaded rainforest floor.',
      'It has five thick terracotta-red petals speckled with white warts and no stems, leaves, or roots of its own.',
    ],
  },
  plant_02_tualang_tree: {
    zones: ['forest'],
    price: 150,
    passive: 10,
    producesFruitId: 'food_bamboo_honey_pellet',
    sentences: [
      'The Tualang Tree is a towering rainforest giant with a smooth silvery trunk, huge buttress roots, and feathery compound leaves.',
      'Wild giant honeybees build golden honeycombs high under its spreading branches, providing rich Tualang honey.',
    ],
  },
  plant_03_durian_tree: {
    zones: ['forest'],
    price: 150,
    passive: 9,
    producesFruitId: 'food_durian_fruit',
    sentences: [
      'The Durian Tree is a tall tropical hardwood with oblong leaves that are glossy green above and golden-coppery underneath.',
      'Its strong horizontal branches bear fragrant cream flowers that mature into heavy, spiky whole Durian fruits.',
    ],
  },
  plant_04_mangosteen_tree: {
    zones: ['forest'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_mangosteen_fruit',
    sentences: [
      'The Mangosteen Tree has a dense pyramidal crown of large, opposite, dark-green leathery leaves with prominent veins.',
      'Once mature, it produces sweet purple Mangosteen fruits capped with a distinctive four-lobed green calyx crown.',
    ],
  },
  plant_05_banana_plant: {
    zones: ['forest'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_banana_bunch',
    sentences: [
      'The Banana Plant grows from a tightly wrapped green pseudostem topped with giant paddle leaves that split naturally in the wind.',
      'It produces a hanging crimson flower bell called Jantung Pisang and tiered bunches of sweet golden bananas.',
    ],
  },
  plant_06_papaya_tree: {
    zones: ['forest'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_rambutan_papaya',
    sentences: [
      'The Papaya Tree has a straight, leaf-scarred hollow trunk crowned with an umbrella of deeply 7-lobed palmate leaves.',
      'Creamy blossoms grow directly along the upper trunk and ripen into pear-shaped amber-orange papaya fruits.',
    ],
  },
  plant_07_bamboo: {
    zones: ['forest', 'river'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_bamboo_honey_pellet',
    sentences: [
      'Tropical Bamboo grows in graceful clumps of hollow, jointed green-and-gold culm stalks ringed by raised nodes.',
      'Its slender, lance-shaped leaves rustle in the breeze while tender shoots sprout at the base for forest wildlife.',
    ],
  },
  plant_08_tropical_pitcher_plant: {
    zones: ['forest', 'mud'],
    price: 150,
    passive: 8,
    sentences: [
      'Known locally as Periuk Kera, the Nepenthes Pitcher Plant has smooth lance-shaped leaves that extend into curling tendrils.',
      'Each tendril swells into a colorful ribbed pitcher cup with a nectar lid that collects rainwater and nutrients.',
    ],
  },
  plant_09_birds_nest_fern: {
    zones: ['forest'],
    price: 150,
    passive: 7,
    sentences: [
      'The Bird’s Nest Fern is an epiphytic rainforest fern that forms a rosette of broad, undivided apple-green fronds.',
      'Each strap-shaped leaf has wavy margins and a dark midrib rising from a spongy, moisture-holding root basket.',
    ],
  },
  plant_10_torch_ginger: {
    zones: ['forest', 'river'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_rambutan_papaya',
    sentences: [
      'Called Bunga Kantan in Malaysia, Torch Ginger sends up tall, lush pseudostems with long oblong-lanceolate ginger leaves.',
      'Its striking waxy pink cone-shaped flower torches bloom on sturdy stalks from the ground rhizome.',
    ],
  },
  plant_11_hibiscus: {
    zones: ['forest'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_rambutan_papaya',
    sentences: [
      'Hibiscus rosa-sinensis, or Bunga Raya, is Malaysia’s national flower and features ovate leaves with coarsely toothed edges.',
      'Its bushy branches bloom with multiple vibrant five-petaled scarlet flowers, each showcasing a long golden-tipped stamen column.',
    ],
  },
  plant_12_ixora: {
    zones: ['forest'],
    price: 150,
    passive: 7,
    producesFruitId: 'food_rambutan_papaya',
    sentences: [
      'Ixora is an evergreen tropical shrub with pairs of stiff, glossy oblong leaves arranged neatly along woody stems.',
      'It blooms year-round with dense, rounded umbrella clusters of four-pointed scarlet-orange star florets.',
    ],
  },
  plant_13_coconut_palm: {
    zones: ['forest', 'mud'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_banana_bunch',
    sentences: [
      'The Coconut Palm has a tall, curving ringed trunk topped by a sweeping crown of feather-like pinnate fronds.',
      'Each frond carries dozens of narrow leaflets while heavy clusters of buoyant green-and-gold coconuts hang beneath.',
    ],
  },
  plant_14_banyan_fig: {
    zones: ['forest'],
    price: 150,
    passive: 9,
    producesFruitId: 'food_rambutan_papaya',
    sentences: [
      'The Banyan Fig is a majestic keystone tree with wide-spreading boughs,aerial prop roots, and broad oval leathery leaves.',
      'When it fruits, its branches produce abundant pairs of red figs that feed hornbills, monkeys, and squirrels.',
    ],
  },
  plant_15_rambutan_tree: {
    zones: ['forest'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_rambutan_papaya',
    sentences: [
      'The Rambutan Tree is a lush tropical fruit tree with compound pinnate leaves made of smooth, elliptic-obovate leaflets.',
      'After flowering, its branches hang heavy with clusters of bright crimson rambutan fruits covered in soft golden-green hairs.',
    ],
  },
  plant_16_sugar_palm: {
    zones: ['forest', 'mud'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_mangosteen_fruit',
    sentences: [
      'Known locally as Pokok Kabung, the Sugar Palm has a stout trunk wrapped in dark woven black horsehair fibers.',
      'It features long ascending pinnate fronds with toothed leaflet tips and hanging strings of sweet palm fruits.',
    ],
  },
  plant_17_tree_fern: {
    zones: ['forest'],
    price: 150,
    passive: 7,
    sentences: [
      'The Malaysian Tree Fern rises on a fibrous dark trunk topped with a wide umbrella of lacy, tripinnate fronds.',
      'New fronds emerge at the center as tightly coiled green fiddlehead spirals called koru before unfurling.',
    ],
  },
  plant_18_tropical_orchid: {
    zones: ['forest'],
    price: 150,
    passive: 8,
    sentences: [
      'This epiphytic Tropical Orchid grows thick, strap-shaped leaves arranged in two ranks above silvery aerial roots.',
      'Its arching flower spikes open into multiple jewel-toned magenta blossoms with ruffled lip petals.',
    ],
  },
  plant_19_red_mangrove: {
    zones: ['mud', 'sea'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_seaweed_kelp',
    sentences: [
      'The Red Mangrove stands above intertidal mudflats on a tangled arch of stilt roots and has thick, opposite oval leaves.',
      'Its seeds germinate right on the tree into long, torpedo-shaped green propagules before dropping into the tide.',
    ],
  },
  plant_20_api_api_mangrove: {
    zones: ['mud'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_seaweed_kelp',
    sentences: [
      'The Api-Api Mangrove is surrounded by hundreds of vertical pencil-like breathing roots that poke up through the mud.',
      'Its narrow lance-shaped leaves have a silvery-white underside that excretes excess sea salt.',
    ],
  },
  plant_21_nipa_palm: {
    zones: ['mud', 'river'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_mangosteen_fruit',
    sentences: [
      'The Nipa Palm is the only palm adapted to mangrove waterways, sending tall feather fronds directly up from mud rhizomes.',
      'It blooms with golden catkin spikes and forms a large, round armored brown fruit ball called Buah Nipah.',
    ],
  },
  plant_22_tropical_seagrass_enhalus_acoroides: {
    zones: ['sea'],
    price: 150,
    passive: 7,
    producesFruitId: 'food_seaweed_kelp',
    isAquaticFoodSource: true,
    aquaticFoodCategory: 'seaweed',
    sentences: [
      'Enhalus acoroides is the largest tropical seagrass in Malaysia, growing long ribbon-like blades with thickened edges.',
      'Anchored in shallow coral sand, it shelters young reef fish and provides fresh marine greens for Dugongs and Sea Turtles.',
    ],
  },
  plant_23_tropical_turtle_grass_thalassia_hemprichii: {
    zones: ['sea'],
    price: 150,
    passive: 7,
    producesFruitId: 'food_seaweed_kelp',
    isAquaticFoodSource: true,
    aquaticFoodCategory: 'seaweed',
    sentences: [
      'Thalassia Turtle Grass has curved, sickle-shaped emerald blades with fine parallel veins rising from a creeping stolon.',
      'It forms lush underwater meadows on coral flats and is the favorite grazing plant of the Green Sea Turtle.',
    ],
  },
  plant_24_eelgrass: {
    zones: ['sea', 'river'],
    price: 150,
    passive: 7,
    producesFruitId: 'food_seaweed_kelp',
    isAquaticFoodSource: true,
    aquaticFoodCategory: 'seaweed',
    sentences: [
      'Eelgrass features slender, flexible translucent-green ribbon leaves that sway gracefully with underwater currents.',
      'It oxygenates both coastal lagoons and river mouths while serving as a natural grazing pasture.',
    ],
  },
  plant_25_water_hyacinth: {
    zones: ['river'],
    price: 150,
    passive: 7,
    producesFruitId: 'food_seaweed_kelp',
    isAquaticFoodSource: true,
    aquaticFoodCategory: 'seaweed',
    sentences: [
      'Water Hyacinth floats on freshwater ponds using swollen, air-filled spongy leaf stalks and cupped glossy round blades.',
      'When in bloom, it raises a tall spike of lavender-violet flowers marked with a golden-and-blue peacock eye.',
    ],
  },
  plant_26_lotus: {
    zones: ['river'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_rambutan_papaya',
    sentences: [
      'The Sacred Lotus holds large, water-repellent circular peltate leaves high above the pond surface on sturdy stems.',
      'Its fragrant multi-layered pink flowers surround a flat-topped golden central seed pod receptacle.',
    ],
  },
  plant_27_water_lily: {
    zones: ['river'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_seaweed_kelp',
    isAquaticFoodSource: true,
    aquaticFoodCategory: 'seaweed',
    sentences: [
      'The Tropical Water Lily floats flat, round lily pads with a classic V-shaped notch and toothed bronze-green edges.',
      'Multiple star-shaped magenta blossoms open just above the water surface to greet the morning sun.',
    ],
  },
  plant_28_duckweed: {
    zones: ['river', 'sea'],
    price: 150,
    passive: 7,
    producesFruitId: 'food_plankton_bloom',
    isAquaticFoodSource: true,
    aquaticFoodCategory: 'plankton',
    sentences: [
      'Duckweed is a tiny floating aquatic plant made of clusters of oval green fronds with delicate hanging rootlets.',
      'Rich in nutrients and microorganisms, it feeds filter-feeding aquatic wildlife, prawns, and river fish.',
    ],
  },
  plant_29_hornwort: {
    zones: ['river', 'sea'],
    price: 150,
    passive: 7,
    producesFruitId: 'food_seaweed_kelp',
    isAquaticFoodSource: true,
    aquaticFoodCategory: 'seaweed',
    sentences: [
      'Hornwort grows in submerged plumes of forked, needle-like leaf whorls that resemble soft underwater pine branches.',
      'It releases oxygen bubbles into the water column and provides shelter for small fish and shrimp.',
    ],
  },
  plant_30_water_spinach: {
    zones: ['river', 'mud'],
    price: 150,
    passive: 7,
    producesFruitId: 'food_seaweed_kelp',
    sentences: [
      'Known across Malaysia as Kangkung, Water Spinach has hollow floating stems and distinctive arrowhead-shaped leaves.',
      'When mature, it produces delicate trumpet-shaped white and lavender morning-glory blossoms along riverbanks.',
    ],
  },
};

export const ASSET_ECO_CONFIG: Record<string, AssetEcoMetadata> = Object.fromEntries(
  ROSTER_ASSETS.map((item) => {
    const isAnimal = item.category.startsWith('animals_');
    if (isAnimal) {
      const ov = ANIMAL_ZONE_OVERRIDES[item.id] ?? {
        zones: ['forest'] as HabitatZoneId[],
        price: 300,
        passive: 12,
        diet: ['fruit', 'omnivore_pellet'] as FoodCategory[],
        favFood: 'food_banana_bunch',
        radius: 68,
        habit: 'ground' as const,
        sentences: [
          `${item.name} is a native wildlife species inhabiting Malaysia's rich tropical ecosystems.`,
          'It thrives when cared for with fresh natural food and a clean, healthy sanctuary habitat.',
        ] as [string, string],
      };
      const meta: AssetEcoMetadata = {
        assetId: item.id,
        code: item.code,
        name: item.name,
        kind: 'animal',
        allowedZones: ov.zones,
        price: ov.price,
        passiveGreenbitsPerMin: ov.passive,
        dietCategories: ov.diet,
        favoriteFoodId: ov.favFood,
        defaultScale: 1.0,
        collisionRadius: ov.radius,
        canopyHabit: ov.habit ?? 'ground',
        conservationStatus: 'Protected Native',
        funFact: ov.sentences[0],
        infoSentences: ov.sentences,
        searchQuery: `${item.name} Malaysia wildlife characteristics`,
        phase2Iterations: [
          [
            'Anatomical surface micro-texture strokes (fur tufts / keratin scales / feather barbs)',
            'Multi-stop radial iris stroma collarette fibers & dark limbal ring',
            'Seamless open-root ball-joint limb & tail embedding',
          ],
          [
            '3D spherical/cylindrical volumetric shading with ambient occlusion undercuts',
            'Subsurface scattering rim highlight & environmental bounce light',
            'Calibrated eye proportions (+30% enlargement on whales, sharks & small-eyed species)',
          ],
          [
            '120° wave offset pointing away from facing direction with anatomical limb/gesture',
            'Respiratory micro-pulse, continuous random blinking & expressive tear/laugh props',
            '3-stage interactive eating animation (Pick Up -> Chew -> Swallow)',
          ],
        ],
      };
      return [item.id, meta];
    } else {
      const ov = PLANT_ZONE_OVERRIDES[item.id] ?? {
        zones: ['forest'] as HabitatZoneId[],
        price: 150,
        passive: 8,
        sentences: [
          `${item.name} is a native botanical species found in Malaysia's lush habitats.`,
          'It provides natural shelter, oxygen, and nourishment for surrounding sanctuary wildlife.',
        ] as [string, string],
      };
      const meta: AssetEcoMetadata = {
        assetId: item.id,
        code: item.code,
        name: item.name,
        kind: 'plant',
        allowedZones: ov.zones,
        price: ov.price,
        passiveGreenbitsPerMin: ov.passive,
        producesFruitId: ov.producesFruitId,
        isAquaticFoodSource: ov.isAquaticFoodSource,
        aquaticFoodCategory: ov.aquaticFoodCategory,
        defaultScale: 1.0,
        collisionRadius: 54,
        conservationStatus: 'Native Flora',
        funFact: ov.sentences[0],
        infoSentences: ov.sentences,
        searchQuery: `${item.name} plant Malaysia botanical characteristics`,
        phase2Iterations: [
          [
            'Species-specific leaf morphology, petiole stalks, tapering midribs & secondary/tertiary veins',
            'Cylindrical bark striation grooves, root flares & lenticel pores',
            'Authentic species morphology without clumpy foliage blobs',
          ],
          [
            'Natural layered architectural boughs with distinct individual leaves',
            'Subsurface chlorophyll translucency glow on sunlit lamina margins',
            'Glistening morning dew droplets & underwater oxygen micro-bubbles',
          ],
          [
            'Weather-responsive harmonic wind-bend sway & tap shake impulse',
            'Vegetative sapling -> blooming flowers -> pluckable ripe fruit life cycle',
            '3D sculpted island / reef plinth base with ambient drop shadow',
          ],
        ],
      };
      return [item.id, meta];
    }
  }),
);

/**
 * Returns the safe horizontal X bounds inside `zoneId` for `assetId`,
 * keeping strictly aquatic animals away from shallow shores.
 */
export function getAquaticSafeBoundsX(
  assetId: string,
  zoneId: HabitatZoneId,
): { minX: number; maxX: number; blocksShallowShore: boolean } {
  const zSpec = getZoneSpec(zoneId);
  const meta = ASSET_ECO_CONFIG[assetId];
  const radius = meta?.collisionRadius ?? 78;
  let minX = zSpec.xStart + radius + 24;
  let maxX = zSpec.xEnd - radius - 24;
  let blocksShallowShore = false;

  if (meta && meta.kind === 'animal') {
    const canGoOnMudOrLand =
      meta.allowedZones.includes('mud') || meta.allowedZones.includes('forest');
    if (zoneId === 'sea' && !canGoOnMudOrLand) {
      const mEnd = HABITAT_ZONES[2].xEnd; // 459,000
      minX = Math.max(minX, mEnd + 28000);
      blocksShallowShore = true;
    } else if (zoneId === 'river' && !canGoOnMudOrLand) {
      const fEnd = HABITAT_ZONES[0].xEnd; // 171,000
      const rEnd = HABITAT_ZONES[1].xEnd; // 324,000
      minX = Math.max(minX, fEnd + 18000);
      maxX = Math.min(maxX, rEnd - 18000);
      blocksShallowShore = true;
    }
  }
  return { minX, maxX, blocksShallowShore };
}

/**
 * Pure habitat validation function:
 * Checks whether `assetId` is allowed to be placed in `zoneId`.
 */
export function validateAssetDropZone(
  assetId: string,
  zoneId: HabitatZoneId,
  worldX?: number,
): {
  valid: boolean;
  allowedZones: HabitatZoneId[];
  reason: string;
} {
  const meta = ASSET_ECO_CONFIG[assetId];
  if (!meta) {
    return { valid: false, allowedZones: [], reason: 'Unknown asset' };
  }
  const valid = meta.allowedZones.includes(zoneId);
  if (!valid) {
    const allowedNames = meta.allowedZones.map((z) => getZoneSpec(z).name).join(' or ');
    return {
      valid: false,
      allowedZones: meta.allowedZones,
      reason: `${meta.name} belongs in ${allowedNames}.`,
    };
  }

  // Aquatic creatures that do not inhabit mud shores cannot stay in shallow shores
  if (worldX !== undefined && meta.kind === 'animal') {
    const bounds = getAquaticSafeBoundsX(assetId, zoneId);
    if (bounds.blocksShallowShore && (worldX < bounds.minX || worldX > bounds.maxX)) {
      return {
        valid: false,
        allowedZones: meta.allowedZones,
        reason: `${meta.name} cannot stay in shallow shores! Drop it in deeper waters.`,
      };
    }
  }

  return {
    valid: true,
    allowedZones: meta.allowedZones,
    reason: `${meta.name} loves the ${getZoneSpec(zoneId).name}.`,
  };
}

/**
 * Pure sleeping-animal touch outcome function:
 * Touching a sleeping animal at night: 70% it gets angry, 30% it is wondered.
 */
export function rollSleepingTouchReaction(randomZeroToOne: number): 'angry' | 'wondered' {
  return randomZeroToOne < 0.7 ? 'angry' : 'wondered';
}

/**
 * Pure tap-awake-animal outcome function:
 * Tap an awake animal: randomly waves or looks wondered.
 */
export function rollAwakeTapReaction(randomZeroToOne: number): 'waving' | 'wondered' {
  return randomZeroToOne < 0.5 ? 'waving' : 'wondered';
}

/**
 * Checks if an animal can eat a given food item.
 */
export function canAnimalEatFood(animalAssetId: string, foodId: string): boolean {
  const meta = ASSET_ECO_CONFIG[animalAssetId];
  const food = FOOD_CATALOG[foodId];
  if (!meta || meta.kind !== 'animal' || !food) return false;
  if (meta.favoriteFoodId === foodId) return true;
  return Boolean(meta.dietCategories?.includes(food.category));
}

/**
 * Generates curated default natural flora around the major biome hubs (20-40% natural density, never crowded)
 */
export function createDefaultSanctuaryPlants(): PlacedPlant[] {
  const specs: Array<{ assetId: string; zoneId: HabitatZoneId; x: number; stage: 1 | 2 | 3 }> = [
    // Rainforest Canopy & Grove hubs
    { assetId: 'plant_02_tualang_tree', zoneId: 'forest', x: 41650, stage: 2 },
    { assetId: 'plant_09_birds_nest_fern', zoneId: 'forest', x: 42350, stage: 1 },
    { assetId: 'plant_03_durian_tree', zoneId: 'forest', x: 85150, stage: 1 },
    { assetId: 'plant_11_hibiscus', zoneId: 'forest', x: 85680, stage: 2 },
    { assetId: 'plant_05_banana_plant', zoneId: 'forest', x: 86120, stage: 1 },
    { assetId: 'plant_01_rafflesia', zoneId: 'forest', x: 141700, stage: 2 },
    { assetId: 'plant_04_mangosteen_tree', zoneId: 'forest', x: 142320, stage: 1 },
    // River Pond hubs
    { assetId: 'plant_26_lotus', zoneId: 'river', x: 201720, stage: 2 },
    { assetId: 'plant_27_water_lily', zoneId: 'river', x: 202280, stage: 2 },
    { assetId: 'plant_07_bamboo', zoneId: 'river', x: 247150, stage: 1 },
    { assetId: 'plant_25_water_hyacinth', zoneId: 'river', x: 247820, stage: 2 },
    { assetId: 'plant_29_hornwort', zoneId: 'river', x: 291750, stage: 1 },
    // Mud Shore hubs
    { assetId: 'plant_19_red_mangrove', zoneId: 'mud', x: 355720, stage: 1 },
    { assetId: 'plant_20_api_api_mangrove', zoneId: 'mud', x: 391220, stage: 1 },
    { assetId: 'plant_21_nipa_palm', zoneId: 'mud', x: 391820, stage: 1 },
    // Coral Sea hubs (around starter turtle at 543,600)
    { assetId: 'plant_22_tropical_seagrass_enhalus_acoroides', zoneId: 'sea', x: 494720, stage: 1 },
    { assetId: 'plant_23_tropical_turtle_grass_thalassia_hemprichii', zoneId: 'sea', x: 543280, stage: 1 },
    { assetId: 'plant_24_eelgrass', zoneId: 'sea', x: 543940, stage: 1 },
    { assetId: 'plant_22_tropical_seagrass_enhalus_acoroides', zoneId: 'sea', x: 593720, stage: 1 },
  ];

  return specs.map((s, idx) => ({
    uid: `default_plant_${idx}`,
    assetId: s.assetId,
    zoneId: s.zoneId,
    x: s.x,
    y: 420,
    growthStage: s.stage,
    growthProgress: s.stage === 1 ? 20 : 65,
    fruitCount: 0, // By default newly placed/young plants do not have fruits yet—must wait for growth!
    hasGoldenFruit: false,
    fruitRegenTimerSec: 28,
    swayImpulse: 0,
    grazingBitesRemaining: 5,
    isDefaultScenery: true,
  }));
}

/**
 * Creates the default initial save state:
 * The player owns ONLY 1 free Green Sea Turtle (`animal_28_green_sea_turtle`).
 * Additional turtles or other species are purchased in the Store.
 */
export function createInitialSaveState(): SaveState {
  const starterX = 543600; // 3020 * 180 in the Coral Sea Sanctuary
  const now = Date.now();
  return {
    version: 2,
    greenbits: 900,
    harmonyXp: 25,
    ownedAssets: {
      animal_28_green_sea_turtle: 1,
    },
    foodInventory: {
      food_seaweed_kelp: 2,
      food_banana_bunch: 1,
    },
    placedAnimals: [
      {
        uid: 'starter_green_sea_turtle',
        assetId: 'animal_28_green_sea_turtle',
        customName: 'Penyu',
        zoneId: 'sea',
        x: starterX,
        y: 440,
        targetX: starterX + 160,
        targetY: 430,
        vx: 0,
        vy: 0,
        facing: -1,
        hunger: 88,
        happiness: 92,
        bondXp: 100, // Starts at Love Lv.1 (requires 1-3 weeks of care to reach Lv.5)
        careStartTimestampMs: now,
        careDaysCount: 1,
        lastCareDayStamp: new Date(now).toISOString().slice(0, 10),
        showBabyCompanion: false,
        currentEmotion: 'normal',
        emotionTimerSec: 0,
        lastEmoteTriggerMs: 0,
        emoteSpamCount: 0,
        locoBlend: 1,
        eatingStage: 'none',
        eatingTimerSec: 0,
        petScratchAccum: 0,
        lastGreenbitDropSec: 0,
        blinkCountdownSec: 2.4,
        blinkActiveSec: 0,
      },
    ],
    placedPlants: createDefaultSanctuaryPlants(),
    droppedFoods: [],
    discoveredEcoDex: ['animal_28_green_sea_turtle'],
    discoveredFavoriteFoods: [],
    discoveredEmotions: {
      animal_28_green_sea_turtle: ['normal', 'waving'],
    },
    dailyQuests: [
      {
        id: 'quest_feed_3',
        title: 'Feed animals 3 times',
        target: 3,
        progress: 0,
        rewardGreenbits: 120,
        claimed: false,
      },
      {
        id: 'quest_pet_3',
        title: 'Care for animals 3 times',
        target: 3,
        progress: 0,
        rewardGreenbits: 90,
        claimed: false,
      },
      {
        id: 'quest_place_2',
        title: 'Place 2 ecosystem species',
        target: 2,
        progress: 0,
        rewardGreenbits: 150,
        claimed: false,
      },
    ],
    streakDays: 1,
    lastSavedTimestampMs: now,
    timeOfDayHours: 11.5,
    autoCycleTime: true,
    currentWeather: 'sunny',
    autoCycleWeather: true,
    soundMuted: false,
    weatherLocationLabel: 'Kuala Lumpur, MY',
  };
}
