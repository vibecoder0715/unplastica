import type { FoodIcon } from './types';

/**
 * Refined 100% Vector Canvas2D Food Icons (90% botanical/biological realism, 10% cute appeal).
 * Rendered in a standard 22-unit radius frame around (0, 0).
 */
export const REFINED_FOOD_ICONS: Record<string, FoodIcon> = {
  // 1. Spiky Durian (Durio zibethinus)
  food_durian_fruit: (ctx) => {
    // Woody pedicel stalk with abscission ring
    ctx.strokeStyle = '#3e2712';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(0, -17);
    ctx.stroke();

    ctx.fillStyle = '#6d4c26';
    ctx.strokeStyle = '#231407';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, -19.5, 4.4, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Husk silhouette with sharp perimeter spikes
    const rx = 18;
    const ry = 21;
    const numSpikes = 22;
    const rim = new Path2D();
    for (let i = 0; i < numSpikes; i++) {
      const a0 = (i / numSpikes) * Math.PI * 2;
      const aMid = ((i + 0.5) / numSpikes) * Math.PI * 2;
      const a1 = ((i + 1) / numSpikes) * Math.PI * 2;
      const bx0 = Math.cos(a0) * rx * 0.9;
      const by0 = Math.sin(a0) * ry * 0.9 + 2;
      const tx = Math.cos(aMid) * (rx + 5.5);
      const ty = Math.sin(aMid) * (ry + 5.5) + 2;
      const bx1 = Math.cos(a1) * rx * 0.9;
      const by1 = Math.sin(a1) * ry * 0.9 + 2;
      if (i === 0) rim.moveTo(bx0, by0);
      rim.lineTo(tx, ty);
      rim.lineTo(bx1, by1);
    }
    rim.closePath();

    const dGrad = ctx.createRadialGradient(-6, -6, 2, 0, 2, 24);
    dGrad.addColorStop(0, '#bef264');
    dGrad.addColorStop(0.5, '#65a30d');
    dGrad.addColorStop(1, '#273f08');
    ctx.fillStyle = dGrad;
    ctx.fill(rim);
    ctx.strokeStyle = '#142304';
    ctx.lineWidth = 2.0;
    ctx.stroke(rim);

    // Carpel suture lines (locules where durian splits when ripe)
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.quadraticCurveTo(-2, 3, 0, 19);
    ctx.moveTo(-11, -5);
    ctx.quadraticCurveTo(-3, 3, 0, 19);
    ctx.moveTo(11, -5);
    ctx.quadraticCurveTo(3, 3, 0, 19);
    ctx.stroke();

    // 3D Pyramidal thorn clusters following spherical curvature
    for (let row = -2; row <= 2; row++) {
      const ty = 2 + row * 5.2;
      const halfW = Math.sqrt(Math.max(0, 1 - (row / 2.6) ** 2)) * 12.5;
      for (let ox = -halfW; ox <= halfW + 0.1; ox += 5.2) {
        ctx.fillStyle = '#ecfccb';
        ctx.strokeStyle = '#1a2e05';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(ox - 2.5, ty + 2.2);
        ctx.lineTo(ox, ty - 3.8);
        ctx.lineTo(ox + 2.5, ty + 2.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  },

  // 2. Queen Mangosteen (Garcinia mangostana)
  food_mangosteen_fruit: (ctx) => {
    // Thick woody fruit stalk
    ctx.strokeStyle = '#2d4a0a';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(0, -15);
    ctx.stroke();

    // Purple pericarp with rich 3D sphere gradient
    const mGrad = ctx.createRadialGradient(-6, -4, 2, 0, 2, 21);
    mGrad.addColorStop(0, '#d8b4fe');
    mGrad.addColorStop(0.42, '#581c87');
    mGrad.addColorStop(1, '#1b062b');
    ctx.fillStyle = mGrad;
    ctx.strokeStyle = '#12031c';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 2, 17.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // High-gloss waxy specular highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.beginPath();
    ctx.ellipse(-6, -4, 5.5, 3.2, -0.42, 0, Math.PI * 2);
    ctx.fill();

    // 4-sepal leathery persistent calyx cap
    for (const [cxOff, cyOff, rot] of [
      [-8.5, -12, -0.45],
      [8.5, -12, 0.45],
      [-3.5, -14, -0.15],
      [3.5, -14, 0.15],
    ] as const) {
      const cGrad = ctx.createLinearGradient(cxOff, cyOff - 4, cxOff, cyOff + 4);
      cGrad.addColorStop(0, '#a3e635');
      cGrad.addColorStop(1, '#3f6212');
      ctx.fillStyle = cGrad;
      ctx.strokeStyle = '#1a2e05';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cxOff, cyOff, 6.2, 4.0, rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Bottom 6-lobe Tampuk Manggis stigma rosette (indicates number of aril segments inside)
    ctx.fillStyle = '#f3e8ff';
    ctx.strokeStyle = '#3b0764';
    ctx.lineWidth = 0.8;
    for (let st = 0; st < 6; st++) {
      const sa = (st * Math.PI) / 3;
      ctx.beginPath();
      ctx.ellipse(Math.cos(sa) * 3.2, 14 + Math.sin(sa) * 2.0, 2.1, 1.3, sa, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  },

  // 3. Banana Bunch (Musa acuminata Pisang Emas)
  food_banana_bunch: (ctx) => {
    // Peduncle cushion collar at top
    ctx.fillStyle = '#4d7c0f';
    ctx.strokeStyle = '#142405';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, -11, 14.5, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hand of 5 distinct curved golden bananas with facet ridges
    for (let c = -2; c <= 2; c++) {
      const fx = c * 5.4;
      const curve = c * 3.2;
      const bGrad = ctx.createLinearGradient(fx - 3, -8, fx + curve + 3, 16);
      bGrad.addColorStop(0, '#fef08a');
      bGrad.addColorStop(0.5, '#facc15');
      bGrad.addColorStop(1, '#ca8a04');
      ctx.fillStyle = bGrad;
      ctx.strokeStyle = '#5c3506';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(fx - 3.4, -9.5);
      ctx.quadraticCurveTo(fx + curve - 4.6, 4, fx + curve * 0.9, 16.5);
      ctx.quadraticCurveTo(fx + curve + 4.6, 4, fx + 3.4, -9.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Angular facet ridge line down each banana
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(fx, -8);
      ctx.quadraticCurveTo(fx + curve * 0.6, 4, fx + curve * 0.9, 15);
      ctx.stroke();

      // Withered perianth floral remnant dot at tip
      ctx.fillStyle = '#261203';
      ctx.beginPath();
      ctx.arc(fx + curve * 0.9, 16.2, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  // 4. Rambutan Cluster (Nephelium lappaceum)
  food_rambutan_fruit: (ctx) => {
    // Branched woody pedicel
    ctx.strokeStyle = '#422409';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -23);
    ctx.lineTo(-7, -9);
    ctx.moveTo(0, -23);
    ctx.lineTo(8, -10);
    ctx.moveTo(0, -23);
    ctx.lineTo(0, -2);
    ctx.stroke();

    // 3 ovoid red fruits with soft curving green-tipped spinterns
    for (const [rx, ry, rs] of [
      [-8, -1, 0.64],
      [8, -2, 0.62],
      [0, 8, 0.72],
    ] as const) {
      ctx.save();
      ctx.translate(rx, ry);
      ctx.scale(rs, rs);

      const rg = ctx.createRadialGradient(-3, -3, 2, 0, 0, 14);
      rg.addColorStop(0, '#fb7185');
      rg.addColorStop(0.5, '#e11d48');
      rg.addColorStop(1, '#6b0726');
      ctx.fillStyle = rg;
      ctx.strokeStyle = '#380413';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 13, 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Soft curved hair-like spinterns
      ctx.strokeStyle = '#a3e635';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      for (let a = 0; a < 15; a++) {
        const ang = (a / 15) * Math.PI * 2;
        const curl = a % 2 === 0 ? 0.35 : -0.35;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 9.8, Math.sin(ang) * 11.5);
        ctx.quadraticCurveTo(
          Math.cos(ang + curl) * 15.5,
          Math.sin(ang + curl) * 17.5,
          Math.cos(ang + curl * 1.6) * 17,
          Math.sin(ang + curl * 1.6) * 19,
        );
        ctx.stroke();
      }
      ctx.restore();
    }
  },

  // 5. Ripe Papaya (Carica papaya)
  food_papaya_fruit: (ctx) => {
    ctx.save();
    ctx.translate(0, 1);
    ctx.rotate(-0.1);

    // Warm green-to-orange-to-red pericarp gradient
    const pGrad = ctx.createRadialGradient(-4, -4, 2, 0, 1, 19);
    pGrad.addColorStop(0, '#fef08a');
    pGrad.addColorStop(0.35, '#f59e0b');
    pGrad.addColorStop(0.75, '#ea580c');
    pGrad.addColorStop(1, '#9a3412');
    ctx.fillStyle = pGrad;
    ctx.strokeStyle = '#3f1105';
    ctx.lineWidth = 2.0;

    // Pyriform (pear-shaped) contour
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.bezierCurveTo(11, -14, 15, 2, 12, 14);
    ctx.bezierCurveTo(8, 20, -8, 20, -12, 14);
    ctx.bezierCurveTo(-15, 2, -11, -14, 0, -17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Longitudinal furrow highlight grooves
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.48)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.quadraticCurveTo(6, 0, 4, 14);
    ctx.moveTo(-2, -14);
    ctx.quadraticCurveTo(-6, 0, -4, 14);
    ctx.stroke();

    // Stem scar at apex
    ctx.fillStyle = '#4d7c0f';
    ctx.strokeStyle = '#142405';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(0, -17.5, 3.8, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },

  // 6. Wild Figs (Ficus syconia)
  food_wild_figs: (ctx) => {
    // Branched pedicel
    ctx.strokeStyle = '#38230f';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(-3, -12, -9, -6);
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(3, -12, 9, -7);
    ctx.moveTo(0, -22);
    ctx.lineTo(0, -2);
    ctx.stroke();

    // 3 pear-shaped figs with apical ostiole and lenticels
    for (const [fx, fy, fr] of [
      [-9, 2, 8.8],
      [9, 1, 8.8],
      [0, 9, 9.8],
    ] as const) {
      const fg = ctx.createRadialGradient(fx - 3, fy - 3, 1, fx, fy, fr + 2);
      fg.addColorStop(0, '#f87171');
      fg.addColorStop(0.52, '#b91c1c');
      fg.addColorStop(1, '#450a0a');
      ctx.fillStyle = fg;
      ctx.strokeStyle = '#220404';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(fx, fy, fr * 0.92, fr, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pale lenticel dots
      ctx.fillStyle = 'rgba(254, 243, 199, 0.8)';
      for (const [sx, sy] of [
        [-2.5, -2],
        [2, 1.5],
        [-1, 3.5],
      ] as const) {
        ctx.beginPath();
        ctx.arc(fx + sx, fy + sy, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Apical ostiole pore with bract scales
      ctx.fillStyle = '#1c0303';
      ctx.beginPath();
      ctx.arc(fx, fy + fr * 0.84, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  // 7. Young Coconut (Cocos nucifera)
  food_coconut: (ctx) => {
    // 3-angled green husk with smooth taper
    const cg = ctx.createRadialGradient(-6, -6, 2, 0, 2, 23);
    cg.addColorStop(0, '#bef264');
    cg.addColorStop(0.5, '#4d7c0f');
    cg.addColorStop(1, '#142407');
    ctx.fillStyle = cg;
    ctx.strokeStyle = '#0d1805';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -19);
    ctx.bezierCurveTo(17, -17, 20, 6, 12, 16);
    ctx.bezierCurveTo(6, 22, -6, 22, -12, 16);
    ctx.bezierCurveTo(-20, 6, -17, -17, 0, -19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Longitudinal facet ridge
    ctx.strokeStyle = 'rgba(217, 249, 157, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.quadraticCurveTo(3, 2, 0, 19);
    ctx.stroke();

    // 3-lobed fibrous calyx cap at base
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#271001';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, -18, 6.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  },

  // 8. Emerald Seagrass (Enhalus & Thalassia)
  food_seaweed_kelp: (ctx) => {
    // Creeping rhizome plinth
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#271001';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(-15, 12, 30, 6, 3);
    } else {
      ctx.rect(-15, 12, 30, 6);
    }
    ctx.fill();
    ctx.stroke();

    // 3 flexible ribbon blades with veins and sheath
    for (const [ox, h, bend, col, darkCol] of [
      [-9, 27, -4.5, '#10b981', '#047857'],
      [0, 31, 3.5, '#34d399', '#059669'],
      [9, 26, 5.0, '#059669', '#065f46'],
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

      // Central parallel vein
      ctx.strokeStyle = darkCol;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(ox, 13);
      ctx.quadraticCurveTo(ox + bend * 0.5, 13 - h * 0.5, ox + bend, 13 - h);
      ctx.stroke();
    }
  },

  // 9. Marine Plankton Bloom (Diatoms & Copepods)
  food_plankton_bloom: (ctx) => {
    // Bioluminescent ambient glow halo
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    g.addColorStop(0, 'rgba(186, 230, 253, 0.95)');
    g.addColorStop(0.5, 'rgba(56, 189, 248, 0.45)');
    g.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();

    // Central realistic Copepod micro-crustacean
    ctx.save();
    ctx.translate(0, 0);
    ctx.fillStyle = '#e0f2fe';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.4;

    // Pear-shaped prosoma body
    ctx.beginPath();
    ctx.ellipse(0, -2, 5.5, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Long segmented antennules
    ctx.beginPath();
    ctx.moveTo(-3, -7);
    ctx.quadraticCurveTo(-11, -12, -15, -7);
    ctx.moveTo(3, -7);
    ctx.quadraticCurveTo(11, -12, 15, -7);
    ctx.stroke();

    // Urosome tail segments & furca bristles
    ctx.beginPath();
    ctx.moveTo(0, 5.5);
    ctx.lineTo(0, 11);
    ctx.lineTo(-2.5, 15);
    ctx.moveTo(0, 11);
    ctx.lineTo(2.5, 15);
    ctx.stroke();

    // Red naupliar eye
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -6, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Surrounding Diatoms (stellate and circular frustules)
    for (const [dx, dy, dr] of [
      [-10, 6, 3.2],
      [11, 7, 2.8],
      [-9, -8, 2.6],
      [10, -8, 3.0],
    ] as const) {
      ctx.fillStyle = '#f0fdf4';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  },

  // 10. River Prawn & Minnow Treat
  food_river_minnow_treat: (ctx) => {
    // 1. Sleek silvery freshwater minnow (Rasbora) in background
    ctx.save();
    ctx.translate(0, -5);
    const fGrad = ctx.createLinearGradient(-15, -6, 15, 6);
    fGrad.addColorStop(0, '#93c5fd');
    fGrad.addColorStop(0.5, '#e2e8f0');
    fGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = fGrad;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.4;

    // Fusiform body
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.quadraticCurveTo(-6, -6, 8, -4);
    ctx.quadraticCurveTo(13, -1, 16, -4);
    ctx.lineTo(16, 4);
    ctx.quadraticCurveTo(13, 1, 8, 4);
    ctx.quadraticCurveTo(-6, 6, -16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tiny minnow eye
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-11, -1.5, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Segmented Macrobrachium freshwater prawn in foreground
    ctx.save();
    ctx.translate(2, 6);
    const pGrad = ctx.createLinearGradient(-10, -6, 10, 6);
    pGrad.addColorStop(0, '#fdba74');
    pGrad.addColorStop(0.6, '#ea580c');
    pGrad.addColorStop(1, '#9a3412');
    ctx.fillStyle = pGrad;
    ctx.strokeStyle = '#431407';
    ctx.lineWidth = 1.5;

    // Cephalothorax & rostrum
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-7, -4);
    ctx.quadraticCurveTo(2, -4, 5, 1);
    ctx.quadraticCurveTo(0, 6, -8, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4 Abdominal overlapping segments
    for (let s = 0; s < 4; s++) {
      const sx = 4 + s * 3.2;
      const sy = 1 + s * 1.5;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 3.0, 4.0, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Long blue-banded chela / antennae
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.quadraticCurveTo(-18, -10, -21, -4);
    ctx.moveTo(-8, 1);
    ctx.quadraticCurveTo(-15, 3, -18, 9);
    ctx.stroke();

    // Prawn dark stalk eye
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-8, -2.5, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // 11. Bamboo Shoots (Rebung)
  food_bamboo_shoots: (ctx) => {
    for (const [ox, sc, rot] of [
      [-7, 0.82, -0.16],
      [6, 1.0, 0.12],
    ] as const) {
      ctx.save();
      ctx.translate(ox, 4);
      ctx.rotate(rot);
      ctx.scale(sc, sc);

      // 4 Overlapping culm sheaths
      for (let s = 0; s < 4; s++) {
        const y0 = 14 - s * 8;
        const half = 10 - s * 2.2;
        const sGrad = ctx.createLinearGradient(-half, y0 - 10, half, y0);
        sGrad.addColorStop(0, s % 2 === 0 ? '#b45309' : '#d97706');
        sGrad.addColorStop(1, '#78350f');
        ctx.fillStyle = sGrad;
        ctx.strokeStyle = '#2e1302';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-half, y0);
        ctx.quadraticCurveTo(-half * 0.8, y0 - 11, 0, y0 - 15);
        ctx.quadraticCurveTo(half * 0.8, y0 - 11, half, y0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Fresh green spear tip
      ctx.fillStyle = '#65a30d';
      ctx.strokeStyle = '#142405';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-2.5, -16);
      ctx.lineTo(0, -25);
      ctx.lineTo(2.5, -16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  },

  // 12. Wild Honeycomb (Apis dorsata)
  food_wild_honeycomb: (ctx) => {
    // Wax comb foundation with rounded perimeter
    const wGrad = ctx.createLinearGradient(0, -18, 0, 18);
    wGrad.addColorStop(0, '#fef08a');
    wGrad.addColorStop(0.5, '#f59e0b');
    wGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = wGrad;
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-17, -12);
    ctx.quadraticCurveTo(0, -19, 17, -12);
    ctx.quadraticCurveTo(19, 4, 10, 15);
    ctx.quadraticCurveTo(0, 21, -10, 15);
    ctx.quadraticCurveTo(-19, 4, -17, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Geometric hexagonal cell pattern
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.7)';
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

    // Viscous amber honey drip with droplet
    const dGrad = ctx.createRadialGradient(5, 23, 1, 5, 24, 4);
    dGrad.addColorStop(0, '#fef08a');
    dGrad.addColorStop(0.7, '#d97706');
    dGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = dGrad;
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(4, 16);
    ctx.quadraticCurveTo(6, 21, 5, 25);
    ctx.arc(5, 24, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  },

  // 13. Ants & Termites (Macrotermes mound)
  food_ants_termites: (ctx) => {
    // Red-brown clay cathedral termite mound
    const mGrad = ctx.createRadialGradient(0, -6, 2, 0, 4, 22);
    mGrad.addColorStop(0, '#b45309');
    mGrad.addColorStop(0.6, '#78350f');
    mGrad.addColorStop(1, '#3b1704');
    ctx.fillStyle = mGrad;
    ctx.strokeStyle = '#270e02';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-18, 14);
    ctx.quadraticCurveTo(-16, -6, -6, -17);
    ctx.quadraticCurveTo(0, -21, 6, -16);
    ctx.quadraticCurveTo(16, -4, 18, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dark ventilation gallery pores
    ctx.fillStyle = '#1c0a01';
    for (const [tx, ty, tr] of [
      [-6, -4, 2.4],
      [5, -8, 2.0],
      [2, 4, 2.6],
      [-9, 8, 1.8],
      [10, 6, 2.0],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(tx, ty, tr, tr * 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pale subterranean termites (head + thorax + abdomen)
    for (const [bx, by, rot] of [
      [-12, 17, 0.28],
      [12, 18, -0.38],
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

    // Dark Asian weaver ant at apex (3 segmented tagmata + legs)
    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 0.8;
    for (const [sx, sy, r] of [
      [-3.2, -19, 1.5],
      [0, -18.5, 1.3],
      [3.4, -18, 1.8],
    ] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  },
};
