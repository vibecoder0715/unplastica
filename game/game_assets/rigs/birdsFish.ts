import type { AnimalRig } from './types';
import {
  kitFillRimAndStroke,
  getAnimalRenderState,
} from '../animalRenderer';
import {
  drawGlossyAnimalEye,
  drawExpressiveAnimalBrows,
  drawOvalSpot,
  IRIS_PALETTES,
} from '../../turtle/renderer';

/* ============================================================================
 * A14: MALAYAN CRESTED FIREBACK (Lophura ignita)
 * Peacock-blue/rufous plumage, tufted crest, bright red facial wattle, leg spurs.
 * ========================================================================== */
const drawCrestedFireback: AnimalRig = (ctx, pose) => {
  const outline = '#121422';
  const cLight = '#2563eb';
  const cMid = '#1d4ed8';
  const cDark = '#172554';
  const fieryRufous = '#ea580c';
  const redSkin = '#dc2626';

  const rState = getAnimalRenderState();
  const walkPhase = rState.locoTime * 4.4;
  const legStrideNear = (Math.sin(walkPhase) + 0.14 * Math.sin(walkPhase * 2)) * 0.42 * rState.activity;
  const legStrideFar = (Math.sin(walkPhase + Math.PI) + 0.14 * Math.sin((walkPhase + Math.PI) * 2)) * 0.42 * rState.activity;

  // Scaled bipedal bird leg helper with rear spur
  const drawBirdLeg = (lx: number, ly: number, ang: number, hasSpur: boolean) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(ang);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 5.2;
    ctx.lineCap = 'round';
    // Thigh & tarsus
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(4, 48);
    ctx.lineTo(-4, 96);
    ctx.stroke();

    // Rear spur (calcar)
    if (hasSpur) {
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(1, 72);
      ctx.lineTo(-14, 68);
      ctx.stroke();
    }

    // 3 Front toes & 1 back toe
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(-4, 96);
    ctx.lineTo(24, 104);
    ctx.moveTo(-4, 96);
    ctx.lineTo(18, 114);
    ctx.moveTo(-4, 96);
    ctx.lineTo(-24, 102);
    ctx.stroke();
    ctx.restore();
  };

  drawBirdLeg(42, 68, legStrideFar, false); // Far leg

  // Torso with fiery rufous lower back & arched tail feathers
  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  // Arched white and dark blue tail feathers
  for (let f = 0; f < 5; f++) {
    const a = -Math.PI * 0.72 + f * 0.12 + Math.sin(pose.waveRaysPhase + f * 0.4) * 0.05;
    ctx.save();
    ctx.translate(-92, 18);
    ctx.rotate(a);
    const feather = new Path2D();
    feather.moveTo(0, -6);
    feather.quadraticCurveTo(80, -18, 140, 0);
    feather.quadraticCurveTo(80, 18, 0, 6);
    feather.closePath();
    kitFillRimAndStroke(ctx, feather, 0, -10, 130, 10, f < 2 ? '#ffffff' : cLight, f < 2 ? '#e2e8f0' : cMid, cDark, outline, 2.4);
    ctx.restore();
  }

  // Torso
  const torso = new Path2D();
  torso.ellipse(-14, 32, 104, 76, 0.08, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, torso, -100, -40, 60, 100, cLight, cMid, cDark, outline, 3.6);

  // Fiery rufous lower back patch (fireback hallmark)
  ctx.save();
  ctx.clip(torso);
  ctx.fillStyle = fieryRufous;
  drawOvalSpot(ctx, -52, 16, 44, 36, -0.2);
  ctx.restore();

  // Folded wing with layered overlapping feathers
  const wing = new Path2D();
  wing.moveTo(14, 0);
  wing.bezierCurveTo(46, 12, 54, 52, 28, 74);
  wing.bezierCurveTo(-14, 88, -68, 64, -78, 32);
  wing.bezierCurveTo(-82, 4, -42, -12, 14, 0);
  wing.closePath();
  kitFillRimAndStroke(ctx, wing, -60, -10, 40, 70, cLight, cMid, cDark, outline, 3.2);

  ctx.restore();

  drawBirdLeg(-8, 70, legStrideNear, true); // Near leg with spur

  // Head with tufted crown crest & bright red facial wattle
  ctx.save();
  ctx.translate(52 + pose.headX, -34 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  // Crown crest feathers (bare shafts with tufted spatulate tips)
  for (let c = 0; c < 6; c++) {
    const a = -Math.PI * 0.55 + (c - 2.5) * 0.12;
    ctx.save();
    ctx.translate(-16, -42);
    ctx.rotate(a);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -38);
    ctx.stroke();

    ctx.fillStyle = cMid;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -42, 6, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Head
  const headP = new Path2D();
  headP.ellipse(0, 0, 68, 56, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -45, -45, 45, 50, cLight, cMid, cDark, outline, 3.4);

  // Bright scarlet-red facial wattle skin surrounding eye
  ctx.fillStyle = redSkin;
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(4 + lookX * 0.7, -4 + lookY * 0.7, 36, 26, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Downcurved sharp bill
  const bill = new Path2D();
  bill.moveTo(42, -10);
  bill.lineTo(76 + lookX * 0.6, 6 + lookY * 0.6);
  bill.lineTo(44, 18);
  bill.closePath();
  kitFillRimAndStroke(ctx, bill, 40, -10, 75, 18, '#fef08a', '#eab308', '#a16207', outline, 2.4);

  drawGlossyAnimalEye(ctx, 'left', -4 + lookX * 0.8, -6 + lookY * 0.8, 11, 13, -0.05, pose, IRIS_PALETTES.rubyRed, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 38 + lookX * 0.8, -1 + lookY * 0.8, 9.5, 11.5, 0.1, pose, IRIS_PALETTES.rubyRed, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -4 + lookX * 0.8, -22 + lookY * 0.8, 38 + lookX * 0.8, -16 + lookY * 0.8, 16, pose, '#ffffff', 3.0);

  ctx.restore();
};

/* ============================================================================
 * A15: RHINOCEROS HORNBILL (Buceros rhinoceros)
 * Upturned scarlet/gold casque on massive bill, white tail with black bar.
 * ========================================================================== */
const drawRhinocerosHornbill: AnimalRig = (ctx, pose) => {
  const outline = '#15171e';
  const cLight = '#2c303d';
  const cMid = '#191c24';
  const cDark = '#0b0c10';
  const whiteBelly = '#f8fafc';

  const rState = getAnimalRenderState();
  const walkPhase = rState.locoTime * 4.4;
  const legStrideNear = (Math.sin(walkPhase) + 0.14 * Math.sin(walkPhase * 2)) * 0.38 * rState.activity;
  const legStrideFar = (Math.sin(walkPhase + Math.PI) + 0.14 * Math.sin((walkPhase + Math.PI) * 2)) * 0.38 * rState.activity;

  const drawHornbillLeg = (lx: number, ly: number, ang: number) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(ang);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 5.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(4, 52);
    ctx.lineTo(-4, 98);
    ctx.stroke();

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    ctx.moveTo(-4, 98);
    ctx.lineTo(26, 106);
    ctx.moveTo(-4, 98);
    ctx.lineTo(16, 116);
    ctx.moveTo(-4, 98);
    ctx.lineTo(-24, 102);
    ctx.stroke();
    ctx.restore();
  };

  drawHornbillLeg(44, 70, legStrideFar);

  // Torso with black-and-white tail
  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  // White tail with bold black subterminal band
  const tail = new Path2D();
  tail.moveTo(-84, 18);
  tail.lineTo(-172, 74);
  tail.lineTo(-148, 108);
  tail.lineTo(-76, 52);
  tail.closePath();
  kitFillRimAndStroke(ctx, tail, -80, 20, -170, 100, '#ffffff', '#f1f5f9', '#cbd5e1', outline, 3.2);

  // Black subterminal band
  ctx.save();
  ctx.clip(tail);
  ctx.fillStyle = cDark;
  ctx.fillRect(-150, 40, 42, 80);
  ctx.restore();
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = outline;
  ctx.stroke(tail);

  // Torso
  const torso = new Path2D();
  torso.ellipse(-16, 34, 112, 80, 0.08, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, torso, -105, -40, 65, 105, cLight, cMid, cDark, outline, 3.6);

  // Pure white lower belly/thighs
  ctx.save();
  ctx.clip(torso);
  ctx.fillStyle = whiteBelly;
  drawOvalSpot(ctx, 16, 68, 52, 34, 0.08);
  ctx.restore();

  // Folded glossy black wing
  const wing = new Path2D();
  wing.moveTo(18, 0);
  wing.bezierCurveTo(52, 14, 58, 56, 32, 80);
  wing.bezierCurveTo(-18, 96, -72, 68, -84, 34);
  wing.bezierCurveTo(-86, 4, -42, -12, 18, 0);
  wing.closePath();
  kitFillRimAndStroke(ctx, wing, -65, -10, 45, 75, cLight, cMid, cDark, outline, 3.4);

  ctx.restore();

  drawHornbillLeg(-10, 72, legStrideNear);

  // Head with Massive Bill and Upturned Rhinoceros Casque!
  ctx.save();
  ctx.translate(56 + pose.headX, -36 + pose.headY);
  ctx.rotate(pose.headRot);
  ctx.scale(pose.headScaleX, pose.headScaleY);
  const lookX = pose.headLookX * 12;
  const lookY = pose.headLookY * 8;

  // Head base
  const headP = new Path2D();
  headP.ellipse(0, 0, 72, 60, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, headP, -50, -50, 50, 55, cLight, cMid, cDark, outline, 3.6);

  // Downcurved ivory-yellow bill
  const bill = new Path2D();
  bill.moveTo(40, -14);
  bill.bezierCurveTo(82, -12, 118, 6, 134 + lookX * 0.6, 28 + lookY * 0.6);
  bill.bezierCurveTo(106, 32, 68, 30, 42, 22);
  bill.closePath();
  kitFillRimAndStroke(ctx, bill, 40, -15, 130, 30, '#fffbeb', '#fde047', '#ca8a04', outline, 3.0);

  // Upturned scarlet-and-gold horn casque riding the upper bill!
  const casque = new Path2D();
  casque.moveTo(22, -32);
  casque.bezierCurveTo(54, -48, 86, -58, 118 + lookX * 0.5, -68 + lookY * 0.5);
  // Sharp upward curve at tip
  casque.bezierCurveTo(128 + lookX * 0.5, -76 + lookY * 0.5, 134 + lookX * 0.5, -62 + lookY * 0.5, 116 + lookX * 0.5, -42 + lookY * 0.5);
  casque.bezierCurveTo(88, -22, 58, -14, 34, -14);
  casque.closePath();
  kitFillRimAndStroke(ctx, casque, 20, -70, 125, -15, '#ef4444', '#f97316', '#eab308', outline, 3.0);

  drawGlossyAnimalEye(ctx, 'left', -6 + lookX * 0.8, -8 + lookY * 0.8, 12.5, 14.5, -0.05, pose, IRIS_PALETTES.rubyRed, cLight, cMid, outline);
  drawGlossyAnimalEye(ctx, 'right', 40 + lookX * 0.8, -2 + lookY * 0.8, 10.5, 12.5, 0.1, pose, IRIS_PALETTES.rubyRed, cLight, cMid, outline);
  drawExpressiveAnimalBrows(ctx, -6 + lookX * 0.8, -26 + lookY * 0.8, 40 + lookX * 0.8, -20 + lookY * 0.8, 18, pose, '#ffffff', 3.4);

  ctx.restore();
};

/* ============================================================================
 * A21: ASIAN AROWANA (Scleropages formosus - Dragonfish)
 * Large cycloid scales, chin barbels, posterior dorsal/anal fins.
 * ========================================================================== */
const drawAsianArowana: AnimalRig = (ctx, pose) => {
  const outline = '#291404';
  const cLight = '#fdba74';
  const cMid = '#ea580c';
  const cDark = '#9a3412';
  const goldScale = '#fde047';

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const swimWag = Math.sin(pose.waveRaysPhase * 1.2) * 14;

  // Caudal, Dorsal & Anal fins set far back near tail
  const drawFin = (fx: number, fy: number, w: number, h: number, ang: number) => {
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(ang);
    const finP = new Path2D();
    finP.moveTo(0, 0);
    finP.quadraticCurveTo(w * 0.5, -h * 0.5, w, 0);
    finP.quadraticCurveTo(w * 0.5, h * 0.5, 0, 0);
    kitFillRimAndStroke(ctx, finP, 0, -h * 0.5, w, h * 0.5, '#fed7aa', cMid, cDark, outline, 2.4);

    // Fin rays
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 1.3;
    for (let r = 0; r < 5; r++) {
      const t = (r + 0.5) / 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.9, (t - 0.5) * h * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Caudal tail fin
  drawFin(-180, 16 + swimWag, 74, 58, Math.PI + swimWag * 0.03);
  // Dorsal fin (set far back)
  drawFin(-110, -38, 56, 36, -0.4);
  // Anal fin (set far back along bottom)
  drawFin(-110, 52, 64, 42, 0.4);

  // Fusiform high-backed torpedo body
  const body = new Path2D();
  body.moveTo(-168, 16 + swimWag);
  body.bezierCurveTo(-112, -42, 28, -52, 104, -12);
  body.bezierCurveTo(138, 6, 126, 42, 88, 48);
  body.bezierCurveTo(18, 56, -112, 54, -168, 16 + swimWag);
  body.closePath();

  kitFillRimAndStroke(ctx, body, -160, -45, 110, 55, cLight, cMid, cDark, outline, 3.6);

  // Large cycloid dragon scales in 5 rows
  ctx.save();
  ctx.clip(body);
  for (let row = -2; row <= 2; row++) {
    const ry = 4 + row * 18;
    for (let col = -5; col <= 3; col++) {
      const rx = col * 26 + (row % 2 === 0 ? 0 : 13);
      ctx.strokeStyle = goldScale;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(rx, ry, 14, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Upturned Dragonfish mouth with pair of chin barbels
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(78, 28);
  ctx.lineTo(108, 14);
  ctx.stroke();

  // Two chin barbels
  ctx.strokeStyle = goldScale;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(106, 16);
  ctx.quadraticCurveTo(124, 18, 134, 10);
  ctx.moveTo(106, 20);
  ctx.quadraticCurveTo(124, 24, 134, 18);
  ctx.stroke();

  // Large glossy eye
  drawGlossyAnimalEye(ctx, 'left', 68, -4, 13, 15, 0, pose, IRIS_PALETTES.amberGold, cLight, cMid, outline);

  ctx.restore();
};

/* ============================================================================
 * A22: CLOWN FEATHERBACK (Chitala ornata)
 * Humped back, undulating anal fin merging with tail, row of white-ringed spots.
 * ========================================================================== */
const drawClownFeatherback: AnimalRig = (ctx, pose) => {
  const outline = '#1e242d';
  const cLight = '#cbd5e1';
  const cMid = '#94a3b8';
  const cDark = '#475569';

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const swimPhase = pose.waveRaysPhase * 1.3;
  const tailWag = Math.sin(swimPhase) * 16;

  // Humped knifefish body tapering to a fine point
  const body = new Path2D();
  body.moveTo(98, 2);
  body.bezierCurveTo(68, -48, -24, -64, -86, -32);
  body.bezierCurveTo(-148, -4, -204, 12 + tailWag, -238, 24 + tailWag);
  body.bezierCurveTo(-186, 42 + tailWag, -112, 54, -20, 52);
  body.bezierCurveTo(46, 50, 92, 34, 98, 2);
  body.closePath();

  kitFillRimAndStroke(ctx, body, -220, -55, 95, 50, cLight, cMid, cDark, outline, 3.6);

  // Undulating anal fin skirt along bottom edge
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(34, 48);
  for (let x = 30; x >= -220; x -= 15) {
    const wave = Math.sin(swimPhase + x * 0.08) * 6;
    ctx.lineTo(x, 46 + wave);
  }
  ctx.stroke();

  // Row of 6 white-ringed black ocelli spots (Clown featherback signature)
  for (let s = 0; s < 6; s++) {
    const sx = -42 - s * 24;
    const sy = 24 + s * 1.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Small feather-like dorsal fin
  ctx.fillStyle = cMid;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.ellipse(-78, -42, 6, 14, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  drawGlossyAnimalEye(ctx, 'left', 66, -4, 12, 14, 0, pose, IRIS_PALETTES.amberGold, cLight, cMid, outline);

  ctx.restore();
};

/* ============================================================================
 * A26: GIANT SNAKEHEAD (Channa micropeltes - Toman)
 * Torpedo body, snake-like plated head, continuous dorsal and anal fins.
 * ========================================================================== */
const drawGiantSnakehead: AnimalRig = (ctx, pose) => {
  const outline = '#0f172a';
  const cLight = '#38bdf8';
  const cMid = '#0284c7';
  const cDark = '#0c4a6e';
  const belly = '#f8fafc';

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const swimWag = Math.sin(pose.waveRaysPhase * 1.1) * 14;

  // Continuous long dorsal fin
  const dFin = new Path2D();
  dFin.moveTo(-54, -38);
  dFin.lineTo(-172, -18 + swimWag);
  dFin.lineTo(-176, -34 + swimWag);
  dFin.lineTo(-58, -50);
  dFin.closePath();
  kitFillRimAndStroke(ctx, dFin, -54, -50, -170, -20, cLight, cMid, cDark, outline, 2.4);

  // Long anal fin
  const aFin = new Path2D();
  aFin.moveTo(-28, 42);
  aFin.lineTo(-168, 26 + swimWag);
  aFin.lineTo(-172, 38 + swimWag);
  aFin.lineTo(-32, 54);
  aFin.closePath();
  kitFillRimAndStroke(ctx, aFin, -28, 42, -170, 30, cLight, cMid, cDark, outline, 2.4);

  // Robust torpedo body
  const body = new Path2D();
  body.moveTo(-182, 6 + swimWag);
  body.bezierCurveTo(-118, -36, 18, -44, 102, -8);
  body.bezierCurveTo(128, 8, 122, 36, 86, 44);
  body.bezierCurveTo(16, 50, -118, 46, -182, 6 + swimWag);
  body.closePath();

  kitFillRimAndStroke(ctx, body, -180, -40, 110, 48, cLight, cMid, cDark, outline, 3.6);

  // White belly and black longitudinal lateral stripe bands
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = belly;
  drawOvalSpot(ctx, 0, 36, 120, 24, 0);

  ctx.strokeStyle = '#082f49';
  ctx.lineWidth = 7.0;
  ctx.beginPath();
  ctx.moveTo(100, 12);
  ctx.bezierCurveTo(20, 10, -80, 8, -180, 6 + swimWag);
  ctx.stroke();
  ctx.restore();

  // Polygonal cranial plates on flattened head
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(48, -16, 24, 16);
  ctx.strokeRect(72, -12, 22, 14);

  drawGlossyAnimalEye(ctx, 'left', 68, -4, 13, 15, 0, pose, IRIS_PALETTES.amber, cLight, cMid, outline);

  ctx.restore();
};

/* ============================================================================
 * A34: CLOWNFISH (Amphiprion ocellaris)
 * 3 white vertical bars with crisp black margins, black fin borders.
 * ========================================================================== */
const drawClownfish: AnimalRig = (ctx, pose) => {
  const outline = '#290e03';
  const cLight = '#fb923c';
  const cMid = '#ea580c';
  const cDark = '#9a3412';

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const swimWag = Math.sin(pose.waveRaysPhase * 1.4) * 12;

  // Rounded fins with black borders
  const drawClownFin = (fx: number, fy: number, rx: number, ry: number, rot: number) => {
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(rot);
    const finP = new Path2D();
    finP.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, finP, -rx, -ry, rx, ry, cLight, cMid, cDark, outline, 2.0);

    // Black outer margin
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, rx * 0.95, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    ctx.restore();
  };

  // Caudal tail
  drawClownFin(-108, 2 + swimWag, 28, 36, swimWag * 0.04);
  // Dorsal fin with spiny anterior dip
  drawClownFin(-20, -42, 48, 22, -0.15);
  // Anal fin
  drawClownFin(-28, 44, 38, 18, 0.2);

  // Oval fish body
  const body = new Path2D();
  body.ellipse(-14, 2, 88, 58, 0.04, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, body, -85, -45, 65, 55, cLight, cMid, cDark, outline, 3.6);

  // 3 Diagnostic White Bars with Black Edging
  const drawBar = (bx: number, w: number, bulge: boolean) => {
    ctx.save();
    ctx.clip(body);

    const barP = new Path2D();
    if (bulge) {
      // Middle bar with forward-projecting triangular bulge
      barP.moveTo(bx - w * 0.5, -60);
      barP.lineTo(bx + w * 0.5, -60);
      barP.lineTo(bx + w * 0.5, 60);
      barP.lineTo(bx - w * 0.5, 60);
      barP.lineTo(bx - w * 0.5 - 12, 4); // Bulge
      barP.closePath();
    } else {
      barP.rect(bx - w * 0.5, -60, w, 120);
    }

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.6;
    ctx.fill(barP);
    ctx.stroke(barP);
    ctx.restore();
  };

  // 1. Head bar behind eye
  drawBar(32, 18, false);
  // 2. Middle bar with bulge
  drawBar(-22, 20, true);
  // 3. Tail peduncle bar
  drawBar(-78, 14, false);

  ctx.lineWidth = 3.6;
  ctx.strokeStyle = outline;
  ctx.stroke(body);

  // Pectoral paddle fin
  drawClownFin(16, 12, 22, 16, 0.35);

  drawGlossyAnimalEye(ctx, 'left', 42, -4, 11, 13, 0, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);

  ctx.restore();
};

export const BIRDS_FISH_RIGS: Record<string, AnimalRig> = {
  animal_14_malayan_crested_fireback: drawCrestedFireback,
  animal_15_rhinoceros_hornbill: drawRhinocerosHornbill,
  animal_21_asian_arowana: drawAsianArowana,
  animal_22_clown_featherback: drawClownFeatherback,
  animal_26_giant_snakehead: drawGiantSnakehead,
  animal_34_clownfish: drawClownfish,
};
