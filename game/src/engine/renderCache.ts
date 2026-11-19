export interface FrameRenderCounters {
  drawCallsEstimate: number;
  culledObjectsCount: number;
  offscreenCacheHits: number;
}

class FramePerformanceTracker {
  public counters: FrameRenderCounters = {
    drawCallsEstimate: 0,
    culledObjectsCount: 0,
    offscreenCacheHits: 0,
  };

  public beginFrame(): void {
    this.counters.drawCallsEstimate = 0;
    this.counters.culledObjectsCount = 0;
    this.counters.offscreenCacheHits = 0;
  }

  public addDrawCalls(count = 1): void {
    this.counters.drawCallsEstimate += count;
  }

  public addCulled(count = 1): void {
    this.counters.culledObjectsCount += count;
  }

  public addCacheHit(count = 1): void {
    this.counters.offscreenCacheHits += count;
  }
}

export const framePerfTracker = new FramePerformanceTracker();

/**
 * Checks whether a vertical world Y range [yMin, yMax] overlaps the active camera viewport.
 */
export function isVerticalBandVisible(
  yMin: number,
  yMax: number,
  cameraY: number,
  viewHeight: number,
  margin = 160,
): boolean {
  const top = cameraY - margin;
  const bottom = cameraY + viewHeight + margin;
  return yMax >= top && yMin <= bottom;
}

/**
 * Checks whether a 2D point (worldX, worldY) with radius/margin is visible in the current camera frustum.
 */
export function isEntityVisibleInFrustum(
  worldX: number,
  worldY: number,
  cameraX: number,
  cameraY: number,
  viewWidth: number,
  viewHeight: number,
  marginX = 180,
  marginY = 180,
): boolean {
  if (worldX + marginX < cameraX || worldX - marginX > cameraX + viewWidth) {
    return false;
  }
  if (worldY + marginY < cameraY || worldY - marginY > cameraY + viewHeight) {
    return false;
  }
  return true;
}

const cloudCanvasCache = new Map<string, HTMLCanvasElement>();
const MAX_CLOUD_CACHE_ENTRIES = 64;

export function getOrRenderCachedCloud(
  key: string,
  canvasWidth: number,
  canvasHeight: number,
  renderFn: (offCtx: CanvasRenderingContext2D, originX: number, originY: number) => void,
  originX: number,
  originY: number,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  const existing = cloudCanvasCache.get(key);
  if (existing) {
    framePerfTracker.addCacheHit(1);
    return existing;
  }

  if (cloudCanvasCache.size >= MAX_CLOUD_CACHE_ENTRIES) {
    const oldestKey = cloudCanvasCache.keys().next().value;
    if (oldestKey !== undefined) {
      cloudCanvasCache.delete(oldestKey);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(16, Math.ceil(canvasWidth));
  canvas.height = Math.max(16, Math.ceil(canvasHeight));
  const offCtx = canvas.getContext("2d");
  if (!offCtx) {
    return null;
  }

  renderFn(offCtx, originX, originY);
  cloudCanvasCache.set(key, canvas);
  return canvas;
}

export function clearCloudRenderCache(): void {
  cloudCanvasCache.clear();
}
