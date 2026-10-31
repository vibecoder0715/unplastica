import type { TearDrop, TurtlePose } from './types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

const OUTLINE_DARK = '#254012';
const OUTLINE_SHELL = '#1b3610';
const SPOT_DARK = '#256829';
const HEAD_SPOT_COLOR = '#4d872d';

/**
 * Renders the complete rigged 2D turtle mascot onto a CanvasRenderingContext2D.
 * Every anatomical part (hind flippers, torso & plastron, carapace & scutes,
 * near/far front flippers, head, forehead spots, independent eyes, irises, pupils,
 * eyelids, eyebrows, morphing mouth & tongue, tears, and emotion symbols) is
 * reconstructed and articulated separately.
 */
let activeTurtle3D = false;
let activeTurtleYaw = 0;
let activeTurtlePitch = 0;

export function renderTurtle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pose: TurtlePose,
  tearDrops: TearDrop[],
  is3D = false,
  preview3D?: { yaw: number; pitch: number },
  opts?: { skipClear?: boolean; framingScale?: number },
): void {
  activeTurtle3D = is3D;
  activeTurtleYaw = is3D ? (preview3D?.yaw ?? 0) : 0;
  activeTurtlePitch = is3D ? (preview3D?.pitch ?? 0) : 0;

  if (!opts?.skipClear) {
    ctx.clearRect(0, 0, width, height);
  }

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Center and scale responsive to viewport (elevated cy and unconstrained lower scale prevent flippers/legs from being cut off)
  const cx = width * 0.5;
  const cy = height * 0.45;
  const baseRadius = Math.min(width, height * 1.08);
  const framing = opts?.framingScale ?? 1.0;
  const scale = clamp((baseRadius / 650) * framing, 0.05, 1.45);

  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Apply continuous horizontal direction turn (facing: +1 right, -1 left)
  const dirSign = pose.facing >= 0 ? 1 : -1;
  ctx.scale(dirSign, 1);

  if (is3D) {
    const cosYaw = Math.cos(activeTurtleYaw * 0.34);
    const cosPitch = Math.cos(activeTurtlePitch * 0.28);
    ctx.scale(cosYaw, cosPitch);
    ctx.transform(1, activeTurtlePitch * 0.06, -activeTurtleYaw * 0.08, 1, 0, 0);
  }

  // Subtle ambient shadow below the swimming turtle
  drawAmbientShadow(ctx, pose);

  // Root body transform (swimming buoyancy, breathing, emotion bounce)
  ctx.save();
  ctx.translate(pose.bodyX + activeTurtleYaw * 10, pose.bodyY + activeTurtlePitch * 8);
  ctx.rotate(pose.bodyRot + activeTurtleYaw * 0.03);
  ctx.scale(pose.bodyScaleX, pose.bodyScaleY);

  // 1. Far Hind Flipper (back-right leg peeking under belly)
  ctx.save();
  if (is3D) ctx.translate(-activeTurtleYaw * 14, -activeTurtlePitch * 8);
  drawFarHindFlipper(ctx, pose);
  ctx.restore();

  // 2. Near Hind Flipper (back-left leg extending below shell)
  ctx.save();
  if (is3D) ctx.translate(activeTurtleYaw * 8, activeTurtlePitch * 6);
  drawNearHindFlipper(ctx, pose);
  ctx.restore();

  // 3. Far Front Flipper (always drawn behind torso so shoulder root is 100% seamless in all emotions)
  ctx.save();
  if (is3D) ctx.translate(-activeTurtleYaw * 16, -activeTurtlePitch * 10);
  drawFarFrontFlipper(ctx, pose);
  ctx.restore();

  // 4. Torso, Plastron (Creamy segmented underbelly strictly clipped inside torso) & Neck
  drawPlastronAndNeck(ctx, pose);

  // 5. Carapace (Upper Shell dome overhanging the top-left of torso, with inset scutes)
  ctx.save();
  if (is3D) ctx.translate(activeTurtleYaw * 6, -activeTurtlePitch * 10);
  drawCarapace(ctx, pose);
  ctx.restore();

  // 7. Near Front Flipper (anchored at shoulder, turning naturally towards the right with a smaller angle)
  ctx.save();
  if (is3D) ctx.translate(activeTurtleYaw * 16, activeTurtlePitch * 10);
  drawNearFrontFlipper(ctx, pose);
  ctx.restore();

  // 8. Articulated Head Group (Cranium, Spots, Blush, Smaller Eyes, Eyebrows, Snout, Morphing Mouth, Tears)
  ctx.save();
  if (is3D) ctx.translate(activeTurtleYaw * 18, activeTurtlePitch * 12);
  drawHeadGroup(ctx, pose, tearDrops);
  ctx.restore();

  // 11. Emotion Effect Symbols (Waving rays, Describing rays, Laugh marks, Question mark, Angry vein)
  drawEmotionProps(ctx, pose);

  ctx.restore();
  ctx.restore();
}

function drawAmbientShadow(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
  ctx.save();
  const shadowY = 238 - pose.bodyY * 0.2;
  const shadowScale = 1 - pose.bodyY * 0.003;
  ctx.translate(-15 + activeTurtleYaw * -16, shadowY + activeTurtlePitch * 12);
  ctx.scale(shadowScale, 0.22 + (activeTurtle3D ? activeTurtlePitch * 0.05 : 0));
  const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 200);
  if (activeTurtle3D) {
    grad.addColorStop(0, 'rgba(30, 68, 35, 0.28)');
    grad.addColorStop(0.55, 'rgba(55, 105, 55, 0.12)');
    grad.addColorStop(1, 'rgba(55, 105, 55, 0)');
  } else {
    grad.addColorStop(0, 'rgba(110, 145, 95, 0.12)');
    grad.addColorStop(0.6, 'rgba(110, 145, 95, 0.05)');
    grad.addColorStop(1, 'rgba(110, 145, 95, 0)');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFarHindFlipper(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
  ctx.save();
  ctx.translate(-48, 108);
  ctx.rotate(pose.hindFarAngle);

  const path = new Path2D();
  path.moveTo(-18, -10);
  path.bezierCurveTo(-36, 25, -40, 78, -14, 98);
  path.bezierCurveTo(10, 114, 42, 86, 38, 42);
  path.bezierCurveTo(35, 12, 14, -8, -18, -10);
  path.closePath();

  const grad = ctx.createLinearGradient(-30, -10, 25, 100);
  grad.addColorStop(0, '#689e24');
  grad.addColorStop(0.55, '#86bf36');
  grad.addColorStop(1, '#a2d648');
  ctx.fillStyle = grad;
  ctx.fill(path);

  ctx.lineWidth = 3.2;
  ctx.strokeStyle = OUTLINE_DARK;
  ctx.stroke(path);

  ctx.fillStyle = SPOT_DARK;
  drawOvalSpot(ctx, -15, 48, 8, 12, 0.2);
  drawOvalSpot(ctx, -11, 74, 7.5, 10.5, 0.1);
  drawOvalSpot(ctx, 8, 66, 10.5, 15, -0.15);
  drawOvalSpot(ctx, 21, 46, 5.5, 8.5, -0.2);

  ctx.restore();
}

function drawNearHindFlipper(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
  ctx.save();
  ctx.translate(-138, 72);
  ctx.rotate(pose.hindNearAngle);

  const path = new Path2D();
  path.moveTo(18, -16);
  path.bezierCurveTo(-32, -10, -96, 22, -116, 64);
  path.bezierCurveTo(-130, 94, -106, 122, -72, 114);
  path.bezierCurveTo(-30, 104, 16, 56, 36, 12);
  path.closePath();

  const grad = ctx.createLinearGradient(-110, 15, -10, 105);
  grad.addColorStop(0, '#d2f262');
  grad.addColorStop(0.45, '#96cf3c');
  grad.addColorStop(0.85, '#6da627');
  grad.addColorStop(1, '#8bc438');
  ctx.fillStyle = grad;
  ctx.fill(path);

  ctx.save();
  ctx.clip(path);
  ctx.strokeStyle = 'rgba(244, 255, 160, 0.72)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(8, -12);
  ctx.bezierCurveTo(-36, -6, -90, 24, -112, 62);
  ctx.stroke();
  ctx.restore();

  ctx.lineWidth = 3.4;
  ctx.strokeStyle = OUTLINE_DARK;
  ctx.stroke(path);

  ctx.fillStyle = SPOT_DARK;
  drawOvalSpot(ctx, -54, 48, 24, 16, -0.55);
  drawOvalSpot(ctx, -93, 62, 11, 8, -0.5);
  drawOvalSpot(ctx, -90, 84, 12, 9, -0.45);
  drawOvalSpot(ctx, -68, 94, 10, 7, -0.4);
  drawOvalSpot(ctx, -26, 20, 10, 6, -0.5);

  ctx.fillStyle = 'rgba(235, 255, 175, 0.78)';
  drawOvalSpot(ctx, -66, 36, 5, 3, -0.5);

  ctx.restore();
}

function drawCarapace(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
  ctx.save();
  ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
  ctx.rotate(pose.shellRot);

  // Outer domed carapace silhouette aligned with the bottom belly width (-204 to +84)
  const shellPath = new Path2D();
  shellPath.moveTo(-204, 30);
  shellPath.bezierCurveTo(-212, 22, -210, 6, -200, -12);
  shellPath.bezierCurveTo(-174, -72, -116, -130, -32, -130);
  shellPath.bezierCurveTo(26, -130, 70, -80, 84, -10);
  shellPath.bezierCurveTo(44, 26, -104, 46, -204, 30);
  shellPath.closePath();

  // Inset clip path so scutes and their strokes stay 100% inside the shell rim without overflowing
  const innerClipPath = new Path2D();
  innerClipPath.moveTo(-197, 25);
  innerClipPath.bezierCurveTo(-203, 18, -202, 6, -193, -10);
  innerClipPath.bezierCurveTo(-168, -66, -112, -122, -32, -122);
  innerClipPath.bezierCurveTo(22, -122, 64, -74, 77, -10);
  innerClipPath.bezierCurveTo(40, 21, -102, 40, -197, 25);
  innerClipPath.closePath();

  // Bright yellow-lime ridge base fill
  const baseGrad = ctx.createLinearGradient(-180, -130, -20, 45);
  baseGrad.addColorStop(0, '#e5fa75');
  baseGrad.addColorStop(0.5, '#b7e34a');
  baseGrad.addColorStop(1, '#7cb32b');
  ctx.fillStyle = baseGrad;
  ctx.fill(shellPath);

  ctx.save();
  ctx.clip(innerClipPath);

  // Draw individual recessed polygonal scutes well inside the shell rim
  const mainScutes: Array<[number, number][]> = [
    [
      [-164, -26],
      [-130, -86],
      [-74, -112],
      [-64, -62],
      [-116, -16],
    ],
    [
      [-68, -114],
      [-8, -118],
      [24, -82],
      [-14, -52],
      [-58, -60],
    ],
    [
      [-186, 10],
      [-162, -20],
      [-112, -12],
      [-96, 14],
      [-148, 21],
    ],
    [
      [-106, -10],
      [-56, -52],
      [-8, -44],
      [12, 0],
      [-86, 14],
    ],
  ];

  for (const pts of mainScutes) {
    drawShellScute(ctx, pts, false);
  }

  // Marginal rim scutes along lower edge of carapace (strictly inset inside innerClipPath)
  const rimScutes: Array<[number, number][]> = [
    [
      [-195, 24],
      [-180, 12],
      [-150, 19],
      [-162, 31],
    ],
    [
      [-156, 32],
      [-142, 19],
      [-102, 15],
      [-114, 32],
    ],
    [
      [-108, 32],
      [-96, 14],
      [-52, 8],
      [-64, 27],
    ],
    [
      [-56, 26],
      [-44, 7],
      [-6, 2],
      [-16, 19],
    ],
  ];

  for (const pts of rimScutes) {
    drawShellScute(ctx, pts, true);
  }

  ctx.restore();

  // Subtle golden-lime rim highlight just above the lower shell edge
  ctx.save();
  ctx.clip(shellPath);
  if (activeTurtle3D) {
    // 3D spherical dome specular zenith + deep lower overhang ambient occlusion
    const domeSpec = ctx.createRadialGradient(
      -92 - activeTurtleYaw * 28,
      -88 - activeTurtlePitch * 22,
      8,
      -68,
      -54,
      148,
    );
    domeSpec.addColorStop(0, 'rgba(255, 255, 210, 0.52)');
    domeSpec.addColorStop(0.45, 'rgba(230, 255, 140, 0.18)');
    domeSpec.addColorStop(1, 'rgba(20, 55, 12, 0.32)');
    ctx.fillStyle = domeSpec;
    ctx.fill(shellPath);
  }
  ctx.strokeStyle = 'rgba(225, 250, 115, 0.65)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-200, 27);
  ctx.bezierCurveTo(-102, 42, 40, 24, 80, -8);
  ctx.stroke();
  ctx.restore();

  // Crisp outer shell outline with round join
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE_SHELL;
  ctx.stroke(shellPath);

  ctx.restore();
}

function drawShellScute(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  isRim: boolean,
): void {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of pts) {
    cx += x;
    cy += y;
  }
  cx /= pts.length;
  cy /= pts.length;

  ctx.save();
  traceRoundedPolygon(ctx, pts, isRim ? 5 : 10);

  const grad = ctx.createRadialGradient(
    cx - 10 - activeTurtleYaw * 8,
    cy - 10 - activeTurtlePitch * 8,
    4,
    cx,
    cy,
    isRim ? 34 : 66,
  );
  grad.addColorStop(0, activeTurtle3D ? '#43a047' : '#2e7d38');
  grad.addColorStop(0.55, '#1b5725');
  grad.addColorStop(1, activeTurtle3D ? '#0a2910' : '#103b19');
  ctx.fillStyle = grad;
  ctx.fill();

  if (!isRim) {
    ctx.save();
    ctx.clip();
    for (const scaleFactor of [0.78, 0.56, 0.34]) {
      const ringPts: [number, number][] = pts.map(([x, y]) => [
        cx + (x - cx) * scaleFactor,
        cy + (y - cy) * scaleFactor,
      ]);
      traceRoundedPolygon(ctx, ringPts, 6);
      ctx.strokeStyle = activeTurtle3D
        ? 'rgba(195, 250, 130, 0.30)'
        : 'rgba(155, 225, 88, 0.20)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    if (activeTurtle3D) {
      // 3D pyramidal scute facets radiating from apex to corners
      ctx.strokeStyle = 'rgba(220, 255, 160, 0.22)';
      ctx.lineWidth = 1.4;
      for (const [px, py] of pts) {
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 4);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
      // Biological Chelonia mydas radiating marbled keratin streaks + 3D pyramidal scute facets
      ctx.strokeStyle = activeTurtle3D
        ? 'rgba(220, 255, 160, 0.26)'
        : 'rgba(210, 250, 140, 0.18)';
      ctx.lineWidth = 1.4;
      for (const [px, py] of pts) {
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 3);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  ctx.strokeStyle = '#a8dc44';
  ctx.lineWidth = isRim ? 1.8 : 2.4;
  ctx.stroke();
  ctx.restore();
}

    function traceRoundedPolygon(
      ctx: CanvasRenderingContext2D,
      pts: [number, number][],
      radius: number,
    ): void {
      ctx.beginPath();
      const n = pts.length;
      for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n];
        const p1 = pts[i];
        const p2 = pts[(i + 1) % n];

        const v1x = p0[0] - p1[0];
        const v1y = p0[1] - p1[1];
        const v2x = p2[0] - p1[0];
        const v2y = p2[1] - p1[1];
        const l1 = Math.hypot(v1x, v1y) || 1;
        const l2 = Math.hypot(v2x, v2y) || 1;
        const r = Math.min(radius, l1 * 0.4, l2 * 0.4);

        const sx = p1[0] + (v1x / l1) * r;
        const sy = p1[1] + (v1y / l1) * r;
        const ex = p1[0] + (v2x / l2) * r;
        const ey = p1[1] + (v2y / l2) * r;

        if (i === 0) {
          ctx.moveTo(sx, sy);
        } else {
          ctx.lineTo(sx, sy);
        }
        ctx.quadraticCurveTo(p1[0], p1[1], ex, ey);
      }
      ctx.closePath();
    }

    function drawPlastronAndNeck(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
      ctx.save();
      ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
      ctx.rotate(pose.shellRot);

      const breathExpand = pose.breath * 1.7;

      // Overall green bottom belly (+6% size adjustment)
      const torsoPath = new Path2D();
      torsoPath.moveTo(-176, 30);
      torsoPath.bezierCurveTo(-100, 14, 12, 6, 83, 28);
      torsoPath.bezierCurveTo(94, 60, 72, 107 + breathExpand, 18, 122 + breathExpand);
      torsoPath.bezierCurveTo(-52, 138 + breathExpand, -149, 109 + breathExpand, -176, 30);
      torsoPath.closePath();

      const skinGrad = ctx.createLinearGradient(-90, 10, 38, 126);
      skinGrad.addColorStop(0, '#b5e349');
      skinGrad.addColorStop(0.55, '#8ec736');
      skinGrad.addColorStop(1, '#6ca324');
      ctx.fillStyle = skinGrad;
      ctx.fill(torsoPath);

      // Clip strictly inside torsoPath so the peach plastron (belly) never overflows outside the green body
      ctx.save();
      ctx.clip(torsoPath);

      // Peach/cream plastron (+10% size adjustment) nestled cleanly inside the green bottom belly
      const bellyPath = new Path2D();
      bellyPath.moveTo(-121, 66);
      bellyPath.bezierCurveTo(-124, 55, -86, 51, -33, 51);
      bellyPath.bezierCurveTo(11, 51, 39, 57, 41, 73);
      bellyPath.bezierCurveTo(44, 100, 13, 123 + breathExpand, -36, 127 + breathExpand);
      bellyPath.bezierCurveTo(-84, 131 + breathExpand, -117, 96, -121, 66);
      bellyPath.closePath();

      const bellyGrad = ctx.createLinearGradient(-25, 51, -52, 127);
      bellyGrad.addColorStop(0, '#edd69f');
      bellyGrad.addColorStop(0.6, '#d6b779');
      bellyGrad.addColorStop(1, '#ba9858');
      ctx.fillStyle = bellyGrad;
      ctx.fill(bellyPath);

      // Individual soft rounded peach/cream plastron scute plates (+10% scale) clipped inside bellyPath
      ctx.save();
      ctx.clip(bellyPath);

      const bellyPlates: Array<[number, number][]> = [
        // Front-left plate
        [
          [-97, 56],
          [-20, 54],
          [-27, 77],
          [-95, 73],
        ],
        // Front-right plate
        [
          [-14, 54],
          [35, 60],
          [30, 81],
          [-20, 77],
        ],
        // Mid-left plate
        [
          [-113, 76],
          [-29, 82],
          [-38, 102],
          [-104, 96],
        ],
        // Mid-right plate
        [
          [-22, 82],
          [28, 85],
          [15, 104],
          [-31, 102],
        ],
        // Rear-left plate
        [
          [-97, 99],
          [-40, 106],
          [-49, 124],
          [-86, 117],
        ],
        // Rear-right plate
        [
          [-33, 106],
          [11, 108],
          [-9, 124],
          [-42, 124],
        ],
      ];

      for (const plate of bellyPlates) {
        traceRoundedPolygon(ctx, plate, 6);
        const pGrad = ctx.createLinearGradient(-10, 52, -38, 124);
        pGrad.addColorStop(0, '#fbf0cc');
        pGrad.addColorStop(0.65, '#edd59f');
        pGrad.addColorStop(1, '#d9bc82');
        ctx.fillStyle = pGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 252, 232, 0.72)';
        ctx.lineWidth = 1.45;
        ctx.stroke();
      }

      ctx.restore(); // exit bellyPath clip

      // Soft tan border separating peach plastron from green belly skin
      ctx.lineWidth = 1.9;
      ctx.strokeStyle = 'rgba(148, 118, 62, 0.65)';
      ctx.stroke(bellyPath);

      // Soft neck skin folds under the chin & throat
      ctx.strokeStyle = 'rgba(78, 128, 26, 0.6)';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(-16, 30);
      ctx.quadraticCurveTo(14, 40, 40, 35);
      ctx.moveTo(-22, 41);
      ctx.quadraticCurveTo(10, 50, 36, 44);
      ctx.stroke();

      ctx.restore(); // exit torsoPath clip

      // Draw crisp outer torso outline AFTER the clipped plastron so nothing ever overflows
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = OUTLINE_DARK;
      ctx.stroke(torsoPath);

      ctx.restore();
    }

    function drawFarFrontFlipper(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
      ctx.save();

      const chinAmt = pose.farFlipperChinAmount;
      const raiseAmt = pose.farFlipperRaiseAmount;
      const liftRight = Math.max(chinAmt * 0.42, raiseAmt * 0.48);

      // Anchored behind torso at natural far shoulder (64, 62), turning smoothly towards the right with a smaller angle
      ctx.translate(64, 62);
      const baseRot = -0.08 - liftRight + pose.farFlipperAngle * 0.45;
      ctx.rotate(baseRot);

      const bendOffset = pose.farFlipperBend * 16;

      const path = new Path2D();
      path.moveTo(-16, -12);
      path.bezierCurveTo(
        38,
        -12 + bendOffset * 0.3,
        122,
        34 + bendOffset * 0.6,
        168,
        126 + bendOffset,
      );
      path.bezierCurveTo(
        180,
        152 + bendOffset,
        158,
        168 + bendOffset,
        128,
        148 + bendOffset * 0.8,
      );
      path.bezierCurveTo(68, 108 + bendOffset * 0.4, 16, 54, -14, 14);
      path.closePath();

      const grad = ctx.createLinearGradient(0, -15, 160, 155);
      grad.addColorStop(0, '#daf566');
      grad.addColorStop(0.5, '#9ed43e');
      grad.addColorStop(1, '#6ea625');
      ctx.fillStyle = grad;
      ctx.fill(path);

      ctx.save();
      ctx.clip(path);
      ctx.strokeStyle = 'rgba(246, 255, 165, 0.72)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      ctx.bezierCurveTo(40, -10, 118, 36, 164, 124 + bendOffset);
      ctx.stroke();
      ctx.restore();

      ctx.lineWidth = 3.5;
      ctx.strokeStyle = OUTLINE_DARK;
      ctx.stroke(path);

      ctx.fillStyle = SPOT_DARK;
      drawOvalSpot(ctx, 78, 58 + bendOffset * 0.45, 23, 14, 0.72);
      drawOvalSpot(ctx, 132, 114 + bendOffset * 0.8, 18, 10, 0.82);
      drawOvalSpot(ctx, 46, 18 + bendOffset * 0.2, 14, 7, 0.62);
      drawOvalSpot(ctx, 96, 34 + bendOffset * 0.35, 9, 6, 0.68);

      ctx.restore();
    }

    function drawNearFrontFlipper(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
      ctx.save();

      const downAmt = pose.nearFlipperDownAmount;
      const tuckAmt = pose.nearFlipperTuckAmount;
      const waveAmt = clamp(1 - downAmt - tuckAmt, 0, 1);

      // Phase 1: Wave points AWAY from the facing direction (+X) at a 120° rear-upper offset (-120° from +X)
      // Semicircular shoulder ball-joint at (-64, 34) keeps the flipper 100% seamlessly socketed at any angle.
      ctx.translate(-64, 34);
      const waveOffset120Rad = 2.31 * waveAmt - 0.34 * tuckAmt + pose.nearFlipperAngle * (0.45 + 0.24 * waveAmt);
      ctx.rotate(waveOffset120Rad);
      const bend = pose.nearFlipperBend * 14;

      const path = new Path2D();
      path.arc(0, 0, 18, Math.PI, 0, false);
      path.bezierCurveTo(24, 10, 28, 40, 22, 80);
      path.bezierCurveTo(16 + bend * 0.6, 142, -26 + bend, 174, -48 + bend, 150);
      path.bezierCurveTo(-78 + bend * 0.4, 96, -52, 26, -18, 0);
      path.closePath();

      const grad = ctx.createLinearGradient(-70, -10, 22, 150);
      grad.addColorStop(0, '#dcf668');
      grad.addColorStop(0.5, '#9ed43e');
      grad.addColorStop(1, '#6ea625');
      ctx.fillStyle = grad;
      ctx.fill(path);

      ctx.save();
      ctx.clip(path);
      ctx.strokeStyle = 'rgba(248, 255, 180, 0.75)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(8, -4);
      ctx.bezierCurveTo(20, 36, 22, 82, -22 + bend * 0.8, 148);
      ctx.stroke();
      ctx.restore();

      ctx.lineWidth = 3.5;
      ctx.strokeStyle = OUTLINE_DARK;
      ctx.stroke(path);

      ctx.fillStyle = SPOT_DARK;
      drawOvalSpot(ctx, -26 + bend * 0.3, 66, 20, 13, -0.32);
      drawOvalSpot(ctx, -36 + bend * 0.6, 108, 17, 12, -0.28);
      drawOvalSpot(ctx, -4 + bend * 0.5, 110, 11, 8, -0.22);
      drawOvalSpot(ctx, -4, 32, 11, 7, -0.32);
      drawOvalSpot(ctx, -34, 36, 9, 6, -0.28);

      ctx.restore();
    }

    function drawHeadGroup(
      ctx: CanvasRenderingContext2D,
      pose: TurtlePose,
      tearDrops: TearDrop[],
    ): void {
      ctx.save();

      // Head pivot at base of cranium
      ctx.translate(42 + pose.headX, -18 + pose.headY);
      ctx.rotate(pose.headRot);
      ctx.scale(pose.headScaleX, pose.headScaleY);

      const lookX = pose.headLookX * 16;
      const lookY = pose.headLookY * 12;

      // 1. Cranium silhouette
      const headPath = createHeadPath();

      const headGrad = ctx.createRadialGradient(
        -10 + lookX * 0.4 - activeTurtleYaw * 24,
        -95 + lookY * 0.4 - activeTurtlePitch * 18,
        18,
        10,
        -15,
        185,
      );
      headGrad.addColorStop(0, '#f3ff8c');
      headGrad.addColorStop(0.28, '#d9f465');
      headGrad.addColorStop(0.68, '#ace047');
      headGrad.addColorStop(0.9, '#8bc435');
      headGrad.addColorStop(1, activeTurtle3D ? '#4d7a14' : '#74ab27');
      ctx.fillStyle = headGrad;
      ctx.fill(headPath);

      ctx.save();
      ctx.clip(headPath);

      const jawShadow = ctx.createLinearGradient(0, 28, 0, 105);
      jawShadow.addColorStop(0, 'rgba(110, 168, 38, 0)');
      jawShadow.addColorStop(1, activeTurtle3D ? 'rgba(32, 62, 10, 0.55)' : 'rgba(92, 145, 28, 0.4)');
      ctx.fillStyle = jawShadow;
      ctx.fillRect(-160, 28, 320, 85);

      if (activeTurtle3D) {
        // 3D Cranium Specular Dome & Subsurface Cheek Cushion
        const specDome = ctx.createRadialGradient(
          -26 + lookX * 0.35 - activeTurtleYaw * 22,
          -88 + lookY * 0.35 - activeTurtlePitch * 16,
          8,
          -20,
          -82,
          115,
        );
        specDome.addColorStop(0, 'rgba(255, 255, 240, 0.52)');
        specDome.addColorStop(0.45, 'rgba(255, 255, 210, 0.16)');
        specDome.addColorStop(1, 'rgba(255, 255, 210, 0)');
        ctx.fillStyle = specDome;
        ctx.fillRect(-150, -155, 300, 260);

        // 3D Recessed Orbital Eye Socket Shadows
        ctx.fillStyle = 'rgba(38, 72, 14, 0.24)';
        ctx.beginPath();
        ctx.ellipse(-42 + lookX * 0.85, -18 + lookY * 0.85, 31, 35, -0.12, 0, Math.PI * 2);
        ctx.ellipse(94 + lookX * 0.85, -2 + lookY * 0.85, 25, 30, 0.16, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(250, 255, 195, 0.85)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-110, -25);
      ctx.bezierCurveTo(-96, -98, -32, -144, 42, -138);
      ctx.stroke();

      drawForeheadAndTempleSpots(ctx, lookX, lookY);

      if (pose.blushAlpha > 0.01) {
        drawCheekBlushes(ctx, pose.blushAlpha, lookX, lookY);
      }

      ctx.restore();

      ctx.lineWidth = 3.8;
      ctx.strokeStyle = OUTLINE_DARK;
      ctx.stroke(headPath);

      // 2. Nose / Nostrils & Snout Highlight
      drawSnoutAndNostrils(ctx, lookX, lookY);

      // 3. Morphing Mouth (positioned with generous clearance below the eyes!)
      drawMouth(ctx, pose, lookX, lookY);

      // 4. Left Eye (near eye) & Right Eye (far eye) - Increased by 20% per user feedback
      drawEye(ctx, 'left', -42 + lookX * 0.85, -18 + lookY * 0.85, 26.4, 31.2, -0.12, pose);
      drawEye(ctx, 'right', 94 + lookX * 0.85, -2 + lookY * 0.85, 21.6, 26.4, 0.16, pose);

      // 5. Expressive Eyebrows
      drawEyebrows(ctx, pose, lookX, lookY);

      // 6. Crying Tear Streams & Falling Droplets
      if (pose.tearsAlpha > 0.01) {
        drawTearsAndDroplets(ctx, pose, tearDrops, lookX, lookY);
      }

      ctx.restore();
    }

    function createHeadPath(): Path2D {
      const path = new Path2D();
      path.moveTo(14, -142);
      path.bezierCurveTo(88, -138, 146, -78, 146, 4);
      path.bezierCurveTo(146, 68, 98, 98, 12, 92);
      path.bezierCurveTo(-78, 86, -132, 48, -124, -22);
      path.bezierCurveTo(-116, -96, -58, -144, 14, -142);
      path.closePath();
      return path;
    }

    function drawForeheadAndTempleSpots(
      ctx: CanvasRenderingContext2D,
      lookX: number,
      lookY: number,
    ): void {
      ctx.save();
      ctx.translate(lookX * 0.65, lookY * 0.65);

      const spotGrad = ctx.createLinearGradient(0, -140, 20, -45);
      spotGrad.addColorStop(0, '#6aa63c');
      spotGrad.addColorStop(1, HEAD_SPOT_COLOR);
      ctx.fillStyle = spotGrad;

      const mainShield: [number, number][] = [
        [-12, -126],
        [46, -122],
        [64, -92],
        [26, -78],
        [-18, -96],
      ];
      traceRoundedPolygon(ctx, mainShield, 11);
      ctx.fill();

      const lowerTriangle: [number, number][] = [
        [4, -72],
        [42, -68],
        [22, -42],
      ];
      traceRoundedPolygon(ctx, lowerTriangle, 8);
      ctx.fill();

      drawOvalSpot(ctx, -38, -128, 18, 7, -0.35);
      drawOvalSpot(ctx, 18, -138, 16, 5, 0.08);
      drawOvalSpot(ctx, 68, -118, 14, 6, 0.45);

      ctx.fillStyle = '#5c9635';
      drawOvalSpot(ctx, -104, -18, 8.5, 12, -0.15);
      drawOvalSpot(ctx, -96, 6, 6.5, 8.5, 0.1);
      drawOvalSpot(ctx, -114, 2, 4.5, 6.5, 0);

      ctx.restore();
    }

    function drawCheekBlushes(
      ctx: CanvasRenderingContext2D,
      alpha: number,
      lookX: number,
      lookY: number,
    ): void {
      ctx.save();
      ctx.translate(lookX * 0.8, lookY * 0.8);

      const leftGrad = ctx.createRadialGradient(-68, 22, 2, -68, 22, 32);
      leftGrad.addColorStop(0, `rgba(255, 118, 92, ${0.65 * alpha})`);
      leftGrad.addColorStop(1, 'rgba(255, 118, 92, 0)');
      ctx.fillStyle = leftGrad;
      ctx.beginPath();
      ctx.ellipse(-68, 22, 32, 18, 0.15, 0, Math.PI * 2);
      ctx.fill();

      const rightGrad = ctx.createRadialGradient(104, 44, 2, 104, 44, 28);
      rightGrad.addColorStop(0, `rgba(255, 118, 92, ${0.65 * alpha})`);
      rightGrad.addColorStop(1, 'rgba(255, 118, 92, 0)');
      ctx.fillStyle = rightGrad;
      ctx.beginPath();
      ctx.ellipse(104, 44, 28, 16, 0.2, 0, Math.PI * 2);
      ctx.fill();

      if (alpha > 0.45) {
        ctx.strokeStyle = `rgba(255, 220, 195, ${(alpha - 0.45) * 1.1})`;
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-74, 18);
        ctx.lineTo(-68, 22);
        ctx.moveTo(-62, 19);
        ctx.lineTo(-56, 23);
        ctx.moveTo(98, 41);
        ctx.lineTo(104, 45);
        ctx.moveTo(108, 43);
        ctx.lineTo(114, 47);
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawSnoutAndNostrils(
      ctx: CanvasRenderingContext2D,
      lookX: number,
      lookY: number,
    ): void {
      ctx.save();
      ctx.translate(lookX, lookY);

      const noseGlow = ctx.createRadialGradient(28, 2, 2, 28, 2, 22);
      noseGlow.addColorStop(0, 'rgba(246, 255, 175, 0.65)');
      noseGlow.addColorStop(1, 'rgba(246, 255, 175, 0)');
      ctx.fillStyle = noseGlow;
      ctx.beginPath();
      ctx.arc(28, 2, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3b691e';
      drawOvalSpot(ctx, 18, 10, 3.0, 2.0, 0.35);
      drawOvalSpot(ctx, 38, 14, 2.8, 1.9, -0.25);

      ctx.restore();
    }

    function drawEye(
      ctx: CanvasRenderingContext2D,
      side: 'left' | 'right',
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      tilt: number,
      pose: TurtlePose,
    ): void {
      ctx.save();
      ctx.translate(cx, cy);

      const laughAmt = pose.laughEyeAmount;
      if (laughAmt > 0.85) {
        drawLaughingClosedEye(ctx, side, rx, ry, tilt);
        ctx.restore();
        return;
      }

      ctx.rotate(tilt);

      const angryAmt = pose.angryLidAmount;

      const eyeSocketPath = new Path2D();
      const innerDrop = ry * 0.42 * angryAmt;
      const outerLift = -ry * 0.56 * angryAmt;
      const cutLeftY = side === 'left' ? outerLift : innerDrop;
      const cutRightY = side === 'left' ? innerDrop : outerLift;

      eyeSocketPath.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);

      ctx.save();
      ctx.clip(eyeSocketPath);

      if (angryAmt > 0.05) {
        ctx.beginPath();
        ctx.moveTo(-rx * 1.4, cutLeftY);
        ctx.lineTo(rx * 1.4, cutRightY);
        ctx.lineTo(rx * 1.4, ry * 1.5);
        ctx.lineTo(-rx * 1.4, ry * 1.5);
        ctx.closePath();
        ctx.clip();
      }

      // Crisp white sclera fill
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-rx * 1.2, -ry * 1.2, rx * 2.4, ry * 2.4);

      const scleraShadow = ctx.createLinearGradient(0, -ry, 0, -ry * 0.15);
      scleraShadow.addColorStop(0, 'rgba(175, 200, 185, 0.48)');
      scleraShadow.addColorStop(1, 'rgba(175, 200, 185, 0)');
      ctx.fillStyle = scleraShadow;
      ctx.fillRect(-rx, -ry, rx * 2, ry);

      // Iris & Pupil Group
      const scleraCrescentOffset = side === 'left' ? 4.5 : -3.8;
      const irisX = scleraCrescentOffset + pose.eyeGazeX * 10;
      const irisY = 1.5 + pose.eyeGazeY * 8;
      const irisRx = rx * 0.84 * pose.pupilScale;
      const irisRy = ry * 0.88 * pose.pupilScale;

      const irisGrad = ctx.createLinearGradient(irisX, irisY - irisRy, irisX, irisY + irisRy);
      irisGrad.addColorStop(0, '#071f0d');
      irisGrad.addColorStop(0.45, '#0e3d19');
      irisGrad.addColorStop(0.8, '#1e7d2c');
      irisGrad.addColorStop(1, '#48c73f');
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.ellipse(irisX, irisY, irisRx, irisRy, 0, 0, Math.PI * 2);
      ctx.fill();

      const glowGrad = ctx.createRadialGradient(
        irisX + (side === 'left' ? 5 : -3),
        irisY + irisRy * 0.45,
        2,
        irisX,
        irisY + irisRy * 0.25,
        irisRx * 0.85,
      );
      glowGrad.addColorStop(0, '#62e854');
      glowGrad.addColorStop(0.55, 'rgba(40, 165, 58, 0.5)');
      glowGrad.addColorStop(1, 'rgba(14, 61, 25, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.ellipse(irisX, irisY, irisRx * 0.92, irisRy * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#061008';
      ctx.beginPath();
      ctx.ellipse(
        irisX + (side === 'left' ? 1.5 : -1),
        irisY - 1.5,
        irisRx * 0.64,
        irisRy * 0.66,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Specular Eye Highlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(
        irisX + irisRx * 0.28,
        irisY - irisRy * 0.34,
        rx * 0.23,
        ry * 0.22,
        -0.2,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.beginPath();
      ctx.arc(irisX - irisRx * 0.32, irisY + irisRy * 0.24, rx * 0.095, 0, Math.PI * 2);
      ctx.fill();

      if (pose.wateryShine > 0.1) {
        ctx.fillStyle = `rgba(220, 250, 255, ${0.85 * pose.wateryShine})`;
        ctx.beginPath();
        ctx.ellipse(
          irisX - irisRx * 0.1,
          irisY + irisRy * 0.58,
          rx * 0.32,
          ry * 0.11,
          0.1,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      if (pose.eyeSparkleAmount > 0.05) {
        ctx.save();
        ctx.globalAlpha = clamp(pose.eyeSparkleAmount, 0, 1);
        ctx.fillStyle = '#fff9c4';
        drawFourPointStar(
          ctx,
          irisX - irisRx * 0.24,
          irisY - irisRy * 0.1,
          rx * 0.22,
          rx * 0.07,
        );
        ctx.restore();
      }

      // Heavy half-closed droopy sleepy eyelid ('sleepy' emotion)
      const sleepyAmt = pose.sleepyLidAmount;
      if (sleepyAmt > 0.02) {
        const sleepyLidY = lerp(-ry * 1.1, ry * 0.12, sleepyAmt);
        const lidGrad = ctx.createLinearGradient(0, -ry, 0, sleepyLidY + 8);
        lidGrad.addColorStop(0, '#c4ef58');
        lidGrad.addColorStop(1, '#98cf38');
        ctx.fillStyle = lidGrad;
        ctx.beginPath();
        ctx.moveTo(-rx * 1.3, -ry * 1.3);
        ctx.lineTo(rx * 1.3, -ry * 1.3);
        ctx.lineTo(rx * 1.3, sleepyLidY + 4);
        ctx.quadraticCurveTo(0, sleepyLidY + 8, -rx * 1.3, sleepyLidY + 2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#121c0b';
        ctx.lineWidth = 5.4;
        ctx.beginPath();
        ctx.moveTo(-rx * 1.1, sleepyLidY + 2);
        ctx.quadraticCurveTo(0, sleepyLidY + 8, rx * 1.1, sleepyLidY + 4);
        ctx.stroke();
      }

      // Smooth Eyelid Blinking
      const effectiveBlink = clamp(pose.blinkAmount + laughAmt * 0.9, 0, 1);
      if (effectiveBlink > 0.01) {
        const lidY = lerp(-ry * 1.15, ry * 0.95, effectiveBlink);
        ctx.fillStyle = '#b4e34b';
        ctx.beginPath();
        ctx.rect(-rx * 1.2, -ry * 1.2, rx * 2.4, lidY + ry * 1.2);
        ctx.fill();

        ctx.strokeStyle = '#10180a';
        ctx.lineWidth = 6.0;
        ctx.beginPath();
        ctx.moveTo(-rx * 1.05, lidY);
        ctx.quadraticCurveTo(0, lidY + ry * 0.18 * (1 - effectiveBlink), rx * 1.05, lidY);
        ctx.stroke();
      }

      ctx.lineWidth = 6.8;
      ctx.strokeStyle = '#0e1609';
      ctx.stroke(eyeSocketPath);

      ctx.restore(); // Exit eye aperture clip

      if (angryAmt > 0.05) {
        ctx.strokeStyle = '#0d1408';
        ctx.lineWidth = lerp(5.5, 9.5, angryAmt);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-rx * 0.98, cutLeftY - 1);
        ctx.lineTo(rx * 1.04, cutRightY + 1);
        ctx.stroke();
      } else {
        ctx.lineWidth = 3.6;
        ctx.strokeStyle = '#0f170a';
        ctx.stroke(eyeSocketPath);

        ctx.beginPath();
        ctx.ellipse(0, -1.2, rx + 0.8, ry + 0.8, 0, Math.PI * 1.08, Math.PI * 1.92);
        ctx.lineWidth = 6.4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0e1509';
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawLaughingClosedEye(
      ctx: CanvasRenderingContext2D,
      side: 'left' | 'right',
      rx: number,
      ry: number,
      tilt: number,
    ): void {
      ctx.save();
      ctx.rotate(tilt * 0.6);

      const archPath = new Path2D();
      archPath.moveTo(-rx * 0.95, ry * 0.18);
      archPath.bezierCurveTo(-rx * 0.48, -ry * 0.72, rx * 0.48, -ry * 0.72, rx * 0.95, ry * 0.22);
      archPath.bezierCurveTo(rx * 0.42, -ry * 0.34, -rx * 0.42, -ry * 0.34, -rx * 0.95, ry * 0.18);
      archPath.closePath();

      ctx.fillStyle = '#0e1509';
      ctx.fill(archPath);
      ctx.lineWidth = 4.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0e1509';
      ctx.stroke(archPath);

      ctx.strokeStyle = 'rgba(95, 145, 32, 0.5)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      if (side === 'left') {
        ctx.moveTo(-rx * 0.6, ry * 0.36);
        ctx.quadraticCurveTo(0, ry * 0.22, rx * 0.4, ry * 0.34);
      } else {
        ctx.moveTo(-rx * 0.4, ry * 0.34);
        ctx.quadraticCurveTo(0, ry * 0.22, rx * 0.6, ry * 0.36);
      }
      ctx.stroke();

      ctx.restore();
    }

    function drawEyebrows(
      ctx: CanvasRenderingContext2D,
      pose: TurtlePose,
      lookX: number,
      lookY: number,
    ): void {
      ctx.save();
      ctx.translate(lookX * 0.9, lookY * 0.9);

      const angryAmt = pose.angryLidAmount;

      if (angryAmt > 0.25) {
        ctx.save();
        ctx.strokeStyle = `rgba(42, 74, 18, ${angryAmt * 0.85})`;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(4, -24);
        ctx.quadraticCurveTo(10, -10, 2, 0);
        ctx.moveTo(46, -14);
        ctx.quadraticCurveTo(38, -2, 44, 8);
        ctx.stroke();

        ctx.strokeStyle = '#33691e';
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        ctx.moveTo(-64, -84);
        ctx.quadraticCurveTo(-36, -102, -10, -82);
        ctx.moveTo(88, -62);
        ctx.quadraticCurveTo(114, -72, 130, -46);
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        return;
      }

      const raise = pose.browRaise * 20;
      const tilt = pose.browTilt * 22;
      const asym = pose.browAsymmetry * 14;

      ctx.strokeStyle = '#2d5c18';
      ctx.lineCap = 'round';
      ctx.lineWidth = 4.5;

      // Left Eyebrow
      ctx.beginPath();
      ctx.moveTo(-72, -70 - raise + tilt * 0.5);
      ctx.quadraticCurveTo(
        -44,
        -90 - raise - Math.abs(tilt) * 0.2,
        -14,
        -72 - raise - tilt * 0.7,
      );
      ctx.stroke();

      // Right Eyebrow
      ctx.beginPath();
      ctx.moveTo(74, -50 - raise - asym - tilt * 0.7);
      ctx.quadraticCurveTo(
        104,
        -66 - raise - asym - Math.abs(tilt) * 0.2,
        126,
        -38 - raise - asym + tilt * 0.5,
      );
      ctx.stroke();

      ctx.restore();
    }

    function drawMouth(
      ctx: CanvasRenderingContext2D,
      pose: TurtlePose,
      lookX: number,
      lookY: number,
      outlineColor = '#254012',
    ): void {
      ctx.save();
      ctx.translate(22 + lookX, 46 + lookY);
      ctx.rotate(0.12);

      // 1. Angry tight frown line (turtle_04_angry)
      if (pose.mouthFrownLine > 0.6 && pose.mouthOpen < 0.15) {
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 3.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-25, 10);
        ctx.quadraticCurveTo(2, -5, 28, 12);
        ctx.stroke();
        ctx.restore();
        return;
      }

      // 1.5. Shy bashful wavy cat-like smile ('blush' emotion)
      if (pose.mouthShyWave > 0.5) {
        ctx.save();
        ctx.translate(0, 6);
        // Small cute pink peek of tongue underneath center
        if (pose.mouthOpen > 0.12) {
          ctx.fillStyle = '#ff8a80';
          ctx.strokeStyle = outlineColor;
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.arc(0, 4, 10 * (0.7 + pose.mouthOpen), 0.1, Math.PI - 0.1);
          ctx.fill();
          ctx.stroke();
        }
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 3.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-26, -2);
        ctx.quadraticCurveTo(-13, 11, 0, 1);
        ctx.quadraticCurveTo(13, 11, 26, -2);
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        return;
      }

      // 2. Wondered small oval 'o' mouth OR Sleepy yawning oval mouth
      if (pose.mouthOShape > 0.5) {
        const oScaleX = 0.78 + pose.mouthWidth * 0.45;
        const oScaleY = 0.78 + pose.mouthOpen * 0.52;
        ctx.save();
        ctx.translate(2, 4);
        ctx.rotate(-0.15);

        const oPath = new Path2D();
        oPath.ellipse(0, 0, 14.5 * oScaleX, 17.5 * oScaleY, 0, 0, Math.PI * 2);

        ctx.fillStyle = '#4d1818';
        ctx.fill(oPath);

        ctx.save();
        ctx.clip(oPath);
        ctx.fillStyle = '#f27663';
        ctx.beginPath();
        ctx.ellipse(-2, 9 * oScaleY, 13 * oScaleX, 11 * oScaleY, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.lineWidth = 3.0;
        ctx.strokeStyle = outlineColor;
        ctx.stroke(oPath);
        ctx.restore();
        ctx.restore();
        return;
      }

      // 3. Crying wide wailing sad mouth (turtle_05_crying)
      if (pose.mouthWailShape > 0.5) {
        const openH = 34 * clamp(pose.mouthOpen, 0.5, 1.1);
        const wailPath = new Path2D();
        wailPath.moveTo(-36, 12);
        wailPath.bezierCurveTo(-20, -18, 20, -18, 38, 15);
        wailPath.bezierCurveTo(42, 30, 30, openH, 18, openH - 4);
        wailPath.quadraticCurveTo(0, openH - 14, -22, openH - 5);
        wailPath.bezierCurveTo(-34, openH - 2, -40, 24, -36, 12);
        wailPath.closePath();

        ctx.fillStyle = '#4f1818';
        ctx.fill(wailPath);

        ctx.save();
        ctx.clip(wailPath);
        const tongueGrad = ctx.createLinearGradient(0, 0, 0, openH);
        tongueGrad.addColorStop(0, '#e36452');
        tongueGrad.addColorStop(1, '#f78874');
        ctx.fillStyle = tongueGrad;
        ctx.beginPath();
        ctx.ellipse(0, openH * 0.65, 34, 21, 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.lineWidth = 3.4;
        ctx.strokeStyle = outlineColor;
        ctx.stroke(wailPath);
        ctx.restore();
        return;
      }

      // 4. Happy / Laughing / Describing Open Smile Mouth
      const halfW = 35 * pose.mouthWidth;
      const openDepth = 38 * clamp(pose.mouthOpen, 0.15, 1.12);
      const cornerLift = -8 * pose.mouthSmile;

      const smilePath = new Path2D();
      smilePath.moveTo(-halfW, cornerLift);
      smilePath.quadraticCurveTo(0, 3, halfW, cornerLift + 1.5);
      smilePath.bezierCurveTo(
        halfW * 0.82,
        openDepth + 4,
        -halfW * 0.82,
        openDepth + 4,
        -halfW,
        cornerLift,
      );
      smilePath.closePath();

      const mouthGrad = ctx.createLinearGradient(0, -6, 0, openDepth);
      mouthGrad.addColorStop(0, '#451414');
      mouthGrad.addColorStop(1, '#662020');
      ctx.fillStyle = mouthGrad;
      ctx.fill(smilePath);

      ctx.save();
      ctx.clip(smilePath);
      const tongueGrad = ctx.createLinearGradient(0, openDepth * 0.25, 0, openDepth);
      tongueGrad.addColorStop(0, '#eb6b59');
      tongueGrad.addColorStop(1, '#ff917d');
      ctx.fillStyle = tongueGrad;
      ctx.beginPath();
      ctx.ellipse(
        -2,
        openDepth * 0.74,
        halfW * 0.72 * pose.tongueScale,
        openDepth * 0.48 * pose.tongueScale,
        -0.08,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();

      ctx.lineWidth = 3.3;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = outlineColor;
      ctx.stroke(smilePath);

      // Cute corner smile dimple ticks using the animal's outlineColor
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-halfW - 3, cornerLift + 2.5);
      ctx.quadraticCurveTo(-halfW, cornerLift - 2.5, -halfW + 3.5, cornerLift - 4.5);
      ctx.moveTo(halfW - 2.5, cornerLift - 2.5);
      ctx.quadraticCurveTo(halfW + 1, cornerLift, halfW + 3.5, cornerLift + 4.5);
      ctx.stroke();

      ctx.restore();
    }

    function drawTearsAndDroplets(
      ctx: CanvasRenderingContext2D,
      pose: TurtlePose,
      tearDrops: TearDrop[],
      lookX: number,
      lookY: number,
    ): void {
      ctx.save();
      ctx.globalAlpha = clamp(pose.tearsAlpha, 0, 1);
      ctx.translate(lookX * 0.85, lookY * 0.85);

      const wave = Math.sin(pose.tearStreamPhase) * 3.5;
      const wave2 = Math.cos(pose.tearStreamPhase * 1.3) * 2.5;

      // Left Eye Tear Waterfall (anchored to bottom of smaller left eye at (-45, -22))
      ctx.save();
      const leftStream = new Path2D();
      leftStream.moveTo(-74, 8);
      leftStream.quadraticCurveTo(-45, 14, -18, 18);
      leftStream.quadraticCurveTo(-22, 32, -44, 30);
      leftStream.bezierCurveTo(-50 + wave, 56, -42 - wave2, 86, -54 + wave * 0.5, 108);
      leftStream.bezierCurveTo(-70, 122, -94, 106, -86 - wave, 76);
      leftStream.bezierCurveTo(-80 + wave2, 50, -84, 26, -74, 8);
      leftStream.closePath();

      const leftTearGrad = ctx.createLinearGradient(-55, 10, -70, 114);
      leftTearGrad.addColorStop(0, 'rgba(64, 196, 255, 0.92)');
      leftTearGrad.addColorStop(0.5, 'rgba(128, 216, 255, 0.88)');
      leftTearGrad.addColorStop(1, 'rgba(41, 182, 246, 0.94)');
      ctx.fillStyle = leftTearGrad;
      ctx.fill(leftStream);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = 'rgba(25, 145, 215, 0.85)';
      ctx.stroke(leftStream);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      drawOvalSpot(ctx, -50, 18, 11, 3.5, 0.15);
      drawOvalSpot(ctx, -68 + wave * 0.4, 62, 5.5, 20, 0.18);
      drawOvalSpot(ctx, -66, 96, 7.5, 4.5, -0.2);
      ctx.restore();

      // Right Eye Tear Waterfall (anchored to bottom of smaller right eye at (98, -2))
      ctx.save();
      const rightStream = new Path2D();
      rightStream.moveTo(74, 26);
      rightStream.quadraticCurveTo(98, 32, 122, 40);
      rightStream.bezierCurveTo(134 + wave, 66, 132 - wave2, 102, 120 + wave * 0.5, 124);
      rightStream.bezierCurveTo(106, 136, 88, 124, 96 - wave, 94);
      rightStream.bezierCurveTo(102 + wave2, 68, 94, 46, 74, 34);
      rightStream.closePath();

      const rightTearGrad = ctx.createLinearGradient(98, 28, 115, 130);
      rightTearGrad.addColorStop(0, 'rgba(64, 196, 255, 0.92)');
      rightTearGrad.addColorStop(0.5, 'rgba(128, 216, 255, 0.88)');
      rightTearGrad.addColorStop(1, 'rgba(41, 182, 246, 0.94)');
      ctx.fillStyle = rightTearGrad;
      ctx.fill(rightStream);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = 'rgba(25, 145, 215, 0.85)';
      ctx.stroke(rightStream);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      drawOvalSpot(ctx, 96, 36, 10, 3.5, 0.25);
      drawOvalSpot(ctx, 112 + wave * 0.4, 78, 5, 18, -0.1);
      ctx.restore();

      drawGlossyTearBead(ctx, -70, 128 + wave * 1.5, 12);
      drawGlossyTearBead(ctx, 116, 142 - wave * 1.5, 13);
      drawGlossyTearBead(ctx, 164, 56 + wave2 * 2, 15);

      for (const drop of tearDrops) {
        ctx.save();
        ctx.globalAlpha = clamp(drop.alpha * pose.tearsAlpha, 0, 1);
        drawGlossyTearBead(ctx, drop.x, drop.y, drop.radius * 0.72);
        ctx.restore();
      }

      ctx.restore();
    }

    function drawGlossyTearBead(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      r: number,
    ): void {
      ctx.save();
      ctx.translate(x, y);
      const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#e1f5fe');
      grad.addColorStop(0.45, '#4fc3f7');
      grad.addColorStop(1, '#039be5');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#0288d1';
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.3, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawEmotionProps(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
      if (pose.waveRaysAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = clamp(pose.waveRaysAlpha, 0, 1);
        const pulse = 1 + Math.sin(pose.waveRaysPhase) * 0.08;
        // Positioned at the 120° rear-upper offset away from the +X facing direction
        ctx.translate(-168, -134);
        ctx.scale(pulse, pulse);
        drawThreeComicRays(ctx, -0.58);
        ctx.restore();
      }

      if (pose.describeRaysAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = clamp(pose.describeRaysAlpha, 0, 1);
        const pulse = 1 + Math.sin(pose.describeRaysPhase) * 0.08;
        ctx.translate(202, -92);
        ctx.scale(pulse, pulse);
        drawThreeComicRays(ctx, 0.68);
        ctx.restore();
      }

      if (pose.laughMarksAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = clamp(pose.laughMarksAlpha, 0, 1);
        const bounce = pose.laughMarksBounce * 7;

        ctx.save();
        ctx.translate(-92, -108 + bounce);
        ctx.rotate(-0.15);
        drawLaughDoubleCross(ctx, false);
        ctx.restore();

        ctx.save();
        ctx.translate(212, -88 - bounce);
        ctx.rotate(0.15);
        drawLaughDoubleCross(ctx, true);
        ctx.restore();

        ctx.restore();
      }

      if (pose.questionMarkAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = clamp(pose.questionMarkAlpha, 0, 1);
        const bob = pose.questionMarkBob * 8;
        ctx.translate(198, -118 + bob);
        ctx.rotate(0.18 + pose.questionMarkBob * 0.08);
        if (pose.facing < 0) {
          ctx.scale(-1, 1);
        }
        drawQuestionMarkSymbol(ctx);
        ctx.restore();
      }

      if (pose.angryVeinAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = clamp(pose.angryVeinAlpha, 0, 1);
        const pulse = 1 + pose.angryVeinPulse * 0.12;
        ctx.translate(178, -118);
        ctx.rotate(0.15);
        ctx.scale(pulse, pulse);
        drawAngryVeinSymbol(ctx);
        ctx.restore();
      }

      if (pose.sleepyZzzAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = clamp(pose.sleepyZzzAlpha, 0, 1);
        drawSleepyZzzProps(ctx, pose.sleepyZzzPhase, pose.facing < 0);
        ctx.restore();
      }

      if (pose.blushHeartsAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = clamp(pose.blushHeartsAlpha, 0, 1);
        drawBlushHeartProps(ctx, pose.blushHeartsPhase);
        ctx.restore();
      }

      if (pose.congratsAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = clamp(pose.congratsAlpha, 0, 1);
        drawCongratsProps(ctx, pose.congratsPhase);
        ctx.restore();
      }
    }

    function drawThreeComicRays(ctx: CanvasRenderingContext2D, baseAngle: number): void {
      ctx.save();
      ctx.rotate(baseAngle);

      const angles = [-0.38, 0, 0.38];
      const lengths = [64, 74, 64];

      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate(angles[i]);
        const len = lengths[i];

        const rayPath = new Path2D();
        rayPath.moveTo(-5, 0);
        rayPath.lineTo(-13, -len);
        rayPath.lineTo(13, -len);
        rayPath.lineTo(5, 0);
        rayPath.closePath();

        ctx.lineWidth = 9;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#ffffff';
        ctx.stroke(rayPath);

        const grad = ctx.createLinearGradient(0, 0, 0, -len);
        grad.addColorStop(0, '#ffa000');
        grad.addColorStop(1, '#ffd54f');
        ctx.fillStyle = grad;
        ctx.fill(rayPath);

        ctx.restore();
      }

      ctx.restore();
    }

    function drawLaughDoubleCross(ctx: CanvasRenderingContext2D, mirror: boolean): void {
      ctx.save();
      if (mirror) {
        ctx.scale(-1, 1);
      }

      const drawCurveAndBars = (strokeColor: string, width: number) => {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(-18, 42);
        ctx.quadraticCurveTo(-12, -8, 26, -42);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-4, -36);
        ctx.lineTo(28, -10);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-34, 8);
        ctx.lineTo(4, 24);
        ctx.stroke();
      };

      drawCurveAndBars('#ffffff', 19);
      drawCurveAndBars('#ffa726', 11);
      ctx.restore();
    }

    function drawQuestionMarkSymbol(ctx: CanvasRenderingContext2D): void {
      const drawPath = (strokeColor: string, width: number, dotRadius: number) => {
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = strokeColor;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(-22, -26);
        ctx.bezierCurveTo(-24, -56, 28, -58, 28, -24);
        ctx.bezierCurveTo(28, -4, -2, 2, -2, 22);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(-2, 48, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      };

      drawPath('#ffffff', 30, 17);
      drawPath('#326496', 20, 11.5);
    }

    function drawAngryVeinSymbol(ctx: CanvasRenderingContext2D): void {
      const drawFourCorners = (strokeColor: string, width: number) => {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI) / 2);
          ctx.beginPath();
          ctx.moveTo(8, -34);
          ctx.quadraticCurveTo(10, -10, 34, -8);
          ctx.stroke();
          ctx.restore();
        }
      };

      drawFourCorners('#ffffff', 20);
      drawFourCorners('#f23d2e', 11);
    }

    function drawOvalSpot(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      rx: number,
      ry: number,
      rot: number,
    ): void {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawFourPointStar(
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      outerR: number,
      innerR: number,
    ): void {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 4;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    function drawSleepyZzzProps(
      ctx: CanvasRenderingContext2D,
      phase: number,
      flipText: boolean,
    ): void {
      const zSpecs = [
        { baseX: 158, baseY: -102, size: 22, offset: 0 },
        { baseX: 192, baseY: -146, size: 30, offset: 1.2 },
        { baseX: 232, baseY: -194, size: 38, offset: 2.4 },
      ];

      for (const z of zSpecs) {
        const bobY = Math.sin(phase + z.offset) * 7;
        const swayX = Math.cos(phase * 0.8 + z.offset) * 4;
        ctx.save();
        ctx.translate(z.baseX + swayX, z.baseY + bobY);
        ctx.rotate(0.12 + Math.sin(phase + z.offset) * 0.06);
        if (flipText) {
          ctx.scale(-1, 1);
        }

        const s = z.size * 0.5;
        const traceZ = (strokeColor: string, lineWidth: number) => {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(-s, -s);
          ctx.lineTo(s, -s);
          ctx.lineTo(-s, s);
          ctx.lineTo(s, s);
          ctx.stroke();
        };

        traceZ('#ffffff', 14);
        traceZ('#5c6bc0', 7.5);
        ctx.restore();
      }
    }

    function drawBlushHeartProps(ctx: CanvasRenderingContext2D, phase: number): void {
      const hearts = [
        { x: -136, y: -96, scale: 0.95, rot: -0.22, offset: 0 },
        { x: 196, y: -112, scale: 1.15, rot: 0.2, offset: 1.5 },
        { x: 162, y: -168, scale: 0.78, rot: -0.12, offset: 3.0 },
      ];

      for (const h of hearts) {
        const bob = Math.sin(phase + h.offset) * 7;
        const pulse = h.scale * (1 + Math.cos(phase * 1.5 + h.offset) * 0.08);
        ctx.save();
        ctx.translate(h.x, h.y + bob);
        ctx.rotate(h.rot);
        ctx.scale(pulse, pulse);

        const heartPath = new Path2D();
        heartPath.moveTo(0, 14);
        heartPath.bezierCurveTo(-24, -2, -26, -24, -12, -24);
        heartPath.bezierCurveTo(-4, -24, 0, -16, 0, -12);
        heartPath.bezierCurveTo(0, -16, 4, -24, 12, -24);
        heartPath.bezierCurveTo(26, -24, 24, -2, 0, 14);
        heartPath.closePath();

        ctx.lineWidth = 7;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#ffffff';
        ctx.stroke(heartPath);

        const grad = ctx.createLinearGradient(0, -24, 0, 14);
        grad.addColorStop(0, '#ff80ab');
        grad.addColorStop(1, '#f50057');
        ctx.fillStyle = grad;
        ctx.fill(heartPath);

        ctx.restore();
      }
    }

    function drawCongratsProps(ctx: CanvasRenderingContext2D, phase: number): void {
      // Golden celebratory 5-point stars and festive confetti around the cheering turtle
      const stars = [
        { x: -168, y: -162, r: 22, rot: -0.2, offset: 0 },
        { x: 208, y: -144, r: 26, rot: 0.25, offset: 1.1 },
        { x: 26, y: -206, r: 19, rot: 0.1, offset: 2.2 },
      ];

      for (const st of stars) {
        const pulse = 1 + Math.sin(phase + st.offset) * 0.14;
        ctx.save();
        ctx.translate(st.x, st.y + Math.cos(phase + st.offset) * 6);
        ctx.rotate(st.rot + Math.sin(phase * 0.7 + st.offset) * 0.15);
        ctx.scale(pulse, pulse);

        const starPath = new Path2D();
        for (let i = 0; i < 10; i++) {
          const rad = i % 2 === 0 ? st.r : st.r * 0.45;
          const ang = -Math.PI / 2 + (i * Math.PI) / 5;
          const px = Math.cos(ang) * rad;
          const py = Math.sin(ang) * rad;
          if (i === 0) starPath.moveTo(px, py);
          else starPath.lineTo(px, py);
        }
        starPath.closePath();

        ctx.lineWidth = 7;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#ffffff';
        ctx.stroke(starPath);

        const grad = ctx.createLinearGradient(0, -st.r, 0, st.r);
        grad.addColorStop(0, '#ffee58');
        grad.addColorStop(1, '#ffa000');
        ctx.fillStyle = grad;
        ctx.fill(starPath);
        ctx.restore();
      }

      // Festive colorful confetti bits
      const confetti = [
        { x: -112, y: -194, color: '#29b6f6', rot: 0.5, offset: 0.4 },
        { x: 146, y: -188, color: '#ff5252', rot: -0.6, offset: 1.3 },
        { x: -206, y: -96, color: '#ab47bc', rot: 0.8, offset: 2.1 },
        { x: 238, y: -72, color: '#66bb6a', rot: -0.4, offset: 2.9 },
      ];

      for (const c of confetti) {
        const bob = Math.sin(phase * 1.2 + c.offset) * 8;
        ctx.save();
        ctx.translate(c.x, c.y + bob);
        ctx.rotate(c.rot + phase * 0.35);
        ctx.fillStyle = c.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-9, -5, 18, 10, 4);
        ctx.stroke();
        ctx.fill();
        ctx.restore();
      }
    }

    export { drawEmotionProps, drawOvalSpot, traceRoundedPolygon };

    export interface IrisColorStops {
      top: string;
      upperMid: string;
      lowerMid: string;
      bottom: string;
      glow: string;
    }

    export const IRIS_PALETTES: Record<string, IrisColorStops> = {
      emerald: {
        top: '#071f0d',
        upperMid: '#0e3d19',
        lowerMid: '#1e7d2c',
        bottom: '#48c73f',
        glow: '#62e854',
      },
      amber: {
        top: '#210e04',
        upperMid: '#4d2209',
        lowerMid: '#994b14',
        bottom: '#f09d2b',
        glow: '#ffc65c',
      },
      oceanBlue: {
        top: '#061d2e',
        upperMid: '#0c436b',
        lowerMid: '#1982c4',
        bottom: '#4cc9f0',
        glow: '#80edff',
      },
      warmBrown: {
        top: '#1a0c05',
        upperMid: '#3d1e0d',
        lowerMid: '#733b1a',
        bottom: '#ba6832',
        glow: '#e08e52',
      },
      goldenHazel: {
        top: '#1c1605',
        upperMid: '#47380c',
        lowerMid: '#8c6f18',
        bottom: '#d9b22e',
        glow: '#f5d76e',
      },
      deepBerry: {
        top: '#17091c',
        upperMid: '#381642',
        lowerMid: '#6b2b7d',
        bottom: '#b559cc',
        glow: '#e08aff',
      },
      crimsonRed: {
        top: '#240508',
        upperMid: '#590d14',
        lowerMid: '#a81824',
        bottom: '#f43f5e',
        glow: '#fda4af',
      },
    };

    /**
     * Reusable Green-Sea-Turtle-grade glossy multi-layer eye renderer with custom
     * iris palette, angry eyelids, sad watery shine & tear streams, and sleepy/blink lids
     * for all 41 animal species.
     */
    let activeAnimalEyeScale = 1.0;

    export function setActiveAnimalEyeScale(scale: number): void {
      activeAnimalEyeScale = scale;
    }

    export function getActiveAnimalEyeScale(): number {
      return activeAnimalEyeScale;
    }

    export function drawGlossyAnimalEye(
      ctx: CanvasRenderingContext2D,
      side: 'left' | 'right',
      cx: number,
      cy: number,
      baseRx: number,
      baseRy: number,
      tilt: number,
      pose: TurtlePose,
      irisPalette: IrisColorStops = IRIS_PALETTES.warmBrown,
      lidColorTop = '#d69e5c',
      lidColorBottom = '#b57c3c',
      outlineColor = '#1c120b',
    ): void {
      const rx = baseRx * activeAnimalEyeScale;
      const ry = baseRy * activeAnimalEyeScale;
      ctx.save();
      ctx.translate(cx, cy);

      const laughAmt = pose.laughEyeAmount;
      if (laughAmt > 0.85) {
        drawLaughingClosedEye(ctx, side, rx, ry, tilt);
        ctx.restore();
        return;
      }

      ctx.rotate(tilt);

      // 3D Orbital Eye Socket Cushion & Upper Eyelid Crease (adds natural 3D depth around eye)
      ctx.save();
      const socketGrad = ctx.createRadialGradient(0, 2, rx * 0.65, 0, 2, rx * 1.42);
      socketGrad.addColorStop(0, 'rgba(15, 10, 5, 0.24)');
      socketGrad.addColorStop(0.7, 'rgba(15, 10, 5, 0.08)');
      socketGrad.addColorStop(1, 'rgba(15, 10, 5, 0)');
      ctx.fillStyle = socketGrad;
      ctx.beginPath();
      ctx.ellipse(0, 1.5, rx * 1.35, ry * 1.32, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subtle 3D upper orbital fold line & lower tear-trough highlight
      ctx.strokeStyle = 'rgba(20, 14, 8, 0.28)';
      ctx.lineWidth = Math.max(1.6, rx * 0.08);
      ctx.beginPath();
      ctx.ellipse(0, -ry * 0.14, rx * 1.18, ry * 1.12, 0, Math.PI * 1.14, Math.PI * 1.86);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 252, 238, 0.34)';
      ctx.beginPath();
      ctx.ellipse(0, ry * 0.1, rx * 1.12, ry * 1.08, 0, Math.PI * 0.18, Math.PI * 0.82);
      ctx.stroke();
      ctx.restore();

      const angryAmt = pose.angryLidAmount;
      const innerDrop = ry * 0.42 * angryAmt;
      const outerLift = -ry * 0.56 * angryAmt;
      const cutLeftY = side === 'left' ? outerLift : innerDrop;
      const cutRightY = side === 'left' ? innerDrop : outerLift;

      const eyeSocketPath = new Path2D();
      eyeSocketPath.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);

      ctx.save();
      ctx.clip(eyeSocketPath);

      if (angryAmt > 0.05) {
        ctx.beginPath();
        ctx.moveTo(-rx * 1.4, cutLeftY);
        ctx.lineTo(rx * 1.4, cutRightY);
        ctx.lineTo(rx * 1.4, ry * 1.5);
        ctx.lineTo(-rx * 1.4, ry * 1.5);
        ctx.closePath();
        ctx.clip();
      }

      // 3D Spherical Eyeball Sclera Shading (bright 3D center dome with curved peripheral shadow)
      const scleraSphere = ctx.createRadialGradient(-rx * 0.18, -ry * 0.15, rx * 0.1, 0, 0, Math.max(rx, ry) * 1.08);
      scleraSphere.addColorStop(0, '#ffffff');
      scleraSphere.addColorStop(0.68, '#f8fafc');
      scleraSphere.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = scleraSphere;
      ctx.fillRect(-rx * 1.25, -ry * 1.25, rx * 2.5, ry * 2.5);

      const scleraShadow = ctx.createLinearGradient(0, -ry, 0, -ry * 0.08);
      scleraShadow.addColorStop(0, 'rgba(130, 150, 168, 0.52)');
      scleraShadow.addColorStop(1, 'rgba(130, 150, 168, 0)');
      ctx.fillStyle = scleraShadow;
      ctx.fillRect(-rx, -ry, rx * 2, ry);

      // Iris & Pupil Group
      const scleraCrescentOffset = (side === 'left' ? 4.0 : -3.4) * (rx / 32);
      const irisX = scleraCrescentOffset + pose.eyeGazeX * (rx * 0.28);
      const irisY = 1.2 * (ry / 38) + pose.eyeGazeY * (ry * 0.2);
      const irisRx = rx * 0.84 * pose.pupilScale;
      const irisRy = ry * 0.88 * pose.pupilScale;

      const safePalette = irisPalette ?? IRIS_PALETTES.warmBrown;
      const irisGrad = ctx.createLinearGradient(irisX, irisY - irisRy, irisX, irisY + irisRy);
      irisGrad.addColorStop(0, safePalette.top);
      irisGrad.addColorStop(0.45, safePalette.upperMid);
      irisGrad.addColorStop(0.8, safePalette.lowerMid);
      irisGrad.addColorStop(1, safePalette.bottom);
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.ellipse(irisX, irisY, irisRx, irisRy, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dark limbal ring around the 3D iris perimeter
      ctx.strokeStyle = safePalette.top;
      ctx.lineWidth = Math.max(1.2, rx * 0.07);
      ctx.stroke();

      const glowGrad = ctx.createRadialGradient(
        irisX + (side === 'left' ? 4 : -2.5) * (rx / 32),
        irisY + irisRy * 0.45,
        1.5,
        irisX,
        irisY + irisRy * 0.25,
        irisRx * 0.85,
      );
      glowGrad.addColorStop(0, safePalette.glow);
      glowGrad.addColorStop(0.55, safePalette.bottom + '88');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.ellipse(irisX, irisY, irisRx * 0.92, irisRy * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();

      // Fine 3D radial iris stroma fiber striations + pupillary collarette ring
      ctx.save();
      ctx.strokeStyle = safePalette.glow;
      ctx.globalAlpha = 0.34;
      ctx.lineWidth = Math.max(0.8, rx * 0.045);
      for (let i = 0; i < 18; i++) {
        const a = (i * Math.PI) / 9;
        const innerR = i % 2 === 0 ? 0.54 : 0.62;
        ctx.beginPath();
        ctx.moveTo(irisX + Math.cos(a) * irisRx * innerR, irisY + Math.sin(a) * irisRy * innerR);
        ctx.lineTo(irisX + Math.cos(a) * irisRx * 0.92, irisY + Math.sin(a) * irisRy * 0.92);
        ctx.stroke();
      }
      ctx.strokeStyle = safePalette.bottom;
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.ellipse(irisX, irisY, irisRx * 0.68, irisRy * 0.68, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

        ctx.fillStyle = '#080a0c';
        ctx.beginPath();
        ctx.ellipse(
          irisX + (side === 'left' ? 1.2 : -0.8) * (rx / 32),
          irisY - 1.2 * (ry / 38),
          irisRx * 0.61,
          irisRy * 0.63,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        // Dual 3D Corneal Lens Specular Highlights + Secondary Rim Catchlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(
          irisX + irisRx * 0.28,
          irisY - irisRy * 0.34,
          rx * 0.24,
          ry * 0.22,
          -0.2,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.beginPath();
        ctx.arc(irisX - irisRx * 0.32, irisY + irisRy * 0.24, rx * 0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.ellipse(
          irisX + irisRx * 0.06,
          irisY + irisRy * 0.56,
          rx * 0.22,
          ry * 0.07,
          0.1,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        // Watery sad lower shine ('crying' / 'blush')
        if (pose.wateryShine > 0.1) {
          ctx.fillStyle = `rgba(220, 250, 255, ${0.85 * pose.wateryShine})`;
          ctx.beginPath();
          ctx.ellipse(
            irisX - irisRx * 0.1,
            irisY + irisRy * 0.58,
            rx * 0.32,
            ry * 0.11,
            0.1,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }

        if (pose.eyeSparkleAmount > 0.05) {
          ctx.save();
          ctx.globalAlpha = clamp(pose.eyeSparkleAmount, 0, 1);
          ctx.fillStyle = '#fff9c4';
          drawFourPointStar(
            ctx,
            irisX - irisRx * 0.24,
            irisY - irisRy * 0.1,
            rx * 0.22,
            rx * 0.07,
          );
          ctx.restore();
        }

        // Heavy half-closed droopy sleepy eyelid
        const sleepyAmt = pose.sleepyLidAmount;
        if (sleepyAmt > 0.02) {
          const sleepyLidY = lerp(-ry * 1.1, ry * 0.12, sleepyAmt);
          const lidGrad = ctx.createLinearGradient(0, -ry, 0, sleepyLidY + 8);
          lidGrad.addColorStop(0, lidColorTop);
          lidGrad.addColorStop(1, lidColorBottom);
          ctx.fillStyle = lidGrad;
          ctx.beginPath();
          ctx.moveTo(-rx * 1.3, -ry * 1.3);
          ctx.lineTo(rx * 1.3, -ry * 1.3);
          ctx.lineTo(rx * 1.3, sleepyLidY + 4);
          ctx.quadraticCurveTo(0, sleepyLidY + 8, -rx * 1.3, sleepyLidY + 2);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = outlineColor;
          ctx.lineWidth = Math.max(3.2, rx * 0.15);
          ctx.beginPath();
          ctx.moveTo(-rx * 1.1, sleepyLidY + 2);
          ctx.quadraticCurveTo(0, sleepyLidY + 8, rx * 1.1, sleepyLidY + 4);
          ctx.stroke();
        }

        // Smooth Eyelid Blinking
        const effectiveBlink = clamp(pose.blinkAmount + laughAmt * 0.9, 0, 1);
        if (effectiveBlink > 0.01) {
          const lidY = lerp(-ry * 1.15, ry * 0.95, effectiveBlink);
          ctx.fillStyle = lidColorTop;
          ctx.beginPath();
          ctx.rect(-rx * 1.2, -ry * 1.2, rx * 2.4, lidY + ry * 1.2);
          ctx.fill();

          ctx.strokeStyle = outlineColor;
          ctx.lineWidth = Math.max(3.5, rx * 0.17);
          ctx.beginPath();
          ctx.moveTo(-rx * 1.05, lidY);
          ctx.quadraticCurveTo(0, lidY + ry * 0.18 * (1 - effectiveBlink), rx * 1.05, lidY);
          ctx.stroke();
        }

        ctx.lineWidth = Math.max(4.2, rx * 0.19);
        ctx.strokeStyle = outlineColor;
        ctx.stroke(eyeSocketPath);

        ctx.restore(); // Exit eye aperture clip

        if (angryAmt > 0.05) {
          ctx.strokeStyle = outlineColor;
          ctx.lineWidth = lerp(4.5, 7.5, angryAmt);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-rx * 0.98, cutLeftY - 1);
          ctx.lineTo(rx * 1.04, cutRightY + 1);
          ctx.stroke();
        } else {
          ctx.lineWidth = Math.max(2.8, rx * 0.1);
          ctx.strokeStyle = outlineColor;
          ctx.stroke(eyeSocketPath);

          // Upper lash contour
          ctx.beginPath();
          ctx.ellipse(0, -1.0, rx + 0.7, ry + 0.7, 0, Math.PI * 1.08, Math.PI * 1.92);
          ctx.lineWidth = Math.max(4.2, rx * 0.18);
          ctx.lineCap = 'round';
          ctx.strokeStyle = outlineColor;
          ctx.stroke();
        }

        // Animated Sad/Crying Tear Stream & Droplets anchored beneath this eye
        if (pose.tearsAlpha > 0.01) {
          ctx.save();
          ctx.rotate(-tilt);
          ctx.globalAlpha = clamp(pose.tearsAlpha, 0, 1);
          const wave = Math.sin(pose.tearStreamPhase) * (rx * 0.11);
          const wave2 = Math.cos(pose.tearStreamPhase * 1.3) * (rx * 0.08);
          const dir = side === 'left' ? -1 : 1;
          const streamH = ry * 2.25;

          const stream = new Path2D();
          stream.moveTo(-rx * 0.65, ry * 0.72);
          stream.quadraticCurveTo(0, ry * 0.96, rx * 0.65, ry * 0.76);
          stream.bezierCurveTo(
            rx * 0.55 + dir * rx * 0.3 + wave,
            ry * 1.45,
            dir * rx * 0.45 - wave2,
            ry * 1.95,
            dir * rx * 0.35 + wave * 0.5,
            streamH,
          );
          stream.bezierCurveTo(
            dir * rx * 0.05,
            streamH + ry * 0.35,
            -rx * 0.55 + dir * rx * 0.15,
            streamH + ry * 0.1,
            -rx * 0.52 + dir * rx * 0.15 - wave,
            ry * 1.65,
          );
          stream.bezierCurveTo(-rx * 0.55 + wave2, ry * 1.2, -rx * 0.68, ry * 0.9, -rx * 0.65, ry * 0.72);
          stream.closePath();

          const tearGrad = ctx.createLinearGradient(0, ry * 0.7, dir * rx * 0.3, streamH);
          tearGrad.addColorStop(0, 'rgba(64, 196, 255, 0.92)');
          tearGrad.addColorStop(0.5, 'rgba(128, 216, 255, 0.88)');
          tearGrad.addColorStop(1, 'rgba(41, 182, 246, 0.94)');
          ctx.fillStyle = tearGrad;
          ctx.fill(stream);
          ctx.lineWidth = 2.0;
          ctx.strokeStyle = 'rgba(25, 145, 215, 0.85)';
          ctx.stroke(stream);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
          drawOvalSpot(ctx, dir * rx * 0.12 + wave * 0.3, ry * 1.38, rx * 0.14, ry * 0.38, dir * -0.15);

          drawGlossyTearBead(ctx, dir * rx * 0.32 + wave, streamH + ry * 0.42 + wave2, rx * 0.32);
          ctx.restore();
        }

        ctx.restore();
      }

      /**
       * Reusable Green-Sea-Turtle-grade expressive mouth renderer with custom position,
       * scale, rotation, and dimple/outline color.
       */
      export function drawExpressiveAnimalMouth(
        ctx: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        scale: number,
        rot: number,
        pose: TurtlePose,
        outlineColor = '#2b110f',
      ): void {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.scale(scale, scale);

        // Subtle anatomical philtrum groove above upper lip & lower-lip chin crease shadow
        ctx.strokeStyle = 'rgba(28, 16, 10, 0.22)';
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(0, -4);
        ctx.moveTo(-12, 19 + pose.mouthOpen * 12);
        ctx.quadraticCurveTo(0, 23 + pose.mouthOpen * 12, 12, 19 + pose.mouthOpen * 12);
        ctx.stroke();

        // Delegate to internal drawMouth at origin (drawMouth translates by 22, 46 and rotates 0.12)
        ctx.rotate(-0.12);
        ctx.translate(-22, -46);
        drawMouth(ctx, pose, 0, 0, outlineColor);
        ctx.restore();
      }

      /**
       * Reusable soft radial cheek blushes with cute blush hash ticks.
       */
      export function drawSoftCheekBlushes(
        ctx: CanvasRenderingContext2D,
        leftX: number,
        leftY: number,
        rightX: number,
        rightY: number,
        rx: number,
        ry: number,
        alpha: number,
      ): void {
        if (alpha <= 0.01) return;
        ctx.save();

        const leftGrad = ctx.createRadialGradient(leftX, leftY, 2, leftX, leftY, rx);
        leftGrad.addColorStop(0, `rgba(255, 112, 96, ${0.65 * alpha})`);
        leftGrad.addColorStop(1, 'rgba(255, 112, 96, 0)');
        ctx.fillStyle = leftGrad;
        ctx.beginPath();
        ctx.ellipse(leftX, leftY, rx, ry, 0.12, 0, Math.PI * 2);
        ctx.fill();

        const rightGrad = ctx.createRadialGradient(rightX, rightY, 2, rightX, rightY, rx * 0.9);
        rightGrad.addColorStop(0, `rgba(255, 112, 96, ${0.65 * alpha})`);
        rightGrad.addColorStop(1, 'rgba(255, 112, 96, 0)');
        ctx.fillStyle = rightGrad;
        ctx.beginPath();
        ctx.ellipse(rightX, rightY, rx * 0.9, ry * 0.9, 0.18, 0, Math.PI * 2);
        ctx.fill();

        if (alpha > 0.45) {
          ctx.strokeStyle = `rgba(255, 225, 210, ${(alpha - 0.45) * 1.15})`;
          ctx.lineWidth = 2.1;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(leftX - rx * 0.22, leftY - 3);
          ctx.lineTo(leftX - rx * 0.04, leftY + 2);
          ctx.moveTo(leftX + rx * 0.1, leftY - 2);
          ctx.lineTo(leftX + rx * 0.28, leftY + 3);
          ctx.moveTo(rightX - rx * 0.2, rightY - 3);
          ctx.lineTo(rightX - rx * 0.02, rightY + 2);
          ctx.moveTo(rightX + rx * 0.1, rightY - 2);
          ctx.lineTo(rightX + rx * 0.26, rightY + 3);
          ctx.stroke();
        }

        ctx.restore();
      }

      /**
       * Reusable expressive eyebrows for any animal species.
       */
      export function drawExpressiveAnimalBrows(
        ctx: CanvasRenderingContext2D,
        leftX: number,
        leftY: number,
        rightX: number,
        rightY: number,
        span: number,
        pose: TurtlePose,
        browColor = '#2b1b10',
        lineWidth = 4.2,
      ): void {
        ctx.save();
        const angryAmt = pose.angryLidAmount;
        if (angryAmt > 0.25) {
          ctx.strokeStyle = browColor;
          ctx.lineCap = 'round';
          ctx.lineWidth = lineWidth * 0.85;
          const midX = (leftX + rightX) * 0.5;
          const midY = (leftY + rightY) * 0.5 + span * 0.55;
          // Inner glabella furrow wrinkles
          ctx.beginPath();
          ctx.moveTo(midX - 10, midY - 12);
          ctx.quadraticCurveTo(midX - 4, midY - 2, midX - 11, midY + 6);
          ctx.moveTo(midX + 10, midY - 10);
          ctx.quadraticCurveTo(midX + 4, midY, midX + 9, midY + 8);
          ctx.stroke();
        }

        const raise = pose.browRaise * (span * 0.36);
        const tilt = pose.browTilt * (span * 0.38);
        const asym = pose.browAsymmetry * (span * 0.25);

        ctx.strokeStyle = browColor;
        ctx.lineCap = 'round';
        ctx.lineWidth = lineWidth;

        // Left Eyebrow
        ctx.beginPath();
        ctx.moveTo(leftX - span * 0.5, leftY - raise + tilt * 0.45);
        ctx.quadraticCurveTo(
          leftX,
          leftY - span * 0.32 - raise - Math.abs(tilt) * 0.15,
          leftX + span * 0.5,
          leftY - raise - tilt * 0.65,
        );
        ctx.stroke();

        // Right Eyebrow
        ctx.beginPath();
        ctx.moveTo(rightX - span * 0.46, rightY - raise - asym - tilt * 0.65);
        ctx.quadraticCurveTo(
          rightX,
          rightY - span * 0.3 - raise - asym - Math.abs(tilt) * 0.15,
          rightX + span * 0.46,
          rightY + span * 0.12 - raise - asym + tilt * 0.45,
        );
        ctx.stroke();

        ctx.restore();
      }

      export interface TurtleVariantPalette {
        outlineDark: string;
        outlineShell: string;
        spotDark: string;
        headSpotTop: string;
        headSpotBottom: string;
        skinLight: string;
        skinMid: string;
        skinDark: string;
        skinDeep: string;
        rimHighlight: string;
        shellBaseLight: string;
        shellBaseMid: string;
        shellBaseDark: string;
        scuteCenter: string;
        scuteMid: string;
        scuteOuter: string;
        scuteStroke: string;
        bellyTop: string;
        bellyMid: string;
        bellyBottom: string;
        plateTop: string;
        plateBottom: string;
        iris: IrisColorStops;
        beakHook?: boolean;
        yellowTempleStripe?: boolean;
      }

      export const TURTLE_VARIANT_PALETTES: Record<string, TurtleVariantPalette> = {
        animal_29_hawksbill_sea_turtle: {
          outlineDark: '#381e0a',
          outlineShell: '#2b1305',
          spotDark: '#6b2c10',
          headSpotTop: '#8c3d16',
          headSpotBottom: '#61250b',
          skinLight: '#fff099',
          skinMid: '#ffd257',
          skinDark: '#e09f28',
          skinDeep: '#b87614',
          rimHighlight: 'rgba(255, 248, 195, 0.82)',
          shellBaseLight: '#ffe885',
          shellBaseMid: '#f0b63a',
          shellBaseDark: '#b87718',
          scuteCenter: '#a84419',
          scuteMid: '#6b240b',
          scuteOuter: '#3d1204',
          scuteStroke: '#f7c248',
          bellyTop: '#fff3bd',
          bellyMid: '#f2d388',
          bellyBottom: '#cfa655',
          plateTop: '#fff9de',
          plateBottom: '#ebca7c',
          iris: IRIS_PALETTES.oceanBlue,
          beakHook: true,
        },
        animal_23_southern_river_terrapin: {
          outlineDark: '#1c2b12',
          outlineShell: '#16210d',
          spotDark: '#384a1e',
          headSpotTop: '#566e2e',
          headSpotBottom: '#3d521e',
          skinLight: '#dfed95',
          skinMid: '#b5cc5c',
          skinDark: '#87a138',
          skinDeep: '#647a24',
          rimHighlight: 'rgba(235, 250, 175, 0.78)',
          shellBaseLight: '#d4e67e',
          shellBaseMid: '#9cb548',
          shellBaseDark: '#687d28',
          scuteCenter: '#4f6326',
          scuteMid: '#354516',
          scuteOuter: '#212b0c',
          scuteStroke: '#b7cf5d',
          bellyTop: '#f5e6b8',
          bellyMid: '#dec68a',
          bellyBottom: '#bfa265',
          plateTop: '#fcf4d9',
          plateBottom: '#e6cf97',
          iris: IRIS_PALETTES.oceanBlue,
        },
        animal_24_southeast_asian_box_turtle: {
          outlineDark: '#2e1d0c',
          outlineShell: '#261407',
          spotDark: '#593414',
          headSpotTop: '#78491d',
          headSpotBottom: '#543010',
          skinLight: '#fff59e',
          skinMid: '#edd45a',
          skinDark: '#c7a530',
          skinDeep: '#9c7c1c',
          rimHighlight: 'rgba(255, 250, 200, 0.85)',
          shellBaseLight: '#fae278',
          shellBaseMid: '#d6a838',
          shellBaseDark: '#996d18',
          scuteCenter: '#7d3c17',
          scuteMid: '#52240c',
          scuteOuter: '#331406',
          scuteStroke: '#f2ca52',
          bellyTop: '#f7e2ab',
          bellyMid: '#deb971',
          bellyBottom: '#ba924c',
          plateTop: '#fff4d4',
          plateBottom: '#e8c682',
          iris: IRIS_PALETTES.amber,
          yellowTempleStripe: true,
        },
      };

      /**
       * Renders Hawksbill Sea Turtle (A29), Southern River Terrapin (A23), or
       * Southeast Asian Box Turtle (A24) with the full Green-Sea-Turtle vector rig
       * and species-authentic scutes, spots, and iris gradients.
       */
      export function renderTurtleVariant(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        pose: TurtlePose,
        pal: TurtleVariantPalette,
      ): void {
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const cx = width * 0.5;
        const cy = height * 0.48;
        const baseRadius = Math.min(width, height * 1.08);
        const scale = clamp(baseRadius / 650, 0.35, 1.45);

        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        const dirSign = pose.facing >= 0 ? 1 : -1;
        ctx.scale(dirSign, 1);

        drawAmbientShadow(ctx, pose);

        ctx.save();
        ctx.translate(pose.bodyX, pose.bodyY);
        ctx.rotate(pose.bodyRot);
        ctx.scale(pose.bodyScaleX, pose.bodyScaleY);

        // 1. Far Hind Flipper
        ctx.save();
        ctx.translate(-48, 108);
        ctx.rotate(pose.hindFarAngle);
        const fhPath = new Path2D();
        fhPath.moveTo(-18, -10);
        fhPath.bezierCurveTo(-36, 25, -40, 78, -14, 98);
        fhPath.bezierCurveTo(10, 114, 42, 86, 38, 42);
        fhPath.bezierCurveTo(35, 12, 14, -8, -18, -10);
        fhPath.closePath();
        const fhGrad = ctx.createLinearGradient(-30, -10, 25, 100);
        fhGrad.addColorStop(0, pal.skinDeep);
        fhGrad.addColorStop(0.55, pal.skinDark);
        fhGrad.addColorStop(1, pal.skinMid);
        ctx.fillStyle = fhGrad;
        ctx.fill(fhPath);
        ctx.lineWidth = 3.2;
        ctx.strokeStyle = pal.outlineDark;
        ctx.stroke(fhPath);
        ctx.fillStyle = pal.spotDark;
        drawOvalSpot(ctx, -15, 48, 8, 12, 0.2);
        drawOvalSpot(ctx, -11, 74, 7.5, 10.5, 0.1);
        drawOvalSpot(ctx, 8, 66, 10.5, 15, -0.15);
        drawOvalSpot(ctx, 21, 46, 5.5, 8.5, -0.2);
        ctx.restore();

        // 2. Near Hind Flipper
        ctx.save();
        ctx.translate(-138, 72);
        ctx.rotate(pose.hindNearAngle);
        const nhPath = new Path2D();
        nhPath.moveTo(18, -16);
        nhPath.bezierCurveTo(-32, -10, -96, 22, -116, 64);
        nhPath.bezierCurveTo(-130, 94, -106, 122, -72, 114);
        nhPath.bezierCurveTo(-30, 104, 16, 56, 36, 12);
        nhPath.closePath();
        const nhGrad = ctx.createLinearGradient(-110, 15, -10, 105);
        nhGrad.addColorStop(0, pal.skinLight);
        nhGrad.addColorStop(0.45, pal.skinMid);
        nhGrad.addColorStop(0.85, pal.skinDeep);
        nhGrad.addColorStop(1, pal.skinDark);
        ctx.fillStyle = nhGrad;
        ctx.fill(nhPath);
        ctx.save();
        ctx.clip(nhPath);
        ctx.strokeStyle = pal.rimHighlight;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(8, -12);
        ctx.bezierCurveTo(-36, -6, -90, 24, -112, 62);
        ctx.stroke();
        ctx.restore();
        ctx.lineWidth = 3.4;
        ctx.strokeStyle = pal.outlineDark;
        ctx.stroke(nhPath);
        ctx.fillStyle = pal.spotDark;
        drawOvalSpot(ctx, -54, 48, 24, 16, -0.55);
        drawOvalSpot(ctx, -93, 62, 11, 8, -0.5);
        drawOvalSpot(ctx, -90, 84, 12, 9, -0.45);
        drawOvalSpot(ctx, -68, 94, 10, 7, -0.4);
        drawOvalSpot(ctx, -26, 20, 10, 6, -0.5);
        ctx.restore();

        // 3. Far Front Flipper (when behind torso)
        const drawVariantFarFront = () => {
          ctx.save();
          const chinAmt = pose.farFlipperChinAmount;
          const raiseAmt = pose.farFlipperRaiseAmount;
          if (chinAmt > 0.4) {
            ctx.translate(64, 78);
            ctx.rotate(pose.farFlipperAngle);
            const p = new Path2D();
            p.moveTo(-26, -34);
            p.bezierCurveTo(6, -42, 48, -10, 76, 36);
            p.bezierCurveTo(96, 68, 86, 98, 56, 96);
            p.bezierCurveTo(16, 94, -36, 38, -46, -4);
            p.bezierCurveTo(-50, -22, -42, -30, -26, -34);
            p.closePath();
            const g = ctx.createLinearGradient(-40, -35, 75, 95);
            g.addColorStop(0, pal.skinLight);
            g.addColorStop(0.45, pal.skinMid);
            g.addColorStop(1, pal.skinDeep);
            ctx.fillStyle = g;
            ctx.fill(p);
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = pal.outlineDark;
            ctx.stroke(p);
            ctx.fillStyle = pal.spotDark;
            drawOvalSpot(ctx, 18, 6, 22, 13, 0.68);
            drawOvalSpot(ctx, 42, 48, 21, 15, 0.55);
            drawOvalSpot(ctx, -20, 6, 11, 8, 0.6);
            drawOvalSpot(ctx, 64, 74, 11, 7, 0.45);
          } else {
            const pivotX = lerp(64, 78, raiseAmt);
            const pivotY = lerp(64, 20, raiseAmt);
            ctx.translate(pivotX, pivotY);
            ctx.rotate(lerp(0, -1.08, raiseAmt) + pose.farFlipperAngle);
            const bendOffset = pose.farFlipperBend * 22;
            const p = new Path2D();
            p.moveTo(-16, -12);
            p.bezierCurveTo(38, -12 + bendOffset * 0.3, 122, 34 + bendOffset * 0.6, 168, 126 + bendOffset);
            p.bezierCurveTo(180, 152 + bendOffset, 158, 168 + bendOffset, 128, 148 + bendOffset * 0.8);
            p.bezierCurveTo(68, 108 + bendOffset * 0.4, 16, 54, -14, 14);
            p.closePath();
            const g = ctx.createLinearGradient(0, -15, 160, 155);
            g.addColorStop(0, pal.skinLight);
            g.addColorStop(0.5, pal.skinMid);
            g.addColorStop(1, pal.skinDeep);
            ctx.fillStyle = g;
            ctx.fill(p);
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = pal.outlineDark;
            ctx.stroke(p);
            ctx.fillStyle = pal.spotDark;
            drawOvalSpot(ctx, 78, 58 + bendOffset * 0.45, 23, 14, 0.72);
            drawOvalSpot(ctx, 132, 114 + bendOffset * 0.8, 18, 10, 0.82);
            drawOvalSpot(ctx, 46, 18 + bendOffset * 0.2, 14, 7, 0.62);
          }
          ctx.restore();
        };

        if (pose.farFlipperChinAmount <= 0.4) {
          drawVariantFarFront();
        }

        // 4. Torso & Plastron
        ctx.save();
        ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
        ctx.rotate(pose.shellRot);
        const breathExpand = pose.breath * 1.7;
        const torsoPath = new Path2D();
        torsoPath.moveTo(-176, 30);
        torsoPath.bezierCurveTo(-100, 14, 12, 6, 83, 28);
        torsoPath.bezierCurveTo(94, 60, 72, 107 + breathExpand, 18, 122 + breathExpand);
        torsoPath.bezierCurveTo(-52, 138 + breathExpand, -149, 109 + breathExpand, -176, 30);
        torsoPath.closePath();
        const skinGrad = ctx.createLinearGradient(-90, 10, 38, 126);
        skinGrad.addColorStop(0, pal.skinLight);
        skinGrad.addColorStop(0.55, pal.skinMid);
        skinGrad.addColorStop(1, pal.skinDeep);
        ctx.fillStyle = skinGrad;
        ctx.fill(torsoPath);

        ctx.save();
        ctx.clip(torsoPath);
        const bellyPath = new Path2D();
        bellyPath.moveTo(-121, 66);
        bellyPath.bezierCurveTo(-124, 55, -86, 51, -33, 51);
        bellyPath.bezierCurveTo(11, 51, 39, 57, 41, 73);
        bellyPath.bezierCurveTo(44, 100, 13, 123 + breathExpand, -36, 127 + breathExpand);
        bellyPath.bezierCurveTo(-84, 131 + breathExpand, -117, 96, -121, 66);
        bellyPath.closePath();
        const bellyGrad = ctx.createLinearGradient(-25, 51, -52, 127);
        bellyGrad.addColorStop(0, pal.bellyTop);
        bellyGrad.addColorStop(0.6, pal.bellyMid);
        bellyGrad.addColorStop(1, pal.bellyBottom);
        ctx.fillStyle = bellyGrad;
        ctx.fill(bellyPath);
        ctx.lineWidth = 1.9;
        ctx.strokeStyle = 'rgba(130, 95, 45, 0.65)';
        ctx.stroke(bellyPath);
        ctx.restore();

        ctx.lineWidth = 3.4;
        ctx.strokeStyle = pal.outlineDark;
        ctx.stroke(torsoPath);
        ctx.restore();

        // 5. Carapace
        ctx.save();
        ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
        ctx.rotate(pose.shellRot);
        const shellPath = new Path2D();
        shellPath.moveTo(-204, 30);
        shellPath.bezierCurveTo(-212, 22, -210, 6, -200, -12);
        shellPath.bezierCurveTo(-174, -72, -116, -130, -32, -130);
        shellPath.bezierCurveTo(26, -130, 70, -80, 84, -10);
        shellPath.bezierCurveTo(44, 26, -104, 46, -204, 30);
        shellPath.closePath();

        const innerClipPath = new Path2D();
        innerClipPath.moveTo(-197, 25);
        innerClipPath.bezierCurveTo(-203, 18, -202, 6, -193, -10);
        innerClipPath.bezierCurveTo(-168, -66, -112, -122, -32, -122);
        innerClipPath.bezierCurveTo(22, -122, 64, -74, 77, -10);
        innerClipPath.bezierCurveTo(40, 21, -102, 40, -197, 25);
        innerClipPath.closePath();

        const baseGrad = ctx.createLinearGradient(-180, -130, -20, 45);
        baseGrad.addColorStop(0, pal.shellBaseLight);
        baseGrad.addColorStop(0.5, pal.shellBaseMid);
        baseGrad.addColorStop(1, pal.shellBaseDark);
        ctx.fillStyle = baseGrad;
        ctx.fill(shellPath);

        ctx.save();
        ctx.clip(innerClipPath);
        const mainScutes: Array<[number, number][]> = [
          [[-164, -26], [-130, -86], [-74, -112], [-64, -62], [-116, -16]],
          [[-68, -114], [-8, -118], [24, -82], [-14, -52], [-58, -60]],
          [[-186, 10], [-162, -20], [-112, -12], [-96, 14], [-148, 21]],
          [[-106, -10], [-56, -52], [-8, -44], [12, 0], [-86, 14]],
          [[2, -46], [30, -76], [68, -18], [18, 2]],
        ];
        const rimScutes: Array<[number, number][]> = [
          [[-195, 24], [-180, 12], [-150, 19], [-162, 31]],
          [[-156, 32], [-142, 19], [-102, 15], [-114, 32]],
          [[-108, 32], [-96, 14], [-52, 8], [-64, 27]],
          [[-56, 26], [-44, 7], [-6, 2], [-16, 19]],
        ];
        const drawVarScute = (pts: [number, number][], isRim: boolean) => {
          let scx = 0;
          let scy = 0;
          for (const [x, y] of pts) {
            scx += x;
            scy += y;
          }
          scx /= pts.length;
          scy /= pts.length;
          ctx.save();
          traceRoundedPolygon(ctx, pts, isRim ? 5 : 10);
          const g = ctx.createRadialGradient(scx - 10, scy - 10, 4, scx, scy, isRim ? 34 : 66);
          g.addColorStop(0, pal.scuteCenter);
          g.addColorStop(0.55, pal.scuteMid);
          g.addColorStop(1, pal.scuteOuter);
          ctx.fillStyle = g;
          ctx.fill();
          ctx.strokeStyle = pal.scuteStroke;
          ctx.lineWidth = isRim ? 1.8 : 2.4;
          ctx.stroke();
          ctx.restore();
        };
        for (const pts of mainScutes) drawVarScute(pts, false);
        for (const pts of rimScutes) drawVarScute(pts, true);
        ctx.restore();

        ctx.lineWidth = 3.5;
        ctx.strokeStyle = pal.outlineShell;
        ctx.stroke(shellPath);
        ctx.restore();

        // 6. Near Front Flipper
        const drawVariantNearFront = () => {
          ctx.save();
          const downAmt = pose.nearFlipperDownAmount;
          const tuckAmt = pose.nearFlipperTuckAmount;
          const waveAmt = clamp(1 - downAmt - tuckAmt, 0, 1);
          ctx.translate(-68 + pose.nearFlipperShoulderX, 30 + pose.nearFlipperShoulderY);
          ctx.rotate(pose.nearFlipperAngle);
          const bend = pose.nearFlipperBend * 26;

          if (waveAmt >= 0.45) {
            const p = new Path2D();
            p.moveTo(16, -8);
            p.bezierCurveTo(-16, -60, -64 + bend * 0.5, -138, -118 + bend, -198);
            p.bezierCurveTo(-142 + bend, -224, -172 + bend, -210, -170 + bend * 0.9, -168);
            p.bezierCurveTo(-168 + bend * 0.8, -144, -158 + bend * 0.7, -130, -152 + bend * 0.65, -124);
            p.bezierCurveTo(-168 + bend * 0.6, -110, -164 + bend * 0.45, -72, -132 + bend * 0.35, -42);
            p.bezierCurveTo(-106 + bend * 0.2, -12, -58, 22, -10, 26);
            p.bezierCurveTo(12, 28, 24, 12, 16, -8);
            p.closePath();
            const g = ctx.createLinearGradient(-160, -210, 12, 25);
            g.addColorStop(0, pal.skinLight);
            g.addColorStop(0.4, pal.skinMid);
            g.addColorStop(0.8, pal.skinDark);
            g.addColorStop(1, pal.skinDeep);
            ctx.fillStyle = g;
            ctx.fill(p);
            ctx.save();
            ctx.clip(p);
            ctx.strokeStyle = pal.rimHighlight;
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(10, -10);
            ctx.bezierCurveTo(-20, -60, -66 + bend * 0.5, -138, -120 + bend, -200);
            ctx.stroke();
            ctx.restore();
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = pal.outlineDark;
            ctx.stroke(p);
            ctx.fillStyle = pal.spotDark;
            drawOvalSpot(ctx, -136 + bend * 0.85, -156, 21, 13, 1.22);
            drawOvalSpot(ctx, -114 + bend * 0.6, -106, 22, 14, 1.02);
            drawOvalSpot(ctx, -104 + bend * 0.45, -64, 20, 12.5, 0.85);
            drawOvalSpot(ctx, -72 + bend * 0.35, -52, 13.5, 8.5, 0.8);
            drawOvalSpot(ctx, -48 + bend * 0.2, -20, 9, 6.5, 0.65);
          } else {
            const p = new Path2D();
            p.moveTo(8, -10);
            p.bezierCurveTo(-46, -22, -118, -8, -138, 28);
            p.bezierCurveTo(-152, 54, -124, 88, -78, 82);
            p.bezierCurveTo(-32, 76, 10, 42, 18, 14);
            p.closePath();
            const g = ctx.createLinearGradient(-90, -10, 20, 95);
            g.addColorStop(0, pal.skinLight);
            g.addColorStop(0.5, pal.skinMid);
            g.addColorStop(1, pal.skinDeep);
            ctx.fillStyle = g;
            ctx.fill(p);
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = pal.outlineDark;
            ctx.stroke(p);
            ctx.fillStyle = pal.spotDark;
            drawOvalSpot(ctx, -64, 24, 22, 14, 0.2);
            drawOvalSpot(ctx, -108, 38, 16, 11, 0.15);
            drawOvalSpot(ctx, -38, 48, 10, 7, 0.15);
          }
          ctx.restore();
        };

        if (pose.nearFlipperTuckAmount <= 0.5) {
          drawVariantNearFront();
        }

        // 7. Head Group
        ctx.save();
        ctx.translate(42 + pose.headX, -18 + pose.headY);
        ctx.rotate(pose.headRot);
        ctx.scale(pose.headScaleX, pose.headScaleY);
        const lookX = pose.headLookX * 16;
        const lookY = pose.headLookY * 12;

        const headPath = createHeadPath();
        const headGrad = ctx.createRadialGradient(-10 + lookX * 0.4, -95 + lookY * 0.4, 18, 10, -15, 185);
        headGrad.addColorStop(0, pal.skinLight);
        headGrad.addColorStop(0.32, pal.skinMid);
        headGrad.addColorStop(0.75, pal.skinDark);
        headGrad.addColorStop(1, pal.skinDeep);
        ctx.fillStyle = headGrad;
        ctx.fill(headPath);

        ctx.save();
        ctx.clip(headPath);
        ctx.strokeStyle = pal.rimHighlight;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-110, -25);
        ctx.bezierCurveTo(-96, -98, -32, -144, 42, -138);
        ctx.stroke();

        if (pal.yellowTempleStripe) {
          ctx.fillStyle = 'rgba(255, 246, 140, 0.85)';
          drawOvalSpot(ctx, -84, -36, 26, 12, -0.35);
        }

        // Forehead shield spots
        ctx.save();
        ctx.translate(lookX * 0.65, lookY * 0.65);
        const spotGrad = ctx.createLinearGradient(0, -140, 20, -45);
        spotGrad.addColorStop(0, pal.headSpotTop);
        spotGrad.addColorStop(1, pal.headSpotBottom);
        ctx.fillStyle = spotGrad;
        traceRoundedPolygon(
          ctx,
          [
            [-12, -126],
            [46, -122],
            [64, -92],
            [26, -78],
            [-18, -96],
          ],
          11,
        );
        ctx.fill();
        traceRoundedPolygon(
          ctx,
          [
            [4, -72],
            [42, -68],
            [22, -42],
          ],
          8,
        );
        ctx.fill();
        drawOvalSpot(ctx, -38, -128, 18, 7, -0.35);
        drawOvalSpot(ctx, 18, -138, 16, 5, 0.08);
        drawOvalSpot(ctx, 68, -118, 14, 6, 0.45);
        ctx.restore();

        if (pose.blushAlpha > 0.01) {
          drawCheekBlushes(ctx, pose.blushAlpha, lookX, lookY);
        }
        ctx.restore();

        ctx.lineWidth = 3.8;
        ctx.strokeStyle = pal.outlineDark;
        ctx.stroke(headPath);

        drawSnoutAndNostrils(ctx, lookX, lookY);
        drawMouth(ctx, pose, lookX, lookY);

        drawGlossyAnimalEye(
          ctx,
          'left',
          -45 + lookX * 0.85,
          -22 + lookY * 0.85,
          34,
          41,
          -0.15,
          pose,
          pal.iris,
          pal.skinMid,
          pal.skinDark,
          pal.outlineDark,
        );
        drawGlossyAnimalEye(
          ctx,
          'right',
          98 + lookX * 0.85,
          -2 + lookY * 0.85,
          28,
          36,
          0.2,
          pose,
          pal.iris,
          pal.skinMid,
          pal.skinDark,
          pal.outlineDark,
        );
        drawEyebrows(ctx, pose, lookX, lookY);
        ctx.restore();

        if (pose.nearFlipperTuckAmount > 0.5) {
          drawVariantNearFront();
        }
        if (pose.farFlipperChinAmount > 0.4) {
          drawVariantFarFront();
        }

        drawEmotionProps(ctx, pose);

        ctx.restore();
        ctx.restore();
      }


