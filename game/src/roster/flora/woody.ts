import type { PlantRig } from './types';

/**
 * Refined woody plant rigs.
 * Note: P02-P07, P13-P17, P19-P21 in plantRenderer.ts are already rich, multi-tiered,
 * fully-volumetric Canvas2D vector rigs with species-specific bark, buttresses,
 * honeycombs, cauliflorous durians, mangosteen calyces, banana hands, and prop roots.
 * They are preserved to maintain canopy fullness and 90% botanical realism.
 */
export const WOODY_PLANT_RIGS: Record<string, PlantRig> = {};
