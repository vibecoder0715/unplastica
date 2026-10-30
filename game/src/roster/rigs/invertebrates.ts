import type { AnimalRig } from './types';
import {
  kitFillRimAndStroke,
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
 * A20: GIANT FRESHWATER PRAWN (Macrobrachium rosenbergii / Udang Galah)
 * Segmented cephalothorax, serrated rostrum, 6 abdominal segments with pleura,
 * long cobalt second chelipeds with spiny nodules, 4 pairs of walking legs,
 * flexible tail fan (telson + uropods), long sweeping antennae.
 * ========================================================================== */
const drawGiantFreshwaterPrawn: AnimalRig = (ctx, pose) => {
  const outline = '#0f172a';
  const cLight = '#67e8f9';
  const cMid = '#06b6d4';
  const cDark = '#0e7490';
  const shellLight = '#fef08a';
  const shellMid = '#eab308';
  const shellDark = '#a16207';
  const clawCol1 = '#38bdf8';
  const clawCol2 = '#0284c7';
  const clawCol3 = '#0369a1';

  const rState = getAnimalRenderState();
  const walkPhase = rState.locoTime * 4.2;
  const legSway = Math.sin(walkPhase) * 0.35 * rState.activity;

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY + 10);
  ctx.rotate(pose.shellRot);

  const lookX = pose.headLookX * 10;
  const lookY = pose.headLookY * 8;
  const tailCurl = Math.sin(pose.waveRaysPhase * 0.9) * 0.12 + pose.hindNearAngle * 0.2;
  const waveAmt = Math.max(0, Math.min(1, 1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount));

  // --- 1. Long sensory antennae (sweeping backwards and forwards) ---
  ctx.save();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  // Long antenna 1
  ctx.beginPath();
  ctx.moveTo(85, -28);
  ctx.bezierCurveTo(140, -90, 80, -160, -40, -150);
  ctx.bezierCurveTo(-140, -140, -220, -90, -240, -50);
  ctx.stroke();
  // Long antenna 2
  ctx.beginPath();
  ctx.moveTo(85, -20);
  ctx.bezierCurveTo(150, -60, 210, -40, 260, -20);
  ctx.stroke();
  // Antennules
  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(92, -35);
  ctx.lineTo(135, -75);
  ctx.moveTo(92, -32);
  ctx.lineTo(145, -55);
  ctx.stroke();
  ctx.restore();

  // --- 2. Walking legs (4 pairs of jointed pereiopods) ---
  const drawWalkingLeg = (lx: number, ly: number, angleOffset: number, length: number) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angleOffset);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, length * 0.45);
    ctx.lineTo(6, length * 0.9);
    ctx.lineTo(14, length);
    ctx.stroke();
    ctx.restore();
  };

  // Back legs
  for (let i = 0; i < 4; i++) {
    const lx = 32 - i * 22;
    const ly = 32;
    const phase = walkPhase + i * 0.8;
    const ang = 0.2 + Math.sin(phase) * 0.28 * rState.activity;
    drawWalkingLeg(lx, ly, ang, 42);
  }

  // --- 3. Abdomen (6 segmented tergites with overlapping pleural plates) & Tail Fan ---
  ctx.save();
  ctx.translate(-30, 10);
  ctx.rotate(tailCurl);

  // Tail Fan (telson and paired uropods) at distal tip
  ctx.save();
  ctx.translate(-140, 20);
  ctx.rotate(-tailCurl * 0.5);
  // Outer uropod left
  const uropodL = new Path2D();
  uropodL.moveTo(0, 0);
  uropodL.quadraticCurveTo(-45, -24, -68, -12);
  uropodL.quadraticCurveTo(-50, 4, 0, 0);
  kitFillRimAndStroke(ctx, uropodL, -70, -26, 0, 10, cLight, cMid, cDark, outline, 2.2);
  // Outer uropod right
  const uropodR = new Path2D();
  uropodR.moveTo(0, 0);
  uropodR.quadraticCurveTo(-45, 24, -68, 12);
  uropodR.quadraticCurveTo(-50, -4, 0, 0);
  kitFillRimAndStroke(ctx, uropodR, -70, -10, 0, 26, cLight, cMid, cDark, outline, 2.2);
  // Central pointed telson
  const telsonP = new Path2D();
  telsonP.moveTo(0, -6);
  telsonP.lineTo(-76, 0);
  telsonP.lineTo(0, 6);
  telsonP.closePath();
  kitFillRimAndStroke(ctx, telsonP, -76, -8, 0, 8, shellLight, shellMid, shellDark, outline, 2.4);
  ctx.restore();

  // 6 Abdominal segments (from posterior 6th to anterior 1st)
  for (let seg = 6; seg >= 1; seg--) {
    const sx = -seg * 22;
    const sy = Math.sin(seg * 0.45) * 8;
    const w = 26 + (7 - seg) * 3;
    const h = 34 + (7 - seg) * 3.5;

    const segP = new Path2D();
    segP.ellipse(sx, sy, w * 0.55, h * 0.5, 0.08 * (4 - seg), 0, Math.PI * 2);
    const useAmber = seg % 2 === 0;
    kitFillRimAndStroke(
      ctx,
      segP,
      sx - w * 0.6,
      sy - h * 0.6,
      sx + w * 0.6,
      sy + h * 0.6,
      useAmber ? shellLight : cLight,
      useAmber ? shellMid : cMid,
      useAmber ? shellDark : cDark,
      outline,
      2.6,
    );
    // Pleural suture ring
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.6;
    ctx.stroke(segP);
  }
  ctx.restore();

  // --- 4. Main Cephalothorax Carapace ---
  const carP = new Path2D();
  carP.moveTo(85, -22); // Base of rostrum
  carP.bezierCurveTo(92, 10, 75, 42, 35, 46);
  carP.bezierCurveTo(-5, 48, -42, 42, -50, 10);
  carP.bezierCurveTo(-54, -26, -15, -45, 32, -44);
  carP.bezierCurveTo(62, -44, 78, -36, 85, -22);
  carP.closePath();
  kitFillRimAndStroke(ctx, carP, -54, -45, 92, 48, cLight, cMid, cDark, outline, 3.4);

  // Serrated prominent rostrum extending forward-upward
  const rostP = new Path2D();
  rostP.moveTo(76, -34);
  rostP.quadraticCurveTo(120, -56, 155, -72);
  rostP.lineTo(152, -66);
  // Rostral teeth / serrations along dorsal margin
  rostP.lineTo(138, -56);
  rostP.lineTo(142, -50);
  rostP.lineTo(125, -42);
  rostP.lineTo(128, -36);
  rostP.lineTo(105, -30);
  rostP.lineTo(82, -22);
  rostP.closePath();
  kitFillRimAndStroke(ctx, rostP, 76, -72, 155, -22, cLight, cMid, cDark, outline, 2.6);

  // Cute expressive face & glossy stalked eyes
  const eyeX = 64 + lookX * 0.8;
  const eyeY = -34 + lookY * 0.7;
  // Ocular stalk
  ctx.fillStyle = cMid;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(eyeX - 4, eyeY + 6, 6, 10, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  drawSoftCheekBlushes(ctx, eyeX - 16, eyeY + 28, eyeX + 16, eyeY + 28, 14, 8, pose.blushAlpha);
  drawGlossyAnimalEye(ctx, 'right', eyeX, eyeY, 15, 17, 0.08, pose, IRIS_PALETTES.emerald, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, eyeX - 10, eyeY - 14, eyeX + 10, eyeY - 14, 12, pose, outline);
  drawExpressiveAnimalMouth(ctx, eyeX + 10, eyeY + 32, 0.75, 0.05, pose, outline);

  // --- 5. Massive Segmented Cobalt Second Chelipeds (Pincer Arms) ---
  const drawCheliped = (isNear: boolean) => {
    ctx.save();
    const rootX = isNear ? 45 : 30;
    const rootY = isNear ? 28 : 22;
    ctx.translate(rootX, rootY);

    const waveRot = isNear ? -0.3 + waveAmt * 1.85 : 0.2 + legSway * 0.2;
    ctx.rotate(waveRot);

    // Segment 1 (merus)
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3.2;
    const seg1 = new Path2D();
    seg1.moveTo(-8, -4);
    seg1.lineTo(8, -4);
    seg1.lineTo(12, 58);
    seg1.lineTo(-12, 58);
    seg1.closePath();
    kitFillRimAndStroke(ctx, seg1, -12, -4, 12, 58, clawCol1, clawCol2, clawCol3, outline, 2.8);

    // Segment 2 (carpus)
    ctx.translate(0, 56);
    ctx.rotate(-0.45 + waveAmt * 0.35);
    const seg2 = new Path2D();
    seg2.moveTo(-10, 0);
    seg2.lineTo(10, 0);
    seg2.lineTo(14, 68);
    seg2.lineTo(-14, 68);
    seg2.closePath();
    kitFillRimAndStroke(ctx, seg2, -14, 0, 14, 68, clawCol1, clawCol2, clawCol3, outline, 2.8);

    // Spiny tubercles on joints
    ctx.fillStyle = '#fef08a';
    for (const sy of [16, 36, 52]) {
      drawOvalSpot(ctx, -10, sy, 3, 2, -0.4);
      drawOvalSpot(ctx, 10, sy, 3, 2, 0.4);
    }

    // Propodus palm and dactylus pincers
    ctx.translate(0, 66);
    ctx.rotate(0.35);

    // Fixed finger (propodus)
    const palmP = new Path2D();
    palmP.moveTo(-14, 0);
    palmP.quadraticCurveTo(-18, 40, -12, 75);
    palmP.lineTo(-2, 75);
    palmP.quadraticCurveTo(8, 35, 12, 0);
    palmP.closePath();
    kitFillRimAndStroke(ctx, palmP, -18, 0, 12, 75, clawCol1, clawCol2, clawCol3, outline, 2.8);

    // Pincer claw tips (chela)
    const pincerL = new Path2D();
    pincerL.moveTo(-12, 72);
    pincerL.quadraticCurveTo(-16, 110, -6, 130);
    pincerL.quadraticCurveTo(-2, 108, -3, 75);
    pincerL.closePath();
    kitFillRimAndStroke(ctx, pincerL, -16, 72, -2, 130, '#bae6fd', '#38bdf8', '#0284c7', outline, 2.2);

    const pincerR = new Path2D();
    pincerR.moveTo(-2, 75);
    pincerR.quadraticCurveTo(8, 108, 6, 126);
    pincerR.quadraticCurveTo(1, 105, 3, 72);
    pincerR.closePath();
    kitFillRimAndStroke(ctx, pincerR, -2, 72, 8, 126, '#bae6fd', '#38bdf8', '#0284c7', outline, 2.2);

    ctx.restore();
  };

  // Far cheliped
  drawCheliped(false);
  // Near cheliped (waving with waveAmt)
  drawCheliped(true);

  ctx.restore();
};

/* ============================================================================
 * A38: HARLEQUIN SHRIMP (Hymenocera picta)
 * Distinct paddle-shaped leaf claws, broad petal-like antennular plates,
 * cream/ivory body with vibrant magenta/purple-ringed spots, arched abdomen.
 * ========================================================================== */
const drawHarlequinShrimp: AnimalRig = (ctx, pose) => {
  const outline = '#2e102f';
  const cLight = '#ffffff';
  const cMid = '#fdf4ff';
  const cDark = '#fae8ff';
  const spotRing = '#c026d3'; // Bright magenta ring
  const spotCenter = '#e879f9'; // Soft lilac center
  const spotCore = '#701a75';

  const rState = getAnimalRenderState();
  const walkPhase = rState.locoTime * 4.0;
  const legSway = Math.sin(walkPhase) * 0.28 * rState.activity;

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY + 15);
  ctx.rotate(pose.shellRot);

  const lookX = pose.headLookX * 10;
  const lookY = pose.headLookY * 8;
  const waveAmt = Math.max(0, Math.min(1, 1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount));

  // --- 1. Distinct Flattened Petal-like Antennular Plates on Head ---
  ctx.save();
  ctx.translate(55, -26);
  // Upper petal plate
  ctx.save();
  ctx.rotate(-0.35 + Math.sin(pose.waveRaysPhase * 0.8) * 0.08);
  const petal1 = new Path2D();
  petal1.moveTo(0, 0);
  petal1.quadraticCurveTo(35, -42, 65, -30);
  petal1.quadraticCurveTo(72, -10, 48, 8);
  petal1.quadraticCurveTo(24, 12, 0, 0);
  petal1.closePath();
  kitFillRimAndStroke(ctx, petal1, 0, -42, 72, 12, '#ffffff', '#fae8ff', '#f0abfc', outline, 2.4);
  // Purple blotch on petal
  ctx.fillStyle = spotRing;
  drawOvalSpot(ctx, 42, -18, 9, 6, 0.4);
  ctx.fillStyle = spotCenter;
  drawOvalSpot(ctx, 42, -18, 5, 3.5, 0.4);
  ctx.restore();

  // Lower petal plate
  ctx.save();
  ctx.rotate(0.25);
  const petal2 = new Path2D();
  petal2.moveTo(0, 0);
  petal2.quadraticCurveTo(32, -20, 56, -10);
  petal2.quadraticCurveTo(62, 10, 40, 22);
  petal2.quadraticCurveTo(18, 16, 0, 0);
  petal2.closePath();
  kitFillRimAndStroke(ctx, petal2, 0, -20, 62, 22, '#ffffff', '#fae8ff', '#f0abfc', outline, 2.2);
  ctx.fillStyle = spotRing;
  drawOvalSpot(ctx, 36, 4, 7, 5, 0.2);
  ctx.restore();
  ctx.restore();

  // --- 2. Walking Legs (dainty banded legs) ---
  for (let i = 0; i < 4; i++) {
    const lx = 20 - i * 18;
    const ly = 32;
    const ang = 0.25 + Math.sin(walkPhase + i * 0.7) * 0.3 * rState.activity;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(ang);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-6, 26);
    ctx.lineTo(8, 48);
    ctx.stroke();
    // Purple band
    ctx.strokeStyle = spotRing;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-3, 14);
    ctx.lineTo(4, 20);
    ctx.stroke();
    ctx.restore();
  }

  // --- 3. Arched Abdomen with Flared Leaf-like Pleura Plates ---
  ctx.save();
  ctx.translate(-26, 6);
  for (let seg = 5; seg >= 1; seg--) {
    const sx = -seg * 20;
    const sy = Math.sin(seg * 0.6) * 14 - 4;
    const w = 24 + (6 - seg) * 3;
    const h = 34 + (6 - seg) * 4;

    const pleuraP = new Path2D();
    // Flared leaf-like scalloped pleura
    pleuraP.moveTo(sx - w * 0.5, sy - h * 0.4);
    pleuraP.quadraticCurveTo(sx, sy - h * 0.55, sx + w * 0.5, sy - h * 0.4);
    pleuraP.quadraticCurveTo(sx + w * 0.65, sy + h * 0.2, sx + w * 0.4, sy + h * 0.55);
    pleuraP.quadraticCurveTo(sx, sy + h * 0.6, sx - w * 0.4, sy + h * 0.55);
    pleuraP.quadraticCurveTo(sx - w * 0.65, sy + h * 0.2, sx - w * 0.5, sy - h * 0.4);
    pleuraP.closePath();
    kitFillRimAndStroke(ctx, pleuraP, sx - w * 0.65, sy - h * 0.55, sx + w * 0.65, sy + h * 0.6, cLight, cMid, cDark, outline, 2.4);

    // Signature Harlequin Magenta Rosette Spot on each segment
    ctx.fillStyle = spotRing;
    drawOvalSpot(ctx, sx, sy + 4, 8, 7, 0);
    ctx.fillStyle = spotCenter;
    drawOvalSpot(ctx, sx, sy + 4, 4.5, 4, 0);
    ctx.fillStyle = spotCore;
    drawOvalSpot(ctx, sx, sy + 4, 2, 1.8, 0);
  }

  // Tail fan (uropods)
  ctx.translate(-118, 12);
  const fanP = new Path2D();
  fanP.moveTo(0, 0);
  fanP.quadraticCurveTo(-38, -22, -54, -8);
  fanP.quadraticCurveTo(-42, 12, 0, 0);
  fanP.closePath();
  kitFillRimAndStroke(ctx, fanP, -54, -22, 0, 12, cLight, cMid, cDark, outline, 2.0);
  ctx.restore();

  // --- 4. Cephalothorax Carapace ---
  const carP = new Path2D();
  carP.moveTo(68, -18);
  carP.bezierCurveTo(74, 14, 58, 42, 24, 44);
  carP.bezierCurveTo(-14, 46, -42, 38, -48, 8);
  carP.bezierCurveTo(-50, -22, -18, -38, 22, -38);
  carP.bezierCurveTo(48, -38, 62, -28, 68, -18);
  carP.closePath();
  kitFillRimAndStroke(ctx, carP, -50, -38, 74, 46, cLight, cMid, cDark, outline, 3.2);

  // Large Harlequin Spots on Carapace
  ctx.fillStyle = spotRing;
  drawOvalSpot(ctx, 12, -12, 12, 10, 0.2);
  ctx.fillStyle = spotCenter;
  drawOvalSpot(ctx, 12, -12, 7, 6, 0.2);
  ctx.fillStyle = spotCore;
  drawOvalSpot(ctx, 12, -12, 3, 2.5, 0.2);

  ctx.fillStyle = spotRing;
  drawOvalSpot(ctx, -18, 10, 10, 8, -0.3);
  ctx.fillStyle = spotCenter;
  drawOvalSpot(ctx, -18, 10, 6, 5, -0.3);

  // Cute face on stalked eyes
  const eyeX = 48 + lookX * 0.8;
  const eyeY = -28 + lookY * 0.7;
  ctx.fillStyle = cMid;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(eyeX - 3, eyeY + 6, 5, 8, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  drawSoftCheekBlushes(ctx, eyeX - 14, eyeY + 24, eyeX + 14, eyeY + 24, 12, 7, pose.blushAlpha);
  drawGlossyAnimalEye(ctx, 'right', eyeX, eyeY, 14, 16, 0.06, pose, IRIS_PALETTES.violet, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, eyeX - 8, eyeY - 13, eyeX + 8, eyeY - 13, 10, pose, outline);
  drawExpressiveAnimalMouth(ctx, eyeX + 8, eyeY + 28, 0.72, 0.05, pose, outline);

  // --- 5. Signature Flat Paddle-like Chelipeds (Leaf Claws) ---
  const drawPaddleClaw = (isNear: boolean) => {
    ctx.save();
    const rootX = isNear ? 38 : 18;
    const rootY = isNear ? 26 : 18;
    ctx.translate(rootX, rootY);

    const waveRot = isNear ? -0.4 + waveAmt * 1.75 : 0.2 + legSway * 0.2;
    ctx.rotate(waveRot);

    // Stalk arm
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(8, 38);
    ctx.stroke();

    // Huge flat leaf-like / paddle-like chela
    ctx.translate(8, 38);
    ctx.rotate(-0.25 + waveAmt * 0.2);

    const paddleP = new Path2D();
    // Scalloped paddle shape
    paddleP.moveTo(-12, 0);
    paddleP.bezierCurveTo(-38, 28, -48, 72, -28, 105);
    paddleP.bezierCurveTo(-14, 124, 18, 124, 32, 102);
    paddleP.bezierCurveTo(44, 72, 36, 26, 12, 0);
    paddleP.closePath();
    kitFillRimAndStroke(ctx, paddleP, -48, 0, 44, 124, '#ffffff', '#fae8ff', '#f5d0fe', outline, 2.8);

    // Big central purple target rosette on paddle claw
    ctx.fillStyle = spotRing;
    drawOvalSpot(ctx, 0, 62, 16, 14, 0);
    ctx.fillStyle = spotCenter;
    drawOvalSpot(ctx, 0, 62, 10, 8.5, 0);
    ctx.fillStyle = spotCore;
    drawOvalSpot(ctx, 0, 62, 4.5, 4, 0);

    // Edge spots on paddle rim
    ctx.fillStyle = spotRing;
    drawOvalSpot(ctx, -24, 46, 7, 5, 0.5);
    drawOvalSpot(ctx, 22, 52, 6, 5, -0.4);
    drawOvalSpot(ctx, 2, 104, 8, 6, 0);

    // Small pincer tip at distal apex
    ctx.strokeStyle = spotCore;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-6, 110);
    ctx.lineTo(0, 122);
    ctx.lineTo(6, 110);
    ctx.stroke();

    ctx.restore();
  };

  drawPaddleClaw(false);
  drawPaddleClaw(true);

  ctx.restore();
};

/* ============================================================================
 * A37: COCONUT OCTOPUS (Amphioctopus marginatus)
 * 8 articulated curled arms with double rows of luminous pale suckers,
 * golden-brown skin with papillae, horizontal rectangular cephalopod pupil,
 * cozy huddled posture with optional coconut shell half.
 * ========================================================================== */
const drawCoconutOctopus: AnimalRig = (ctx, pose) => {
  const outline = '#291208';
  const cLight = '#f59e0b';
  const cMid = '#d97706';
  const cDark = '#92400e';
  const darkEdge = '#451a03';
  const suckerCol = '#fef3c7';

  ctx.save();
  ctx.translate(pose.headX + 4, pose.headY - 14);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);

  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;
  const waveAmt = Math.max(0, Math.min(1, 1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount));

  // --- Coconut Shell Half (Resting underneath or carried) ---
  const shellP = new Path2D();
  shellP.moveTo(-82, 44);
  shellP.quadraticCurveTo(0, 118, 86, 44);
  shellP.quadraticCurveTo(0, 62, -82, 44);
  shellP.closePath();
  kitFillRimAndStroke(ctx, shellP, -82, 44, 86, 118, '#78350f', '#522509', '#3b1805', outline, 3.2);

  // Shell fibrous ridges
  ctx.strokeStyle = 'rgba(254, 215, 170, 0.22)';
  ctx.lineWidth = 2.0;
  for (const sx of [-54, -26, 0, 28, 56]) {
    ctx.beginPath();
    ctx.moveTo(sx * 0.7, 52);
    ctx.quadraticCurveTo(sx * 0.9, 82, sx, 102);
    ctx.stroke();
  }

  // --- 8 Articulated Curled Arms with Sucker Rows ---
  // Specs: angle, curl direction, wave sensitivity
  const ARM_DATA = [
    { bx: -72, by: 32, baseAng: 0.82, curl: -1, len: 1.05, isWave: true },
    { bx: -46, by: 42, baseAng: 0.44, curl: -1, len: 0.98, isWave: false },
    { bx: -20, by: 48, baseAng: 0.12, curl: -1, len: 0.92, isWave: false },
    { bx: 8, by: 48, baseAng: -0.12, curl: 1, len: 0.92, isWave: false },
    { bx: 34, by: 44, baseAng: -0.38, curl: 1, len: 0.96, isWave: false },
    { bx: 62, by: 34, baseAng: -0.74, curl: 1, len: 1.02, isWave: false },
    // Back arms
    { bx: -86, by: 22, baseAng: 1.15, curl: -1, len: 1.12, isWave: true },
    { bx: 76, by: 24, baseAng: -1.12, curl: 1, len: 1.1, isWave: false },
  ];

  const drawOctopusArm = (arm: typeof ARM_DATA[0], idx: number) => {
    ctx.save();
    ctx.translate(arm.bx, arm.by);

    const sway = Math.sin(pose.waveRaysPhase * 1.1 + idx * 0.8) * 0.14 * arm.curl;
    const waveLift = arm.isWave ? waveAmt * 1.6 : 0;
    ctx.rotate(arm.baseAng + sway + waveLift);
    ctx.scale(arm.curl * arm.len, arm.len);

    // Curled arm path
    const armP = new Path2D();
    armP.moveTo(-16, -12);
    armP.quadraticCurveTo(0, -22, 16, -12);
    armP.bezierCurveTo(20, 25, 24, 65, 38, 85);
    armP.bezierCurveTo(55, 102, 56, 126, 32, 126);
    armP.bezierCurveTo(4, 126, -10, 95, -12, 60);
    armP.bezierCurveTo(-14, 25, -16, 0, -16, -12);
    armP.closePath();

    kitFillRimAndStroke(ctx, armP, -16, -22, 56, 126, cLight, cMid, cDark, outline, 2.6);

    // Double row of light suckers along the inner arm curve
    ctx.fillStyle = suckerCol;
    ctx.strokeStyle = darkEdge;
    ctx.lineWidth = 1.4;
    for (let s = 1; s <= 5; s++) {
      const sy = 18 + s * 18;
      const sx = 6 + s * 4.2;
      const sr = 4.2 - s * 0.45;
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr, sr * 0.75, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(sx - 7, sy - 4, sr * 0.85, sr * 0.65, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  };

  // Draw back arms
  drawOctopusArm(ARM_DATA[6], 6);
  drawOctopusArm(ARM_DATA[7], 7);

  // --- Mantle Body (Globular dome) ---
  const mantleP = new Path2D();
  mantleP.moveTo(-78, 28);
  mantleP.bezierCurveTo(-94, -30, -78, -96, 0, -102);
  mantleP.bezierCurveTo(78, -96, 94, -30, 78, 28);
  mantleP.quadraticCurveTo(0, 48, -78, 28);
  mantleP.closePath();
  kitFillRimAndStroke(ctx, mantleP, -94, -102, 94, 48, cLight, cMid, cDark, outline, 3.8);

  // Skin papillae & dark margins
  ctx.fillStyle = darkEdge;
  for (const [px, py, pr] of [
    [-42, -54, 4],
    [-22, -76, 5],
    [18, -78, 4.5],
    [46, -56, 5],
    [0, -42, 6],
    [-52, -22, 4],
    [50, -20, 4.5],
  ] as const) {
    drawOvalSpot(ctx, px, py, pr, pr * 0.7, 0.2);
  }

  // Draw front arms
  for (let i = 0; i < 6; i++) {
    drawOctopusArm(ARM_DATA[i], i);
  }

  // Eyes with Horizontal Rectangular Cephalopod Pupil
  const eyeL = -38 + lookX * 0.8;
  const eyeR = 38 + lookX * 0.8;
  const eyeY = 2 + lookY * 0.7;

  drawSoftCheekBlushes(ctx, eyeL - 14, eyeY + 22, eyeR + 14, eyeY + 22, 16, 9, pose.blushAlpha);

  // Cephalopod eye helper
  const drawOctoEye = (ex: number) => {
    ctx.save();
    ctx.translate(ex, eyeY);

    // Eye bulb socket
    ctx.fillStyle = cMid;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Iris (golden amber)
    const irisGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 15);
    irisGrad.addColorStop(0, '#fef08a');
    irisGrad.addColorStop(0.6, '#eab308');
    irisGrad.addColorStop(1, '#854d0e');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // Horizontal Rectangular Cephalopod Pupil!
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-9, -3.2, 18, 6.4, 2.5);
    ctx.fill();

    // Specular highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(-4, -5, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.arc(4, 3, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  drawOctoEye(eyeL);
  drawOctoEye(eyeR);

  drawExpressiveAnimalBrows(ctx, eyeL, eyeY - 16, eyeR, eyeY - 16, 18, pose, outline);
  drawExpressiveAnimalMouth(ctx, lookX, eyeY + 24, 0.82, 0.04, pose, outline);

  ctx.restore();
};

/* ============================================================================
 * A39: BROADCLUB CUTTLEFISH (Sepia latimanus)
 * Distinct elongated mantle with continuous undulating lateral fin skirt,
 * 8 compact forward arms + 2 feeding tentacles, W-shaped cephalopod pupil,
 * zebra transverse camouflage bands with chromatic sheen.
 * ========================================================================== */
const drawCuttlefish: AnimalRig = (ctx, pose) => {
  const outline = '#26142e';
  const cLight = '#fde68a';
  const cMid = '#d97706';
  const cDark = '#78350f';
  const finLight = 'rgba(254, 240, 138, 0.75)';
  const finDark = 'rgba(180, 83, 9, 0.85)';
  const zebraStripe = '#451a03';

  ctx.save();
  ctx.translate(pose.headX + 2, pose.headY + 6);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX * 1.35, pose.headScaleY * 1.35);

  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;
  const waveAmt = Math.max(0, Math.min(1, 1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount));
  const swimPhase = pose.waveRaysPhase * 1.5;

  // --- 1. Continuous Undulating Lateral Fin Skirt (Left and Right) ---
  const drawFinSkirt = (side: -1 | 1) => {
    ctx.save();
    ctx.scale(side, 1);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.0;

    const finP = new Path2D();
    finP.moveTo(48, 20);
    // Undulating ripples along the margin
    for (let step = 0; step <= 8; step++) {
      const frac = step / 8;
      const my = 20 - frac * 120;
      const mx = 52 + Math.sin(swimPhase + frac * Math.PI * 3.5) * 12 + frac * 8;
      finP.lineTo(mx, my);
    }
    finP.lineTo(12, -108);
    finP.lineTo(44, -10);
    finP.closePath();

    const finGrad = ctx.createLinearGradient(40, 0, 75, 0);
    finGrad.addColorStop(0, finLight);
    finGrad.addColorStop(1, finDark);
    ctx.fillStyle = finGrad;
    ctx.fill(finP);
    ctx.stroke(finP);
    ctx.restore();
  };

  drawFinSkirt(-1);
  drawFinSkirt(1);

  // --- 2. Main Cuttlebone Mantle (Elongated Shield) ---
  const mantleP = new Path2D();
  mantleP.moveTo(0, -118);
  mantleP.bezierCurveTo(58, -108, 62, -20, 52, 28);
  mantleP.quadraticCurveTo(0, 42, -52, 28);
  mantleP.bezierCurveTo(-62, -20, -58, -108, 0, -118);
  mantleP.closePath();
  kitFillRimAndStroke(ctx, mantleP, -62, -118, 62, 42, cLight, cMid, cDark, outline, 3.6);

  // Zebra Camouflage Transverse Bars on Mantle
  ctx.save();
  ctx.clip(mantleP);
  ctx.strokeStyle = zebraStripe;
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  for (let b = 0; b < 7; b++) {
    const by = -95 + b * 16;
    const ripple = Math.sin(pose.waveRaysPhase * 0.8 + b) * 3;
    ctx.beginPath();
    ctx.moveTo(-42, by + ripple);
    ctx.quadraticCurveTo(-14, by - 6 + ripple, 0, by + ripple);
    ctx.quadraticCurveTo(14, by + 6 + ripple, 42, by + ripple);
    ctx.stroke();
  }
  ctx.restore();

  // --- 3. Compact Forward Arms (8 arms) & 2 Tentacles ---
  ctx.save();
  ctx.translate(0, 32);
  for (let a = -3; a <= 4; a++) {
    const ax = a * 12;
    const isWaving = a <= -2 && waveAmt > 0.05;
    const rot = (a * 0.12) + (isWaving ? -waveAmt * 0.85 : Math.sin(swimPhase + a * 0.6) * 0.12);

    ctx.save();
    ctx.translate(ax, 0);
    ctx.rotate(rot);

    const armP = new Path2D();
    armP.moveTo(-6, 0);
    armP.lineTo(-4, 38);
    armP.lineTo(0, 48);
    armP.lineTo(4, 38);
    armP.lineTo(6, 0);
    armP.closePath();
    kitFillRimAndStroke(ctx, armP, -6, 0, 6, 48, cLight, cMid, cDark, outline, 2.2);

    // Suckers on arm tips
    ctx.fillStyle = '#fef3c7';
    drawOvalSpot(ctx, 0, 26, 2.5, 2, 0);
    drawOvalSpot(ctx, 0, 36, 2, 1.6, 0);

    ctx.restore();
  }
  ctx.restore();

  // --- 4. Eyes with Famous W-Shaped Cuttlefish Pupil! ---
  const eyeL = -28 + lookX * 0.8;
  const eyeR = 28 + lookX * 0.8;
  const eyeY = 12 + lookY * 0.7;

  drawSoftCheekBlushes(ctx, eyeL - 12, eyeY + 18, eyeR + 12, eyeY + 18, 14, 8, pose.blushAlpha);

  const drawCuttleEye = (ex: number) => {
    ctx.save();
    ctx.translate(ex, eyeY);

    // Eye base
    ctx.fillStyle = cMid;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Iris
    const irisGrad = ctx.createRadialGradient(-2, -2, 2, 0, 0, 13);
    irisGrad.addColorStop(0, '#fef9c3');
    irisGrad.addColorStop(0.5, '#eab308');
    irisGrad.addColorStop(1, '#a16207');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    // Distinctive W-Shaped Cephalopod Pupil!
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.lineTo(-4, 3.5);
    ctx.lineTo(0, -2);
    ctx.lineTo(4, 3.5);
    ctx.lineTo(8, -4);
    ctx.stroke();

    // Specular shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(-3, -5, 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  drawCuttleEye(eyeL);
  drawCuttleEye(eyeR);

  drawExpressiveAnimalBrows(ctx, eyeL, eyeY - 14, eyeR, eyeY - 14, 16, pose, outline);
  drawExpressiveAnimalMouth(ctx, lookX, eyeY + 22, 0.72, 0.04, pose, outline);

  ctx.restore();
};

/* ============================================================================
 * A35: GIANT CLAM (Tridacna gigas)
 * Massive heavy bivalve shell with 4-5 deep radial undulating folds,
 * foliaceous scaly ridges, vivid iridescent mantle with micro-ocelli,
 * distinct incurrent aperture and tubular excurrent siphon, sessile stance.
 * ========================================================================== */
const drawGiantClam: AnimalRig = (ctx, pose) => {
  const outline = '#292524';
  const shellLight = '#fefce8';
  const shellMid = '#e7e5e4';
  const shellDark = '#a8a29e';
  const mantleBlue = '#06b6d4';
  const mantleDeep = '#0369a1';

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY + 46);
  ctx.rotate(pose.shellRot);

  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;
  const waveAmt = Math.max(0, Math.min(1, 1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount));
  const gape = 0.85 + Math.sin(pose.waveRaysPhase * 0.7) * 0.12 + waveAmt * 0.35;

  // --- 1. Reef Rock Anchoring Base ---
  ctx.fillStyle = '#78716c';
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, 92, 148, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // --- 2. Lower/Posterior Shell Valve ---
  const lowerV = new Path2D();
  lowerV.moveTo(-160, 24);
  lowerV.bezierCurveTo(-154, 110, 154, 110, 160, 24);
  lowerV.quadraticCurveTo(0, 36, -160, 24);
  lowerV.closePath();
  kitFillRimAndStroke(ctx, lowerV, -160, 24, 160, 110, shellLight, shellMid, shellDark, outline, 3.6);

  // Scaly concentric growth rings & 5 deep radial folds on shell
  ctx.save();
  ctx.clip(lowerV);
  ctx.strokeStyle = 'rgba(120, 113, 108, 0.4)';
  ctx.lineWidth = 2.8;
  for (const rx of [-112, -56, 0, 56, 112]) {
    ctx.beginPath();
    ctx.moveTo(rx * 0.3, 98);
    ctx.lineTo(rx, 26);
    ctx.stroke();
  }
  ctx.restore();

  // --- 3. Iridescent Fleshy Mantle with Undulating Margins ---
  ctx.save();
  ctx.scale(1, gape);

  const mantleP = new Path2D();
  // Deep undulating scallops (5 main folds matching Tridacna flutes)
  mantleP.moveTo(-155, 12);
  mantleP.bezierCurveTo(-145, -38, -105, -46, -90, -18);
  mantleP.bezierCurveTo(-75, -52, -35, -54, -20, -22);
  mantleP.bezierCurveTo(-5, -56, 35, -56, 50, -22);
  mantleP.bezierCurveTo(65, -52, 105, -50, 120, -18);
  mantleP.bezierCurveTo(135, -42, 158, -32, 155, 12);
  // Bottom mantle folds
  mantleP.bezierCurveTo(145, 52, 95, 64, 75, 38);
  mantleP.bezierCurveTo(60, 68, 15, 70, 0, 42);
  mantleP.bezierCurveTo(-15, 70, -60, 68, -75, 38);
  mantleP.bezierCurveTo(-95, 64, -145, 52, -155, 12);
  mantleP.closePath();

  const mantleGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 150);
  mantleGrad.addColorStop(0, '#67e8f9');
  mantleGrad.addColorStop(0.45, mantleBlue);
  mantleGrad.addColorStop(0.85, mantleDeep);
  mantleGrad.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = mantleGrad;
  ctx.fill(mantleP);
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3.2;
  ctx.stroke(mantleP);

  // Micro-ocelli (emerald eye dots) along the undulating outer edge
  ctx.fillStyle = '#6ee7b7';
  ctx.strokeStyle = '#065f46';
  ctx.lineWidth = 1.2;
  for (let o = -8; o <= 8; o++) {
    const ang = (o / 8) * Math.PI * 0.85;
    const ox = Math.sin(ang) * 135;
    const oy = -Math.cos(ang) * 34 + 6;
    ctx.beginPath();
    ctx.arc(ox, oy, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Tubular Excurrent Siphon & Incurrent Aperture
  // Excurrent siphon (left side cone)
  ctx.fillStyle = '#0284c7';
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.ellipse(-78, -2, 14, 18, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#082f49';
  ctx.beginPath();
  ctx.ellipse(-78, -2, 7, 10, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Incurrent aperture (slit on right side)
  ctx.strokeStyle = '#082f49';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(62, -12);
  ctx.quadraticCurveTo(80, 2, 72, 16);
  ctx.stroke();

  ctx.restore();

  // Cute Expressive Face in Mantle Center
  const faceX = lookX * 0.8;
  const faceY = lookY * 0.6;

  drawSoftCheekBlushes(ctx, faceX - 58, faceY + 16, faceX + 58, faceY + 16, 20, 12, pose.blushAlpha);
  drawGlossyAnimalEye(ctx, 'left', faceX - 38, faceY - 2, 15, 17, -0.06, pose, IRIS_PALETTES.emerald, '#67e8f9', mantleBlue, outline);
  drawGlossyAnimalEye(ctx, 'right', faceX + 38, faceY - 2, 15, 17, 0.06, pose, IRIS_PALETTES.emerald, '#67e8f9', mantleBlue, outline);
  drawExpressiveAnimalBrows(ctx, faceX - 38, faceY - 18, faceX + 38, faceY - 18, 20, pose, outline);
  drawExpressiveAnimalMouth(ctx, faceX, faceY + 22, 0.85, 0.04, pose, outline);

  // Waving iridescent bubbles when waveAmt active
  if (waveAmt > 0.05) {
    ctx.fillStyle = 'rgba(103, 232, 249, 0.65)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    for (let b = 1; b <= 3; b++) {
      const by = -40 - b * 22 * waveAmt;
      const bx = -78 + Math.sin(pose.waveRaysPhase + b) * 12;
      const br = 6 + b * 2.5;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
};

/* ============================================================================
 * A40: HORNED SEA STAR (Protoreaster nodosus / Chocolate Chip Sea Star)
 * 5 radial arms with ossicle bumps and chocolate conical horn spines,
 * ventral ambulacral groove and tube feet hints on curling tips,
 * gentle crawl and ray-waving animation.
 * ========================================================================== */
const drawHornedSeaStar: AnimalRig = (ctx, pose) => {
  const outline = '#291206';
  const cLight = '#fed7aa';
  const cMid = '#fb923c';
  const cDark = '#c2410c';
  const hornCol = '#3d1c0a'; // Dark chocolate cone spines
  const hornHighlight = '#78350f';

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY + 16);
  ctx.rotate(pose.shellRot);

  const lookX = pose.headLookX * 10;
  const lookY = pose.headLookY * 8;
  const waveAmt = Math.max(0, Math.min(1, 1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount));

  const outerR = 175;
  const innerR = 76;

  // --- 1. Five Radial Arms Star Path ---
  const starP = new Path2D();
  for (let i = 0; i < 10; i++) {
    const isTip = i % 2 === 0;
    const armIdx = Math.floor(i / 2);
    let ang = -Math.PI / 2 + (i * Math.PI) / 5;

    // Ray #4 (top-left, ~120° offset) waves and curls when waving
    const isWavingRay = isTip && armIdx === 4 && waveAmt > 0.05;
    if (isWavingRay) {
      ang = (-2 * Math.PI) / 3 + (Math.sin(pose.waveRaysPhase * 1.3) * 0.18) * waveAmt;
    }

    const r = isWavingRay ? outerR * (1 + 0.12 * waveAmt) : isTip ? outerR : innerR;
    const px = Math.cos(ang) * r;
    const py = Math.sin(ang) * r;

    if (i === 0) {
      starP.moveTo(px, py);
    } else {
      // Sculpted curved valleys between arms
      const prevAng = -Math.PI / 2 + ((i - 1) * Math.PI) / 5;
      const midAng = (ang + prevAng) * 0.5;
      const midR = isTip ? innerR * 1.05 : innerR * 0.95;
      starP.quadraticCurveTo(Math.cos(midAng) * midR, Math.sin(midAng) * midR, px, py);
    }
  }
  starP.closePath();

  kitFillRimAndStroke(ctx, starP, -outerR, -outerR, outerR, outerR, cLight, cMid, cDark, outline, 3.6);

  // --- 2. Carinal Ridges and Dark Chocolate Conical Horn Spines ---
  ctx.save();
  ctx.clip(starP);

  // Carinal ridge lines
  ctx.strokeStyle = 'rgba(194, 65, 12, 0.4)';
  ctx.lineWidth = 3.2;
  for (let a = 0; a < 5; a++) {
    const ang = -Math.PI / 2 + (a * 2 * Math.PI) / 5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * 35, Math.sin(ang) * 35);
    ctx.lineTo(Math.cos(ang) * (outerR - 15), Math.sin(ang) * (outerR - 15));
    ctx.stroke();

    // Chocolate chip conical spines along each arm
    for (const dist of [65, 105, 142]) {
      const nx = Math.cos(ang) * dist;
      const ny = Math.sin(ang) * dist;
      const nr = dist === 142 ? 6.5 : dist === 105 ? 9.5 : 12;

      // Base shadow
      ctx.fillStyle = 'rgba(41, 18, 6, 0.35)';
      ctx.beginPath();
      ctx.ellipse(nx + 2, ny + 2, nr * 1.1, nr * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Conical spine body
      ctx.fillStyle = hornCol;
      ctx.beginPath();
      ctx.arc(nx, ny, nr, 0, Math.PI * 2);
      ctx.fill();

      // Top specular highlight
      ctx.fillStyle = hornHighlight;
      ctx.beginPath();
      ctx.arc(nx - 2, ny - 2, nr * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(nx - 3, ny - 3, nr * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Interradial spines forming a central ring
  for (let a = 0; a < 5; a++) {
    const ang = -Math.PI / 2 + Math.PI / 5 + (a * 2 * Math.PI) / 5;
    const nx = Math.cos(ang) * 44;
    const ny = Math.sin(ang) * 44;
    ctx.fillStyle = hornCol;
    ctx.beginPath();
    ctx.arc(nx, ny, 7.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // --- 3. Expressive Cute Face in Central Disc ---
  const faceX = lookX * 0.8;
  const faceY = lookY * 0.6;

  drawSoftCheekBlushes(ctx, faceX - 32, faceY + 16, faceX + 32, faceY + 16, 16, 10, pose.blushAlpha);
  drawGlossyAnimalEye(ctx, 'left', faceX - 22, faceY - 4, 14, 16, -0.04, pose, IRIS_PALETTES.amber, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', faceX + 22, faceY - 4, 14, 16, 0.04, pose, IRIS_PALETTES.amber, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, faceX - 22, faceY - 18, faceX + 22, faceY - 18, 16, pose, outline);
  drawExpressiveAnimalMouth(ctx, faceX, faceY + 20, 0.78, 0.04, pose, outline);

  ctx.restore();
};

/** Refined Vector Invertebrate Rigs Hook */
export const INVERTEBRATES_RIGS: Record<string, AnimalRig> = {
  animal_20_giant_freshwater_prawn: drawGiantFreshwaterPrawn,
  animal_38_harlequin_shrimp: drawHarlequinShrimp,
  animal_37_coconut_octopus: drawCoconutOctopus,
  animal_39_cuttlefish: drawCuttlefish,
  animal_35_giant_clam: drawGiantClam,
  animal_40_sea_star: drawHornedSeaStar,
};
