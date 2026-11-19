import type { WeatherType } from '../types';
import { getTerrainFloorY, getWaterSurfaceY, HABITAT_ZONES } from '../worldConfig';
import { seededHash } from './habitatSceneryRenderer';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function renderWeatherScreenOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  weather: WeatherType,
  elapsedSec: number,
  cameraX: number,
  cameraY: number,
  zoom: number,
): void {
  if (weather === 'sunny' || weather === 'cloudy' || weather === 'rainbow') return;

  const waterDatumWorldY = 0.56 * h;
  const seaLevelScreenY = (waterDatumWorldY - h * 0.5 - cameraY) * zoom + h * 0.5;

  // Helper: exact screen-space Y of the water surface or ground contour at screen X.
  // Crucially, surfaceWorldY is clamped to Math.min(waterDatumWorldY, floorWorldY) so rain
  // NEVER crosses below the hydrostatic water surface plane (0.56 * h) anywhere in the world!
  const getSurfaceInfoAtScreenX = (sx: number): { screenY: number; isWater: boolean } => {
    const worldX = cameraX + w * 0.5 + (sx - w * 0.5) / zoom;
    const waterWorldY = getWaterSurfaceY(worldX, h);
    const inRiverOrSeaBasin =
      (worldX >= HABITAT_ZONES[1].xStart && worldX <= HABITAT_ZONES[1].xEnd) ||
      worldX >= HABITAT_ZONES[3].xStart;
    const floorWorldY = getTerrainFloorY(worldX, h);
    const isWater = waterWorldY !== null || inRiverOrSeaBasin || floorWorldY > waterDatumWorldY;
    const surfaceWorldY = Math.min(waterDatumWorldY, floorWorldY);
    const screenY = (surfaceWorldY - h * 0.5 - cameraY) * zoom + h * 0.5;
    return { screenY, isWater };
  };

  // Sample across screen columns to build the exact Air-Above-Surface clipping polygon
  let maxAirBottomY = -9999;
  const stepX = 24;
  const samples: Array<{ sx: number; screenY: number; isWater: boolean }> = [];
  for (let sx = 0; sx <= w + stepX; sx += stepX) {
    const clampedSx = Math.min(w, sx);
    const info = getSurfaceInfoAtScreenX(clampedSx);
    samples.push({ sx: clampedSx, ...info });
    if (info.screenY > maxAirBottomY) maxAirBottomY = info.screenY;
    if (clampedSx === w) break;
  }

  // If the camera is deep underwater (water surface is above top of screen), zero weather is visible!
  if (maxAirBottomY <= 2) {
    return;
  }

  // When diving into the sea/river (cameraY > 8), airborne rain streaks fade out immediately
  // so underwater you ONLY see raindrop ripples and meniscus splashes on the water surface!
  const airStreakVisibility = clamp(1 - (cameraY - 8) / 28, 0, 1);

  if (airStreakVisibility > 0.01) {
    ctx.save();
    // Clip strictly to the air column above the water surface / ground contour (never 1px below!)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    for (let i = samples.length - 1; i >= 0; i--) {
      ctx.lineTo(samples[i].sx, Math.max(0, Math.min(h, samples[i].screenY - 0.5)));
    }
    ctx.closePath();
    ctx.clip();

    if (weather === 'windy') {
      ctx.lineCap = 'round';
      for (let i = 0; i < 18; i++) {
        const depth = (i % 3) / 2;
        const spd = 340 + depth * 220;
        const wx = ((elapsedSec * spd + i * 197) % (w + 320)) - 160;
        const wy = ((i * 67) % Math.max(80, Math.min(h * 0.72, maxAirBottomY - 28))) + 20;
        if (wy >= getSurfaceInfoAtScreenX(wx).screenY - 12) continue;
        const len = 85 + depth * 65;
        const wGrad = ctx.createLinearGradient(wx, wy, wx + len, wy);
        wGrad.addColorStop(0, 'rgba(248, 250, 252, 0)');
        wGrad.addColorStop(0.35, `rgba(241, 245, 249, ${(0.14 + depth * 0.14) * airStreakVisibility})`);
        wGrad.addColorStop(0.7, `rgba(255, 255, 255, ${(0.22 + depth * 0.16) * airStreakVisibility})`);
        wGrad.addColorStop(1, 'rgba(248, 250, 252, 0)');
        ctx.strokeStyle = wGrad;
        ctx.lineWidth = 1.0 + depth * 0.85;
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.bezierCurveTo(
          wx + len * 0.35,
          wy - 7 - (i % 2) * 4,
          wx + len * 0.7,
          wy + 6 + (i % 2) * 4,
          wx + len,
          wy - 2,
        );
        ctx.stroke();
      }
    } else if (weather === 'rain') {
      const clipBottomY = Math.max(1, Math.min(h, maxAirBottomY));

      // 1. Atmospheric rain-curtain mist & slanting precipitation shafts strictly in the sky above water
      const curtainGrad = ctx.createLinearGradient(0, 0, 0, clipBottomY);
      curtainGrad.addColorStop(0, `rgba(148, 163, 184, ${0.14 * airStreakVisibility})`);
      curtainGrad.addColorStop(0.6, `rgba(186, 230, 253, ${0.06 * airStreakVisibility})`);
      curtainGrad.addColorStop(1, `rgba(224, 242, 254, ${0.11 * airStreakVisibility})`);
      ctx.fillStyle = curtainGrad;
      ctx.fillRect(0, 0, w, clipBottomY);

      ctx.lineCap = 'round';
      // Realistic tropical downpour angle (~5 degrees wind shear, not artificial steep laser diagonals)
      const windTilt = -0.088 + Math.sin(elapsedSec * 0.65) * 0.015;

      // 2. 4 Depth Planes of 100% Realistic Optical Raindrop Streaks
      // Every single raindrop is individually clamped at the water surface (`surfY`) so no raindrop
      // ever crosses into the sea or river!
      const layers = [
        { id: 1, count: 64, speedY: 780, speedX: -68, len: 22, width: 0.55, alpha: 0.22 },
        { id: 2, count: 52, speedY: 1020, speedX: -88, len: 32, width: 0.75, alpha: 0.34 },
        { id: 3, count: 38, speedY: 1260, speedX: -110, len: 42, width: 0.95, alpha: 0.46 },
        { id: 4, count: 22, speedY: 1520, speedX: -134, len: 52, width: 1.15, alpha: 0.58 },
      ];

      const spanW = w + 160;
      const spanH = Math.max(140, clipBottomY + 40);

      for (const layer of layers) {
        const effAlpha = layer.alpha * airStreakVisibility;

        // Pass A: Feathered upper motion wake (0% -> 100% of clipped drop)
        ctx.strokeStyle = `rgba(203, 232, 252, ${effAlpha * 0.32})`;
        ctx.lineWidth = layer.width * 0.58;
        ctx.beginPath();
        for (let i = 0; i < layer.count; i++) {
          const h1 = seededHash(i * 19.37 + layer.id * 71.3);
          const h2 = seededHash(i * 43.11 + layer.id * 113.7);
          const h3 = seededHash(i * 79.23 + layer.id * 37.9);
          const dLen = layer.len * (0.78 + h3 * 0.44);
          const spdMul = 0.9 + h3 * 0.2;
          const rx = (((h1 * spanW + elapsedSec * layer.speedX * spdMul) % spanW) + spanW) % spanW - 80;
          const ry = (((h2 * spanH + elapsedSec * layer.speedY * spdMul) % spanH) + spanH) % spanH - 50;
          const surfY = getSurfaceInfoAtScreenX(clamp(rx, 0, w)).screenY - 1;
          if (ry >= surfY - 2) continue;
          const maxT = clamp((surfY - ry) / Math.max(1, dLen), 0, 1);
          const dx = dLen * windTilt * maxT;
          const dy = dLen * maxT;
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx + dx, ry + dy);
        }
        ctx.stroke();

        // Pass B: Translucent mid-body optical refraction (45% -> 100% of clipped drop)
        ctx.strokeStyle = `rgba(226, 242, 254, ${effAlpha * 0.62})`;
        ctx.lineWidth = layer.width * 0.82;
        ctx.beginPath();
        for (let i = 0; i < layer.count; i++) {
          const h1 = seededHash(i * 19.37 + layer.id * 71.3);
          const h2 = seededHash(i * 43.11 + layer.id * 113.7);
          const h3 = seededHash(i * 79.23 + layer.id * 37.9);
          const dLen = layer.len * (0.78 + h3 * 0.44);
          const spdMul = 0.9 + h3 * 0.2;
          const rx = (((h1 * spanW + elapsedSec * layer.speedX * spdMul) % spanW) + spanW) % spanW - 80;
          const ry = (((h2 * spanH + elapsedSec * layer.speedY * spdMul) % spanH) + spanH) % spanH - 50;
          const surfY = getSurfaceInfoAtScreenX(clamp(rx, 0, w)).screenY - 1;
          if (ry + dLen * 0.45 >= surfY - 1) continue;
          const maxT = clamp((surfY - ry) / Math.max(1, dLen), 0.45, 1);
          const dx = dLen * windTilt;
          ctx.moveTo(rx + dx * 0.45, ry + dLen * 0.45);
          ctx.lineTo(rx + dx * maxT, ry + dLen * maxT);
        }
        ctx.stroke();

        // Pass C: Glistening lower raindrop meniscus tip (80% -> 100% of clipped drop)
        ctx.strokeStyle = `rgba(248, 250, 252, ${Math.min(0.88, effAlpha * 0.98)})`;
        ctx.lineWidth = layer.width;
        ctx.beginPath();
        for (let i = 0; i < layer.count; i++) {
          const h1 = seededHash(i * 19.37 + layer.id * 71.3);
          const h2 = seededHash(i * 43.11 + layer.id * 113.7);
          const h3 = seededHash(i * 79.23 + layer.id * 37.9);
          const dLen = layer.len * (0.78 + h3 * 0.44);
          const spdMul = 0.9 + h3 * 0.2;
          const rx = (((h1 * spanW + elapsedSec * layer.speedX * spdMul) % spanW) + spanW) % spanW - 80;
          const ry = (((h2 * spanH + elapsedSec * layer.speedY * spdMul) % spanH) + spanH) % spanH - 50;
          const surfY = getSurfaceInfoAtScreenX(clamp(rx, 0, w)).screenY - 1;
          if (ry + dLen * 0.8 >= surfY - 1) continue;
          const maxT = clamp((surfY - ry) / Math.max(1, dLen), 0.8, 1);
          const dx = dLen * windTilt;
          ctx.moveTo(rx + dx * 0.8, ry + dLen * 0.8);
          ctx.lineTo(rx + dx * maxT, ry + dLen * maxT);
        }
        ctx.stroke();
      }
    } else if (weather === 'fog') {
      for (let band = 0; band < 4; band++) {
        const by = Math.min(maxAirBottomY - 25, h * (0.24 + band * 0.16));
        if (by < -40) continue;
        const driftX = Math.sin(elapsedSec * 0.35 + band * 1.4) * 45;
        const mistGrad = ctx.createLinearGradient(0, by - 65, 0, by + 65);
        mistGrad.addColorStop(0, 'rgba(241, 245, 249, 0)');
        mistGrad.addColorStop(0.5, `rgba(241, 245, 249, ${0.32 * airStreakVisibility})`);
        mistGrad.addColorStop(1, 'rgba(241, 245, 249, 0)');
        ctx.fillStyle = mistGrad;
        ctx.fillRect(-60 + driftX, by - 65, w + 120, 130);
      }
    }

    ctx.restore();
  }

  // 3. Water-Surface Meniscus & Ground Rain Impacts (drawn strictly along the water surface / ground contour!)
  // When diving in the sea, rain is ONLY visible right on the water surface meniscus (`seaLevelScreenY`)!
  if (weather === 'rain' && seaLevelScreenY > 2 && seaLevelScreenY < h - 2) {
    ctx.save();
    // Subtle shimmering rain-pattered surface meniscus sheen when viewing the water surface
    const underwaterViewFactor = clamp((cameraY - 8) / 35, 0, 1);
    if (underwaterViewFactor > 0.02) {
      const menGrad = ctx.createLinearGradient(0, seaLevelScreenY - 6, 0, seaLevelScreenY + 14);
      menGrad.addColorStop(0, `rgba(224, 242, 254, ${0.22 * underwaterViewFactor})`);
      menGrad.addColorStop(0.45, `rgba(186, 230, 253, ${0.34 * underwaterViewFactor})`);
      menGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = menGrad;
      ctx.fillRect(0, seaLevelScreenY - 6, w, 20);
    }

    for (let s = 0; s < 32; s++) {
      const cycle = elapsedSec * 2.5 + s * 0.31;
      const phase = cycle % 1;
      const pulseIdx = Math.floor(cycle);
      const sx = 14 + seededHash(s * 97.3 + pulseIdx * 31.7) * Math.max(60, w - 28);
      const surf = getSurfaceInfoAtScreenX(sx);
      const sy = surf.screenY + (surf.isWater ? (seededHash(s * 13.1) - 0.5) * 2 : (seededHash(s * 17.9) - 0.5) * 4);
      if (sy < 3 || sy > h - 3) continue;

      const fade = (1 - phase) * (1 - phase * 0.35);
      const rx = (surf.isWater ? 4.0 : 2.8) + phase * (surf.isWater ? 19 : 10);
      const ry = rx * (surf.isWater ? 0.19 : 0.24);

      // Outer expanding capillary wave ring on the surface plane
      ctx.strokeStyle = `rgba(226, 242, 254, ${(surf.isWater ? 0.68 : 0.44) * fade})`;
      ctx.lineWidth = surf.isWater ? 1.25 : 1.0;
      ctx.beginPath();
      ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Secondary inner concentric ripple on water surface
      if (surf.isWater && phase > 0.14) {
        const innerRx = rx * 0.5;
        const innerRy = ry * 0.5;
        ctx.strokeStyle = `rgba(248, 250, 252, ${0.48 * fade})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(sx, sy, innerRx, innerRy, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Upward rebounding Worthington crown splash above surface + tiny entrained air bubble just 2-5px under the meniscus
      if (phase < 0.36) {
        const crownT = phase / 0.36;
        const lift = Math.sin(crownT * Math.PI) * (surf.isWater ? 7.5 : 4.5);
        const spread = crownT * (surf.isWater ? 6.0 : 4.0);
        if (airStreakVisibility > 0.05) {
          ctx.fillStyle = `rgba(248, 250, 252, ${0.8 * (1 - crownT) * airStreakVisibility})`;
          ctx.beginPath();
          ctx.arc(sx - spread, sy - lift * 0.85, 1.05, 0, Math.PI * 2);
          ctx.arc(sx, sy - lift * 1.2, 1.25, 0, Math.PI * 2);
          ctx.arc(sx + spread, sy - lift * 0.85, 1.05, 0, Math.PI * 2);
          ctx.fill();
        }
        if (surf.isWater) {
          // Tiny silver dimple / micro-bubble right under the surface meniscus (2..5px below sy)
          const bubbleDepth = 2 + Math.sin(crownT * Math.PI) * 3.5;
          ctx.fillStyle = `rgba(224, 242, 254, ${0.72 * (1 - crownT)})`;
          ctx.beginPath();
          ctx.arc(sx, sy + bubbleDepth, 1.2 * (1 - crownT * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }
}

