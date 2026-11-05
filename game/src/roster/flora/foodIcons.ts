import type { FoodIcon } from './types';

/**
 * Refined 100% Vector Canvas2D Food Icons (90% botanical/biological realism, 10% cute appeal).
 * Rendered in a standard 22-unit radius frame around (0, 0).
 */
export const REFINED_FOOD_ICONS: Record<string, FoodIcon> = {
  // 1. Spiky Durian (Durio zibethinus — authentic 5-carpel Musang King thorny husk + open golden aril locule)
  food_durian_fruit: (ctx) => {
    const rx = 17.6;
    const ry = 19.8;
    const cy = 2.4;

    // 1. Thick curved woody peduncle stem (tangkai) + swollen abscission ring (buku tangkai) + basal perianth collar
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#241407';
    ctx.lineWidth = 5.8;
    ctx.beginPath();
    ctx.moveTo(2.8, -24.8);
    ctx.quadraticCurveTo(0.2, -20.5, 0, -15.2);
    ctx.stroke();

    ctx.strokeStyle = '#785027';
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(2.8, -24.8);
    ctx.quadraticCurveTo(0.2, -20.5, 0, -15.2);
    ctx.stroke();

    // Swollen abscission ring (buku tangkai)
    ctx.fillStyle = '#8c6239';
    ctx.strokeStyle = '#241407';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0.7, -19.6, 4.6, 2.2, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Basal woody perianth collar uniting peduncle and fruit apex
    ctx.fillStyle = '#5c3d1e';
    ctx.beginPath();
    ctx.ellipse(0, -15.2, 6.0, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. 5-carpel lobed ovoid husk silhouette with contiguous radially-oriented pyramidal perimeter thorns
    const numSpikes = 30;
    const rim = new Path2D();
    for (let i = 0; i < numSpikes; i++) {
      const a0 = (i / numSpikes) * Math.PI * 2;
      const aMid = ((i + 0.5) / numSpikes) * Math.PI * 2;
      const a1 = ((i + 1) / numSpikes) * Math.PI * 2;
      const lobeMod = 1 + 0.06 * Math.cos(aMid * 5 - Math.PI * 0.5);
      const pearMod = 1 + 0.06 * Math.sin(aMid);
      const mod = lobeMod * pearMod;
      const bx0 = Math.cos(a0) * rx * 0.88 * mod;
      const by0 = cy + Math.sin(a0) * ry * 0.88 * mod;
      const tx = Math.cos(aMid) * (rx + 4.6) * mod;
      const ty = cy + Math.sin(aMid) * (ry + 4.6) * mod;
      const bx1 = Math.cos(a1) * rx * 0.88 * mod;
      const by1 = cy + Math.sin(a1) * ry * 0.88 * mod;
      if (i === 0) rim.moveTo(bx0, by0);
      rim.lineTo(tx, ty);
      rim.lineTo(bx1, by1);
    }
    rim.closePath();

    const dGrad = ctx.createRadialGradient(-6, -4, 2, 0, cy, 23);
    dGrad.addColorStop(0, '#d9f99d');
    dGrad.addColorStop(0.48, '#65a30d');
    dGrad.addColorStop(0.84, '#3f6212');
    dGrad.addColorStop(1, '#263c08');
    ctx.fillStyle = dGrad;
    ctx.fill(rim);
    ctx.strokeStyle = '#182805';
    ctx.lineWidth = 1.9;
    ctx.stroke(rim);

    // 3. Contiguous 3D Pyramidal Thorns arranged along curved meridian arcs (following the 5 carpel lobes!)
    for (const meridianFrac of [-0.74, -0.44, -0.16, 0.16, 0.46, 0.74]) {
      for (let step = -3; step <= 3; step++) {
        const normY = step / 3.5;
        const arcFactor = Math.sqrt(Math.max(0.08, 1 - normY * normY));
        const ox = meridianFrac * rx * 0.88 * arcFactor;
        const ty = cy + normY * ry * 0.80;
        // Leave space on the front-right lobe for the dehisced open golden aril chamber
        if (ox > -2.2 && ty > -8.5 && ty < 15.0) continue;

        const radX = ox / rx;
        const radY = (ty - cy) / ry;
        const tipX = ox + radX * 3.5;
        const tipY = ty + (radY - 0.28) * 3.8;
        const bw = 2.55;
        const bh = 2.35;

        // Left sunlit lime-gold pyramid facet
        ctx.fillStyle = '#ecfccb';
        ctx.beginPath();
        ctx.moveTo(ox - bw, ty);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(ox, ty + bh);
        ctx.closePath();
        ctx.fill();

        // Right shaded olive-brown pyramid facet
        ctx.fillStyle = '#3f6212';
        ctx.beginPath();
        ctx.moveTo(ox, ty + bh);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(ox + bw, ty);
        ctx.closePath();
        ctx.fill();

        // Crisp 3D pyramid arris & outline
        ctx.strokeStyle = '#1a2e05';
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(ox - bw, ty);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(ox + bw, ty);
        ctx.lineTo(ox, ty + bh);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Curved carpel suture seam on left lobe + bottom 5-point Musang King star seam (tapak bintang)
    ctx.strokeStyle = 'rgba(26, 46, 5, 0.78)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -14.8);
    ctx.quadraticCurveTo(-11.5, cy, 0, cy + ry * 0.88);
    ctx.stroke();

    ctx.fillStyle = '#5c3d1e';
    ctx.strokeStyle = '#1a2e05';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(0, cy + ry * 0.88, 3.8, 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. Dehisced open carpel locule revealing thick creamy-white pith rind (empulur) & golden Musang King arils
    const rindP = new Path2D();
    rindP.moveTo(0.2, -12.0);
    rindP.bezierCurveTo(14.2, -8.0, 15.4, 11.0, 1.2, 17.2);
    rindP.bezierCurveTo(-4.8, 11.8, -4.4, -6.8, 0.2, -12.0);
    rindP.closePath();
    ctx.fillStyle = '#fefce8';
    ctx.fill(rindP);
    ctx.strokeStyle = '#365314';
    ctx.lineWidth = 1.6;
    ctx.stroke(rindP);

    // Recessed warm shadow inside the carpel chamber cavity
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.moveTo(1.0, -9.0);
    ctx.bezierCurveTo(11.4, -5.2, 12.2, 8.8, 1.8, 14.2);
    ctx.bezierCurveTo(-2.2, 9.2, -1.8, -4.8, 1.0, -9.0);
    ctx.closePath();
    ctx.fill();

    // Two plump, kidney-shaped, custard-wrinkled golden-yellow aril pods (ulas durian) nestled inside the chamber
    for (const [ax, ay, arx, ary, rot] of [
      [4.6, -2.2, 4.6, 5.6, -0.14],
      [4.5, 7.2, 4.8, 5.7, 0.15],
    ] as const) {
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(rot);

      const aGrad = ctx.createRadialGradient(-1.4, -1.6, 0.5, 0, 0, ary * 1.1);
      aGrad.addColorStop(0, '#fef9c3');
      aGrad.addColorStop(0.42, '#facc15');
      aGrad.addColorStop(0.84, '#eab308');
      aGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = aGrad;
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.2;

      // Kidney-curved plump aril contour
      ctx.beginPath();
      ctx.moveTo(-arx * 0.42, -ary * 0.95);
      ctx.bezierCurveTo(arx * 1.18, -ary * 0.85, arx * 1.22, ary * 0.85, -arx * 0.35, ary * 0.95);
      ctx.bezierCurveTo(-arx * 0.96, ary * 0.55, -arx * 0.96, -ary * 0.55, -arx * 0.42, -ary * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Delicate creamy custard crease & glossy highlight
      ctx.strokeStyle = 'rgba(180, 83, 9, 0.42)';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.arc(0.5, 0, arx * 0.55, -0.65, 0.65);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.66)';
      ctx.beginPath();
      ctx.ellipse(-1.0, -1.6, 1.35, 2.4, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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

  // 3. Banana Bunch (Musa acuminata Pisang Emas / Cavendish — authentic 2-row curved crescent hand with snug parallel 5-faceted fingers)
  food_banana_bunch: (ctx) => {
    const drawBananaFinger = (
      x0: number,
      y0: number,
      ctrlX: number,
      ctrlY: number,
      xTip: number,
      yTip: number,
      bellyW: number,
      isBackRow: boolean,
    ) => {
      const neckW = bellyW * 0.42;
      // Full curved banana silhouette: slender green-tipped pedicel neck at crown -> plump parallel curved 5-sided belly -> tapered floral tip
      const bodyP = new Path2D();
      bodyP.moveTo(x0 - neckW, y0);
      // Outer-left/lower convex curve
      bodyP.bezierCurveTo(
        x0 - bellyW * 0.88,
        y0 + (ctrlY - y0) * 0.45,
        ctrlX - bellyW * 1.15,
        ctrlY + bellyW * 0.42,
        xTip - 1.3,
        yTip + 0.6,
      );
      // Blunt dark floral apex (tampuk hujung pisang)
      bodyP.lineTo(xTip + 1.5, yTip - 1.0);
      // Inner-right/upper concave curve
      bodyP.bezierCurveTo(
        ctrlX + bellyW * 0.68,
        ctrlY - bellyW * 0.42,
        x0 + bellyW * 0.52,
        y0 + (ctrlY - y0) * 0.35,
        x0 + neckW,
        y0,
      );
      bodyP.closePath();

      const bGrad = ctx.createLinearGradient(x0, y0, xTip, yTip);
      bGrad.addColorStop(0, '#84cc16'); // fresh green-gold pedicel neck
      bGrad.addColorStop(0.16, isBackRow ? '#eab308' : '#fef08a');
      bGrad.addColorStop(0.66, isBackRow ? '#ca8a04' : '#facc15');
      bGrad.addColorStop(0.92, '#b45309');
      bGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = bGrad;
      ctx.fill(bodyP);

      // Shaded lower-left longitudinal facet plane for authentic 5-angled banana cross-section
      ctx.save();
      ctx.clip(bodyP);
      ctx.fillStyle = isBackRow ? 'rgba(161, 98, 7, 0.38)' : 'rgba(180, 83, 9, 0.24)';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(ctrlX - bellyW * 0.18, ctrlY + bellyW * 0.1, xTip, yTip);
      ctx.lineTo(xTip - bellyW * 2, yTip + bellyW);
      ctx.lineTo(x0 - bellyW * 2, y0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = '#3b1d06';
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'round';
      ctx.stroke(bodyP);

      // Crisp sunlit longitudinal facet ridge line along the banana's central arris
      ctx.strokeStyle = isBackRow ? 'rgba(254, 249, 195, 0.45)' : 'rgba(255, 255, 255, 0.76)';
      ctx.lineWidth = 1.15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0 + 0.2, y0 + 2.5);
      ctx.quadraticCurveTo(ctrlX - bellyW * 0.14, ctrlY, xTip - 0.5, yTip - 1.8);
      ctx.stroke();

      // Dark brown withered floral perianth tip (tampuk hujung pisang)
      ctx.fillStyle = '#271102';
      ctx.beginPath();
      ctx.ellipse(xTip + 0.1, yTip - 0.2, 1.85, 1.35, 0.35, 0, Math.PI * 2);
      ctx.fill();
    };

    // Back row of 4 plump banana fingers sharing a harmonious parallel J-curve from the crown
    drawBananaFinger(-9.0, -11.5, -15.5, 2.0, -4.5, 14.5, 5.0, true);
    drawBananaFinger(-5.2, -11.8, -10.5, 3.0, 2.0, 15.8, 5.2, true);
    drawBananaFinger(-1.4, -11.6, -5.2, 2.8, 8.5, 15.0, 5.2, true);
    drawBananaFinger(2.4, -11.0, 0.0, 1.8, 14.5, 12.8, 4.9, true);

    // Front row of 5 snug, overlapping plump banana fingers nested in a cohesive crescent hand (sesisir pisang)
    drawBananaFinger(-11.0, -9.6, -18.0, 4.8, -7.2, 17.5, 5.4, false);
    drawBananaFinger(-7.2, -10.0, -13.0, 6.2, -0.5, 19.2, 5.7, false);
    drawBananaFinger(-3.2, -10.0, -7.5, 6.4, 6.2, 18.8, 5.8, false);
    drawBananaFinger(0.8, -9.6, -2.0, 5.4, 12.4, 16.8, 5.6, false);
    drawBananaFinger(4.5, -8.8, 3.0, 3.6, 17.2, 13.5, 5.2, false);

    // Sculpted woody-green fibrous crescent crown collar (tampuk sisir) uniting all banana pedicel necks
    const cGrad = ctx.createLinearGradient(-14, -17, 9, -8);
    cGrad.addColorStop(0, '#a3e635');
    cGrad.addColorStop(0.5, '#65a30d');
    cGrad.addColorStop(1, '#3f6212');
    ctx.fillStyle = cGrad;
    ctx.strokeStyle = '#1a2e05';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-13.5, -9.2);
    ctx.bezierCurveTo(-12, -16.8, 4, -17.2, 8.8, -8.8);
    ctx.bezierCurveTo(5, -6.2, -9, -6.5, -13.5, -9.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Woody vascular cut stalk scar on top of the crown cushion
    ctx.fillStyle = '#8c6239';
    ctx.strokeStyle = '#291303';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(-2.5, -14.2, 5.6, 2.2, 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#d6bfa3';
    ctx.beginPath();
    ctx.ellipse(-2.5, -14.2, 3.4, 1.1, 0.06, 0, Math.PI * 2);
    ctx.fill();
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

  // 14. Tender Forest Leaves (Pucuk Daun Hutan — pinnate rainforest leaf shoot with venation & apical bud)
  food_tender_forest_leaves: (ctx) => {
    // Central woody-green petiole stem
    ctx.strokeStyle = '#3f6212';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, 18);
    ctx.quadraticCurveTo(-2, 4, 8, -16);
    ctx.stroke();

    const drawLeaf = (bx: number, by: number, ang: number, len: number, wid: number, cLight: string, cDark: string) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ang);
      const lGrad = ctx.createLinearGradient(0, -wid, len, wid);
      lGrad.addColorStop(0, cLight);
      lGrad.addColorStop(1, cDark);
      ctx.fillStyle = lGrad;
      ctx.strokeStyle = '#142e05';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(len * 0.3, -wid, len * 0.78, -wid * 0.8, len, 0);
      ctx.bezierCurveTo(len * 0.78, wid * 0.8, len * 0.3, wid, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Midrib & lateral secondary veins
      ctx.strokeStyle = 'rgba(236, 252, 203, 0.7)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(1, 0);
      ctx.lineTo(len * 0.88, 0);
      for (const vx of [0.3, 0.55, 0.75]) {
        ctx.moveTo(len * vx, 0);
        ctx.lineTo(len * (vx + 0.12), -wid * 0.52);
        ctx.moveTo(len * vx, 0);
        ctx.lineTo(len * (vx + 0.12), wid * 0.52);
      }
      ctx.stroke();
      ctx.restore();
    };

    drawLeaf(-6, 10, -2.25, 16, 6.2, '#4ade80', '#15803d');
    drawLeaf(-4, 7, -0.15, 16, 6.2, '#22c55e', '#166534');
    drawLeaf(-1, -1, -2.05, 15, 5.8, '#a3e635', '#3f6212');
    drawLeaf(2, -4, -0.32, 15, 5.8, '#84cc16', '#365314');
    // Terminal young flushing shoot leaf (lime-bronze rainforest flush)
    drawLeaf(5, -11, -1.12, 14, 5.2, '#bef264', '#4d7c0f');
  },

  // 15. Jungle Nuts & Seeds (Tropical Dipterocarp winged samara, Lithocarpus acorn & rainforest chestnuts)
  food_jungle_nuts_seeds: (ctx) => {
    // Two crimson-brown Dipterocarp winged samara blades rising behind the nutlet
    for (const [ang, len, wid] of [
      [-0.42, 19, 4.6],
      [0.36, 18, 4.4],
    ] as const) {
      ctx.save();
      ctx.translate(4, 2);
      ctx.rotate(ang);
      const wGrad = ctx.createLinearGradient(0, 0, 0, -len);
      wGrad.addColorStop(0, '#9a3412');
      wGrad.addColorStop(0.6, '#dc2626');
      wGrad.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = wGrad;
      ctx.strokeStyle = '#3f0d06';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-wid, -len * 0.45, -wid * 1.1, -len * 0.9, 0, -len);
      ctx.bezierCurveTo(wid * 1.1, -len * 0.9, wid, -len * 0.45, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Left: Tropical Oak Acorn (Lithocarpus) with scaly woody cupule cap
    ctx.save();
    ctx.translate(-7, 5);
    ctx.rotate(-0.2);
    const nGrad = ctx.createRadialGradient(-2, 0, 1, 0, 2, 10);
    nGrad.addColorStop(0, '#f59e0b');
    nGrad.addColorStop(0.6, '#92400e');
    nGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = nGrad;
    ctx.strokeStyle = '#270e02';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 3, 6.8, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Scaly cupule cap
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(0, -3.5, 7.6, 4.2, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Right: Glossy mahogany rainforest seed nut with pale hilum scar
    const sGrad = ctx.createRadialGradient(5, 6, 1, 7, 8, 9);
    sGrad.addColorStop(0, '#d97706');
    sGrad.addColorStop(0.55, '#7c2d12');
    sGrad.addColorStop(1, '#3b0764');
    ctx.fillStyle = sGrad;
    ctx.strokeStyle = '#1c0a02';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(7, 8, 7.5, 6.5, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.ellipse(5.5, 6.5, 3.0, 1.8, 0.25, 0, Math.PI * 2);
    ctx.fill();
  },

  // 16. Prime Venison Meat (Anatomical bone-in haunch cut with marrow femur bone & marbled muscle fibers)
  food_prime_venison_meat: (ctx) => {
    ctx.save();
    ctx.rotate(-0.14);

    // Outer creamy fat cap / rind
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(0, 2, 17.5, 13.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Deep crimson venison muscle cut
    const mGrad = ctx.createRadialGradient(-4, -2, 2, 0, 1, 16);
    mGrad.addColorStop(0, '#f87171');
    mGrad.addColorStop(0.45, '#dc2626');
    mGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = mGrad;
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 1, 14.8, 10.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Intramuscular white connective marbling lines
    ctx.strokeStyle = 'rgba(254, 242, 242, 0.72)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.quadraticCurveTo(-10, -4, -12, 2);
    ctx.moveTo(-1, 2);
    ctx.quadraticCurveTo(8, 5, 12, 0);
    ctx.moveTo(-2, 4);
    ctx.quadraticCurveTo(-5, 8, 2, 9);
    ctx.stroke();

    // Central cross-sectioned ivory femur bone with red marrow core
    ctx.fillStyle = '#fffbeb';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-3, -1, 4.6, 3.8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(-3, -1, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // 17. Crabs & Clams (Mangrove Mud Crab Scylla serrata + ribbed estuarine bivalve clam)
  food_crabs_clams: (ctx) => {
    // 1. Ribbed Estuarine Venus Clam (Meretrix) at bottom-right
    ctx.save();
    ctx.translate(7, 8);
    ctx.rotate(0.18);
    const cGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 11);
    cGrad.addColorStop(0, '#fef3c7');
    cGrad.addColorStop(0.6, '#d6d3d1');
    cGrad.addColorStop(1, '#78716c');
    ctx.fillStyle = cGrad;
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.bezierCurveTo(10, -6, 12, 5, 0, 8);
    ctx.bezierCurveTo(-12, 5, -10, -6, 0, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Concentric growth ridges on clam shell
    ctx.strokeStyle = 'rgba(87, 83, 78, 0.55)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, -1, 6.5, 0.25, Math.PI - 0.25);
    ctx.stroke();
    ctx.restore();

    // 2. Mangrove Mud Crab (Scylla) at top-left with pincers & walking legs
    ctx.save();
    ctx.translate(-4, -3);
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    // Walking legs
    for (const side of [-1, 1]) {
      for (const ly of [-2, 1, 4]) {
        ctx.beginPath();
        ctx.moveTo(side * 8, ly);
        ctx.quadraticCurveTo(side * 14, ly - 2, side * 16, ly + 4);
        ctx.stroke();
      }
      // Robust cheliped pincer claws raised in front
      ctx.fillStyle = '#ea580c';
      ctx.strokeStyle = '#431407';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(side * 9, -8, 4.2, 2.8, side * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Serrated hexagonal crab carapace
    const crGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 11);
    crGrad.addColorStop(0, '#fb923c');
    crGrad.addColorStop(0.6, '#c2410c');
    crGrad.addColorStop(1, '#431407');
    ctx.fillStyle = crGrad;
    ctx.strokeStyle = '#270e02';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10.5, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Stalked crab eyes
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(-3.5, -7, 1.3, 0, Math.PI * 2);
    ctx.arc(3.5, -7, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // 18. Reef Sponge (Porous tubular/barrel coral reef sponge Xestospongia / Aplysina)
  food_marine_sponge: (ctx) => {
    // Coral rock substrate base
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 15, 14, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3 clustered tubular barrel sponges with apical osculum vents & porous texture
    for (const [tx, ty, tw, th, rot, cTop, cBot] of [
      [-8, 13, 5.5, 22, -0.18, '#fbbf24', '#b45309'],
      [8, 13, 5.2, 20, 0.2, '#f472b6', '#9d174d'],
      [0, 15, 6.8, 27, 0.02, '#fb923c', '#9a3412'],
    ] as const) {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(rot);
      const sGrad = ctx.createLinearGradient(-tw, -th, tw, 0);
      sGrad.addColorStop(0, cTop);
      sGrad.addColorStop(1, cBot);
      ctx.fillStyle = sGrad;
      ctx.strokeStyle = '#3b0764';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-tw * 0.85, 0);
      ctx.quadraticCurveTo(-tw * 1.15, -th * 0.5, -tw, -th);
      ctx.lineTo(tw, -th);
      ctx.quadraticCurveTo(tw * 1.15, -th * 0.5, tw * 0.85, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dark apical osculum excurrent vent opening
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.ellipse(0, -th, tw * 0.95, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Ostia pore depressions along sponge wall
      ctx.fillStyle = 'rgba(30, 27, 75, 0.45)';
      for (const [px, py, pr] of [
        [-2, -th * 0.7, 1.3],
        [2.2, -th * 0.52, 1.5],
        [-1.5, -th * 0.32, 1.4],
      ] as const) {
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  // 19. Moon Jellyfish (Pelagic translucent Aurelia aurita with 4 horseshoe gonads & oral arms)
  food_moon_jellyfish: (ctx) => {
    // Trailing translucent oral arms & fine marginal tentacles
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.78)';
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    for (const ox of [-7, -2.5, 2.5, 7]) {
      ctx.beginPath();
      ctx.moveTo(ox, 1);
      ctx.bezierCurveTo(ox - 3, 8, ox + 3, 14, ox - 1, 20);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.65)';
    ctx.lineWidth = 1.0;
    for (let tx = -13; tx <= 13; tx += 4.2) {
      ctx.beginPath();
      ctx.moveTo(tx, 1);
      ctx.quadraticCurveTo(tx + 1.5, 9, tx - 1, 16);
      ctx.stroke();
    }

    // Translucent domed umbrella bell with scalloped lappet margin
    const bGrad = ctx.createRadialGradient(0, -8, 2, 0, -2, 18);
    bGrad.addColorStop(0, 'rgba(240, 249, 255, 0.95)');
    bGrad.addColorStop(0.55, 'rgba(165, 243, 252, 0.78)');
    bGrad.addColorStop(1, 'rgba(192, 132, 252, 0.85)');
    ctx.fillStyle = bGrad;
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 1, 16, Math.PI, 0);
    // Scalloped lappet bottom margin
    for (let s = 3; s >= -3; s--) {
      ctx.quadraticCurveTo(s * 4 - 2, 4.5, (s - 1) * 4, 1);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Signature 4 horseshoe-shaped rose-violet gonads visible through translucent bell
    ctx.strokeStyle = '#db2777';
    ctx.lineWidth = 1.6;
    for (let g = 0; g < 4; g++) {
      const a = (g * Math.PI) / 2 + Math.PI * 0.25;
      const gx = Math.cos(a) * 5.2;
      const gy = -6.5 + Math.sin(a) * 3.4;
      ctx.beginPath();
      ctx.arc(gx, gy, 2.2, a - 1.1, a + 1.1);
      ctx.stroke();
    }
  },

  // 20. Starfish Treat (5-rayed reef sea star for obligate echinoderm predator Harlequin Shrimp)
  food_starfish_treat: (ctx) => {
    const starP = new Path2D();
    const outerR = 19;
    const innerR = 7.8;
    for (let i = 0; i < 10; i++) {
      const isOuter = i % 2 === 0;
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = isOuter ? outerR : innerR;
      const px = Math.cos(ang) * r;
      const py = Math.sin(ang) * r;
      if (i === 0) starP.moveTo(px, py);
      else starP.quadraticCurveTo(Math.cos(ang - 0.15) * (r * 0.92), Math.sin(ang - 0.15) * (r * 0.92), px, py);
    }
    starP.closePath();

    const stGrad = ctx.createRadialGradient(-3, -3, 1, 0, 0, 19);
    stGrad.addColorStop(0, '#fdba74');
    stGrad.addColorStop(0.55, '#ea580c');
    stGrad.addColorStop(1, '#9a3412');
    ctx.fillStyle = stGrad;
    ctx.fill(starP);
    ctx.strokeStyle = '#431407';
    ctx.lineWidth = 1.6;
    ctx.stroke(starP);

    // Radial carinal ossicle nodules along the 5 arms
    ctx.fillStyle = '#fef3c7';
    for (let a = 0; a < 5; a++) {
      const ang = -Math.PI / 2 + (a * 2 * Math.PI) / 5;
      for (const d of [5, 10, 14.5]) {
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * d, Math.sin(ang) * d, d === 14.5 ? 1.1 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
};

REFINED_FOOD_ICONS.food_freshwater_crustacean = REFINED_FOOD_ICONS.food_river_minnow_treat;
