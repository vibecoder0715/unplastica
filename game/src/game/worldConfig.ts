import { ROSTER_ASSETS } from '../roster/catalog';
import type {
  ActivityPattern,
  AssetEcoMetadata,
  FoodCategory,
  PlantPlacement,
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
    // Contained River Basin with realistic shallow littoral margins (<2.5m depth at banks for lotus/lilies)
    // and deep central thalweg pool for arowana and snakehead.
    const t = (x - fEnd) / (rEnd - fEnd); // 0 .. 1
    let bedDepth: number;
    if (t < 0.25) {
      // Shallow sunlit margin: gentle slope from 0 to 0.18 (lotus & lily beds)
      const u = t / 0.25;
      bedDepth = smooth01(u) * 0.18;
    } else if (t < 0.4) {
      // Slope into deep channel
      const u = (t - 0.25) / 0.15;
      bedDepth = 0.18 + smooth01(u) * 0.60;
    } else if (t < 0.7) {
      // Deep central channel / Arowana pool
      const u = (t - 0.4) / 0.3;
      bedDepth = 0.78 + Math.sin(u * Math.PI) * 0.06;
    } else if (t < 0.82) {
      // Slope up from deep channel
      const u = (t - 0.7) / 0.12;
      bedDepth = 0.78 - smooth01(u) * 0.60;
    } else {
      // Right shallow margin: gentle gravel slope to levee
      const u = (1 - t) / 0.18;
      bedDepth = smooth01(u) * 0.18;
    }
    const ripples = Math.sin(x * 0.0025) * 0.012;
    normY = 0.545 + bedDepth + ripples;
  } else if (x <= mEnd) {
    // Intertidal Mud Shore plateau between River and Sea, staying above water level
    const t = (x - rEnd) / (mEnd - rEnd);
    const bankCurve = Math.sin(t * Math.PI);
    const micro = Math.sin(x * 0.0018) * 0.008 * bankCurve;
    normY = 0.545 - bankCurve * 0.012 + micro;
  } else {
    normY = 0.545 + getSeaDepthBelowShore(x);
  }

  return normY * canvasHeight;
}

/** Hermite smoothstep on 0..1. */
function smooth01(u: number): number {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
}

/**
 * Coral Sea bathymetry (normalised to viewport height, measured below the shoreline at 0.545).
 * Real reefs: a short beach slope, a long shallow sunlit reef flat with seagrass meadows,
 * a steep reef drop-off, then the deep pelagic zone. Previously the "Seagrass Sanctuary"
 * sat at 64% of the abyss depth, where no seagrass or coral can grow.
 */
function getSeaDepthBelowShore(x: number): number {
  const mEnd = HABITAT_ZONES[2].xEnd;
  const t = Math.max(0, Math.min(1, (x - mEnd) / (WORLD_WIDTH - mEnd)));
  let depth: number;
  if (t < 0.035) {
    depth = smooth01(t / 0.035) * 0.09; // beach slope
  } else if (t < 0.48) {
    depth = 0.09 + ((t - 0.035) / 0.445) * 0.33; // shallow reef flat and seagrass meadows
  } else if (t < 0.66) {
    depth = 0.42 + smooth01((t - 0.48) / 0.18) * 1.4; // reef drop-off
  } else {
    depth = 1.82 + ((t - 0.66) / 0.34) * 1.33; // pelagic and abyssal plain
  }
  const ridges = Math.sin(x * 0.0022) * 0.022 * Math.min(1, t * 8) * (t < 0.5 ? 1 : 0.5);
  return depth + ridges;
}

/**
 * Water column depth at worldX, normalised to viewport height (0 = dry / no water).
 * Independent of the canvas size, so habitat rules give the same answer on every screen.
 */
export function getWaterDepthNorm(worldX: number): number {
  if (getWaterSurfaceY(worldX, 1) === null) return 0;
  return Math.max(0, getTerrainFloorY(worldX, 1) - 0.56);
}

/** Seagrass and reef corals need sunlit water; deeper than this they cannot grow. */
export const SHALLOW_SUNLIT_DEPTH_NORM = 0.45;

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
      'Orangutans, sun bears, porcupines and giant squirrels feast on ripe durians, and fallen fruit feeds mousedeer on the forest floor.',
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
  food_rambutan_fruit: {
    id: 'food_rambutan_fruit',
    name: 'Rambutan Cluster',
    category: 'fruit',
    price: 40,
    hungerRestore: 34,
    greenbitsBonus: 18,
    colorPrimary: '#e11d48',
    colorSecondary: '#bef264',
    description: 'A cluster of red, soft-haired rambutans from the Rambutan Tree.',
    infoSentences: [
      'Rambutan gets its name from the Malay word "rambut" (hair) because of the soft red spines covering its skin.',
      'Monkeys, langurs, hornbills and squirrels eat the sweet translucent flesh and help spread the seeds.',
    ],
    searchQuery: 'Rambutan Nephelium lappaceum Malaysia fruit',
    allowedZones: ['forest', 'river', 'mud'],
  },
  food_papaya_fruit: {
    id: 'food_papaya_fruit',
    name: 'Ripe Papaya',
    category: 'fruit',
    price: 40,
    hungerRestore: 38,
    greenbitsBonus: 20,
    colorPrimary: '#f97316',
    colorSecondary: '#65a30d',
    description: 'A pear-shaped orange papaya (betik) from the Papaya Tree.',
    infoSentences: [
      'Papaya fruits grow straight from the trunk under the leaf crown and ripen from green to golden orange.',
      'Its soft sweet flesh and black seeds are eaten by box turtles, macaques, fruit bats and birds.',
    ],
    searchQuery: 'Papaya Carica papaya Malaysia betik fruit',
    allowedZones: ['forest', 'river', 'mud'],
  },
  food_wild_figs: {
    id: 'food_wild_figs',
    name: 'Wild Figs',
    category: 'fruit',
    price: 30,
    hungerRestore: 30,
    greenbitsBonus: 16,
    colorPrimary: '#b91c1c',
    colorSecondary: '#f59e0b',
    description: 'Small red figs from the Banyan Fig, a keystone food of the rainforest.',
    infoSentences: [
      'Fig trees fruit at different times of the year, so they feed wildlife when little else is ripe.',
      'Hornbills, langurs, sambar deer and mousedeer depend on fallen and hanging wild figs.',
    ],
    searchQuery: 'Banyan fig Ficus keystone food hornbill Malaysia',
    allowedZones: ['forest', 'river', 'mud'],
  },
  food_coconut: {
    id: 'food_coconut',
    name: 'Young Coconut',
    category: 'fruit',
    price: 35,
    hungerRestore: 32,
    greenbitsBonus: 16,
    colorPrimary: '#65a30d',
    colorSecondary: '#78350f',
    description: 'A green coconut (kelapa) from the Coconut Palm.',
    infoSentences: [
      'Coconuts are fibrous drupes that float, which lets them drift across the sea and sprout on new beaches.',
      'Long-tailed macaques and elephants crack them open for the sweet water and soft white flesh.',
    ],
    searchQuery: 'Coconut Cocos nucifera Malaysia kelapa wildlife',
    allowedZones: ['forest', 'mud'],
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
      'Filter feeders like the Whale Shark and Giant Clam strain plankton from the water, and Clownfish and prawns pick it from the current.',
    ],
    searchQuery: 'Marine plankton coral reef food web Malaysia',
    allowedZones: ['sea', 'river'],
  },
  food_river_minnow_treat: {
    id: 'food_river_minnow_treat',
    name: 'Fish & Prawns',
    category: 'river_treat',
    price: 50,
    hungerRestore: 45,
    greenbitsBonus: 24,
    colorPrimary: '#fb923c',
    colorSecondary: '#c2410c',
    description: 'Small fish and prawns for fish-eating wildlife.',
    infoSentences: [
      'Small schooling fish and crustaceans live in clean Malaysian streams, among mangrove roots and on coastal coral reefs.',
      'They feed otters, arowanas, dolphins, reef sharks, rays, monitor lizards and the Malayan tiger, which is a strong swimmer and catches fish.',
    ],
    searchQuery: 'Malaysian river fish and freshwater prawn ecosystem',
    allowedZones: ['forest', 'river', 'mud', 'sea'],
  },
  food_bamboo_shoots: {
    id: 'food_bamboo_shoots',
    name: 'Bamboo Shoots',
    category: 'bamboo',
    price: 40,
    hungerRestore: 40,
    greenbitsBonus: 20,
    colorPrimary: '#84cc16',
    colorSecondary: '#a16207',
    description: 'Tender young bamboo shoots (rebung) from the base of a Bamboo clump.',
    infoSentences: [
      'New bamboo shoots push up from the underground rhizome and can grow tens of centimetres in a single day.',
      'Giant pandas live almost entirely on bamboo, and elephants and porcupines also eat the young shoots.',
    ],
    searchQuery: 'Bamboo shoots rebung wildlife diet panda elephant',
    allowedZones: ['forest'],
  },
  food_wild_honeycomb: {
    id: 'food_wild_honeycomb',
    name: 'Wild Honeycomb',
    category: 'honey',
    price: 50,
    hungerRestore: 44,
    greenbitsBonus: 23,
    colorPrimary: '#f59e0b',
    colorSecondary: '#78350f',
    description: 'A piece of giant honeybee comb from high in a Tualang tree.',
    infoSentences: [
      'Giant honeybees hang their combs under the branches of Tualang trees because the smooth bark is hard to climb.',
      'The Malayan sun bear uses its long claws and very long tongue to reach honey and bee larvae.',
    ],
    searchQuery: 'Tualang tree giant honeybee comb sun bear',
    allowedZones: ['forest'],
  },
  food_ants_termites: {
    id: 'food_ants_termites',
    name: 'Ants & Termites',
    category: 'insects',
    price: 30,
    hungerRestore: 40,
    greenbitsBonus: 20,
    colorPrimary: '#a16207',
    colorSecondary: '#451a03',
    description: 'A chunk of termite mound with ants and termites for insect eaters.',
    infoSentences: [
      'Termites recycle dead wood into soil, and their mounds are rich food for many forest animals.',
      'The Sunda pangolin eats only ants and termites, and sun bears, firebacks and monitor lizards also hunt them.',
    ],
    searchQuery: 'Sunda pangolin diet ants termites Malaysia',
    allowedZones: ['forest', 'mud'],
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
    // Obligate carnivore. The sanctuary has no predation, so it is fed fish (tigers do catch fish).
    diet: ['river_treat'],
    favFood: 'food_river_minnow_treat',
    radius: 82,
    habit: 'ground',
    sentences: [
      'The Malayan Tiger is Malaysia’s national symbol and a critically endangered apex predator with bold black stripes on orange fur.',
      'It patrols dense tropical rainforests alone and is a strong swimmer that crosses jungle rivers with ease.',
    ],
  },
  animal_02_asian_elephant: {
    zones: ['forest'],
    price: 300,
    passive: 16,
    diet: ['fruit', 'bamboo'],
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
    diet: ['fruit', 'seaweed'],
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
    diet: ['fruit', 'insects', 'honey'],
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
    diet: ['honey', 'insects', 'fruit'],
    favFood: 'food_wild_honeycomb',
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
    // Strict myrmecophage: eats only ants and termites.
    diet: ['insects'],
    favFood: 'food_ants_termites',
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
    diet: ['fruit', 'bamboo'],
    favFood: 'food_wild_figs',
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
    diet: ['fruit'],
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
    diet: ['fruit', 'insects', 'river_treat'],
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
    // Leaf monkey: mostly leaves and unripe fruit.
    diet: ['fruit', 'bamboo'],
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
    diet: ['fruit', 'bamboo'],
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
    diet: ['fruit'],
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
    diet: ['fruit'],
    favFood: 'food_rambutan_fruit',
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
    diet: ['fruit', 'insects'],
    favFood: 'food_ants_termites',
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
    diet: ['fruit', 'insects'],
    favFood: 'food_wild_figs',
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
    diet: ['river_treat'],
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
    // Clouded monitors feed mostly on ants, beetles and other invertebrates.
    diet: ['insects', 'river_treat'],
    favFood: 'food_ants_termites',
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
    diet: ['fruit'],
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
    diet: ['river_treat'],
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
    diet: ['plankton', 'seaweed'],
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
    // Surface hunter of insects and small fish.
    diet: ['river_treat', 'insects'],
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
    diet: ['river_treat'],
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
    diet: ['fruit', 'seaweed'],
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
    diet: ['fruit', 'insects', 'seaweed'],
    favFood: 'food_papaya_fruit',
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
    diet: ['river_treat'],
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
    diet: ['river_treat'],
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
    // Dugongs graze only on seagrass.
    diet: ['seaweed'],
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
    // Adult green turtles are herbivores (seagrass and algae).
    diet: ['seaweed'],
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
    // Hawksbills eat mostly reef sponges plus algae and small invertebrates.
    diet: ['seaweed', 'river_treat'],
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
    diet: ['plankton'],
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
    diet: ['river_treat'],
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
    diet: ['river_treat'],
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
    diet: ['river_treat'],
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
    // Feeds on crabs, shrimps and worms dug from the sand, not plankton.
    diet: ['river_treat'],
    favFood: 'food_river_minnow_treat',
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
    diet: ['river_treat'],
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
    // In the wild it hunts only sea stars. The sanctuary has no predation, so it gets a meaty ration.
    diet: ['river_treat'],
    favFood: 'food_river_minnow_treat',
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
    diet: ['river_treat'],
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
    // About 99% of a giant panda's diet is bamboo.
    diet: ['bamboo'],
    favFood: 'food_bamboo_shoots',
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
    // The tree itself has no edible fruit; giant honeybees build combs under its branches.
    producesFruitId: 'food_wild_honeycomb',
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
    producesFruitId: 'food_papaya_fruit',
    sentences: [
      'The Papaya Tree has a straight, leaf-scarred hollow trunk crowned with an umbrella of deeply 7-lobed palmate leaves.',
      'Creamy blossoms grow directly along the upper trunk and ripen into pear-shaped amber-orange papaya fruits.',
    ],
  },
  plant_07_bamboo: {
    // Bamboo grows on dry ground, including river banks, never in open water.
    zones: ['forest'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_bamboo_shoots',
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
    // A ground herb of moist forest; it bears flower torches, not rambutan or papaya.
    zones: ['forest'],
    price: 150,
    passive: 8,
    sentences: [
      'Called Bunga Kantan in Malaysia, Torch Ginger sends up tall, lush pseudostems with long oblong-lanceolate ginger leaves.',
      'Its striking waxy pink cone-shaped flower torches bloom on sturdy stalks from the ground rhizome.',
    ],
  },
  plant_11_hibiscus: {
    zones: ['forest'],
    price: 150,
    passive: 8,
    // Ornamental flowering shrub: no edible fruit (previously grew rambutan and papaya).
    sentences: [
      'Hibiscus rosa-sinensis, or Bunga Raya, is Malaysia’s national flower and features ovate leaves with coarsely toothed edges.',
      'Its bushy branches bloom with multiple vibrant five-petaled scarlet flowers, each showcasing a long golden-tipped stamen column.',
    ],
  },
  plant_12_ixora: {
    zones: ['forest'],
    price: 150,
    passive: 7,
    sentences: [
      'Ixora is an evergreen tropical shrub with pairs of stiff, glossy oblong leaves arranged neatly along woody stems.',
      'It blooms year-round with dense, rounded umbrella clusters of four-pointed scarlet-orange star florets.',
    ],
  },
  plant_13_coconut_palm: {
    zones: ['forest', 'mud'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_coconut',
    sentences: [
      'The Coconut Palm has a tall, curving ringed trunk topped by a sweeping crown of feather-like pinnate fronds.',
      'Each frond carries dozens of narrow leaflets while heavy clusters of buoyant green-and-gold coconuts hang beneath.',
    ],
  },
  plant_14_banyan_fig: {
    zones: ['forest'],
    price: 150,
    passive: 9,
    producesFruitId: 'food_wild_figs',
    sentences: [
      'The Banyan Fig is a majestic keystone tree with wide-spreading boughs, aerial prop roots, and broad oval leathery leaves.',
      'When it fruits, its branches produce abundant pairs of red figs that feed hornbills, monkeys, and squirrels.',
    ],
  },
  plant_15_rambutan_tree: {
    zones: ['forest'],
    price: 150,
    passive: 8,
    producesFruitId: 'food_rambutan_fruit',
    sentences: [
      'The Rambutan Tree is a lush tropical fruit tree with compound pinnate leaves made of smooth, elliptic-obovate leaflets.',
      'After flowering, its branches hang heavy with clusters of bright crimson rambutan fruits covered in soft golden-green hairs.',
    ],
  },
  plant_16_sugar_palm: {
    zones: ['forest', 'mud'],
    price: 150,
    passive: 8,
    // Palm fruit strings are not mangosteens; no harvestable store food yet.
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
    // Intertidal mud; the open Coral Sea basin here is too deep for stilt roots.
    zones: ['mud'],
    price: 150,
    passive: 8,
    // Mangroves drop propagules, not seagrass.
    sentences: [
      'The Red Mangrove stands above intertidal mudflats on a tangled arch of stilt roots and has thick, opposite oval leaves.',
      'Its seeds germinate right on the tree into long, torpedo-shaped green propagules before dropping into the tide.',
    ],
  },
  plant_20_api_api_mangrove: {
    zones: ['mud'],
    price: 150,
    passive: 8,
    sentences: [
      'The Api-Api Mangrove is surrounded by hundreds of vertical pencil-like breathing roots that poke up through the mud.',
      'Its narrow lance-shaped leaves have a silvery-white underside that excretes excess sea salt.',
    ],
  },
  plant_21_nipa_palm: {
    // Grows from rhizomes in estuary mud, not in the middle of a deep river.
    zones: ['mud'],
    price: 150,
    passive: 8,
    // The nipa fruit head is not a mangosteen; no harvestable store food yet.
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
    // Eelgrass (Zostera) is a marine seagrass.
    zones: ['sea'],
    price: 150,
    passive: 7,
    producesFruitId: 'food_seaweed_kelp',
    isAquaticFoodSource: true,
    aquaticFoodCategory: 'seaweed',
    sentences: [
      'Eelgrass features slender, flexible translucent-green ribbon leaves that sway gracefully with underwater currents.',
      'It oxygenates shallow coastal lagoons while serving as a natural grazing pasture for turtles and dugongs.',
    ],
  },
  // Freshwater plants are grazed in place by plant-eating animals. They do not drop
  // "Emerald Seagrass", because seagrass is a marine plant.
  plant_25_water_hyacinth: {
    zones: ['river'],
    price: 150,
    passive: 7,
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
    sentences: [
      'The Sacred Lotus holds large, water-repellent circular peltate leaves high above the pond surface on sturdy stems.',
      'Its fragrant multi-layered pink flowers surround a flat-topped golden central seed pod receptacle.',
    ],
  },
  plant_27_water_lily: {
    zones: ['river'],
    price: 150,
    passive: 8,
    isAquaticFoodSource: true,
    aquaticFoodCategory: 'seaweed',
    sentences: [
      'The Tropical Water Lily floats flat, round lily pads with a classic V-shaped notch and toothed bronze-green edges.',
      'Multiple star-shaped magenta blossoms open just above the water surface to greet the morning sun.',
    ],
  },
  plant_28_duckweed: {
    // Duckweed is a freshwater flowering plant, not plankton, and does not grow in the sea.
    zones: ['river'],
    price: 150,
    passive: 7,
    isAquaticFoodSource: true,
    aquaticFoodCategory: 'seaweed',
    sentences: [
      'Duckweed is a tiny floating aquatic plant made of clusters of oval green fronds with delicate hanging rootlets.',
      'It is one of the fastest-growing plants on Earth and is grazed by river terrapins, prawns and plant-eating fish.',
    ],
  },
  plant_29_hornwort: {
    // Hornwort is a freshwater plant.
    zones: ['river'],
    price: 150,
    passive: 7,
    isAquaticFoodSource: true,
    aquaticFoodCategory: 'seaweed',
    sentences: [
      'Hornwort grows in submerged plumes of forked, needle-like leaf whorls that resemble soft underwater pine branches.',
      'It releases oxygen bubbles into the water column and provides shelter for small fish and shrimp.',
    ],
  },
  plant_30_water_spinach: {
    // A creeping herb whose hollow stems float on fresh water (previously drawn as a woody tree).
    zones: ['river'],
    price: 150,
    passive: 7,
    isAquaticFoodSource: true,
    aquaticFoodCategory: 'seaweed',
    sentences: [
      'Known across Malaysia as Kangkung, Water Spinach has hollow floating stems and distinctive arrowhead-shaped leaves.',
      'When mature, it produces delicate trumpet-shaped white and lavender morning-glory blossoms along riverbanks.',
    ],
  },
};

/**
 * Per-species behaviour and size data.
 * - size: on-screen body size relative to the Green Sea Turtle (about 1 m shell = 1.0),
 *   compressed from real body length (roughly length^0.4) and clamped to 0.42 .. 2.0,
 *   so small species stay tappable and giants still fit on a phone screen.
 * - speed: walk/swim speed factor (Green Sea Turtle = 1.0). 0 = sessile.
 * - activity: when the species is naturally awake.
 */
const ANIMAL_BEHAVIOUR: Record<string, { size: number; speed: number; activity: ActivityPattern }> = {
  animal_01_malayan_tiger: { size: 1.3, speed: 1.15, activity: 'cathemeral' },
  animal_02_asian_elephant: { size: 1.75, speed: 0.9, activity: 'cathemeral' },
  animal_03_malayan_tapir: { size: 1.3, speed: 0.9, activity: 'nocturnal' },
  animal_04_orangutan: { size: 1.05, speed: 0.7, activity: 'diurnal' },
  animal_05_sun_bear: { size: 1.1, speed: 0.9, activity: 'diurnal' },
  animal_06_sunda_pangolin: { size: 0.75, speed: 0.55, activity: 'nocturnal' },
  animal_07_sambar_deer: { size: 1.3, speed: 1.1, activity: 'nocturnal' },
  animal_08_greater_mousedeer: { size: 0.6, speed: 1.2, activity: 'nocturnal' },
  animal_09_long_tailed_macaque: { size: 0.72, speed: 1.1, activity: 'diurnal' },
  animal_10_dusky_leaf_monkey: { size: 0.75, speed: 1.0, activity: 'diurnal' },
  animal_11_malayan_porcupine: { size: 0.8, speed: 0.7, activity: 'nocturnal' },
  animal_12_malayan_flying_fox: { size: 0.72, speed: 0.9, activity: 'nocturnal' },
  animal_13_raffles_banded_langur: { size: 0.75, speed: 1.0, activity: 'diurnal' },
  animal_14_malayan_crested_fireback: { size: 0.7, speed: 1.0, activity: 'diurnal' },
  animal_15_rhinoceros_hornbill: { size: 0.85, speed: 0.9, activity: 'diurnal' },
  animal_16_reticulated_python: { size: 1.25, speed: 0.45, activity: 'nocturnal' },
  animal_17_clouded_monitor_lizard: { size: 1.0, speed: 0.8, activity: 'diurnal' },
  animal_18_black_giant_squirrel: { size: 0.65, speed: 1.2, activity: 'diurnal' },
  animal_19_smooth_coated_otter: { size: 0.95, speed: 1.3, activity: 'diurnal' },
  animal_20_giant_freshwater_prawn: { size: 0.55, speed: 0.45, activity: 'nocturnal' },
  animal_21_asian_arowana: { size: 0.9, speed: 0.9, activity: 'diurnal' },
  animal_22_clown_featherback: { size: 0.95, speed: 0.8, activity: 'nocturnal' },
  animal_23_southern_river_terrapin: { size: 0.8, speed: 0.6, activity: 'diurnal' },
  animal_24_southeast_asian_box_turtle: { size: 0.55, speed: 0.35, activity: 'diurnal' },
  animal_25_asian_water_monitor: { size: 1.25, speed: 0.8, activity: 'diurnal' },
  animal_26_giant_snakehead: { size: 1.05, speed: 0.8, activity: 'diurnal' },
  animal_27_dugong: { size: 1.5, speed: 0.55, activity: 'cathemeral' },
  animal_28_green_sea_turtle: { size: 1.0, speed: 1.0, activity: 'diurnal' },
  animal_29_hawksbill_sea_turtle: { size: 0.95, speed: 0.9, activity: 'diurnal' },
  animal_30_whale_shark: { size: 2.0, speed: 0.7, activity: 'cathemeral' },
  animal_31_indo_pacific_humpback_dolphin: { size: 1.45, speed: 1.6, activity: 'cathemeral' },
  animal_32_false_killer_whale: { size: 1.75, speed: 1.5, activity: 'cathemeral' },
  animal_33_blacktip_reef_shark: { size: 1.25, speed: 1.3, activity: 'cathemeral' },
  animal_34_clownfish: { size: 0.42, speed: 0.6, activity: 'diurnal' },
  animal_35_giant_clam: { size: 0.85, speed: 0, activity: 'cathemeral' },
  animal_36_bluespotted_ribbontail_ray: { size: 0.85, speed: 0.8, activity: 'cathemeral' },
  animal_37_coconut_octopus: { size: 0.6, speed: 0.5, activity: 'cathemeral' },
  animal_38_harlequin_shrimp: { size: 0.42, speed: 0.3, activity: 'nocturnal' },
  animal_39_cuttlefish: { size: 0.72, speed: 0.7, activity: 'cathemeral' },
  animal_40_sea_star: { size: 0.55, speed: 0.08, activity: 'cathemeral' },
  animal_41_giant_panda: { size: 1.2, speed: 0.6, activity: 'cathemeral' },
};

/**
 * Per-plant height relative to the shared plant drawing box, where it can grow,
 * and whether canopy animals can climb it. Previously every plant (a Rafflesia flower,
 * duckweed and an 80 m Tualang) was drawn at exactly the same size.
 */
const PLANT_FORM: Record<string, { size: number; placement: PlantPlacement; perch?: boolean }> = {
  plant_01_rafflesia: { size: 0.55, placement: 'land' },
  plant_02_tualang_tree: { size: 3.2, placement: 'land', perch: true },
  plant_03_durian_tree: { size: 2.45, placement: 'land', perch: true },
  plant_04_mangosteen_tree: { size: 1.75, placement: 'land', perch: true },
  plant_05_banana_plant: { size: 1.25, placement: 'land' },
  plant_06_papaya_tree: { size: 1.3, placement: 'land' },
  plant_07_bamboo: { size: 2.2, placement: 'land' },
  plant_08_tropical_pitcher_plant: { size: 0.6, placement: 'land' },
  plant_09_birds_nest_fern: { size: 0.7, placement: 'land' },
  plant_10_torch_ginger: { size: 1.0, placement: 'land' },
  plant_11_hibiscus: { size: 0.85, placement: 'land' },
  plant_12_ixora: { size: 0.7, placement: 'land' },
  plant_13_coconut_palm: { size: 2.3, placement: 'land' },
  plant_14_banyan_fig: { size: 2.7, placement: 'land', perch: true },
  plant_15_rambutan_tree: { size: 1.85, placement: 'land', perch: true },
  plant_16_sugar_palm: { size: 2.15, placement: 'land' },
  plant_17_tree_fern: { size: 1.45, placement: 'land' },
  plant_18_tropical_orchid: { size: 0.55, placement: 'land' },
  plant_19_red_mangrove: { size: 1.75, placement: 'land', perch: true },
  plant_20_api_api_mangrove: { size: 1.6, placement: 'land', perch: true },
  plant_21_nipa_palm: { size: 1.4, placement: 'land' },
  // Seagrass blades reach about the length of a turtle (Enhalus up to 1.5 m)
  plant_22_tropical_seagrass_enhalus_acoroides: { size: 0.95, placement: 'shallow_marine' },
  plant_23_tropical_turtle_grass_thalassia_hemprichii: { size: 0.7, placement: 'shallow_marine' },
  plant_24_eelgrass: { size: 0.75, placement: 'shallow_marine' },
  plant_25_water_hyacinth: { size: 0.7, placement: 'floating' },
  plant_26_lotus: { size: 0.8, placement: 'floating' },
  plant_27_water_lily: { size: 0.65, placement: 'floating' },
  plant_28_duckweed: { size: 0.45, placement: 'floating' },
  plant_29_hornwort: { size: 0.7, placement: 'submerged' },
  plant_30_water_spinach: { size: 0.9, placement: 'floating' },
};

export const ASSET_ECO_CONFIG: Record<string, AssetEcoMetadata> = Object.fromEntries(
  ROSTER_ASSETS.map((item) => {
    const isAnimal = item.category.startsWith('animals_');
    if (isAnimal) {
      const ov = ANIMAL_ZONE_OVERRIDES[item.id] ?? {
        zones: ['forest'] as HabitatZoneId[],
        price: 300,
        passive: 12,
        diet: ['fruit'] as FoodCategory[],
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
        visualSize: ANIMAL_BEHAVIOUR[item.id]?.size ?? 1.0,
        activityPattern: ANIMAL_BEHAVIOUR[item.id]?.activity ?? 'diurnal',
        moveSpeedFactor: ANIMAL_BEHAVIOUR[item.id]?.speed ?? 1.0,
        collisionRadius: ov.radius,
        canopyHabit: ov.habit ?? 'ground',
        // The giant panda is not native to Malaysia (it lives in a few Malaysian zoos).
        conservationStatus:
          item.id === 'animal_41_giant_panda' ? 'Non-native (China), zoo ambassador' : 'Protected Native',
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
        visualSize: PLANT_FORM[item.id]?.size ?? 1.0,
        plantPlacement: PLANT_FORM[item.id]?.placement ?? 'land',
        isPerchTree: PLANT_FORM[item.id]?.perch ?? false,
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
    if ((zoneId === 'sea' || zoneId === 'river') && !canGoOnMudOrLand) {
      // Fully aquatic animals need water deeper than their own body:
      // a whale shark cannot cruise over a 1 m reef flat.
      const span = getDeepEnoughSpanX(zoneId, getRequiredWaterDepthNorm(meta.visualSize));
      if (span) {
        minX = Math.max(minX, span.minX);
        maxX = Math.min(maxX, span.maxX);
      }
      blocksShallowShore = true;
    }
  }
  return { minX, maxX, blocksShallowShore };
}

/** Water depth an aquatic animal of this visual size needs to swim freely (normalised). */
export function getRequiredWaterDepthNorm(visualSize: number): number {
  return 0.1 + 0.16 * Math.max(0.4, visualSize);
}

const deepSpanCache = new Map<string, { minX: number; maxX: number } | null>();

/** The x range inside an aquatic zone where the water is at least `depthNorm` deep. */
function getDeepEnoughSpanX(
  zoneId: HabitatZoneId,
  depthNorm: number,
): { minX: number; maxX: number } | null {
  const key = `${zoneId}:${depthNorm.toFixed(3)}`;
  if (deepSpanCache.has(key)) return deepSpanCache.get(key) ?? null;
  const z = getZoneSpec(zoneId);
  const step = 250;
  let minX = -1;
  let maxX = -1;
  for (let x = z.xStart; x < z.xEnd; x += step) {
    if (getWaterDepthNorm(x) >= depthNorm) {
      if (minX < 0) minX = x;
      maxX = x;
    }
  }
  const span = minX < 0 ? null : { minX, maxX };
  deepSpanCache.set(key, span);
  return span;
}

/** Whether this species is resting (asleep) at the given hour, from its activity pattern. */
export function isAnimalResting(assetId: string, hours: number): boolean {
  const pattern = ASSET_ECO_CONFIG[assetId]?.activityPattern ?? 'diurnal';
  const isNight = hours < 6.2 || hours >= 19.3;
  if (pattern === 'nocturnal') return hours >= 7.5 && hours < 17.5;
  if (pattern === 'cathemeral') return false;
  return isNight;
}

/** Whether an animal can graze this plant in place (it must eat that kind of plant). */
export function canAnimalGrazePlant(animalAssetId: string, plantAssetId: string): boolean {
  const animal = ASSET_ECO_CONFIG[animalAssetId];
  const plant = ASSET_ECO_CONFIG[plantAssetId];
  if (!animal || !plant || !plant.isAquaticFoodSource || !plant.aquaticFoodCategory) return false;
  return Boolean(animal.dietCategories?.includes(plant.aquaticFoodCategory));
}

/** Plants that sit on the water surface instead of the riverbed. */
export function isFloatingPlantAsset(assetId: string): boolean {
  return ASSET_ECO_CONFIG[assetId]?.plantPlacement === 'floating';
}

/**
 * Checks where a plant can physically grow at worldX.
 * Returns an empty string when the spot is fine, otherwise the reason it is not.
 */
export function getPlantPlacementProblem(assetId: string, worldX: number): string {
  const meta = ASSET_ECO_CONFIG[assetId];
  if (!meta || meta.kind !== 'plant') return '';
  const depth = getWaterDepthNorm(worldX);
  const placement = meta.plantPlacement ?? 'land';
  if (placement === 'land' && depth > 0) {
    return `${meta.name} needs dry ground. Plant it on the bank, not in the water.`;
  }
  if ((placement === 'floating' || placement === 'submerged') && depth <= 0) {
    return `${meta.name} needs open fresh water.`;
  }
  if (placement === 'shallow_marine') {
    if (depth <= 0) return `${meta.name} needs shallow sea water.`;
    if (depth > SHALLOW_SUNLIT_DEPTH_NORM) {
      return `${meta.name} needs sunlight. It cannot grow in the deep sea; plant it on the shallow reef flat.`;
    }
  }
  return '';
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

  // Plants must be on ground they can actually grow on (dry bank, open water, or sunlit shallows)
  if (worldX !== undefined && meta.kind === 'plant') {
    const problem = getPlantPlacementProblem(assetId, worldX);
    if (problem) {
      return { valid: false, allowedZones: meta.allowedZones, reason: problem };
    }
  }

  // Aquatic creatures that do not inhabit mud shores cannot stay in shallow shores
  if (worldX !== undefined && meta.kind === 'animal') {
    const bounds = getAquaticSafeBoundsX(assetId, zoneId);
    if (bounds.blocksShallowShore && (worldX < bounds.minX || worldX > bounds.maxX)) {
      return {
        valid: false,
        allowedZones: meta.allowedZones,
        reason: `${meta.name} needs deeper water than this. Drop it further out.`,
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
    // Bamboo clump on the dry river bank (it used to stand at the bottom of the deepest channel)
    { assetId: 'plant_07_bamboo', zoneId: 'forest', x: 168600, stage: 1 },
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
    // Seagrass needs sunlight, so this meadow sits on the shallow reef flat, not the abyss at 593,720
    { assetId: 'plant_22_tropical_seagrass_enhalus_acoroides', zoneId: 'sea', x: 520500, stage: 1 },
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
    // The starter Green Sea Turtle is a herbivore, so the starter bag holds seagrass only
    // (a banana bunch is useless in the Coral Sea).
    foodInventory: {
      food_seaweed_kelp: 3,
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
