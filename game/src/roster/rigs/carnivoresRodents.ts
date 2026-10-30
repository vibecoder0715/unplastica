import type { AnimalRig } from './types';
import {
  kitFillRimAndStroke,
  kitDrawSculptedPawLimb,
  getAnimalRenderState,
} from '../animalRenderer';
import {
  drawGlossyAnimalEye,
  drawExpressiveAnimalBrows,
  drawExpressiveAnimalMouth,
  drawOvalSpot,
  IRIS_PALETTES,
} from '../../turtle/renderer';

/* ============================================================================
 * A05: MALAYAN SUN BEAR (Helarctos malayanus)
 * Sleek black coat, prominent golden-cream chest crescent (U-shape), long claws.
 * ========================================================================== */
const drawSunBear: AnimalRig = (ctx, pose) => {
  const outline = '#120f0e';
  const blackLight = '#2f2723';
  const blackMid = '#1c1714';
  const blackDark = '#0d0a08';
  const tanLight = '#fad390';
  const tanDark = '#f6b93b';

  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

  // Far plantigrade paws with long curved claws
  kitDrawSculptedPawLimb(ctx, -70, 76, pose.hindFarAngle * 0.44, 108, 52, blackMid, blackDark, '#050403', outline, {
    clawsColor: '#eae1d2',
  });
  kitDrawSculptedPawLimb(
    ctx,
    52,
    72,
    pose.farFlipperAngle * 0.42 - 0.45 * farGestureAmt,
    114,
    50,
    blackLight,
    blackMid,
    blackDark,
    outline,
    { clawsColor: '#eae1d2' },
  );

  // Torso with Golden Chest Crescent
  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const torso = new Path2D();
  torso.ellipse(-30, 40, 134, 94, 0.05, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, torso, -125, -50, 65, 125, blackLight, blackMid, blackDark, outline, 3.6);

  // Signature golden-cream U-shaped sun bear chest crescent
  ctx.save();
  ctx.clip(torso);
  const crescent = new Path2D();
  crescent.moveTo(34, -10);
  crescent.quadraticCurveTo(56, 12, 54, 52);
  crescent.quadraticCurveTo(34, 76, 12, 70);
  crescent.quadraticCurveTo(28, 54, 30, 40);
  crescent.quadraticCurveTo(32, 16, 20, -2);
  crescent.closePath();
  kitFillRimAndStroke(ctx, crescent, 10, -10, 56, 75, tanLight, tanDark, '#b87514', outline, 2.0);
  ctx.restore();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(torso);
  ctx.restore();

  // Near paws with claws
  kitDrawSculptedPawLimb(ctx, -112, 74, pose.hindNearAngle * 0.46, 112, 56, blackLight, blackMid, blackDark, outline, {
    clawsColor: '#eae1d2',
  });
  kitDrawSculptedPawLimb(ctx, 14, 70, pose.nearFlipperAngle * 0.44, 116, 52, blackLight, blackMid, blackDark, outline, {
    clawsColor: '#eae1d2',
  });

  // Bear head with pale tan muzzle and short rounded ears
  ctx.save();
  ctx.translate(56 + pose.headX, -28 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  // Small rounded ears
  for (const [ex, ey] of [
    [-34, -48],
    [36, -44],
  ] as const) {
    ctx.save();
    ctx.translate(ex, ey);
    const earP = new Path2D();
    earP.arc(0, 0, 18, 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, earP, 0, -18, 0, 18, blackMid, blackDark, '#050403', outline, 2.8);
    ctx.restore();
  }

  const headP = new Path2D();
  headP.ellipse(0, 0, 84, 74, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -60, -65, 50, 65, blackLight, blackMid, blackDark, outline, 3.6);

  // Pale muzzle
  const muzzleP = new Path2D();
  muzzleP.ellipse(18 + lookX * 0.8, 22 + lookY * 0.8, 48, 36, 0.05, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, muzzleP, 0, -10, 45, 45, tanLight, tanDark, '#a3630f', outline, 2.6);

  // Black button nose
  ctx.fillStyle = '#0a0706';
  drawOvalSpot(ctx, 22 + lookX * 0.85, 8 + lookY * 0.85, 14, 10, 0.06);

  drawExpressiveAnimalMouth(ctx, 18 + lookX * 0.8, 36 + lookY * 0.8, 0.78, 0.08, pose, outline);

  drawGlossyAnimalEye(ctx, 'left', -20 + lookX * 0.85, -10 + lookY * 0.85, 11.5, 13.5, -0.06, pose, IRIS_PALETTES.warmBrown, blackLight, blackMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 46 + lookX * 0.85, -2 + lookY * 0.85, 10, 12, 0.1, pose, IRIS_PALETTES.warmBrown, blackLight, blackMid, outline);
  drawExpressiveAnimalBrows(ctx, -20 + lookX * 0.85, -28 + lookY * 0.85, 46 + lookX * 0.85, -20 + lookY * 0.85, 20, pose, tanLight, 3.2);

  ctx.restore();
};

/* ============================================================================
 * A41: GIANT PANDA (Ailuropoda melanoleuca)
 * Velvety black limbs, ears, teardrop eye patches, full black shoulder band.
 * ========================================================================== */
const drawGiantPanda: AnimalRig = (ctx, pose) => {
  const outline = '#171412';
  const whiteLight = '#ffffff';
  const whiteMid = '#f1f5f9';
  const whiteDark = '#cbd5e1';
  const blackLight = '#2d2724';
  const blackMid = '#1c1715';
  const blackDark = '#0a0807';

  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

  // Far limbs (jet black)
  kitDrawSculptedPawLimb(ctx, -72, 76, pose.hindFarAngle * 0.44, 110, 54, blackMid, blackDark, '#050403', outline);
  kitDrawSculptedPawLimb(
    ctx,
    52,
    72,
    pose.farFlipperAngle * 0.42 - 0.45 * farGestureAmt,
    116,
    52,
    blackLight,
    blackMid,
    blackDark,
    outline,
  );

  // Torso with black shoulder saddle band
  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const torso = new Path2D();
  torso.ellipse(-28, 40, 132, 94, 0.05, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, torso, -120, -50, 65, 125, whiteLight, whiteMid, whiteDark, outline, 3.6);

  // Transverse black shoulder band
  ctx.save();
  ctx.clip(torso);
  ctx.fillStyle = blackDark;
  ctx.beginPath();
  ctx.moveTo(10, -60);
  ctx.lineTo(65, -60);
  ctx.lineTo(55, 140);
  ctx.lineTo(-5, 140);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(torso);
  ctx.restore();

  // Near limbs (jet black with pseudo-thumb)
  kitDrawSculptedPawLimb(ctx, -112, 74, pose.hindNearAngle * 0.46, 114, 58, blackLight, blackMid, blackDark, outline);
  kitDrawSculptedPawLimb(ctx, 14, 70, pose.nearFlipperAngle * 0.44, 118, 54, blackLight, blackMid, blackDark, outline);

  // Head with large black teardrop eye patches and round black ears
  ctx.save();
  ctx.translate(56 + pose.headX, -28 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  // Round black ears
  for (const [ex, ey] of [
    [-42, -52],
    [36, -50],
  ] as const) {
    ctx.save();
    ctx.translate(ex, ey);
    const earP = new Path2D();
    earP.arc(0, 0, 22, 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, earP, 0, -22, 0, 22, blackMid, blackDark, '#050403', outline, 3.0);
    ctx.restore();
  }

  const headP = new Path2D();
  headP.ellipse(0, 0, 88, 78, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -60, -70, 50, 70, whiteLight, whiteMid, whiteDark, outline, 3.6);

  // Characteristic black teardrop eye patches (tilted downward toward muzzle)
  ctx.fillStyle = blackDark;
  drawOvalSpot(ctx, -20 + lookX * 0.8, -4 + lookY * 0.8, 18, 26, -0.35);
  drawOvalSpot(ctx, 44 + lookX * 0.8, 2 + lookY * 0.8, 16, 24, 0.35);

  // Black button nose
  ctx.fillStyle = '#0a0807';
  drawOvalSpot(ctx, 14 + lookX * 0.85, 18 + lookY * 0.85, 14, 10, 0.05);

  drawExpressiveAnimalMouth(ctx, 14 + lookX * 0.8, 38 + lookY * 0.8, 0.82, 0.08, pose, outline);

  drawGlossyAnimalEye(ctx, 'left', -20 + lookX * 0.8, -4 + lookY * 0.8, 11.5, 13.5, -0.06, pose, IRIS_PALETTES.warmBrown, whiteLight, whiteMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 44 + lookX * 0.8, 2 + lookY * 0.8, 10, 12, 0.1, pose, IRIS_PALETTES.warmBrown, whiteLight, whiteMid, outline);
  drawExpressiveAnimalBrows(ctx, -20 + lookX * 0.8, -26 + lookY * 0.8, 44 + lookX * 0.8, -20 + lookY * 0.8, 20, pose, outline, 3.4);

  ctx.restore();
};

/* ============================================================================
 * A11: MALAYAN PORCUPINE (Hystrix brachyura)
 * Graded black/white quills, white nape collar, flare on anger.
 * ========================================================================== */
const drawPorcupine: AnimalRig = (ctx, pose) => {
  const outline = '#1f1209';
  const cLight = '#9e6b43';
  const cMid = '#6e4526';
  const cDark = '#472a14';

  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
  kitDrawSculptedPawLimb(ctx, -68, 74, pose.hindFarAngle * 0.45, 110, 46, cMid, cDark, outline, outline, { clawsColor: '#f5ebd6' });
  kitDrawSculptedPawLimb(
    ctx,
    50,
    70,
    pose.farFlipperAngle * 0.42 - 0.46 * farGestureAmt,
    114,
    44,
    cLight,
    cMid,
    cDark,
    outline,
    { clawsColor: '#f5ebd6' },
  );

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  // Sharp defensive quills radiating over rump (flare up when angry)
  const angerLift = pose.angryVeinAlpha * 0.28;
  const drawQuill = (qx: number, qy: number, ang: number, len: number) => {
    ctx.save();
    ctx.translate(qx, qy);
    ctx.rotate(ang - angerLift);

    const qP = new Path2D();
    qP.moveTo(0, -3.5);
    qP.quadraticCurveTo(len * 0.5, -3.2, len, 0);
    qP.quadraticCurveTo(len * 0.5, 3.2, 0, 3.5);
    qP.closePath();

    kitFillRimAndStroke(ctx, qP, 0, -3.5, len, 3.5, '#ffffff', '#e2e8f0', '#334155', outline, 2.0);

    // Dark blackish center band
    ctx.save();
    ctx.clip(qP);
    ctx.fillStyle = '#171717';
    ctx.fillRect(len * 0.35, -5, len * 0.38, 10);
    ctx.restore();
    ctx.restore();
  };

  // 12 Graded quills across the back
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const qx = -130 + t * 74;
    const qy = 22 - Math.sin(t * Math.PI) * 36;
    const qAng = -Math.PI * 0.88 + t * 0.55 + Math.sin(pose.waveRaysPhase + i * 0.5) * 0.03;
    const qLen = 146 + Math.sin(t * Math.PI) * 32;
    drawQuill(qx, qy, qAng, qLen);
  }

  // Torso
  const torso = new Path2D();
  torso.ellipse(-22, 44, 126, 88, 0.05, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, torso, -110, -40, 65, 130, cLight, cMid, cDark, outline, 3.6);

  // White crest collar on nape
  ctx.save();
  ctx.clip(torso);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.arc(38, -10, 48, 0.4, 1.4);
  ctx.stroke();
  ctx.restore();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(torso);
  ctx.restore();

  // Near Limbs
  kitDrawSculptedPawLimb(ctx, -108, 74, pose.hindNearAngle * 0.46, 112, 50, cLight, cMid, cDark, outline, { clawsColor: '#f5ebd6' });
  kitDrawSculptedPawLimb(ctx, 12, 70, pose.nearFlipperAngle * 0.44, 116, 46, cLight, cMid, cDark, outline, { clawsColor: '#f5ebd6' });

  // Head with blunt rodent muzzle
  ctx.save();
  ctx.translate(56 + pose.headX, -28 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  const headP = new Path2D();
  headP.ellipse(0, 0, 84, 72, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -55, -60, 45, 60, cLight, cMid, cDark, outline, 3.5);

  ctx.fillStyle = '#331d10';
  drawOvalSpot(ctx, 48 + lookX * 0.6, 16 + lookY * 0.6, 15, 11, 0.08);

  drawExpressiveAnimalMouth(ctx, 18 + lookX * 0.8, 38 + lookY * 0.8, 0.78, 0.08, pose, outline);

  drawGlossyAnimalEye(ctx, 'left', -18 + lookX * 0.85, -10 + lookY * 0.85, 12, 14, -0.06, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 42 + lookX * 0.85, -2 + lookY * 0.85, 10, 12, 0.1, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -18 + lookX * 0.85, -28 + lookY * 0.85, 42 + lookX * 0.85, -20 + lookY * 0.85, 20, pose, '#ffffff', 3.4);

  ctx.restore();
};

/* ============================================================================
 * A19: SMOOTH-COATED OTTER (Lutrogale perspicillata)
 * Dense fur, wet sheen, muscular flat rudder tail, webbed paws.
 * Streamlined swimming mode when in water (O2 fix).
 * ========================================================================== */
const drawOtter: AnimalRig = (ctx, pose) => {
  const outline = '#24150c';
  const cLight = '#a8764b';
  const cMid = '#7a4f2b';
  const cDark = '#4f3017';
  const cream = '#f7e6ce';

  const rState = getAnimalRenderState();
  const isSwimming = rState.swimming;
  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

  // Far webbed legs (paddling backward if swimming)
  const farLimbAng = isSwimming ? -0.45 + Math.sin(pose.waveRaysPhase) * 0.2 : pose.hindFarAngle * 0.4;
  kitDrawSculptedPawLimb(ctx, -64, 88, farLimbAng, 96, 46, cMid, cDark, outline, outline, { webbed: true });
  kitDrawSculptedPawLimb(
    ctx,
    58,
    80,
    isSwimming ? 0.35 - Math.sin(pose.waveRaysPhase) * 0.2 : pose.farFlipperAngle * 0.38 - 0.45 * farGestureAmt,
    104,
    44,
    cMid,
    cDark,
    outline,
    outline,
    { webbed: true },
  );

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  // Streamlined Torso + Thick Muscular Rudder Tail
  const tailWag = Math.sin(pose.waveRaysPhase * 0.85) * (isSwimming ? 18 : 10) + pose.hindNearAngle * 20;
  const bodyAndTail = new Path2D();
  bodyAndTail.moveTo(-248, 102 + tailWag);
  bodyAndTail.bezierCurveTo(-216, 68 + tailWag * 0.5, -162, 36, -118, 22);
  bodyAndTail.bezierCurveTo(-88, -42, 18, -54, 76, -14);
  bodyAndTail.bezierCurveTo(116, 16, 108, 86, 58, 114);
  bodyAndTail.bezierCurveTo(8, 138, -72, 132, -114, 98);
  bodyAndTail.bezierCurveTo(-148, 104, -182, 108 + tailWag * 0.5, -218, 120 + tailWag);
  bodyAndTail.bezierCurveTo(-238, 126 + tailWag, -256, 114 + tailWag, -248, 102 + tailWag);
  bodyAndTail.closePath();

  kitFillRimAndStroke(ctx, bodyAndTail, -250, -48, 98, 134, cLight, cMid, cDark, outline, 3.6);

  ctx.save();
  ctx.clip(bodyAndTail);
  ctx.fillStyle = cream;
  drawOvalSpot(ctx, 58, 18, 28, 36, 0.08);

  // Wet fur sheen reflection highlights
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(40, -18);
  ctx.quadraticCurveTo(-20, -32, -100, 10);
  ctx.stroke();
  ctx.restore();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(bodyAndTail);
  ctx.restore();

  // Near webbed legs
  const nearHindAng = isSwimming ? -0.4 + Math.sin(pose.waveRaysPhase + 0.5) * 0.2 : pose.hindNearAngle * 0.4;
  kitDrawSculptedPawLimb(ctx, -104, 86, nearHindAng, 98, 50, cLight, cMid, cDark, outline, { webbed: true });
  const nearFrontAng = isSwimming ? 0.3 + Math.sin(pose.waveRaysPhase + 0.5) * 0.2 : pose.nearFlipperAngle * 0.44;
  kitDrawSculptedPawLimb(ctx, 12, 76, nearFrontAng, 108, 46, cLight, cMid, cDark, outline, { webbed: true });

  // Sleek otter head with whiskers
  ctx.save();
  ctx.translate(44 + pose.headX, -38 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  const headP = new Path2D();
  headP.ellipse(0, 0, 76, 64, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -50, -55, 45, 55, cLight, cMid, cDark, outline, 3.5);

  ctx.save();
  ctx.clip(headP);
  ctx.fillStyle = cream;
  drawOvalSpot(ctx, 16 + lookX * 0.8, 24 + lookY * 0.8, 52, 34, 0.04);
  ctx.restore();

  // Black button nose
  ctx.fillStyle = '#1c0f08';
  drawOvalSpot(ctx, 22 + lookX * 0.85, 10 + lookY * 0.85, 12, 8, 0.05);

  // Long vibrissae whiskers
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.4;
  for (const wy of [10, 16, 22]) {
    ctx.beginPath();
    ctx.moveTo(14, wy);
    ctx.lineTo(-24, wy + 4);
    ctx.moveTo(30, wy);
    ctx.lineTo(68, wy + 4);
    ctx.stroke();
  }

  drawExpressiveAnimalMouth(ctx, 18 + lookX * 0.8, 28 + lookY * 0.8, 0.74, 0.08, pose, outline);

  drawGlossyAnimalEye(ctx, 'left', -14 + lookX * 0.8, -4 + lookY * 0.8, 12, 14, -0.05, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 38 + lookX * 0.8, 2 + lookY * 0.8, 10.5, 12.5, 0.1, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -14 + lookX * 0.8, -22 + lookY * 0.8, 38 + lookX * 0.8, -16 + lookY * 0.8, 18, pose, outline, 3.2);

  ctx.restore();
};

export const CARNIVORES_RODENTS_RIGS: Record<string, AnimalRig> = {
  animal_05_sun_bear: drawSunBear,
  animal_41_giant_panda: drawGiantPanda,
  animal_11_malayan_porcupine: drawPorcupine,
  animal_19_smooth_coated_otter: drawOtter,
};
