import type { AnimalRig } from './types';
import { REPTILES_ARMOURED_RIGS } from './reptilesArmoured';
import { PRIMATES_ARBOREAL_RIGS } from './primatesArboreal';
import { UNGULATES_ELEPHANT_RIGS } from './ungulatesElephant';
import { CARNIVORES_RODENTS_RIGS } from './carnivoresRodents';
import { BIRDS_FISH_RIGS } from './birdsFish';
import { MARINE_LARGE_RIGS } from './marineLarge';
import { INVERTEBRATES_RIGS } from './invertebrates';

/** All refined animal rigs. The frozen tiger (A01) and green turtle (A28) are never listed. */
export const REFINED_ANIMAL_RIGS: Record<string, AnimalRig> = {
  ...REPTILES_ARMOURED_RIGS,
  ...PRIMATES_ARBOREAL_RIGS,
  ...UNGULATES_ELEPHANT_RIGS,
  ...CARNIVORES_RODENTS_RIGS,
  ...BIRDS_FISH_RIGS,
  ...MARINE_LARGE_RIGS,
  ...INVERTEBRATES_RIGS,
};

