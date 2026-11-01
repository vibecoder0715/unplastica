/**
 * Food Vector Graphics Generation Registry
 * All 25 consumable foods, snacks, and treats drawn within standard 22-unit radius Canvas2D frames.
 */

export interface FoodVectorMetadata {
  id: string;
  name: string;
  sourcePlantId?: string;
  category: 'fruit' | 'foliage' | 'aquatic' | 'protein' | 'special';
  primaryColor: string;
}

export const FOOD_VECTOR_CATALOG: Record<string, FoodVectorMetadata> = {
  food_durian_fruit: {
    id: 'food_durian_fruit',
    name: 'Durian Fruit',
    sourcePlantId: 'plant_03_durian_tree',
    category: 'fruit',
    primaryColor: '#65a30d',
  },
  food_banana_bunch: {
    id: 'food_banana_bunch',
    name: 'Pisang Emas Bunch',
    category: 'fruit',
    primaryColor: '#eab308',
  },
  food_seaweed_kelp: {
    id: 'food_seaweed_kelp',
    name: 'Seaweed & Kelp',
    category: 'aquatic',
    primaryColor: '#10b981',
  },
  food_freshwater_crustacean: {
    id: 'food_freshwater_crustacean',
    name: 'River Treat (Prawn/Fish)',
    category: 'protein',
    primaryColor: '#fb923c',
  },
};
