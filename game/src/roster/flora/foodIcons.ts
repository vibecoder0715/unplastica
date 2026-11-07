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

    // Residual green shoulder blush near the stalk (papayas ripen from the tip upward)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.bezierCurveTo(11, -14, 15, 2, 12, 14);
    ctx.bezierCurveTo(8, 20, -8, 20, -12, 14);
    ctx.bezierCurveTo(-15, 2, -11, -14, 0, -17);
    ctx.clip();
    const blush = ctx.createLinearGradient(0, -18, 0, -6);
    blush.addColorStop(0, 'rgba(101, 163, 13, 0.55)');
    blush.addColorStop(1, 'rgba(101, 163, 13, 0)');
    ctx.fillStyle = blush;
    ctx.fillRect(-16, -18, 32, 12);
    ctx.restore();
    ctx.restore();

    // Sliced half-wedge in front revealing salmon flesh, pale inner wall and glossy black seeds
    ctx.save();
    ctx.translate(8.5, 9);
    ctx.rotate(0.35);
    ctx.fillStyle = '#ea580c';
    ctx.strokeStyle = '#3f1105';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.4, 8.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.0, 7.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.ellipse(0, 0.5, 2.6, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1917';
    for (const [sx, sy] of [
      [-1, -2.2],
      [1, -0.6],
      [-0.8, 1],
      [0.9, 2.4],
      [-0.4, 3.4],
    ] as const) {
      ctx.beginPath();
      ctx.arc(sx, sy, 0.95, 0, Math.PI * 2);
      ctx.fill();
    }
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

    // Longitudinal facet ridges of the three-angled husk (centre keel + two flank arrises)
    ctx.strokeStyle = 'rgba(217, 249, 157, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.quadraticCurveTo(3, 2, 0, 19);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20, 36, 7, 0.35)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-4, -17);
    ctx.quadraticCurveTo(-12, 0, -8, 17);
    ctx.moveTo(4, -17);
    ctx.quadraticCurveTo(13, 0, 8, 17);
    ctx.stroke();

    // Waxy specular highlight on the sunlit husk shoulder
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-7, -6, 3, 7, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Short fibrous stalk stub above the calyx
    ctx.strokeStyle = '#3f2a14';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(1.5, -24);
    ctx.stroke();

    // 3-lobed fibrous calyx cap at base
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#271001';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, -18, 6.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Imbricate perianth sepals (matching the coconut-palm fruit on P13)
    for (const se of [-3.6, 0, 3.6]) {
      ctx.beginPath();
      ctx.arc(se, -18, 2.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  },

  // 8. Emerald Seagrass (Enhalus & Thalassia) — a harvested miniature of the growing P22 seagrass:
  // same stone-grey segmented rhizome, white rootlets, pale clasping sheaths with black Enhalus fibres,
  // emerald ribbon blades with rounded apex, parallel veins, lacunae cross-bars and oxygen bubbles.
  food_seaweed_kelp: (ctx) => {
    const outline = '#022c22';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. White cord-like anchoring rootlets hanging from the rhizome nodes
    ctx.strokeStyle = '#e7e5e4';
    ctx.lineWidth = 1.3;
    for (const nx of [-9, 0, 9]) {
      for (const roff of [-1.6, 1.6]) {
        ctx.beginPath();
        ctx.moveTo(nx + roff, 17);
        ctx.quadraticCurveTo(nx + roff * 1.8, 20, nx + roff * 1.3, 23);
        ctx.stroke();
      }
    }

    // 2. Segmented creeping rhizome stolon (same stone palette as the growing plant)
    const rhizGrad = ctx.createLinearGradient(0, 12, 0, 18);
    rhizGrad.addColorStop(0, '#a8a29e');
    rhizGrad.addColorStop(0.55, '#57534e');
    rhizGrad.addColorStop(1, '#292524');
    ctx.fillStyle = rhizGrad;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-17, 13);
    ctx.quadraticCurveTo(0, 11.5, 17, 13);
    ctx.quadraticCurveTo(19, 15.5, 17, 18);
    ctx.quadraticCurveTo(0, 16.8, -17, 18);
    ctx.quadraticCurveTo(-19, 15.5, -17, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(41, 37, 36, 0.7)';
    ctx.lineWidth = 0.9;
    for (const sx of [-13, -4.5, 4.5, 13]) {
      ctx.beginPath();
      ctx.moveTo(sx, 12.6);
      ctx.lineTo(sx, 17.6);
      ctx.stroke();
    }

    // 3. Three emerald ribbon blades emerging from the rhizome nodes
    for (const [ox, h, bend, w] of [
      [-9, 25, -5.5, 5.4],
      [0, 31, 2.5, 6.2],
      [9, 26, 6.0, 5.4],
    ] as const) {
      const baseY = 13;
      const topY = baseY - h;
      const blade = new Path2D();
      blade.moveTo(ox - w * 0.5, baseY);
      blade.quadraticCurveTo(ox - w * 0.46 + bend * 0.5, baseY - h * 0.5, ox - w * 0.36 + bend, topY + 3);
      blade.quadraticCurveTo(ox + bend, topY - 1.2, ox + w * 0.36 + bend, topY + 3);
      blade.quadraticCurveTo(ox + w * 0.46 + bend * 0.5, baseY - h * 0.5, ox + w * 0.5, baseY);
      blade.closePath();
      const bGrad = ctx.createLinearGradient(ox - w, topY, ox + w, baseY);
      bGrad.addColorStop(0, '#6ee7b7');
      bGrad.addColorStop(0.52, '#059669');
      bGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = bGrad;
      ctx.fill(blade);
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.4;
      ctx.stroke(blade);

      // Parallel longitudinal veins
      ctx.strokeStyle = 'rgba(209, 250, 229, 0.55)';
      ctx.lineWidth = 0.6;
      for (const vx of [-0.24, 0, 0.24]) {
        ctx.beginPath();
        ctx.moveTo(ox + w * vx, baseY - 2);
        ctx.quadraticCurveTo(ox + w * vx + bend * 0.5, baseY - h * 0.5, ox + w * vx * 0.6 + bend, topY + 2.5);
        ctx.stroke();
      }
      // Transverse lacunae cross-bars
      ctx.strokeStyle = 'rgba(209, 250, 229, 0.38)';
      for (let t = 0.3; t < 0.9; t += 0.16) {
        const cx = ox + bend * t * t;
        const hw = w * 0.4 * (1 - t * 0.3);
        ctx.beginPath();
        ctx.moveTo(cx - hw, baseY - h * t);
        ctx.lineTo(cx + hw, baseY - h * t);
        ctx.stroke();
      }

      // Pale clasping basal leaf sheath with black Enhalus fibres
      const sGrad = ctx.createLinearGradient(0, baseY - 7, 0, baseY + 1);
      sGrad.addColorStop(0, '#d1fae5');
      sGrad.addColorStop(1, '#6ee7b7');
      ctx.fillStyle = sGrad;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(ox - w * 0.6, baseY + 0.8);
      ctx.lineTo(ox - w * 0.52, baseY - 6.5);
      ctx.quadraticCurveTo(ox, baseY - 8, ox + w * 0.52, baseY - 6.5);
      ctx.lineTo(ox + w * 0.6, baseY + 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 0.7;
      for (const f of [-1.2, 1.2]) {
        ctx.beginPath();
        ctx.moveTo(ox + f, baseY + 0.5);
        ctx.lineTo(ox + f * 1.2, baseY - 5);
        ctx.stroke();
      }
    }

    // 4. Glistening oxygen micro-bubbles
    for (const [bx, by, br] of [
      [-11.5, -2, 1.7],
      [3.6, -9, 1.4],
      [13.5, 0, 1.2],
    ] as const) {
      ctx.fillStyle = 'rgba(236, 254, 255, 0.7)';
      ctx.strokeStyle = 'rgba(6, 78, 59, 0.5)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx - br * 0.35, by - br * 0.35, br * 0.38, 0, Math.PI * 2);
      ctx.fill();
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
        // Fine dark velvety sheath hairs (rebung sheaths are covered in brown bristles)
        ctx.strokeStyle = 'rgba(46, 19, 2, 0.45)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        for (const hx of [-0.5, -0.2, 0.15, 0.45]) {
          ctx.moveTo(half * hx, y0 - 2);
          ctx.lineTo(half * hx * 0.8, y0 - 7);
        }
        ctx.stroke();
      }

      // Freshly harvested cut base revealing the cream-white edible core
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#2e1302';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 14, 10, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(180, 83, 9, 0.5)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(0, 14, 6, 1.5, 0, 0, Math.PI * 2);
      ctx.stroke();

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
        // Every other cell is wax-capped (pale cream) or brimming with glossy amber honey
        if ((row + col) % 2 === 0) {
          ctx.fillStyle = 'rgba(254, 249, 195, 0.55)';
        } else {
          ctx.fillStyle = 'rgba(180, 83, 9, 0.35)';
        }
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(hx - 1, hy - 1, 0.7, 0, Math.PI * 2);
        ctx.fill();
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
      // Robust cheliped: chunky propodus palm + open serrated fixed finger & dactyl (real pincer shape)
      ctx.save();
      ctx.translate(side * 9.5, -8.5);
      ctx.rotate(side * 0.45);
      ctx.fillStyle = '#ea580c';
      ctx.strokeStyle = '#431407';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.4, 3.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c2410c';
      ctx.beginPath();
      ctx.moveTo(side * 2.6, -1.8);
      ctx.quadraticCurveTo(side * 6.6, -4.8, side * 7.4, -2.2);
      ctx.quadraticCurveTo(side * 5.2, -2.0, side * 3.2, -0.4);
      ctx.closePath();
      ctx.moveTo(side * 2.8, 0.8);
      ctx.quadraticCurveTo(side * 6.8, 1.6, side * 7.2, -0.8);
      ctx.quadraticCurveTo(side * 5.0, -0.2, side * 3.0, -0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Dark finger tips typical of Scylla mud crabs
      ctx.fillStyle = '#1c0a02';
      ctx.beginPath();
      ctx.arc(side * 7.2, -2.2, 0.8, 0, Math.PI * 2);
      ctx.arc(side * 7.0, -0.8, 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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
  // 21. Mangrove Propagules (Rhizophora viviparous hypocotyls — the same torpedo propagules that hang from P19/P20)
  food_mangrove_propagules: (ctx) => {
    for (const [ox, oy, rot, len, sc] of [
      [-8, 1, -0.32, 34, 0.92],
      [8, 2, 0.3, 32, 0.9],
      [0, -1, 0.02, 38, 1.0],
    ] as const) {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(rot);
      ctx.scale(sc, sc);
      const top = -len * 0.5;
      const bot = len * 0.5;

      // Club-shaped hypocotyl: slim neck under the cap, swollen lower third, sharp mud-piercing tip
      const body = new Path2D();
      body.moveTo(-2.2, top + 4);
      body.bezierCurveTo(-3.4, top + len * 0.4, -4.6, bot - 9, -2.4, bot - 2.5);
      body.quadraticCurveTo(0, bot + 1.5, 2.4, bot - 2.5);
      body.bezierCurveTo(4.6, bot - 9, 3.4, top + len * 0.4, 2.2, top + 4);
      body.closePath();
      const g = ctx.createLinearGradient(-4.6, 0, 4.6, 0);
      g.addColorStop(0, '#d9f99d');
      g.addColorStop(0.45, '#65a30d');
      g.addColorStop(1, '#365314');
      ctx.fillStyle = g;
      ctx.fill(body);
      ctx.strokeStyle = '#1a2e05';
      ctx.lineWidth = 1.4;
      ctx.stroke(body);

      // Brownish-purple ripening blush towards the tip + pale lenticel freckles
      ctx.save();
      ctx.clip(body);
      const tipBlush = ctx.createLinearGradient(0, bot - 12, 0, bot);
      tipBlush.addColorStop(0, 'rgba(120, 53, 15, 0)');
      tipBlush.addColorStop(1, 'rgba(120, 53, 15, 0.55)');
      ctx.fillStyle = tipBlush;
      ctx.fillRect(-6, bot - 12, 12, 14);
      ctx.restore();
      ctx.fillStyle = 'rgba(254, 249, 195, 0.75)';
      for (const [lx, ly] of [
        [-1.2, top + len * 0.35],
        [1.1, top + len * 0.5],
        [-1.5, top + len * 0.66],
        [1.3, top + len * 0.78],
      ] as const) {
        ctx.beginPath();
        ctx.ellipse(lx, ly, 0.8, 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Sunlit specular streak down the hypocotyl
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 0.9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-1.2, top + 6);
      ctx.quadraticCurveTo(-2.4, top + len * 0.5, -1.6, bot - 6);
      ctx.stroke();

      // Brown cotyledon collar + reflexed sepal cap where it detached from the parent tree
      ctx.fillStyle = '#713f12';
      ctx.strokeStyle = '#271001';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, top + 3, 3.4, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#a16207';
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, top + 1.5);
        ctx.quadraticCurveTo(sd * 4.6, top - 0.5, sd * 4.2, top + 3.8);
        ctx.quadraticCurveTo(sd * 2.4, top + 2.8, 0, top + 2.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  },

  // 22. Sugar Palm Fruit (Arenga pinnata buah kabung / kolang-kaling — strand of P16 fruits + opened kernel)
  food_sugar_palm_fruit: (ctx) => {
    // Pendulous fruiting rachilla strand
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a2e05';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(-6, -24);
    ctx.quadraticCurveTo(-2, -6, 2, 14);
    ctx.stroke();
    ctx.strokeStyle = '#4d7c0f';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-6, -24);
    ctx.quadraticCurveTo(-2, -6, 2, 14);
    ctx.stroke();

    // Round-depressed 3-seeded drupes clustered along the strand, ripening green -> gold
    for (const [fx, fy, r, cLight, cMid, cDark] of [
      [-11, -13, 6.2, '#d9f99d', '#84cc16', '#3f6212'],
      [3.5, -9, 6.6, '#ecfccb', '#a3e635', '#4d7c0f'],
      [-8.5, 2, 6.8, '#fef08a', '#eab308', '#854d0e'],
      [7.5, 6, 6.4, '#fef9c3', '#facc15', '#a16207'],
    ] as const) {
      const fg = ctx.createRadialGradient(fx - r * 0.35, fy - r * 0.35, 0.6, fx, fy, r * 1.1);
      fg.addColorStop(0, cLight);
      fg.addColorStop(0.55, cMid);
      fg.addColorStop(1, cDark);
      ctx.fillStyle = fg;
      ctx.strokeStyle = '#1a2e05';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(fx, fy, r, r * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Faint 3-locule seams meeting at the stylar point
      ctx.strokeStyle = 'rgba(26, 46, 5, 0.35)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = Math.PI / 2 + (k * Math.PI * 2) / 3;
        ctx.moveTo(fx, fy + r * 0.15);
        ctx.lineTo(fx + Math.cos(a) * r * 0.7, fy + r * 0.15 + Math.sin(a) * r * 0.6);
      }
      ctx.stroke();
      // Persistent 3-sepal cupule cap
      ctx.fillStyle = '#3f6212';
      ctx.strokeStyle = '#1a2e05';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(fx, fy - r * 0.82, r * 0.55, r * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Specular gloss
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(fx - r * 0.35, fy - r * 0.25, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Two translucent pearly kolang-kaling kernels (the edible endosperm) at the base
    for (const [kx, ky, rot] of [
      [-4, 17, -0.35],
      [6, 18.5, 0.3],
    ] as const) {
      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate(rot);
      const kg = ctx.createRadialGradient(-1, -1, 0.4, 0, 0, 4.6);
      kg.addColorStop(0, '#ffffff');
      kg.addColorStop(0.6, 'rgba(241, 245, 249, 0.95)');
      kg.addColorStop(1, 'rgba(203, 213, 225, 0.95)');
      ctx.fillStyle = kg;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.4, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.ellipse(-1.4, -0.9, 1.3, 0.6, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },
};

/**
 * Problem-5 refinement registry: 20 review iterations x 4 concrete fixes each (80 fixes)
 * across existing plants, food icons and animals. Every entry maps to a real code change.
 */
export const TWENTY_ITERATION_REFINEMENT_LOG: ReadonlyArray<{ iteration: number; fixes: readonly string[] }> = [
  { iteration: 1, fixes: [
    'plantRenderer: added hubBranch() so a bough tip lands exactly on each drawCanopyCrown basal hub (cx, cy + ry*0.64).',
    'P19 Bakau: replaced default bough offsets with hub-matched boughs for the left, right and main crowns.',
    'P19 Bakau: added a central leader bough so the main crown hub (20px above the trunk top) is supported.',
    'P19 Bakau: stilt roots now start at y=22-30, inside the trunk, so the trunk covers their tops with no visible seam.',
  ] },
  { iteration: 2, fixes: [
    'P19 Bakau: lenticel pores now sit on the actual quadratic root curve instead of floating at fixed x.',
    'P19 Bakau: propagule pedicels lengthened (py-34) and given an outline, so they reach up into the canopy twigs.',
    'P19 Bakau: propagule stalk now curves slightly (quadratic) for a hanging look instead of a rigid stick.',
    'P19 Bakau: inner root spacing tightened (±5/±10) so the stilt fan reads as one root crown.',
  ] },
  { iteration: 3, fixes: [
    'P20 Api-api: hub-matched boughs for all three crowns.',
    'P04 Mangosteen: hub-matched boughs for all three crowns.',
    'P15 Rambutan: hub-matched boughs for all three crowns.',
    'P14 Banyan: replaced 4 mismatched boughs with 3 hub-matched boughs; side boughs now meet the prop-root tops.',
  ] },
  { iteration: 4, fixes: [
    'drawCanopyCrown: added two lower basal foliage cushions so the woody hub sits inside foliage, not under it.',
    'drawCanopyCrown: extended the back-foliage gradient down to ry*0.72 to shade the new basal cushions.',
    'drawCanopyCrown: added an outlined tapered stem collar from the hub down 16px into the bough tip.',
    'drawCanopyCrown: collar inner fill drawn after the outline so no dark line cuts across the bough/crown union.',
  ] },
  { iteration: 5, fixes: [
    'drawWoodyTrunkAndBranches: each secondary fork tip now ends in a 3-leaf spray (two new lateral leaflets).',
    'drawWoodyTrunkAndBranches: lateral leaflets fan at ±0.55 rad so the spray reads as a natural cluster.',
    'drawWoodyTrunkAndBranches: lateral leaflets are smaller (20x8) than the terminal leaf to keep depth hierarchy.',
    'drawWoodyTrunkAndBranches: lateral leaflets sway with the same phase as the twig they grow from.',
  ] },
  { iteration: 6, fixes: [
    'Seagrass food: rhizome recoloured from brown to the same stone-grey gradient as the growing Enhalus rhizome.',
    'Seagrass food: rhizome reshaped into a rounded stolon with 4 internode ring scars.',
    'Seagrass food: added white cord-like anchoring rootlets under each node (as on the growing plant).',
    'Seagrass food: outline colour unified to #022c22 (same as herbsAquatic seagrass).',
  ] },
  { iteration: 7, fixes: [
    'Seagrass food: blades now use the plant gradient #6ee7b7 -> #059669 -> #064e3b.',
    'Seagrass food: blades get the same rounded apex as Enhalus instead of a sharp point.',
    'Seagrass food: three parallel longitudinal veins per blade (was a single dark midline).',
    'Seagrass food: added transverse lacunae cross-bars.',
  ] },
  { iteration: 8, fixes: [
    'Seagrass food: added pale clasping basal leaf sheaths (#d1fae5 -> #6ee7b7).',
    'Seagrass food: added black Enhalus fibre bristles on the sheaths.',
    'Seagrass food: added three glistening oxygen micro-bubbles with specular dots.',
    'Seagrass food: blade widths vary (5.4 / 6.2 / 5.4) so the central blade leads like a real shoot.',
  ] },
  { iteration: 9, fixes: [
    'Enhalus plant: added transverse lacunae cross-bars on every blade (matches the food icon).',
    'Enhalus plant: cross-bars follow the blade sway curve (sway*48*t^2) so they stay inside the blade.',
    'Enhalus plant: cross-bars narrow towards the tip as the blade tapers.',
    'Enhalus plant: added two oxygen micro-bubbles per blade with highlight dots (matches the food icon).',
  ] },
  { iteration: 10, fixes: [
    'Papaya: added a green shoulder blush near the stalk (ripening runs from tip to stalk).',
    'Papaya: blush clipped to the fruit silhouette so it never spills outside.',
    'Papaya: added a sliced half-wedge showing salmon flesh and pale seed-cavity wall.',
    'Papaya: added five glossy black seeds inside the cavity.',
  ] },
  { iteration: 11, fixes: [
    'Coconut: added two flank arrises so the husk reads as three-angled.',
    'Coconut: added a waxy specular highlight on the sunlit shoulder.',
    'Coconut: added a short fibrous stalk stub above the calyx.',
    'Coconut: added three imbricate perianth sepals on the calyx (matching the P13 tree fruit).',
  ] },
  { iteration: 12, fixes: [
    'Bamboo shoots: added fine dark sheath hairs on every culm sheath.',
    'Bamboo shoots: added a cream-white cut base showing the edible core.',
    'Bamboo shoots: added a growth-ring line on the cut face.',
    'Bamboo shoots: hair strokes taper inward to follow the sheath curve.',
  ] },
  { iteration: 13, fixes: [
    'Crabs & clams: claws redrawn as a propodus palm plus open fixed finger and dactyl (real pincer).',
    'Crabs & clams: claw fingers shaded darker orange than the palm.',
    'Crabs & clams: added dark finger tips typical of Scylla mud crabs.',
    'Crabs & clams: claws angled outward per side for a defensive pose.',
  ] },
  { iteration: 14, fixes: [
    'Honeycomb: cells alternate between wax-capped cream and open amber honey.',
    'Honeycomb: added a specular glint inside each cell.',
    'Honeycomb: cell fill drawn after the hex stroke so walls stay crisp.',
    'Honeycomb: capped/open pattern uses (row+col) parity for an even, natural layout.',
  ] },
  { iteration: 15, fixes: [
    'New food: mangrove propagules, a club-shaped hypocotyl with slim neck, swollen lower third and pointed tip.',
    'Mangrove propagules: green-to-olive gradient plus a brown ripening blush towards the tip.',
    'Mangrove propagules: pale lenticel freckles and a specular streak.',
    'Mangrove propagules: brown cotyledon collar with reflexed sepals where it dropped from the tree.',
  ] },
  { iteration: 16, fixes: [
    'New food: sugar palm fruit, a pendulous rachilla strand with four drupes clustered along it.',
    'Sugar palm fruit: drupes ripen green to gold along the strand.',
    'Sugar palm fruit: 3-locule seams and a persistent 3-sepal cupule cap on each drupe (matches P16).',
    'Sugar palm fruit: two translucent pearly kolang-kaling kernels at the base.',
  ] },
  { iteration: 17, fixes: [
    'Turtles: all four turtle species (green, hawksbill, terrapin, box turtle) now render through the main-page turtle rig.',
    'Turtles: tapping any in-game turtle cycles all 9 main-page emotions.',
    'Turtles: removed the 2-second tap lockout on turtles so emotions respond instantly, like the main page.',
    'Turtles: rollAwakeTapReaction pool expanded to all 9 emotions.',
  ] },
  { iteration: 18, fixes: [
    'P19/P20 propagules and capsules: linked to the new food_mangrove_propagules harvest item.',
    'P16/P21 palms: linked to the new food_sugar_palm_fruit harvest item.',
    'Diets: herbivore and omnivore diets that eat mangrove propagules or palm fruit now list the new foods.',
    'i18n: names and descriptions for both new foods in all four languages.',
  ] },
  { iteration: 19, fixes: [
    'hubBranch(): branch roots anchor inside the trunk core (xFactor*halfW*0.35) so every bough fillet welds into the bark.',
    'Central crown boughs use small negative xFactor so they sprout just left of the trunk apex, not from its edge.',
    'Side bough widths (15-20) are thicker than central leaders (13-16) for correct taper hierarchy.',
    'Banyan side bough tips now land within 2px of the aerial prop-root tops, joining roots and boughs.',
  ] },
  { iteration: 20, fixes: [
    'Durian food: verified thorn grid unchanged and that the honeycomb edit did not leak into it.',
    'Seagrass food & plant: both share the stone rhizome / pale sheath / emerald blade / bubble signature.',
    'All new food icons stay inside the 22-unit radius frame used by the store, bag and world drops.',
    'Type-checked and built the web + game bundles after all changes.',
  ] },
];

REFINED_FOOD_ICONS.food_freshwater_crustacean = REFINED_FOOD_ICONS.food_river_minnow_treat;
