export type QualityTier = "high" | "medium" | "low";

export interface HardwareCapabilities {
  hardwareConcurrency: number;
  deviceMemoryGb: number;
  devicePixelRatio: number;
  isMobileOrTablet: boolean;
  prefersReducedMotion: boolean;
  capabilityScore: number;
  initialTier: QualityTier;
}

export interface QualityTierConfig {
  tier: QualityTier;
  dprScale: number;
  maxDpr: number;
  cloudCountScale: number;
  grassStepMultiplier: number;
  starStepMultiplier: number;
  particleDensityScale: number;
  enableOffscreenCloudCache: boolean;
  enableViewportFrustumCulling: boolean;
  enableVolumetricLightRays: boolean;
  enableDetailedWaterCaustics: boolean;
}

export interface GamePerformanceTelemetry {
  deviceCapabilityTier: QualityTier;
  activeQualityTier: QualityTier;
  hardwareConcurrency: number;
  deviceMemoryGb: number;
  fps: number;
  avgFrameMs: number;
  dprScale: number;
  effectiveDpr: number;
  drawCallsEstimate: number;
  culledObjectsCount: number;
  offscreenCacheHits: number;
  tierTransitions: number;
}

declare global {
  interface Window {
    __UNPLASTICA_PERF__?: GamePerformanceTelemetry;
  }
}

export const QUALITY_TIER_CONFIGS: Record<QualityTier, QualityTierConfig> = {
  high: {
    tier: "high",
    dprScale: 1.0,
    maxDpr: 2.0,
    cloudCountScale: 1.0,
    grassStepMultiplier: 1,
    starStepMultiplier: 1,
    particleDensityScale: 1.0,
    enableOffscreenCloudCache: true,
    enableViewportFrustumCulling: true,
    enableVolumetricLightRays: true,
    enableDetailedWaterCaustics: true,
  },
  medium: {
    tier: "medium",
    dprScale: 0.85,
    maxDpr: 1.5,
    cloudCountScale: 0.72,
    grassStepMultiplier: 2,
    starStepMultiplier: 2,
    particleDensityScale: 0.6,
    enableOffscreenCloudCache: true,
    enableViewportFrustumCulling: true,
    enableVolumetricLightRays: true,
    enableDetailedWaterCaustics: false,
  },
  low: {
    tier: "low",
    dprScale: 0.68,
    maxDpr: 1.15,
    cloudCountScale: 0.45,
    grassStepMultiplier: 3,
    starStepMultiplier: 3,
    particleDensityScale: 0.32,
    enableOffscreenCloudCache: true,
    enableViewportFrustumCulling: true,
    enableVolumetricLightRays: false,
    enableDetailedWaterCaustics: false,
  },
};

export function detectHardwareCapabilities(envOverride?: Partial<{
  hardwareConcurrency: number;
  deviceMemory: number;
  devicePixelRatio: number;
  userAgent: string;
  prefersReducedMotion: boolean;
}>): HardwareCapabilities {
  const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { deviceMemory?: number }) : undefined;
  const win = typeof window !== "undefined" ? window : undefined;

  const cores =
    envOverride?.hardwareConcurrency ??
    (nav && typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0
      ? nav.hardwareConcurrency
      : 4);

  const memoryGb =
    envOverride?.deviceMemory ??
    (nav && typeof nav.deviceMemory === "number" && nav.deviceMemory > 0
      ? nav.deviceMemory
      : cores >= 8
        ? 8
        : 4);

  const dpr =
    envOverride?.devicePixelRatio ??
    (win && typeof win.devicePixelRatio === "number" && win.devicePixelRatio > 0
      ? win.devicePixelRatio
      : 1);

  const ua = envOverride?.userAgent ?? (nav?.userAgent || "");
  const isMobileOrTablet = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

  let prefersReducedMotion = envOverride?.prefersReducedMotion ?? false;
  if (envOverride?.prefersReducedMotion === undefined && win && typeof win.matchMedia === "function") {
    try {
      prefersReducedMotion = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      prefersReducedMotion = false;
    }
  }

  let score = 0;
  if (cores >= 8) score += 45;
  else if (cores >= 6) score += 32;
  else if (cores >= 4) score += 22;
  else score += 8;

  if (memoryGb >= 8) score += 40;
  else if (memoryGb >= 4) score += 24;
  else score += 6;

  if (!isMobileOrTablet) score += 15;
  if (prefersReducedMotion) score -= 50;

  let initialTier: QualityTier = "medium";
  if (prefersReducedMotion || cores <= 2 || memoryGb <= 2 || score < 35) {
    initialTier = "low";
  } else if (score >= 70) {
    initialTier = "high";
  } else {
    initialTier = "medium";
  }

  return {
    hardwareConcurrency: cores,
    deviceMemoryGb: memoryGb,
    devicePixelRatio: dpr,
    isMobileOrTablet,
    prefersReducedMotion,
    capabilityScore: score,
    initialTier,
  };
}

export class DynamicQualityController {
  private readonly capabilities: HardwareCapabilities;
  private activeTier: QualityTier;
  private avgFrameMs = 16.67;
  private sampleCount = 0;
  private cooldownFrames = 0;
  private slowStreak = 0;
  private fastStreak = 0;
  private tierTransitions = 0;
  private lastDrawCalls = 0;
  private lastCulledCount = 0;
  private lastCacheHits = 0;

  constructor(envOverride?: Parameters<typeof detectHardwareCapabilities>[0]) {
    this.capabilities = detectHardwareCapabilities(envOverride);
    this.activeTier = this.capabilities.initialTier;
    this.publishTelemetry();
  }

  public getCapabilities(): HardwareCapabilities {
    return this.capabilities;
  }

  public getActiveTier(): QualityTier {
    return this.activeTier;
  }

  public getConfig(): QualityTierConfig {
    return QUALITY_TIER_CONFIGS[this.activeTier];
  }

  public setTierOverride(tier: QualityTier): void {
    if (this.activeTier !== tier) {
      this.activeTier = tier;
      this.tierTransitions += 1;
      this.cooldownFrames = 90;
      this.publishTelemetry();
    }
  }

  public recordFrameStats( stats: {
    frameDeltaMs: number;
    drawCallsEstimate?: number;
    culledObjectsCount?: number;
    offscreenCacheHits?: number;
  }): { tierChanged: boolean; config: QualityTierConfig } {
    const clampedMs = Math.max(4, Math.min(120, stats.frameDeltaMs));
    this.sampleCount += 1;
    this.avgFrameMs = this.sampleCount === 1 ? clampedMs : this.avgFrameMs * 0.9 + clampedMs * 0.1;

    if (typeof stats.drawCallsEstimate === "number") {
      this.lastDrawCalls = stats.drawCallsEstimate;
    }
    if (typeof stats.culledObjectsCount === "number") {
      this.lastCulledCount = stats.culledObjectsCount;
    }
    if (typeof stats.offscreenCacheHits === "number") {
      this.lastCacheHits = stats.offscreenCacheHits;
    }

    let tierChanged = false;

    if (this.cooldownFrames > 0) {
      this.cooldownFrames -= 1;
    } else {
      // Downgrade when rolling average exceeds ~22.5ms (< 44.4 FPS)
      if (this.avgFrameMs > 22.5) {
        this.slowStreak += 1;
        this.fastStreak = 0;
        if (this.slowStreak >= 24) {
          if (this.activeTier === "high") {
            this.activeTier = "medium";
            tierChanged = true;
          } else if (this.activeTier === "medium") {
            this.activeTier = "low";
            tierChanged = true;
          }
          if (tierChanged) {
            this.tierTransitions += 1;
            this.slowStreak = 0;
            this.cooldownFrames = 120;
          }
        }
      } else if (this.avgFrameMs < 17.3 && !this.capabilities.prefersReducedMotion) {
        // Upgrade when rolling average stays smoothly near 60 FPS (< 17.3ms)
        this.fastStreak += 1;
        this.slowStreak = 0;
        if (this.fastStreak >= 150) {
          if (this.activeTier === "low") {
            this.activeTier = "medium";
            tierChanged = true;
          } else if (this.activeTier === "medium" && this.capabilities.capabilityScore >= 55) {
            this.activeTier = "high";
            tierChanged = true;
          }
          if (tierChanged) {
            this.tierTransitions += 1;
            this.fastStreak = 0;
            this.cooldownFrames = 180;
          }
        }
      } else {
        this.slowStreak = Math.max(0, this.slowStreak - 1);
        this.fastStreak = Math.max(0, this.fastStreak - 1);
      }
    }

    this.publishTelemetry();
    return { tierChanged, config: this.getConfig() };
  }

  public getTelemetry(): GamePerformanceTelemetry {
    const cfg = this.getConfig();
    const rawDpr = this.capabilities.devicePixelRatio || 1;
    const effectiveDpr = Number(Math.min(cfg.maxDpr, Math.max(0.65, rawDpr * cfg.dprScale)).toFixed(3));
    const fps = Number(Math.min(60, 1000 / Math.max(16.67, this.avgFrameMs)).toFixed(1));
    return {
      deviceCapabilityTier: this.capabilities.initialTier,
      activeQualityTier: this.activeTier,
      hardwareConcurrency: this.capabilities.hardwareConcurrency,
      deviceMemoryGb: this.capabilities.deviceMemoryGb,
      fps,
      avgFrameMs: Number(this.avgFrameMs.toFixed(2)),
      dprScale: cfg.dprScale,
      effectiveDpr,
      drawCallsEstimate: this.lastDrawCalls,
      culledObjectsCount: this.lastCulledCount,
      offscreenCacheHits: this.lastCacheHits,
      tierTransitions: this.tierTransitions,
    };
  }

  private publishTelemetry(): void {
    if (typeof window !== "undefined") {
      window.__UNPLASTICA_PERF__ = this.getTelemetry();
    }
  }
}

export const globalQualityController = new DynamicQualityController();
