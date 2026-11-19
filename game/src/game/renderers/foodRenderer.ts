import { REFINED_FOOD_ICONS } from '../../roster/flora/foodIcons';
import { drawRoundedRect } from './coinAndEmotionRenderer';

const foodThumbCache = new Map<string, string>();
const PLACEHOLDER_THUMB_URL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export function getFoodThumbnailDataUrl(foodId: string): string {
  const existing = foodThumbCache.get(foodId);
  if (existing) return existing;
  if (typeof document === 'undefined') return '';

  try {
    const c = document.createElement('canvas');
    const dpr = 1.5; // Balanced crispness & fast lag-free food icon generation
    c.width = Math.round(120 * dpr);
    c.height = Math.round(104 * dpr);
    const cCtx = c.getContext('2d');
    if (!cCtx) return PLACEHOLDER_THUMB_URL;
    cCtx.scale(dpr, dpr);
    cCtx.imageSmoothingEnabled = true;
    cCtx.imageSmoothingQuality = 'high';

    drawFoodIcon(cCtx, foodId, 60, 54, 30, false);
    const url = c.toDataURL('image/png');
    foodThumbCache.set(foodId, url);
    return url;
  } catch {
    return PLACEHOLDER_THUMB_URL;
  }
}

/** Lunar phase in [0, 1): 0 new moon, 0.5 full moon (synodic month from a known new moon). */

export function drawFoodIcon(
  ctx: CanvasRenderingContext2D,
  foodId: string,
  x: number,
  y: number,
  radius: number,
  isGolden = false,
): void {
  ctx.save();
  ctx.translate(x, y);

  if (isGolden) {
    const glow = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 1.9);
    glow.addColorStop(0, 'rgba(250, 204, 21, 0.88)');
    glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.9, 0, Math.PI * 2);
    ctx.fill();
  }

  const sc = radius / 22;
  ctx.scale(sc, sc);

  // Refined vector food icons (game/src/roster/flora/foodIcons.ts) in a 22-unit radius frame.
  const refinedFood = REFINED_FOOD_ICONS[foodId];
  if (refinedFood) {
    refinedFood(ctx);
    ctx.restore();
    return;
  }

  if (foodId === 'food_durian_fruit') {
    // Detailed 3D thorny Durian matching plant_03_durian_tree
    ctx.strokeStyle = '#4d3319';
    ctx.lineWidth = 3.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(0, -17);
    ctx.stroke();

    ctx.fillStyle = '#78522b';
    ctx.strokeStyle = '#26170a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, -20, 4.2, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const rx = 18;
    const ry = 21;
    const numSpikes = 20;
    const rim = new Path2D();
    for (let i = 0; i < numSpikes; i++) {
      const a0 = (i / numSpikes) * Math.PI * 2;
      const aMid = ((i + 0.5) / numSpikes) * Math.PI * 2;
      const a1 = ((i + 1) / numSpikes) * Math.PI * 2;
      const bx0 = Math.cos(a0) * rx * 0.9;
      const by0 = Math.sin(a0) * ry * 0.9 + 2;
      const tx = Math.cos(aMid) * (rx + 5.2);
      const ty = Math.sin(aMid) * (ry + 5.2) + 2;
      const bx1 = Math.cos(a1) * rx * 0.9;
      const by1 = Math.sin(a1) * ry * 0.9 + 2;
      if (i === 0) rim.moveTo(bx0, by0);
      rim.lineTo(tx, ty);
      rim.lineTo(bx1, by1);
    }
    rim.closePath();
    const dGrad = ctx.createRadialGradient(-6, -6, 2, 0, 2, 24);
    dGrad.addColorStop(0, isGolden ? '#fef08a' : '#d9f99d');
    dGrad.addColorStop(0.55, isGolden ? '#eab308' : '#65a30d');
    dGrad.addColorStop(1, '#365314');
    ctx.fillStyle = dGrad;
    ctx.fill(rim);
    ctx.strokeStyle = '#1a2e05';
    ctx.lineWidth = 2.0;
    ctx.stroke(rim);

    // Interior 3D pyramidal thorns
    for (let row = -2; row <= 2; row++) {
      const ty = 2 + row * 5.2;
      const halfW = Math.sqrt(Math.max(0, 1 - (row / 2.6) ** 2)) * 12;
      for (let ox = -halfW; ox <= halfW + 0.1; ox += 5.5) {
        ctx.fillStyle = '#ecfccb';
        ctx.strokeStyle = '#1a2e05';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(ox - 2.6, ty + 2);
        ctx.lineTo(ox, ty - 3.6);
        ctx.lineTo(ox + 2.6, ty + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  } else if (foodId === 'food_mangosteen_fruit') {
    // Deep purple Mangosteen with 4-sepal green crown & bottom stigma rosette matching plant_04_mangosteen_tree
    ctx.strokeStyle = '#365314';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, -23);
    ctx.lineTo(0, -14);
    ctx.stroke();

    const mGrad = ctx.createRadialGradient(-6, -4, 2, 0, 2, 20);
    mGrad.addColorStop(0, isGolden ? '#fef08a' : '#c084fc');
    mGrad.addColorStop(0.45, isGolden ? '#ca8a04' : '#581c87');
    mGrad.addColorStop(1, '#1e0936');
    ctx.fillStyle = mGrad;
    ctx.strokeStyle = '#140524';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 2, 17.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Gloss highlight
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.beginPath();
    ctx.ellipse(-6, -3, 5.5, 3.2, -0.45, 0, Math.PI * 2);
    ctx.fill();

    // 4-sepal green calyx cap
    for (const [cxOff, cyOff, rot] of [
      [-8.5, -12, -0.45],
      [8.5, -12, 0.45],
      [-3.5, -14, -0.15],
      [3.5, -14, 0.15],
    ] as const) {
      ctx.fillStyle = '#84cc16';
      ctx.strokeStyle = '#1a2e05';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(cxOff, cyOff, 6.2, 4.0, rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Bottom 6-petal Tampuk Manggis rosette star
    ctx.fillStyle = '#d8b4fe';
    for (let st = 0; st < 6; st++) {
      const sa = (st * Math.PI) / 3;
      ctx.beginPath();
      ctx.ellipse(Math.cos(sa) * 3.0, 13 + Math.sin(sa) * 2.0, 2.0, 1.2, sa, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (foodId === 'food_banana_bunch') {
    // Detailed hand of curved golden-yellow Pisang Emas bananas with green crown cushion matching plant_05_banana_plant
    for (let c = -2; c <= 2; c++) {
      const fx = c * 5.2;
      const curve = c * 3.0;
      ctx.fillStyle = isGolden ? '#fef08a' : '#facc15';
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(fx - 3.4, -10);
      ctx.quadraticCurveTo(fx + curve - 4.5, 4, fx + curve * 0.9, 16);
      ctx.quadraticCurveTo(fx + curve + 4.5, 4, fx + 3.4, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Floral remnant tip dot
      ctx.fillStyle = '#291504';
      ctx.beginPath();
      ctx.arc(fx + curve * 0.9, 15.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Green pedicel cushion collar at top
    ctx.fillStyle = '#65a30d';
    ctx.strokeStyle = '#1a2e05';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, -11, 14, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (foodId === 'food_wild_figs') {
    // Cluster of small red-purple figs (syconia) with stalks, matching P14 Banyan
    ctx.strokeStyle = '#3f2a14';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.quadraticCurveTo(-2, -12, -9, -6);
    ctx.moveTo(0, -20);
    ctx.quadraticCurveTo(3, -12, 9, -7);
    ctx.moveTo(0, -20);
    ctx.lineTo(0, -2);
    ctx.stroke();
    for (const [fx, fy, fr] of [
      [-9, 2, 8.5],
      [9, 1, 8.5],
      [0, 9, 9.5],
    ] as const) {
      const fg = ctx.createRadialGradient(fx - 3, fy - 3, 1, fx, fy, fr + 2);
      fg.addColorStop(0, isGolden ? '#fef08a' : '#f87171');
      fg.addColorStop(0.55, isGolden ? '#eab308' : '#b91c1c');
      fg.addColorStop(1, '#450a0a');
      ctx.fillStyle = fg;
      ctx.strokeStyle = '#2b0606';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(fx, fy, fr * 0.92, fr, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Pale lenticel speckles and the ostiole at the fig's tip
      ctx.fillStyle = 'rgba(254, 243, 199, 0.75)';
      for (const [sx, sy] of [
        [-2.5, -2],
        [2, 1.5],
        [-1, 3.5],
      ] as const) {
        ctx.beginPath();
        ctx.arc(fx + sx, fy + sy, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#2b0606';
      ctx.beginPath();
      ctx.arc(fx, fy + fr * 0.82, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (foodId === 'food_coconut') {
    // Green husked coconut with three-sided ridges and calyx cap, matching P13
    const cg = ctx.createRadialGradient(-6, -6, 2, 0, 2, 22);
    cg.addColorStop(0, isGolden ? '#fef08a' : '#bef264');
    cg.addColorStop(0.55, isGolden ? '#ca8a04' : '#4d7c0f');
    cg.addColorStop(1, '#1a2e05');
    ctx.fillStyle = cg;
    ctx.strokeStyle = '#14240a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(16, -16, 19, 6, 12, 15);
    ctx.bezierCurveTo(6, 21, -6, 21, -12, 15);
    ctx.bezierCurveTo(-19, 6, -16, -16, 0, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(217, 249, 157, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.quadraticCurveTo(3, 2, 0, 18);
    ctx.stroke();
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#3b1a06';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, -17, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (foodId === 'food_rambutan_fruit') {
    // Cluster of three hairy red rambutans on a branched stalk, matching P15
    ctx.strokeStyle = '#4d3319';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-7, -9);
    ctx.moveTo(0, -22);
    ctx.lineTo(8, -10);
    ctx.moveTo(0, -22);
    ctx.lineTo(0, -2);
    ctx.stroke();
    for (const [rx, ry, rs] of [
      [-8, -1, 0.62],
      [8, -2, 0.6],
      [0, 8, 0.7],
    ] as const) {
      ctx.save();
      ctx.translate(rx, ry);
      ctx.scale(rs, rs);
      const rg = ctx.createRadialGradient(-3, -3, 2, 0, 0, 13);
      rg.addColorStop(0, isGolden ? '#fef08a' : '#fb7185');
      rg.addColorStop(0.5, isGolden ? '#eab308' : '#e11d48');
      rg.addColorStop(1, '#881337');
      ctx.fillStyle = rg;
      ctx.strokeStyle = '#4c0519';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10.5, 12.5, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#bef264';
      ctx.lineWidth = 1.7;
      ctx.lineCap = 'round';
      for (let a = 0; a < 14; a++) {
        const ang = (a / 14) * Math.PI * 2;
        const curl = a % 2 === 0 ? 0.3 : -0.3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 9.5, Math.sin(ang) * 11);
        ctx.quadraticCurveTo(
          Math.cos(ang + curl) * 15,
          Math.sin(ang + curl) * 17,
          Math.cos(ang + curl * 1.5) * 16.5,
          Math.sin(ang + curl * 1.5) * 18.5,
        );
        ctx.stroke();
      }
      ctx.restore();
    }
  } else if (foodId === 'food_bamboo_shoots') {
    // Young bamboo shoot (rebung): conical, wrapped in overlapping brown culm sheaths
    for (const [ox, sc, rot] of [
      [-7, 0.8, -0.18],
      [6, 1, 0.1],
    ] as const) {
      ctx.save();
      ctx.translate(ox, 4);
      ctx.rotate(rot);
      ctx.scale(sc, sc);
      for (let s = 0; s < 4; s++) {
        const y0 = 14 - s * 8;
        const half = 10 - s * 2.2;
        ctx.fillStyle = s % 2 === 0 ? (isGolden ? '#facc15' : '#a16207') : isGolden ? '#fde047' : '#ca8a04';
        ctx.strokeStyle = '#422006';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-half, y0);
        ctx.quadraticCurveTo(-half * 0.8, y0 - 10, 0, y0 - 14);
        ctx.quadraticCurveTo(half * 0.8, y0 - 10, half, y0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.moveTo(-2, -16);
      ctx.lineTo(0, -24);
      ctx.lineTo(2, -16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else if (foodId === 'food_wild_honeycomb') {
    // Slab of giant honeybee comb with hexagonal cells and a honey drip, matching P02
    ctx.fillStyle = isGolden ? '#fde047' : '#f59e0b';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-17, -12);
    ctx.quadraticCurveTo(0, -18, 17, -12);
    ctx.quadraticCurveTo(19, 4, 10, 15);
    ctx.quadraticCurveTo(0, 20, -10, 15);
    ctx.quadraticCurveTo(-19, 4, -17, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.75)';
    ctx.lineWidth = 1.1;
    const hexR = 3.6;
    for (let row = -2; row <= 2; row++) {
      for (let col = -2; col <= 2; col++) {
        const hx = col * hexR * 1.75 + (row % 2 === 0 ? 0 : hexR * 0.87);
        const hy = row * hexR * 1.5 + 1;
        if (Math.hypot(hx / 15, hy / 13) > 1) continue;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = Math.PI / 6 + (k * Math.PI) / 3;
          const px = hx + Math.cos(a) * hexR;
          const py = hy + Math.sin(a) * hexR;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(4, 16);
    ctx.quadraticCurveTo(6, 22, 5, 25);
    ctx.arc(5, 24, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (foodId === 'food_ants_termites') {
    // Chunk of termite mound (clay with tunnels) and a few termites and ants
    ctx.fillStyle = '#a16207';
    ctx.strokeStyle = '#422006';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, 14);
    ctx.quadraticCurveTo(-16, -6, -6, -16);
    ctx.quadraticCurveTo(0, -20, 6, -15);
    ctx.quadraticCurveTo(16, -4, 18, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#422006';
    for (const [tx, ty, tr] of [
      [-6, -4, 2.4],
      [5, -8, 2],
      [2, 4, 2.6],
      [-9, 8, 1.8],
      [10, 6, 2],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(tx, ty, tr, tr * 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pale termites
    for (const [bx, by, rot] of [
      [-12, 18, 0.3],
      [12, 19, -0.4],
    ] as const) {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rot);
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.9;
      for (const sx of [-3.2, 0, 3.4]) {
        ctx.beginPath();
        ctx.ellipse(sx, 0, 2.2, 1.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    // A dark ant on top
    ctx.fillStyle = '#1c1917';
    for (const sx of [-3, 0, 3]) {
      ctx.beginPath();
      ctx.arc(sx, -19, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (foodId === 'food_papaya_fruit') {
    // Ripe pyriform papaya with stalk scar, matching P06
    ctx.save();
    ctx.translate(0, 2);
    ctx.scale(1.35, 1.35);
    ctx.rotate(-0.12);
    const pGrad = ctx.createRadialGradient(-3, -4, 1, 0, 0, 15);
    pGrad.addColorStop(0, '#fde047');
    pGrad.addColorStop(0.55, '#f97316');
    pGrad.addColorStop(1, '#c2410c');
    ctx.fillStyle = pGrad;
    ctx.strokeStyle = '#431407';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.bezierCurveTo(8, -12, 11, 0, 9, 10);
    ctx.bezierCurveTo(6, 15, -6, 15, -9, 10);
    ctx.bezierCurveTo(-11, 0, -8, -12, 0, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle papaya longitudinal groove highlights
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(5, 0, 3, 11);
    ctx.stroke();
    ctx.restore();

    // Short green stalk scar at the top where it grew from the trunk
    ctx.save();
    ctx.translate(0, 2);
    ctx.scale(1.35, 1.35);
    ctx.fillStyle = isGolden ? '#facc15' : '#4d7c0f';
    ctx.strokeStyle = '#1a2e05';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -14, 3, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (foodId === 'food_seaweed_kelp') {
    // Ribbon Seagrass & Turtle Grass blades with creeping rhizome matching P22-P24
    ctx.fillStyle = '#92400e';
    ctx.strokeStyle = '#271001';
    ctx.lineWidth = 1.6;
    drawRoundedRect(ctx, -15, 12, 30, 5, 2.5);
    ctx.fill();
    ctx.stroke();

    for (const [ox, h, bend, col] of [
      [-9, 26, -4, '#10b981'],
      [0, 30, 3, '#34d399'],
      [9, 25, 5, '#059669'],
    ] as const) {
      ctx.fillStyle = col;
      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ox - 3.5, 13);
      ctx.quadraticCurveTo(ox + bend * 0.5 - 3, 13 - h * 0.5, ox + bend, 13 - h);
      ctx.quadraticCurveTo(ox + bend * 0.5 + 3, 13 - h * 0.5, ox + 3.5, 13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (foodId === 'food_plankton_bloom') {
    // Bioluminescent Copepod & Diatom Plankton Bloom
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    g.addColorStop(0, 'rgba(125, 211, 252, 0.95)');
    g.addColorStop(0.55, 'rgba(56, 189, 248, 0.55)');
    g.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();

    for (const [px, py, pr] of [
      [-7, -5, 4.2],
      [7, -6, 3.6],
      [0, 5, 4.5],
      [-5, 9, 3.0],
      [9, 4, 3.2],
    ] as const) {
      ctx.fillStyle = '#e0f2fe';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // food_freshwater_crustacean: Detailed River Prawn / Minnow with segmented carapace & feelers
    ctx.fillStyle = isGolden ? '#fde047' : '#fb923c';
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 2, 13, Math.PI * 0.85, Math.PI * 2.15);
    ctx.quadraticCurveTo(6, 12, -8, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Prawn antennae & tail fan
    ctx.beginPath();
    ctx.moveTo(11, -2);
    ctx.quadraticCurveTo(19, -10, 22, -4);
    ctx.moveTo(11, 1);
    ctx.quadraticCurveTo(18, -3, 21, 3);
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(7, -3, 2.0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
