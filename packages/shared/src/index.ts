export const HABIT_CODES = [
  "box_cutlery",
  "recycle_bags",
  "self_bottle_refill",
  "greenery_furniture",
  "handicraft_projects",
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
    points: 250,
    description: "Bring your own reusable food container and cutlery instead of single-use items.",
  },
  {
    code: "recycle_bags",
    name: "Reusable Bags",
    points: 10,
    description: "Choose reusable bags instead of taking single-use plastic bags.",
  },
  {
    code: "self_bottle_refill",
    name: "Refill Your Bottle",
    points: 10,
    description: "Refill a reusable bottle instead of buying a plastic bottle.",
  },
  {
    code: "greenery_furniture",
    name: "Greenery & Furniture",
    points: 200,
    description: "Reuse plastics as a pot for plants and/or repair/ build tools and furnitures using used plastics",
  },
  {
    code: "handicraft_projects",
    name: "Handicraft Projects",
    points: 200,
    description: "Make useful items/ handicrafts by reusing used plastics.",
  },
];

export const ML_SCORE_THRESHOLD_DEFAULT = 0.85;

export const DAILY_HABIT_LIMITS: Record<HabitCode, number> = {
  box_cutlery: 3,
  recycle_bags: 1,
  self_bottle_refill: 1,
  greenery_furniture: 1,
  handicraft_projects: 1,
};
