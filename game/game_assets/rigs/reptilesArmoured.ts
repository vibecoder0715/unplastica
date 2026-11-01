import type { AnimalRig } from './types';
import {
  kitFillRimAndStroke,
  kitDrawSculptedPawLimb,
  kitDrawEmbeddedTail,
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

/** Deterministic pseudo-random float [0, 1) based on integer seed. */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Universal Imbricate Artichoke/Keratin Scale:
 * Sharp parabolic tip pointing forward along local +Y, rounded base.
 * Layered with 3D gradient, central raised ridge/keel, and dark contour stroke.
 */
function drawKeratinScale(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rot: number,
  cLight: string,
  cMid: string,
  cDark: string,
  outline: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  const sp = new Path2D();
  sp.moveTo(-w * 0.5, -h * 0.15);
  sp.quadraticCurveTo(-w * 0.45, h * 0.65, 0, h);
  sp.quadraticCurveTo(w * 0.45, h * 0.65, w * 0.5, -h * 0.15);
  sp.quadraticCurveTo(0, -h * 0.35, -w * 0.5, -h * 0.15);
  sp.closePath();

  const grad = ctx.createLinearGradient(0, -h * 0.3, 0, h);
  grad.addColorStop(0, cDark);
  grad.addColorStop(0.5, cMid);
  grad.addColorStop(1, cLight);
  ctx.fillStyle = grad;
  ctx.fill(sp);

  // Raised central dorsal keel/carina
  ctx.strokeStyle = 'rgba(255, 245, 210, 0.5)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.1);
  ctx.lineTo(0, h * 0.88);
  ctx.stroke();

  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.0;
  ctx.stroke(sp);
  ctx.restore();
}

/* ============================================================================
 * A06: SUNDA PANGOLIN (Manis javanica)
 * 70% Realistic Structure / 30% Cute Appeal
 * - Full dorsal mantle scale coverage with zero background gaps (U1)
 * - Strict roof-tile overlap pointing toward the tail (U2)
 * - Regional size gradation: fine nape scales, broad mid-back, keeled tail (U3, U4)
 * - Articulated tapering prehensile tail with scales to the tip (U6)
 * - Bare pale underside & inner limbs, curved fore-claws (U7, U8)
 * ========================================================================== */
const drawSundaPangolin: AnimalRig = (ctx, pose) => {
  const outline = '#291608';
  const scaleLight = '#edbd74';
  const scaleMid = '#be8135';
  const scaleDark = '#754612';
  const skinLight = '#f5d5bb';
  const skinDark = '#cea380';

  const rState = getAnimalRenderState();
  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

  // 1. Far Limbs
  kitDrawSculptedPawLimb(ctx, -74, 76, pose.hindFarAngle * 0.45, 110, 44, skinDark, scaleMid, scaleDark, outline, {
    clawsColor: '#fff5e0',
  });
  kitDrawSculptedPawLimb(
    ctx,
    50,
    72,
    pose.farFlipperAngle * 0.42 - 0.06 - 0.46 * farGestureAmt,
    114,
    42,
    skinLight,
    skinDark,
    scaleMid,
    outline,
    { clawsColor: '#fff5e0' },
  );

  // 2. Torso Mantle & Embedded Tail
  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const torso = new Path2D();
  torso.ellipse(-30, 38, 134, 88, 0.06, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, torso, -120, -45, 55, 125, scaleLight, scaleMid, scaleDark, outline, 3.6);

  ctx.save();
  ctx.clip(torso);

  // Bare pale pink-tan ventral skin (pangolins lack scales on belly and inner limbs)
  const bellyGrad = ctx.createLinearGradient(0, 65, 0, 130);
  bellyGrad.addColorStop(0, skinDark);
  bellyGrad.addColorStop(1, skinLight);
  ctx.fillStyle = bellyGrad;
  ctx.beginPath();
  ctx.ellipse(-26, 114, 130, 46, 0.06, 0, Math.PI * 2);
  ctx.fill();

  // Dense, gapless imbricate scale shell (7 staggered concentric rows, drawn back-to-front)
  const rows = 7;
  for (let j = rows - 1; j >= 0; j--) {
    const shell = 1.05 - j * 0.13;
    const thetaStart = Math.PI * (0.83 + j * 0.02);
    const thetaEnd = Math.PI * (2.13 - j * 0.02);
    const count = Math.round(9 + 11 * shell);
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1);
      const theta = thetaStart + (thetaEnd - thetaStart) * u + (hash(j * 31 + i) - 0.5) * 0.03;
      const px = -30 + Math.cos(theta) * 134 * shell;
      const py = 38 + Math.sin(theta) * 88 * shell;

      // Tangent along curve; scale tips point toward tail (-X)
      const dx = -Math.sin(theta) * 134;
      const dy = Math.cos(theta) * 88;
      const len = Math.hypot(dx, dy) || 1;
      const rot = Math.atan2(dx / len, -dy / len);

      const regional = 0.65 + 0.5 * Math.sin(Math.PI * u);
      const size = (32 + 5 * (1 - j / rows)) * regional * (0.94 + hash(i * 11 + j) * 0.12);
      drawKeratinScale(ctx, px, py, size, size * 0.88, rot, scaleLight, scaleMid, scaleDark, outline);
    }
  }
  ctx.restore();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(torso);

  // Articulated tapering prehensile tail with scales to the tip
  kitDrawEmbeddedTail(
    ctx,
    -156,
    44,
    pose.hindNearAngle * 0.4 + Math.sin(pose.waveRaysPhase * 0.6) * 0.06,
    136,
    54,
    14,
    38,
    scaleLight,
    scaleMid,
    scaleDark,
    outline,
    (tCtx) => {
      const length = 136;
      const baseHalf = 27;
      const tipHalf = 7;
      const curl = 38;
      for (let i = 13; i >= 0; i--) {
        const t = i / 13;
        const cx = 4 - t * (length - 6);
        const cy = curl * t * t;
        const half = baseHalf + (tipHalf - baseHalf) * t;
        const size = half * 1.18 + 4;
        for (const lane of [-0.55, 0.55, 0]) {
          drawKeratinScale(
            tCtx,
            cx + (lane === 0 ? -size * 0.28 : 0),
            cy + lane * half,
            size,
            size * 0.94,
            Math.PI / 2 + lane * 0.22 - t * 0.52,
            scaleLight,
            scaleMid,
            scaleDark,
            outline,
          );
        }
      }
    },
  );
  ctx.restore();

  // 3. Near Limbs with limb scale plates & strong curved digging claws
  kitDrawSculptedPawLimb(ctx, -112, 74, pose.hindNearAngle * 0.45, 114, 52, skinLight, skinDark, scaleMid, outline, {
    clawsColor: '#fff5e0',
  });
  // Forelimb with wave gesture support
  const waveAmt = rState.waveAmt;
  const nearFrontAngle =
    pose.nearFlipperAngle * (0.42 + 0.2 * waveAmt) + 0.04 - 0.5 * waveAmt - 0.22 * pose.nearFlipperTuckAmount;
  kitDrawSculptedPawLimb(ctx, 8, 70, nearFrontAngle, 118, 46, skinLight, skinDark, scaleMid, outline, {
    clawsColor: '#fff5e0',
  });

  // 4. Conical Head with Crown Scales & Expressive Face
  ctx.save();
  ctx.translate(52 + pose.headX, -28 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  const headFill = new Path2D();
  headFill.moveTo(-76, -54);
  headFill.bezierCurveTo(-24, -84, 52, -52, 128 + lookX * 0.5, 16 + lookY * 0.5);
  headFill.bezierCurveTo(136 + lookX * 0.5, 26 + lookY * 0.5, 122 + lookX * 0.5, 42 + lookY * 0.5, 104 + lookX * 0.5, 44 + lookY * 0.5);
  headFill.bezierCurveTo(42, 62, -38, 66, -84, 38);
  headFill.bezierCurveTo(-108, 22, -108, -28, -76, -54);
  headFill.closePath();

  kitFillRimAndStroke(ctx, headFill, -85, -80, 90, 60, skinLight, skinDark, scaleMid, outline, 3.6);

  ctx.save();
  ctx.clip(headFill);
  // Fine crown & neck scales
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 8 - row * 2; i++) {
      const t = i / 7;
      drawKeratinScale(
        ctx,
        -88 + t * 124 + row * 10,
        -60 + t * 28 + row * 16,
        21 - t * 8 - row * 2,
        18 - t * 6 - row * 2,
        Math.PI / 2 + 0.25,
        scaleLight,
        scaleMid,
        scaleDark,
        outline,
      );
    }
  }
  drawSoftCheekBlushes(ctx, -28 + lookX * 0.8, 22 + lookY * 0.8, 62 + lookX * 0.8, 26 + lookY * 0.8, 20, 12, pose.blushAlpha);
  ctx.restore();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(headFill);

  drawExpressiveAnimalMouth(ctx, 46 + lookX * 0.7, 36 + lookY * 0.7, 0.64, 0.12, pose, outline);

  // Soft button nose at snout tip
  ctx.fillStyle = '#3d2214';
  drawOvalSpot(ctx, 118 + lookX * 0.5, 24 + lookY * 0.5, 10, 8, 0.25);

  // Soulful glossy warm brown eyes
  drawGlossyAnimalEye(ctx, 'left', -18 + lookX * 0.75, -6 + lookY * 0.75, 10.5, 12.5, -0.06, pose, IRIS_PALETTES.warmBrown, skinLight, skinDark, outline);
  drawGlossyAnimalEye(ctx, 'right', 54 + lookX * 0.75, 2 + lookY * 0.75, 9, 11, 0.1, pose, IRIS_PALETTES.warmBrown, skinLight, skinDark, outline);
  drawExpressiveAnimalBrows(ctx, -18 + lookX * 0.75, -26 + lookY * 0.75, 54 + lookX * 0.75, -18 + lookY * 0.75, 20, pose, outline, 3.2);

  ctx.restore();
};

/* ============================================================================
 * A16: RETICULATED PYTHON (Malayopython reticulatus)
 * ========================================================================== */
const drawReticulatedPython: AnimalRig = (ctx, pose) => {
  const outline = '#241608';
  const cLight = '#f5cf62';
  const cMid = '#c7922c';
  const cDark = '#7d5210';
  const bellyCream = '#fff6d6';

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const slitherPhase = pose.waveRaysPhase * 1.15;
  const rState = getAnimalRenderState();
  const waveAmt = rState.waveAmt;
  const w1 = Math.sin(slitherPhase) * 10 + pose.nearFlipperAngle * (10 + 18 * waveAmt) - 24 * waveAmt;
  const w2 = Math.cos(slitherPhase * 0.9) * 8 - 32 * waveAmt;
  const w3 = Math.sin(slitherPhase - 1.1) * 7;

  // Continuous S-Curve Serpent Body
  const serpentBody = new Path2D();
  serpentBody.moveTo(-4, -36);
  serpentBody.bezierCurveTo(-58, -32, -112 + w3, -18, -112 + w3, 14);
  serpentBody.bezierCurveTo(-112 + w3, 46, 128 - w3, 38, 128 - w3, 88);
  serpentBody.bezierCurveTo(128 - w3, 142, -124, 152, -164, 88);
  serpentBody.bezierCurveTo(-182, 52, -176 + w1 * 0.6, 4 + w2, -152 + w1, -34 + w2);
  serpentBody.bezierCurveTo(-150 + w1 * 0.5, 4 + w2, -142, 46, -116, 74);
  serpentBody.bezierCurveTo(-76, 102, 56 - w3, 102, 56 - w3, 84);
  serpentBody.bezierCurveTo(56 - w3, 66, -112 + w3, 74, -112 + w3, 28);
  serpentBody.bezierCurveTo(-48 + w3, 18, 42, 12, 52, -24);
  serpentBody.closePath();

  kitFillRimAndStroke(ctx, serpentBody, -176, -38, 130, 148, cLight, cMid, cDark, outline, 3.6);

  ctx.save();
  ctx.clip(serpentBody);

  // Pale ventral belly scutes
  ctx.fillStyle = bellyCream;
  const bellyP = new Path2D();
  bellyP.moveTo(-164, 72);
  bellyP.bezierCurveTo(-124, 134, 84, 132, 128 - w3, 88);
  bellyP.lineTo(132, 156);
  bellyP.lineTo(-176, 156);
  bellyP.closePath();
  ctx.fill(bellyP);

  // Transverse belly scute seams
  ctx.strokeStyle = 'rgba(125, 82, 16, 0.32)';
  ctx.lineWidth = 1.6;
  for (let vx = -136; vx <= 98; vx += 18) {
    ctx.beginPath();
    ctx.moveTo(vx, 118);
    ctx.lineTo(vx - 6, 144);
    ctx.stroke();
  }

  // Geometric Reticulated Diamond Net
  const diamondChain = [
    [-142 + w1 * 0.3, 38, 10, -0.35],
    [-124, 76, 14, -0.2],
    [-82, 108, 18, -0.05],
    [-28, 114, 19, 0],
    [28, 112, 19, 0.04],
    [82 - w3 * 0.5, 98, 17, -0.15],
    [48 - w3 * 0.4, 62, 17, 0.12],
    [-6, 52, 18, 0.08],
    [-58 + w3 * 0.4, 40, 17, 0.05],
    [-82 + w3 * 0.5, 10, 16, -0.15],
    [-38, -8, 16, -0.08],
    [12, -16, 15, -0.05],
  ] as const;

  // Interconnecting reticulated mesh lines
  ctx.strokeStyle = '#2a1806';
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  for (let k = 0; k < diamondChain.length - 1; k++) {
    const [ax, ay, ar, arot] = diamondChain[k];
    const [bx, by, br, brot] = diamondChain[k + 1];
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(ax + Math.sin(arot) * ar * s * -1, ay + Math.cos(arot) * ar * 0.9 * s);
      ctx.quadraticCurveTo((ax + bx) * 0.5, (ay + by) * 0.5 + s * 10, bx + Math.sin(brot) * br * s * -1, by + Math.cos(brot) * br * 0.9 * s);
      ctx.stroke();
    }
  }

  for (const [dx, dy, dr, rot] of diamondChain) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(rot);
    ctx.fillStyle = '#3b230c';
    ctx.strokeStyle = '#fff5cc';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -dr);
    ctx.lineTo(dr * 1.15, 0);
    ctx.lineTo(0, dr * 0.88);
    ctx.lineTo(-dr * 1.15, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = cLight;
    drawOvalSpot(ctx, 0, 0, dr * 0.28, dr * 0.22, 0);
    ctx.restore();
  }
  ctx.restore();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(serpentBody);
  ctx.restore();

  // Head with labial pits, golden amber eyes and flicking forked tongue
  ctx.save();
  ctx.translate(62 + pose.headX, -32 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  // Forked crimson tongue
  const tonguePhase = Math.sin(slitherPhase * 2.8);
  if (tonguePhase > 0.15) {
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(68 + lookX * 0.8, 16 + lookY * 0.8);
    ctx.lineTo(88 + lookX * 0.8, 16 + lookY * 0.8);
    ctx.lineTo(98 + lookX * 0.8, 11 + lookY * 0.8);
    ctx.moveTo(88 + lookX * 0.8, 16 + lookY * 0.8);
    ctx.lineTo(98 + lookX * 0.8, 21 + lookY * 0.8);
    ctx.stroke();
  }

  const headP = new Path2D();
  headP.ellipse(6, -4, 92, 68, 0.05, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -75, -72, 60, 68, cLight, cMid, cDark, outline, 3.7);

  ctx.save();
  ctx.clip(headP);
  ctx.fillStyle = bellyCream;
  drawOvalSpot(ctx, 14 + lookX * 0.5, 44 + lookY * 0.5, 76, 24, 0.04);
  drawSoftCheekBlushes(ctx, -42 + lookX * 0.8, 14 + lookY * 0.8, 56 + lookX * 0.8, 18 + lookY * 0.8, 20, 12, pose.blushAlpha);
  ctx.restore();

  ctx.lineWidth = 3.7;
  ctx.strokeStyle = outline;
  ctx.stroke(headP);

  // Labial sensory pits
  ctx.fillStyle = '#4a2c0a';
  for (const px of [22, 36, 48, 58]) {
    drawOvalSpot(ctx, px + lookX * 0.85, 18 + lookY * 0.75, 2.6, 1.8, 0.08);
  }

  drawGlossyAnimalEye(ctx, 'left', -28 + lookX * 0.85, -10 + lookY * 0.85, 11.5, 13.5, -0.08, pose, IRIS_PALETTES.amber, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 54 + lookX * 0.85, -2 + lookY * 0.85, 10, 12, 0.12, pose, IRIS_PALETTES.amber, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -28 + lookX * 0.85, -32 + lookY * 0.85, 54 + lookX * 0.85, -22 + lookY * 0.85, 20, pose, outline, 3.4);
  ctx.restore();
};

/* ============================================================================
 * A17: CLOUDED MONITOR LIZARD (Varanus nebulosus)
 * Arboreal, slender, long tail, granular clouded rosettes.
 * ========================================================================== */
const drawCloudedMonitor: AnimalRig = (ctx, pose) => {
  const outline = '#292111';
  const cLight = '#dfd084';
  const cMid = '#9e8842';
  const cDark = '#5c4b1b';
  const spotCol = '#fff3b0';
  const bellyCol = '#f7eed2';

  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
  kitDrawSculptedPawLimb(ctx, -64, 86, pose.hindFarAngle * 0.45 - 0.05, 100, 44, cMid, cDark, outline, outline, {
    clawsColor: '#e8dec8',
  });
  kitDrawSculptedPawLimb(
    ctx,
    56,
    78,
    pose.farFlipperAngle * 0.38 - 0.08 - 0.45 * farGestureAmt,
    108,
    44,
    cMid,
    cDark,
    outline,
    outline,
    { clawsColor: '#e8dec8' },
  );

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const tailSwing = Math.sin(pose.waveRaysPhase * 0.95) * 12 + pose.hindNearAngle * 22;
  const bodyAndTail = new Path2D();
  bodyAndTail.moveTo(-298, 118 + tailSwing);
  bodyAndTail.bezierCurveTo(-244, 72 + tailSwing * 0.4, -172, 24, -108, 14);
  bodyAndTail.bezierCurveTo(-72, -32, -10, -44, 28, -32);
  bodyAndTail.bezierCurveTo(56, -40, 76, -56, 92, -42);
  bodyAndTail.bezierCurveTo(110, -18, 102, 46, 68, 86);
  bodyAndTail.bezierCurveTo(22, 124, -68, 122, -108, 86);
  bodyAndTail.bezierCurveTo(-162, 88, -228, 110 + tailSwing * 0.4, -282, 136 + tailSwing);
  bodyAndTail.bezierCurveTo(-298, 142 + tailSwing, -310, 128 + tailSwing, -298, 118 + tailSwing);
  bodyAndTail.closePath();

  kitFillRimAndStroke(ctx, bodyAndTail, -300, -48, 102, 128, cLight, cMid, cDark, outline, 3.6);

  ctx.save();
  ctx.clip(bodyAndTail);

  // Clouded rosettes across flanks
  for (const [sx, sy, rx, ry] of [
    [-86, 8, 15, 10],
    [-48, -2, 16, 11],
    [-8, 6, 15, 10],
    [-68, 34, 15, 9],
    [-26, 36, 14, 9],
    [14, 28, 13, 8],
  ] as const) {
    ctx.fillStyle = cDark;
    drawOvalSpot(ctx, sx, sy, rx + 3, ry + 2, 0.15);
    ctx.strokeStyle = spotCol;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rx, ry, 0.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = cLight;
    drawOvalSpot(ctx, sx, sy, 4, 3, 0.15);
  }

  ctx.fillStyle = bellyCol;
  drawOvalSpot(ctx, 56, 72, 42, 44, 0.12);
  ctx.restore();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(bodyAndTail);
  ctx.restore();

  // Near limbs
  kitDrawSculptedPawLimb(ctx, -104, 88, pose.hindNearAngle * 0.48, 104, 48, cLight, cMid, cDark, outline, {
    clawsColor: '#e8dec8',
  });
  const rState = getAnimalRenderState();
  const waveAmt = rState.waveAmt;
  const nearFrontAngle = pose.nearFlipperAngle * (0.4 + 0.2 * waveAmt) + 0.05 - 0.45 * waveAmt;
  kitDrawSculptedPawLimb(ctx, 16, 80, nearFrontAngle, 112, 48, cLight, cMid, cDark, outline, {
    clawsColor: '#e8dec8',
  });

  // Head
  ctx.save();
  ctx.translate(68 + pose.headX, -28 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  const headP = new Path2D();
  headP.ellipse(4, -4, 84, 58, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -65, -60, 55, 58, cLight, cMid, cDark, outline, 3.6);

  drawGlossyAnimalEye(ctx, 'left', -24 + lookX * 0.85, -8 + lookY * 0.85, 11, 13, -0.06, pose, IRIS_PALETTES.amber, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 46 + lookX * 0.85, -2 + lookY * 0.85, 9.5, 11.5, 0.1, pose, IRIS_PALETTES.amber, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -24 + lookX * 0.85, -28 + lookY * 0.85, 46 + lookX * 0.85, -20 + lookY * 0.85, 18, pose, outline, 3.2);

  // Forked tongue
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(82 + lookX * 0.8, 12 + lookY * 0.8);
  ctx.lineTo(100 + lookX * 0.8, 12 + lookY * 0.8);
  ctx.lineTo(108 + lookX * 0.8, 7 + lookY * 0.8);
  ctx.moveTo(100 + lookX * 0.8, 12 + lookY * 0.8);
  ctx.lineTo(108 + lookX * 0.8, 17 + lookY * 0.8);
  ctx.stroke();

  ctx.restore();
};

/* ============================================================================
 * A25: ASIAN WATER MONITOR (Varanus salvator)
 * Heavy build, compressed swimming tail with double keel, yellow ocelli rows.
 * ========================================================================== */
const drawAsianWaterMonitor: AnimalRig = (ctx, pose) => {
  const outline = '#15160f';
  const cLight = '#6e7262';
  const cMid = '#45493b';
  const cDark = '#26281f';
  const spotCol = '#e9d37c';
  const bellyCol = '#dcd2a6';

  const rState = getAnimalRenderState();
  const isSwimming = rState.swimming;
  const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

  // Far limbs: stream backward along the flanks during swimming, walk on land
  const hindFarAng = isSwimming
    ? -0.58 + Math.sin(rState.locoTime * 4.2) * 0.12
    : pose.hindFarAngle * 0.45 - 0.05;
  kitDrawSculptedPawLimb(ctx, -64, 86, hindFarAng, 102, 46, cMid, cDark, outline, outline, {
    clawsColor: '#e8dec8',
  });

  const farFrontAng = isSwimming
    ? -0.48 + Math.cos(rState.locoTime * 4.2) * 0.1
    : pose.farFlipperAngle * 0.38 - 0.08 - 0.45 * farGestureAmt;
  kitDrawSculptedPawLimb(ctx, 56, 78, farFrontAng, 110, 46, cMid, cDark, outline, outline, {
    clawsColor: '#e8dec8',
  });

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  // Sinuous swimming tail propulsion undulation vs subtle land walking swing
  const tailSwing = isSwimming
    ? Math.sin(rState.locoTime * 4.2) * 36
    : Math.sin(pose.waveRaysPhase * 0.95) * 14 + pose.hindNearAngle * 24;
  const bodyAndTail = new Path2D();
  bodyAndTail.moveTo(-312, 102 + tailSwing);
  bodyAndTail.bezierCurveTo(-246, 36 + tailSwing * 0.4, -168, -6, -108, 10);
  bodyAndTail.bezierCurveTo(-72, -32, -10, -44, 28, -32);
  bodyAndTail.bezierCurveTo(56, -40, 76, -56, 92, -42);
  bodyAndTail.bezierCurveTo(110, -18, 102, 46, 68, 86);
  bodyAndTail.bezierCurveTo(22, 124, -68, 122, -108, 86);
  bodyAndTail.bezierCurveTo(-162, 94, -230, 118 + tailSwing * 0.4, -288, 134 + tailSwing);
  bodyAndTail.bezierCurveTo(-308, 138 + tailSwing, -324, 116 + tailSwing, -312, 102 + tailSwing);
  bodyAndTail.closePath();

  kitFillRimAndStroke(ctx, bodyAndTail, -310, -48, 102, 128, cLight, cMid, cDark, outline, 3.6);

  ctx.save();
  ctx.clip(bodyAndTail);

  // Dorsal double keel ridge along swimming tail
  ctx.strokeStyle = '#a3a899';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-116, 16);
  ctx.bezierCurveTo(-172, 2, -238, 42 + tailSwing * 0.4, -296, 98 + tailSwing);
  ctx.stroke();

  // Transverse yellow spot rows (Varanus salvator signature)
  for (let col = 0; col < 5; col++) {
    const bx = -70 + col * 28;
    for (let row = 0; row < 3; row++) {
      const by = 8 + row * 22;
      ctx.fillStyle = spotCol;
      ctx.beginPath();
      ctx.arc(bx + row * 4, by, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = bellyCol;
  drawOvalSpot(ctx, 56, 72, 42, 44, 0.12);
  ctx.restore();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(bodyAndTail);
  ctx.restore();

  // Near limbs: stream backward when swimming
  const hindNearAng = isSwimming
    ? -0.52 + Math.sin(rState.locoTime * 4.2 + 0.5) * 0.12
    : pose.hindNearAngle * 0.48;
  kitDrawSculptedPawLimb(ctx, -104, 88, hindNearAng, 106, 50, cLight, cMid, cDark, outline, {
    clawsColor: '#e8dec8',
  });
  const waveAmt = rState.waveAmt;
  const nearFrontAngle = isSwimming
    ? -0.44 + Math.cos(rState.locoTime * 4.2 + 0.5) * 0.1
    : pose.nearFlipperAngle * (0.4 + 0.2 * waveAmt) + 0.05 - 0.45 * waveAmt;
  kitDrawSculptedPawLimb(ctx, 16, 80, nearFrontAngle, 114, 50, cLight, cMid, cDark, outline, {
    clawsColor: '#e8dec8',
  });

  // Head with yellow jaw banding
  ctx.save();
  ctx.translate(68 + pose.headX, -28 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  const headP = new Path2D();
  headP.ellipse(4, -4, 86, 60, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -65, -60, 55, 60, cLight, cMid, cDark, outline, 3.6);

  // Yellow and dark banded throat
  ctx.fillStyle = spotCol;
  ctx.beginPath();
  ctx.moveTo(12 + lookX * 0.5, 34 + lookY * 0.5);
  ctx.quadraticCurveTo(46 + lookX * 0.6, 38 + lookY * 0.5, 78 + lookX * 0.7, 24 + lookY * 0.5);
  ctx.lineTo(84 + lookX * 0.7, 34 + lookY * 0.5);
  ctx.quadraticCurveTo(46 + lookX * 0.6, 54 + lookY * 0.5, 12 + lookX * 0.5, 48 + lookY * 0.5);
  ctx.closePath();
  ctx.fill();

  drawGlossyAnimalEye(ctx, 'left', -24 + lookX * 0.85, -8 + lookY * 0.85, 11, 13, -0.06, pose, IRIS_PALETTES.amber, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 46 + lookX * 0.85, -2 + lookY * 0.85, 9.5, 11.5, 0.1, pose, IRIS_PALETTES.amber, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -24 + lookX * 0.85, -28 + lookY * 0.85, 46 + lookX * 0.85, -20 + lookY * 0.85, 18, pose, outline, 3.2);

  // Characteristic yellow-and-black forked tongue
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(84 + lookX * 0.8, 14 + lookY * 0.8);
  ctx.lineTo(104 + lookX * 0.8, 14 + lookY * 0.8);
  ctx.lineTo(114 + lookX * 0.8, 8 + lookY * 0.8);
  ctx.moveTo(104 + lookX * 0.8, 14 + lookY * 0.8);
  ctx.lineTo(114 + lookX * 0.8, 20 + lookY * 0.8);
  ctx.stroke();

  ctx.restore();
};

/* ============================================================================
 * A23: SOUTHERN RIVER TERRAPIN (Batagur affinis)
 * ========================================================================== */
const drawSouthernRiverTerrapin: AnimalRig = (ctx, pose) => {
  const outline = '#1f241a';
  const cLight = '#78826d';
  const cMid = '#4b5543';
  const cDark = '#2c3325';
  const skinLight = '#a3ad98';

  const rState = getAnimalRenderState();
  const isSwimming = rState.swimming;
  const swimPhase = rState.locoTime * 3.8;
  const farFrontAngle = isSwimming
    ? Math.sin(swimPhase) * 0.55 - 0.25
    : pose.farFlipperAngle * 0.4;
  const nearFrontAngle = isSwimming
    ? Math.sin(swimPhase + 0.3) * 0.55 - 0.25
    : pose.nearFlipperAngle * 0.44;
  const farHindAngle = isSwimming
    ? Math.cos(swimPhase + Math.PI * 0.5) * 0.48 - 0.35
    : pose.hindFarAngle * 0.42;
  const nearHindAngle = isSwimming
    ? Math.cos(swimPhase + Math.PI * 0.5 + 0.3) * 0.48 - 0.35
    : pose.hindNearAngle * 0.44;

  // Limbs with webbed paddle digits (breaststroke sweep in water)
  kitDrawSculptedPawLimb(ctx, -70, 72, farHindAngle, 94, 46, skinLight, cMid, cDark, outline, { webbed: true });
  kitDrawSculptedPawLimb(ctx, 48, 68, farFrontAngle, 98, 46, skinLight, cMid, cDark, outline, { webbed: true });

  // Streamlined river carapace
  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const carapace = new Path2D();
  carapace.ellipse(-12, 34, 126, 82, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, carapace, -110, -40, 60, 110, cLight, cMid, cDark, outline, 3.6);

  // Scute sutures
  ctx.save();
  ctx.clip(carapace);
  ctx.strokeStyle = '#181d14';
  ctx.lineWidth = 2.2;
  for (let vx = -80; vx <= 60; vx += 36) {
    ctx.beginPath();
    ctx.moveTo(vx, -20);
    ctx.lineTo(vx + 6, 90);
    ctx.stroke();
  }
  ctx.restore();
  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(carapace);
  ctx.restore();

  // Near limbs
  kitDrawSculptedPawLimb(ctx, -96, 76, nearHindAngle, 98, 48, skinLight, cMid, cDark, outline, { webbed: true });
  kitDrawSculptedPawLimb(ctx, 22, 72, nearFrontAngle, 102, 48, skinLight, cMid, cDark, outline, { webbed: true });

  // Head with upturned Batagur snout
  ctx.save();
  ctx.translate(56 + pose.headX, -24 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  const headP = new Path2D();
  headP.ellipse(4, -2, 74, 54, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -55, -50, 45, 50, skinLight, cMid, cDark, outline, 3.4);

  drawGlossyAnimalEye(ctx, 'left', -20 + lookX * 0.8, -6 + lookY * 0.8, 12, 14, -0.05, pose, IRIS_PALETTES.warmBrown, skinLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 42 + lookX * 0.8, -1 + lookY * 0.8, 10, 12, 0.1, pose, IRIS_PALETTES.warmBrown, skinLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -20 + lookX * 0.8, -24 + lookY * 0.8, 42 + lookX * 0.8, -18 + lookY * 0.8, 18, pose, outline, 3.2);

  ctx.restore();
};

/* ============================================================================
 * A24: SOUTHEAST ASIAN BOX TURTLE (Cuora amboinensis)
 * High domed carapace, mid keel, bright yellow head stripes.
 * ========================================================================== */
const drawBoxTurtle: AnimalRig = (ctx, pose) => {
  const outline = '#1c150c';
  const cLight = '#4d3a24';
  const cMid = '#2e2011';
  const cDark = '#150d06';
  const yellowStripe = '#facc15';

  const rState = getAnimalRenderState();
  const isSwimming = rState.swimming;
  const swimPhase = rState.locoTime * 3.8;
  const farFrontAngle = isSwimming
    ? Math.sin(swimPhase) * 0.52 - 0.22
    : pose.farFlipperAngle * 0.4;
  const nearFrontAngle = isSwimming
    ? Math.sin(swimPhase + 0.3) * 0.52 - 0.22
    : pose.nearFlipperAngle * 0.44;
  const farHindAngle = isSwimming
    ? Math.cos(swimPhase + Math.PI * 0.5) * 0.45 - 0.3
    : pose.hindFarAngle * 0.42;
  const nearHindAngle = isSwimming
    ? Math.cos(swimPhase + Math.PI * 0.5 + 0.3) * 0.45 - 0.3
    : pose.hindNearAngle * 0.44;

  kitDrawSculptedPawLimb(ctx, -68, 76, farHindAngle, 92, 44, cLight, cMid, cDark, outline, { webbed: isSwimming });
  kitDrawSculptedPawLimb(ctx, 46, 72, farFrontAngle, 94, 44, cLight, cMid, cDark, outline, { webbed: isSwimming });

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  // High domed carapace
  const carapace = new Path2D();
  carapace.moveTo(-116, 68);
  carapace.bezierCurveTo(-118, -26, -56, -64, 0, -64);
  carapace.bezierCurveTo(64, -64, 116, -18, 112, 68);
  carapace.closePath();
  kitFillRimAndStroke(ctx, carapace, -100, -60, 60, 70, cLight, cMid, cDark, outline, 3.6);

  // Prominent central vertebral keel
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -62);
  ctx.lineTo(0, 64);
  ctx.stroke();

  ctx.restore();

  kitDrawSculptedPawLimb(ctx, -94, 78, nearHindAngle, 96, 46, cLight, cMid, cDark, outline, { webbed: isSwimming });
  kitDrawSculptedPawLimb(ctx, 24, 74, nearFrontAngle, 98, 46, cLight, cMid, cDark, outline, { webbed: isSwimming });

  // Head with vibrant Cuora yellow stripes
  ctx.save();
  ctx.translate(56 + pose.headX, -22 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  const headP = new Path2D();
  headP.ellipse(4, -2, 72, 52, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -55, -50, 45, 50, cMid, cDark, '#0a0603', outline, 3.4);

  // Diagnostic yellow lateral head stripes
  ctx.strokeStyle = yellowStripe;
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-36, -8);
  ctx.lineTo(48, -4);
  ctx.moveTo(-32, 10);
  ctx.lineTo(52, 14);
  ctx.stroke();

  drawGlossyAnimalEye(ctx, 'left', -18 + lookX * 0.8, -6 + lookY * 0.8, 12, 14, -0.05, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 40 + lookX * 0.8, -1 + lookY * 0.8, 10, 12, 0.1, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -18 + lookX * 0.8, -24 + lookY * 0.8, 40 + lookX * 0.8, -18 + lookY * 0.8, 18, pose, yellowStripe, 3.2);

  ctx.restore();
};

/* ============================================================================
 * A29: HAWKSBILL SEA TURTLE (Eretmochelys imbricata)
 * Sibling to frozen Green Sea Turtle (A28). Overlapping tortoiseshell scutes,
 * serrated rear margin, raptorial hawk beak, 2 claws per flipper.
 * ========================================================================== */
const drawHawksbillSeaTurtle: AnimalRig = (ctx, pose) => {
  const outline = '#2b1908';
  const amberLight = '#f5b041';
  const amberMid = '#b9770e';
  const mahoganyDark = '#4a2800';

  // Serrated carapace with overlapping tortoiseshell scutes
  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const carapace = new Path2D();
  carapace.moveTo(96, 26);
  carapace.quadraticCurveTo(72, -48, -20, -56);
  carapace.quadraticCurveTo(-112, -48, -128, 22);
  // Serrated (dentated) rear margin
  for (let s = 0; s < 6; s++) {
    const t1 = (s + 0.5) / 6;
    const t2 = (s + 1) / 6;
    const pxMid = -128 + t1 * 64 - 8;
    const pyMid = 22 + t1 * 48 + 6;
    const px2 = -128 + t2 * 64;
    const py2 = 22 + t2 * 48;
    carapace.lineTo(pxMid, pyMid);
    carapace.lineTo(px2, py2);
  }
  carapace.quadraticCurveTo(32, 94, 96, 26);
  carapace.closePath();

  kitFillRimAndStroke(ctx, carapace, -110, -50, 70, 80, amberLight, amberMid, mahoganyDark, outline, 3.6);

  // Tortoiseshell radiating streaks
  ctx.save();
  ctx.clip(carapace);
  for (let sc = 0; sc < 5; sc++) {
    const sx = -70 + sc * 36;
    const sy = 12;
    for (let ray = 0; ray < 6; ray++) {
      const a = (ray / 6) * Math.PI * 2;
      ctx.strokeStyle = ray % 2 === 0 ? '#fde047' : mahoganyDark;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a) * 26, sy + Math.sin(a) * 26);
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(carapace);
  ctx.restore();

  // Large flippers with 2 claws
  const drawFlipper = (fx: number, fy: number, ang: number) => {
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(ang);
    const flipperP = new Path2D();
    flipperP.moveTo(0, 0);
    flipperP.quadraticCurveTo(62, -18, 128, 14);
    flipperP.quadraticCurveTo(84, 46, 0, 16);
    flipperP.closePath();
    kitFillRimAndStroke(ctx, flipperP, 0, -18, 120, 46, amberLight, amberMid, mahoganyDark, outline, 3.4);

    // 2 anterior claws
    ctx.fillStyle = '#fffbeb';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    for (const cx of [42, 64]) {
      ctx.beginPath();
      ctx.moveTo(cx, -10);
      ctx.lineTo(cx + 4, -16);
      ctx.lineTo(cx + 8, -9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };

  drawFlipper(-52, 74, pose.hindNearAngle * 0.45 + 0.2);
  drawFlipper(38, 70, pose.nearFlipperAngle * 0.5 + 0.1);

  // Head with sharp raptorial hooked hawk-like beak
  ctx.save();
  ctx.translate(62 + pose.headX, -26 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  const headP = new Path2D();
  headP.moveTo(-42, -34);
  headP.bezierCurveTo(0, -48, 54, -36, 88 + lookX * 0.5, 6 + lookY * 0.5);
  // Downward hooked hawk beak
  headP.bezierCurveTo(96 + lookX * 0.5, 14 + lookY * 0.5, 94 + lookX * 0.5, 28 + lookY * 0.5, 76 + lookX * 0.5, 30 + lookY * 0.5);
  headP.bezierCurveTo(34, 42, -12, 40, -48, 18);
  headP.closePath();

  kitFillRimAndStroke(ctx, headP, -45, -45, 75, 40, amberLight, amberMid, mahoganyDark, outline, 3.5);

  drawGlossyAnimalEye(ctx, 'left', -8 + lookX * 0.8, -8 + lookY * 0.8, 12, 14, -0.05, pose, IRIS_PALETTES.amber, amberLight, amberMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 46 + lookX * 0.8, -2 + lookY * 0.8, 10, 12, 0.1, pose, IRIS_PALETTES.amber, amberLight, amberMid, outline);
  drawExpressiveAnimalBrows(ctx, -8 + lookX * 0.8, -26 + lookY * 0.8, 46 + lookX * 0.8, -20 + lookY * 0.8, 18, pose, outline, 3.2);

  ctx.restore();
};

export const REPTILES_ARMOURED_RIGS: Record<string, AnimalRig> = {
  animal_06_sunda_pangolin: drawSundaPangolin,
  animal_16_reticulated_python: drawReticulatedPython,
  animal_17_clouded_monitor_lizard: drawCloudedMonitor,
  animal_25_asian_water_monitor: drawAsianWaterMonitor,
  animal_23_southern_river_terrapin: drawSouthernRiverTerrapin,
  animal_24_southeast_asian_box_turtle: drawBoxTurtle,
  animal_29_hawksbill_sea_turtle: drawHawksbillSeaTurtle,
};
