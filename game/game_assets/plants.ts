/**
 * Flora Vector Graphics Generation & Botanical Morphology Registry
 * All 30 flora assets (P01–P30) rendered via Canvas2D vector primitives.
 */

export interface PlantVectorMetadata {
  id: string;
  name: string;
  scientificName: string;
  category: 'tree' | 'palm' | 'herb' | 'aquatic' | 'canopy';
  growthStages: number;
  palette: {
    foliage: string;
    bark: string;
    flower?: string;
    fruit?: string;
  };
}

export const PLANT_VECTOR_CATALOG: Record<string, PlantVectorMetadata> = {
  plant_01_kapok_tree: {
    id: 'plant_01_kapok_tree',
    name: 'Kapok Tree',
    scientificName: 'Ceiba pentandra',
    category: 'tree',
    growthStages: 3,
    palette: { foliage: '#15803d', bark: '#475569', flower: '#fef08a' },
  },
  plant_03_durian_tree: {
    id: 'plant_03_durian_tree',
    name: 'Durian Tree',
    scientificName: 'Durio zibethinus',
    category: 'tree',
    growthStages: 3,
    palette: { foliage: '#166534', bark: '#78350f', fruit: '#84cc16' },
  },
  plant_22_turtle_grass: {
    id: 'plant_22_turtle_grass',
    name: 'Turtle Grass',
    scientificName: 'Thalassia testudinum',
    category: 'aquatic',
    growthStages: 2,
    palette: { foliage: '#10b981', bark: '#064e3b' },
  },
};

