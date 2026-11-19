import { getSpeciesFramingScale, isLandStandingAnimal } from '../../roster/animalRenderer';
import type { HabitatZoneId, PlacedAnimal, PlacedPlant } from '../types';
import {
  ASSET_ECO_CONFIG,
  getTerrainFloorY,
  getWaterSurfaceY,
  isFloatingPlantAsset,
} from '../worldConfig';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export const animalRestYCache = new Map<string, number>();

export function getDefaultPlacementY(
  assetId: string,
  zoneId: HabitatZoneId,
  worldX: number,
  canvasHeight: number,
): number {
  const floorY = getTerrainFloorY(worldX, canvasHeight);
  const waterY = getWaterSurfaceY(worldX, canvasHeight);
  const meta = ASSET_ECO_CONFIG[assetId];

  if (!meta) return floorY - 24;

  if (meta.kind === 'plant') {
    // Floating plants (lotus, lilies, hyacinth, duckweed, kangkung) sit at the water surface
    if (isFloatingPlantAsset(assetId) && waterY !== null) return waterY + 12;
    return floorY + 8;
  }

  const w = getAnimalWorldScale(assetId);
  const inWater = (zoneId === 'sea' || zoneId === 'river') && waterY !== null;

  if (inWater) {
    if (meta.canopyHabit === 'benthic') {
      // Bottom dwellers rest on the seabed / riverbed
      return floorY + 4 - getAnimalGroundContactOffset(assetId, true);
    }
    if (isLandStandingAnimal(assetId)) {
      // Semi-aquatic walkers (otter, terrapin, monitor, tapir) swim at the surface to breathe
      return waterY + 30 * w;
    }
    // Swimmers stay inside the water column: never poking out of the surface or into the seabed
    const top = waterY + 62 * w;
    const bottom = floorY - 58 * w;
    const mid = waterY + (floorY - waterY) * 0.48;
    return bottom > top ? clamp(mid, top, bottom) : (waterY + floorY) * 0.5;
  }

  // Land: put the feet (contact shadow) on the same ground line for every species and size
  return floorY + 22 - getAnimalGroundContactOffset(assetId, false);
}

/** Internal framing multiplier of the Green Sea Turtle reference inside its box. */
const TURTLE_REFERENCE_FRAMING = 1.12;

/**
 * Multiplier for the 220 x 200 world drawing box of an animal, so that its body appears at
 * `visualSize` relative to the Green Sea Turtle. Thumbnails and store cards are not affected.
 */
export function getAnimalWorldScale(assetId: string): number {
  const size = ASSET_ECO_CONFIG[assetId]?.visualSize ?? 1;
  if (
    assetId.startsWith('animal_28_green_sea_turtle') ||
    assetId === 'animal_29_hawksbill_sea_turtle'
  ) {
    return size;
  }
  return (size * TURTLE_REFERENCE_FRAMING) / getSpeciesFramingScale(assetId);
}

/** Body size relative to the Green Sea Turtle, for hit areas, labels and bubbles. */
export function getAnimalVisualSize(assetId: string): number {
  return ASSET_ECO_CONFIG[assetId]?.visualSize ?? 1;
}

/**
 * Distance from an animal's anchor (animal.y) down to where its feet or belly touch the
 * ground, for its world scale. Derived from the drawing box: the box centre sits 0.06 box
 * heights above the anchor and the contact shadow sits 186 (walkers) units below the
 * centre in the 650-unit rig frame.
 */
export function getAnimalGroundContactOffset(assetId: string, benthic: boolean): number {
  const w = getAnimalWorldScale(assetId);
  const rigScale = (Math.min(220 * w, 200 * w * 1.08) / 650) * getSpeciesFramingScale(assetId);
  const contactLocal = benthic ? 205 : 186;
  return -0.06 * 200 * w + contactLocal * rigScale;
}

/** World drawing box of a plant (growth stage and species height applied). */
export function getPlantDrawSize(plant: Pick<PlacedPlant, 'assetId' | 'growthStage'>): { w: number; h: number } {
  const stageScale = plant.growthStage === 1 ? 0.68 : plant.growthStage === 2 ? 0.88 : 1.04;
  const size = ASSET_ECO_CONFIG[plant.assetId]?.visualSize ?? 1;
  return { w: 210 * stageScale * size, h: 195 * stageScale * size };
}

/**
 * The tree a canopy animal (orangutan, sun bear, pangolin, macaque, langur, python, monitor, squirrel, panda, hornbill...)
 * is currently climbing or perched in, or null when there is no tree nearby.
 */
export function findPerchTree(
  animal: Pick<PlacedAnimal, 'x' | 'zoneId'>,
  plants: PlacedPlant[],
  extraReach = 0,
): PlacedPlant | null {
  let best: PlacedPlant | null = null;
  let bestDx = Infinity;
  for (const p of plants) {
    if (p.zoneId !== animal.zoneId) continue;
    if (!ASSET_ECO_CONFIG[p.assetId]?.isPerchTree || p.growthStage < 1) continue;
    const reach = getPlantDrawSize(p).w * 0.36 + extraReach;
    const dx = Math.abs(p.x - animal.x);
    if (dx <= reach && dx < bestDx) {
      best = p;
      bestDx = dx;
    }
  }
  return best;
}

/** Clears cached vertical position for placed or moved animals so they never float. */
export function clearAnimalRestCache(uid?: string): void {
  if (uid) {
    animalRestYCache.delete(uid);
  } else {
    animalRestYCache.clear();
  }
}

/**
 * Where an animal rests vertically: firmly on the ground terrain, in the water column,
 * or climbing up and down a host tree's trunk and canopy boughs when a canopy/arboreal species is near a perch tree.
 */
export function getAnimalRestY(
  animal: Pick<PlacedAnimal, 'assetId' | 'zoneId' | 'x'>,
  plants: PlacedPlant[],
  canvasHeight: number,
): number {
  const groundY = getDefaultPlacementY(animal.assetId, animal.zoneId, animal.x, canvasHeight);
  const meta = ASSET_ECO_CONFIG[animal.assetId];
  if (meta?.canopyHabit === 'canopy') {
    const tree = findPerchTree(animal, plants, 36);
    if (tree) {
      const { w: treeW, h: treeH } = getPlantDrawSize(tree);
      const maxReach = treeW * 0.36 + 36;
      const dx = Math.abs(animal.x - tree.x);
      const trunkZone = Math.max(18, treeW * 0.14);
      const crownPerchY = tree.y - treeH * 0.50 + (dx / Math.max(1, maxReach)) * (treeH * 0.14);
      // When right on the main trunk (`dx <= trunkZone`), climb vertically along the trunk between lower trunk and upper crown
      if (dx <= trunkZone) {
        const trunkProgress = clamp(Math.sin((animal.x - tree.x) * 0.12) * 0.5 + 0.5, 0, 1);
        const lowerTrunkY = groundY - treeH * 0.16;
        const upperCrownY = tree.y - treeH * 0.54;
        return Math.min(groundY, lowerTrunkY + (upperCrownY - lowerTrunkY) * trunkProgress);
      }
      // Across the main boughs (`trunkZone < dx <= treeW * 0.28`), perch and clamber along the bough arc
      const boughSpan = treeW * 0.28;
      if (dx <= boughSpan) {
        return Math.min(groundY, crownPerchY);
      }
      // Outer approach: climb smoothly between ground and lower boughs
      const climbT = clamp(1 - (dx - boughSpan) / Math.max(1, maxReach - boughSpan), 0, 1);
      return groundY + (Math.min(groundY, crownPerchY) - groundY) * climbT;
    }
  }
  return groundY;
}
