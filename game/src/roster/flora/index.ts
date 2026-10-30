import type { PlantRig } from './types';
import { WOODY_PLANT_RIGS } from './woody';
import { HERBS_AQUATIC_PLANT_RIGS } from './herbsAquatic';

export const REFINED_PLANT_RIGS: Record<string, PlantRig> = {
  ...WOODY_PLANT_RIGS,
  ...HERBS_AQUATIC_PLANT_RIGS,
};
