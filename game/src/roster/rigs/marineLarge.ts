import type { AnimalRig } from './types';
import {
  kitFillRimAndStroke,
} from '../animalRenderer';
import {
  drawGlossyAnimalEye,
  drawOvalSpot,
  IRIS_PALETTES,
} from '../../turtle/renderer';

/* ============================================================================
 * A27: DUGONG (Dugong dugon - Sea Cow)
 * Downturned bristled muzzle disc, paddle flippers, horizontal notched fluke.
 * ========================================================================== */
const drawDugong: AnimalRig = (ctx, pose) => {
  const outline = '#211e1c';
  const cLight = '#9e9791';
  const cMid = '#6e6761';
  const cDark = '#47413b';

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const swimPhase = pose.waveRaysPhase * 1.2;
  const flukeStroke = Math.sin(swimPhase) * 16;

  // Horizontal Sirenian Fluke Tail (notched crescent)
  ctx.save();
  ctx.translate(-160, 14 + flukeStroke);
  ctx.rotate(-flukeStroke * 0.03);
  const fluke = new Path2D();
  fluke.moveTo(0, 0);
  fluke.quadraticCurveTo(-28, -26, -58, -34);
  fluke.quadraticCurveTo(-48, -4, -36, 0); // Notched center
  fluke.quadraticCurveTo(-48, 4, -58, 34);
  fluke.quadraticCurveTo(-28, 26, 0, 0);
  fluke.closePath();
  kitFillRimAndStroke(ctx, fluke, -55, -30, 0, 30, cLight, cMid, cDark, outline, 3.2);
  ctx.restore();

  // Sirenian Fusiform Body (no dorsal fin!)
  const body = new Path2D();
  body.moveTo(-160, 14 + flukeStroke);
  body.bezierCurveTo(-112, -36, -18, -46, 68, -14);
  body.bezierCurveTo(116, 8, 118, 48, 76, 56);
  body.bezierCurveTo(8, 64, -112, 54, -160, 14 + flukeStroke);
  body.closePath();

  kitFillRimAndStroke(ctx, body, -150, -40, 100, 50, cLight, cMid, cDark, outline, 3.6);

  // Paddle pectoral flippers
  const drawFlipper = (fx: number, fy: number, ang: number) => {
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(ang);
    const flipP = new Path2D();
    flipP.ellipse(0, 0, 34, 18, 0.3, 0, Math.PI * 2);
    kitFillRimAndStroke(ctx, flipP, -30, -15, 30, 15, cLight, cMid, cDark, outline, 2.6);
    ctx.restore();
  };

  drawFlipper(24, 46, 0.4 + Math.sin(swimPhase) * 0.15);

  // Downturned Horseshoe Muzzle Disc with sensory bristles
  ctx.save();
  ctx.translate(88, 22);
  const muzzleDisc = new Path2D();
  muzzleDisc.ellipse(0, 0, 24, 28, 0.2, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, muzzleDisc, -20, -25, 20, 25, cLight, cMid, cDark, outline, 3.0);

  // Sensory bristles
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.3;
  for (let b = 0; b < 6; b++) {
    const by = -12 + b * 5;
    ctx.beginPath();
    ctx.moveTo(8, by);
    ctx.lineTo(18, by + 2);
    ctx.stroke();
  }
  ctx.restore();

  drawGlossyAnimalEye(ctx, 'left', 58, -8, 10.5, 12, -0.05, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);

  ctx.restore();
};

/* ============================================================================
 * A31: INDO-PACIFIC HUMPBACK DOLPHIN (Sousa chinensis - Pink Dolphin)
 * Distinct dorsal hump with small fin, long slender beak, pink-grey mottling.
 * ========================================================================== */
const drawHumpbackDolphin: AnimalRig = (ctx, pose) => {
  const outline = '#2a1a24';
  const cLight = '#fbcfe8';
  const cMid = '#f472b6';
  const cDark = '#be185d';
  const greyWash = '#94a3b8';

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const swimWag = Math.sin(pose.waveRaysPhase * 1.3) * 16;

  // Horizontal Dolphin Fluke
  ctx.save();
  ctx.translate(-168, 12 + swimWag);
  ctx.rotate(-swimWag * 0.03);
  const fluke = new Path2D();
  fluke.moveTo(0, 0);
  fluke.quadraticCurveTo(-28, -28, -56, -34);
  fluke.quadraticCurveTo(-46, -4, -34, 0);
  fluke.quadraticCurveTo(-46, 4, -56, 34);
  fluke.quadraticCurveTo(-28, 28, 0, 0);
  fluke.closePath();
  kitFillRimAndStroke(ctx, fluke, -55, -30, 0, 30, cLight, cMid, cDark, outline, 3.2);
  ctx.restore();

  // Dolphin Body with Dorsal Hump!
  const body = new Path2D();
  body.moveTo(-168, 12 + swimWag);
  body.bezierCurveTo(-118, -30, -56, -38, -28, -48); // Rising onto dorsal hump
  body.lineTo(-24, -62); // Small falcate dorsal fin atop hump
  body.lineTo(-12, -48);
  body.bezierCurveTo(24, -44, 76, -26, 104, -4);
  // Elongated slender rostrum beak
  body.lineTo(142, 6);
  body.lineTo(108, 22);
  body.bezierCurveTo(46, 48, -118, 48, -168, 12 + swimWag);
  body.closePath();

  kitFillRimAndStroke(ctx, body, -160, -55, 120, 45, cLight, cMid, cDark, outline, 3.6);

  // Grey-pink mottling spots
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = greyWash;
  for (const [gx, gy, gr] of [
    [-68, -12, 16],
    [-24, 8, 14],
    [28, -6, 12],
    [64, 12, 10],
  ] as const) {
    drawOvalSpot(ctx, gx, gy, gr, gr * 0.7, 0.2);
  }
  ctx.restore();

  // Curved pectoral flipper
  const flipper = new Path2D();
  flipper.ellipse(36, 26, 32, 14, 0.5, 0, Math.PI * 2);
  kitFillRimAndStroke(ctx, flipper, 10, 15, 60, 35, cLight, cMid, cDark, outline, 2.6);

  drawGlossyAnimalEye(ctx, 'left', 76, -6, 11, 13, 0, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);

  ctx.restore();
};

/* ============================================================================
 * A32: FALSE KILLER WHALE (Pseudorca crassidens)
 * Slender charcoal body, rounded melon with NO beak, humped "elbowed" flipper.
 * ========================================================================== */
const drawFalseKillerWhale: AnimalRig = (ctx, pose) => {
  const outline = '#0f172a';
  const cLight = '#475569';
  const cMid = '#1e293b';
  const cDark = '#090d16';

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const swimWag = Math.sin(pose.waveRaysPhase * 1.2) * 16;

  // Horizontal Fluke
  ctx.save();
  ctx.translate(-178, 12 + swimWag);
  ctx.rotate(-swimWag * 0.03);
  const fluke = new Path2D();
  fluke.moveTo(0, 0);
  fluke.quadraticCurveTo(-30, -30, -60, -36);
  fluke.quadraticCurveTo(-50, -4, -36, 0);
  fluke.quadraticCurveTo(-50, 4, -60, 36);
  fluke.quadraticCurveTo(-30, 30, 0, 0);
  fluke.closePath();
  kitFillRimAndStroke(ctx, fluke, -58, -32, 0, 32, cLight, cMid, cDark, outline, 3.2);
  ctx.restore();

  // Tall falcate dorsal fin
  const dFin = new Path2D();
  dFin.moveTo(-28, -36);
  dFin.quadraticCurveTo(-22, -82, 4, -86);
  dFin.quadraticCurveTo(-4, -62, 12, -38);
  dFin.closePath();
  kitFillRimAndStroke(ctx, dFin, -25, -85, 10, -35, cLight, cMid, cDark, outline, 3.0);

  // Slender dark body with rounded melon (NO rostrum beak!)
  const body = new Path2D();
  body.moveTo(-178, 12 + swimWag);
  body.bezierCurveTo(-124, -36, -20, -44, 76, -18);
  // Rounded melon projecting beyond lower jaw
  body.bezierCurveTo(124, -2, 128, 28, 92, 38);
  body.bezierCurveTo(24, 48, -124, 48, -178, 12 + swimWag);
  body.closePath();

  kitFillRimAndStroke(ctx, body, -170, -45, 115, 45, cLight, cMid, cDark, outline, 3.6);

  // Humped "elbowed" flipper with leading-edge bulge (Pseudorca diagnostic)
  const elbowFlipper = new Path2D();
  elbowFlipper.moveTo(24, 20);
  elbowFlipper.lineTo(44, 28);
  elbowFlipper.quadraticCurveTo(62, 44, 52, 64); // Elbow hump bulge
  elbowFlipper.quadraticCurveTo(34, 48, 20, 32);
  elbowFlipper.closePath();
  kitFillRimAndStroke(ctx, elbowFlipper, 15, 20, 60, 65, cLight, cMid, cDark, outline, 2.6);

  drawGlossyAnimalEye(ctx, 'left', 68, -4, 11.5, 13.5, 0, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);

  ctx.restore();
};

/* ============================================================================
 * A30: WHALE SHARK (Rhincodon typus)
 * Checkerboard white spots & vertical bars, 3 flank ridges, wide terminal mouth.
 * ========================================================================== */
const drawWhaleShark: AnimalRig = (ctx, pose) => {
  const outline = '#0e2338';
  const cLight = '#38bdf8';
  const cMid = '#0369a1';
  const cDark = '#082f49';
  const whiteSpots = '#f0f9ff';

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const swimWag = Math.sin(pose.waveRaysPhase * 1.1) * 16;

  // Tall crescent vertical caudal tail
  const tail = new Path2D();
  tail.moveTo(-172, 8 + swimWag);
  tail.quadraticCurveTo(-198, -54 + swimWag, -228, -78 + swimWag);
  tail.quadraticCurveTo(-206, 4 + swimWag, -222, 54 + swimWag);
  tail.quadraticCurveTo(-194, 28 + swimWag, -172, 8 + swimWag);
  tail.closePath();
  kitFillRimAndStroke(ctx, tail, -220, -75 + swimWag, -170, 50 + swimWag, cLight, cMid, cDark, outline, 3.4);

  // Dorsal fin
  const dFin = new Path2D();
  dFin.moveTo(-58, -38);
  dFin.lineTo(-44, -76);
  dFin.lineTo(-24, -42);
  dFin.closePath();
  kitFillRimAndStroke(ctx, dFin, -55, -75, -25, -40, cLight, cMid, cDark, outline, 2.8);

  // Massive broad filter-feeding shark body
  const body = new Path2D();
  body.moveTo(-172, 8 + swimWag);
  body.bezierCurveTo(-118, -42, -18, -54, 88, -26);
  // Broad terminal flat mouth
  body.lineTo(128, -8);
  body.lineTo(128, 28);
  body.bezierCurveTo(86, 52, -118, 54, -172, 8 + swimWag);
  body.closePath();

  kitFillRimAndStroke(ctx, body, -165, -50, 120, 50, cLight, cMid, cDark, outline, 3.8);

  // 3 Longitudinal flank ridges & checkerboard spots
  ctx.save();
  ctx.clip(body);

  // Flank ridges
  ctx.strokeStyle = '#bae6fd';
  ctx.lineWidth = 2.0;
  for (const ry of [-16, 2, 20]) {
    ctx.beginPath();
    ctx.moveTo(80, ry);
    ctx.lineTo(-160, ry * 0.5 + swimWag * 0.5);
    ctx.stroke();
  }

  // Checkerboard grid of pale spots and vertical lines
  ctx.fillStyle = whiteSpots;
  ctx.strokeStyle = 'rgba(240, 249, 255, 0.4)';
  ctx.lineWidth = 1.2;
  for (let c = -4; c <= 2; c++) {
    const cx = c * 28;
    ctx.beginPath();
    ctx.moveTo(cx, -35);
    ctx.lineTo(cx, 40);
    ctx.stroke();

    for (let r = -2; r <= 2; r++) {
      const cy = r * 14;
      ctx.beginPath();
      ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5 Gill slits
  ctx.strokeStyle = '#0369a1';
  ctx.lineWidth = 2.0;
  for (let g = 0; g < 5; g++) {
    const gx = 64 + g * 5;
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx - 2, 22);
    ctx.stroke();
  }
  ctx.restore();

  // Pectoral fin
  const pFin = new Path2D();
  pFin.moveTo(34, 18);
  pFin.lineTo(68, 64);
  pFin.lineTo(18, 52);
  pFin.closePath();
  kitFillRimAndStroke(ctx, pFin, 15, 20, 65, 65, cLight, cMid, cDark, outline, 2.8);

  drawGlossyAnimalEye(ctx, 'left', 96, -14, 10, 11.5, 0, pose, IRIS_PALETTES.amber, cLight, cMid, outline);

  ctx.restore();
};

/* ============================================================================
 * A33: BLACKTIP REEF SHARK (Carcharhinus melanopterus)
 * Black fin tips with pale border, 5 gill slits, sleek fusiform body.
 * ========================================================================== */
const drawBlacktipReefShark: AnimalRig = (ctx, pose) => {
  const outline = '#17202a';
  const cLight = '#94a3b8';
  const cMid = '#475569';
  const cDark = '#1e293b';
  const belly = '#ffffff';

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const swimWag = Math.sin(pose.waveRaysPhase * 1.3) * 14;

  // Caudal tail with black lower lobe tip
  const tail = new Path2D();
  tail.moveTo(-168, 6 + swimWag);
  tail.quadraticCurveTo(-196, -48 + swimWag, -220, -68 + swimWag);
  tail.quadraticCurveTo(-198, 2 + swimWag, -212, 44 + swimWag);
  tail.quadraticCurveTo(-188, 22 + swimWag, -168, 6 + swimWag);
  tail.closePath();
  kitFillRimAndStroke(ctx, tail, -215, -65 + swimWag, -165, 40 + swimWag, cLight, cMid, cDark, outline, 3.2);

  // Black tip on lower caudal lobe
  ctx.save();
  ctx.clip(tail);
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-210, 40 + swimWag, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // First Dorsal Fin with dramatic jet-black apex tip!
  const dFin = new Path2D();
  dFin.moveTo(-42, -34);
  dFin.lineTo(-24, -78);
  dFin.quadraticCurveTo(-12, -64, -2, -38);
  dFin.closePath();
  kitFillRimAndStroke(ctx, dFin, -40, -78, 0, -35, cLight, cMid, cDark, outline, 2.8);

  ctx.save();
  ctx.clip(dFin);
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-24, -76, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(-24, -76, 14, 0.4, 2.4);
  ctx.stroke();
  ctx.restore();

  // Fusiform streamlined shark body
  const body = new Path2D();
  body.moveTo(-168, 6 + swimWag);
  body.bezierCurveTo(-112, -38, -12, -44, 88, -14);
  body.bezierCurveTo(128, 4, 118, 32, 78, 38);
  body.bezierCurveTo(8, 48, -112, 44, -168, 6 + swimWag);
  body.closePath();

  kitFillRimAndStroke(ctx, body, -160, -42, 115, 42, cLight, cMid, cDark, outline, 3.6);

  // White ventral countershading
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = belly;
  drawOvalSpot(ctx, 0, 32, 120, 24, 0);

  // 5 Gill slits
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.8;
  for (let g = 0; g < 5; g++) {
    const gx = 44 + g * 5;
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx - 2, 18);
    ctx.stroke();
  }
  ctx.restore();

  // Pectoral fin with black tip
  const pFin = new Path2D();
  pFin.moveTo(18, 14);
  pFin.lineTo(52, 58);
  pFin.lineTo(8, 44);
  pFin.closePath();
  kitFillRimAndStroke(ctx, pFin, 10, 15, 50, 60, cLight, cMid, cDark, outline, 2.8);

  ctx.save();
  ctx.clip(pFin);
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(50, 56, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawGlossyAnimalEye(ctx, 'left', 72, -4, 11.5, 13, 0, pose, IRIS_PALETTES.amber, cLight, cMid, outline);

  ctx.restore();
};

/* ============================================================================
 * A36: BLUESPOTTED RIBBONTAIL RAY (Taeniura lymma)
 * Electric-blue ocelli spots, undulating disc margin, striped spine tail.
 * ========================================================================== */
const drawBluespottedRay: AnimalRig = (ctx, pose) => {
  const outline = '#2b210c';
  const cLight = '#fde047';
  const cMid = '#d97706';
  const cDark = '#92400e';
  const electricBlue = '#38bdf8';

  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  const wave = Math.sin(pose.waveRaysPhase * 1.4) * 8;

  // Long tail with electric blue side stripes and venomous spines
  const tail = new Path2D();
  tail.moveTo(-92, 10);
  tail.lineTo(-242, 22 + wave);
  tail.lineTo(-242, 16 + wave);
  tail.lineTo(-92, 6);
  tail.closePath();
  kitFillRimAndStroke(ctx, tail, -240, 6, -90, 20, cLight, cMid, cDark, outline, 2.4);

  // Electric blue longitudinal tail stripes
  ctx.strokeStyle = electricBlue;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-96, 8);
  ctx.lineTo(-238, 19 + wave);
  ctx.stroke();

  // Oval Pectoral Disc with undulating wing margins
  const disc = new Path2D();
  disc.moveTo(94, 6);
  disc.bezierCurveTo(72, -54, -28, -62, -88, -26);
  disc.bezierCurveTo(-114, 0, -114, 22, -88, 38);
  disc.bezierCurveTo(-28, 68 + wave, 72, 62 + wave, 94, 6);
  disc.closePath();

  kitFillRimAndStroke(ctx, disc, -100, -60, 90, 65, cLight, cMid, cDark, outline, 3.6);

  // Vivid Electric Blue Spots (Taeniura lymma signature)
  ctx.save();
  ctx.clip(disc);
  for (const [bx, by, br] of [
    [-64, -12, 6.5],
    [-42, -32, 7.5],
    [-18, -42, 7.0],
    [16, -38, 7.5],
    [52, -24, 6.0],
    [-54, 18, 7.0],
    [-24, 34, 7.5],
    [18, 36, 7.0],
    [54, 22, 6.5],
    [-12, -4, 8.0],
    [24, 2, 7.5],
  ] as const) {
    ctx.fillStyle = electricBlue;
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Center brighter glow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bx - 1.5, by - 1.5, br * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Spiracles behind eyes
  ctx.fillStyle = '#451a03';
  drawOvalSpot(ctx, 38, -18, 5, 8, -0.3);

  drawGlossyAnimalEye(ctx, 'left', 48, -12, 11, 13, 0, pose, IRIS_PALETTES.amber, cLight, cMid, outline);

  ctx.restore();
};

export const MARINE_LARGE_RIGS: Record<string, AnimalRig> = {
  animal_27_dugong: drawDugong,
  animal_31_indo_pacific_humpback_dolphin: drawHumpbackDolphin,
  animal_32_false_killer_whale: drawFalseKillerWhale,
  animal_30_whale_shark: drawWhaleShark,
  animal_33_blacktip_reef_shark: drawBlacktipReefShark,
  animal_36_bluespotted_ribbontail_ray: drawBluespottedRay,
};
