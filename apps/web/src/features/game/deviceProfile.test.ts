import { describe, expect, it } from "vitest";
import {
  detectHardwareCapabilities,
  DynamicQualityController,
  QUALITY_TIER_CONFIGS,
} from "../../../../../game/src/engine/deviceProfile";

describe("Hardware Capabilities & Dynamic Quality Detection", () => {
  it("assigns high quality tier to capable desktop hardware", () => {
    const caps = detectHardwareCapabilities({
      hardwareConcurrency: 8,
      deviceMemory: 16,
      devicePixelRatio: 2,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      prefersReducedMotion: false,
    });
    expect(caps.initialTier).toBe("high");
    expect(caps.capabilityScore).toBeGreaterThanOrEqual(70);
  });

  it("assigns medium quality tier to mainstream mobile/laptop hardware", () => {
    const caps = detectHardwareCapabilities({
      hardwareConcurrency: 4,
      deviceMemory: 4,
      devicePixelRatio: 1.5,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
      prefersReducedMotion: false,
    });
    expect(caps.initialTier).toBe("medium");
  });

  it("assigns low quality tier to low-spec hardware or when reduced motion is preferred", () => {
    const lowCaps = detectHardwareCapabilities({
      hardwareConcurrency: 2,
      deviceMemory: 2,
      devicePixelRatio: 1,
      userAgent: "Android Mobile",
      prefersReducedMotion: false,
    });
    expect(lowCaps.initialTier).toBe("low");

    const reducedMotionCaps = detectHardwareCapabilities({
      hardwareConcurrency: 16,
      deviceMemory: 32,
      prefersReducedMotion: true,
    });
    expect(reducedMotionCaps.initialTier).toBe("low");
  });
});

describe("DynamicQualityController runtime adaptation", () => {
  it("provides tier configuration matching active tier", () => {
    const ctrl = new DynamicQualityController({
      hardwareConcurrency: 8,
      deviceMemory: 16,
      devicePixelRatio: 2,
    });
    expect(ctrl.getActiveTier()).toBe("high");
    expect(ctrl.getConfig().dprScale).toBe(QUALITY_TIER_CONFIGS.high.dprScale);
  });

  it("dynamically steps down tier when frames are consistently slow", () => {
    const ctrl = new DynamicQualityController({
      hardwareConcurrency: 8,
      deviceMemory: 16,
      devicePixelRatio: 2,
    });
    expect(ctrl.getActiveTier()).toBe("high");

    // Feed consistently slow frame times (~33 ms = ~30 FPS)
    let transitioned = false;
    for (let f = 0; f < 35; f++) {
      const res = ctrl.recordFrameStats({ frameDeltaMs: 33.3 });
      if (res.tierChanged) {
        transitioned = true;
        break;
      }
    }
    expect(transitioned).toBe(true);
    expect(ctrl.getActiveTier()).toBe("medium");
  });

  it("publishes comprehensive telemetry metrics", () => {
    const ctrl = new DynamicQualityController({
      hardwareConcurrency: 8,
      deviceMemory: 16,
      devicePixelRatio: 1.5,
    });
    ctrl.recordFrameStats({
      frameDeltaMs: 16.6,
      drawCallsEstimate: 24,
      culledObjectsCount: 18,
      offscreenCacheHits: 12,
    });
    const telem = ctrl.getTelemetry();
    expect(telem.activeQualityTier).toBe("high");
    expect(telem.drawCallsEstimate).toBe(24);
    expect(telem.culledObjectsCount).toBe(18);
    expect(telem.offscreenCacheHits).toBe(12);
    expect(telem.fps).toBeGreaterThan(0);
    expect(telem.effectiveDpr).toBeGreaterThan(0);
  });
});
