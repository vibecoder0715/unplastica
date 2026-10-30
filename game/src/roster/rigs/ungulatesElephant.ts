import type { AnimalRig } from './types';
import {
  kitFillRimAndStroke,
  kitDrawSculptedPawLimb,
  kitDrawEmbeddedTail,
  kitDrawToenails,
  kitDrawLimbFolds,
} from '../animalRenderer';
import {
  drawGlossyAnimalEye,
  drawExpressiveAnimalBrows,
  drawExpressiveAnimalMouth,
  drawSoftCheekBlushes,
  drawOvalSpot,
  IRIS_PALETTES,
} from '../../turtle/renderer';

/* ============================================================================
 * A02: ASIAN ELEPHANT (Elephas maximus)
 * 70% Real / 30% Cute:
 * Twin-domed skull, smaller Asian ears with blood vessels, 12-segment ringed trunk
 * with single finger tip, pillar legs with joint folds and authentic nail counts.
 * ========================================================================== */
const drawAsianElephant: AnimalRig = (ctx, pose) => {
  const outline = '#232830';
  const cLight = '#b0bec5';
  const cMid = '#8796a1';
  const cDark = '#5c6b75';
  const nailCol = '#7f8c96';
  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

  // Far pillar legs
  kitDrawSculptedPawLimb(ctx, -84, 74, pose.hindFarAngle * 0.45, 112, 56, cMid, cDark, '#48555e', outline, {
    pawTipColor: nailCol,
  });
  kitDrawSculptedPawLimb(
    ctx,
    58,
    70,
    pose.farFlipperAngle * 0.42 - 0.05 - 0.45 * farGestureAmt,
    116,
    56,
    cLight,
    cMid,
    cDark,
    outline,
    { pawTipColor: nailCol },
  );

  // Massive heavy quadruped torso
  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);
  const torso = new Path2D();
  torso.ellipse(-38, 40, 154, 100, 0.05, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, torso, -145, -52, 72, 136, cLight, cMid, cDark, outline, 3.6);

  // Tail with hair tuft
  kitDrawEmbeddedTail(
    ctx,
    -188,
    40,
    pose.hindNearAngle * 0.4 + Math.sin(pose.waveRaysPhase) * 0.06,
    70,
    18,
    6,
    22,
    cLight,
    cMid,
    cMid,
    outline,
    (tCtx) => {
      tCtx.fillStyle = '#2d333b';
      drawOvalSpot(tCtx, -68, 22, 13, 7, 0.35);
    },
  );
  ctx.restore();

  // Near pillar legs with skin folds and separate toenails (3 hind, 4 front visible)
  kitDrawSculptedPawLimb(ctx, -130, 72, pose.hindNearAngle * 0.45, 114, 62, cLight, cMid, cDark, outline, {
    pawTipColor: nailCol,
  });
  kitDrawLimbFolds(ctx, -130, 72, pose.hindNearAngle * 0.45, 114, 62, 'rgba(50, 60, 70, 0.32)');
  kitDrawToenails(ctx, -130, 72, pose.hindNearAngle * 0.45, 114, 62, 3, '#ece2cc', outline);

  kitDrawSculptedPawLimb(ctx, 12, 68, pose.nearFlipperAngle * 0.42 + 0.04, 118, 58, cLight, cMid, cDark, outline, {
    pawTipColor: nailCol,
  });
  kitDrawLimbFolds(ctx, 12, 68, pose.nearFlipperAngle * 0.42 + 0.04, 118, 58, 'rgba(50, 60, 70, 0.32)');
  kitDrawToenails(ctx, 12, 68, pose.nearFlipperAngle * 0.42 + 0.04, 118, 58, 4, '#ece2cc', outline);

  // Head with Twin Bivertex Cranial Bumps & Ears
  ctx.save();
  ctx.translate(48 + pose.headX, -36 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 14;
  const lookY = pose.headLookY * 10;

  // Ears with cooling vascular network and folded top margin
  for (const [ex, ey, rx, ry, rot] of [
    [-112, -12, 62, 78, -0.22],
    [114, 2, 52, 68, 0.25],
  ] as const) {
    ctx.save();
    ctx.translate(ex + lookX * 0.3, ey + lookY * 0.3);
    ctx.rotate(rot + Math.sin(pose.waveRaysPhase) * 0.04);
    const earP = new Path2D();
    earP.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, earP, -rx, -ry, rx, ry, cLight, cMid, cDark, outline, 3.5);

    ctx.save();
    ctx.clip(earP);
    ctx.fillStyle = 'rgba(244, 164, 176, 0.65)';
    drawOvalSpot(ctx, 0, 12, rx * 0.72, ry * 0.7, 0);

    // Blood vessels
    ctx.strokeStyle = 'rgba(150, 82, 96, 0.45)';
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    for (const [vx, vy, bend] of [
      [-0.5, -0.55, -0.2],
      [0.05, -0.7, 0.1],
      [0.5, -0.4, 0.25],
      [-0.45, 0.45, -0.15],
      [0.4, 0.55, 0.2],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(0, ry * 0.15);
      ctx.quadraticCurveTo(rx * (vx * 0.5 + bend), ry * vy * 0.5, rx * vx, ry * vy);
      ctx.stroke();
    }
    ctx.restore();

    ctx.lineWidth = 3.5;
    ctx.strokeStyle = outline;
    ctx.stroke(earP);
    ctx.restore();
  }

  // Head with twin bivertex bumps
  const headP = new Path2D();
  headP.moveTo(0, -122);
  headP.bezierCurveTo(45, -138, 108, -96, 108, -12);
  headP.bezierCurveTo(108, 58, 64, 92, 4, 92);
  headP.bezierCurveTo(-68, 92, -108, 52, -106, -16);
  headP.bezierCurveTo(-104, -96, -42, -136, 0, -122);
  headP.closePath();
  kitFillRimAndStroke(ctx, headP, -60, -125, 40, 90, '#c5d1d8', cLight, cMid, outline, 3.7);

  drawSoftCheekBlushes(ctx, -56 + lookX * 0.8, 24 + lookY * 0.8, 78 + lookX * 0.8, 32 + lookY * 0.8, 26, 15, pose.blushAlpha);
  drawExpressiveAnimalMouth(ctx, 12 + lookX, 54 + lookY, 0.78, 0.08, pose, outline);

  // Ivory Tusks emerging cleanly from lip sheaths
  const drawIvoryTusk = (tx: number, ty: number, rot: number, scale: number) => {
    ctx.save();
    ctx.translate(tx + lookX, ty + lookY);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    const tuskP = new Path2D();
    tuskP.moveTo(-9, -2);
    tuskP.bezierCurveTo(-8, 22, 8, 46, 28, 36);
    tuskP.bezierCurveTo(16, 20, 8, 4, 7, -4);
    tuskP.closePath();
    kitFillRimAndStroke(ctx, tuskP, -8, -4, 26, 38, '#fffffa', '#faf0d7', '#dfc896', outline, 2.6);

    const sheathP = new Path2D();
    sheathP.moveTo(-12, 1);
    sheathP.quadraticCurveTo(-1, -7, 10, -2);
    sheathP.quadraticCurveTo(0, -11, -12, 1);
    sheathP.closePath();
    ctx.fillStyle = cMid;
    ctx.fill(sheathP);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.restore();
  };

  drawIvoryTusk(-16, 28, 0.14, 1.28);

  // Articulated Trunk Hydrostat with Ring Wrinkles
  ctx.save();
  ctx.translate(22 + lookX, 6 + lookY);
  const trunkCurl = Math.sin(pose.waveRaysPhase * 0.8) * 0.08 + (pose.farFlipperChinAmount > 0.4 ? -0.35 : 0);
  ctx.rotate(trunkCurl);

  const trunkFill = new Path2D();
  trunkFill.moveTo(-24, -4);
  trunkFill.bezierCurveTo(-22, 42, 12, 92, 58, 84);
  trunkFill.bezierCurveTo(86, 78, 96, 46, 76, 36);
  trunkFill.bezierCurveTo(58, 28, 48, 52, 34, 48);
  trunkFill.bezierCurveTo(16, 42, 18, 6, 22, -6);
  trunkFill.closePath();

  kitFillRimAndStroke(ctx, trunkFill, -20, -6, 75, 85, cLight, cMid, cDark, outline, 3.5);

  // Ring wrinkles
  ctx.save();
  ctx.clip(trunkFill);
  ctx.strokeStyle = 'rgba(52, 62, 72, 0.42)';
  ctx.lineWidth = 1.8;
  for (let k = 1; k <= 12; k++) {
    const t = k / 13;
    const oy = t * 76;
    ctx.beginPath();
    ctx.ellipse(20, oy, 24 * (1 - t * 0.4), 4, 0.15, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();

  // Single prehensile finger-tip process
  ctx.fillStyle = '#f4a4b0';
  drawOvalSpot(ctx, 78, 44, 6, 4, 0.3);
  ctx.restore();

  drawIvoryTusk(52, 26, -0.04, 1.32);

  drawGlossyAnimalEye(ctx, 'left', -42 + lookX * 0.85, -18 + lookY * 0.85, 11, 13, -0.08, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 68 + lookX * 0.85, -8 + lookY * 0.85, 9.5, 11.5, 0.12, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -42 + lookX * 0.85, -38 + lookY * 0.85, 68 + lookX * 0.85, -28 + lookY * 0.85, 22, pose, outline, 3.6);

  ctx.restore();
};

/* ============================================================================
 * A03: MALAYAN TAPIR (Tapirus indicus)
 * Black forequarters and legs, pure white saddle/blanket, prehensile proboscis,
 * round white-rimmed ears, odd-toed hoof counts (4 front, 3 hind).
 * ========================================================================== */
const drawMalayanTapir: AnimalRig = (ctx, pose) => {
  const outline = '#13171d';
  const blackLight = '#333b47';
  const blackMid = '#1c222b';
  const blackDark = '#0e1217';
  const whiteLight = '#f8fafc';
  const whiteMid = '#e2e8f0';
  const whiteDark = '#94a3b8';

  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

  // Far limbs (coal black)
  kitDrawSculptedPawLimb(ctx, -78, 76, pose.hindFarAngle * 0.45, 112, 52, blackMid, blackDark, '#080a0d', outline, {
    hoofColor: '#475569',
  });
  kitDrawSculptedPawLimb(
    ctx,
    54,
    72,
    pose.farFlipperAngle * 0.42 - 0.45 * farGestureAmt,
    114,
    50,
    blackLight,
    blackMid,
    blackDark,
    outline,
    { hoofColor: '#475569' },
  );

  // Torso with crisp two-tone saddle blanket
  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const torso = new Path2D();
  torso.ellipse(-32, 40, 142, 94, 0.05, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, torso, -135, -50, 65, 130, blackLight, blackMid, blackDark, outline, 3.6);

  // White saddle blanket covering middle back and rump
  ctx.save();
  ctx.clip(torso);
  const saddle = new Path2D();
  saddle.moveTo(-32, -60);
  saddle.lineTo(60, -60);
  saddle.lineTo(60, 140);
  saddle.lineTo(-80, 140);
  saddle.bezierCurveTo(-150, 110, -170, 40, -150, -10);
  saddle.closePath();
  kitFillRimAndStroke(ctx, saddle, -100, -50, 60, 120, whiteLight, whiteMid, whiteDark, outline, 2.0);
  ctx.restore();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(torso);
  ctx.restore();

  // Near limbs (coal black with hooves)
  kitDrawSculptedPawLimb(ctx, -120, 74, pose.hindNearAngle * 0.46, 114, 56, blackLight, blackMid, blackDark, outline, {
    hoofColor: '#475569',
  });
  kitDrawToenails(ctx, -120, 74, pose.hindNearAngle * 0.46, 114, 56, 3, '#94a3b8', outline);

  kitDrawSculptedPawLimb(ctx, 14, 70, pose.nearFlipperAngle * 0.44, 116, 52, blackLight, blackMid, blackDark, outline, {
    hoofColor: '#475569',
  });
  kitDrawToenails(ctx, 14, 70, pose.nearFlipperAngle * 0.44, 116, 52, 4, '#94a3b8', outline);

  // Head with white-rimmed ears & prehensile proboscis
  ctx.save();
  ctx.translate(56 + pose.headX, -28 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  // Round ears with diagnostic white tips
  for (const [ex, ey, rot] of [
    [-34, -48, -0.2],
    [32, -46, 0.2],
  ] as const) {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(rot);
    const earP = new Path2D();
    earP.ellipse(0, 0, 16, 22, 0, 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, earP, -12, -18, 12, 18, blackMid, blackDark, '#05070a', outline, 2.6);

    // White rim border at apex of ear
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, -Math.PI * 0.8, -Math.PI * 0.2);
    ctx.stroke();
    ctx.restore();
  }

  const headP = new Path2D();
  headP.ellipse(0, 0, 84, 72, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -60, -65, 50, 65, blackLight, blackMid, blackDark, outline, 3.6);

  // Prehensile proboscis snout
  const snout = new Path2D();
  snout.moveTo(10, 10);
  snout.bezierCurveTo(46, 12, 78, 20, 92 + lookX * 0.8, 38 + lookY * 0.8);
  snout.bezierCurveTo(90 + lookX * 0.8, 52 + lookY * 0.8, 70, 52, 50, 46);
  snout.quadraticCurveTo(24, 44, 10, 36);
  snout.closePath();
  kitFillRimAndStroke(ctx, snout, 10, 10, 90, 50, blackLight, blackMid, blackDark, outline, 2.8);

  drawGlossyAnimalEye(ctx, 'left', -22 + lookX * 0.85, -8 + lookY * 0.85, 11, 13, -0.06, pose, IRIS_PALETTES.warmBrown, blackLight, blackMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 42 + lookX * 0.85, -2 + lookY * 0.85, 9.5, 11.5, 0.1, pose, IRIS_PALETTES.warmBrown, blackLight, blackMid, outline);
  drawExpressiveAnimalBrows(ctx, -22 + lookX * 0.85, -28 + lookY * 0.85, 42 + lookX * 0.85, -20 + lookY * 0.85, 20, pose, outline, 3.2);

  ctx.restore();
};

/* ============================================================================
 * A07: SAMBAR DEER (Rusa unicolor)
 * Dark coarse shaggy coat, neck mane, three-tined mature stag antlers.
 * ========================================================================== */
const drawSambarDeer: AnimalRig = (ctx, pose) => {
  const outline = '#261408';
  const cLight = '#b4875a';
  const cMid = '#85603b';
  const cDark = '#523621';
  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

  // Slender ungulate legs with cloven hooves
  kitDrawSculptedPawLimb(ctx, -68, 76, pose.hindFarAngle * 0.44, 116, 42, cMid, cDark, '#382212', outline, { hoofColor: '#2b1b11' });
  kitDrawSculptedPawLimb(ctx, 52, 70, pose.farFlipperAngle * 0.42 - 0.45 * farGestureAmt, 118, 40, cLight, cMid, cDark, outline, { hoofColor: '#2b1b11' });

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const torso = new Path2D();
  torso.ellipse(-28, 38, 122, 86, 0.05, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, torso, -115, -45, 65, 120, cLight, cMid, cDark, outline, 3.6);

  // Dark bushy tail
  kitDrawEmbeddedTail(ctx, -146, 38, pose.hindNearAngle * 0.4, 52, 18, 6, 18, cMid, cDark, '#2b170a', outline);
  ctx.restore();

  kitDrawSculptedPawLimb(ctx, -106, 74, pose.hindNearAngle * 0.46, 118, 44, cLight, cMid, cDark, outline, { hoofColor: '#2b1b11' });
  kitDrawSculptedPawLimb(ctx, 14, 70, pose.nearFlipperAngle * 0.44, 120, 42, cLight, cMid, cDark, outline, { hoofColor: '#2b1b11' });

  // Head with Three-Tined Antlers
  ctx.save();
  ctx.translate(56 + pose.headX, -34 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  // Sambar Stag Antlers (Brow tine + terminal fork beam)
  const drawAntler = (ax: number, ay: number, side: -1 | 1) => {
    ctx.save();
    ctx.translate(ax, ay);
    ctx.strokeStyle = '#d7c4a3';
    ctx.lineWidth = 6.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Main beam curving upward and backward
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(side * 28, -60, side * 18, -110);
    ctx.stroke();

    // Brow tine branching forward near the burr
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(side * 6, -18);
    ctx.quadraticCurveTo(side * 24, -28, side * 34, -40);
    ctx.stroke();

    // Terminal fork
    ctx.beginPath();
    ctx.moveTo(side * 22, -80);
    ctx.quadraticCurveTo(side * 36, -92, side * 38, -114);
    ctx.stroke();

    ctx.restore();
  };

  drawAntler(-22, -54, -1);
  drawAntler(22, -54, 1);

  const headP = new Path2D();
  headP.ellipse(0, 0, 78, 66, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -55, -60, 45, 60, cLight, cMid, cDark, outline, 3.6);

  // Black button nose
  ctx.fillStyle = '#221106';
  drawOvalSpot(ctx, 62 + lookX * 0.6, 18 + lookY * 0.6, 10, 7, 0.1);

  drawGlossyAnimalEye(ctx, 'left', -16 + lookX * 0.8, -8 + lookY * 0.8, 12, 14, -0.05, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 40 + lookX * 0.8, -2 + lookY * 0.8, 10.5, 12.5, 0.1, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -16 + lookX * 0.8, -26 + lookY * 0.8, 40 + lookX * 0.8, -20 + lookY * 0.8, 20, pose, outline, 3.4);

  ctx.restore();
};

/* ============================================================================
 * A08: GREATER MOUSEDEER (Tragulus napu - Kancil)
 * Arched back, NO antlers, white chevron throat stripes, tiny canines/tusks.
 * ========================================================================== */
const drawGreaterMousedeer: AnimalRig = (ctx, pose) => {
  const outline = '#261408';
  const cLight = '#e09a52';
  const cMid = '#b46a26';
  const cDark = '#7a4212';
  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

  // Ultra-slender delicate legs
  kitDrawSculptedPawLimb(ctx, -62, 78, pose.hindFarAngle * 0.44, 108, 32, cMid, cDark, '#4a2507', outline, { hoofColor: '#2b1b11' });
  kitDrawSculptedPawLimb(ctx, 48, 72, pose.farFlipperAngle * 0.42 - 0.45 * farGestureAmt, 110, 30, cLight, cMid, cDark, outline, { hoofColor: '#2b1b11' });

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  // Arched back with rump higher than shoulders
  const torso = new Path2D();
  torso.moveTo(-108, 44);
  torso.bezierCurveTo(-112, -26, -56, -58, -8, -52);
  torso.bezierCurveTo(46, -46, 96, -10, 94, 46);
  torso.bezierCurveTo(90, 84, -20, 96, -108, 44);
  torso.closePath();
  kitFillRimAndStroke(ctx, torso, -105, -50, 60, 90, cLight, cMid, cDark, outline, 3.5);

  ctx.restore();

  // Near slender legs
  kitDrawSculptedPawLimb(ctx, -98, 76, pose.hindNearAngle * 0.46, 110, 34, cLight, cMid, cDark, outline, { hoofColor: '#2b1b11' });
  kitDrawSculptedPawLimb(ctx, 16, 72, pose.nearFlipperAngle * 0.44, 112, 32, cLight, cMid, cDark, outline, { hoofColor: '#2b1b11' });

  // Dainty head with white throat stripes and protruding tusks (NO antlers!)
  ctx.save();
  ctx.translate(56 + pose.headX, -26 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX * 0.9, pose.headScaleY * 0.9);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  const headP = new Path2D();
  headP.ellipse(0, 0, 72, 58, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -50, -50, 40, 50, cLight, cMid, cDark, outline, 3.4);

  // Diagnostic white chevron throat stripes
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(8, 26);
  ctx.lineTo(26, 44);
  ctx.moveTo(22, 22);
  ctx.lineTo(38, 40);
  ctx.moveTo(-6, 30);
  ctx.lineTo(12, 48);
  ctx.stroke();

  // Tiny downward protruding male canine tusk
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(34 + lookX * 0.6, 26 + lookY * 0.6);
  ctx.lineTo(38 + lookX * 0.6, 36 + lookY * 0.6);
  ctx.lineTo(41 + lookX * 0.6, 27 + lookY * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawGlossyAnimalEye(ctx, 'left', -14 + lookX * 0.8, -6 + lookY * 0.8, 13, 15, -0.05, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 36 + lookX * 0.8, 0 + lookY * 0.8, 11, 13, 0.1, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -14 + lookX * 0.8, -24 + lookY * 0.8, 36 + lookX * 0.8, -18 + lookY * 0.8, 18, pose, outline, 3.2);

  ctx.restore();
};

export const UNGULATES_ELEPHANT_RIGS: Record<string, AnimalRig> = {
  animal_02_asian_elephant: drawAsianElephant,
  animal_03_malayan_tapir: drawMalayanTapir,
  animal_07_sambar_deer: drawSambarDeer,
  animal_08_greater_mousedeer: drawGreaterMousedeer,
};
