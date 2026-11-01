import type { AnimalRig } from './types';
import {
  kitFillRimAndStroke,
  kitDrawSculptedPawLimb,
  kitDrawEmbeddedTail,
  kitDrawHairLock,
  kitDrawHairFringeOnEllipse,
  kitDrawLimbHairFringe,
  getAnimalRenderState,
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
 * A04: BORNEAN / SUMATRAN / MALAYAN ORANGUTAN (Pongo pygmaeus)
 * 70% Real / 30% Cute:
 * Very long arms, shaggy hanging ginger hair locks, facial cheek disc, no tail.
 * ========================================================================== */
const drawOrangutan: AnimalRig = (ctx, pose) => {
  const outline = '#2b1206';
  const cLight = '#f57f29';
  const cMid = '#d95614';
  const cDark = '#9e3608';
  const faceLight = '#e2ae84';
  const faceDark = '#b67a52';
  const belly = '#e87a38';

  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

  // Far Limbs (Hind limb shorter, arm very long!)
  kitDrawSculptedPawLimb(ctx, -70, 76, pose.hindFarAngle * 0.42, 98, 48, cMid, cDark, cDark, outline, {
    pawTipColor: faceDark,
  });
  kitDrawSculptedPawLimb(
    ctx,
    52,
    68,
    pose.farFlipperAngle * 0.42 - 0.08 - 0.48 * farGestureAmt,
    134, // Long primate arm
    54,
    cLight,
    cMid,
    cDark,
    outline,
    { pawTipColor: faceDark },
  );

  // Shaggy Torso (No tail!)
  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const torso = new Path2D();
  torso.ellipse(-26, 42, 130, 96, 0.06, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, torso, -120, -48, 68, 128, cLight, cMid, cDark, outline, 3.6);

  ctx.save();
  ctx.clip(torso);
  ctx.fillStyle = belly;
  drawOvalSpot(ctx, 44, 20, 32, 38, -0.08);
  ctx.restore();

  // Long shaggy hair locks hanging from belly & flanks
  kitDrawHairFringeOnEllipse(ctx, -26, 42, 130, 96, 0.06, Math.PI * 0.12, Math.PI * 1.02, 28, 34, cMid, cDark);

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(torso);
  ctx.restore();

  // Near Limbs (Long near arm with hair fringe)
  kitDrawSculptedPawLimb(ctx, -108, 74, pose.hindNearAngle * 0.44, 102, 52, cLight, cMid, cDark, outline, {
    pawTipColor: faceDark,
  });
  kitDrawLimbHairFringe(ctx, -108, 74, pose.hindNearAngle * 0.44, 102, 52, cMid, cDark);

  const rState = getAnimalRenderState();
  const waveAmt = rState.waveAmt;
  const primateArmAngle =
    pose.nearFlipperAngle * (0.42 + 0.2 * waveAmt) + 0.04 - 0.52 * waveAmt - 0.24 * pose.nearFlipperTuckAmount;

  kitDrawSculptedPawLimb(ctx, 12, 66, primateArmAngle, 138, 54, cLight, cMid, cDark, outline, {
    pawTipColor: faceLight,
  });
  kitDrawLimbHairFringe(ctx, 12, 66, primateArmAngle, 138, 54, cMid, cDark);

  // Head with Flanged Cheek Pads & Soulful Eyes
  ctx.save();
  ctx.translate(56 + pose.headX, -28 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX * 1.05, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  // Broad Cranium
  const headP = new Path2D();
  headP.ellipse(0, 0, 92, 84, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -70, -80, 60, 75, cLight, cMid, cDark, outline, 3.6);

  // Bare facial disc (flange pads)
  const faceP = new Path2D();
  faceP.ellipse(10 + lookX * 0.5, 8 + lookY * 0.5, 62, 54, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, faceP, -30, -30, 40, 45, faceLight, faceDark, '#874e2d', outline, 2.8);

  drawSoftCheekBlushes(ctx, -30 + lookX * 0.8, 16 + lookY * 0.8, 50 + lookX * 0.8, 20 + lookY * 0.8, 22, 14, pose.blushAlpha);

  // Muzzle & Mouth
  drawExpressiveAnimalMouth(ctx, 16 + lookX * 0.8, 34 + lookY * 0.8, 0.82, 0.06, pose, outline);

  // Flat broad primate nose
  ctx.fillStyle = '#422110';
  drawOvalSpot(ctx, 12 + lookX * 0.85, 16 + lookY * 0.85, 8, 5, -0.15);
  drawOvalSpot(ctx, 22 + lookX * 0.85, 17 + lookY * 0.85, 8, 5, 0.15);

  drawGlossyAnimalEye(ctx, 'left', -16 + lookX * 0.8, -4 + lookY * 0.8, 12, 14, -0.06, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 44 + lookX * 0.8, 2 + lookY * 0.8, 10.5, 12.5, 0.1, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -16 + lookX * 0.8, -24 + lookY * 0.8, 44 + lookX * 0.8, -18 + lookY * 0.8, 20, pose, outline, 3.4);

  ctx.restore();
};

/* ============================================================================
 * A09: LONG-TAILED MACAQUE (Macaca fascicularis)
 * Tail longer than body, cheek whiskers, bare face skin.
 * ========================================================================== */
const drawLongTailedMacaque: AnimalRig = (ctx, pose) => {
  const outline = '#261b10';
  const cLight = '#c79b63';
  const cMid = '#9c713e';
  const cDark = '#6e4c24';
  const faceLight = '#f5cfa8';
  const faceDark = '#d49d6e';
  const belly = '#ebd6b7';

  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
  kitDrawSculptedPawLimb(ctx, -68, 74, pose.hindFarAngle * 0.44, 108, 44, cMid, cDark, cDark, outline, { pawTipColor: faceDark });
  kitDrawSculptedPawLimb(
    ctx,
    50,
    70,
    pose.farFlipperAngle * 0.42 - 0.06 - 0.48 * farGestureAmt,
    114,
    44,
    cLight,
    cMid,
    cDark,
    outline,
    { pawTipColor: faceDark },
  );

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const torso = new Path2D();
  torso.ellipse(-28, 40, 114, 84, 0.06, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, torso, -120, -48, 68, 128, cLight, cMid, cDark, outline, 3.6);

  ctx.save();
  ctx.clip(torso);
  ctx.fillStyle = belly;
  drawOvalSpot(ctx, 46, 18, 26, 32, -0.08);
  ctx.restore();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(torso);

  // Very long, graceful macaque tail arching backward-upward
  ctx.save();
  ctx.translate(-138, 44);
  ctx.rotate(pose.hindNearAngle * 0.35 + Math.sin(pose.waveRaysPhase * 0.75) * 0.08);

  const tailFill = new Path2D();
  tailFill.moveTo(6, -10);
  tailFill.bezierCurveTo(-46, -10, -128, -62, -156, -152);
  tailFill.bezierCurveTo(-166, -188, -196, -178, -186, -142);
  tailFill.bezierCurveTo(-152, -44, -58, 18, 6, 10);
  tailFill.closePath();

  const tailOpen = new Path2D();
  tailOpen.moveTo(6, -10);
  tailOpen.bezierCurveTo(-46, -10, -128, -62, -156, -152);
  tailOpen.bezierCurveTo(-166, -188, -196, -178, -186, -142);
  tailOpen.bezierCurveTo(-152, -44, -58, 18, 6, 10);

  kitFillRimAndStroke(ctx, tailFill, 6, 10, -150, -160, cMid, cLight, cDark, outline, 3.4, tailOpen);
  ctx.restore();
  ctx.restore();

  // Near Limbs
  kitDrawSculptedPawLimb(ctx, -104, 72, pose.hindNearAngle * 0.44, 112, 48, cLight, cMid, cDark, outline, { pawTipColor: faceDark });
  const rState = getAnimalRenderState();
  const waveAmt = rState.waveAmt;
  const armAngle = pose.nearFlipperAngle * (0.42 + 0.2 * waveAmt) + 0.04 - 0.52 * waveAmt;
  kitDrawSculptedPawLimb(ctx, 10, 68, armAngle, 116, 46, cLight, cMid, cDark, outline, { pawTipColor: faceLight });

  // Head with cheek whiskers
  ctx.save();
  ctx.translate(54 + pose.headX, -28 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX * 0.9, pose.headScaleY * 0.94);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  const headP = new Path2D();
  headP.ellipse(0, 0, 84, 76, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -60, -70, 50, 70, cLight, cMid, cDark, outline, 3.5);

  // Pale bare face mask
  const faceP = new Path2D();
  faceP.ellipse(8 + lookX * 0.5, 6 + lookY * 0.5, 54, 46, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, faceP, -20, -20, 35, 35, faceLight, faceDark, '#a67246', outline, 2.6);

  // White cheek whisker tufts
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.4;
  for (const [wx, wy, rot] of [
    [-34, 12, 0.3],
    [-38, 24, 0.1],
    [52, 16, -0.3],
    [56, 28, -0.1],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(wx, wy, 12, 5, rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawExpressiveAnimalMouth(ctx, 12 + lookX * 0.8, 30 + lookY * 0.8, 0.8, 0.08, pose, outline);

  drawGlossyAnimalEye(ctx, 'left', -14 + lookX * 0.8, -4 + lookY * 0.8, 14, 17, -0.05, pose, IRIS_PALETTES.amberGold, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 38 + lookX * 0.8, 2 + lookY * 0.8, 12.5, 15, 0.1, pose, IRIS_PALETTES.amberGold, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -14 + lookX * 0.8, -22 + lookY * 0.8, 38 + lookX * 0.8, -16 + lookY * 0.8, 18, pose, outline, 3.2);

  ctx.restore();
};

/* ============================================================================
 * A10: DUSKY LEAF MONKEY (Trachypithecus obscurus)
 * White spectacled eye rings, dark coat, pale belly, long tail.
 * ========================================================================== */
const drawDuskyLeafMonkey: AnimalRig = (ctx, pose) => {
  const outline = '#171a1f';
  const cLight = '#7a8391';
  const cMid = '#525a66';
  const cDark = '#323740';
  const faceDark = '#262a30';
  const belly = '#c2ccd9';

  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
  kitDrawSculptedPawLimb(ctx, -68, 74, pose.hindFarAngle * 0.44, 110, 44, cMid, cDark, cDark, outline, { pawTipColor: faceDark });
  kitDrawSculptedPawLimb(
    ctx,
    50,
    70,
    pose.farFlipperAngle * 0.42 - 0.06 - 0.48 * farGestureAmt,
    114,
    44,
    cLight,
    cMid,
    cDark,
    outline,
    { pawTipColor: faceDark },
  );

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const torso = new Path2D();
  torso.ellipse(-28, 40, 118, 90, 0.06, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, torso, -120, -48, 68, 128, cLight, cMid, cDark, outline, 3.6);

  ctx.save();
  ctx.clip(torso);
  ctx.fillStyle = belly;
  drawOvalSpot(ctx, 46, 20, 28, 34, -0.08);
  ctx.restore();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(torso);

  // Long grey tail
  kitDrawEmbeddedTail(
    ctx,
    -142,
    44,
    pose.hindNearAngle * 0.35 + Math.sin(pose.waveRaysPhase * 0.75) * 0.08,
    144,
    42,
    12,
    -80,
    cLight,
    cMid,
    cDark,
    outline,
  );
  ctx.restore();

  // Near Limbs
  kitDrawSculptedPawLimb(ctx, -106, 72, pose.hindNearAngle * 0.44, 112, 48, cLight, cMid, cDark, outline, { pawTipColor: faceDark });
  const rState = getAnimalRenderState();
  const waveAmt = rState.waveAmt;
  const armAngle = pose.nearFlipperAngle * (0.42 + 0.2 * waveAmt) + 0.04 - 0.52 * waveAmt;
  kitDrawSculptedPawLimb(ctx, 10, 68, armAngle, 116, 46, cLight, cMid, cDark, outline, { pawTipColor: faceDark });

  // Head with White Spectacle Eye Rings!
  ctx.save();
  ctx.translate(54 + pose.headX, -28 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX * 0.95, pose.headScaleY * 0.95);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  const headP = new Path2D();
  headP.ellipse(0, 0, 86, 78, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -60, -70, 50, 70, cLight, cMid, cDark, outline, 3.5);

  // Dark charcoal face
  const faceP = new Path2D();
  faceP.ellipse(8 + lookX * 0.5, 6 + lookY * 0.5, 56, 48, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, faceP, -20, -20, 35, 35, '#3b4047', faceDark, '#15171a', outline, 2.6);

  // Diagnostic bright white spectacled eye rings
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(-14 + lookX * 0.8, -4 + lookY * 0.8, 18, 20, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(38 + lookX * 0.8, 2 + lookY * 0.8, 16, 18, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pale mouth / muzzle patch
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.ellipse(12 + lookX * 0.8, 28 + lookY * 0.8, 22, 14, 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  drawExpressiveAnimalMouth(ctx, 12 + lookX * 0.8, 30 + lookY * 0.8, 0.75, 0.08, pose, outline);

  drawGlossyAnimalEye(ctx, 'left', -14 + lookX * 0.8, -4 + lookY * 0.8, 12, 14, -0.05, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 38 + lookX * 0.8, 2 + lookY * 0.8, 10.5, 12.5, 0.1, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -14 + lookX * 0.8, -22 + lookY * 0.8, 38 + lookX * 0.8, -16 + lookY * 0.8, 18, pose, outline, 3.2);

  ctx.restore();
};

/* ============================================================================
 * A13: RAFFLES' BANDED LANGUR (Presbytis femoralis)
 * Black coat with sharp white chest/belly stripe, long tail.
 * ========================================================================== */
const drawBandedLangur: AnimalRig = (ctx, pose) => {
  const outline = '#0d0f14';
  const cLight = '#383d47';
  const cMid = '#1e2229';
  const cDark = '#0f1217';
  const faceDark = '#171a20';

  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
  kitDrawSculptedPawLimb(ctx, -68, 74, pose.hindFarAngle * 0.44, 110, 44, cMid, cDark, cDark, outline, { pawTipColor: faceDark });
  kitDrawSculptedPawLimb(
    ctx,
    50,
    70,
    pose.farFlipperAngle * 0.42 - 0.06 - 0.48 * farGestureAmt,
    114,
    44,
    cLight,
    cMid,
    cDark,
    outline,
    { pawTipColor: faceDark },
  );

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const torso = new Path2D();
  torso.ellipse(-28, 40, 114, 88, 0.06, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, torso, -120, -48, 68, 128, cLight, cMid, cDark, outline, 3.6);

  // Sharp white abdominal band (Banded Langur hallmark)
  ctx.save();
  ctx.clip(torso);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(34, -20);
  ctx.lineTo(60, -20);
  ctx.lineTo(48, 80);
  ctx.lineTo(24, 80);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(torso);

  kitDrawEmbeddedTail(
    ctx,
    -140,
    44,
    pose.hindNearAngle * 0.35 + Math.sin(pose.waveRaysPhase * 0.75) * 0.08,
    142,
    40,
    11,
    -78,
    cLight,
    cMid,
    cDark,
    outline,
  );
  ctx.restore();

  // Near Limbs (with white inner stripe)
  kitDrawSculptedPawLimb(ctx, -106, 72, pose.hindNearAngle * 0.44, 112, 48, cLight, cMid, cDark, outline, {
    pawTipColor: faceDark,
    stripesColor: '#ffffff',
  });
  const rState = getAnimalRenderState();
  const waveAmt = rState.waveAmt;
  const armAngle = pose.nearFlipperAngle * (0.42 + 0.2 * waveAmt) + 0.04 - 0.52 * waveAmt;
  kitDrawSculptedPawLimb(ctx, 10, 68, armAngle, 116, 46, cLight, cMid, cDark, outline, { pawTipColor: faceDark });

  // Head with pointed top crest
  ctx.save();
  ctx.translate(54 + pose.headX, -28 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX * 0.92, pose.headScaleY * 0.95);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  // Crown crest
  ctx.fillStyle = cDark;
  ctx.beginPath();
  ctx.moveTo(-20, -60);
  ctx.lineTo(0, -92);
  ctx.lineTo(20, -60);
  ctx.closePath();
  ctx.fill();

  const headP = new Path2D();
  headP.ellipse(0, 0, 84, 76, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -60, -70, 50, 70, cLight, cMid, cDark, outline, 3.5);

  drawExpressiveAnimalMouth(ctx, 12 + lookX * 0.8, 30 + lookY * 0.8, 0.76, 0.08, pose, outline);

  drawGlossyAnimalEye(ctx, 'left', -14 + lookX * 0.8, -4 + lookY * 0.8, 12, 14, -0.05, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 38 + lookX * 0.8, 2 + lookY * 0.8, 10.5, 12.5, 0.1, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -14 + lookX * 0.8, -22 + lookY * 0.8, 38 + lookX * 0.8, -16 + lookY * 0.8, 18, pose, outline, 3.2);

  ctx.restore();
};

/* ============================================================================
 * A18: BLACK GIANT SQUIRREL (Ratufa bicolor)
 * Huge bushy fur tail arching over back, cream underparts, ear tufts.
 * ========================================================================== */
const drawBlackGiantSquirrel: AnimalRig = (ctx, pose) => {
  const outline = '#1f1610';
  const cLight = '#3d2a1c';
  const cMid = '#24170d';
  const cDark = '#100a06';
  const buffCream = '#fff1d6';

  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
  kitDrawSculptedPawLimb(ctx, -64, 76, pose.hindFarAngle * 0.45, 96, 44, cMid, cDark, outline, outline);
  kitDrawSculptedPawLimb(ctx, 48, 72, pose.farFlipperAngle * 0.4 - 0.45 * farGestureAmt, 94, 42, cLight, cMid, outline, outline);

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  // Huge bushy squirrel tail arching over back!
  const tailP = new Path2D();
  tailP.moveTo(-110, 48);
  tailP.bezierCurveTo(-160, 20, -188, -70, -142, -140);
  tailP.bezierCurveTo(-108, -180, -32, -186, -18, -150);
  tailP.bezierCurveTo(-4, -114, -48, -78, -64, -20);
  tailP.bezierCurveTo(-72, 10, -84, 40, -110, 48);
  tailP.closePath();
  kitFillRimAndStroke(ctx, tailP, -160, -180, 0, 40, cLight, cMid, cDark, outline, 3.6);

  // Fluffy tail hair locks
  for (let h = 0; h < 8; h++) {
    const a = -Math.PI * 0.8 + h * 0.3;
    const hx = -100 + Math.cos(a) * 65;
    const hy = -100 + Math.sin(a) * 65;
    kitDrawHairLock(ctx, hx, hy, Math.cos(a), Math.sin(a), 26, 4.5, h % 2 === 0 ? cLight : cDark);
  }

  // Torso
  const torso = new Path2D();
  torso.ellipse(-24, 38, 108, 80, 0.06, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, torso, -110, -40, 60, 110, cLight, cMid, cDark, outline, 3.6);

  // Pale cream buff belly & throat
  ctx.save();
  ctx.clip(torso);
  ctx.fillStyle = buffCream;
  drawOvalSpot(ctx, 42, 28, 38, 44, -0.06);
  ctx.restore();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(torso);
  ctx.restore();

  // Near Limbs
  kitDrawSculptedPawLimb(ctx, -98, 76, pose.hindNearAngle * 0.46, 100, 48, cLight, cMid, cDark, outline);
  kitDrawSculptedPawLimb(ctx, 16, 72, pose.nearFlipperAngle * 0.44, 98, 44, cLight, cMid, cDark, outline);

  // Head with tufted ears
  ctx.save();
  ctx.translate(56 + pose.headX, -24 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  // Ear tufts
  ctx.fillStyle = cDark;
  ctx.beginPath();
  ctx.ellipse(-32, -48, 12, 22, -0.2, 0, Math.PI * 2);
  ctx.ellipse(24, -46, 12, 22, 0.2, 0, Math.PI * 2);
  ctx.fill();

  const headP = new Path2D();
  headP.ellipse(0, 0, 78, 68, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -55, -60, 45, 60, cLight, cMid, cDark, outline, 3.5);

  ctx.save();
  ctx.clip(headP);
  ctx.fillStyle = buffCream;
  drawOvalSpot(ctx, 18 + lookX * 0.5, 26 + lookY * 0.5, 42, 34, 0.04);
  ctx.restore();

  drawExpressiveAnimalMouth(ctx, 16 + lookX * 0.8, 30 + lookY * 0.8, 0.74, 0.08, pose, outline);

  drawGlossyAnimalEye(ctx, 'left', -16 + lookX * 0.8, -4 + lookY * 0.8, 12, 14, -0.05, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 38 + lookX * 0.8, 2 + lookY * 0.8, 10.5, 12.5, 0.1, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -16 + lookX * 0.8, -22 + lookY * 0.8, 38 + lookX * 0.8, -16 + lookY * 0.8, 18, pose, outline, 3.2);

  ctx.restore();
};

/* ============================================================================
 * A12: MALAYAN FLYING FOX (Pteropus vampyrus)
 * Leathery bat wing membranes spanning 4 elongated finger bones, golden mantle.
 * ========================================================================== */
const drawFlyingFox: AnimalRig = (ctx, pose) => {
  const outline = '#1a1114';
  const wingLight = '#543c47';
  const wingMid = '#36252d';
  const wingDark = '#1f1419';
  const furLight = '#e68a35';
  const furMid = '#ba5d18';
  const furDark = '#7d370a';

  const rState = getAnimalRenderState();
  const waveAmt = rState.waveAmt;

  // Wing drawing helper
  const drawWing = (side: -1 | 1) => {
    ctx.save();
    const isLeft = side === -1;
    const baseAng = isLeft ? 0.35 : -0.35;
    const gestureAng = !isLeft && waveAmt > 0.05 ? waveAmt * 0.8 : 0;
    ctx.translate(side * 28, 18);
    ctx.rotate(baseAng + gestureAng);

    const wP = new Path2D();
    wP.moveTo(0, 0);
    wP.quadraticCurveTo(side * 80, -60, side * 148, -10);
    wP.quadraticCurveTo(side * 120, 65, side * 70, 78);
    wP.quadraticCurveTo(side * 35, 60, 0, 24);
    wP.closePath();

    kitFillRimAndStroke(ctx, wP, 0, -60, side * 140, 75, wingLight, wingMid, wingDark, outline, 3.2);

    // 4 Finger bones radiating through wing membrane (digiti II-V)
    ctx.strokeStyle = '#23141c';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    for (const [tx, ty] of [
      [side * 142, -8],
      [side * 115, 62],
      [side * 68, 76],
      [side * 28, 48],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(side * 40, ty * 0.4, tx, ty);
      ctx.stroke();
    }

    // Hooked thumb claw (pollex) at top apex
    ctx.fillStyle = '#fffbeb';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(side * 48, -32, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  drawWing(-1); // Far wing
  drawWing(1);  // Near wing

  // Torso with golden fur mantle
  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const torso = new Path2D();
  torso.ellipse(0, 24, 68, 86, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, torso, -40, -50, 40, 80, wingMid, wingDark, '#0d070a', outline, 3.5);

  // Golden orange mantle / collar
  const mantle = new Path2D();
  mantle.ellipse(0, -18, 56, 38, 0, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, mantle, -35, -35, 35, 20, furLight, furMid, furDark, outline, 2.8);
  ctx.restore();

  // Fox-like head with pointed ears and muzzle
  ctx.save();
  ctx.translate(pose.headX, -38 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  // Pointed ears
  for (const eside of [-1, 1] as const) {
    ctx.fillStyle = wingDark;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(eside * 18, -24);
    ctx.lineTo(eside * 36, -64);
    ctx.lineTo(eside * 48, -20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  const headP = new Path2D();
  headP.ellipse(0, 0, 56, 52, 0, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -35, -35, 35, 40, furLight, furMid, furDark, outline, 3.4);

  // Tapered fox muzzle
  const muzzleP = new Path2D();
  muzzleP.moveTo(-20, 10);
  muzzleP.lineTo(0, 36);
  muzzleP.lineTo(20, 10);
  muzzleP.closePath();
  kitFillRimAndStroke(ctx, muzzleP, -15, 10, 15, 36, furMid, furDark, '#3d1704', outline, 2.4);

  ctx.fillStyle = '#1c0a02';
  drawOvalSpot(ctx, 0, 32, 5, 3.5, 0);

  drawGlossyAnimalEye(ctx, 'left', -16 + lookX * 0.8, -4 + lookY * 0.8, 10, 12, -0.05, pose, IRIS_PALETTES.amberGold, furLight, furMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 16 + lookX * 0.8, -4 + lookY * 0.8, 10, 12, 0.05, pose, IRIS_PALETTES.amberGold, furLight, furMid, outline);
  drawExpressiveAnimalBrows(ctx, -16 + lookX * 0.8, -18 + lookY * 0.8, 16 + lookX * 0.8, -18 + lookY * 0.8, 16, pose, outline, 3.0);

  ctx.restore();
};

export const PRIMATES_ARBOREAL_RIGS: Record<string, AnimalRig> = {
  animal_04_orangutan: drawOrangutan,
  animal_09_long_tailed_macaque: drawLongTailedMacaque,
  animal_10_dusky_leaf_monkey: drawDuskyLeafMonkey,
  animal_13_raffles_banded_langur: drawBandedLangur,
  animal_18_black_giant_squirrel: drawBlackGiantSquirrel,
  animal_12_malayan_flying_fox: drawFlyingFox,
};
