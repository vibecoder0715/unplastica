import type { PlantRig } from './types';
import { kitFillRimAndStroke } from '../animalRenderer';

/* ============================================================================
 * P08: TROPICAL PITCHER PLANT (Nepenthes rafflesiana / ampullaria)
 * Elongated strap leaves tapering into coiled tendrils, from which hang upright
 * jug-shaped pitchers with ribbed peristomes, vertical wings, and overhanging lids.
 * ========================================================================== */
const drawPitcherPlant: PlantRig = (ctx, input) => {
  const { sway } = input;
  const outline = '#172517';

  ctx.save();
  ctx.translate(0, 140);
  ctx.scale(1.25, 1.25);

  // Basal stem
  ctx.strokeStyle = '#4d7c0f';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(0, -60);
  ctx.stroke();

  // 4 Strap leaves radiating outward
  const leaves = [
    { ang: -2.3, len: 85, tx: -65, ty: -55 },
    { ang: -0.85, len: 85, tx: 65, ty: -55 },
    { ang: -2.7, len: 70, tx: -55, ty: -35 },
    { ang: -0.4, len: 70, tx: 55, ty: -35 },
  ];

  for (const l of leaves) {
    ctx.save();
    ctx.translate(0, -50);
    ctx.rotate(l.ang + sway * 0.05);

    // Strap leaf blade
    const leafP = new Path2D();
    leafP.moveTo(0, 0);
    leafP.quadraticCurveTo(l.len * 0.4, -14, l.len, 0);
    leafP.quadraticCurveTo(l.len * 0.4, 14, 0, 0);
    leafP.closePath();
    kitFillRimAndStroke(ctx, leafP, 0, -14, l.len, 14, '#bef264', '#84cc16', '#4d7c0f', outline, 2.0);

    // Midrib
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(l.len, 0);
    ctx.stroke();

    ctx.restore();
  }

  // Hanging pitchers attached to coiled tendrils from leaf tips
  const pitchers = [
    { startX: -70, startY: -55, hangX: -85, hangY: -10, scale: 1.0, isLeft: true },
    { startX: 70, startY: -55, hangX: 85, hangY: -10, scale: 1.0, isLeft: false },
    { startX: -45, startY: -35, hangX: -45, hangY: 15, scale: 0.85, isLeft: true },
    { startX: 45, startY: -35, hangX: 45, hangY: 15, scale: 0.85, isLeft: false },
  ];

  for (const p of pitchers) {
    // Coiled tendril
    ctx.save();
    ctx.strokeStyle = '#65a30d';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.startX, p.startY);
    ctx.bezierCurveTo(
      p.startX + (p.isLeft ? -15 : 15),
      p.startY + 20,
      p.hangX + (p.isLeft ? -10 : 10) + sway * 8,
      p.hangY - 20,
      p.hangX + sway * 8,
      p.hangY,
    );
    ctx.stroke();

    // Pitcher jug body
    ctx.translate(p.hangX + sway * 8, p.hangY);
    ctx.scale(p.scale, p.scale);

    const jugP = new Path2D();
    jugP.moveTo(-16, 0);
    jugP.bezierCurveTo(-26, 25, -24, 65, 0, 75);
    jugP.bezierCurveTo(24, 65, 26, 25, 16, 0);
    jugP.closePath();
    kitFillRimAndStroke(ctx, jugP, -26, 0, 26, 75, '#fde047', '#dc2626', '#991b1b', outline, 2.4);

    // Mottled crimson spots on pitcher
    ctx.fillStyle = '#7f1d1d';
    for (const [sx, sy, sr] of [
      [-10, 25, 3.5],
      [8, 30, 4],
      [-5, 48, 3.2],
      [9, 52, 3.8],
      [0, 64, 3],
    ] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ribbed peristome collar (flared lip)
    const peristomeP = new Path2D();
    peristomeP.ellipse(0, 0, 18, 6.5, 0, 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, peristomeP, -18, -6.5, 18, 6.5, '#fef08a', '#eab308', '#ca8a04', outline, 1.8);

    // Ribs on peristome
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 1.2;
    for (let r = -12; r <= 12; r += 4) {
      ctx.beginPath();
      ctx.moveTo(r, -4);
      ctx.lineTo(r, 4);
      ctx.stroke();
    }

    // Vaulted operculum (lid) over mouth
    const lidP = new Path2D();
    lidP.moveTo(-14, -4);
    lidP.quadraticCurveTo(0, -22, 14, -4);
    lidP.quadraticCurveTo(0, -10, -14, -4);
    lidP.closePath();
    kitFillRimAndStroke(ctx, lidP, -14, -22, 14, -4, '#bef264', '#84cc16', '#4d7c0f', outline, 1.8);

    ctx.restore();
  }

  ctx.restore();
};

/* ============================================================================
 * P11: HIBISCUS / BUNGA RAYA (Hibiscus rosa-sinensis)
 * Woody shrub branching, serrated alternate leaves, large 5-petal scarlet bloom
 * with prominent long arching staminal column tipped with yellow anthers and
 * 5 red velvety stigma lobes (Malaysia's National Flower).
 * ========================================================================== */
const drawHibiscus: PlantRig = (ctx, input) => {
  const { sway, growthStage } = input;
  const outline = '#172517';

  ctx.save();
  ctx.translate(0, 148);

  // 1. Shrub branching habit: multiple slender woody stems (NOT a thick tree trunk!)
  const stems = [
    { x0: 0, y0: 0, cx: -25, cy: -60, x1: -55, y1: -120, w: 6.5 },
    { x0: 0, y0: 0, cx: 0, cy: -75, x1: 0, y1: -145, w: 7.5 },
    { x0: 0, y0: 0, cx: 25, cy: -60, x1: 55, y1: -120, w: 6.5 },
    { x0: -20, y0: -50, cx: -60, cy: -70, x1: -95, y1: -90, w: 4.8 },
    { x0: 20, y0: -50, cx: 60, cy: -70, x1: 95, y1: -90, w: 4.8 },
  ];

  ctx.strokeStyle = '#57534e';
  ctx.lineCap = 'round';
  for (const s of stems) {
    ctx.lineWidth = s.w;
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y0);
    ctx.quadraticCurveTo(s.cx, s.cy, s.x1 + sway * 8, s.y1);
    ctx.stroke();
  }

  // 2. Serrated alternate leaves along shrub stems
  const leafPoints = [
    { x: -35, y: -70, ang: -2.4, len: 48 },
    { x: 35, y: -70, ang: -0.7, len: 48 },
    { x: -75, y: -95, ang: -2.6, len: 44 },
    { x: 75, y: -95, ang: -0.5, len: 44 },
    { x: -20, y: -110, ang: -2.1, len: 46 },
    { x: 20, y: -110, ang: -1.0, len: 46 },
    { x: 0, y: -90, ang: -1.57, len: 48 },
    { x: -45, y: -50, ang: -2.2, len: 42 },
    { x: 45, y: -50, ang: -0.9, len: 42 },
    { x: 0, y: -60, ang: -1.57, len: 44 },
  ];

  for (const lp of leafPoints) {
    ctx.save();
    ctx.translate(lp.x + sway * 6, lp.y);
    ctx.rotate(lp.ang + sway * 0.08);

    // Serrated leaf shape
    const lP = new Path2D();
    lP.moveTo(0, 0);
    lP.bezierCurveTo(lp.len * 0.3, -16, lp.len * 0.8, -12, lp.len, 0);
    lP.bezierCurveTo(lp.len * 0.8, 12, lp.len * 0.3, 16, 0, 0);
    lP.closePath();
    kitFillRimAndStroke(ctx, lP, 0, -16, lp.len, 16, '#86efac', '#16a34a', '#14532d', outline, 2.0);

    // Midrib
    ctx.strokeStyle = '#dcfce7';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(lp.len * 0.9, 0);
    ctx.stroke();

    ctx.restore();
  }

  // 3. Iconic Scarlet Hibiscus Blossoms with Protruding Staminal Column
  const flowers = [
    { x: 0, y: -155, scale: 1.15, ang: 0 },
    { x: -55, y: -128, scale: 0.92, ang: -0.35 },
    { x: 55, y: -128, scale: 0.92, ang: 0.35 },
  ];

  const n = growthStage >= 2 ? flowers.length : 1;
  for (let f = 0; f < n; f++) {
    const fl = flowers[f];
    ctx.save();
    ctx.translate(fl.x + sway * 12, fl.y);
    ctx.scale(fl.scale, fl.scale);
    ctx.rotate(fl.ang + sway * 0.08);

    // Green calyx sepals
    ctx.fillStyle = '#4d7c0f';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.8;
    for (let s = 0; s < 5; s++) {
      const sang = (s / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(sang) * 12, Math.sin(sang) * 12, 6, 12, sang, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 5 Large crinkled scarlet petals
    for (let p = 0; p < 5; p++) {
      const pang = (p / 5) * Math.PI * 2 - Math.PI * 0.5;
      ctx.save();
      ctx.rotate(pang);

      const petalP = new Path2D();
      petalP.moveTo(0, 0);
      petalP.bezierCurveTo(-18, -25, -28, -55, 0, -68);
      petalP.bezierCurveTo(28, -55, 18, -25, 0, 0);
      petalP.closePath();
      kitFillRimAndStroke(ctx, petalP, -28, -68, 28, 0, '#f87171', '#dc2626', '#991b1b', outline, 2.4);

      // Delicate darker petal veins radiating from base
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1.2;
      for (const vx of [-10, 0, 10]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(vx * 0.6, -30, vx, -55);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Deep crimson flower center eye
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Signature Long Protruding Staminal Column!
    ctx.save();
    ctx.rotate(-0.15 + fl.ang);
    // Yellow/crimson tube
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(8, -25, 12, -56);
    ctx.stroke();

    // Yellow anthers dusted along the upper column
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.0;
    for (let a = 1; a <= 8; a++) {
      const ay = -25 - a * 3.5;
      const ax = 6 + Math.sin(a * 1.5) * 6;
      ctx.beginPath();
      ctx.arc(ax, ay, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 5 Velvety red stigma lobes at apex
    ctx.fillStyle = '#b91c1c';
    for (let st = 0; st < 5; st++) {
      const stang = (st / 5) * Math.PI * 2;
      const stx = 12 + Math.cos(stang) * 4.5;
      const sty = -56 + Math.sin(stang) * 3.5;
      ctx.beginPath();
      ctx.arc(stx, sty, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }

  ctx.restore();
};

/* ============================================================================
 * P12: IXORA (Ixora coccinea / Pejuang Hutan)
 * Dense evergreen shrub branching, opposite glossy leaves, dense rounded
 * terminal dome corymbs of dozens of small 4-petaled star tubular scarlet flowers.
 * ========================================================================== */
const drawIxora: PlantRig = (ctx, input) => {
  const { sway, growthStage } = input;
  const outline = '#172517';

  ctx.save();
  ctx.translate(0, 148);

  // 1. Slender woody shrub branches
  const stems = [
    { x0: 0, y0: 0, cx: -30, cy: -55, x1: -65, y1: -110, w: 5.5 },
    { x0: 0, y0: 0, cx: 0, cy: -65, x1: 0, y1: -130, w: 6.5 },
    { x0: 0, y0: 0, cx: 30, cy: -55, x1: 65, y1: -110, w: 5.5 },
  ];

  ctx.strokeStyle = '#57534e';
  ctx.lineCap = 'round';
  for (const s of stems) {
    ctx.lineWidth = s.w;
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y0);
    ctx.quadraticCurveTo(s.cx, s.cy, s.x1 + sway * 6, s.y1);
    ctx.stroke();
  }

  // 2. Glossy opposite oblong-elliptic leathery leaves
  const leaves = [
    { x: -35, y: -60, ang: -2.3, len: 44 },
    { x: 35, y: -60, ang: -0.85, len: 44 },
    { x: -50, y: -85, ang: -2.5, len: 42 },
    { x: 50, y: -85, ang: -0.65, len: 42 },
    { x: -18, y: -95, ang: -2.0, len: 42 },
    { x: 18, y: -95, ang: -1.1, len: 42 },
    { x: -25, y: -40, ang: -2.1, len: 38 },
    { x: 25, y: -40, ang: -1.0, len: 38 },
    { x: 0, y: -75, ang: -1.57, len: 42 },
  ];

  for (const l of leaves) {
    ctx.save();
    ctx.translate(l.x + sway * 5, l.y);
    ctx.rotate(l.ang + sway * 0.08);

    const lP = new Path2D();
    lP.moveTo(0, 0);
    lP.bezierCurveTo(l.len * 0.35, -14, l.len * 0.75, -10, l.len, 0);
    lP.bezierCurveTo(l.len * 0.75, 10, l.len * 0.35, 14, 0, 0);
    lP.closePath();
    kitFillRimAndStroke(ctx, lP, 0, -14, l.len, 14, '#86efac', '#16a34a', '#14532d', outline, 1.8);

    // Specular shine on glossy leaf
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(l.len * 0.45, -3, l.len * 0.3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 3. Dense Terminal Dome Corymbs of 4-Petaled Star Flowers
  const corymbs = [
    { x: 0, y: -140, r: 42, count: 24 },
    { x: -65, y: -118, r: 34, count: 18 },
    { x: 65, y: -118, r: 34, count: 18 },
  ];

  const n = growthStage >= 2 ? corymbs.length : 1;
  for (let c = 0; c < n; c++) {
    const cm = corymbs[c];
    ctx.save();
    ctx.translate(cm.x + sway * 8, cm.y);

    // Dome backing shadow
    const domeP = new Path2D();
    domeP.arc(0, 0, cm.r, 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, domeP, -cm.r, -cm.r, cm.r, cm.r, '#f87171', '#dc2626', '#991b1b', outline, 2.2);

    // Dozens of 4-petaled star florets packed in the dome
    for (let f = 0; f < cm.count; f++) {
      const fang = (f / cm.count) * Math.PI * 2 + (f % 3) * 0.4;
      const fdist = (Math.sin(f * 3.7) * 0.4 + 0.5) * cm.r * 0.85;
      const fx = Math.cos(fang) * fdist;
      const fy = Math.sin(fang) * fdist * 0.8;

      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(f * 0.5);

      // 4 Petals
      ctx.fillStyle = f % 2 === 0 ? '#f87171' : '#ef4444';
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.0;
      for (let p = 0; p < 4; p++) {
        const pang = (p / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(pang) * 5, Math.sin(pang) * 5, 2.2, 4.5, pang, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Yellow pinhole center
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }

  ctx.restore();
};

/* ============================================================================
 * P18: TROPICAL ORCHID (Dendrobium / Paphiopedilum)
 * Clustered green pseudobulbs, silvery-white aerial velamen roots with emerald
 * tips, arching strap leaves, and arching spray of bilateral orchid blooms
 * with 3 sepals, 2 petals, and a distinct 3-lobed lip (labellum) structure.
 * ========================================================================== */
const drawTropicalOrchid: PlantRig = (ctx, input) => {
  const { sway, growthStage } = input;
  const outline = '#26142e';

  ctx.save();
  ctx.translate(0, 145);
  ctx.scale(1.22, 1.22);

  // 1. Silvery-white aerial velamen roots dangling onto plinth
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  for (const rx of [-35, -20, -5, 12, 28, 42]) {
    ctx.beginPath();
    ctx.moveTo(rx * 0.6, -10);
    ctx.quadraticCurveTo(rx * 1.1, 15, rx, 35);
    ctx.stroke();
    // Green growing tip
    ctx.strokeStyle = '#84cc16';
    ctx.beginPath();
    ctx.moveTo(rx, 28);
    ctx.lineTo(rx, 35);
    ctx.stroke();
    ctx.strokeStyle = '#cbd5e1';
  }

  // 2. Clustered swollen green pseudobulbs
  const bulbs = [-24, -8, 10, 26];
  for (let b = 0; b < bulbs.length; b++) {
    const bx = bulbs[b];
    const bulbP = new Path2D();
    bulbP.ellipse(bx, -18, 11, 26, 0.08 * (b - 1.5), 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, bulbP, bx - 11, -44, bx + 11, 8, '#bef264', '#84cc16', '#4d7c0f', outline, 2.0);
    // Pseudobulb longitudinal ribs
    ctx.strokeStyle = '#3f6212';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx, -42);
    ctx.lineTo(bx, 6);
    ctx.stroke();
  }

  // 3. Arching leathery strap leaves
  const leaves = [
    { ang: -2.45, len: 90 },
    { ang: -2.1, len: 105 },
    { ang: -1.05, len: 105 },
    { ang: -0.7, len: 90 },
  ];

  for (const l of leaves) {
    ctx.save();
    ctx.translate(0, -35);
    ctx.rotate(l.ang + sway * 0.06);

    const lP = new Path2D();
    lP.moveTo(0, 0);
    lP.bezierCurveTo(l.len * 0.4, -18, l.len * 0.8, -14, l.len, 0);
    lP.bezierCurveTo(l.len * 0.8, 14, l.len * 0.4, 18, 0, 0);
    lP.closePath();
    kitFillRimAndStroke(ctx, lP, 0, -18, l.len, 18, '#86efac', '#22c55e', '#15803d', outline, 2.2);

    ctx.strokeStyle = '#dcfce7';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(l.len * 0.92, 0);
    ctx.stroke();

    ctx.restore();
  }

  // 4. Arching raceme flower spike with bilateral orchid blooms
  ctx.save();
  ctx.translate(0, -35);

  // Arching slender spike stalk
  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(15, -80, sway * 15, -165);
  ctx.stroke();

  // Bilateral Orchid Flowers along the spike
  const flowerNodes = [
    { x: -14, y: -75, scale: 0.82, rot: -0.2 },
    { x: 16, y: -105, scale: 0.92, rot: 0.25 },
    { x: -10, y: -135, scale: 1.05, rot: -0.15 },
    { x: 12, y: -165, scale: 1.15, rot: 0.1 },
  ];

  const n = growthStage >= 2 ? flowerNodes.length : 1;
  for (let f = 0; f < n; f++) {
    const fn = flowerNodes[f];
    ctx.save();
    ctx.translate(fn.x + sway * 12, fn.y);
    ctx.scale(fn.scale, fn.scale);
    ctx.rotate(fn.rot + sway * 0.08);

    // 3 Outer Sepals (Dorsal + 2 Lateral)
    // Dorsal sepal (top)
    const dSepal = new Path2D();
    dSepal.moveTo(0, 0);
    dSepal.bezierCurveTo(-10, -15, -8, -32, 0, -36);
    dSepal.bezierCurveTo(8, -32, 10, -15, 0, 0);
    dSepal.closePath();
    kitFillRimAndStroke(ctx, dSepal, -10, -36, 10, 0, '#f5d0fe', '#c084fc', '#7e22ce', outline, 1.8);

    // Lateral sepals (lower left and lower right)
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(side * 2.2);
      const lSepal = new Path2D();
      lSepal.moveTo(0, 0);
      lSepal.bezierCurveTo(-8, -12, -7, -26, 0, -30);
      lSepal.bezierCurveTo(7, -26, 8, -12, 0, 0);
      lSepal.closePath();
      kitFillRimAndStroke(ctx, lSepal, -8, -30, 8, 0, '#f5d0fe', '#c084fc', '#7e22ce', outline, 1.8);
      ctx.restore();
    }

    // 2 Lateral Petals (spreading wings)
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(side * 1.35);
      const pet = new Path2D();
      pet.moveTo(0, 0);
      pet.bezierCurveTo(-14, -14, -12, -28, 0, -32);
      pet.bezierCurveTo(12, -28, 14, -14, 0, 0);
      pet.closePath();
      kitFillRimAndStroke(ctx, pet, -14, -32, 14, 0, '#fdf4ff', '#e879f9', '#a21caf', outline, 1.8);
      ctx.restore();
    }

    // Distinct 3-Lobed Lip / Labellum (lower apron with ruffle)
    const lipP = new Path2D();
    lipP.moveTo(0, 0);
    lipP.bezierCurveTo(-16, 8, -20, 24, -14, 32);
    lipP.bezierCurveTo(0, 38, 0, 38, 14, 32);
    lipP.bezierCurveTo(20, 24, 16, 8, 0, 0);
    lipP.closePath();
    kitFillRimAndStroke(ctx, lipP, -20, 0, 20, 38, '#fae8ff', '#d946ef', '#86198f', outline, 2.0);

    // Golden callus throat in lip center
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(0, 10, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Central reproductive column (gynostemium)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -3, 3.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
};

/* ============================================================================
 * P22: ENHALUS SEAGRASS (Enhalus acoroides)
 * Long, wide, leathery ribbon blades with slight spiral twist, persistent
 * coarse black bristly fibers covering the creeping basal rhizome.
 * ========================================================================== */
const drawEnhalusSeagrass: PlantRig = (ctx, input) => {
  const { sway } = input;
  const outline = '#022c22';

  ctx.save();
  ctx.translate(0, 148);

  // 1. Creeping rhizome densely covered in coarse black bristly fibers
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 2.2;
  for (let fx = -85; fx <= 85; fx += 8) {
    for (let f = 0; f < 3; f++) {
      ctx.beginPath();
      ctx.moveTo(fx, 4);
      ctx.lineTo(fx + (f - 1) * 6, -14 - f * 4);
      ctx.stroke();
    }
  }

  // 2. Wide thick leathery ribbon blades with multi-nerved venation
  const blades = [
    { x: -65, h: 220, w: 18, ang: -0.12 },
    { x: -38, h: 250, w: 20, ang: -0.06 },
    { x: -12, h: 265, w: 22, ang: -0.02 },
    { x: 14, h: 260, w: 21, ang: 0.03 },
    { x: 42, h: 245, w: 19, ang: 0.08 },
    { x: 68, h: 215, w: 17, ang: 0.14 },
  ];

  for (const b of blades) {
    ctx.save();
    ctx.translate(b.x, 0);
    ctx.rotate(b.ang + sway * 0.06);

    const bladeP = new Path2D();
    bladeP.moveTo(-b.w * 0.5, 0);
    bladeP.quadraticCurveTo(-b.w * 0.45 + sway * 25, -b.h * 0.5, -b.w * 0.3 + sway * 50, -b.h);
    bladeP.lineTo(b.w * 0.3 + sway * 50, -b.h);
    bladeP.quadraticCurveTo(b.w * 0.45 + sway * 25, -b.h * 0.5, b.w * 0.5, 0);
    bladeP.closePath();
    kitFillRimAndStroke(ctx, bladeP, -b.w, -b.h, b.w, 0, '#6ee7b7', '#059669', '#064e3b', outline, 2.4);

    // Parallel multi-nerved longitudinal veins
    ctx.strokeStyle = 'rgba(209, 250, 229, 0.45)';
    ctx.lineWidth = 1.2;
    for (const vx of [-0.3, 0, 0.3]) {
      ctx.beginPath();
      ctx.moveTo(b.w * vx, 0);
      ctx.quadraticCurveTo(b.w * vx + sway * 25, -b.h * 0.5, b.w * vx + sway * 50, -b.h);
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();
};

/* ============================================================================
 * P23: THALASSIA TURTLE GRASS (Thalassia hemprichii)
 * Shorter, gently curved ribbon leaves with distinctly rounded blunt/paddle
 * tips, annular ring-scarred horizontal rhizome (distinct from Enhalus!).
 * ========================================================================== */
const drawThalassiaTurtleGrass: PlantRig = (ctx, input) => {
  const { sway } = input;
  const outline = '#022c22';

  ctx.save();
  ctx.translate(0, 148);

  // 1. Annular ring-scarred horizontal rhizome
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-90, 5);
  ctx.lineTo(90, 5);
  ctx.stroke();

  // Annular rings
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 2.0;
  for (let rx = -80; rx <= 80; rx += 14) {
    ctx.beginPath();
    ctx.moveTo(rx, -1);
    ctx.lineTo(rx, 11);
    ctx.stroke();
  }

  // 2. Shorter curved ribbon blades with rounded paddle tips
  const blades = [
    { x: -70, h: 140, w: 15, curl: -18 },
    { x: -45, h: 165, w: 16, curl: -12 },
    { x: -20, h: 180, w: 17, curl: -6 },
    { x: 5, h: 185, w: 17, curl: 4 },
    { x: 30, h: 170, w: 16, curl: 10 },
    { x: 55, h: 150, w: 15, curl: 16 },
    { x: 75, h: 130, w: 14, curl: 22 },
  ];

  for (const b of blades) {
    ctx.save();
    ctx.translate(b.x, 0);

    const bP = new Path2D();
    bP.moveTo(-b.w * 0.5, 0);
    bP.quadraticCurveTo(-b.w * 0.4 + b.curl + sway * 18, -b.h * 0.5, -b.w * 0.5 + b.curl * 1.6 + sway * 35, -b.h + 12);
    // Distinctly rounded paddle tip
    bP.quadraticCurveTo(b.curl * 1.6 + sway * 35, -b.h, b.w * 0.5 + b.curl * 1.6 + sway * 35, -b.h + 12);
    bP.quadraticCurveTo(b.w * 0.4 + b.curl + sway * 18, -b.h * 0.5, b.w * 0.5, 0);
    bP.closePath();
    kitFillRimAndStroke(ctx, bP, -b.w, -b.h, b.w, 0, '#86efac', '#10b981', '#047857', outline, 2.2);

    ctx.restore();
  }

  ctx.restore();
};

/* ============================================================================
 * P24: EELGRASS (Zostera)
 * Narrow, delicate, slender emerald-green ribbon blades in dense lush tufts.
 * ========================================================================== */
const drawEelgrass: PlantRig = (ctx, input) => {
  const { sway } = input;
  const outline = '#022c22';

  ctx.save();
  ctx.translate(0, 148);

  // Dense fine ribbon tufts
  const blades = [
    { x: -75, h: 160, w: 8, ang: -0.15 },
    { x: -60, h: 185, w: 8.5, ang: -0.1 },
    { x: -45, h: 210, w: 9, ang: -0.06 },
    { x: -30, h: 230, w: 9.5, ang: -0.03 },
    { x: -15, h: 245, w: 10, ang: -0.01 },
    { x: 0, h: 250, w: 10, ang: 0 },
    { x: 15, h: 245, w: 10, ang: 0.01 },
    { x: 30, h: 230, w: 9.5, ang: 0.03 },
    { x: 45, h: 210, w: 9, ang: 0.06 },
    { x: 60, h: 185, w: 8.5, ang: 0.1 },
    { x: 75, h: 160, w: 8, ang: 0.15 },
  ];

  for (const b of blades) {
    ctx.save();
    ctx.translate(b.x, 0);
    ctx.rotate(b.ang + sway * 0.07);

    const bP = new Path2D();
    bP.moveTo(-b.w * 0.5, 0);
    bP.quadraticCurveTo(-b.w * 0.4 + sway * 28, -b.h * 0.5, 0 + sway * 55, -b.h);
    bP.quadraticCurveTo(b.w * 0.4 + sway * 28, -b.h * 0.5, b.w * 0.5, 0);
    bP.closePath();
    kitFillRimAndStroke(ctx, bP, -b.w, -b.h, b.w, 0, '#a7f3d0', '#34d399', '#059669', outline, 1.8);

    ctx.restore();
  }

  ctx.restore();
};

/* ============================================================================
 * P26: LOTUS (Nelumbo nucifera)
 * Distinct from Water Lily! Circular, peltate (unnotched) leaves held high on
 * tall erect emergent stalks ABOVE the water surface; large pink flower and
 * famous flat-topped showerhead seed pod (torus).
 * ========================================================================== */
const drawLotus: PlantRig = (ctx, input) => {
  const { sway } = input;
  const outline = '#042f2e';

  ctx.save();
  ctx.translate(0, 148);

  // 1. Tall erect emergent stalks rising high above the water surface
  const stalks = [
    { x0: -20, y0: 0, cx: -50, cy: -60, x1: -75, y1: -110 },
    { x0: 20, y0: 0, cx: 50, cy: -60, x1: 75, y1: -110 },
    { x0: 0, y0: 0, cx: 0, cy: -80, x1: 0, y1: -150 },
    { x0: 10, y0: 0, cx: 35, cy: -70, x1: 50, y1: -130 },
  ];

  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  for (const s of stalks) {
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y0);
    ctx.quadraticCurveTo(s.cx, s.cy, s.x1 + sway * 10, s.y1);
    ctx.stroke();
    // Fine prickles on lotus stalks
    ctx.fillStyle = '#064e3b';
    for (let p = 1; p <= 5; p++) {
      const frac = p / 6;
      const px = s.x0 + (s.x1 - s.x0) * frac + (s.cx - (s.x0 + s.x1) * 0.5) * Math.sin(frac * Math.PI);
      const py = s.y0 + (s.y1 - s.y0) * frac;
      ctx.beginPath();
      ctx.arc(px + 3, py, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2. Emergent circular, peltate (unnotched!) umbrella leaves held above water
  const leaves = [
    { x: -75, y: -110, rx: 62, ry: 26, tilt: -0.15 },
    { x: 75, y: -110, rx: 62, ry: 26, tilt: 0.15 },
    { x: 50, y: -130, rx: 48, ry: 20, tilt: 0.2 },
  ];

  for (const l of leaves) {
    ctx.save();
    ctx.translate(l.x + sway * 10, l.y);
    ctx.rotate(l.tilt + sway * 0.05);

    // Completely unnotched peltate circular umbrella leaf
    const padP = new Path2D();
    padP.ellipse(0, 0, l.rx, l.ry, 0, 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, padP, -l.rx, -l.ry, l.rx, l.ry, '#6ee7b7', '#10b981', '#047857', outline, 2.8);

    // Central white insertion dot & radiating veins
    ctx.fillStyle = '#ecfdf5';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(236, 253, 245, 0.45)';
    ctx.lineWidth = 1.3;
    for (let a = 0; a < 14; a++) {
      const ang = (a / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * l.rx * 0.9, Math.sin(ang) * l.ry * 0.9);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 3. Tall high pink lotus bloom held above leaves
  ctx.save();
  ctx.translate(0 + sway * 12, -155);

  // Lotus Petals (wide cupped pink petals)
  for (let p = 0; p < 8; p++) {
    const pang = (p / 8) * Math.PI * 2;
    ctx.save();
    ctx.rotate(pang);
    const petP = new Path2D();
    petP.moveTo(0, 0);
    petP.bezierCurveTo(-14, -18, -14, -36, 0, -44);
    petP.bezierCurveTo(14, -36, 14, -18, 0, 0);
    petP.closePath();
    kitFillRimAndStroke(ctx, petP, -14, -44, 14, 0, '#fbcfe8', '#f472b6', '#db2777', outline, 2.0);
    ctx.restore();
  }

  // Distinct Flat-Topped Showerhead Seed Pod (Torus)!
  const podP = new Path2D();
  podP.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, podP, -16, -10, 16, 10, '#fef08a', '#eab308', '#ca8a04', outline, 2.0);

  // Embedded seed apertures
  ctx.fillStyle = '#854d0e';
  for (let s = -2; s <= 2; s++) {
    for (let t = -1; t <= 1; t++) {
      if (Math.abs(s) + Math.abs(t) <= 2) {
        ctx.beginPath();
        ctx.arc(s * 5.5, t * 4, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
  ctx.restore();
};

/* ============================================================================
 * P27: WATER LILY (Nymphaea)
 * Distinct from Lotus! Round notched floating pads resting flat on the water
 * surface, with star-petaled flowers floating at water level.
 * ========================================================================== */
const drawWaterLily: PlantRig = (ctx, input) => {
  const { sway } = input;
  const outline = '#042f2e';

  ctx.save();
  ctx.translate(0, 148);

  // Round notched floating pads resting directly on the water surface
  const pads = [
    { x: -70, y: -25, rx: 65, ry: 24, notchAng: 0.4 },
    { x: 65, y: -20, rx: 68, ry: 25, notchAng: -0.35 },
    { x: 0, y: -8, rx: 75, ry: 28, notchAng: 0.1 },
  ];

  for (const p of pads) {
    ctx.save();
    ctx.translate(p.x + sway * 8, p.y);

    // Floating pad with sharp V-notch!
    const padP = new Path2D();
    padP.ellipse(0, 0, p.rx, p.ry, 0, p.notchAng + 0.35, p.notchAng + Math.PI * 2 - 0.35);
    padP.lineTo(0, 0);
    padP.closePath();
    kitFillRimAndStroke(ctx, padP, -p.rx, -p.ry, p.rx, p.ry, '#86efac', '#10b981', '#065f46', outline, 2.6);

    ctx.restore();
  }

  // Floating star flower resting at water surface
  ctx.save();
  ctx.translate(0 + sway * 8, -32);

  for (let p = 0; p < 12; p++) {
    const pang = (p / 12) * Math.PI * 2;
    ctx.save();
    ctx.rotate(pang);
    const petP = new Path2D();
    petP.moveTo(0, 0);
    petP.lineTo(-6, -20);
    petP.lineTo(0, -32);
    petP.lineTo(6, -20);
    petP.closePath();
    kitFillRimAndStroke(ctx, petP, -6, -32, 6, 0, '#fdf4ff', '#e879f9', '#a21caf', outline, 1.8);
    ctx.restore();
  }

  // Golden stamen center
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.restore();
};

/* ============================================================================
 * P30: WATER SPINACH / KANGKUNG (Ipomoea aquatica)
 * Creeping hollow-stemmed semi-aquatic herb with adventitious roots from nodes,
 * hastate (arrowhead) leaves on arching petioles, and white/lilac funnel flowers.
 * ========================================================================== */
const drawWaterSpinachRig: PlantRig = (ctx, input) => {
  const { sway, growthStage } = input;
  const outline = '#142914';

  ctx.save();
  ctx.translate(0, 148);

  // 1. Creeping hollow runner stems with swollen nodes running horizontally
  const nodes = [-130, -80, -25, 30, 85, 135];

  // Hanging adventitious roots from nodes
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2.0;
  ctx.lineCap = 'round';
  for (const nx of nodes) {
    for (const roff of [-6, 6]) {
      ctx.beginPath();
      ctx.moveTo(nx + roff, 0);
      ctx.quadraticCurveTo(nx + roff + sway * 6, 18, nx + roff - sway * 4, 34);
      ctx.stroke();
    }
  }

  // Horizontal hollow runner stem
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-140, 0);
  for (const nx of nodes) {
    ctx.lineTo(nx, Math.sin(nx * 0.05) * 4);
  }
  ctx.lineTo(145, 0);
  ctx.stroke();

  // Swollen joint nodes
  ctx.fillStyle = '#15803d';
  for (const nx of nodes) {
    ctx.beginPath();
    ctx.ellipse(nx, Math.sin(nx * 0.05) * 4, 6.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Hastate (arrowhead-shaped) leaves rising on arching petioles
  const leafNodes = [
    { nx: -105, py: -38, ang: -2.3, len: 44 },
    { nx: -55, py: -45, ang: -2.0, len: 48 },
    { nx: 0, py: -50, ang: -1.57, len: 52 },
    { nx: 55, py: -45, ang: -1.15, len: 48 },
    { nx: 105, py: -38, ang: -0.85, len: 44 },
  ];

  for (const ln of leafNodes) {
    ctx.save();
    ctx.translate(ln.nx, 0);

    // Arching petiole
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(sway * 8, ln.py * 0.5, sway * 12, ln.py);
    ctx.stroke();

    // Hastate Arrowhead Leaf Blade
    ctx.translate(sway * 12, ln.py);
    ctx.rotate(ln.ang + sway * 0.08);

    const hastP = new Path2D();
    hastP.moveTo(0, 0); // Basal notch
    hastP.lineTo(-14, 18); // Left basal lobe
    hastP.lineTo(-10, 8);
    hastP.bezierCurveTo(-14, -15, -12, -35, 0, -ln.len); // Apex tip
    hastP.bezierCurveTo(12, -35, 14, -15, 10, 8);
    hastP.lineTo(14, 18); // Right basal lobe
    hastP.closePath();
    kitFillRimAndStroke(ctx, hastP, -14, -ln.len, 14, 18, '#86efac', '#22c55e', '#166534', outline, 2.0);

    ctx.restore();
  }

  // 3. White-and-violet morning glory funnel blossoms
  if (growthStage >= 2) {
    const flowers = [-65, 45];
    for (const fx of flowers) {
      ctx.save();
      ctx.translate(fx + sway * 8, -25);

      // Funnel petals (convolvulaceous morning glory)
      const fP = new Path2D();
      fP.moveTo(0, 10);
      fP.quadraticCurveTo(-18, -10, -22, -28);
      fP.quadraticCurveTo(0, -36, 22, -28);
      fP.quadraticCurveTo(18, -10, 0, 10);
      fP.closePath();
      kitFillRimAndStroke(ctx, fP, -22, -36, 22, 10, '#ffffff', '#f3e8ff', '#d8b4fe', outline, 1.8);

      // Deep violet throat center
      ctx.fillStyle = '#7e22ce';
      ctx.beginPath();
      ctx.ellipse(0, -18, 6.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  ctx.restore();
};

/** Refined Herbs & Aquatic Plant Rigs Hook */
export const HERBS_AQUATIC_PLANT_RIGS: Record<string, PlantRig> = {
  plant_08_tropical_pitcher_plant: drawPitcherPlant,
  plant_11_hibiscus: drawHibiscus,
  plant_12_ixora: drawIxora,
  plant_18_tropical_orchid: drawTropicalOrchid,
  plant_22_tropical_seagrass_enhalus_acoroides: drawEnhalusSeagrass,
  plant_23_tropical_turtle_grass_thalassia_hemprichii: drawThalassiaTurtleGrass,
  plant_24_eelgrass: drawEelgrass,
  plant_26_lotus: drawLotus,
  plant_27_water_lily: drawWaterLily,
  plant_30_water_spinach: drawWaterSpinachRig,
};
