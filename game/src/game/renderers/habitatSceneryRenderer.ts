import {
  getTerrainFloorY,
  getWaterDepthNorm,
  HABITAT_ZONES,
  SHALLOW_SUNLIT_DEPTH_NORM,
  WORLD_WIDTH,
} from '../worldConfig';
import { drawRoundedRect } from './coinAndEmotionRenderer';

function parseColorRgb(color: string): [number, number, number] {
  const clean = color.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function lerpColor(colorA: string, colorB: string, t: number): string {
  const [r1, g1, b1] = parseColorRgb(colorA);
  const [r2, g2, b2] = parseColorRgb(colorB);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function seededHash(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Renders deterministic natural scenery (25–35% density) for visible 1200px chunks only:
 * - Rainforest: Mossy granite boulders, fallen nurse logs with bracket fungi, fern clumps, canopy vines
 * - River Pond: Submerged river pebbles, cattail reeds, floating duckweed & driftwood
 * - Mudflats: Tidal mud mounds, breathing pneumatophore roots, fiddler crab burrows
 * - Coral Sea: Staghorn & brain coral bommies, sea fans, tube sponges, kelp ribbons
 */
export function renderChunkedNaturalScenery(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  viewportWidth: number,
  viewportHeight: number,
  elapsedSec: number,
  nightFactor: number,
): void {
  const chunkSize = 1100;
  const firstChunk = Math.max(0, Math.floor((cameraX - 300) / chunkSize));
  const lastChunk = Math.min(
    Math.floor(WORLD_WIDTH / chunkSize),
    Math.ceil((cameraX + viewportWidth + 300) / chunkSize),
  );

  for (let c = firstChunk; c <= lastChunk; c++) {
    const chunkStart = c * chunkSize;
    // Place 3 natural props per 1100px chunk (~28% visual coverage, never overcrowded)
    for (let slot = 0; slot < 3; slot++) {
      const h1 = seededHash(c * 31 + slot * 7 + 1);
      const h2 = seededHash(c * 31 + slot * 7 + 2);
      const wx = chunkStart + 140 + slot * 340 + (h1 - 0.5) * 140;
      if (wx < 80 || wx > WORLD_WIDTH - 80) continue;

      const floorY = getTerrainFloorY(wx, viewportHeight);
      const zone =
        HABITAT_ZONES.find((z) => wx >= z.xStart && wx <= z.xEnd) ?? HABITAT_ZONES[0];

      ctx.save();
      ctx.translate(wx, floorY);

      const styleIdx = Math.abs(c * 5 + slot * 3) % 5;

      if (zone.id === 'forest') {
        if (styleIdx === 0) {
          // 1. Mossy Rainforest Granite Boulder & Lichen Patch
          const rw = 34 + h2 * 18;
          const rh = 20 + h1 * 12;
          ctx.fillStyle = nightFactor > 0.5 ? '#3b3f44' : '#7b7d78';
          ctx.strokeStyle = '#2a2c2a';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.ellipse(0, -rh * 0.35, rw, rh, 0, Math.PI, Math.PI * 2);
          ctx.lineTo(rw, 4);
          ctx.lineTo(-rw, 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = nightFactor > 0.5 ? '#34482a' : '#6f8f44';
          ctx.beginPath();
          ctx.ellipse(0, -rh * 0.85, rw * 0.78, rh * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (styleIdx === 1) {
          // 2. Fallen Rainforest Nurse Log with Bracket Shelf Fungi
          ctx.fillStyle = '#5c3a21';
          ctx.strokeStyle = '#2b180b';
          ctx.lineWidth = 2.4;
          drawRoundedRect(ctx, -42, -14, 84, 18, 8);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(-14, -14, 7, Math.PI, 0);
          ctx.arc(16, -12, 6, Math.PI, 0);
          ctx.fill();
        } else if (styleIdx === 2) {
          // 3. Wild Rainforest Undergrowth Fern Rosette
          const sway = Math.sin(elapsedSec * 1.8 + wx * 0.01) * 0.08;
          for (const ang of [-2.4, -1.9, -1.2, -0.7]) {
            ctx.save();
            ctx.rotate(ang + sway);
            ctx.fillStyle = nightFactor > 0.5 ? '#2c4a2a' : '#4f8a3a';
            ctx.strokeStyle = '#1d3318';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(22, 0, 22, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        } else if (styleIdx === 3) {
          // 4. Broad-Leaf Alocasia / Elephant-Ear Forest Floor Clump
          const sway = Math.sin(elapsedSec * 1.5 + wx * 0.015) * 3.5;
          for (const [lx, ly, rot, sc] of [
            [-14, -22, -0.45, 0.85],
            [14, -24, 0.42, 0.9],
            [0, -30, 0.04, 1.05],
          ] as const) {
            ctx.strokeStyle = '#2f5222';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(0, 2);
            ctx.quadraticCurveTo(lx * 0.5, ly * 0.5, lx + sway * 0.5, ly);
            ctx.stroke();
            ctx.save();
            ctx.translate(lx + sway * 0.5, ly);
            ctx.rotate(rot);
            ctx.scale(sc, sc);
            ctx.fillStyle = nightFactor > 0.5 ? '#2e5930' : '#4d8c40';
            ctx.strokeStyle = '#1b3618';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(0, 6);
            ctx.bezierCurveTo(-12, 12, -14, -8, 0, -16);
            ctx.bezierCurveTo(14, -8, 12, 12, 0, 6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        } else {
          // 5. Weathered Buttress Root Stump with Wild Ginger Shoot
          ctx.fillStyle = '#4a2e18';
          ctx.strokeStyle = '#241408';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(-28, 4);
          ctx.quadraticCurveTo(-14, -6, -10, -26);
          ctx.lineTo(10, -24);
          ctx.quadraticCurveTo(15, -6, 30, 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.ellipse(18, -8, 5, 8, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (zone.id === 'river') {
        const sway = Math.sin(elapsedSec * 2.1 + wx * 0.02) * 7;
        if (styleIdx === 0) {
          // 1. Submerged smooth river cobbles & swaying Vallisneria tape-grass
          ctx.fillStyle = '#78716c';
          ctx.strokeStyle = '#292524';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(-14, -4, 16, 8, -0.1, 0, Math.PI * 2);
          ctx.ellipse(12, -3, 13, 7, 0.15, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 3.0;
          ctx.lineCap = 'round';
          for (const ox of [-8, 0, 8]) {
            ctx.beginPath();
            ctx.moveTo(ox, -4);
            ctx.quadraticCurveTo(ox + sway * 0.5, -24, ox + sway, -44 - h2 * 18);
            ctx.stroke();
          }
        } else if (styleIdx === 1) {
          // 2. Submerged Sunken Driftwood Branch & Cryptocoryne Water Trumpet Rosette
          ctx.fillStyle = '#473323';
          ctx.strokeStyle = '#1f140c';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(-34, 2);
          ctx.quadraticCurveTo(-4, -14, 28, -22);
          ctx.lineTo(30, -16);
          ctx.quadraticCurveTo(0, -6, -28, 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          for (const [lx, rot] of [
            [-12, -0.35],
            [-2, 0.05],
            [8, 0.38],
          ] as const) {
            ctx.save();
            ctx.translate(lx, -4);
            ctx.rotate(rot + sway * 0.02);
            ctx.fillStyle = '#15803d';
            ctx.strokeStyle = '#052e16';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.ellipse(0, -14, 4.5, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        } else if (styleIdx === 2) {
          // 3. Layered Slate River Ledge & Java Moss Cushion
          ctx.fillStyle = '#57534e';
          ctx.strokeStyle = '#1c1917';
          ctx.lineWidth = 2.0;
          drawRoundedRect(ctx, -32, -8, 64, 10, 4);
          ctx.fill();
          ctx.stroke();
          drawRoundedRect(ctx, -22, -16, 44, 9, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#166534';
          ctx.beginPath();
          ctx.ellipse(0, -17, 18, 4.5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (styleIdx === 3) {
          // 4. Emergent Horsetail Rush / Scirpus Reed Cluster
          ctx.strokeStyle = '#15803d';
          ctx.lineWidth = 2.4;
          for (const [rx, rh] of [
            [-14, 48],
            [-6, 62],
            [3, 56],
            [11, 44],
          ] as const) {
            ctx.beginPath();
            ctx.moveTo(rx, 0);
            ctx.quadraticCurveTo(rx + sway * 0.3, -rh * 0.5, rx + sway * 0.7, -rh);
            ctx.stroke();
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.ellipse(rx + sway * 0.7, -rh, 2.2, 5.0, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // 5. Smooth Quartz River Boulders & Freshwater Mussel Shells
          ctx.fillStyle = '#a8a29e';
          ctx.strokeStyle = '#44403c';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(-8, -5, 18, 10, -0.08, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#312e81';
          ctx.beginPath();
          ctx.ellipse(16, -2, 7, 4, 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (zone.id === 'mud') {
        if (styleIdx === 0) {
          // 1. Sonneratia / Avicennia Breathing Pneumatophore Root Spikes
          ctx.fillStyle = '#57361c';
          ctx.beginPath();
          ctx.ellipse(0, 0, 28, 9, 0, Math.PI, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#3e2723';
          ctx.lineWidth = 3.0;
          for (const rx of [-18, -9, 2, 11, 20]) {
            const rh = 12 + ((Math.abs(rx * 3) + c) % 14);
            ctx.beginPath();
            ctx.moveTo(rx, 0);
            ctx.lineTo(rx, -rh);
            ctx.stroke();
          }
        } else if (styleIdx === 1) {
          // 2. Mud Lobster (Thalassina) Volcano Mound & Fiddler Crab Pellets
          ctx.fillStyle = '#4a3222';
          ctx.strokeStyle = '#26170e';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(-26, 2);
          ctx.quadraticCurveTo(-14, -22, -6, -24);
          ctx.lineTo(6, -24);
          ctx.quadraticCurveTo(14, -22, 26, 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#1c1008';
          ctx.beginPath();
          ctx.ellipse(0, -24, 5.5, 2.2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (styleIdx === 2) {
          // 3. Bruguiera Knee-Root Arch Loops on Estuarine Silt
          ctx.strokeStyle = '#4e342e';
          ctx.lineWidth = 4.2;
          ctx.lineCap = 'round';
          for (const [kx, kw, kh] of [
            [-18, 12, 18],
            [2, 14, 22],
            [18, 10, 15],
          ] as const) {
            ctx.beginPath();
            ctx.moveTo(kx - kw * 0.5, 2);
            ctx.quadraticCurveTo(kx, -kh, kx + kw * 0.5, 2);
            ctx.stroke();
          }
        } else if (styleIdx === 3) {
          // 4. Driftwood Mangrove Log Encrusted with Estuarine Barnacles
          ctx.fillStyle = '#3e2723';
          ctx.strokeStyle = '#1b0f0a';
          ctx.lineWidth = 2.0;
          drawRoundedRect(ctx, -34, -10, 68, 12, 5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#e7e5e4';
          for (const bx of [-18, -6, 8, 20]) {
            ctx.beginPath();
            ctx.arc(bx, -10, 2.8, Math.PI, 0);
            ctx.fill();
          }
        } else {
          // 5. Brackish Tidal Puddle with Fallen Mangrove Propagule Spears
          ctx.fillStyle = 'rgba(56, 120, 112, 0.48)';
          ctx.strokeStyle = '#3e2723';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, 30, 6.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = '#4d7c0f';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(-8, 1);
          ctx.lineTo(-12, -19);
          ctx.stroke();
        }
      } else if (getWaterDepthNorm(wx) > SHALLOW_SUNLIT_DEPTH_NORM + 0.1) {
        // Deep sea floor: varied volcanic basalt pillows, glass sponge chimneys & abyssal crinoids
        ctx.fillStyle = '#2b3442';
        ctx.strokeStyle = '#151b24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 26 + h1 * 22, 10 + h2 * 8, 0, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (styleIdx === 1 || styleIdx === 3) {
          // Venus flower-basket glass sponge (Euplectella) chimney
          ctx.fillStyle = 'rgba(203, 213, 225, 0.38)';
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
          ctx.lineWidth = 1.4;
          for (const [gx, gh] of styleIdx === 1 ? [[0, 52]] : [[-8, 44], [7, 56]]) {
            ctx.beginPath();
            ctx.moveTo(gx - 6, -6);
            ctx.quadraticCurveTo(gx - 9, -gh * 0.65, gx - 4, -gh);
            ctx.lineTo(gx + 5, -gh);
            ctx.quadraticCurveTo(gx + 10, -gh * 0.65, gx + 6, -6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        } else if (styleIdx === 2) {
          // Deep-sea stalked crinoid (sea lily)
          const sway = Math.sin(elapsedSec * 1.3 + wx * 0.01) * 4;
          ctx.strokeStyle = 'rgba(244, 114, 182, 0.55)';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(0, -6);
          ctx.quadraticCurveTo(sway * 0.5, -26, sway, -44);
          for (let a = -2; a <= 2; a++) {
            ctx.moveTo(sway, -44);
            ctx.quadraticCurveTo(sway + a * 6, -54, sway + a * 10, -60);
          }
          ctx.stroke();
        }
      } else {
        // Shallow sunlit coral reef: 5 distinct reef structures
        const sway = Math.sin(elapsedSec * 1.6 + wx * 0.01) * 4;
        if (styleIdx === 0) {
          // 1. Grooved Diploria Brain Coral Dome
          ctx.fillStyle = '#c49a6c';
          ctx.strokeStyle = '#6e5236';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, 22 + h1 * 10, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = 'rgba(110, 82, 54, 0.55)';
          ctx.lineWidth = 1.4;
          for (const r of [8, 15]) {
            ctx.beginPath();
            ctx.arc(0, 0, r, Math.PI * 1.15, Math.PI * 1.85);
            ctx.stroke();
          }
        } else if (styleIdx === 1) {
          // 2. Branching Acropora Staghorn Coral Colony
          ctx.lineCap = 'round';
          ctx.lineWidth = 5.2;
          ctx.strokeStyle = '#a0789f';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(sway * 0.5, -22, sway, -42);
          ctx.moveTo(sway * 0.3, -14);
          ctx.lineTo(-16 + sway, -34);
          ctx.moveTo(sway * 0.4, -18);
          ctx.lineTo(18 + sway, -36);
          ctx.stroke();
        } else if (styleIdx === 2) {
          // 3. Tiered Acropora Table Coral Plate
          ctx.fillStyle = '#8b9d77';
          ctx.strokeStyle = '#3f4d32';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(-6, 0);
          ctx.lineTo(-3, -18);
          ctx.lineTo(4, -18);
          ctx.lineTo(6, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(0, -18, 28, 6.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(6, -26, 20, 5.0, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (styleIdx === 3) {
          // 4. Clustered Barrel Sponge (Xestospongia) Chimneys
          for (const [bx, bw, bh, col] of [
            [-9, 7, 26, '#c98b7c'],
            [7, 6, 20, '#b56e5e'],
          ] as const) {
            ctx.fillStyle = col;
            ctx.strokeStyle = '#5c2d24';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(bx - bw, 0);
            ctx.quadraticCurveTo(bx - bw * 1.15, -bh * 0.5, bx - bw * 0.9, -bh);
            ctx.lineTo(bx + bw * 0.9, -bh);
            ctx.quadraticCurveTo(bx + bw * 1.15, -bh * 0.5, bx + bw, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#2d1510';
            ctx.beginPath();
            ctx.ellipse(bx, -bh, bw * 0.85, 2.4, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // 5. Lacy Gorgonian Sea Fan & Coralline Limestone Outcrop
          ctx.fillStyle = '#78716c';
          ctx.beginPath();
          ctx.ellipse(0, 0, 18, 6, 0, Math.PI, 0);
          ctx.fill();
          ctx.strokeStyle = '#d97757';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          for (const ang of [-0.5, -0.25, 0, 0.25, 0.5]) {
            ctx.moveTo(0, -4);
            ctx.quadraticCurveTo(Math.sin(ang) * 18 + sway * 0.5, -22, Math.sin(ang) * 28 + sway, -38 + Math.abs(ang) * 10);
          }
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }
}

/**
 * Intertidal Mangrove Tide Dynamics (Resolving Open Item O10):
 * Simulates the real semi-diurnal / lunar ebb and flow of brackish estuarine tides across
 * the Matang / coastal mudflats (Zone 3).
 * - High tide: Rising brackish estuarine water laps over the lower mud bank and between stilt roots.
 * - Ebb tide: Receding water exposes glistening wet organic mudflats, shallow tidal pools, and wet specular ribbons.
 */
export function renderIntertidalMangroveTide(
  ctx: CanvasRenderingContext2D,
  zStart: number,
  zEnd: number,
  viewportHeight: number,
  elapsedSec: number,
  nightFactor: number,
): void {
  // Tide oscillation: smooth sine curve 0 (low tide) to 1 (high tide)
  const tideCycle = (Math.sin(elapsedSec * 0.045) + 1) * 0.5;
  const mudFloorY = viewportHeight * 0.545;
  const tideWaterY = mudFloorY - 2 + (1 - tideCycle) * 12;

  const step = 28;
  const startX = Math.floor(zStart / step) * step;
  const endX = Math.ceil(zEnd / step) * step;

  // 1. Glistening wet mud gloss & tidal ribbons on the exposed mud flat
  const wetSheenAlpha = (0.16 + (1 - tideCycle) * 0.22) * (1 - nightFactor * 0.4);
  ctx.save();
  ctx.strokeStyle = nightFactor > 0.5 ? `rgba(148, 163, 184, ${wetSheenAlpha * 0.6})` : `rgba(254, 240, 138, ${wetSheenAlpha})`;
  ctx.lineWidth = 2.4;
  for (let wx = startX; wx < endX; wx += 64) {
    const fy = getTerrainFloorY(wx, viewportHeight);
    const waveSheen = Math.sin(wx * 0.015 + elapsedSec * 0.8) * 18;
    ctx.beginPath();
    ctx.moveTo(wx - 16 + waveSheen, fy - 1);
    ctx.lineTo(wx + 22 + waveSheen, fy - 1);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Rising / ebbing brackish estuarine tidal water sheet
  if (tideCycle > 0.18) {
    const waterAlpha = (tideCycle - 0.18) / 0.82;
    ctx.save();
    const tideGrad = ctx.createLinearGradient(0, tideWaterY, 0, mudFloorY + 28);
    const topCol = nightFactor > 0.5
      ? `rgba(22, 45, 36, ${0.45 * waterAlpha})`
      : `rgba(88, 122, 92, ${0.48 * waterAlpha})`;
    const botCol = nightFactor > 0.5
      ? `rgba(14, 28, 22, ${0.72 * waterAlpha})`
      : `rgba(54, 76, 50, ${0.68 * waterAlpha})`;
    tideGrad.addColorStop(0, topCol);
    tideGrad.addColorStop(1, botCol);
    ctx.fillStyle = tideGrad;

    // Build flooded polygon between tide water line and terrain floor
    ctx.beginPath();
    let hasFlooded = false;
    for (let wx = startX; wx <= endX; wx += step) {
      const fy = getTerrainFloorY(wx, viewportHeight);
      if (fy > tideWaterY) {
        if (!hasFlooded) {
          ctx.moveTo(wx, tideWaterY);
          hasFlooded = true;
        }
        ctx.lineTo(wx, fy);
      } else if (hasFlooded) {
        ctx.lineTo(wx, tideWaterY);
      }
    }
    if (hasFlooded) {
      ctx.lineTo(endX, tideWaterY);
      ctx.closePath();
      ctx.fill();
    }

    // Gentle lapping estuarine wavelets and froth line along the water's edge
    ctx.strokeStyle = nightFactor > 0.5 ? 'rgba(186, 230, 253, 0.32)' : 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = 1.6;
    for (let wx = startX; wx < endX; wx += 80) {
      const fy = getTerrainFloorY(wx, viewportHeight);
      if (fy > tideWaterY - 4) {
        const lapX = Math.sin(elapsedSec * 2.2 + wx * 0.03) * 6;
        ctx.beginPath();
        ctx.moveTo(wx + lapX, tideWaterY + 1);
        ctx.lineTo(wx + 34 + lapX, tideWaterY + 1);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 3. At low tide (tideCycle <= 0.65), shallow glistening tide pools trapped in mud hollows
  if (tideCycle < 0.65) {
    const poolAlpha = ((0.65 - tideCycle) / 0.65) * 0.55;
    ctx.save();
    for (let wx = startX + 32; wx < endX - 32; wx += 140) {
      const fy = getTerrainFloorY(wx, viewportHeight);
      const h = seededHash(wx * 0.07);
      if (h > 0.45) {
        const pw = 24 + h * 20;
        const ph = 5 + h * 3;
        ctx.fillStyle = nightFactor > 0.5
          ? `rgba(30, 58, 62, ${poolAlpha})`
          : `rgba(125, 175, 160, ${poolAlpha * 0.8})`;
        ctx.strokeStyle = `rgba(38, 26, 15, ${poolAlpha * 0.9})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(wx, fy + 1, pw, ph, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Tiny sky specular glint in pool center
        ctx.fillStyle = nightFactor > 0.5
          ? `rgba(226, 232, 240, ${poolAlpha * 0.7})`
          : `rgba(255, 255, 255, ${poolAlpha * 0.85})`;
        ctx.beginPath();
        ctx.ellipse(wx - 4, fy + 0.5, pw * 0.28, ph * 0.3, -0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

/**
 * Dynamic reef life and mangrove regeneration.
 * - Sunlit sea floor: large branching staghorn / elkhorn colonies, giant brain & plate corals,
 *   tall gorgonian sea fans, soft leather corals, giant clams and colourful sea stars, all gently
 *   swaying with the current (polyps breathe, fans flex).
 * - Mudflats: Rhizophora propagule seedlings at different growth stages, Avicennia saplings,
 *   Nipa / fern sprouts and drifting fallen mangrove leaves that rustle with the tide.
 * Deterministic per world-x so the scene is stable but every patch looks different.
 */
export function renderDynamicReefAndMangroveLife(
  ctx: CanvasRenderingContext2D,
  visStartX: number,
  visEndX: number,
  viewportHeight: number,
  elapsedSec: number,
  nightFactor: number,
): void {
  const seaZone = HABITAT_ZONES.find((z) => z.id === 'sea');
  const mudZone = HABITAT_ZONES.find((z) => z.id === 'mud');
  const dim = (c: string) => lerpColor(c, '#0b1726', nightFactor * 0.45);

  // ---------------- SEA: big corals & sea stars ----------------
  if (seaZone) {
    const spacing = 230;
    const start = Math.max(seaZone.xStart + 160, Math.floor(visStartX / spacing) * spacing);
    const end = Math.min(seaZone.xEnd - 60, visEndX);
    for (let base = start; base <= end; base += spacing) {
      const h1 = seededHash(base * 0.0137 + 3.1);
      const h2 = seededHash(base * 0.0291 + 7.7);
      const h3 = seededHash(base * 0.0419 + 1.9);
      const wx = base + (h1 - 0.5) * 120;
      if (wx < seaZone.xStart + 140 || wx > seaZone.xEnd - 40) continue;
      const depth = getWaterDepthNorm(wx);
      const isDeep = depth > SHALLOW_SUNLIT_DEPTH_NORM + 0.25;
      const fy = getTerrainFloorY(wx, viewportHeight);
      const current = Math.sin(elapsedSec * 0.9 + wx * 0.006);
      const kind = Math.floor(h2 * 6);
      const size = (isDeep ? 0.75 : 1.0) * (1.05 + h3 * 0.75);

      ctx.save();
      ctx.translate(wx, fy + 2);
      ctx.scale(size, size);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      if (isDeep) {
        // Deep cold-water: tall pale sea whip + bamboo coral (no zooxanthellae colour)
        ctx.strokeStyle = dim('#e2e8f0');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(current * 4, -40, current * 10, -80, current * 16, -118);
        ctx.stroke();
        ctx.fillStyle = dim('#fda4af');
        for (let k = 1; k < 9; k++) {
          const t = k / 9;
          ctx.beginPath();
          ctx.arc(current * 16 * t * t, -118 * t, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (kind === 0) {
        // Large branching staghorn (Acropora) colony – every branch grows from a parent branch
        const col = dim(['#c084fc', '#f0abfc', '#93c5fd'][Math.floor(h1 * 3)]);
        const tip = dim('#fdf4ff');
        const drawBranch = (x: number, y: number, ang: number, len: number, w: number, depthLv: number): void => {
          const bend = current * 0.05 * (4 - depthLv);
          const ex = x + Math.cos(ang + bend) * len;
          const ey = y + Math.sin(ang + bend) * len;
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo((x + ex) / 2 + bend * 10, (y + ey) / 2, ex, ey);
          ctx.stroke();
          if (depthLv >= 3 || len < 10) {
            ctx.fillStyle = tip;
            ctx.beginPath();
            ctx.arc(ex, ey, w * 0.55, 0, Math.PI * 2);
            ctx.fill();
            return;
          }
          drawBranch(ex, ey, ang - 0.45, len * 0.72, w * 0.72, depthLv + 1);
          drawBranch(ex, ey, ang + 0.42, len * 0.68, w * 0.72, depthLv + 1);
        };
        drawBranch(0, 0, -Math.PI / 2, 34, 9, 0);
        drawBranch(-6, 0, -Math.PI / 2 - 0.6, 26, 7, 1);
        drawBranch(6, 0, -Math.PI / 2 + 0.6, 26, 7, 1);
      } else if (kind === 1) {
        // Giant brain coral boulder with meandering grooves
        const r = 44;
        const g = ctx.createRadialGradient(-12, -r * 0.7, 6, 0, -r * 0.3, r * 1.1);
        g.addColorStop(0, dim('#fde68a'));
        g.addColorStop(0.6, dim('#d9a35f'));
        g.addColorStop(1, dim('#8a5a2b'));
        ctx.fillStyle = g;
        ctx.strokeStyle = dim('#5b3a1a');
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.55, r * 1.15, r * 0.75, 0, Math.PI, Math.PI * 2);
        ctx.lineTo(r * 1.15, 0);
        ctx.lineTo(-r * 1.15, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = 'rgba(91, 58, 26, 0.55)';
        ctx.lineWidth = 2;
        for (let row = 0; row < 6; row++) {
          ctx.beginPath();
          const yy = -r * 1.2 + row * 11;
          for (let xx = -r * 1.2; xx <= r * 1.2; xx += 6) {
            const wob = Math.sin(xx * 0.18 + row * 1.7) * 4;
            if (xx === -r * 1.2) ctx.moveTo(xx, yy + wob);
            else ctx.lineTo(xx, yy + wob);
          }
          ctx.stroke();
        }
        ctx.restore();
      } else if (kind === 2) {
        // Tall gorgonian sea fan: a mesh of branches all joined to one holdfast stalk
        const fanCol = dim(['#f97316', '#ef4444', '#facc15'][Math.floor(h3 * 3)]);
        ctx.strokeStyle = fanCol;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(current * 2, -14);
        ctx.stroke();
        ctx.lineWidth = 1.6;
        const rays = 9;
        const tips: Array<[number, number]> = [];
        for (let i = 0; i < rays; i++) {
          const a = -Math.PI / 2 + (i / (rays - 1) - 0.5) * 1.5;
          const tx = Math.cos(a) * 80 + current * 9;
          const ty = -14 + Math.sin(a) * 80;
          tips.push([tx, ty]);
          ctx.beginPath();
          ctx.moveTo(current * 2, -14);
          ctx.quadraticCurveTo(tx * 0.5, (ty - 14) * 0.5 - 6, tx, ty);
          ctx.stroke();
        }
        // Cross-linking mesh (anastomosing branches)
        ctx.globalAlpha = 0.7;
        for (const t of [0.4, 0.6, 0.8]) {
          ctx.beginPath();
          tips.forEach(([tx, ty], i) => {
            const px = current * 2 + (tx - current * 2) * t;
            const py = -14 + (ty + 14) * t;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (kind === 3) {
        // Tiered table / plate corals stacked on a short trunk
        ctx.fillStyle = dim('#86a873');
        ctx.strokeStyle = dim('#3f5a32');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(-5, -26);
        ctx.lineTo(5, -26);
        ctx.lineTo(7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        for (const [py, rx, off] of [
          [-26, 58, 0],
          [-42, 42, 8],
          [-55, 26, -4],
        ] as const) {
          ctx.fillStyle = dim('#a3c48f');
          ctx.beginPath();
          ctx.ellipse(off + current * 1.5, py, rx, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = 'rgba(63, 90, 50, 0.4)';
          ctx.beginPath();
          ctx.ellipse(off + current * 1.5, py - 1, rx * 0.6, 4, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = dim('#3f5a32');
          if (py !== -55) {
            ctx.beginPath();
            ctx.moveTo(off - 3, py);
            ctx.lineTo(off - 3, py - 16);
            ctx.moveTo(off + 3, py);
            ctx.lineTo(off + 3, py - 16);
            ctx.stroke();
          }
        }
      } else if (kind === 4) {
        // Soft leather coral with breathing polyps + giant clam at its foot
        const breathe = 1 + Math.sin(elapsedSec * 1.4 + wx) * 0.06;
        ctx.fillStyle = dim('#d6c7a1');
        ctx.strokeStyle = dim('#7a6a43');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.quadraticCurveTo(-12, -26, -36 * breathe, -46);
        ctx.quadraticCurveTo(0, -64 * breathe, 36 * breathe, -46);
        ctx.quadraticCurveTo(12, -26, 10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = dim('#fef9c3');
        for (let p = 0; p < 14; p++) {
          const px = -30 + p * 4.6;
          const py = -48 - Math.sin((p / 13) * Math.PI) * 10 * breathe;
          ctx.beginPath();
          ctx.arc(px, py, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        // Giant clam (Tridacna) with wavy blue mantle
        ctx.save();
        ctx.translate(30, 0);
        ctx.fillStyle = dim('#e7e5e4');
        ctx.strokeStyle = dim('#78716c');
        ctx.beginPath();
        ctx.ellipse(0, -6, 20, 9, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = dim('#2563eb');
        ctx.beginPath();
        for (let x = -16; x <= 16; x += 4) {
          ctx.lineTo(x, -8 - (x % 8 === 0 ? 3 : 0));
        }
        ctx.lineTo(16, -4);
        ctx.lineTo(-16, -4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        // Elkhorn coral: broad flattened antler-like branches
        ctx.fillStyle = dim('#d4a373');
        ctx.strokeStyle = dim('#7c5530');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.quadraticCurveTo(-10, -20, -34 + current * 3, -40);
        ctx.lineTo(-44 + current * 3, -58);
        ctx.lineTo(-30 + current * 3, -50);
        ctx.lineTo(-20 + current * 3, -66);
        ctx.lineTo(-14 + current * 2, -44);
        ctx.quadraticCurveTo(0, -36, 14 + current * 2, -48);
        ctx.lineTo(22 + current * 3, -70);
        ctx.lineTo(30 + current * 3, -52);
        ctx.lineTo(46 + current * 3, -60);
        ctx.lineTo(34 + current * 3, -38);
        ctx.quadraticCurveTo(12, -18, 8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Sea stars & a cushion star scattered on the sand around each coral
      if (!isDeep) {
        const starCount = 1 + Math.floor(h3 * 3);
        for (let s = 0; s < starCount; s++) {
          const sx = (s - (starCount - 1) / 2) * 34 + (h1 - 0.5) * 20 + 50;
          const starCol = dim(['#f97316', '#dc2626', '#2563eb', '#a855f7', '#facc15'][Math.floor(seededHash(wx + s * 9.1) * 5)]);
          const rot = seededHash(wx * 0.3 + s) * Math.PI + Math.sin(elapsedSec * 0.15 + s) * 0.05;
          ctx.save();
          ctx.translate(sx, -3);
          ctx.scale(1, 0.55);
          ctx.rotate(rot);
          ctx.fillStyle = starCol;
          ctx.strokeStyle = 'rgba(30, 20, 10, 0.55)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let k = 0; k < 10; k++) {
            const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
            const rr = k % 2 === 0 ? 13 : 5;
            if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
            else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * 7, Math.sin(a) * 7, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }

  // ---------------- MUD: mangrove shoots, saplings & fallen leaves ----------------
  if (mudZone) {
    const spacing = 120;
    const start = Math.max(mudZone.xStart + 50, Math.floor(visStartX / spacing) * spacing);
    const end = Math.min(mudZone.xEnd - 50, visEndX);
    const breeze = Math.sin(elapsedSec * 1.3);
    for (let base = start; base <= end; base += spacing) {
      const h1 = seededHash(base * 0.0173 + 5.3);
      const h2 = seededHash(base * 0.0377 + 2.2);
      const wx = base + (h1 - 0.5) * 70;
      if (wx < mudZone.xStart + 40 || wx > mudZone.xEnd - 40) continue;
      const fy = getTerrainFloorY(wx, viewportHeight);
      const sway = Math.sin(elapsedSec * 1.6 + wx * 0.03) * 0.06;
      const kind = Math.floor(h2 * 4);
      ctx.save();
      ctx.translate(wx, fy + 1);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (kind === 0) {
        // Rhizophora propagule: green spear stuck in the mud, first leaf pair sprouting from its top
        const hgt = 30 + h1 * 22;
        ctx.rotate(sway);
        ctx.strokeStyle = dim('#4d7c0f');
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(0, -hgt);
        ctx.stroke();
        ctx.strokeStyle = dim('#7c2d12');
        ctx.lineWidth = 4.6;
        ctx.beginPath();
        ctx.moveTo(0, -hgt);
        ctx.lineTo(0, -hgt - 4);
        ctx.stroke();
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.translate(0, -hgt - 4);
          ctx.rotate(side * (0.75 + breeze * 0.06));
          ctx.fillStyle = dim('#65a30d');
          ctx.strokeStyle = dim('#365314');
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(side * 4, -7, 0, -15);
          ctx.quadraticCurveTo(-side * 4, -7, 0, 0);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        // tiny anchoring roots
        ctx.strokeStyle = dim('#3f2a17');
        ctx.lineWidth = 1.2;
        for (const rx of [-5, -2, 3, 6]) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(rx, 2, rx * 1.4, 5);
          ctx.stroke();
        }
      } else if (kind === 1) {
        // Young Rhizophora sapling with arching prop roots and opposite leaf pairs
        const hgt = 56 + h1 * 26;
        ctx.strokeStyle = dim('#5b3a1e');
        ctx.lineWidth = 2;
        for (const rx of [-16, -8, 9, 17]) {
          ctx.beginPath();
          ctx.moveTo(0, -18);
          ctx.quadraticCurveTo(rx * 0.6, -16, rx, 2);
          ctx.stroke();
        }
        ctx.save();
        ctx.rotate(sway);
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -hgt);
        ctx.stroke();
        for (let n = 0; n < 4; n++) {
          const ny = -hgt * (0.45 + n * 0.17);
          for (const side of [-1, 1]) {
            ctx.strokeStyle = dim('#5b3a1e');
            ctx.lineWidth = 1.3;
            const lx = side * 7;
            ctx.beginPath();
            ctx.moveTo(0, ny);
            ctx.lineTo(lx, ny - 3);
            ctx.stroke();
            ctx.save();
            ctx.translate(lx, ny - 3);
            ctx.rotate(side * (1.0 + breeze * 0.08) - Math.PI / 2 * 0);
            ctx.fillStyle = dim(n % 2 ? '#3f7d20' : '#4d8f2a');
            ctx.strokeStyle = dim('#1f3d10');
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(side * 7, -2, 9, 4, side * -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }
        ctx.restore();
      } else if (kind === 2) {
        // Avicennia seedlings + pencil pneumatophores around them
        ctx.strokeStyle = dim('#6b4a2b');
        ctx.lineWidth = 2.4;
        for (const px of [-22, -14, 15, 24, 31]) {
          ctx.beginPath();
          ctx.moveTo(px, 1);
          ctx.lineTo(px + 0.5, -8 - seededHash(px + wx) * 8);
          ctx.stroke();
        }
        for (const ox of [-4, 6]) {
          ctx.save();
          ctx.translate(ox, 0);
          ctx.rotate(sway * 1.4);
          ctx.strokeStyle = dim('#78a045');
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -20);
          ctx.stroke();
          for (const side of [-1, 1]) {
            ctx.fillStyle = dim('#8fb35a');
            ctx.beginPath();
            ctx.ellipse(side * 5, -20, 6, 2.6, side * -0.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      } else {
        // Mangrove fern (Acrostichum) sprout – pinnate fronds rising from one crown
        for (const ang of [-1.05, -0.55, -0.1, 0.4, 0.9]) {
          ctx.save();
          ctx.rotate(ang * 0.6 + sway + breeze * 0.03);
          ctx.strokeStyle = dim('#4d7c0f');
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(4, -18, 2, -34);
          ctx.stroke();
          ctx.fillStyle = dim('#65a30d');
          for (let k = 1; k < 6; k++) {
            const py = -k * 6;
            ctx.beginPath();
            ctx.ellipse(-3.5, py, 4, 1.8, 0.4, 0, Math.PI * 2);
            ctx.ellipse(5.5, py, 4, 1.8, -0.4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      // Fallen mangrove leaves (green, yellow, brown) that drift slightly with the tide
      const leafCount = 2 + Math.floor(h1 * 3);
      for (let l = 0; l < leafCount; l++) {
        const lh = seededHash(wx * 0.11 + l * 3.7);
        const lx = (lh - 0.5) * 80 + Math.sin(elapsedSec * 0.7 + l + wx) * 2.5;
        ctx.save();
        ctx.translate(lx, 0);
        ctx.scale(1, 0.45);
        ctx.rotate(lh * Math.PI * 2);
        ctx.fillStyle = dim(['#a3a832', '#d4a017', '#8b5a2b', '#5f8a2a'][Math.floor(lh * 4)]);
        ctx.strokeStyle = 'rgba(40, 25, 10, 0.5)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(7, 0);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }
}

