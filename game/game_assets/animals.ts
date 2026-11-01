/**
 * Animal Vector Graphics Generation & Anatomy Registry
 * All 41 animals (A01–A41) generated strictly in Canvas2D vector primitives.
 */

export interface AnimalVectorMetadata {
  id: string;
  name: string;
  scientificName: string;
  biome: 'land' | 'freshwater' | 'marine' | 'semi-aquatic';
  bodyScale: number;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    outline: string;
  };
}

export const ANIMAL_VECTOR_CATALOG: Record<string, AnimalVectorMetadata> = {
  animal_01_malayan_tiger: {
    id: 'animal_01_malayan_tiger',
    name: 'Malayan Tiger',
    scientificName: 'Panthera tigris jacksoni',
    biome: 'land',
    bodyScale: 1.15,
    palette: { primary: '#f28b24', secondary: '#fffdf5', accent: '#c95e10', outline: '#261408' },
  },
  animal_28_green_sea_turtle: {
    id: 'animal_28_green_sea_turtle',
    name: 'Green Sea Turtle',
    scientificName: 'Chelonia mydas',
    biome: 'marine',
    bodyScale: 1.1,
    palette: { primary: '#34d399', secondary: '#ecfccb', accent: '#059669', outline: '#064e3b' },
  },
  animal_33_blacktip_reef_shark: {
    id: 'animal_33_blacktip_reef_shark',
    name: 'Blacktip Reef Shark',
    scientificName: 'Carcharhinus melanopterus',
    biome: 'marine',
    bodyScale: 1.05,
    palette: { primary: '#64748b', secondary: '#f8fafc', accent: '#0f172a', outline: '#020617' },
  },
  animal_41_giant_panda: {
    id: 'animal_41_giant_panda',
    name: 'Giant Panda',
    scientificName: 'Ailuropoda melanoleuca',
    biome: 'land',
    bodyScale: 1.2,
    palette: { primary: '#ffffff', secondary: '#1e293b', accent: '#0f172a', outline: '#020617' },
  },
};
