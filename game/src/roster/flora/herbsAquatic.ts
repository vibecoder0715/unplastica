import type { PlantRig } from './types';
import { kitFillRimAndStroke } from '../animalRenderer';

/* ============================================================================
 * P08: TROPICAL PITCHER PLANT (Nepenthes rafflesiana / ampullaria)
 * Elongated strap leaves tapering into coiled tendrils from the exact leaf apex,
 * from which hang upright jug-shaped pitchers with ribbed peristomes, vertical
 * fringed wings, and overhanging operculum lids.
 * ========================================================================== */
const drawPitcherPlant: PlantRig = (ctx, input) => {
  const { sway, growthStage } = input;
  const outline = '#172517';

  ctx.save();
  ctx.translate(0, 142);
  ctx.scale(1.22, 1.22);

  // 1. Central woody-green climbing vine stem with leaf nodes
  ctx.fillStyle = '#4d7c0f';
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.4;
  const stemP = new Path2D();
  stemP.moveTo(-5, 14);
  stemP.quadraticCurveTo(-4 + sway * 3, -25, -3 + sway * 6, -68);
  stemP.lineTo(3 + sway * 6, -68);
  stemP.quadraticCurveTo(4 + sway * 3, -25, 5, 14);
  stemP.closePath();
  kitFillRimAndStroke(ctx, stemP, -5, -68, 5, 14, '#a3e635', '#4d7c0f', '#365314', outline, 2.2);

  // Erect raceme flower spike rising from stem apex when flowering/fruiting
  if (growthStage >= 2) {
    const spikeTopX = sway * 10;
    ctx.strokeStyle = '#4d7c0f';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sway * 6, -66);
    ctx.quadraticCurveTo(sway * 8, -95, spikeTopX, -124);
    ctx.stroke();

    for (const [fy, side] of [
      [-82, -1],
      [-92, 1],
      [-102, -1],
      [-112, 1],
      [-122, 0],
    ] as const) {
      const fx = spikeTopX + side * 10;
      ctx.strokeStyle = '#65a30d';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(spikeTopX, fy + 4);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      // 4-tepaled maroon-gold Nepenthes flower
      for (let t = 0; t < 4; t++) {
        const a = (t * Math.PI) / 2 + 0.4;
        ctx.fillStyle = '#991b1b';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.ellipse(fx + Math.cos(a) * 3.2, fy + Math.sin(a) * 3.2, 2.4, 1.5, a, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2. Rosette & cauline strap leaves with exact computed apex coordinates for tendril attachment
  const leaves = [
    { nodeY: -54, ang: -2.52, len: 74, hangX: -82, hangY: -8, scale: 0.98, isLeft: true },
    { nodeY: -52, ang: -0.62, len: 74, hangX: 82, hangY: -8, scale: 0.98, isLeft: false },
    { nodeY: -32, ang: -2.78, len: 58, hangX: -46, hangY: 16, scale: 0.82, isLeft: true },
    { nodeY: -30, ang: -0.36, len: 58, hangX: 46, hangY: 16, scale: 0.82, isLeft: false },
  ];

  for (const l of leaves) {
    const nodeX = sway * 5 * (Math.abs(l.nodeY) / 60);
    const effAng = l.ang + sway * 0.05;
    const tipX = nodeX + Math.cos(effAng) * l.len;
    const tipY = l.nodeY + Math.sin(effAng) * l.len;

    ctx.save();
    ctx.translate(nodeX, l.nodeY);
    ctx.rotate(effAng);

    // Clasping leaf base + lanceolate lamina blade tapering to apex
    const leafP = new Path2D();
    leafP.moveTo(-2, -3);
    leafP.bezierCurveTo(l.len * 0.28, -14, l.len * 0.72, -12, l.len, 0);
    leafP.bezierCurveTo(l.len * 0.72, 12, l.len * 0.28, 14, -2, 3);
    leafP.closePath();
    kitFillRimAndStroke(ctx, leafP, 0, -14, l.len, 14, '#bef264', '#65a30d', '#365314', outline, 2.0);

    // Prominent pale-yellow midrib continuing to the exact leaf tip
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(l.len, 0);
    ctx.stroke();
    ctx.restore();

    // 3. Continuous twining tendril starting at the EXACT leaf tip (tipX, tipY)
    // and curving down into the basal bottom of the Nepenthes pitcher jug!
    const pX = l.hangX + sway * 8;
    const pY = l.hangY;
    const bottomY = pY + 72 * l.scale;
    const dir = l.isLeft ? -1 : 1;

    ctx.strokeStyle = '#4d7c0f';
    ctx.lineWidth = 2.6 * l.scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.bezierCurveTo(
      tipX + dir * 18,
      tipY + 26,
      pX + dir * 24,
      bottomY + 12,
      pX,
      bottomY - 2,
    );
    ctx.stroke();

    // 4. Pitcher jug body (Nepenthes rafflesiana / ampullaria)
    ctx.save();
    ctx.translate(pX, pY);
    ctx.scale(l.scale, l.scale);
    ctx.rotate(sway * 0.06);

    const jugP = new Path2D();
    jugP.moveTo(-15, 0);
    jugP.bezierCurveTo(-18, 18, -26, 44, -18, 62);
    jugP.bezierCurveTo(-10, 74, 10, 74, 18, 62);
    jugP.bezierCurveTo(26, 44, 18, 18, 15, 0);
    jugP.closePath();
    kitFillRimAndStroke(ctx, jugP, -26, 0, 26, 74, '#fde047', '#dc2626', '#7f1d1d', outline, 2.3);

    // Two vertical fringed wings (alae) running down the ventral belly of the pitcher
    ctx.strokeStyle = '#bef264';
    ctx.lineWidth = 1.4;
    for (const wSide of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(wSide * 7, 6);
      ctx.quadraticCurveTo(wSide * 11, 36, wSide * 6, 64);
      ctx.stroke();
      for (let wy = 12; wy <= 58; wy += 9) {
        ctx.beginPath();
        ctx.moveTo(wSide * 8, wy);
        ctx.lineTo(wSide * 12, wy + 2);
        ctx.stroke();
      }
    }

    // Mottled crimson-maroon blotches on pitcher wall
    ctx.fillStyle = 'rgba(69, 10, 10, 0.65)';
    for (const [sx, sy, sr] of [
      [-10, 24, 3.6],
      [9, 28, 4.0],
      [-11, 46, 4.2],
      [10, 50, 3.8],
      [0, 62, 3.2],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr, sr * 1.25, 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dark digestive fluid shadow inside the pitcher mouth opening
    ctx.fillStyle = '#270909';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ribbed peristome collar (flared striped lip)
    const peristomeP = new Path2D();
    peristomeP.ellipse(0, 0, 18.5, 6.8, 0, 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, peristomeP, -18.5, -6.8, 18.5, 6.8, '#fef08a', '#eab308', '#991b1b', outline, 1.8);

    // Inner mouth aperture
    ctx.fillStyle = '#3b0808';
    ctx.beginPath();
    ctx.ellipse(0, 0.5, 11.5, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fine radial crimson ribs across the peristome lip
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.15;
    for (let r = -14; r <= 14; r += 2.8) {
      ctx.beginPath();
      ctx.moveTo(r * 0.75, -3.2);
      ctx.lineTo(r, -6.2);
      ctx.moveTo(r * 0.75, 3.2);
      ctx.lineTo(r, 6.2);
      ctx.stroke();
    }

    // Neck attachment stalk connecting back of peristome to the vaulted operculum lid
    ctx.fillStyle = '#84cc16';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4, -5.5);
    ctx.lineTo(-3, -11);
    ctx.lineTo(3, -11);
    ctx.lineTo(4, -5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Vaulted operculum (lid) overhanging the mouth
    const lidP = new Path2D();
    lidP.moveTo(-15, -9);
    lidP.quadraticCurveTo(0, -25, 15, -9);
    lidP.quadraticCurveTo(0, -14, -15, -9);
    lidP.closePath();
    kitFillRimAndStroke(ctx, lidP, -15, -25, 15, -9, '#bef264', '#84cc16', '#4d7c0f', outline, 1.8);

    ctx.restore();
  }

  ctx.restore();
};

/* ============================================================================
 * P11: HIBISCUS / BUNGA RAYA (Hibiscus rosa-sinensis)
 * Woody shrub branching where every serrated leaf and scarlet 5-petaled
 * blossom is physically attached via petioles/pedicels to exact points along
 * the branching woody stems.
 * ========================================================================== */
const drawHibiscus: PlantRig = (ctx, input) => {
  const { sway, growthStage } = input;
  const outline = '#172517';

  ctx.save();
  ctx.translate(0, 148);

  // Helper to evaluate point on quadratic Bezier stem
  const evalQuad = (x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, t: number): [number, number] => {
    const mt = 1 - t;
    return [
      mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
      mt * mt * y0 + 2 * mt * t * cy + t * t * y1,
    ];
  };

  // 1. Woody shrub branches radiating from a unified basal root collar
  const stems = [
    { x0: 0, y0: 6, cx: -26, cy: -58, x1: -56 + sway * 9, y1: -124, w: 7.5 },
    { x0: 0, y0: 6, cx: 0, cy: -74, x1: sway * 11, y1: -150, w: 8.5 },
    { x0: 0, y0: 6, cx: 26, cy: -58, x1: 56 + sway * 9, y1: -124, w: 7.5 },
    { x0: -14, y0: -34, cx: -52, cy: -64, x1: -88 + sway * 7, y1: -92, w: 5.5 },
    { x0: 14, y0: -34, cx: 52, cy: -64, x1: 88 + sway * 7, y1: -92, w: 5.5 },
  ];

  // Draw woody stems with bark shading
  for (const s of stems) {
    ctx.strokeStyle = '#291d12';
    ctx.lineWidth = s.w + 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y0);
    ctx.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1);
    ctx.stroke();

    ctx.strokeStyle = '#785c42';
    ctx.lineWidth = s.w;
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y0);
    ctx.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1);
    ctx.stroke();
  }

  // 2. Serrated ovate leaves attached directly to exact nodes along each stem via petioles
  const leafAttachments: Array<{ stemIdx: number; t: number; ang: number; len: number }> = [
    { stemIdx: 0, t: 0.42, ang: -2.55, len: 46 },
    { stemIdx: 0, t: 0.72, ang: -2.35, len: 48 },
    { stemIdx: 0, t: 0.88, ang: -0.65, len: 42 },
    { stemIdx: 1, t: 0.38, ang: -2.15, len: 46 },
    { stemIdx: 1, t: 0.56, ang: -0.95, len: 48 },
    { stemIdx: 1, t: 0.78, ang: -2.05, len: 44 },
    { stemIdx: 2, t: 0.42, ang: -0.58, len: 46 },
    { stemIdx: 2, t: 0.72, ang: -0.78, len: 48 },
    { stemIdx: 2, t: 0.88, ang: -2.45, len: 42 },
    { stemIdx: 3, t: 0.65, ang: -2.65, len: 42 },
    { stemIdx: 3, t: 0.96, ang: -2.25, len: 44 },
    { stemIdx: 4, t: 0.65, ang: -0.48, len: 42 },
    { stemIdx: 4, t: 0.96, ang: -0.88, len: 44 },
  ];

  for (const la of leafAttachments) {
    const s = stems[la.stemIdx];
    const [nx, ny] = evalQuad(s.x0, s.y0, s.cx, s.cy, s.x1, s.y1, la.t);
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(la.ang + sway * 0.07);

    // Petiole stalk connecting leaf blade to the stem node
    ctx.strokeStyle = '#365314';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();

    ctx.translate(7, 0);
    // Serrated Hibiscus leaf blade
    const lP = new Path2D();
    lP.moveTo(0, 0);
    lP.bezierCurveTo(la.len * 0.25, -15, la.len * 0.55, -16, la.len * 0.72, -10);
    lP.lineTo(la.len * 0.68, -7);
    lP.quadraticCurveTo(la.len * 0.86, -6, la.len, 0);
    lP.quadraticCurveTo(la.len * 0.86, 6, la.len * 0.68, 7);
    lP.lineTo(la.len * 0.72, 10);
    lP.bezierCurveTo(la.len * 0.55, 16, la.len * 0.25, 15, 0, 0);
    lP.closePath();
    kitFillRimAndStroke(ctx, lP, 0, -16, la.len, 16, '#86efac', '#16a34a', '#14532d', outline, 2.0);

    // Midrib and pinnate lateral veins
    ctx.strokeStyle = '#dcfce7';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(la.len * 0.9, 0);
    for (const vt of [0.28, 0.52, 0.74]) {
      ctx.moveTo(la.len * vt, 0);
      ctx.lineTo(la.len * (vt + 0.12), -7);
      ctx.moveTo(la.len * vt, 0);
      ctx.lineTo(la.len * (vt + 0.12), 7);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 3. Iconic Scarlet Hibiscus Blossoms mounted directly on the branch tips
  const flowers = [
    { x: stems[1].x1, y: stems[1].y1 - 4, scale: 1.12, ang: 0 },
    { x: stems[0].x1, y: stems[0].y1 - 4, scale: 0.92, ang: -0.32 },
    { x: stems[2].x1, y: stems[2].y1 - 4, scale: 0.92, ang: 0.32 },
  ];

  const n = growthStage >= 2 ? flowers.length : 1;
  for (let f = 0; f < n; f++) {
    const fl = flowers[f];
    ctx.save();
    ctx.translate(fl.x, fl.y);
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
      petalP.bezierCurveTo(-18, -25, -28, -55, 0, -66);
      petalP.bezierCurveTo(28, -55, 18, -25, 0, 0);
      petalP.closePath();
      kitFillRimAndStroke(ctx, petalP, -28, -66, 28, 0, '#f87171', '#dc2626', '#991b1b', outline, 2.4);

      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1.2;
      for (const vx of [-10, 0, 10]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(vx * 0.6, -30, vx, -54);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Deep crimson flower center eye
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Long Protruding Staminal Column with golden anthers and 5 red stigma pads
    ctx.save();
    ctx.rotate(-0.15 + fl.ang);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(8, -25, 12, -54);
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.0;
    for (let a = 1; a <= 8; a++) {
      const ay = -24 - a * 3.4;
      const ax = 6 + Math.sin(a * 1.5) * 5.5;
      ctx.beginPath();
      ctx.arc(ax, ay, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = '#b91c1c';
    for (let st = 0; st < 5; st++) {
      const stang = (st / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(12 + Math.cos(stang) * 4.5, -54 + Math.sin(stang) * 3.5, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }

  ctx.restore();
};

/* ============================================================================
 * P12: IXORA (Ixora coccinea / Pejuang Hutan)
 * Branched woody shrub where opposite glossy leaves clasp the exact nodes on
 * the stems, and terminal dome corymbs of 4-petaled star tubular scarlet flowers
 * sit on branched peduncles at the stem apices.
 * ========================================================================== */
const drawIxora: PlantRig = (ctx, input) => {
  const { sway, growthStage } = input;
  const outline = '#172517';

  ctx.save();
  ctx.translate(0, 148);

  const evalQuad = (x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, t: number): [number, number] => {
    const mt = 1 - t;
    return [
      mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
      mt * mt * y0 + 2 * mt * t * cy + t * t * y1,
    ];
  };

  // 1. Woody shrub branches connected at root collar
  const stems = [
    { x0: 0, y0: 6, cx: -28, cy: -52, x1: -64 + sway * 7, y1: -112, w: 6.5 },
    { x0: 0, y0: 6, cx: 0, cy: -66, x1: sway * 8, y1: -132, w: 7.5 },
    { x0: 0, y0: 6, cx: 28, cy: -52, x1: 64 + sway * 7, y1: -112, w: 6.5 },
  ];

  for (const s of stems) {
    ctx.strokeStyle = '#291d12';
    ctx.lineWidth = s.w + 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y0);
    ctx.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1);
    ctx.stroke();

    ctx.strokeStyle = '#6b4f35';
    ctx.lineWidth = s.w;
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y0);
    ctx.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1);
    ctx.stroke();
  }

  // 2. Opposite decussate glossy leaves clasping exact nodes along each stem
  for (let sIdx = 0; sIdx < stems.length; sIdx++) {
    const s = stems[sIdx];
    for (const t of [0.38, 0.64, 0.86]) {
      const [nx, ny] = evalQuad(s.x0, s.y0, s.cx, s.cy, s.x1, s.y1, t);
      for (const side of [-1, 1]) {
        const ang = side === -1 ? -2.35 : -0.78;
        const len = 40 - t * 4;
        ctx.save();
        ctx.translate(nx, ny);
        ctx.rotate(ang + sway * 0.06);

        const lP = new Path2D();
        lP.moveTo(0, 0);
        lP.bezierCurveTo(len * 0.35, -13, len * 0.75, -10, len, 0);
        lP.bezierCurveTo(len * 0.75, 10, len * 0.35, 13, 0, 0);
        lP.closePath();
        kitFillRimAndStroke(ctx, lP, 0, -13, len, 13, '#86efac', '#16a34a', '#14532d', outline, 1.8);

        ctx.strokeStyle = '#dcfce7';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len * 0.88, 0);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // 3. Dense Terminal Dome Corymbs mounted directly on the stem tips
  const corymbs = [
    { x: stems[1].x1, y: stems[1].y1 - 8, r: 40, count: 22 },
    { x: stems[0].x1, y: stems[0].y1 - 6, r: 33, count: 16 },
    { x: stems[2].x1, y: stems[2].y1 - 6, r: 33, count: 16 },
  ];

  const n = growthStage >= 2 ? corymbs.length : 1;
  for (let c = 0; c < n; c++) {
    const cm = corymbs[c];
    ctx.save();
    ctx.translate(cm.x, cm.y);

    // Branched green corymb pedicel truss connecting stem apex to florets
    ctx.strokeStyle = '#3f6212';
    ctx.lineWidth = 2.4;
    for (const rx of [-14, -6, 0, 6, 14]) {
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(rx, -4);
      ctx.stroke();
    }

    const domeP = new Path2D();
    domeP.arc(0, 0, cm.r, 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, domeP, -cm.r, -cm.r, cm.r, cm.r, '#f87171', '#dc2626', '#991b1b', outline, 2.2);

    // Dozens of 4-petaled star florets packed in the dome
    for (let f = 0; f < cm.count; f++) {
      const fang = (f / cm.count) * Math.PI * 2 + (f % 3) * 0.4;
      const fdist = (Math.sin(f * 3.7) * 0.4 + 0.5) * cm.r * 0.82;
      const fx = Math.cos(fang) * fdist;
      const fy = Math.sin(fang) * fdist * 0.8;

      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(f * 0.5);

      ctx.fillStyle = f % 2 === 0 ? '#fca5a5' : '#ef4444';
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1.0;
      for (let p = 0; p < 4; p++) {
        const pang = (p / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(pang) * 5, Math.sin(pang) * 5, 2.3, 4.6, pang, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  ctx.restore();
};

/* ============================================================================
 * P18: TROPICAL ORCHID (Dendrobium / Phalaenopsis)
 * Clustered green pseudobulbs, silvery-white aerial velamen roots with emerald
 * tips, arching strap leaves, and arching raceme spike where every bilateral
 * orchid blossom is connected by a floral pedicel to the main rachis.
 * ========================================================================== */
const drawTropicalOrchid: PlantRig = (ctx, input) => {
  const { sway, growthStage } = input;
  const outline = '#26142e';

  ctx.save();
  ctx.translate(0, 145);
  ctx.scale(1.22, 1.22);

  // 1. Silvery-white aerial velamen roots with emerald growing tips
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  for (const rx of [-35, -20, -5, 12, 28, 42]) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(rx * 0.6, -10);
    ctx.quadraticCurveTo(rx * 1.1, 15, rx, 34);
    ctx.stroke();
    ctx.strokeStyle = '#84cc16';
    ctx.beginPath();
    ctx.moveTo(rx, 27);
    ctx.lineTo(rx, 34);
    ctx.stroke();
  }

  // 2. Clustered swollen green pseudobulbs
  const bulbs = [-24, -8, 10, 26];
  for (let b = 0; b < bulbs.length; b++) {
    const bx = bulbs[b];
    const bulbP = new Path2D();
    bulbP.ellipse(bx, -18, 11, 26, 0.08 * (b - 1.5), 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, bulbP, bx - 11, -44, bx + 11, 8, '#bef264', '#84cc16', '#4d7c0f', outline, 2.0);
    ctx.strokeStyle = '#3f6212';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx, -42);
    ctx.lineTo(bx, 6);
    ctx.stroke();
  }

  // 3. Arching leathery strap leaves clasping the pseudobulb tops
  const leaves = [
    { x: -16, ang: -2.45, len: 90 },
    { x: -6, ang: -2.1, len: 105 },
    { x: 6, ang: -1.05, len: 105 },
    { x: 16, ang: -0.7, len: 90 },
  ];

  for (const l of leaves) {
    ctx.save();
    ctx.translate(l.x, -35);
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

  // 4. Arching raceme flower spike with connected floral pedicels & bilateral orchid blooms
  ctx.save();
  ctx.translate(0, -35);

  const spikeEndX = sway * 14;
  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = 4.0;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(14, -82, spikeEndX, -168);
  ctx.stroke();

  const flowerNodes = [
    { t: 0.44, x: -16, y: -74, scale: 0.82, rot: -0.2 },
    { t: 0.62, x: 18, y: -104, scale: 0.92, rot: 0.25 },
    { t: 0.80, x: -12, y: -134, scale: 1.04, rot: -0.15 },
    { t: 0.98, x: 10, y: -164, scale: 1.12, rot: 0.1 },
  ];

  const n = growthStage >= 2 ? flowerNodes.length : 1;
  for (let f = 0; f < n; f++) {
    const fn = flowerNodes[f];
    const mt = 1 - fn.t;
    const stemX = 2 * mt * fn.t * 14 + fn.t * fn.t * spikeEndX;
    const stemY = 2 * mt * fn.t * -82 + fn.t * fn.t * -168;
    const flX = fn.x + sway * 11;
    const flY = fn.y;

    // Floral pedicel / ovary stalk connecting main spike directly to orchid blossom
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(stemX, stemY + 6);
    ctx.quadraticCurveTo((stemX + flX) * 0.5, stemY, flX, flY);
    ctx.stroke();

    ctx.save();
    ctx.translate(flX, flY);
    ctx.scale(fn.scale, fn.scale);
    ctx.rotate(fn.rot + sway * 0.08);

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

    // Distinct 3-Lobed Lip / Labellum
    const lipP = new Path2D();
    lipP.moveTo(0, 0);
    lipP.bezierCurveTo(-16, 8, -20, 24, -14, 32);
    lipP.bezierCurveTo(0, 38, 0, 38, 14, 32);
    lipP.bezierCurveTo(20, 24, 16, 8, 0, 0);
    lipP.closePath();
    kitFillRimAndStroke(ctx, lipP, -20, 0, 20, 38, '#fae8ff', '#d946ef', '#86198f', outline, 2.0);

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(0, 10, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

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
 * P22: ENHALUS SEAGRASS (Enhalus acoroides — Setu)
 * Continuous horizontal creeping rhizome with anchoring cord-roots, persistent
 * black fibrous sheaths clasping the shoot bases (never floating!), long wide
 * multi-nerved ribbon blades, and coiled basal peduncles bearing ovoid bristled
 * Enhalus seed capsules ("spores") physically connected to the rhizome nodes.
 * ========================================================================== */
const drawEnhalusSeagrass: PlantRig = (ctx, input) => {
  const { sway, growthStage } = input;
  const outline = '#022c22';

  ctx.save();
  ctx.translate(0, 152);

  const shootNodes = [-66, -38, -12, 14, 42, 68];

  // 1. Cord-like anchoring roots penetrating downward from the rhizome nodes into seabed
  ctx.strokeStyle = '#d6d3d1';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  for (const nx of shootNodes) {
    for (const roff of [-4, 4]) {
      ctx.beginPath();
      ctx.moveTo(nx + roff, 6);
      ctx.quadraticCurveTo(nx + roff * 1.5, 16, nx + roff * 1.2, 26);
      ctx.stroke();
    }
  }

  // 2. Continuous thick horizontal creeping rhizome stolon uniting all shoots
  const rhizP = new Path2D();
  rhizP.moveTo(-84, 0);
  rhizP.quadraticCurveTo(0, -3, 84, 0);
  rhizP.lineTo(84, 11);
  rhizP.quadraticCurveTo(0, 8, -84, 11);
  rhizP.closePath();
  kitFillRimAndStroke(ctx, rhizP, -84, -3, 84, 11, '#a8a29e', '#57534e', '#292524', outline, 2.4);

  // 3. Wide thick leathery ribbon blades emerging from clasping sheaths at each rhizome node
  const blades = [
    { x: -66, h: 215, w: 17, ang: -0.12 },
    { x: -38, h: 248, w: 19, ang: -0.06 },
    { x: -12, h: 265, w: 21, ang: -0.02 },
    { x: 14, h: 258, w: 20, ang: 0.03 },
    { x: 42, h: 242, w: 19, ang: 0.08 },
    { x: 68, h: 212, w: 17, ang: 0.14 },
  ];

  for (const b of blades) {
    ctx.save();
    ctx.translate(b.x, 3);
    ctx.rotate(b.ang + sway * 0.06);

    // Ribbon blade with thickened margins and rounded-toothed apex
    const bladeP = new Path2D();
    bladeP.moveTo(-b.w * 0.5, 0);
    bladeP.quadraticCurveTo(-b.w * 0.45 + sway * 24, -b.h * 0.5, -b.w * 0.34 + sway * 48, -b.h + 8);
    bladeP.quadraticCurveTo(sway * 48, -b.h - 3, b.w * 0.34 + sway * 48, -b.h + 8);
    bladeP.quadraticCurveTo(b.w * 0.45 + sway * 24, -b.h * 0.5, b.w * 0.5, 0);
    bladeP.closePath();
    kitFillRimAndStroke(ctx, bladeP, -b.w, -b.h, b.w, 0, '#6ee7b7', '#059669', '#064e3b', outline, 2.4);

    // Parallel multi-nerved longitudinal veins + transverse air-channel crossbars
    ctx.strokeStyle = 'rgba(209, 250, 229, 0.48)';
    ctx.lineWidth = 1.2;
    for (const vx of [-0.28, 0, 0.28]) {
      ctx.beginPath();
      ctx.moveTo(b.w * vx, -4);
      ctx.quadraticCurveTo(b.w * vx + sway * 24, -b.h * 0.5, b.w * vx + sway * 48, -b.h + 6);
      ctx.stroke();
    }

    // Basal clasping pale leaf-sheath Collar
    const sheathP = new Path2D();
    sheathP.moveTo(-b.w * 0.56, 2);
    sheathP.lineTo(-b.w * 0.5, -24);
    sheathP.quadraticCurveTo(0, -28, b.w * 0.5, -24);
    sheathP.lineTo(b.w * 0.56, 2);
    sheathP.closePath();
    kitFillRimAndStroke(ctx, sheathP, -b.w * 0.56, -28, b.w * 0.56, 2, '#d1fae5', '#6ee7b7', '#047857', outline, 1.8);

    // Persistent coarse black Enhalus fibrous bristles wrapping tightly around THIS shoot sheath base
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1.9;
    for (const fOff of [-5, -2, 2, 5]) {
      ctx.beginPath();
      ctx.moveTo(fOff, 3);
      ctx.quadraticCurveTo(fOff * 1.3, -9, fOff * 1.15, -19);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 4. Connected Enhalus Seagrass Flowers / Bristled Seed Capsules ("spores") on spiral stalks from shoot sheaths!
  const enhalusPods =
    growthStage >= 2
      ? ([
          [-25, -1, 58, 1.0],
          [28, 1, 64, 1.0],
        ] as const)
      : ([[-25, -1, 46, 0.78]] as const);
  for (const [nodeX, dir, hStalk, podScale] of enhalusPods) {
    const capX = nodeX + dir * 12 + sway * 14;
    const capY = -hStalk;
    const rot = dir * 0.16 + sway * 0.08;
    // Exact world-space point of the capsule's basal collar (0, 12 * podScale) in rotated frame
    const baseAttachX = capX - Math.sin(rot) * (12 * podScale);
    const baseAttachY = capY + Math.cos(rot) * (12 * podScale);

    // Two-pass outlined spiral peduncle stalk emerging directly out of the shoot node's clasping sheath (nodeX, -16)
    ctx.lineCap = 'round';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5.4;
    ctx.beginPath();
    ctx.moveTo(nodeX, -14);
    ctx.bezierCurveTo(
      nodeX + dir * 14,
      -hStalk * 0.42,
      nodeX - dir * 8 + sway * 7,
      -hStalk * 0.72,
      baseAttachX,
      baseAttachY,
    );
    ctx.stroke();

    ctx.strokeStyle = '#bef264';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(nodeX, -14);
    ctx.bezierCurveTo(
      nodeX + dir * 14,
      -hStalk * 0.42,
      nodeX - dir * 8 + sway * 7,
      -hStalk * 0.72,
      baseAttachX,
      baseAttachY,
    );
    ctx.stroke();

    // Ovoid ribbed & bristly Enhalus seed capsule / floral spathe physically welded to the stalk tip
    ctx.save();
    ctx.translate(capX, capY);
    ctx.rotate(rot);
    ctx.scale(podScale, podScale);

    // Clasping basal calyx cup uniting stalk to capsule base
    ctx.fillStyle = '#4d7c0f';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 12, 5.2, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const capP = new Path2D();
    capP.moveTo(0, -14);
    capP.bezierCurveTo(11, -10, 12, 6, 0, 12);
    capP.bezierCurveTo(-12, 6, -11, -10, 0, -14);
    capP.closePath();
    kitFillRimAndStroke(ctx, capP, -12, -14, 12, 12, '#d9f99d', '#65a30d', '#365314', outline, 2.0);

    // Longitudinal ribs & soft green-gold pericarp bristles on the capsule
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 10);
    ctx.moveTo(-5, -9);
    ctx.quadraticCurveTo(-6, 0, -3, 9);
    ctx.moveTo(5, -9);
    ctx.quadraticCurveTo(6, 0, 3, 9);
    ctx.stroke();

    // Small apical floral tepals at top of capsule
    ctx.fillStyle = '#fef9c3';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.1;
    for (const tx of [-3.5, 0, 3.5]) {
      ctx.beginPath();
      ctx.ellipse(tx, -14, 2.2, 3.6, tx * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
};

/* ============================================================================
 * P23: THALASSIA TURTLE GRASS (Thalassia hemprichii)
 * Annular scale-scarred horizontal rhizome with rootlets at each node, erect
 * short shoots wrapped in clasping basal sheaths, curved paddle-tipped ribbon
 * blades with tannin bars, and basal stalked warty seed capsules connected
 * directly to the rhizome shoot nodes.
 * ========================================================================== */
const drawThalassiaTurtleGrass: PlantRig = (ctx, input) => {
  const { sway, growthStage } = input;
  const outline = '#022c22';

  ctx.save();
  ctx.translate(0, 152);

  const shootNodes = [-68, -24, 22, 66];

  // 1. Branched anchoring rootlets descending from each rhizome node into the sand
  ctx.strokeStyle = '#d6d3d1';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  for (const nx of shootNodes) {
    ctx.beginPath();
    ctx.moveTo(nx, 7);
    ctx.quadraticCurveTo(nx - 5, 17, nx - 3, 25);
    ctx.moveTo(nx, 7);
    ctx.quadraticCurveTo(nx + 5, 17, nx + 4, 25);
    ctx.stroke();
  }

  // 2. Continuous annular ring-scarred horizontal creeping rhizome
  const rhizP = new Path2D();
  rhizP.moveTo(-88, 1);
  rhizP.quadraticCurveTo(0, -2, 88, 1);
  rhizP.lineTo(88, 10);
  rhizP.quadraticCurveTo(0, 7, -88, 10);
  rhizP.closePath();
  kitFillRimAndStroke(ctx, rhizP, -88, -2, 88, 10, '#fde047', '#a16207', '#451a03', outline, 2.2);

  // Annular internode ring scars along rhizome
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 1.6;
  for (let rx = -78; rx <= 78; rx += 13) {
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx, 9);
    ctx.stroke();
  }

  // 3. Erect short-shoot fans of curved (falcate) paddle-tipped blades emerging from basal sheaths
  for (let sIdx = 0; sIdx < shootNodes.length; sIdx++) {
    const nx = shootNodes[sIdx];
    const fanBlades = [
      { offX: -4, h: 148 + (sIdx % 2) * 18, w: 14.5, curl: -16 },
      { offX: 0, h: 176 + (sIdx % 2) * 14, w: 16, curl: -4 },
      { offX: 4, h: 156 + (sIdx % 2) * 16, w: 15, curl: 12 },
    ];

    for (const b of fanBlades) {
      ctx.save();
      ctx.translate(nx + b.offX, 2);

      const bP = new Path2D();
      bP.moveTo(-b.w * 0.45, 0);
      bP.quadraticCurveTo(-b.w * 0.4 + b.curl + sway * 18, -b.h * 0.5, -b.w * 0.48 + b.curl * 1.5 + sway * 34, -b.h + 12);
      // Rounded blunt paddle tip
      bP.quadraticCurveTo(b.curl * 1.5 + sway * 34, -b.h - 2, b.w * 0.48 + b.curl * 1.5 + sway * 34, -b.h + 12);
      bP.quadraticCurveTo(b.w * 0.4 + b.curl + sway * 18, -b.h * 0.5, b.w * 0.45, 0);
      bP.closePath();
      kitFillRimAndStroke(ctx, bP, -b.w, -b.h, b.w, 0, '#86efac', '#10b981', '#047857', outline, 2.1);

      // Parallel veins + short transverse reddish-brown tannin dashes characteristic of Thalassia
      ctx.strokeStyle = 'rgba(209, 250, 229, 0.45)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.quadraticCurveTo(b.curl + sway * 18, -b.h * 0.5, b.curl * 1.5 + sway * 34, -b.h + 8);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(120, 53, 15, 0.5)';
      ctx.lineWidth = 1.2;
      for (const ty of [0.35, 0.55, 0.75]) {
        const by = -b.h * ty;
        const bx = b.curl * 1.5 * ty + sway * 34 * ty;
        ctx.beginPath();
        ctx.moveTo(bx - b.w * 0.3, by);
        ctx.lineTo(bx + b.w * 0.3, by);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Clasping papery basal shoot sheath uniting the 3 blades onto the rhizome node
    const shP = new Path2D();
    shP.moveTo(nx - 11, 4);
    shP.lineTo(nx - 9, -22);
    shP.quadraticCurveTo(nx, -26, nx + 9, -22);
    shP.lineTo(nx + 11, 4);
    shP.closePath();
    kitFillRimAndStroke(ctx, shP, nx - 11, -26, nx + 11, 4, '#ecfccb', '#a3e635', '#4d7c0f', outline, 1.8);
  }

  // 4. Connected globose-echinate Thalassia seed pods borne on outlined basal pedicels emerging directly from the shoot sheaths!
  const thalassiaPods =
    growthStage >= 2
      ? ([
          [-24, -42, -52, 1.0],
          [22, 40, -56, 1.0],
        ] as const)
      : ([[-24, -38, -44, 0.8]] as const);
  for (const [nodeX, targetX, py, podScale] of thalassiaPods) {
    const podX = targetX + sway * 10;
    const rPod = 10.5 * podScale;
    const baseAttachY = py + rPod * 0.92;

    // Two-pass outlined sturdy basal pedicel stalk connecting the shoot sheath (nodeX, -18) directly into the pod base
    ctx.lineCap = 'round';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5.2;
    ctx.beginPath();
    ctx.moveTo(nodeX, -18);
    ctx.quadraticCurveTo((nodeX + podX) * 0.5, py * 0.55, podX, baseAttachY);
    ctx.stroke();

    ctx.strokeStyle = '#d9f99d';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(nodeX, -18);
    ctx.quadraticCurveTo((nodeX + podX) * 0.5, py * 0.55, podX, baseAttachY);
    ctx.stroke();

    // Clasping basal bract collar uniting stalk and seed capsule
    ctx.fillStyle = '#4d7c0f';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(podX, baseAttachY, 4.6 * podScale, 2.4 * podScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const podP = new Path2D();
    podP.arc(podX, py, rPod, 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, podP, podX - rPod, py - rPod, podX + rPod, py + rPod, '#d9f99d', '#84cc16', '#3f6212', outline, 2.0);

    // 3-valved pericarp suture lines + fleshy echinate tubercles on Thalassia fruit capsule
    ctx.strokeStyle = 'rgba(26, 46, 5, 0.55)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(podX, py - rPod * 0.85);
    ctx.quadraticCurveTo(podX - 3 * podScale, py, podX, py + rPod * 0.85);
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    for (const [tx, ty] of [
      [-4, -3],
      [4, -3],
      [0, 3],
      [-3, 4],
      [3, 4],
    ] as const) {
      ctx.beginPath();
      ctx.arc(podX + tx * podScale, py + ty * podScale, 1.5 * podScale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
};

/* ============================================================================
 * P24: EELGRASS (Zostera / Halodule)
 * Continuous creeping monopodial rhizome with fine root tufts at nodes,
 * clasping tubular leaf sheaths uniting dense tufts of slender emerald ribbon
 * blades, and fertile reproductive spathe sheaths enclosing rows of seeds
 * physically connected along a continuous spadix axis (zero disconnected spores!).
 * ========================================================================== */
const drawEelgrass: PlantRig = (ctx, input) => {
  const { sway, growthStage } = input;
  const outline = '#022c22';

  ctx.save();
  ctx.translate(0, 152);

  const shootNodes = [-70, -42, -14, 14, 42, 70];

  // 1. Fine fibrous root tufts anchoring each rhizome node into the seabed
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (const nx of shootNodes) {
    for (const roff of [-4, 0, 4]) {
      ctx.beginPath();
      ctx.moveTo(nx + roff, 5);
      ctx.quadraticCurveTo(nx + roff * 1.4, 15, nx + roff * 1.2, 23);
      ctx.stroke();
    }
  }

  // 2. Continuous creeping horizontal rhizome stolon uniting all Eelgrass tufts
  const rhizP = new Path2D();
  rhizP.moveTo(-82, 1);
  rhizP.quadraticCurveTo(0, -2, 82, 1);
  rhizP.lineTo(82, 8);
  rhizP.quadraticCurveTo(0, 5, -82, 8);
  rhizP.closePath();
  kitFillRimAndStroke(ctx, rhizP, -82, -2, 82, 8, '#a7f3d0', '#059669', '#064e3b', outline, 2.0);

  // 3. Dense slender ribbon blades grouped into sheathed tufts at each rhizome node
  for (let i = 0; i < shootNodes.length; i++) {
    const nx = shootNodes[i];
    const centerFactor = 1 - Math.abs(nx) / 95;
    const tuftBlades = [
      { offX: -3, h: 175 + centerFactor * 55, w: 8.5, ang: -0.06 },
      { offX: 2, h: 195 + centerFactor * 60, w: 9.5, ang: 0.04 },
    ];

    for (const b of tuftBlades) {
      ctx.save();
      ctx.translate(nx + b.offX, 3);
      ctx.rotate(b.ang + sway * 0.07);

      const bP = new Path2D();
      bP.moveTo(-b.w * 0.5, 0);
      bP.quadraticCurveTo(-b.w * 0.42 + sway * 26, -b.h * 0.5, -b.w * 0.22 + sway * 52, -b.h);
      bP.lineTo(b.w * 0.22 + sway * 52, -b.h);
      bP.quadraticCurveTo(b.w * 0.42 + sway * 26, -b.h * 0.5, b.w * 0.5, 0);
      bP.closePath();
      kitFillRimAndStroke(ctx, bP, -b.w, -b.h, b.w, 0, '#a7f3d0', '#34d399', '#059669', outline, 1.8);

      // Central vascular midrib
      ctx.strokeStyle = 'rgba(236, 253, 245, 0.55)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.quadraticCurveTo(sway * 26, -b.h * 0.5, sway * 52, -b.h + 4);
      ctx.stroke();

      ctx.restore();
    }

    // Tubular basal leaf sheath clasping each tuft on the rhizome
    const shP = new Path2D();
    shP.moveTo(nx - 7.5, 4);
    shP.lineTo(nx - 6.5, -18);
    shP.quadraticCurveTo(nx, -21, nx + 6.5, -18);
    shP.lineTo(nx + 7.5, 4);
    shP.closePath();
    kitFillRimAndStroke(ctx, shP, nx - 7.5, -21, nx + 7.5, 4, '#d1fae5', '#6ee7b7', '#047857', outline, 1.6);
  }

  // 4. Connected Zostera reproductive spadix sheaths (enclosing neat rows of golden-green seeds/spores
  // attached along a central rachis axis) borne on outlined fertile stems rising directly from the shoot sheaths!
  const eelSpathes =
    growthStage >= 2
      ? ([
          [-14, -28, -92, 1.0],
          [14, 28, -98, 1.0],
        ] as const)
      : ([[-14, -24, -76, 0.82]] as const);
  for (const [nodeX, sx, sy, spScale] of eelSpathes) {
    const spX = sx + sway * 22;
    const rot = (sx < 0 ? -0.06 : 0.06) + sway * 0.1;
    // Exact world-space point of the spathe's basal collar (0, 22 * spScale) in rotated frame
    const baseAttachX = spX - Math.sin(rot) * (21 * spScale);
    const baseAttachY = sy + Math.cos(rot) * (21 * spScale);

    // Two-pass outlined fertile stem rising directly out of the shoot sheath (nodeX, -16) into the spathe base
    ctx.lineCap = 'round';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5.0;
    ctx.beginPath();
    ctx.moveTo(nodeX, -15);
    ctx.quadraticCurveTo(sx + sway * 11, sy * 0.5, baseAttachX, baseAttachY);
    ctx.stroke();

    ctx.strokeStyle = '#bef264';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(nodeX, -15);
    ctx.quadraticCurveTo(sx + sway * 11, sy * 0.5, baseAttachX, baseAttachY);
    ctx.stroke();

    ctx.save();
    ctx.translate(spX, sy);
    ctx.rotate(rot);
    ctx.scale(spScale, spScale);

    // Boat-shaped fertile spathe sheath enclosing the spadix
    const spadixP = new Path2D();
    spadixP.ellipse(0, 0, 6.8, 22, 0, 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, spadixP, -6.8, -22, 6.8, 22, '#d9f99d', '#34d399', '#047857', outline, 1.9);

    // Clasping nodal bract collar at the base of the spathe (0, 21) uniting stem and spathe
    ctx.fillStyle = '#6ee7b7';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 21, 4.2, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Continuous central spadix axis (rachis) connecting all seeds/spores from the stem up to the apex!
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(0, -17);
    ctx.stroke();

    // Enclosed row of oval Eelgrass seeds/spores physically attached via short funicles to the central spadix axis
    for (const [seedY, side] of [
      [-12, -1],
      [-4, 1],
      [4, -1],
      [12, 1],
    ] as const) {
      ctx.strokeStyle = '#3f6212';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, seedY + 2);
      ctx.lineTo(side * 1.2, seedY);
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#3f6212';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(side * 1.1, seedY, 2.7, 3.5, side * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
};

/* ============================================================================
 * P26: LOTUS (Nelumbo nucifera)
 * Circular, peltate (unnotched) umbrella leaves held high on prickly emergent
 * stalks rising from a shared basal crown; large pink bloom + flat-topped
 * showerhead seed pod (torus).
 * ========================================================================== */
const drawLotus: PlantRig = (ctx, input) => {
  const { sway, growthStage } = input;
  const outline = '#042f2e';

  ctx.save();
  ctx.translate(0, 148);

  // 1. Tall erect emergent stalks rising from the shared rhizome base
  const stalks = [
    { x0: -10, y0: 8, cx: -48, cy: -58, x1: -75, y1: -110 },
    { x0: 10, y0: 8, cx: 48, cy: -58, x1: 75, y1: -110 },
    { x0: 0, y0: 8, cx: -4, cy: -80, x1: 0, y1: -154 },
    { x0: 6, y0: 8, cx: 34, cy: -68, x1: 50, y1: -130 },
  ];

  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  for (const s of stalks) {
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y0);
    ctx.quadraticCurveTo(s.cx, s.cy, s.x1 + sway * 10, s.y1);
    ctx.stroke();
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

    const padP = new Path2D();
    padP.ellipse(0, 0, l.rx, l.ry, 0, 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, padP, -l.rx, -l.ry, l.rx, l.ry, '#6ee7b7', '#10b981', '#047857', outline, 2.8);

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

  // 3. Tall high pink lotus bloom held above leaves on central peduncle
  if (growthStage >= 2) {
    ctx.save();
    ctx.translate(sway * 10, -155);

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

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.6;
    for (let a = 0; a < 20; a++) {
      const ang = (a / 20) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * 16, Math.sin(ang) * 10);
      ctx.lineTo(Math.cos(ang) * 22, Math.sin(ang) * 14);
      ctx.stroke();
    }

    // Flat-Topped Showerhead Seed Pod (Torus) in bloom center
    const podP = new Path2D();
    podP.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, podP, -16, -10, 16, 10, '#fef08a', '#eab308', '#ca8a04', outline, 2.0);

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
  }

  ctx.restore();
};

/* ============================================================================
 * P27: WATER LILY (Nymphaea)
 * Flexible underwater petioles and peduncle rising from the rooted riverbed
 * crown up to the round V-notched floating pads and star-petaled flower.
 * ========================================================================== */
const drawWaterLily: PlantRig = (ctx, input) => {
  const { sway, growthStage } = input;
  const outline = '#042f2e';

  ctx.save();
  ctx.translate(0, 148);

  const pads = [
    { x: -68, y: -32, rx: 64, ry: 23, notchAng: 0.4 },
    { x: 64, y: -26, rx: 66, ry: 24, notchAng: -0.35 },
    { x: 0, y: -12, rx: 72, ry: 26, notchAng: 0.1 },
  ];

  // 1. Flexible S-curved submerged petioles & floral peduncle connecting riverbed root crown to floating pads
  ctx.strokeStyle = '#065f46';
  ctx.lineWidth = 4.6;
  ctx.lineCap = 'round';
  for (const p of pads) {
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(p.x * 0.45, 2, p.x + sway * 8, p.y);
    ctx.stroke();
  }
  if (growthStage >= 2) {
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 5.2;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(sway * 5, -10, sway * 8, -38);
    ctx.stroke();
  }

  // 2. Round V-notched floating pads with radiating peltate venation
  for (const p of pads) {
    ctx.save();
    ctx.translate(p.x + sway * 8, p.y);

    const padP = new Path2D();
    padP.ellipse(0, 0, p.rx, p.ry, 0, p.notchAng + 0.35, p.notchAng + Math.PI * 2 - 0.35);
    padP.lineTo(0, 0);
    padP.closePath();
    kitFillRimAndStroke(ctx, padP, -p.rx, -p.ry, p.rx, p.ry, '#86efac', '#10b981', '#065f46', outline, 2.6);

    ctx.strokeStyle = 'rgba(209, 250, 229, 0.45)';
    ctx.lineWidth = 1.2;
    for (let a = 1; a <= 9; a++) {
      const va = p.notchAng + 0.5 + (a / 10) * (Math.PI * 2 - 1.0);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(va) * p.rx * 0.85, Math.sin(va) * p.ry * 0.85);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 3. Floating star flower resting on water surface
  if (growthStage >= 2) {
    ctx.save();
    ctx.translate(sway * 8, -38);

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

    for (let p = 0; p < 8; p++) {
      const pang = (p / 8) * Math.PI * 2 + Math.PI / 8;
      ctx.save();
      ctx.rotate(pang);
      const inP = new Path2D();
      inP.moveTo(0, 0);
      inP.lineTo(-4, -14);
      inP.lineTo(0, -22);
      inP.lineTo(4, -14);
      inP.closePath();
      kitFillRimAndStroke(ctx, inP, -4, -22, 4, 0, '#ffffff', '#f5d0fe', '#c084fc', outline, 1.4);
      ctx.restore();
    }

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
  ctx.restore();
};

/* ============================================================================
 * P30: WATER SPINACH / KANGKUNG (Ipomoea aquatica)
 * Creeping hollow-stemmed semi-aquatic herb with adventitious roots from nodes,
 * hastate (arrowhead) leaves on arching petioles, and white/lilac morning-glory
 * funnel flowers connected by axillary peduncles to the stem nodes.
 * ========================================================================== */
const drawWaterSpinachRig: PlantRig = (ctx, input) => {
  const { sway, growthStage } = input;
  const outline = '#142914';

  ctx.save();
  ctx.translate(0, 148);

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

  // 2. Hastate (arrowhead-shaped) leaves rising on arching petioles from stem nodes
  const leafNodes = [
    { nx: -130, py: -34, ang: -2.25, len: 42 },
    { nx: -80, py: -44, ang: -2.0, len: 48 },
    { nx: -25, py: -50, ang: -1.62, len: 52 },
    { nx: 30, py: -48, ang: -1.48, len: 50 },
    { nx: 85, py: -44, ang: -1.15, len: 48 },
    { nx: 135, py: -34, ang: -0.9, len: 42 },
  ];

  for (const ln of leafNodes) {
    const nodeY = Math.sin(ln.nx * 0.05) * 4;
    ctx.save();
    ctx.translate(ln.nx, nodeY);

    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(sway * 8, ln.py * 0.5, sway * 12, ln.py);
    ctx.stroke();

    ctx.translate(sway * 12, ln.py);
    ctx.rotate(ln.ang + sway * 0.08);

    const hastP = new Path2D();
    hastP.moveTo(0, 0);
    hastP.lineTo(-14, 18);
    hastP.lineTo(-10, 8);
    hastP.bezierCurveTo(-14, -15, -12, -35, 0, -ln.len);
    hastP.bezierCurveTo(12, -35, 14, -15, 10, 8);
    hastP.lineTo(14, 18);
    hastP.closePath();
    kitFillRimAndStroke(ctx, hastP, -14, -ln.len, 14, 18, '#86efac', '#22c55e', '#166534', outline, 2.0);

    ctx.restore();
  }

  // 3. White-and-violet morning glory funnel blossoms connected via axillary peduncles to stem nodes
  if (growthStage >= 2) {
    for (const [nodeX, fxOff] of [
      [-80, 12],
      [30, 14],
    ] as const) {
      const nodeY = Math.sin(nodeX * 0.05) * 4;
      const fx = nodeX + fxOff + sway * 8;
      const fy = -26;

      // Green peduncle stalk + calyx connecting stem node to funnel corolla base
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(nodeX, nodeY);
      ctx.quadraticCurveTo(nodeX + fxOff * 0.5, -6, fx, fy + 8);
      ctx.stroke();

      ctx.save();
      ctx.translate(fx, fy);

      const fP = new Path2D();
      fP.moveTo(-3, 9);
      fP.quadraticCurveTo(-18, -10, -22, -28);
      fP.quadraticCurveTo(0, -36, 22, -28);
      fP.quadraticCurveTo(18, -10, 3, 9);
      fP.closePath();
      kitFillRimAndStroke(ctx, fP, -22, -36, 22, 9, '#ffffff', '#f3e8ff', '#d8b4fe', outline, 1.8);

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
