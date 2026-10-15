import { describe, expect, it } from "vitest";
import { HABITS, HABIT_CODES } from "@unplastica/shared";
import { formatPoints } from "./format";

describe("official habit and Greenbit display rules", () => {
  it("keeps all seven reference habit values in order", () => {
    expect(HABIT_CODES).toEqual([
      "box_cutlery",
      "recycle_bags",
      "self_bottle_refill",
      "greenery_furniture",
      "handicraft_projects",
      "beeswax_food_wraps",
      "bulk_pantry_refill",
    ]);
    expect(HABITS.map(({ points }) => points)).toEqual([300, 50, 30, 300, 100, 40, 80]);
  });

  it("formats the balance for a Malaysian English locale", () => {
    expect(formatPoints(1450)).toBe("1,450");
  });
});
