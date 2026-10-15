export const HABIT_CODES = [
  "box_cutlery",
  "recycle_bags",
  "self_bottle_refill",
  "greenery_furniture",
  "handicraft_projects",
  "beeswax_food_wraps",
  "bulk_pantry_refill",
] as const;

export type HabitCode = (typeof HABIT_CODES)[number];

export interface HabitDefinition {
  code: HabitCode;
  name: string;
  points: number;
  description: string;
}

export const HABITS: readonly HabitDefinition[] = [
  {
    code: "box_cutlery",
    name: "Box & Cutlery",
    points: 300,
    description: "Snap a clean photo of your reusable meal box and portable utensil pack when dining out or taking lunch to work.",
  },
  {
    code: "recycle_bags",
    name: "Recycle Bags",
    points: 50,
    description: "Capture your cloth tote or canvas shopper in use during grocery checkout instead of single-use plastic grocery bags.",
  },
  {
    code: "self_bottle_refill",
    name: "Self Bottle Refill",
    points: 30,
    description: "Photograph your personal insulated flask or refillable tumbler at any water station, cafe, or drinking fountain.",
  },
  {
    code: "greenery_furniture",
    name: "Greenery & Furniture",
    points: 300,
    description: "Upcycle plastics into plant containers, indoor green dividers, or sturdy modular living room decor.",
  },
  {
    code: "handicraft_projects",
    name: "Handicraft Projects",
    points: 100,
    description: "Submit hand-woven basketry, braided accessories, or crafted utilitarian organizers repurposing clean scrap plastics.",
  },
  {
    code: "beeswax_food_wraps",
    name: "Beeswax Food Wraps",
    points: 40,
    description: "Show organic natural beeswax wraps sealing produce, bread, or meal bowls instead of disposable cling wrap.",
  },
  {
    code: "bulk_pantry_refill",
    name: "Bulk Pantry Refill",
    points: 80,
    description: "Verify grains, spices, oils, or laundry detergents refilled using your own mason jars or zero-waste containers.",
  },
];

export const ML_SCORE_THRESHOLD_DEFAULT = 0.85;

