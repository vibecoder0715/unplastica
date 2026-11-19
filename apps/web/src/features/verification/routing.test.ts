import { describe, expect, it } from "vitest";
import {
  getModelVersionTag,
  MODEL_CLASSES,
  selectModelTier,
  softmaxLogits,
} from "../../../../../api/_lib/modelRouter";
import { checkIpRateLimit, resetInMemoryRateLimits } from "../../../../../api/_lib/rateLimit";

describe("Server-Side AI Model Routing", () => {
  it("routes simple habits to the lightweight model", () => {
    expect(selectModelTier("self_bottle_refill")).toBe("lightweight");
    expect(selectModelTier("recycle_bags")).toBe("lightweight");
  });

  it("routes complex and unspecified habits to the heavier model", () => {
    expect(selectModelTier("box_cutlery")).toBe("heavy");
    expect(selectModelTier("greenery_furniture")).toBe("heavy");
    expect(selectModelTier("handicraft_projects")).toBe("heavy");
    expect(selectModelTier("")).toBe("heavy");
    expect(selectModelTier(null)).toBe("heavy");
    expect(selectModelTier(undefined)).toBe("heavy");
  });

  it("provides version tags for both tiers", () => {
    expect(getModelVersionTag("lightweight")).toContain("small");
    expect(getModelVersionTag("heavy")).toContain("large");
  });

  it("contains all 8 model classes", () => {
    expect(MODEL_CLASSES).toContain("self_bottle_refill");
    expect(MODEL_CLASSES).toContain("recycle_bags");
    expect(MODEL_CLASSES).toContain("box_cutlery");
    expect(MODEL_CLASSES).toContain("other");
    expect(MODEL_CLASSES.length).toBe(8);
  });

  it("computes numerically stable softmax logits summing to 1", () => {
    const raw = [2.0, 1.0, 0.1, -1.0, 5.0, 0.0, 0.0, 0.0];
    const probs = softmaxLogits(raw);
    expect(probs.length).toBe(raw.length);
    const sum = probs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    expect(probs[4]).toBeGreaterThan(probs[0]);
  });
});

describe("IP Rate Limiting (30 requests/minute)", () => {
  it("enforces sliding window rate limit per IP", async () => {
    resetInMemoryRateLimits();
    const testIp = "192.168.1.100";

    // First 30 requests within a minute should be allowed
    for (let i = 0; i < 30; i++) {
      const res = await checkIpRateLimit(testIp, "test", 30);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(29 - i);
    }

    // 31st request must be rate limited
    const blocked = await checkIpRateLimit(testIp, "test", 30);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);

    // Another IP should still be allowed
    const otherIpRes = await checkIpRateLimit("192.168.1.101", "test", 30);
    expect(otherIpRes.allowed).toBe(true);

    resetInMemoryRateLimits();
  });
});
