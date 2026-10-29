import type { TurtlePose } from '../turtle/types';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Active 3D orbit/tilt & growth state updated per frame in renderPlantRig
let activePlant3DYaw = 0;
let activePlant3DPitch = 0;
let activePlantGrowthStage: 1 | 2 | 3 = 3;
let activePlantFruitCount = 3;
let activePlantAssetId = '';

/**
 * 3-Round Botanical Realism & 70% Realistic / 30% Cuteness Critique Registry
 * Grounded in Southeast Asian / Malaysian botanical morphology (MyBIS, Flora Malesiana, SeagrassWatch).
 */
export const PLANT_THREE_ROUND_CRITIQUE = [
  {
    round: 1,
    focus: 'Individual Leaf Morphology, Species-Specific Venation & 70/30 Grass Realism',
    critiques: [
      'Critique 1.1 (Leaf Venation & Drip Tips): Tropical rainforest leaves lacked swollen petiole pulvini, acuminate drip-tips (acumen), and brochidodromous looping marginal veins.',
      'Critique 1.2 (Canopy Depth Without Clumps): Tree crowns needed a shaded inner under-canopy tier of individual leaves behind the forked twigs so 100% of foliage is composed of distinct individual leaves.',
      'Critique 1.3 (70% Realistic / 30% Cute Grass & Seagrass): Seagrass and terrestrial grass blades lacked basal clasping leaf sheaths, Enhalus rhizome black fibers, and Thalassia parallel + transverse lacunae cross-venation.',
    ],
  },
  {
    round: 2,
    focus: 'Hardwood Bark Fissures, Buttress Flutes, Floral Anatomy & Fruit Pericarp Textures',
    critiques: [
      'Critique 2.1 (Bark & Root Architecture): Trunks needed longitudinal cambium fissures, horizontal lenticel rings, and epiphytic moss cushions in branch crotches.',
      'Critique 2.2 (Floral Stamens & Nectar Guides): Blossoms needed subtending green calyx sepals, radiating nectar-guide venation, and bilobed pollen-dusted anthers.',
      'Critique 2.3 (Fruit Micro-Textures): Durian thorns, Rambutan spinterns, Mangosteen stigma lobes, and Rafflesia perigone warts needed sharper specular and ambient-occlusion contrast.',
    ],
  },
  {
    round: 3,
    focus: 'Forest-Floor Grass Tuft Plinths, Fern Sori & Variable-Weight Botanical Lining',
    critiques: [
      'Critique 3.1 (70/30 Ground Grass Blades on Terrestrial Plinths): Added individual tapered grass blades with sheaths, midribs, and dew sheen around terrestrial plant bases.',
      'Critique 3.2 (Fern Rachis Paleae & Spore Sori): Added golden-brown stipe scales and underside sori dots to rainforest fern fronds.',
      'Critique 3.3 (Variable-Weight Lining): Added shaded lower-margin contour thickening and upper cuticle rim illumination across all leaves and stems.',
    ],
  },
] as const;

/**
 * Draws a single 70%-realistic / 30%-cute botanical grass blade with a basal clasping sheath,
 * tapered acuminate tip, central raised midrib, parallel lateral nerves, and dewy specular sheen.
 */
export function drawRealisticGrassBlade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  baseWidth: number,
  bendX: number,
  cLight: string,
  cMid: string,
  cDark: string,
  outline = '#122612',
): void {
  ctx.save();
  ctx.translate(x, y);

  // 1. Basal clasping leaf sheath (coleoptile wrap) at root collar
  const sheathH = Math.min(10, height * 0.22);
  ctx.fillStyle = cDark;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-baseWidth * 0.65, 2);
  ctx.lineTo(-baseWidth * 0.55, -sheathH);
  ctx.quadraticCurveTo(0, -sheathH - 2, baseWidth * 0.55, -sheathH);
  ctx.lineTo(baseWidth * 0.65, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Gracefully arched monocot lamina blade
  const blade = new Path2D();
  blade.moveTo(-baseWidth * 0.5, 0);
  blade.bezierCurveTo(
    -baseWidth * 0.42 + bendX * 0.28,
    -height * 0.45,
    bendX * 0.68 - baseWidth * 0.18,
    -height * 0.82,
    bendX,
    -height,
  );
  blade.bezierCurveTo(
    bendX * 0.68 + baseWidth * 0.22,
    -height * 0.80,
    baseWidth * 0.42 + bendX * 0.28,
    -height * 0.42,
    baseWidth * 0.5,
    0,
  );
  blade.closePath();

  const g = ctx.createLinearGradient(0, -height, 0, 0);
  g.addColorStop(0, cLight);
  g.addColorStop(0.55, cMid);
  g.addColorStop(1, cDark);
  ctx.fillStyle = g;
  ctx.fill(blade);

  // 3. Central vascular midrib & sunlit cuticle edge (70% botanical realism + 30% crisp charm)
  ctx.strokeStyle = 'rgba(236, 253, 245, 0.58)';
  ctx.lineWidth = Math.max(0.9, baseWidth * 0.16);
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.quadraticCurveTo(bendX * 0.42, -height * 0.52, bendX * 0.95, -height * 0.94);
  ctx.stroke();

  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(1.3, baseWidth * 0.24);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke(blade);

  ctx.restore();
}

function fillRimAndStroke(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cLight: string,
  cMid: string,
  cDark: string,
  outline = '#1c2819',
  strokeW = 3.2,
  openStrokePath?: Path2D,
): void {
  const cx = (x0 + x1) * 0.5;
  const cy = (y0 + y1) * 0.5;
  const rx = Math.max(8, Math.abs(x1 - x0) * 0.5);
  const ry = Math.max(8, Math.abs(y1 - y0) * 0.5);
  const maxR = Math.max(rx, ry);

  const yawShiftX = activePlant3DYaw * rx * 0.34;
  const pitchShiftY = activePlant3DPitch * ry * 0.34;

  // 1. Base 3D directional volume gradient
  const grad = ctx.createLinearGradient(
    x0 + yawShiftX * 0.5,
    y0 + pitchShiftY * 0.5,
    x1 - yawShiftX * 0.5,
    y1 - pitchShiftY * 0.5,
  );
  grad.addColorStop(0, cLight);
  grad.addColorStop(0.52, cMid);
  grad.addColorStop(1, cDark);
  ctx.fillStyle = grad;
  ctx.fill(path);

  // 2. 3D Volumetric Spherical Cushion & Rim Lighting
  ctx.save();
  ctx.clip(path);

  // 2a. 3D Specular Crown Dome (top-left shifted by interactive 3D yaw/pitch)
  const specX = cx - rx * 0.28 + yawShiftX;
  const specY = cy - ry * 0.32 + pitchShiftY;
  const specGrad = ctx.createRadialGradient(specX, specY, maxR * 0.03, specX, specY, maxR * 0.88);
  specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.36)');
  specGrad.addColorStop(0.42, 'rgba(255, 255, 255, 0.12)');
  specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = specGrad;
  ctx.fillRect(cx - rx * 1.6, cy - ry * 1.6, rx * 3.2, ry * 3.2);

  // 2b. 3D Ambient Occlusion Undercut Shadow (bottom-right)
  const aoGrad = ctx.createLinearGradient(cx, cy - ry * 0.1, cx - yawShiftX * 0.3, cy + ry * 1.15);
  aoGrad.addColorStop(0, 'rgba(10, 22, 12, 0)');
  aoGrad.addColorStop(0.65, 'rgba(10, 22, 12, 0.14)');
  aoGrad.addColorStop(1, 'rgba(10, 22, 12, 0.32)');
  ctx.fillStyle = aoGrad;
  ctx.fillRect(cx - rx * 1.6, cy - ry * 1.6, rx * 3.2, ry * 3.2);

  // 2c. 3D Subsurface Botanical Rim Highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = Math.max(1.4, strokeW * 0.55);
  ctx.stroke(openStrokePath ?? path);

  ctx.restore();

  // 3. Outer Crisp Contour Stroke
  ctx.lineWidth = strokeW;
  ctx.strokeStyle = outline;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke(openStrokePath ?? path);
}

/**
 * Natural Soil & Seafloor Root Embedding:
 * Stuffs plant stems and roots directly inside the soil strata / sandbed without artificial bases or mounds.
 */
function draw3DPlantIslandBase(
  ctx: CanvasRenderingContext2D,
  _assetId: string,
  _sway: number,
): void {
  const baseX = activePlant3DYaw * -12;
  const baseY = 162 + activePlant3DPitch * 8;

  ctx.save();
  ctx.translate(baseX, baseY);

  // Subtle ground-contact occlusion shadow where the stem plunges into the soil
  const contactGrad = ctx.createRadialGradient(0, 4, 3, 0, 4, 48);
  contactGrad.addColorStop(0, 'rgba(8, 16, 10, 0.36)');
  contactGrad.addColorStop(0.55, 'rgba(8, 16, 10, 0.14)');
  contactGrad.addColorStop(1, 'rgba(8, 16, 10, 0)');
  ctx.fillStyle = contactGrad;
  ctx.beginPath();
  ctx.ellipse(0, 4, 44, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Fix #23 + Round 1-3 Botanical Overhaul:
 * Sculpted 3D botanical leaf with swollen petiole pulvinus, acuminate drip-tip (acumen),
 * 3D arched lamina cushion shading, glossy cuticle highlight, tapering midrib,
 * 5 pairs of pinnate secondary veins with brochidodromous looping marginal arches,
 * and forked tertiary veinlets.
 */
function drawDetailedLeaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number,
  cLight: string,
  cMid: string,
  cDark: string,
  veinCol = 'rgba(235, 255, 210, 0.65)',
  outline = '#172916',
  serrated = false,
): void {
  ctx.save();
  ctx.translate(x + activePlant3DYaw * 6, y + activePlant3DPitch * 4);
  ctx.rotate(angle + activePlant3DYaw * 0.04);

  // 1. Swollen basal petiole pulvinus & cylindrical petiole stalk attaching leaf to branch
  ctx.fillStyle = cDark;
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(1.8, width * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-length * 0.09, 0);
  ctx.lineTo(2, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-length * 0.04, 0, Math.max(2.0, length * 0.045), Math.max(1.4, width * 0.12), 0, 0, Math.PI * 2);
  ctx.fill();

  const p = new Path2D();
  const dripTipX = length * 1.04;
  p.moveTo(0, 0);
  if (serrated) {
    p.bezierCurveTo(length * 0.18, -width * 0.92, length * 0.42, -width * 1.05, length * 0.56, -width * 0.78);
    p.bezierCurveTo(length * 0.68, -width * 0.88, length * 0.86, -width * 0.48, dripTipX, 0);
    p.bezierCurveTo(length * 0.86, width * 0.48, length * 0.68, width * 0.88, length * 0.56, width * 0.78);
    p.bezierCurveTo(length * 0.42, width * 1.05, length * 0.18, width * 0.92, 0, 0);
  } else {
    p.bezierCurveTo(length * 0.25, -width * 1.05, length * 0.76, -width * 0.68, dripTipX, 0);
    p.bezierCurveTo(length * 0.76, width * 0.68, length * 0.25, width * 1.05, 0, 0);
  }
  p.closePath();

  fillRimAndStroke(ctx, p, 0, -width, dripTipX, width, cLight, cMid, cDark, outline, 2.4);

  // 2. Interior lamina 3D two-tone half-fold & glossy specular cuticle sheen
  ctx.save();
  ctx.clip(p);
  ctx.fillStyle = cDark;
  ctx.globalAlpha = 0.24;
  ctx.beginPath();
  ctx.rect(0, 0, dripTipX, width * 1.2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.ellipse(length * 0.42, -width * 0.36, length * 0.28, width * 0.2, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Primary 3D raised midrib, 5 pairs of pinnate secondary veins, brochidodromous marginal loops & tertiary veinlets
  ctx.strokeStyle = veinCol;
  ctx.lineWidth = Math.max(1.4, width * 0.11);
  ctx.beginPath();
  ctx.moveTo(1, 0);
  ctx.quadraticCurveTo(length * 0.5, -width * 0.03, length * 0.98, 0);
  ctx.stroke();

  ctx.lineWidth = Math.max(0.95, width * 0.068);
  ctx.beginPath();
    let prevTipX = 0;
    let prevTipW = 0;
    for (const t of [0.16, 0.32, 0.48, 0.64, 0.8]) {
      const vx = length * t;
      const vw = width * (1 - Math.abs(t - 0.44) * 1.05) * 0.66;
      const tipX = vx + length * 0.13;
      ctx.moveTo(vx, 0);
      ctx.quadraticCurveTo(vx + length * 0.07, -vw * 0.55, tipX, -vw);
      ctx.moveTo(vx + length * 0.07, -vw * 0.48);
      ctx.lineTo(vx + length * 0.04, -vw * 0.78);
      ctx.quadraticCurveTo(vx + length * 0.065, -vw * 0.55, tipX, -vw);
      ctx.moveTo(vx + length * 0.065, -vw * 0.48);
      ctx.lineTo(vx + length * 0.035, -vw * 0.78);
      ctx.moveTo(vx, 0);
      ctx.quadraticCurveTo(vx + length * 0.07, vw * 0.55, tipX, vw);
      ctx.moveTo(vx + length * 0.07, vw * 0.48);
      ctx.lineTo(vx + length * 0.04, vw * 0.78);
      ctx.quadraticCurveTo(vx + length * 0.065, vw * 0.55, tipX, vw);
      ctx.moveTo(vx + length * 0.065, vw * 0.48);
      ctx.lineTo(vx + length * 0.035, vw * 0.78);
      // Brochidodromous marginal loop connecting adjacent secondary vein tips
      if (prevTipX > 0 && width >= 11) {
        ctx.moveTo(prevTipX, -prevTipW);
        ctx.quadraticCurveTo((prevTipX + tipX) * 0.5, -Math.max(prevTipW, vw) * 1.06, tipX, -vw);
        ctx.moveTo(prevTipX, prevTipW);
        ctx.quadraticCurveTo((prevTipX + tipX) * 0.5, Math.max(prevTipW, vw) * 1.06, tipX, vw);
      }
      prevTipX = tipX;
      prevTipW = vw;
    }
    ctx.stroke();

    // Phase 2 Iteration 2 & 3: Glistening morning dew droplet / aquatic micro-bubble on larger leaves
    if (length >= 34 && width >= 11) {
      const dewX = length * 0.56;
      const dewY = -width * 0.24;
      const dewR = Math.min(3.2, width * 0.12);
      ctx.fillStyle = 'rgba(240, 253, 250, 0.75)';
      ctx.beginPath();
      ctx.arc(dewX, dewY, dewR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dewX - dewR * 0.3, dewY - dewR * 0.3, dewR * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Draws a multi-blossom 3D cluster block (3-4 flowers + buds + subtending bract leaves)
   * for lush flowering trees and shrubs (Fix #22).
   */
  function drawFlowerClusterBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    rot: number,
    petalLight: string,
    petalMid: string,
    petalDark: string,
    centerCol = '#facc15',
    outline = '#2b1216',
  ): void {
    ctx.save();
    ctx.translate(x + activePlant3DYaw * 10, y + activePlant3DPitch * 7);
    ctx.rotate(rot);
    ctx.scale(scale, scale);

    drawDetailedLeaf(ctx, -4, 2, -2.4, 22, 9, '#a3e635', '#4d7c0f', '#1a2e05', 'rgba(240,255,210,0.65)', '#172916', true);
    drawDetailedLeaf(ctx, 4, 2, -0.7, 22, 9, '#a3e635', '#4d7c0f', '#1a2e05', 'rgba(240,255,210,0.65)', '#172916', true);

    for (const [bx, by, bang] of [
      [-16, -12, -0.5],
      [17, -10, 0.5],
    ] as const) {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(bang);
      const bud = new Path2D();
      bud.moveTo(0, 6);
      bud.bezierCurveTo(-6, 2, -5, -8, 0, -11);
      bud.bezierCurveTo(5, -8, 6, 2, 0, 6);
      bud.closePath();
      fillRimAndStroke(ctx, bud, -5, -11, 5, 6, petalLight, petalMid, petalDark, outline, 1.8);
      ctx.restore();
    }

    drawBlossom(ctx, -10, -2, 11, -0.25, petalLight, petalMid, petalDark, centerCol, outline, 5);
    drawBlossom(ctx, 10, -1, 11, 0.3, petalLight, petalMid, petalDark, centerCol, outline, 5);
    drawBlossom(ctx, 0, -9, 13, 0.08, petalLight, petalMid, petalDark, centerCol, outline, 5);

    ctx.restore();
  }

  /**
   * Fix #21: Draws a detailed pinnate rainforest fern frond for surrounding P01 Rafflesia.
   */
  function drawRainforestFernFrond(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    length: number,
    archDir: number,
    sway: number,
  ): void {
    ctx.save();
    ctx.translate(x + activePlant3DYaw * -8, y + activePlant3DPitch * 5);
    ctx.rotate(angle + sway * 0.09 * archDir);

    const outline = '#132a13';
    ctx.strokeStyle = '#2e6f21';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(length * 0.5, archDir * 18, length, archDir * 34);
    ctx.stroke();

    const steps = 9;
    for (let i = 1; i <= steps; i++) {
      const t = i / (steps + 0.5);
      const px = length * t;
      const py = archDir * (18 * 2 * t * (1 - t * 0.5) + 34 * t * t);
      const pinnaLen = (1 - t * 0.62) * 34 + 8;
      const pinnaW = (1 - t * 0.55) * 9 + 3.5;
      drawDetailedLeaf(
        ctx,
        px,
        py,
        -1.15 + archDir * 0.22,
        pinnaLen,
        pinnaW,
        '#86efac',
        '#22c55e',
        '#14532d',
        'rgba(220,255,230,0.65)',
        outline,
        true,
      );
      drawDetailedLeaf(
        ctx,
        px,
        py,
        1.15 + archDir * 0.22,
        pinnaLen,
        pinnaW,
        '#86efac',
        '#22c55e',
        '#14532d',
        'rgba(220,255,230,0.65)',
        outline,
        true,
      );
    }
    ctx.restore();
  }

  /**
   * Fix #22: Draws a 3D cylindrical sculpted woody mother trunk with bark striation lines,
   * 3D root flare, and seamlessly merged ("嵌入") primary boughs + sub-branches + attached leaves.
   */
  function drawWoodyTrunkAndBranches(
    ctx: CanvasRenderingContext2D,
    sway: number,
    trunkH: number,
    baseW: number,
    topW: number,
    barkLight: string,
    barkMid: string,
    barkDark: string,
    buttress = false,
    branches: ReadonlyArray<readonly [number, number, number, number, number]> = [
      [-0.45, -0.78, -82, -74, 18],
      [0.45, -0.76, 82, -72, 18],
      [-0.25, -0.92, -52, -56, 14],
      [0.25, -0.9, 52, -54, 14],
    ],
    leafColors: readonly [string, string, string] = ['#86efac', '#22c55e', '#14532d'],
  ): void {
    const outline = '#26170c';
    const topX = sway * 18 + activePlant3DYaw * 8;
    const topY = 148 - trunkH + activePlant3DPitch * -6;

    const tP = new Path2D();
    const flare = buttress ? baseW * 1.45 : baseW * 1.18;
    tP.moveTo(-flare, 178);
    tP.quadraticCurveTo(-baseW * 0.55, 148 - trunkH * 0.42, topX - topW, topY);
    tP.lineTo(topX + topW, topY);
    tP.quadraticCurveTo(baseW * 0.55, 148 - trunkH * 0.42, flare, 178);
    tP.lineTo(-flare, 178);
    tP.closePath();

    const boughItems: Array<{
      bP: Path2D;
      subP: Path2D;
      bx: number;
      by: number;
      endX: number;
      endY: number;
      forkX: number;
      forkY: number;
      subEndX: number;
      subEndY: number;
      dir: number;
    }> = [];

    for (const [xFactor, yFactor, dx, dy, bw] of branches) {
      const dir = dx >= 0 ? 1 : -1;
      const bx = topX * Math.abs(yFactor) + xFactor * topW * 0.65;
      const by = 148 + yFactor * trunkH;
      const endX = bx + dx + sway * 22 + activePlant3DYaw * 14;
      const endY = by + dy + activePlant3DPitch * -8;

      const bP = new Path2D();
      bP.moveTo(bx - dir * bw * 0.35, by - bw * 0.35);
      bP.bezierCurveTo(bx + dx * 0.3, by + dy * 0.15, bx + dx * 0.65, by + dy * 0.65, endX, endY);
      bP.bezierCurveTo(
        bx + dx * 0.7,
        by + dy * 0.75 + bw * 0.35,
        bx + dx * 0.35,
        by + dy * 0.25 + bw * 0.5,
        bx - dir * bw * 0.2,
        by + bw * 0.45,
      );
      bP.closePath();

      const forkX = bx + dx * 0.52 + sway * 12 + activePlant3DYaw * 8;
      const forkY = by + dy * 0.46 + activePlant3DPitch * -4;
      const subEndX = forkX + dir * 32 + sway * 16 + activePlant3DYaw * 12;
      const subEndY = forkY - 30 + activePlant3DPitch * -6;
      const subW = bw * 0.42;

      const subP = new Path2D();
      subP.moveTo(forkX - dir * subW * 0.5, forkY);
      subP.quadraticCurveTo(forkX + dir * 14, forkY - 18, subEndX, subEndY);
      subP.quadraticCurveTo(forkX + dir * 18, forkY - 12 + subW * 0.4, forkX + dir * subW * 0.5, forkY + subW * 0.3);
      subP.closePath();

      boughItems.push({ bP, subP, bx, by, endX, endY, forkX, forkY, subEndX, subEndY, dir });
    }

    ctx.save();
    ctx.strokeStyle = outline;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 6.8;
    ctx.stroke(tP);
    for (const item of boughItems) {
      ctx.lineWidth = 5.8;
      ctx.stroke(item.bP);
      ctx.lineWidth = 4.6;
      ctx.stroke(item.subP);
    }
    ctx.restore();

    const shiftX = activePlant3DYaw * flare * 0.35;
    const barkGrad = ctx.createLinearGradient(-flare + shiftX, topY - 40, flare + shiftX, 156);
    barkGrad.addColorStop(0, barkDark);
    barkGrad.addColorStop(0.26, barkLight);
    barkGrad.addColorStop(0.62, barkMid);
    barkGrad.addColorStop(1, barkDark);
    ctx.fillStyle = barkGrad;
    for (const item of boughItems) {
      ctx.fill(item.bP);
      ctx.fill(item.subP);
    }
    ctx.fill(tP);

    ctx.save();
    ctx.clip(tP);
    const cylSpec = ctx.createLinearGradient(-baseW * 0.8 + shiftX, 0, baseW * 0.2 + shiftX, 0);
    cylSpec.addColorStop(0, 'rgba(255,255,255,0)');
    cylSpec.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    cylSpec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cylSpec;
    ctx.fillRect(-flare, topY - 20, flare * 2, trunkH + 40);

    ctx.strokeStyle = 'rgba(35, 18, 8, 0.42)';
    ctx.lineWidth = 2.4;
    for (const ox of [-0.48, -0.18, 0.14, 0.46]) {
      ctx.beginPath();
      ctx.moveTo(ox * flare * 0.85 + shiftX * 0.25, 154);
      ctx.quadraticCurveTo(ox * baseW * 0.5 + sway * 8 + shiftX * 0.35, 148 - trunkH * 0.5, topX + ox * topW * 0.7, topY + 4);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(35, 18, 8, 0.38)';
    ctx.beginPath();
    ctx.ellipse(sway * 5 - 4 + shiftX * 0.3, 148 - trunkH * 0.38, 7, 13, 0.08, 0, Math.PI * 2);
    ctx.stroke();

    if (buttress) {
      ctx.strokeStyle = barkLight;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-baseW * 0.4, 96);
      ctx.quadraticCurveTo(-flare * 0.75, 132, -flare * 0.9, 156);
      ctx.moveTo(baseW * 0.4, 96);
      ctx.quadraticCurveTo(flare * 0.75, 132, flare * 0.9, 156);
      ctx.stroke();
    }

    // Round 2 Upgrade: Horizontal lenticel bark striations & epiphytic moss cushions in branch crotches
    ctx.strokeStyle = 'rgba(255, 250, 235, 0.22)';
    ctx.lineWidth = 1.5;
    for (let ly = 136; ly > topY + 24; ly -= 26) {
      const lw = baseW * 0.36;
      ctx.beginPath();
      ctx.moveTo(-lw + shiftX * 0.2, ly);
      ctx.quadraticCurveTo(shiftX * 0.2, ly + 3, lw + shiftX * 0.2, ly);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(74, 222, 128, 0.46)';
    for (const item of boughItems) {
      ctx.beginPath();
      ctx.ellipse(item.bx, item.by - 4, 8, 3.8, item.dir * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const [lLight, lMid, lDark] = leafColors;
    for (const item of boughItems) {
      const { forkX, forkY, subEndX, subEndY, endX, endY, dir } = item;
      drawDetailedLeaf(
        ctx,
        forkX + dir * 8,
        forkY - 8,
        dir > 0 ? -0.45 + sway * 0.1 : -2.68 + sway * 0.1,
        24,
        9.5,
        lLight,
        lMid,
        lDark,
        'rgba(240,255,220,0.6)',
        '#152914',
        true,
      );
      drawDetailedLeaf(
        ctx,
        subEndX,
        subEndY,
        dir > 0 ? -0.85 + sway * 0.12 : -2.28 + sway * 0.12,
        22,
        9,
        lLight,
        lMid,
        lDark,
        'rgba(240,255,220,0.6)',
        '#152914',
        true,
      );
      drawDetailedLeaf(
        ctx,
        endX,
        endY,
        dir > 0 ? -0.35 + sway * 0.12 : -2.78 + sway * 0.12,
        26,
        10,
        lLight,
        lMid,
        lDark,
        'rgba(240,255,220,0.6)',
        '#152914',
        true,
      );
    }
  }

  /**
   * Draws a distinct banana paddle frond with natural transverse wind-splits perpendicular to the thick midrib.
   */
  function drawBananaPaddleLeaf(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    length: number,
    width: number,
    cLight: string,
    cMid: string,
    cDark: string,
    outline = '#172916',
  ): void {
    ctx.save();
    ctx.translate(x + activePlant3DYaw * 6, y + activePlant3DPitch * 4);
    ctx.rotate(angle + activePlant3DYaw * 0.04);

    // Thick pale-green petiole & midrib
    ctx.strokeStyle = '#d9f99d';
    ctx.lineWidth = Math.max(3.2, width * 0.16);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(length * 0.5, -width * 0.05, length * 0.98, 0);
    ctx.stroke();

    // Split paddle segments along upper and lower lamina
    const segments = [
      [0.04, 0.34],
      [0.37, 0.68],
      [0.71, 0.98],
    ] as const;

    for (const [t0, t1] of segments) {
      const x0 = length * t0;
      const x1 = length * t1;
      const xm = (x0 + x1) * 0.5;
      const segW = width * (1 - Math.pow((t0 + t1) * 0.5 - 0.5, 2) * 1.1);

      const segP = new Path2D();
      segP.moveTo(x0, -1.5);
      segP.quadraticCurveTo(xm, -segW * 1.05, x1, -segW * 0.65);
      segP.lineTo(x1 - 3, -1.5);
      segP.moveTo(x0, 1.5);
      segP.quadraticCurveTo(xm, segW * 1.05, x1, segW * 0.65);
      segP.lineTo(x1 - 3, 1.5);
      segP.closePath();

      fillRimAndStroke(ctx, segP, x0, -segW, x1, segW, cLight, cMid, cDark, outline, 2.2);

      // Parallel transverse banana leaf veins
      ctx.strokeStyle = 'rgba(236, 252, 203, 0.55)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let vt = t0 + 0.06; vt < t1 - 0.03; vt += 0.08) {
        const vx = length * vt;
        ctx.moveTo(vx, -2);
        ctx.lineTo(vx + 4, -segW * 0.78);
        ctx.moveTo(vx, 2);
        ctx.lineTo(vx + 4, segW * 0.78);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draws a non-clumpy, open architectural tree bough network with distinct species-specific individual leaves
   * (zero round cartoon tree clumps!).
   */
  function drawCanopyCrown(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    sway: number,
    cLight: string,
    cMid: string,
    cDark: string,
    outline = '#152914',
    flowerPalette?: readonly [string, string, string, string],
  ): void {
    ctx.save();
    ctx.translate(cx + sway * 22 + activePlant3DYaw * 18, cy + activePlant3DPitch * -14);
    ctx.rotate(sway * 0.08 + activePlant3DYaw * 0.04);

    // 1. Open architectural wooden branches & twigs radiating through the crown (no clumpy green blob!)
    const branchCoords: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
      [0, ry * 0.55, -rx * 0.45, ry * 0.05, -rx * 0.84, -ry * 0.08],
      [0, ry * 0.55, rx * 0.45, ry * 0.05, rx * 0.84, -ry * 0.08],
      [-rx * 0.25, ry * 0.2, -rx * 0.48, -ry * 0.35, -rx * 0.66, -ry * 0.58],
      [rx * 0.25, ry * 0.2, rx * 0.48, -ry * 0.35, rx * 0.66, -ry * 0.58],
      [0, ry * 0.45, -rx * 0.14, -ry * 0.25, -rx * 0.26, -ry * 0.76],
      [0, ry * 0.45, rx * 0.14, -ry * 0.25, rx * 0.26, -ry * 0.76],
      [0, ry * 0.35, 0, -ry * 0.3, 0, -ry * 0.85],
    ];

    ctx.strokeStyle = '#4a2c18';
    ctx.lineCap = 'round';
    for (const [x0, y0, cx1, cy1, x2, y2] of branchCoords) {
      // Shaded inner under-canopy individual leaves behind the wooden boughs (100% individual leaves, zero clumpy fill!)
      const underAng = Math.atan2(y2 - y0, x2 - x0);
      drawDetailedLeaf(
        ctx,
        (x0 + x2) * 0.55,
        (y0 + y2) * 0.55,
        underAng - 0.55 + sway * 0.08,
        36,
        14,
        cMid,
        cDark,
        '#0b2210',
        'rgba(187, 247, 208, 0.42)',
        outline,
        false,
      );
      drawDetailedLeaf(
        ctx,
        (x0 + x2) * 0.75,
        (y0 + y2) * 0.75,
        underAng + 0.55 + sway * 0.08,
        34,
        13,
        cMid,
        cDark,
        '#0b2210',
        'rgba(187, 247, 208, 0.42)',
        outline,
        false,
      );

      ctx.strokeStyle = '#4a2c18';
      ctx.lineWidth = 5.2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(cx1, cy1, x2, y2);
      ctx.stroke();
    }

    // 2. Species-specific individual leaf morphology (every plant species has distinct leaf geometry & venation)
    const isTualang = activePlantAssetId.includes('tualang');
    const isDurian = activePlantAssetId.includes('durian');
    const isMangosteen = activePlantAssetId.includes('mangosteen');
    const isRambutan = activePlantAssetId.includes('rambutan');
    const isBanyan = activePlantAssetId.includes('banyan');
    const isIxora = activePlantAssetId.includes('ixora');
    const isApiApi = activePlantAssetId.includes('api_api');

    const leafSprays: ReadonlyArray<readonly [number, number, number, number]> = [
      [-rx * 0.88, ry * 0.12, -2.75, 48],
      [rx * 0.88, ry * 0.12, -0.38, 48],
      [-rx * 0.78, -ry * 0.18, -2.48, 52],
      [rx * 0.78, -ry * 0.18, -0.66, 52],
      [-rx * 0.62, -ry * 0.48, -2.18, 48],
      [rx * 0.62, -ry * 0.48, -0.96, 48],
      [-rx * 0.36, -ry * 0.72, -1.88, 46],
      [rx * 0.36, -ry * 0.72, -1.26, 46],
      [0, -ry * 0.82, -1.57, 50],
      [-rx * 0.52, ry * 0.18, -2.52, 46],
      [rx * 0.52, ry * 0.18, -0.62, 46],
      [-rx * 0.32, -ry * 0.16, -2.12, 48],
      [rx * 0.32, -ry * 0.16, -1.02, 48],
      [-rx * 0.18, -ry * 0.45, -1.78, 46],
      [rx * 0.18, -ry * 0.45, -1.36, 46],
      [0, -ry * 0.12, -1.57, 46],
      [-rx * 0.66, ry * 0.32, -2.68, 42],
      [rx * 0.66, ry * 0.32, -0.46, 42],
      [-rx * 0.22, ry * 0.26, -2.25, 42],
      [rx * 0.22, ry * 0.26, -0.88, 42],
    ];

    for (let idx = 0; idx < leafSprays.length; idx++) {
      const [lx, ly, ang, baseLen] = leafSprays[idx];
      const leafAngle = ang + sway * 0.12;

      if (isTualang) {
        // Koompassia excelsa: feathery compound rachis with small alternating bright-emerald elliptical leaflets
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(leafAngle);
        ctx.strokeStyle = '#365314';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(baseLen * 1.15, 0);
        ctx.stroke();
        for (const t of [0.22, 0.48, 0.74, 0.96]) {
          drawDetailedLeaf(ctx, baseLen * t, -2, -0.85, 19, 7.5, cLight, cMid, cDark, 'rgba(240,255,220,0.7)', outline, false);
          drawDetailedLeaf(ctx, baseLen * t, 2, 0.85, 19, 7.5, cLight, cMid, cDark, 'rgba(240,255,220,0.7)', outline, false);
        }
        ctx.restore();
      } else if (isDurian) {
        // Durio zibethinus: elongated acuminate drip-tip leaves, half showing golden-coppery underside indumentum
        const showCopperBack = idx % 3 === 1;
        drawDetailedLeaf(
          ctx,
          lx,
          ly,
          leafAngle,
          baseLen * 1.14,
          14.5,
          showCopperBack ? '#fde68a' : cLight,
          showCopperBack ? '#d97706' : cMid,
          showCopperBack ? '#78350f' : cDark,
          showCopperBack ? 'rgba(254,243,199,0.75)' : 'rgba(236,252,203,0.7)',
          outline,
          false,
        );
      } else if (isMangosteen) {
        // Garcinia mangostana: large, thick, broad opposite dark-emerald leathery leaves
        drawDetailedLeaf(ctx, lx, ly, leafAngle - 0.22, baseLen * 1.12, 22, cLight, cMid, cDark, '#bbf7d0', outline, false);
        drawDetailedLeaf(ctx, lx, ly, leafAngle + 0.22, baseLen * 1.08, 21, cLight, cMid, cDark, '#bbf7d0', outline, false);
      } else if (isRambutan) {
        // Nephelium lappaceum: paripinnate compound leaf with paired obovate-elliptic leaflets
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(leafAngle);
        drawDetailedLeaf(ctx, 8, -3, -0.52, baseLen * 0.72, 15, cLight, cMid, cDark, 'rgba(240,255,220,0.68)', outline, false);
        drawDetailedLeaf(ctx, 8, 3, 0.52, baseLen * 0.72, 15, cLight, cMid, cDark, 'rgba(240,255,220,0.68)', outline, false);
        drawDetailedLeaf(ctx, baseLen * 0.45, 0, 0, baseLen * 0.76, 16, cLight, cMid, cDark, 'rgba(240,255,220,0.68)', outline, false);
        ctx.restore();
      } else if (isBanyan) {
        // Ficus benghalensis: broadly ovate, blunt-rounded thick coriaceous fig leaves with pale prominent veins
        drawDetailedLeaf(ctx, lx, ly, leafAngle, baseLen * 1.02, 24.5, cLight, cMid, cDark, '#fef9c3', outline, false);
      } else if (isIxora) {
        // Ixora coccinea: compact opposite oblong-cordate glossy leaves
        drawDetailedLeaf(ctx, lx, ly, leafAngle - 0.18, baseLen * 0.85, 16, cLight, cMid, cDark, 'rgba(220,252,231,0.7)', outline, false);
        drawDetailedLeaf(ctx, lx, ly, leafAngle + 0.18, baseLen * 0.85, 16, cLight, cMid, cDark, 'rgba(220,252,231,0.7)', outline, false);
      } else if (isApiApi) {
        // Avicennia alba: slender lanceolate leaves with silvery-white salt-gland undersides
        const silverSide = idx % 2 === 0;
        drawDetailedLeaf(
          ctx,
          lx,
          ly,
          leafAngle,
          baseLen * 1.1,
          11.5,
          silverSide ? '#e2e8f0' : cLight,
          silverSide ? '#94a3b8' : cMid,
          silverSide ? '#475569' : cDark,
          '#f8fafc',
          outline,
          false,
        );
      } else {
        // Rhizophora Red Mangrove & default: opposite succulent elliptical leaves with mucronate tips
        drawDetailedLeaf(
          ctx,
          lx,
          ly,
          leafAngle,
          baseLen * 1.05,
          18.5,
          cLight,
          cMid,
          cDark,
          'rgba(240,255,220,0.68)',
          outline,
          false,
        );
      }
    }

    // 3. Only draw flower clusters when plant has reached Flowering / Fruiting stage (growthStage >= 2)
    if (activePlantGrowthStage >= 2) {
      const [fLight, fMid, fDark, fCenter] = flowerPalette ?? ['#fef9c3', '#fde047', '#eab308', '#d97706'];
      for (const [fx, fy, fScale, fRot] of [
        [-rx * 0.56, -ry * 0.26, 0.72, -0.25],
        [rx * 0.54, -ry * 0.24, 0.72, 0.28],
        [0, -ry * 0.54, 0.78, 0.05],
      ] as const) {
        drawFlowerClusterBlock(ctx, fx, fy, fScale, fRot + sway * 0.08, fLight, fMid, fDark, fCenter);
      }
    }

    ctx.restore();
  }

  /**
   * Draws a 3D multi-petaled tropical flower with cupped petals, stamen filaments, anther dots, and petal venation.
   */
  function drawBlossom(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    rot: number,
    petalLight: string,
    petalMid: string,
    petalDark: string,
    centerCol = '#facc15',
    outline = '#2b1216',
    petals = 5,
  ): void {
    ctx.save();
    ctx.translate(x + activePlant3DYaw * 6, y + activePlant3DPitch * 4);
    ctx.rotate(rot + activePlant3DYaw * 0.05);

    // Round 2 Upgrade: Subtending green calyx sepals peeking between petals
    for (let s = 0; s < petals; s++) {
      ctx.save();
      ctx.rotate(((s + 0.5) * Math.PI * 2) / petals);
      ctx.fillStyle = '#15803d';
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.16, -radius * 0.25);
      ctx.quadraticCurveTo(0, -radius * 0.94, radius * 0.16, -radius * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    for (let i = 0; i < petals; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / petals);
      const p = new Path2D();
      p.moveTo(0, 0);
      p.bezierCurveTo(-radius * 0.54, -radius * 0.45, -radius * 0.48, -radius * 1.06, 0, -radius);
      p.bezierCurveTo(radius * 0.48, -radius * 1.06, radius * 0.54, -radius * 0.45, 0, 0);
      p.closePath();
      fillRimAndStroke(ctx, p, -radius * 0.5, -radius, radius * 0.5, 0, petalLight, petalMid, petalDark, outline, 2.2);

      ctx.strokeStyle = 'rgba(255,255,255,0.48)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.18);
      ctx.lineTo(0, -radius * 0.78);
      ctx.moveTo(0, -radius * 0.35);
      ctx.lineTo(-radius * 0.16, -radius * 0.65);
      ctx.moveTo(0, -radius * 0.35);
      ctx.lineTo(radius * 0.16, -radius * 0.65);
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.3;
    for (let i = 0; i < petals * 2; i++) {
      const a = (i * Math.PI) / petals;
      const r1 = radius * 0.2;
      const r2 = radius * 0.38;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
      ctx.fillStyle = centerCol;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r2, Math.sin(a) * r2, Math.max(1.5, radius * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }

    const centerDisk = new Path2D();
    centerDisk.arc(0, 0, radius * 0.24, 0, Math.PI * 2);
    fillRimAndStroke(ctx, centerDisk, -radius * 0.24, -radius * 0.24, radius * 0.24, radius * 0.24, '#fef9c3', centerCol, '#b45309', outline, 2.0);
    ctx.restore();
  }

  export interface PlantRenderOptions {
    yaw?: number;
    pitch?: number;
    isDragging?: boolean;
    growthStage?: 1 | 2 | 3;
    fruitCount?: number;
    skipClear?: boolean;
    framingScale?: number;
  }

  export function renderPlantAsset(
    ctx: CanvasRenderingContext2D,
    assetId: string,
    width: number,
    height: number,
    pose: TurtlePose,
    elapsedSec = 0,
    preview3D?: PlantRenderOptions,
  ): void {
    void elapsedSec;
    renderPlantRig(ctx, width, height, pose, assetId, preview3D);
  }

  /**
   * Renders all 30 Malaysian Flora & Marine Botanical Species (`P01`–`P30`)
   * matching exact IDs in `src/roster/catalog.ts` as 3D-oriented realistic-cuteness botanical rigs
   * with growth-stage lifecycle (1: Vegetative Leaves -> 2: Flowering -> 3: Fruiting).
   */
  export function renderPlantRig(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    pose: TurtlePose,
    assetId: string,
    preview3D?: PlantRenderOptions,
  ): void {
    ctx.save();
    if (!preview3D?.skipClear) {
      ctx.clearRect(0, 0, width, height);
    }

    const yaw = preview3D?.yaw ?? 0;
    const pitch = preview3D?.pitch ?? 0;
    activePlant3DYaw = yaw;
    activePlant3DPitch = pitch;
    activePlantGrowthStage = preview3D?.growthStage ?? 2;
    activePlantFruitCount = preview3D?.fruitCount ?? 0;
    activePlantAssetId = assetId;

    const cx = width * 0.5;
    const cy = height * 0.53;
    const framing = preview3D?.framingScale ?? 1.0;
    const scale = (Math.min(width, height) / 500) * framing;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Global 3D perspective foreshortening & turntable tilt when dragging mouse in 3D preview
    const cosYaw = Math.cos(yaw * 0.36);
    const cosPitch = Math.cos(pitch * 0.3);
    ctx.translate(yaw * 16, pitch * 12);
    ctx.scale(cosYaw, cosPitch);
    ctx.transform(1, pitch * 0.07, -yaw * 0.09, 1, 0, 0);

    const sway = clamp(
      Math.sin(pose.waveRaysPhase * 0.65) * 0.35 + pose.headRot * 1.8 + pose.shellOffsetX * 0.04 + yaw * 0.22,
      -1,
      1,
    );

    // 3D Sculpted Island / Seabed Plinth Base beneath every plant
    draw3DPlantIslandBase(ctx, assetId, sway);

    switch (assetId) {
      /* ========================================================================
       * P01: RAFFLESIA (plant_01_rafflesia)
       * Fix #21: Surrounded on both sides by lush pinnate rainforest ferns;
       * 5 massive fleshy terracotta-crimson perigone lobes covered in raised cream warts;
       * super-detailed center with scalloped diaphragm aperture, concentric central
       * column disk ridges, and dense spiky ramenta processes.
       * ====================================================================== */
      case 'plant_01_rafflesia': {
        // 1. Lush rainforest fern fronds surrounding left and right sides (Fix #21)
        drawRainforestFernFrond(ctx, -92, 118, -2.55, 138, -1, sway);
        drawRainforestFernFrond(ctx, -108, 72, -2.18, 148, -1, sway);
        drawRainforestFernFrond(ctx, -78, 22, -1.92, 128, -1, sway);
        drawRainforestFernFrond(ctx, 92, 118, -0.58, 138, 1, sway);
        drawRainforestFernFrond(ctx, 108, 72, -0.96, 148, 1, sway);
        drawRainforestFernFrond(ctx, 78, 22, -1.22, 128, 1, sway);

        // Compact vertical root stem stuffed directly into the forest soil
        const vineP = new Path2D();
        vineP.moveTo(-22, 118);
        vineP.lineTo(-26, 178);
        vineP.lineTo(26, 178);
        vineP.lineTo(22, 118);
        vineP.closePath();
        fillRimAndStroke(ctx, vineP, -26, 118, 26, 178, '#5c3822', '#3b2314', '#1f1108', '#140a04', 2.8);

        ctx.save();
        ctx.translate(sway * 10 + yaw * 14, 12 + pitch * -10);
        ctx.rotate(sway * 0.05);

        if (activePlantGrowthStage === 1) {
          // Stage 1 (Vegetative / Developing): Closed cabbage-like Rafflesia knop bud on host vine
          const knop = new Path2D();
          knop.arc(0, 82, 54, 0, Math.PI * 2);
          fillRimAndStroke(ctx, knop, -54, 28, 54, 136, '#7c2d12', '#431407', '#270a03', '#1c0602', 3.4);
          for (const [ang, sc] of [
            [-0.6, 0.9],
            [0.6, 0.9],
            [0, 1.0],
          ] as const) {
            ctx.strokeStyle = 'rgba(254, 215, 170, 0.35)';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.arc(ang * 14, 82, 38 * sc, -Math.PI * 0.8, -Math.PI * 0.2);
            ctx.stroke();
          }
          ctx.restore();
          break;
        }

        // 2. Five massive fleshy terracotta-crimson perigone lobes with raised cream warts (Single giant flower!)
        for (let i = 0; i < 5; i++) {
          const ang = -Math.PI / 2 + (i * Math.PI * 2) / 5;
          ctx.save();
          ctx.rotate(ang);
          const lobe = new Path2D();
          lobe.moveTo(0, -28);
          lobe.bezierCurveTo(-86, -52, -94, -162, 0, -170);
          lobe.bezierCurveTo(94, -162, 86, -52, 0, -28);
          lobe.closePath();
          fillRimAndStroke(ctx, lobe, -84, -170, 84, -28, '#e65c43', '#b83227', '#6e140e', '#2e0805', 3.6);
          ctx.save();
          ctx.clip(lobe);
          // Subtle venation & fleshy rugose ridges on petal lobe
          ctx.strokeStyle = 'rgba(82, 12, 8, 0.35)';
          ctx.lineWidth = 2.2;
          for (const vx of [-28, 0, 28]) {
            ctx.beginPath();
            ctx.moveTo(vx * 0.4, -42);
            ctx.quadraticCurveTo(vx, -104, vx * 1.15, -158);
            ctx.stroke();
          }
          // Dense raised cream-white perigone warts with soft brick shadows
          for (const [wx, wy, wr] of [
            [-38, -132, 9.5],
            [0, -148, 11.5],
            [38, -128, 8.5],
            [-48, -94, 8.5],
            [24, -98, 10],
            [-18, -104, 7.5],
            [46, -82, 7.5],
            [-26, -68, 6.5],
            [16, -66, 7],
            [0, -122, 6.5],
            [-54, -116, 6],
            [52, -108, 6.5],
          ] as const) {
            ctx.fillStyle = 'rgba(74, 12, 8, 0.45)';
            ctx.beginPath();
            ctx.ellipse(wx + 1.5, wy + 2, wr, wr * 0.68, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef2e8';
            ctx.beginPath();
            ctx.ellipse(wx, wy, wr, wr * 0.68, 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          ctx.restore();
        }

        // 3. Super-detailed Central Diaphragm Collar, Ramenta Pit & Spiky Column Disk (Fix #21)
        const rim = new Path2D();
        rim.arc(0, 0, 72, 0, Math.PI * 2);
        fillRimAndStroke(ctx, rim, -72, -72, 72, 72, '#ff9e7d', '#d94e34', '#7a1c12', '#2e0805', 3.5);

        // Ring of raised cream-rimmed window spots ("windows") around the diaphragm collar
        for (let w = 0; w < 16; w++) {
          const wa = (w / 16) * Math.PI * 2;
          const wx = Math.cos(wa) * 58;
          const wy = Math.sin(wa) * 58;
          ctx.fillStyle = '#fde8d7';
          ctx.beginPath();
          ctx.ellipse(wx, wy, 5.5, 3.8, wa + Math.PI / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Deep chamber aperture & inner spiky ramenta wall
        const pit = new Path2D();
        pit.arc(yaw * -5, pitch * -5, 48, 0, Math.PI * 2);
        fillRimAndStroke(ctx, pit, -48, -48, 48, 48, '#59110b', '#360805', '#1a0201', '#2e0805', 3.2);

        // Radiating hair-like ramenta tubercles lining the inner chamber wall
        ctx.strokeStyle = '#c2410c';
        ctx.lineWidth = 2.2;
        for (let r = 0; r < 24; r++) {
          const ra = (r / 24) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ra) * 46, Math.sin(ra) * 46);
          ctx.lineTo(Math.cos(ra) * 35, Math.sin(ra) * 35);
          ctx.stroke();
        }

        // Raised central column disk (discus) with concentric coronal rim
        const disk = new Path2D();
        disk.arc(yaw * 4, pitch * 4, 32, 0, Math.PI * 2);
        fillRimAndStroke(ctx, disk, -32, -32, 32, 32, '#f97316', '#b91c1c', '#63100b', '#2e0805', 2.6);

        ctx.strokeStyle = 'rgba(254, 215, 170, 0.55)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(yaw * 4, pitch * 4, 23, 0, Math.PI * 2);
        ctx.stroke();

        // 14 conical stylar processes (spikes) on the central column disk
        for (let s = 0; s < 14; s++) {
          const a = (s / 14) * Math.PI * 2;
          const rDist = s % 2 === 0 ? 18 : 10;
          const sx = yaw * 4 + Math.cos(a) * rDist;
          const sy = pitch * 4 + Math.sin(a) * rDist;
          ctx.fillStyle = '#fde047';
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx, sy, 3.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(yaw * 4, pitch * 4, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      /* ========================================================================
       * P02: TUALANG TREE (plant_02_tualang_tree)
       * Towering smooth silvery-grey trunk, massive flared buttress roots, wide
       * tiered umbrella crowns with individual leaves, flower clusters & detailed honeycombs.
       * ====================================================================== */
      case 'plant_02_tualang_tree': {
        drawWoodyTrunkAndBranches(ctx, sway, 220, 34, 16, '#d6d3c9', '#9e9a8e', '#5c584f', true, [
          [-0.5, -0.78, -118, -42, 18],
          [0.5, -0.76, 118, -38, 18],
          [-0.3, -0.92, -76, -54, 14],
          [0.3, -0.92, 76, -52, 14],
        ]);
        // Detailed hanging wild Tualang honeycombs with hexagonal beeswax cells & legume pods (Stage 3 fruiting)
        for (const [hxBase, hyBase] of (
          [
            [-68 + sway * 20, -60],
            [72 + sway * 20, -56],
          ] as const
        ).slice(0, activePlantGrowthStage >= 3 && activePlantFruitCount > 0 ? Math.max(1, activePlantFruitCount) : 0)) {
          const hx = hxBase + yaw * 14;
          const hy = hyBase + pitch * -8;
          const comb = new Path2D();
          comb.moveTo(hx - 24, hy);
          comb.bezierCurveTo(hx - 20, hy + 38, hx + 20, hy + 38, hx + 24, hy);
          comb.closePath();
          fillRimAndStroke(ctx, comb, hx - 24, hy, hx + 24, hy + 34, '#fef08a', '#eab308', '#a16207', '#422006', 2.6);
          ctx.save();
          ctx.clip(comb);
          ctx.fillStyle = 'rgba(120, 53, 15, 0.45)';
          for (const [cxOff, cyOff] of [
            [-10, 10],
            [0, 12],
            [10, 10],
            [-5, 20],
            [5, 20],
          ]) {
            ctx.beginPath();
            ctx.arc(hx + cxOff, hy + cyOff, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        drawCanopyCrown(ctx, -84, -104, 78, 44, sway, '#86efac', '#22c55e', '#15803d', '#152914', ['#fef9c3', '#fde047', '#ca8a04', '#854d0e']);
        drawCanopyCrown(ctx, 84, -100, 78, 44, sway, '#86efac', '#22c55e', '#15803d', '#152914', ['#fef9c3', '#fde047', '#ca8a04', '#854d0e']);
        drawCanopyCrown(ctx, 0, -148, 112, 54, sway * 1.15, '#bbf7d0', '#4ade80', '#166534', '#152914', ['#fef9c3', '#fde047', '#ca8a04', '#854d0e']);
        break;
      }

      /* ========================================================================
       * P03: DURIAN TREE (plant_03_durian_tree)
       * Tall orchard hardwood trunk, merged horizontal boughs bearing creamy-gold
       * cauliflorous flower clusters and 3D spiky Durian fruits with protruding
       * outer pyramidal thorns all around the silhouette and across the husk.
       * ====================================================================== */
      case 'plant_03_durian_tree': {
        drawWoodyTrunkAndBranches(ctx, sway, 200, 30, 15, '#966F4B', '#66462C', '#3B2514', false, [
          [-0.4, -0.62, -112, -22, 16],
          [0.4, -0.58, 112, -18, 16],
          [-0.3, -0.85, -84, -48, 14],
          [0.3, -0.85, 84, -48, 14],
        ]);
        drawCanopyCrown(ctx, 0, -118, 128, 72, sway, '#a3e635', '#65a30d', '#365314', '#1a2e05', ['#fefce8', '#fef08a', '#eab308', '#ca8a04']);

        for (const [dx, dy, scaleF] of (
          [
            [-70, -40, 1.12],
            [66, -34, 1.05],
            [-20, -58, 0.94],
            [24, -64, 1.0],
          ] as const
        ).slice(0, activePlantGrowthStage >= 3 && activePlantFruitCount > 0 ? activePlantFruitCount : 0)) {
          const fx = dx + sway * 20 + yaw * 22;
          const fy = dy + pitch * -12;
          const rx = 22 * scaleF;
          const ry = 27 * scaleF;
          const cyFruit = fy + 18 * scaleF;

          // 1. Thick woody pedicel stalk with 3D abscission joint ring (buku tangkai)
          ctx.strokeStyle = '#4d3319';
          ctx.lineWidth = 4.8 * scaleF;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(fx, fy - 28 * scaleF);
          ctx.lineTo(fx, cyFruit - ry * 0.88);
          ctx.stroke();

          ctx.fillStyle = '#78522b';
          ctx.strokeStyle = '#26170a';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.ellipse(fx, fy - 14 * scaleF, 5.4 * scaleF, 3.1 * scaleF, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // 2. Spiky Outer Silhouette Crown of Protruding 3D Pyramidal Durian Thorns (22 perimeter spikes)
          const numRimSpikes = 22;
          const spikyRim = new Path2D();
          for (let i = 0; i < numRimSpikes; i++) {
            const a0 = (i / numRimSpikes) * Math.PI * 2;
            const aMid = ((i + 0.5) / numRimSpikes) * Math.PI * 2;
            const a1 = ((i + 1) / numRimSpikes) * Math.PI * 2;
            const bx0 = fx + Math.cos(a0) * rx * 0.94;
            const by0 = cyFruit + Math.sin(a0) * ry * 0.94;
            const tipLen = 6.8 * scaleF;
            const tx = fx + Math.cos(aMid) * (rx + tipLen);
            const ty = cyFruit + Math.sin(aMid) * (ry + tipLen);
            const bx1 = fx + Math.cos(a1) * rx * 0.94;
            const by1 = cyFruit + Math.sin(a1) * ry * 0.94;
            if (i === 0) spikyRim.moveTo(bx0, by0);
            spikyRim.lineTo(tx, ty);
            spikyRim.lineTo(bx1, by1);
          }
          spikyRim.closePath();
          fillRimAndStroke(
            ctx,
            spikyRim,
            fx - rx - 7,
            cyFruit - ry - 7,
            fx + rx + 7,
            cyFruit + ry + 7,
            '#d9f99d',
            '#65a30d',
            '#365314',
            '#1a2e05',
            2.6,
          );

          // Individual sunlit/shaded 3D facets on every outer perimeter thorn
          for (let i = 0; i < numRimSpikes; i++) {
            const a0 = (i / numRimSpikes) * Math.PI * 2;
            const aMid = ((i + 0.5) / numRimSpikes) * Math.PI * 2;
            const bx0 = fx + Math.cos(a0) * rx * 0.92;
            const by0 = cyFruit + Math.sin(a0) * ry * 0.92;
            const tx = fx + Math.cos(aMid) * (rx + 6.4 * scaleF);
            const ty = cyFruit + Math.sin(aMid) * (ry + 6.4 * scaleF);
            const mx = fx + Math.cos(aMid) * rx * 0.88;
            const my = cyFruit + Math.sin(aMid) * ry * 0.88;
            ctx.fillStyle = '#ecfccb';
            ctx.beginPath();
            ctx.moveTo(bx0, by0);
            ctx.lineTo(tx, ty);
            ctx.lineTo(mx, my);
            ctx.closePath();
            ctx.fill();
          }

          // 3. Longitudinal 5-locule carpel suture grooves curving in 3D
          ctx.strokeStyle = '#26380a';
          ctx.lineWidth = 1.7;
          ctx.beginPath();
          ctx.moveTo(fx, cyFruit - ry * 0.92);
          ctx.quadraticCurveTo(fx - 9 * scaleF + yaw * 4, cyFruit, fx, cyFruit + ry * 0.92);
          ctx.moveTo(fx, cyFruit - ry * 0.92);
          ctx.quadraticCurveTo(fx + 9 * scaleF + yaw * 4, cyFruit, fx, cyFruit + ry * 0.92);
          ctx.stroke();

          // 4. Dense interior rows of 3D 4-sided pyramidal Durian thorns pointing radially outward
          for (let row = -3; row <= 3; row++) {
            const normY = row / 3.6;
            const ty = cyFruit + normY * ry * 0.78;
            const rowHalfW = Math.sqrt(Math.max(0, 1 - normY * normY)) * rx * 0.76;
            const stepX = 6.6 * scaleF;
            for (let ox = -rowHalfW; ox <= rowHalfW + 0.1; ox += stepX) {
              const tx = fx + ox + (Math.abs(row) % 2 === 1 ? stepX * 0.35 : 0);
              const radX = (tx - fx) / rx;
              const radY = (ty - cyFruit) / ry;
              const tipX = tx + radX * 3.4 * scaleF;
              const tipY = ty - 4.8 * scaleF + radY * 2.2 * scaleF;
              const baseW = 3.6 * scaleF;
              const baseY = ty + 2.8 * scaleF;

              // Left sunlit 3D pyramid face
              ctx.fillStyle = '#ecfccb';
              ctx.beginPath();
              ctx.moveTo(tx - baseW, baseY);
              ctx.lineTo(tipX, tipY);
              ctx.lineTo(tx, baseY + 0.8);
              ctx.closePath();
              ctx.fill();

              // Right shaded 3D pyramid face
              ctx.fillStyle = '#3f6212';
              ctx.beginPath();
              ctx.moveTo(tipX, tipY);
              ctx.lineTo(tx + baseW, baseY);
              ctx.lineTo(tx, baseY + 0.8);
              ctx.closePath();
              ctx.fill();

              // Crisp dark-olive thorn ridge stroke
              ctx.strokeStyle = '#1a2e05';
              ctx.lineWidth = 1.15;
              ctx.beginPath();
              ctx.moveTo(tx - baseW, baseY);
              ctx.lineTo(tipX, tipY);
              ctx.lineTo(tx + baseW, baseY);
              ctx.stroke();
            }
          }
        }
        break;
      }

      /* ========================================================================
       * P04: MANGOSTEEN TREE (plant_04_mangosteen_tree)
       * Pyramidal dark-barked orchard tree with glossy leathery opposite leaves,
       * rose-pink blossom clusters, and deep purple mangosteen fruits with 4-lobed calyces.
       * ====================================================================== */
      case 'plant_04_mangosteen_tree': {
        drawWoodyTrunkAndBranches(ctx, sway, 195, 28, 14, '#785238', '#4f331f', '#2e1c0f', false);
        drawCanopyCrown(ctx, 0, -102, 132, 84, sway, '#4ade80', '#15803d', '#064e3b', '#052e16', ['#fbcfe8', '#f472b6', '#db2777', '#facc15']);
        for (const [mx, my] of (
          [
            [-64, -84],
            [56, -88],
            [-8, -118],
            [34, -52],
            [-48, -46],
          ] as const
        ).slice(0, activePlantGrowthStage >= 3 && activePlantFruitCount > 0 ? activePlantFruitCount : 0)) {
          const fx = mx + sway * 22;
          const fy = my;
          // Short woody pedicel attaching mangosteen to twig
          ctx.strokeStyle = '#365314';
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(fx, fy - 24);
          ctx.lineTo(fx, fy - 14);
          ctx.stroke();

          const fruit = new Path2D();
          fruit.arc(fx, fy, 17.5, 0, Math.PI * 2);
          fillRimAndStroke(ctx, fruit, fx - 17, fy - 17, fx + 17, fy + 17, '#a855f7', '#4c1d95', '#1e0936', '#140524', 2.8);
          // Glossy specular highlight & 6-rayed bottom stigma rosette star (Tampuk Manggis)
          ctx.fillStyle = 'rgba(255,255,255,0.38)';
          ctx.beginPath();
          ctx.ellipse(fx - 6, fy - 4, 5.5, 3.2, -0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#d8b4fe';
          ctx.strokeStyle = '#2e1065';
          ctx.lineWidth = 1.2;
          for (let st = 0; st < 6; st++) {
            const sa = (st * Math.PI) / 3;
            ctx.beginPath();
            ctx.ellipse(fx + Math.cos(sa) * 3.2, fy + 11 + Math.sin(sa) * 2.2, 2.2, 1.4, sa, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
          // Sculpted 4-sepal leathery green mangosteen calyx crown cap
          for (const [cxOff, cyOff, rot] of [
            [-9, -14, -0.45],
            [9, -14, 0.45],
            [-3.5, -16, -0.15],
            [3.5, -16, 0.15],
          ] as const) {
            ctx.fillStyle = '#84cc16';
            ctx.strokeStyle = '#1a2e05';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(fx + cxOff, fy + cyOff, 6.5, 4.2, rot, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }
        break;
      }

      /* ========================================================================
       * P05: BANANA PLANT / POKOK PISANG (plant_05_banana_plant)
       * Sheathed green pseudostem with leaf-sheath V-seams, huge veined emerald
       * paddle fronds, multi-tier golden banana bunch, and crimson-purple jantung bell.
       * ====================================================================== */
      case 'plant_05_banana_plant': {
        // Mother pseudostem with overlapping leaf-sheath striation seams stuffed into soil
        const stem = new Path2D();
        stem.moveTo(-28, 178);
        stem.quadraticCurveTo(-19, 42, -15 + sway * 16, -48);
        stem.lineTo(15 + sway * 16, -48);
        stem.quadraticCurveTo(19, 42, 28, 178);
        stem.closePath();
        fillRimAndStroke(ctx, stem, -28, -48, 28, 178, '#bef264', '#65a30d', '#365314', '#1a2e05', 3.4);
        ctx.save();
        ctx.clip(stem);
        ctx.strokeStyle = 'rgba(26, 46, 5, 0.35)';
        ctx.lineWidth = 2.2;
        for (const sy of [-10, 35, 80, 120]) {
          ctx.beginPath();
          ctx.moveTo(-24, sy);
          ctx.quadraticCurveTo(0, sy + 16, 24, sy);
          ctx.stroke();
        }
        ctx.restore();

        // Young sucker shoot leaves at base + broad tropical banana paddle fronds
        drawDetailedLeaf(ctx, -22, 132, -2.35 + sway * 0.08, 68, 20, '#bef264', '#65a30d', '#1a2e05', '#ecfccb', '#1a2e05', true);
        drawDetailedLeaf(ctx, 22, 132, -0.78 + sway * 0.08, 68, 20, '#bef264', '#65a30d', '#1a2e05', '#ecfccb', '#1a2e05', true);

        for (const [ang, len, w] of [
          [-2.62, 195, 44],
          [-2.15, 218, 48],
          [-1.82, 205, 44],
          [-1.57, 212, 46],
          [-1.32, 205, 44],
          [-1.0, 218, 48],
          [-0.52, 195, 44],
        ] as const) {
          drawBananaPaddleLeaf(ctx, sway * 16, -48, ang + sway * 0.12, len, w, '#bef264', '#65a30d', '#1a2e05', '#172916');
        }

        if (activePlantGrowthStage >= 2) {
          // Arching peduncle stalk seamlessly emerging from crown to hold banana hands (sisir pisang) & Jantung flower bell
          const bx = 46 + sway * 20;
          const by = -12;
          ctx.strokeStyle = '#4d7c0f';
          ctx.lineWidth = 6.5;
          ctx.beginPath();
          ctx.moveTo(sway * 16, -46);
          ctx.quadraticCurveTo(bx - 6, -38, bx, by + 56);
          ctx.stroke();

          // 3 tiered hands (sisir) of curved golden-yellow banana fingers with green pedicel necks & dark floral stylar tips
          const handsCount = activePlantGrowthStage >= 3 && activePlantFruitCount > 0 ? Math.min(3, activePlantFruitCount) : 0;
          for (let r = 0; r < handsCount; r++) {
            const handY = by + r * 15;
            // Cushion collar node on rachis
            ctx.fillStyle = '#65a30d';
            ctx.strokeStyle = '#1a2e05';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.ellipse(bx, handY - 8, 16, 4.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            for (let c = -3; c <= 3; c++) {
              const fx = bx + c * 6.2;
              const fy = handY;
              const curve = c * 3.2;
              const finger = new Path2D();
              finger.moveTo(fx - 3.4, fy - 7);
              finger.quadraticCurveTo(fx + curve - 4.5, fy + 4, fx + curve * 0.85, fy + 14);
              finger.quadraticCurveTo(fx + curve + 4.5, fy + 4, fx + 3.4, fy - 7);
              finger.closePath();
              fillRimAndStroke(ctx, finger, fx - 6, fy - 7, fx + 6, fy + 14, '#fef9c3', '#facc15', '#ca8a04', '#713f12', 1.8);
              // Green pedicel neck & longitudinal facet highlight + dark floral remnant dot at tip
              ctx.fillStyle = '#84cc16';
              ctx.beginPath();
              ctx.ellipse(fx, fy - 6.2, 2.6, 1.8, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
              ctx.lineWidth = 1.1;
              ctx.beginPath();
              ctx.moveTo(fx - 0.8, fy - 4);
              ctx.quadraticCurveTo(fx + curve * 0.55, fy + 3, fx + curve * 0.72, fy + 10);
              ctx.stroke();
              ctx.fillStyle = '#291504';
              ctx.beginPath();
              ctx.arc(fx + curve * 0.85, fy + 13.5, 1.7, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          // Open bract with tubular white banana florets above the crimson Jantung Pisang bell
          drawFlowerClusterBlock(ctx, bx - 14, by + 46, 0.55, -0.4, '#fef9c3', '#fde047', '#eab308', '#ca8a04');
          const bell = new Path2D();
          bell.moveTo(bx, by + 50);
          bell.bezierCurveTo(bx - 21, by + 66, bx - 16, by + 98, bx, by + 112);
          bell.bezierCurveTo(bx + 16, by + 98, bx + 21, by + 66, bx, by + 50);
          bell.closePath();
          fillRimAndStroke(ctx, bell, bx - 19, by + 50, bx + 19, by + 112, '#fb7185', '#9f1239', '#4c0519', '#2b040e', 2.8);
          // Overlapping imbricate bract scales on the Jantung Pisang bell
          ctx.strokeStyle = 'rgba(255, 228, 230, 0.38)';
          ctx.lineWidth = 1.5;
          for (const sy of [68, 84, 96]) {
            ctx.beginPath();
            ctx.moveTo(bx - 12, by + sy);
            ctx.quadraticCurveTo(bx, by + sy + 8, bx + 12, by + sy);
            ctx.stroke();
          }
        }
        break;
      }

      /* ========================================================================
       * P06: PAPAYA TREE / POKOK BETIK (plant_06_papaya_tree)
       * Leaf-scarred hollow trunk, cauliflorous cluster of ripe orange-gold papayas
       * & cream papaya blossoms tucked under a crown of deeply lobed palmate leaves.
       * ====================================================================== */
      case 'plant_06_papaya_tree': {
        drawWoodyTrunkAndBranches(ctx, sway, 210, 24, 14, '#d6cfc2', '#9e9482', '#635b4c', false, []);
        const topX = sway * 18;
        const topY = -62;
        // Diamond leaf-scar markings along papaya trunk
        ctx.strokeStyle = 'rgba(72, 62, 48, 0.45)';
        ctx.lineWidth = 2.0;
        for (let sy = -30; sy <= 125; sy += 24) {
          ctx.beginPath();
          ctx.ellipse(topX * (1 - (sy + 62) / 210), sy, 9, 4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Long hollow petioles & deeply 7-lobed palmate papaya leaves
        for (const ang of [-2.65, -2.2, -1.78, -1.36, -0.94, -0.48]) {
          ctx.save();
          ctx.translate(topX, topY);
          ctx.rotate(ang + sway * 0.12);
          ctx.strokeStyle = '#84cc16';
          ctx.lineWidth = 5.2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(74, 0);
          ctx.stroke();
          for (const la of [-0.95, -0.6, -0.28, 0, 0.28, 0.6, 0.95]) {
            drawDetailedLeaf(ctx, 68, 0, la, 56, 13, '#86efac', '#16a34a', '#14532d', 'rgba(235,255,215,0.65)', '#142914', true);
          }
          ctx.restore();
        }

        // Creamy axillary papaya blossom clusters & ripe pyriform (pear-shaped) golden-orange papaya fruits
        if (activePlantGrowthStage >= 2) {
          drawFlowerClusterBlock(ctx, topX - 24, topY - 4, 0.58, -0.3, '#fefce8', '#fef08a', '#facc15', '#ea580c');
          drawFlowerClusterBlock(ctx, topX + 24, topY - 4, 0.58, 0.3, '#fefce8', '#fef08a', '#facc15', '#ea580c');
        }

        for (const [px, py, rot, ripeness] of (
          [
            [-22, 14, -0.4, 0.85],
            [22, 16, 0.4, 0.9],
            [-14, 36, -0.25, 1.0],
            [16, 38, 0.25, 1.0],
            [0, 24, 0, 0.95],
          ] as const
        ).slice(0, activePlantGrowthStage >= 3 && activePlantFruitCount > 0 ? activePlantFruitCount : 0)) {
          ctx.save();
          ctx.translate(topX + px, topY + py);
          ctx.rotate(rot);
          // Pyriform pear-shaped papaya contour with neck and 5 longitudinal carpel ribs
          const pap = new Path2D();
          pap.moveTo(0, -21);
          pap.bezierCurveTo(10, -18, 16, -2, 14, 14);
          pap.bezierCurveTo(11, 22, -11, 22, -14, 14);
          pap.bezierCurveTo(-16, -2, -10, -18, 0, -21);
          pap.closePath();
          fillRimAndStroke(
            ctx,
            pap,
            -15,
            -21,
            15,
            22,
            ripeness < 0.9 ? '#bef264' : '#fde047',
            '#f97316',
            '#c2410c',
            '#431407',
            2.6,
          );
          // Longitudinal papaya carpel furrow seams, green calyx collar & glossy highlight
          ctx.strokeStyle = 'rgba(124, 45, 18, 0.38)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(-2, -19);
          ctx.quadraticCurveTo(-6, 0, -2, 20);
          ctx.moveTo(2, -19);
          ctx.quadraticCurveTo(6, 0, 2, 20);
          ctx.stroke();
          ctx.fillStyle = '#65a30d';
          ctx.beginPath();
          ctx.ellipse(0, -19.5, 4.8, 2.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.38)';
          ctx.beginPath();
          ctx.ellipse(-4, -3, 3.2, 8.5, -0.08, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        break;
      }

      /* ========================================================================
       * P07: BAMBOO (plant_07_bamboo)
       * Clump of continuous segmented emerald-gold culm stalks with nodal rings,
       * seamlessly merged side branchlets, and feathery lanceolate bamboo foliage.
       * ====================================================================== */
      case 'plant_07_bamboo': {
        for (const [bx, tilt, colL, colM] of [
          [-48, -0.08, '#bef264', '#65a30d'],
          [0, 0.02, '#d9f99d', '#84cc16'],
          [48, 0.09, '#bef264', '#4d7c0f'],
        ] as const) {
          ctx.save();
          ctx.translate(bx, 152);
          ctx.rotate(tilt + sway * 0.08);
          // Continuous bamboo culm body (no detached gaps between internodes!)
          const culm = new Path2D();
          culm.moveTo(-14, 0);
          culm.lineTo(-11, -280);
          culm.lineTo(11, -280);
          culm.lineTo(14, 0);
          culm.closePath();
          fillRimAndStroke(ctx, culm, -14, -280, 14, 0, colL, colM, '#365314', '#1a2e05', 3.0);

          // Raised bamboo nodal rings across the continuous culm
          for (let seg = 1; seg <= 5; seg++) {
            const ny = -seg * 54;
            const nw = 15 - seg * 0.5;
            const node = new Path2D();
            node.ellipse(0, ny, nw, 4.2, 0, 0, Math.PI * 2);
            fillRimAndStroke(ctx, node, -nw, ny - 4, nw, ny + 4, '#ecfccb', colL, '#365314', '#1a2e05', 2.2);
          }

          // Seamlessly merged side bamboo twigs sprouting from the nodes + lanceolate leaf clusters
          for (const [ny, dir] of [
            [-108, 1],
            [-162, -1],
            [-216, 1],
            [-270, -1],
          ] as const) {
            ctx.strokeStyle = '#365314';
            ctx.lineWidth = 3.4;
            ctx.beginPath();
            ctx.moveTo(dir * 10, ny);
            ctx.quadraticCurveTo(dir * 26, ny - 14, dir * 38, ny - 26);
            ctx.stroke();
            for (const la of [-0.42, -0.1, 0.22, 0.52]) {
              drawDetailedLeaf(
                ctx,
                dir * 28,
                ny - 18,
                (dir === 1 ? -0.35 : -2.78) + la + sway * 0.15,
                68,
                11.5,
                '#a3e635',
                '#16a34a',
                '#14532d',
                'rgba(240,255,220,0.65)',
                '#142914',
                true,
              );
            }
          }
          ctx.restore();
        }
        break;
      }

      /* ========================================================================
       * P08: TROPICAL PITCHER PLANT (plant_08_tropical_pitcher_plant)
       * Central mother vine stem with veined rosette leaves, continuous curling
       * tendrils connecting leaf tips to spotted Nepenthes pitchers, and flower spike.
       * ====================================================================== */
      case 'plant_08_tropical_pitcher_plant': {
        // Central woody climbing vine stem & terminal flower raceme
        drawWoodyTrunkAndBranches(ctx, sway, 155, 16, 9, '#a3e635', '#4d7c0f', '#1a2e05', false, [
          [-0.4, -0.55, -52, -24, 10],
          [0.4, -0.62, 52, -26, 10],
        ]);
        drawFlowerClusterBlock(ctx, sway * 18, -32, 0.72, sway * 0.08, '#fde047', '#eab308', '#ca8a04', '#991b1b');

        for (const [ang, len] of [
          [-2.5, 132],
          [-2.05, 142],
          [-1.08, 142],
          [-0.62, 132],
        ] as const) {
          drawDetailedLeaf(ctx, sway * 8, 72, ang + sway * 0.1, len, 32, '#86efac', '#16a34a', '#14532d', 'rgba(240,255,220,0.65)', '#142914', true);
        }

        // Continuous curling tendrils connecting leaves to detailed Nepenthes pitchers
        for (const [px, py, sc, dir] of [
          [-78, -4, 1.0, -1],
          [76, -18, 1.1, 1],
        ] as const) {
          const pX = px + sway * 20;
          const pY = py;
          // Continuous tendril loop from leaf tip into the base of the pitcher urn
          ctx.strokeStyle = '#3f6212';
          ctx.lineWidth = 4.2;
          ctx.beginPath();
          ctx.moveTo(dir * 42 + sway * 12, 42);
          ctx.bezierCurveTo(dir * 96 + sway * 16, 86, pX - dir * 18, pY + 114, pX, pY + 78 * sc);
          ctx.stroke();

          ctx.save();
          ctx.translate(pX, pY);
          ctx.scale(sc, sc);
          ctx.rotate(sway * 0.1);
          const urn = new Path2D();
          urn.moveTo(-26, -42);
          urn.bezierCurveTo(-48, 18, -42, 78, 0, 82);
          urn.bezierCurveTo(42, 78, 48, 18, 26, -42);
          urn.closePath();
          fillRimAndStroke(ctx, urn, -44, -42, 44, 82, '#fb7185', '#be123c', '#4c0519', '#2b040e', 3.4);
          // Crimson blotches & winged fringe on Nepenthes pitcher belly
          ctx.save();
          ctx.clip(urn);
          ctx.fillStyle = 'rgba(76, 5, 25, 0.55)';
          for (const [sx, sy, sr] of [
            [-14, 12, 8],
            [12, 22, 9],
            [-8, 46, 10],
            [14, 54, 7],
            [0, -8, 7],
          ]) {
            ctx.beginPath();
            ctx.ellipse(sx, sy, sr, sr * 1.3, 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // Ribbed peristome lip collar
          const rim = new Path2D();
          rim.ellipse(0, -42, 34, 12, 0, 0, Math.PI * 2);
          fillRimAndStroke(ctx, rim, -34, -54, 34, -30, '#fde047', '#84cc16', '#3f6212', '#2b040e', 3.0);
          ctx.strokeStyle = '#9f1239';
          ctx.lineWidth = 1.6;
          for (let rx = -24; rx <= 24; rx += 6) {
            ctx.beginPath();
            ctx.moveTo(rx, -52);
            ctx.lineTo(rx * 0.9, -31);
            ctx.stroke();
          }
          // Vaulted operculum lid above the pitcher mouth
          drawDetailedLeaf(ctx, 18, -52, -2.2, 54, 22, '#fda4af', '#e11d48', '#881337', 'rgba(255,240,245,0.6)', '#2b040e', true);
          ctx.restore();
        }
        break;
      }

      /* ========================================================================
       * P09: BIRD'S NEST FERN (plant_09_birds_nest_fern)
       * Epiphytic mother tree branch cradle, spongy dark-brown fibrous root basket,
       * and radiating crown of apple-green strap fronds with undulating margins.
       * ====================================================================== */
      case 'plant_09_birds_nest_fern': {
        // Fibrous root base stuffed directly into the ground
        const nest = new Path2D();
        nest.moveTo(-36, 136);
        nest.quadraticCurveTo(-40, 158, -32, 178);
        nest.lineTo(32, 178);
        nest.quadraticCurveTo(40, 158, 36, 136);
        nest.closePath();
        fillRimAndStroke(ctx, nest, -40, 136, 40, 178, '#785233', '#4f331d', '#2b1a0c', '#1c1007', 3.0);
        for (const [ang, len, w] of [
          [-2.72, 188, 30],
          [-2.36, 218, 34],
          [-2.02, 238, 36],
          [-1.72, 250, 38],
          [-1.57, 256, 40],
          [-1.42, 250, 38],
          [-1.12, 238, 36],
          [-0.78, 218, 34],
          [-0.42, 188, 30],
        ] as const) {
          drawDetailedLeaf(ctx, sway * 10, 146, ang + sway * 0.1, len, w, '#bef264', '#65a30d', '#365314', '#1a2e05', '#1a2e05', true);
        }
        break;
      }

      /* ========================================================================
       * P10: TORCH GINGER / BUNGA KANTAN (plant_10_torch_ginger)
       * Clump of leafy ginger pseudostems with pinnate-veined blades and multi-tier
       * waxy rose-pink Bunga Kantan inflorescence torches with golden-rimmed florets.
       * ====================================================================== */
      case 'plant_10_torch_ginger': {
        for (const [lx, ang, len] of [
          [-54, -2.15, 220],
          [54, -0.98, 220],
          [-32, -1.9, 244],
          [32, -1.24, 244],
          [-16, -1.72, 230],
          [16, -1.42, 230],
        ] as const) {
          drawDetailedLeaf(ctx, lx, 148, ang + sway * 0.1, len, 34, '#86efac', '#16a34a', '#14532d', 'rgba(240,255,220,0.65)', '#142914', true);
        }

        // Main & secondary Torch Ginger floral scapes emerging seamlessly from rhizome base
        for (const [offsetX, topY, sc] of (activePlantGrowthStage >= 2
          ? [
            [-52, -18, 0.72],
            [54, -12, 0.68],
            [0, -68, 1.05],
          ]
          : []) as ReadonlyArray<readonly [number, number, number]>) {
          const tx = offsetX + sway * 24 * sc;
          ctx.strokeStyle = '#65a30d';
          ctx.lineWidth = 9 * sc;
          ctx.beginPath();
          ctx.moveTo(offsetX * 0.4, 152);
          ctx.quadraticCurveTo(tx * 0.7, 40, tx, topY + 12);
          ctx.stroke();

          ctx.save();
          ctx.translate(tx, topY);
          ctx.scale(sc, sc);
          ctx.rotate(sway * 0.1);
          for (const [by, count, rad, w] of [
            [32, 6, 62, 24],
            [8, 5, 52, 22],
            [-14, 4, 42, 20],
            [-32, 3, 32, 16],
          ] as const) {
            for (let i = 0; i < count; i++) {
              const a = -Math.PI / 2 + (i - (count - 1) / 2) * 0.42;
              drawDetailedLeaf(ctx, 0, by, a, rad, w, '#fda4af', '#f43f5e', '#9f1239', 'rgba(255,245,235,0.75)', '#4c0519');
            }
          }
          ctx.restore();
        }
        break;
      }

      /* ========================================================================
       * P11: HIBISCUS / BUNGA RAYA (plant_11_hibiscus)
       * Woody mother shrub with seamlessly merged sub-branches, serrated emerald
       * leaves, multi-block flower clusters, and hero crimson 5-petal Bunga Raya.
       * ====================================================================== */
      case 'plant_11_hibiscus': {
        drawWoodyTrunkAndBranches(ctx, sway, 155, 24, 12, '#8c6239', '#603913', '#3b2108', false, [
          [-0.45, -0.58, -86, -48, 15],
          [0.45, -0.56, 86, -46, 15],
          [-0.3, -0.82, -62, -52, 12],
          [0.3, -0.82, 62, -52, 12],
        ]);
        for (const [lx, ly, ang, len] of [
          [-34, 72, -2.45, 86],
          [34, 68, -0.68, 86],
          [-48, 18, -2.25, 84],
          [48, 14, -0.88, 84],
          [-64, -32, -2.05, 76],
          [64, -34, -1.08, 76],
          [-22, -62, -1.85, 72],
          [22, -62, -1.28, 72],
        ] as const) {
          drawDetailedLeaf(ctx, lx + sway * 14, ly, ang + sway * 0.12, len, 30, '#7ed957', '#388e3c', '#1b5e20', 'rgba(220,255,195,0.65)', '#123014', true);
        }

        if (activePlantGrowthStage >= 2) {
          // 5 full, distinct 5-petaled scarlet Bunga Raya blossoms across the shrub branches!
          for (const [hx, hy, hRad, hTilt] of [
            [-78, -36, 56, -0.34],
            [78, -32, 56, 0.34],
            [-44, -84, 52, -0.18],
            [44, -82, 52, 0.18],
            [0, -48, 74, 0.04],
          ] as const) {
            const bx = hx + sway * 22;
            const by = hy;
            drawBlossom(ctx, bx, by, hRad, hTilt + sway * 0.08, '#ff6b81', '#e11d48', '#881337', '#4c0519', '#2e0510', 5);
            const stScale = hRad / 86;
            ctx.strokeStyle = '#fb7185';
            ctx.lineWidth = 4.8 * stScale;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.quadraticCurveTo(
              bx + 26 * stScale + hTilt * 18,
              by - 34 * stScale,
              bx + 42 * stScale + hTilt * 24 + sway * 8,
              by - 62 * stScale,
            );
            ctx.stroke();
            for (const [ax, ay] of [
              [30, -46],
              [38, -54],
              [26, -52],
              [42, -62],
              [34, -59],
            ]) {
              ctx.fillStyle = '#facc15';
              ctx.strokeStyle = '#713f12';
              ctx.lineWidth = 1.3;
              ctx.beginPath();
              ctx.arc(
                bx + ax * stScale + hTilt * 20 + sway * 6,
                by + ay * stScale,
                4.2 * stScale,
                0,
                Math.PI * 2,
              );
              ctx.fill();
              ctx.stroke();
            }
          }
        }
        break;
      }

      /* ========================================================================
       * P12: IXORA / BUNGA PECAH PERIUK (plant_12_ixora)
       * Compact woody mother shrub with opposite glossy leaves, dark-crimson berry
       * clusters, and hemispherical corymb domes of 4-petaled fiery scarlet florets.
       * ====================================================================== */
      case 'plant_12_ixora': {
        drawWoodyTrunkAndBranches(ctx, sway, 155, 24, 12, '#8c6239', '#5c3c1e', '#36210e', false);
        drawCanopyCrown(ctx, 0, -38, 124, 72, sway, '#4ade80', '#16a34a', '#14532d', '#142914', ['#fca5a5', '#ef4444', '#991b1b', '#fef08a']);
        for (const [cxOff, cyOff] of (activePlantGrowthStage >= 2
          ? [
            [-68, -72],
            [68, -68],
            [0, -108],
            [-32, -42],
            [34, -40],
          ]
          : []) as ReadonlyArray<readonly [number, number]>) {
          for (const [fx, fy] of [
            [-16, -6],
            [16, -6],
            [0, -20],
            [0, 8],
            [-10, -16],
            [10, -16],
          ]) {
            drawBlossom(ctx, cxOff + fx + sway * 22, cyOff + fy, 19, 0.4 + sway * 0.1, '#fca5a5', '#ef4444', '#991b1b', '#fef08a', '#450a0a', 4);
          }
        }
        break;
      }

      /* ========================================================================
       * P13: COCONUT PALM / POKOK KELAPA (plant_13_coconut_palm)
       * Graceful curved ringed coastal trunk, golden flower spadix, cluster of
       * detailed coconuts, and crown of sweeping feather-pinnate palm fronds.
       * ====================================================================== */
      case 'plant_13_coconut_palm': {
        const topX = 24 + sway * 24;
        const topY = -92;
        const trunk = new Path2D();
        trunk.moveTo(-28, 178);
        trunk.bezierCurveTo(-18, 42, -4, -32, topX - 12, topY);
        trunk.lineTo(topX + 12, topY);
        trunk.bezierCurveTo(16, -28, 14, 42, 24, 178);
        trunk.closePath();
        fillRimAndStroke(ctx, trunk, -28, topY, 28, 178, '#c2a687', '#8c6d4e', '#523d28', '#2b1f13', 3.4);

        // Ringed leaf-scar bands along curved coconut trunk
        ctx.save();
        ctx.clip(trunk);
        ctx.strokeStyle = 'rgba(43, 31, 19, 0.42)';
        ctx.lineWidth = 2.2;
        for (let ry = -70; ry <= 140; ry += 22) {
          ctx.beginPath();
          ctx.moveTo(-30, ry);
          ctx.quadraticCurveTo(8, ry + 8, 35, ry - 2);
          ctx.stroke();
        }
        ctx.restore();

        // Pinnate coconut fronds with individual leaflets along each rachis
        for (const [ang, len, arch] of [
          [-2.78, 155, -1],
          [-2.28, 178, -1],
          [-1.72, 168, -1],
          [-1.12, 178, 1],
          [-0.52, 158, 1],
          [0.08, 138, 1],
        ] as const) {
          drawRainforestFernFrond(ctx, topX, topY, ang, len, arch, sway);
        }

        // Golden coconut flower spadix & cluster of three-angled coconuts with perianth cap & trigonal ridge
        if (activePlantGrowthStage >= 2) {
          drawFlowerClusterBlock(ctx, topX - 28, topY + 8, 0.65, -0.5, '#fef9c3', '#fde047', '#eab308', '#ca8a04');
        }
        for (const [nx, ny] of (
          [
            [-18, 12],
            [18, 14],
            [-8, 30],
            [14, 32],
            [0, 18],
          ] as const
        ).slice(0, activePlantGrowthStage >= 3 && activePlantFruitCount > 0 ? activePlantFruitCount : 0)) {
          const cxNut = topX + nx;
          const cyNut = topY + ny;
          const nut = new Path2D();
          nut.moveTo(cxNut, cyNut - 17);
          nut.bezierCurveTo(cxNut + 16, cyNut - 14, cxNut + 17, cyNut + 10, cxNut, cyNut + 19);
          nut.bezierCurveTo(cxNut - 17, cyNut + 10, cxNut - 16, cyNut - 14, cxNut, cyNut - 17);
          nut.closePath();
          fillRimAndStroke(ctx, nut, cxNut - 16, cyNut - 17, cxNut + 16, cyNut + 19, '#d9f99d', '#65a30d', '#3f6212', '#1a2e05', 2.6);
          // Trigonal husk ridge & woody perianth calyx cap at top of coconut
          ctx.strokeStyle = 'rgba(26, 46, 5, 0.42)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cxNut, cyNut - 14);
          ctx.quadraticCurveTo(cxNut - 4, cyNut + 2, cxNut, cyNut + 17);
          ctx.stroke();
          // Specular highlight & multi-layered imbricate perianth calyx cap at top of coconut
          ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
          ctx.beginPath();
          ctx.ellipse(cxNut - 5, cyNut - 4, 3.4, 7.2, -0.25, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#78522b';
          ctx.strokeStyle = '#26170a';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.ellipse(cxNut, cyNut - 15, 7.2, 3.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        break;
      }

      /* ========================================================================
       * P14: BANYAN FIG / POKOK JEJAWI (plant_14_banyan_fig)
       * Ancient braided trunk with curtain of hanging aerial pillar roots, wide
       * spreading emerald tiers, individual leaves, and crimson syconia figs.
       * ====================================================================== */
      case 'plant_14_banyan_fig': {
        drawWoodyTrunkAndBranches(ctx, sway, 190, 44, 24, '#a88b73', '#6e5239', '#3d2b1c', true, [
          [-0.52, -0.68, -116, -34, 20],
          [0.52, -0.68, 116, -32, 20],
          [-0.32, -0.88, -74, -48, 16],
          [0.32, -0.88, 74, -48, 16],
        ]);
        // Sculpted tapering aerial prop roots merging seamlessly from the horizontal boughs to the ground
        for (const rx of [-88, -62, -40, 40, 62, 88]) {
          const topRx = rx + sway * 18;
          const botRx = rx * 0.88;
          const propP = new Path2D();
          propP.moveTo(topRx - 3.5, -52);
          propP.quadraticCurveTo(rx * 0.78 + sway * 8 - 4.5, 48, botRx - 6.5, 154);
          propP.lineTo(botRx + 6.5, 154);
          propP.quadraticCurveTo(rx * 0.78 + sway * 8 + 4.5, 48, topRx + 3.5, -52);
          propP.closePath();
          fillRimAndStroke(ctx, propP, topRx - 6, -52, botRx + 6, 154, '#9c7e65', '#6e5239', '#3d2b1c', '#26170c', 2.4);
        }
        drawCanopyCrown(ctx, -92, -64, 74, 44, sway, '#86efac', '#16a34a', '#14532d', '#142914', ['#fde68a', '#f59e0b', '#d97706', '#991b1b']);
        drawCanopyCrown(ctx, 92, -60, 74, 44, sway, '#86efac', '#16a34a', '#14532d', '#142914', ['#fde68a', '#f59e0b', '#d97706', '#991b1b']);
        drawCanopyCrown(ctx, 0, -118, 124, 64, sway * 1.1, '#bbf7d0', '#22c55e', '#166534', '#142914', ['#fde68a', '#f59e0b', '#d97706', '#991b1b']);
        // Paired crimson-scarlet Banyan syconia figs with ostiole pore & lenticel speckles
        for (const [fx, fy] of (
          [
            [-74, -56],
            [-58, -62],
            [72, -52],
            [56, -58],
            [-18, -104],
            [22, -108],
          ] as const
        ).slice(0, activePlantGrowthStage >= 3 && activePlantFruitCount > 0 ? activePlantFruitCount * 2 : 0)) {
          const cxFig = fx + sway * 20;
          const fig = new Path2D();
          fig.arc(cxFig, fy, 9.8, 0, Math.PI * 2);
          fillRimAndStroke(ctx, fig, cxFig - 10, fy - 10, cxFig + 10, fy + 10, '#fda4af', '#e11d48', '#881337', '#3b0412', 2.0);
          // Basal green bract collar & glossy specular highlight
          ctx.fillStyle = '#65a30d';
          ctx.beginPath();
          ctx.ellipse(cxFig, fy - 8.5, 4.2, 1.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.42)';
          ctx.beginPath();
          ctx.ellipse(cxFig - 3, fy - 3, 2.6, 1.6, -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(cxFig - 2.5, fy - 2.5, 1.4, 0, Math.PI * 2);
          ctx.arc(cxFig + 3, fy - 1, 1.2, 0, Math.PI * 2);
          ctx.arc(cxFig - 1, fy + 2, 1.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#4c0519';
          ctx.beginPath();
          ctx.arc(cxFig, fy + 6.0, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      /* ========================================================================
       * P15: RAMBUTAN TREE (plant_15_rambutan_tree)
       * Lush orchard mother tree laden with multi-block blossom clusters and
       * bunches of crimson-scarlet Rambutan fruits covered in golden spintern hairs.
       * ====================================================================== */
      case 'plant_15_rambutan_tree': {
        drawWoodyTrunkAndBranches(ctx, sway, 195, 28, 14, '#8c6546', '#5e4028', '#382313', false);
        drawCanopyCrown(ctx, 0, -104, 134, 82, sway, '#86efac', '#16a34a', '#14532d', '#142914', ['#ecfccb', '#bef264', '#84cc16', '#facc15']);
        // Branched fruiting panicle stalks connecting rambutan bunches to crown
        for (const [bx, by] of [
          [-52, -96],
          [56, -86],
          [6, -124],
        ] as const) {
          ctx.strokeStyle = '#4d7c0f';
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.moveTo(bx + sway * 22, by - 14);
          ctx.lineTo(bx - 16 + sway * 22, by + 16);
          ctx.moveTo(bx + sway * 22, by - 14);
          ctx.lineTo(bx + 16 + sway * 22, by + 16);
          ctx.stroke();
        }
        for (const [rx, ry] of (
          [
            [-72, -76],
            [-50, -94],
            [-34, -72],
            [54, -82],
            [74, -64],
            [38, -66],
            [-6, -118],
            [18, -104],
          ] as const
        ).slice(0, activePlantGrowthStage >= 3 && activePlantFruitCount > 0 ? activePlantFruitCount * 2 : 0)) {
          const fx = rx + sway * 22;
          const fy = ry;
          const ramb = new Path2D();
          ramb.ellipse(fx, fy, 14.5, 17.5, 0.15, 0, Math.PI * 2);
          fillRimAndStroke(ctx, ramb, fx - 14, fy - 17, fx + 14, fy + 17, '#fb7185', '#e11d48', '#881337', '#4c0519', 2.4);
          // Raised pericarp tubercles & soft curling golden-lime-tipped spintern hairs around & across Rambutan fruit
          for (const [txOff, tyOff] of [
            [-5, -6],
            [5, -5],
            [0, 2],
            [-6, 7],
            [5, 8],
          ] as const) {
            ctx.fillStyle = '#be123c';
            ctx.beginPath();
            ctx.arc(fx + txOff, fy + tyOff, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(fx + txOff, fy + tyOff);
            ctx.quadraticCurveTo(fx + txOff * 1.5, fy + tyOff - 4, fx + txOff * 1.8, fy + tyOff + 2);
            ctx.stroke();
          }
          ctx.strokeStyle = '#bef264';
          ctx.lineWidth = 1.8;
          for (let a = 0; a < 16; a++) {
            const ang = (a / 16) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(fx + Math.cos(ang) * 11, fy + Math.sin(ang) * 14);
            ctx.quadraticCurveTo(
              fx + Math.cos(ang + 0.22) * 18,
              fy + Math.sin(ang + 0.22) * 21,
              fx + Math.cos(ang + 0.08) * 21,
              fy + Math.sin(ang + 0.08) * 24,
            );
            ctx.stroke();
          }
        }
        break;
      }

      /* ========================================================================
       * P16: SUGAR PALM / POKOK KABUNG (plant_16_sugar_palm)
       * Stout trunk wrapped in dark-black cross-hatched ijuk horsehair fibers,
       * pinnate feather fronds, and pendulous strings of golden-green kabung fruits.
       * ====================================================================== */
      case 'plant_16_sugar_palm': {
        drawWoodyTrunkAndBranches(ctx, sway, 200, 32, 22, '#574c44', '#362e29', '#1c1714', false, []);
        const topX = sway * 18;
        const topY = -52;
        // Cross-hatched black ijuk fiber weave along trunk
        ctx.strokeStyle = 'rgba(15, 10, 8, 0.55)';
        ctx.lineWidth = 2.0;
        for (let iy = -35; iy <= 135; iy += 18) {
          ctx.beginPath();
          ctx.moveTo(-20, iy);
          ctx.lineTo(20, iy + 12);
          ctx.moveTo(20, iy);
          ctx.lineTo(-20, iy + 12);
          ctx.stroke();
        }
        // Pinnate Sugar Palm fronds with individual leaflets
        for (const [ang, len, arch] of [
          [-2.6, 162, -1],
          [-2.12, 174, -1],
          [-1.72, 168, -1],
          [-1.4, 168, 1],
          [-0.98, 174, 1],
          [-0.54, 162, 1],
        ] as const) {
          drawRainforestFernFrond(ctx, topX, topY, ang, len, arch, sway);
        }
        // Pendulous curtains of kabung (buah kolang-kaling) sugar-palm fruits & flower spikes
        for (const sx of (activePlantGrowthStage >= 3 && activePlantFruitCount > 0 ? [-38, -26, 26, 38].slice(0, activePlantFruitCount) : [])) {
          ctx.strokeStyle = '#3f6212';
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.moveTo(topX + sx * 0.5, topY + 8);
          ctx.lineTo(topX + sx, 68);
          ctx.stroke();
          for (let fy = -18; fy <= 64; fy += 14) {
            ctx.fillStyle = fy < 12 ? '#a3e635' : '#eab308';
            ctx.strokeStyle = '#365314';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(topX + sx, fy, 6.8, 7.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Persistent 3-sepal cupule cap at top of each kabung fruit
            ctx.fillStyle = '#3f6212';
            ctx.beginPath();
            ctx.ellipse(topX + sx, fy - 5.5, 4.5, 2.0, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      /* ========================================================================
       * P17: TREE FERN / PAKU GAJAH (plant_17_tree_fern)
       * Fibrous scaly dark caudex trunk, umbrella of lacy bipinnate fern fronds
       * with individual pinnae leaflets, and coiled golden-green koru crosiers.
       * ====================================================================== */
      case 'plant_17_tree_fern': {
        drawWoodyTrunkAndBranches(ctx, sway, 195, 24, 15, '#784e32', '#4f301b', '#2b180b', false, []);
        const topX = sway * 18;
        const topY = -47;
        for (const [ang, len, arch] of [
          [-2.72, 158, -1],
          [-2.28, 178, -1],
          [-1.85, 168, -1],
          [-1.28, 168, 1],
          [-0.86, 178, 1],
          [-0.42, 158, 1],
        ] as const) {
          drawRainforestFernFrond(ctx, topX, topY, ang, len, arch, sway);
        }
        // Coiled fiddlehead crosiers unfurling in center
        ctx.strokeStyle = '#84cc16';
        ctx.lineWidth = 6;
        for (const dir of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(topX, topY);
          ctx.quadraticCurveTo(topX + dir * 18, topY - 42, topX + dir * 28, topY - 58);
          ctx.arc(topX + dir * 22, topY - 58, 9, 0, Math.PI * 1.6);
          ctx.stroke();
        }
        break;
      }

      /* ========================================================================
       * P18: TROPICAL ORCHID (plant_18_tropical_orchid)
       * Pseudobulb base with lush strap leaves, branched mother flower scape,
       * and multi-block clusters of regal Malaysian orchid blossoms & buds.
       * ====================================================================== */
      case 'plant_18_tropical_orchid': {
        for (const ang of [-2.65, -2.28, -1.92, -1.22, -0.86, -0.48]) {
          drawDetailedLeaf(ctx, 0, 146, ang + sway * 0.06, 150, 25, '#86efac', '#16a34a', '#14532d', 'rgba(240,255,220,0.65)', '#142914', true);
        }
        // Main & branched secondary orchid flower scapes (merged without cut lines)
        const tx = sway * 28;
        ctx.strokeStyle = '#4c1d95';
        ctx.lineWidth = 7.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 146);
        ctx.quadraticCurveTo(sway * 18, 10, tx, -132);
        ctx.moveTo(sway * 14, 32);
        ctx.quadraticCurveTo(-52 + sway * 18, -12, -74 + sway * 22, -56);
        ctx.moveTo(sway * 16, 8);
        ctx.quadraticCurveTo(54 + sway * 18, -32, 76 + sway * 22, -72);
        ctx.stroke();

        // Small cauline bract leaves along the branched scape
        drawDetailedLeaf(ctx, sway * 14, 32, -2.3, 36, 12, '#86efac', '#16a34a', '#14532d');
        drawDetailedLeaf(ctx, sway * 16, 8, -0.8, 36, 12, '#86efac', '#16a34a', '#14532d');

        // Multi-blocks of orchid blossoms & buds across main and side branches
        if (activePlantGrowthStage >= 2) {
          drawFlowerClusterBlock(ctx, -74 + sway * 22, -58, 0.85, -0.35 + sway * 0.08, '#f5d0fe', '#d946ef', '#86198f', '#facc15');
          drawFlowerClusterBlock(ctx, 76 + sway * 22, -74, 0.85, 0.35 + sway * 0.08, '#f5d0fe', '#d946ef', '#86198f', '#facc15');

          for (const [bx, by, sc] of [
            [sway * 22 - 14, -28, 0.92],
            [tx + 10, -112, 1.05],
            [-42 + sway * 20, -84, 0.88],
            [42 + sway * 20, -92, 0.88],
          ] as const) {
            drawBlossom(ctx, bx, by, 52 * sc, sway * 0.1, '#f5d0fe', '#d946ef', '#86198f', '#facc15', '#4a044e', 5);
          }
        }
        break;
      }

      /* ========================================================================
       * P19: RED MANGROVE / BAKAU MINYAK (plant_19_red_mangrove)
       * Arching labyrinth of tall stilt/prop roots seamlessly merged into the trunk,
       * glossy opposite leaves, yellow-cream flower clusters, and hanging propagules.
       * ====================================================================== */
      case 'plant_19_red_mangrove': {
        // Seamlessly merged prop roots arching from lower trunk to mudflat
        for (const [sx, ctrlX, endX] of [
          [-12, -74, -124],
          [-7, -46, -78],
          [7, 46, 78],
          [12, 74, 124],
        ] as const) {
          const rootP = new Path2D();
          rootP.moveTo(sx + sway * 8 - 5, 42);
          rootP.quadraticCurveTo(ctrlX - 6, 92, endX - 5, 160);
          rootP.lineTo(endX + 5, 160);
          rootP.quadraticCurveTo(ctrlX + 6, 92, sx + sway * 8 + 5, 48);
          rootP.closePath();
          fillRimAndStroke(ctx, rootP, sx, 42, endX, 160, '#8c583a', '#5e371f', '#381e0e', '#261307', 2.8);
        }
        drawWoodyTrunkAndBranches(ctx, sway, 180, 22, 12, '#8c583a', '#5e371f', '#381e0e', false);
        drawCanopyCrown(ctx, 0, -98, 126, 72, sway, '#4ade80', '#15803d', '#052e16', '#052e16', ['#fef9c3', '#fde047', '#eab308', '#ca8a04']);
        // Elongated viviparous torpedo propagules with brown pericarp cap
        for (const [px, py] of (
          [
            [-74, -52],
            [-26, -44],
            [30, -48],
            [76, -54],
          ] as const
        ).slice(0, activePlantGrowthStage >= 3 && activePlantFruitCount > 0 ? activePlantFruitCount : 0)) {
          const fx = px + sway * 24;
          const cap = new Path2D();
          cap.ellipse(fx, py - 2, 7, 9, 0, 0, Math.PI * 2);
          fillRimAndStroke(ctx, cap, fx - 7, py - 11, fx + 7, py + 7, '#a16207', '#713f12', '#422006', '#271001', 2.2);
          const pr = new Path2D();
          pr.ellipse(fx, py + 26, 5.2, 28, sway * 0.15, 0, Math.PI * 2);
          fillRimAndStroke(ctx, pr, fx - 5, py, fx + 5, py + 54, '#bef264', '#65a30d', '#365314', '#1a2e05', 2.4);
        }
        break;
      }

      /* ========================================================================
       * P20: API-API MANGROVE (plant_20_api_api_mangrove)
       * Gnarled coastal mother trunk surrounded by vertical pencil pneumatophore
       * breathing roots, silvery-backed leaves, golden-orange flower blocks, and capsules.
       * ====================================================================== */
      case 'plant_20_api_api_mangrove': {
        drawWoodyTrunkAndBranches(ctx, sway, 185, 28, 14, '#8d6e63', '#5d4037', '#3e2723', false);
        drawCanopyCrown(ctx, 0, -96, 132, 78, sway, '#86efac', '#16a34a', '#14532d', '#142914', ['#fde68a', '#f59e0b', '#d97706', '#78350f']);
        // Heart-shaped green-gold Api-Api viviparous fruit capsules
        for (const [fx, fy] of (
          [
            [-64, -76],
            [58, -82],
            [4, -112],
            [-28, -56],
            [34, -58],
          ] as const
        ).slice(0, activePlantGrowthStage >= 3 && activePlantFruitCount > 0 ? activePlantFruitCount : 0)) {
          const cap = new Path2D();
          cap.ellipse(fx + sway * 22, fy, 11, 13, 0.15, 0, Math.PI * 2);
          fillRimAndStroke(ctx, cap, fx - 11, fy - 13, fx + 11, fy + 13, '#d9f99d', '#84cc16', '#3f6212', '#1a2e05', 2.4);
        }
        break;
      }

      /* ========================================================================
       * P21: NIPA PALM / NIPAH (plant_21_nipa_palm)
       * Estuarine rhizome with towering pinnate palm fronds, golden male flower
       * catkin spikes, and a globular armored brown infructescence fruit ball.
       * ====================================================================== */
      case 'plant_21_nipa_palm': {
        for (const [ang, len] of [
          [-2.35, 220],
          [-1.95, 250],
          [-1.57, 265],
          [-1.18, 250],
          [-0.78, 220],
        ] as const) {
          ctx.save();
          ctx.translate(0, 138);
          ctx.rotate(ang + sway * 0.12);
          ctx.strokeStyle = '#3f6212';
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(len * 0.5, -12, len, 0);
          ctx.stroke();
          for (let t = 0.22; t <= 0.92; t += 0.14) {
            drawDetailedLeaf(ctx, len * t, 0, -0.65, 54, 11, '#a3e635', '#4d7c0f', '#1a2e05', 'rgba(240,255,220,0.65)', '#142914', true);
            drawDetailedLeaf(ctx, len * t, 0, 0.65, 54, 11, '#a3e635', '#4d7c0f', '#1a2e05', 'rgba(240,255,220,0.65)', '#142914', true);
          }
          ctx.restore();
        }
        // Golden male flower catkin spikes beside the globular Nipa fruit head
        if (activePlantGrowthStage >= 2) {
          drawFlowerClusterBlock(ctx, -38 + sway * 10, 96, 0.78, -0.35, '#fef08a', '#eab308', '#ca8a04', '#713f12');
        }

        if (activePlantGrowthStage >= 3 && activePlantFruitCount > 0) {
          const fx = 28 + sway * 8;
          const fy = 114;
          // Curved woody peduncle stalk supporting the heavy Nipa fruit head
          ctx.strokeStyle = '#4d7c0f';
          ctx.lineWidth = 6.5;
          ctx.beginPath();
          ctx.moveTo(0, 148);
          ctx.quadraticCurveTo(fx * 0.6, 134, fx, fy);
          ctx.stroke();

          const fruitHead = new Path2D();
          fruitHead.arc(fx, fy, 36, 0, Math.PI * 2);
          fillRimAndStroke(ctx, fruitHead, fx - 36, fy - 36, fx + 36, fy + 36, '#d97706', '#78350f', '#451a03', '#271001', 3.4);
          // Armored polygonal woody Nipa carpel drupelets with central ridged umbo peaks
          for (const [cxOff, cyOff] of [
            [-15, -14],
            [3, -16],
            [18, -8],
            [-19, 4],
            [-1, 3],
            [17, 9],
            [-10, 19],
            [9, 21],
          ] as const) {
            const px = fx + cxOff;
            const py = fy + cyOff;
            ctx.fillStyle = '#92400e';
            ctx.strokeStyle = '#271001';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (let s = 0; s < 6; s++) {
              const sa = (s * Math.PI) / 3;
              const vx = px + Math.cos(sa) * 8.2;
              const vy = py + Math.sin(sa) * 7.6;
              if (s === 0) ctx.moveTo(vx, vy);
              else ctx.lineTo(vx, vy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(px - 1.5, py - 1.5, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      /* ========================================================================
       * P22, P23, P24: SEAGRASSES (Enhalus, Thalassia Turtle Grass, Eelgrass)
       * Continuous creeping rhizome stolon with root tufts, leaf sheaths, parallel
       * veined ribbon blades, and seagrass flowers/seed capsules.
       * 70% Realistic Botanical Morphology + 30% Stylized Charm:
       * Continuous creeping rhizome stolon with coarse black Enhalus bristle fibers,
       * anchoring root tufts, clasping basal leaf sheaths, multi-nerved parallel
       * + transverse cross-veined lacunae ribbon blades, and seagrass seed capsules.
       * ====================================================================== */
      case 'plant_22_tropical_seagrass_enhalus_acoroides':
      case 'plant_23_tropical_turtle_grass_thalassia_hemprichii':
      case 'plant_24_eelgrass': {
        const isTurtleGrass = assetId === 'plant_23_tropical_turtle_grass_thalassia_hemprichii';
        const isEel = assetId === 'plant_24_eelgrass';
        // Horizontal creeping mother rhizome stolon & anchoring rootlets

        // 1. Background depth tier of darker swaying seagrass blades (creates 3D meadow fullness)
        const count = isEel ? 6 : 4;
        for (let i = -count; i <= count; i++) {
          const bx = i * (isEel ? 18 : 26) + 9;
          const h = ((isTurtleGrass ? 180 : 220) - Math.abs(i) * 11) * 0.88;
          const bend = sway * 32 + Math.cos(pose.waveRaysPhase + i * 0.7) * 12;
          drawRealisticGrassBlade(
            ctx,
            bx,
            148,
            h,
            isTurtleGrass ? 11 : isEel ? 6.5 : 9.5,
            bend,
            '#34d399',
            '#059669',
            '#064e3b',
            '#022c22',
          );
        }

        // 2. Foreground hero seagrass ribbon blades stuffed directly into the seabed with basal sheaths & venation
        for (let i = -count; i <= count; i++) {
          const bx = i * (isEel ? 18 : 26);
          const h = (isTurtleGrass ? 195 : 240) - Math.abs(i) * 12;
          const w = isTurtleGrass ? 13.5 : isEel ? 7.5 : 10.8;
          ctx.save();
          ctx.translate(bx, 168);
          const blade = new Path2D();
          const bend = sway * 38 + Math.sin(pose.waveRaysPhase + i * 0.6) * 14;
          blade.moveTo(-w, 0);
          blade.bezierCurveTo(-w + bend * 0.4, -h * 0.5, bend - w * 0.8, -h * 0.85, bend, -h);
          blade.bezierCurveTo(bend + w * 0.8, -h * 0.85, w + bend * 0.4, -h * 0.5, w, 0);
          blade.closePath();
          fillRimAndStroke(
            ctx,
            blade,
            -w,
            -h,
            w + bend,
            0,
            isTurtleGrass ? '#bef264' : '#6ee7b7',
            isTurtleGrass ? '#65a30d' : '#10b981',
            '#047857',
            '#064e3b',
            2.6,
          );
          // Longitudinal midrib vein & cross-vein bars inside seagrass blade
          ctx.strokeStyle = 'rgba(236, 253, 245, 0.52)';
          ctx.lineWidth = 1.4;

          // Basal clasping pale leaf sheath at node base
          ctx.fillStyle = 'rgba(217, 249, 157, 0.72)';
          ctx.strokeStyle = '#064e3b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-w * 1.05, 2);
          ctx.lineTo(-w * 0.92, -22);
          ctx.quadraticCurveTo(0, -26, w * 0.92, -22);
          ctx.lineTo(w * 1.05, 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Parallel longitudinal veins + transverse cross-vein bars (lacunae grid)
          ctx.strokeStyle = 'rgba(236, 253, 245, 0.56)';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(0, -4);
          ctx.quadraticCurveTo(bend * 0.45, -h * 0.5, bend, -h * 0.94);
          ctx.quadraticCurveTo(bend * 0.45, -h * 0.5, bend, -h * 0.95);
          ctx.moveTo(-w * 0.42, -6);
          ctx.quadraticCurveTo(-w * 0.35 + bend * 0.45, -h * 0.5, bend - w * 0.25, -h * 0.9);
          ctx.moveTo(w * 0.42, -6);
          ctx.quadraticCurveTo(w * 0.35 + bend * 0.45, -h * 0.5, bend + w * 0.25, -h * 0.9);
          // Transverse cross-bars every 28px along the ribbon strap
          for (let ty = 34; ty < h - 22; ty += 28) {
            const frac = ty / h;
            const cxBar = bend * frac * frac;
            const hwBar = w * (1 - frac * 0.35) * 0.72;
            ctx.moveTo(cxBar - hwBar, -ty);
            ctx.lineTo(cxBar + hwBar, -ty);
          }
          ctx.stroke();
          ctx.restore();
        }
        // Subtle marine seagrass blossom & bristled seed capsule at base
        drawFlowerClusterBlock(ctx, -34 + sway * 12, 118, 0.52, -0.2, '#fef9c3', '#fde047', '#eab308', '#ca8a04');
        drawFlowerClusterBlock(ctx, 38 + sway * 12, 116, 0.52, 0.2, '#fef9c3', '#fde047', '#eab308', '#ca8a04');
        // Marine seagrass blossom & bristled seed capsule at base when flowering/fruiting
        if (activePlantGrowthStage >= 2) {
          drawFlowerClusterBlock(ctx, -34 + sway * 12, 118, 0.52, -0.2, '#fef9c3', '#fde047', '#eab308', '#ca8a04');
          drawFlowerClusterBlock(ctx, 38 + sway * 12, 116, 0.52, 0.2, '#fef9c3', '#fde047', '#eab308', '#ca8a04');
        }
        break;
      }

      /* ========================================================================
       * P25: WATER HYACINTH / KELADI BUNTING (plant_25_water_hyacinth)
       * Spongy bulbous inflated air-filled petioles, glossy veined rosette leaves,
       * dark feathery submerged roots, and multi-blossom lavender-violet spike.
       * ====================================================================== */
      case 'plant_25_water_hyacinth': {
        // Feathery dark-purple submerged root tuft
        ctx.strokeStyle = '#3b0764';
        ctx.lineWidth = 3.5;
        for (let rx = -56; rx <= 56; rx += 14) {
          ctx.beginPath();
          ctx.moveTo(rx, 112);
          ctx.quadraticCurveTo(rx + sway * 14, 142, rx - sway * 10, 168);
          ctx.stroke();
        }
        // Inflated bulbous spongy petioles seamlessly merging into glossy spoon blades
        for (const [bx, ang] of [
          [-68, -2.25],
          [-32, -1.88],
          [32, -1.25],
          [68, -0.88],
        ] as const) {
          const bulb = new Path2D();
          bulb.ellipse(bx + sway * 10, 96, 22, 32, (ang + 1.57) * 0.5, 0, Math.PI * 2);
          fillRimAndStroke(ctx, bulb, bx - 22, 64, bx + 22, 128, '#d9f99d', '#84cc16', '#3f6212', '#1a2e05', 3.0);
          drawDetailedLeaf(ctx, bx + sway * 12, 72, ang + sway * 0.12, 98, 36, '#86efac', '#16a34a', '#14532d', 'rgba(240,255,220,0.65)', '#142914', true);
        }
        // Central floral scape stem & multi-blossom spike of violet-lavender flowers
        if (activePlantGrowthStage >= 2) {
          ctx.strokeStyle = '#4d7c0f';
          ctx.lineWidth = 6.5;
          ctx.beginPath();
          ctx.moveTo(0, 102);
          ctx.quadraticCurveTo(sway * 14, 24, sway * 22, -62);
          ctx.stroke();
          for (const [fx, fy, r] of [
            [-26, -12, 38],
            [26, -10, 38],
            [-18, -42, 36],
            [18, -40, 36],
            [0, -64, 42],
          ] as const) {
            drawBlossom(ctx, fx + sway * 22, fy, r, sway * 0.1, '#e9d5ff', '#a855f7', '#6b21a8', '#facc15', '#3b0764', 6);
          }
        }
        break;
      }

      /* ========================================================================
       * P26 & P27: SACRED LOTUS & WATER LILY (plant_26_lotus, plant_27_water_lily)
       * Broad lily pads with radial venation, central seed receptacle pod,
       * secondary flower buds, and multi-layered pink/magenta blooms.
       * ====================================================================== */
      case 'plant_26_lotus':
      case 'plant_27_water_lily': {
        const isLily = assetId === 'plant_27_water_lily';
        for (const [lx, ly, rx, ry] of [
          [-84, 86, 70, 28],
          [86, 92, 70, 28],
          [0, 124, 88, 32],
        ] as const) {
          const px = lx + sway * 12;
          const pad = new Path2D();
          if (isLily) {
            pad.ellipse(px, ly, rx, ry, 0, 0.25, Math.PI * 2 - 0.25);
            pad.lineTo(px, ly);
            pad.closePath();
          } else {
            pad.ellipse(px, ly, rx, ry, 0, 0, Math.PI * 2);
          }
          fillRimAndStroke(ctx, pad, px - rx, ly - ry, px + rx, ly + ry, '#6ee7b7', '#059669', '#064e3b', '#042f2e', 3.2);
          // Radiating peltate venation lines across the floating lily/lotus pad (Fix #23)
          ctx.strokeStyle = 'rgba(209, 250, 229, 0.5)';
          ctx.lineWidth = 1.5;
          for (let a = 0; a < 10; a++) {
            const ang = (a / 10) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(px, ly);
            ctx.lineTo(px + Math.cos(ang) * rx * 0.86, ly + Math.sin(ang) * ry * 0.86);
            ctx.stroke();
          }
        }

        if (activePlantGrowthStage >= 2) {
          // Main & secondary flower stalks emerging from the rhizome
          ctx.strokeStyle = '#15803d';
          ctx.lineWidth = 6.5;
          ctx.beginPath();
          ctx.moveTo(0, 142);
          ctx.quadraticCurveTo(sway * 16, 20, sway * 24, isLily ? 24 : -56);
          ctx.moveTo(-24, 134);
          ctx.quadraticCurveTo(-68 + sway * 14, 62, -78 + sway * 18, 12);
          ctx.moveTo(24, 134);
          ctx.quadraticCurveTo(68 + sway * 14, 62, 78 + sway * 18, 16);
          ctx.stroke();

          // Multi-flower blossoms across main and side stalks
          for (const [bx, by, bScale] of [
            [-78 + sway * 18, 10, 0.72],
            [78 + sway * 18, 14, 0.72],
            [sway * 24, isLily ? 24 : -64, 1.0],
          ] as const) {
            drawBlossom(
              ctx,
              bx,
              by,
              86 * bScale,
              sway * 0.08 + 0.3,
              isLily ? '#f5d0fe' : '#fbcfe8',
              isLily ? '#c026d3' : '#f472b6',
              isLily ? '#701a75' : '#be185d',
              '#facc15',
              '#500724',
              isLily ? 8 : 6,
            );
            drawBlossom(ctx, bx, by, 54 * bScale, sway * 0.08, '#fce7f3', '#ec4899', '#9d174d', '#facc15', '#500724', 6);
          }
        }
        break;
      }

      /* ========================================================================
       * P28: DUCKWEED / KIAPU (plant_28_duckweed)
       * Connected floating colony of bright emerald-lime lenticular mother & daughter
       * fronds on water surface with translucent root threads and tiny utricle fruits.
       * ====================================================================== */
      case 'plant_28_duckweed': {
        // Subtle stolon connectors linking the floating Duckweed colonies into a continuous mat
        ctx.strokeStyle = '#4d7c0f';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(-96 + sway * 18, -12);
        ctx.quadraticCurveTo(-38 + sway * 18, -34, 0 + sway * 18, 14);
        ctx.quadraticCurveTo(32 + sway * 18, -24, 92 + sway * 18, -8);
        ctx.stroke();

        for (const [dx, dy, sc] of [
          [-96, -12, 0.92],
          [-38, -34, 1.1],
          [32, -24, 1.05],
          [92, -8, 0.92],
          [0, 14, 1.15],
        ] as const) {
          const cx2 = dx + sway * 18;
          const cy2 = dy;
          // Trailing aquatic rootlets underneath each frond cluster
          ctx.strokeStyle = 'rgba(134, 239, 172, 0.78)';
          ctx.lineWidth = 3.0;
          for (const rxOff of [-10, 0, 10]) {
            ctx.beginPath();
            ctx.moveTo(cx2 + rxOff, cy2 + 8);
            ctx.quadraticCurveTo(cx2 + rxOff + sway * 16, cy2 + 72, cx2 + rxOff - sway * 8, cy2 + 138);
            ctx.stroke();
          }
          // Quartet of lens-shaped veined Duckweed thalli + tiny golden utricle seed
          for (const [la, len, w] of [
            [-2.4, 48 * sc, 24 * sc],
            [-0.7, 48 * sc, 24 * sc],
            [0.8, 38 * sc, 19 * sc],
            [2.2, 42 * sc, 21 * sc],
          ] as const) {
            drawDetailedLeaf(ctx, cx2, cy2, la + sway * 0.1, len, w, '#d9f99d', '#84cc16', '#3f6212', 'rgba(240,255,220,0.65)', '#1a2e05', true);
          }
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(cx2, cy2, 4.5 * sc, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      /* ========================================================================
       * P29: HORNWORT / EKOR KUCING AIR (plant_29_hornwort)
       * Branched submerged mother stolon and plumes of whorled forked needle-leaf
       * stems swaying gracefully with tiny axillary achene fruits.
       * ====================================================================== */
      case 'plant_29_hornwort': {
        for (const [sx, h, tilt] of [
          [-76, 205, -0.14],
          [-24, 245, -0.04],
          [28, 250, 0.05],
          [78, 210, 0.15],
        ] as const) {
          ctx.save();
          ctx.translate(sx, 168);
          ctx.rotate(tilt + sway * 0.15);
          ctx.strokeStyle = '#15803d';
          ctx.lineWidth = 5.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -h);
          // Forked lateral sub-branch on each Hornwort plume
          ctx.moveTo(0, -h * 0.45);
          ctx.quadraticCurveTo(22, -h * 0.58, 32, -h * 0.72);
          ctx.stroke();
          for (let y = -20; y >= -h; y -= 20) {
            for (const ang of [-2.55, -2.05, -1.1, -0.58]) {
              drawDetailedLeaf(ctx, 0, y, ang + sway * 0.1, 38, 6.5, '#bef264', '#22c55e', '#14532d', 'rgba(240,255,220,0.65)', '#142914', true);
            }
          }
          ctx.restore();
        }
        break;
      }

      /* ========================================================================
       * P30: WATER SPINACH / KANGKUNG (plant_30_water_spinach)
       * Branched hollow jointed semi-aquatic mother stems, hastate arrowhead leaves
       * with rich venation, seed capsules, and multi-block morning glory blooms.
       * ====================================================================== */
      case 'plant_30_water_spinach':
      default: {
        drawWoodyTrunkAndBranches(ctx, sway, 175, 18, 10, '#86efac', '#22c55e', '#15803d', false, [
          [-0.45, -0.58, -78, -42, 12],
          [0.45, -0.56, 78, -40, 12],
          [-0.3, -0.84, -52, -46, 10],
          [0.3, -0.84, 52, -46, 10],
        ]);
        for (const [lx, ly, ang, len] of [
          [-42, 68, -2.4, 112],
          [42, 64, -0.7, 112],
          [-56, 4, -2.2, 118],
          [56, 0, -0.9, 118],
          [-32, -52, -1.9, 108],
          [32, -54, -1.2, 108],
        ] as const) {
          drawDetailedLeaf(ctx, lx + sway * 18, ly, ang + sway * 0.12, len, 32, '#bbf7d0', '#22c55e', '#14532d', 'rgba(240,255,220,0.68)', '#142914', true);
        }
        // Secondary flower clusters + hero white-and-violet Kangkung morning-glory funnel blossoms
        if (activePlantGrowthStage >= 2) {
          drawBlossom(ctx, 0 + sway * 22, -98, 48, sway * 0.08, '#ffffff', '#f3e8ff', '#c084fc', '#d946ef', '#3b0764', 5);
          drawBlossom(ctx, -52 + sway * 22, -68, 46, sway * 0.1, '#ffffff', '#f3e8ff', '#c084fc', '#d946ef', '#3b0764', 5);
          drawBlossom(ctx, 52 + sway * 24, -82, 52, -sway * 0.1 + 0.3, '#ffffff', '#f3e8ff', '#c084fc', '#d946ef', '#3b0764', 5);
        }
        break;
      }
    }

    ctx.restore();
  }
