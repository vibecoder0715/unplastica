import type { Direction, MotionType, TearDrop, TurtlePose } from './types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function createDefaultPose(facing = 1): TurtlePose {
  return {
    facing,
    bodyX: 0,
    bodyY: 0,
    bodyRot: 0,
    bodyScaleX: 1,
    bodyScaleY: 1,
    breath: 0,
    shellRot: 0,
    shellOffsetX: 0,
    shellOffsetY: 0,
    headX: 0,
    headY: 0,
    headRot: 0,
    headScaleX: 1,
    headScaleY: 1,
    headLookX: 0,
    headLookY: 0,
    nearFlipperShoulderX: 0,
    nearFlipperShoulderY: 0,
    nearFlipperAngle: 0,
    nearFlipperBend: 0,
    nearFlipperScaleX: 1,
    nearFlipperScaleY: 1,
    nearFlipperDownAmount: 1,
    nearFlipperTuckAmount: 0,
    farFlipperShoulderX: 0,
    farFlipperShoulderY: 0,
    farFlipperAngle: 0,
    farFlipperBend: 0,
    farFlipperScaleX: 1,
    farFlipperScaleY: 1,
    farFlipperChinAmount: 0,
    farFlipperRaiseAmount: 0,
    hindNearAngle: 0,
    hindFarAngle: 0,
    eyeGazeX: 0,
    eyeGazeY: 0,
    pupilScale: 1,
    blinkAmount: 0,
    laughEyeAmount: 0,
    angryLidAmount: 0,
    sleepyLidAmount: 0,
    sadLidAmount: 0,
    wateryShine: 0,
    eyeSparkleAmount: 0,
    browRaise: 0.08,
    browTilt: 0,
    browAsymmetry: 0,
    mouthOpen: 0.14,
    mouthSmile: 0.85,
    mouthWidth: 0.96,
    mouthOShape: 0,
    mouthWailShape: 0,
    mouthFrownLine: 0,
    mouthShyWave: 0,
    tongueScale: 0.85,
    blushAlpha: 0.12,
    waveRaysAlpha: 0,
    waveRaysPhase: 0,
    describeRaysAlpha: 0,
    describeRaysPhase: 0,
    laughMarksAlpha: 0,
    laughMarksBounce: 0,
    questionMarkAlpha: 0,
    questionMarkBob: 0,
    angryVeinAlpha: 0,
    angryVeinPulse: 0,
    tearsAlpha: 0,
    tearStreamPhase: 0,
    sleepyZzzAlpha: 0,
    sleepyZzzPhase: 0,
    blushHeartsAlpha: 0,
    blushHeartsPhase: 0,
    congratsAlpha: 0,
    congratsPhase: 0,
  };
}

export class TurtleRigController {
  private motion: MotionType = 'idle';
  private direction: Direction = 'right';
  private time = 0;
  private motionTime = 0;
  private autoBlinkTimer = 2.1;
  private manualBlinkTime = -1;
  private manualBlinkDuration = 0.52;
  private autoBlinkTime = -1;
  private autoBlinkDuration = 0.2;
  private turnBoostTime = 0;

  public pose: TurtlePose;
  public tearDrops: TearDrop[] = [];
  private nextTearId = 1;
  private tearSpawnAccum = 0;

  constructor(
    initialMotion: MotionType = 'idle',
    initialDirection: Direction = 'right',
  ) {
    this.motion = initialMotion;
    this.direction = initialDirection;
    this.pose = createDefaultPose(initialDirection === 'right' ? 1 : -1);
    if (initialMotion === 'waving') {
      this.pose.nearFlipperDownAmount = 0;
      this.pose.waveRaysAlpha = 1;
    }
  }

  public getMotion(): MotionType {
    return this.motion;
  }

  public getDirection(): Direction {
    return this.direction;
  }

  public setMotion(newMotion: MotionType): void {
    if (this.motion !== newMotion) {
      this.motion = newMotion;
      this.motionTime = 0;
    }
  }

  public setDirection(newDirection: Direction): void {
    if (this.direction !== newDirection) {
      this.direction = newDirection;
      this.turnBoostTime = 0.45;
    }
  }

  public toggleDirection(): Direction {
    const next: Direction = this.direction === 'right' ? 'left' : 'right';
    this.setDirection(next);
    return next;
  }

  public triggerBlink(): void {
    this.manualBlinkTime = 0;
  }

  public isBlinking(): boolean {
    return this.manualBlinkTime >= 0 || this.pose.blinkAmount > 0.15;
  }

  public setEmotion(emotion: MotionType | 'normal'): void {
    this.setMotion(emotion === 'normal' ? 'idle' : emotion);
  }

  public setFacing(facing: 1 | -1): void {
    this.setDirection(facing >= 0 ? 'right' : 'left');
  }

  public update(dt: number, _speed = 1): TurtlePose {
    return this.step(dt);
  }

  public step(dt: number): TurtlePose {
    const clampedDt = clamp(dt, 0.001, 0.1);
    this.time += clampedDt;
    this.motionTime += clampedDt;

    if (this.turnBoostTime > 0) {
      this.turnBoostTime = Math.max(0, this.turnBoostTime - clampedDt);
    }

    // Smoothly interpolate facing direction (+1 right, -1 left)
    const targetFacing = this.direction === 'right' ? 1 : -1;
    const facingSpeed = 1 - Math.exp(-clampedDt * 22);
    this.pose.facing = lerp(this.pose.facing, targetFacing, facingSpeed);
    if (Math.abs(this.pose.facing - targetFacing) < 0.002) {
      this.pose.facing = targetFacing;
    }

    // Update automatic and manual eye blinks
    this.autoBlinkTimer -= clampedDt;
    if (this.autoBlinkTimer <= 0) {
      this.autoBlinkTime = 0;
      this.autoBlinkTimer = 2.9 + ((Math.sin(this.time * 7.3) + 1) * 0.5) * 1.9;
    }

    let blinkTarget = 0;
    let blinkHeadNod = 0;

    if (this.autoBlinkTime >= 0) {
      this.autoBlinkTime += clampedDt;
      const p = this.autoBlinkTime / this.autoBlinkDuration;
      if (p >= 1) {
        this.autoBlinkTime = -1;
      } else {
        blinkTarget = Math.max(blinkTarget, Math.sin(p * Math.PI));
      }
    }

    if (this.manualBlinkTime >= 0) {
      this.manualBlinkTime += clampedDt;
      const p = this.manualBlinkTime / this.manualBlinkDuration;
      if (p >= 1) {
        this.manualBlinkTime = -1;
      } else {
        // Expressive double blink when user clicks "Blink Eyes"
        const doubleBlink =
          p < 0.44
            ? Math.sin((p / 0.44) * Math.PI)
            : p > 0.54
              ? Math.sin(((p - 0.54) / 0.46) * Math.PI)
              : 0.12;
        blinkTarget = Math.max(blinkTarget, clamp(doubleBlink, 0, 1));
        blinkHeadNod = Math.sin(p * Math.PI * 2) * 0.035;
      }
    }

    // Compute target pose for the active emotion
    const target = this.computeTargetPose(this.time, this.motionTime);
    blinkTarget = Math.max(blinkTarget, target.blinkAmount);

    // Layer turn-head arc when switching left/right so the head turns dynamically
    const turnMidFactor = 1 - Math.abs(this.pose.facing);
    target.headY += turnMidFactor * 7;
    target.headScaleX *= 1 - turnMidFactor * 0.07;
    target.headRot += blinkHeadNod;

    // Responsive, jitter-free exponential smoothing rates (eliminates motion lag and aliasing)
    const kBody = 1 - Math.exp(-clampedDt * 18);
    const kLimb = 1 - Math.exp(-clampedDt * 22);
    const kFace = 1 - Math.exp(-clampedDt * 24);
    const kBlink = 1 - Math.exp(-clampedDt * 35);

    this.pose.bodyX = lerp(this.pose.bodyX, target.bodyX, kBody);
    this.pose.bodyY = lerp(this.pose.bodyY, target.bodyY, kBody);
    this.pose.bodyRot = lerp(this.pose.bodyRot, target.bodyRot, kBody);
    this.pose.bodyScaleX = lerp(this.pose.bodyScaleX, target.bodyScaleX, kBody);
    this.pose.bodyScaleY = lerp(this.pose.bodyScaleY, target.bodyScaleY, kBody);
    this.pose.breath = lerp(this.pose.breath, target.breath, kBody);

    this.pose.shellRot = lerp(this.pose.shellRot, target.shellRot, kBody);
    this.pose.shellOffsetX = lerp(this.pose.shellOffsetX, target.shellOffsetX, kBody);
    this.pose.shellOffsetY = lerp(this.pose.shellOffsetY, target.shellOffsetY, kBody);

    this.pose.headX = lerp(this.pose.headX, target.headX, kBody);
    this.pose.headY = lerp(this.pose.headY, target.headY, kBody);
    this.pose.headRot = lerp(this.pose.headRot, target.headRot, kBody);
    this.pose.headScaleX = lerp(this.pose.headScaleX, target.headScaleX, kBody);
    this.pose.headScaleY = lerp(this.pose.headScaleY, target.headScaleY, kBody);
    this.pose.headLookX = lerp(this.pose.headLookX, target.headLookX, kFace);
    this.pose.headLookY = lerp(this.pose.headLookY, target.headLookY, kFace);

    this.pose.nearFlipperShoulderX = lerp(
      this.pose.nearFlipperShoulderX,
      target.nearFlipperShoulderX,
      kLimb,
    );
    this.pose.nearFlipperShoulderY = lerp(
      this.pose.nearFlipperShoulderY,
      target.nearFlipperShoulderY,
      kLimb,
    );
    this.pose.nearFlipperAngle = lerp(
      this.pose.nearFlipperAngle,
      target.nearFlipperAngle,
      kLimb,
    );
    this.pose.nearFlipperBend = lerp(
      this.pose.nearFlipperBend,
      target.nearFlipperBend,
      kLimb,
    );
    this.pose.nearFlipperScaleX = lerp(
      this.pose.nearFlipperScaleX,
      target.nearFlipperScaleX,
      kLimb,
    );
    this.pose.nearFlipperScaleY = lerp(
      this.pose.nearFlipperScaleY,
      target.nearFlipperScaleY,
      kLimb,
    );
    this.pose.nearFlipperDownAmount = lerp(
      this.pose.nearFlipperDownAmount,
      target.nearFlipperDownAmount,
      kLimb,
    );
    this.pose.nearFlipperTuckAmount = lerp(
      this.pose.nearFlipperTuckAmount,
      target.nearFlipperTuckAmount,
      kLimb,
    );

    this.pose.farFlipperShoulderX = lerp(
      this.pose.farFlipperShoulderX,
      target.farFlipperShoulderX,
      kLimb,
    );
    this.pose.farFlipperShoulderY = lerp(
      this.pose.farFlipperShoulderY,
      target.farFlipperShoulderY,
      kLimb,
    );
    this.pose.farFlipperAngle = lerp(
      this.pose.farFlipperAngle,
      target.farFlipperAngle,
      kLimb,
    );
    this.pose.farFlipperBend = lerp(
      this.pose.farFlipperBend,
      target.farFlipperBend,
      kLimb,
    );
    this.pose.farFlipperScaleX = lerp(
      this.pose.farFlipperScaleX,
      target.farFlipperScaleX,
      kLimb,
    );
    this.pose.farFlipperScaleY = lerp(
      this.pose.farFlipperScaleY,
      target.farFlipperScaleY,
      kLimb,
    );
    this.pose.farFlipperChinAmount = lerp(
      this.pose.farFlipperChinAmount,
      target.farFlipperChinAmount,
      kLimb,
    );
    this.pose.farFlipperRaiseAmount = lerp(
      this.pose.farFlipperRaiseAmount,
      target.farFlipperRaiseAmount,
      kLimb,
    );

    this.pose.hindNearAngle = lerp(this.pose.hindNearAngle, target.hindNearAngle, kLimb);
    this.pose.hindFarAngle = lerp(this.pose.hindFarAngle, target.hindFarAngle, kLimb);

    this.pose.eyeGazeX = lerp(this.pose.eyeGazeX, target.eyeGazeX, kFace);
    this.pose.eyeGazeY = lerp(this.pose.eyeGazeY, target.eyeGazeY, kFace);
    this.pose.pupilScale = lerp(this.pose.pupilScale, target.pupilScale, kFace);
    this.pose.blinkAmount = lerp(this.pose.blinkAmount, blinkTarget, kBlink);
    this.pose.laughEyeAmount = lerp(this.pose.laughEyeAmount, target.laughEyeAmount, kFace);
    this.pose.angryLidAmount = lerp(this.pose.angryLidAmount, target.angryLidAmount, kFace);
    this.pose.sleepyLidAmount = lerp(this.pose.sleepyLidAmount, target.sleepyLidAmount, kFace);
    this.pose.sadLidAmount = lerp(this.pose.sadLidAmount, target.sadLidAmount, kFace);
    this.pose.wateryShine = lerp(this.pose.wateryShine, target.wateryShine, kFace);
    this.pose.eyeSparkleAmount = lerp(
      this.pose.eyeSparkleAmount,
      target.eyeSparkleAmount,
      kFace,
    );

    this.pose.browRaise = lerp(this.pose.browRaise, target.browRaise, kFace);
    this.pose.browTilt = lerp(this.pose.browTilt, target.browTilt, kFace);
    this.pose.browAsymmetry = lerp(this.pose.browAsymmetry, target.browAsymmetry, kFace);

    this.pose.mouthOpen = lerp(this.pose.mouthOpen, target.mouthOpen, kFace);
    this.pose.mouthSmile = lerp(this.pose.mouthSmile, target.mouthSmile, kFace);
    this.pose.mouthWidth = lerp(this.pose.mouthWidth, target.mouthWidth, kFace);
    this.pose.mouthOShape = lerp(this.pose.mouthOShape, target.mouthOShape, kFace);
    this.pose.mouthWailShape = lerp(this.pose.mouthWailShape, target.mouthWailShape, kFace);
    this.pose.mouthFrownLine = lerp(this.pose.mouthFrownLine, target.mouthFrownLine, kFace);
    this.pose.mouthShyWave = lerp(this.pose.mouthShyWave, target.mouthShyWave, kFace);
    this.pose.tongueScale = lerp(this.pose.tongueScale, target.tongueScale, kFace);

    this.pose.blushAlpha = lerp(this.pose.blushAlpha, target.blushAlpha, kFace);
    this.pose.waveRaysAlpha = lerp(this.pose.waveRaysAlpha, target.waveRaysAlpha, kFace);
    this.pose.waveRaysPhase = target.waveRaysPhase;
    this.pose.describeRaysAlpha = lerp(
      this.pose.describeRaysAlpha,
      target.describeRaysAlpha,
      kFace,
    );
    this.pose.describeRaysPhase = target.describeRaysPhase;
    this.pose.laughMarksAlpha = lerp(
      this.pose.laughMarksAlpha,
      target.laughMarksAlpha,
      kFace,
    );
    this.pose.laughMarksBounce = target.laughMarksBounce;
    this.pose.questionMarkAlpha = lerp(
      this.pose.questionMarkAlpha,
      target.questionMarkAlpha,
      kFace,
    );
    this.pose.questionMarkBob = target.questionMarkBob;
    this.pose.angryVeinAlpha = lerp(this.pose.angryVeinAlpha, target.angryVeinAlpha, kFace);
    this.pose.angryVeinPulse = target.angryVeinPulse;
    this.pose.tearsAlpha = lerp(this.pose.tearsAlpha, target.tearsAlpha, kFace);
    this.pose.tearStreamPhase = target.tearStreamPhase;
    this.pose.sleepyZzzAlpha = lerp(
      this.pose.sleepyZzzAlpha,
      target.sleepyZzzAlpha,
      kFace,
    );
    this.pose.sleepyZzzPhase = target.sleepyZzzPhase;
    this.pose.blushHeartsAlpha = lerp(
      this.pose.blushHeartsAlpha,
      target.blushHeartsAlpha,
      kFace,
    );
    this.pose.blushHeartsPhase = target.blushHeartsPhase;
    this.pose.congratsAlpha = lerp(this.pose.congratsAlpha, target.congratsAlpha, kFace);
    this.pose.congratsPhase = target.congratsPhase;

    // Update tear drops particle simulation when crying
    this.updateTearDrops(clampedDt);

    return this.pose;
  }

  private updateTearDrops(dt: number): void {
    if (this.pose.tearsAlpha > 0.25) {
      this.tearSpawnAccum += dt;
      if (this.tearSpawnAccum >= 0.24) {
        this.tearSpawnAccum = 0;
        const side: 'left' | 'right' = this.nextTearId % 2 === 0 ? 'left' : 'right';
        this.tearDrops.push({
          id: this.nextTearId++,
          side,
          x: side === 'left' ? -52 : 162,
          y: side === 'left' ? 54 : 64,
          vx: side === 'left' ? -18 : 24,
          vy: 38,
          radius: side === 'left' ? 12 : 14,
          alpha: 1,
        });
      }
    }

    for (let i = this.tearDrops.length - 1; i >= 0; i--) {
      const d = this.tearDrops[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 170 * dt;
      d.alpha -= dt * 0.9;
      if (d.alpha <= 0 || d.y > 220) {
        this.tearDrops.splice(i, 1);
      }
    }
  }

  private computeTargetPose(t: number, mt: number): TurtlePose {
    const p = createDefaultPose(this.pose.facing);

    // Base continuous swimming buoyancy, walking cadence & breathing (graceful sea turtle pace)
    const swimBob = Math.sin(t * 1.8);
    const swimSway = Math.cos(t * 1.3);
    const breathWave = Math.sin(t * 2.2);
    const locoCycle = Math.sin(t * 2.1);
    const locoCos = Math.cos(t * 2.1);

    p.breath = breathWave;
    p.bodyX = swimSway * 3.5;
    p.bodyY = swimBob * 5.0;
    p.bodyRot = Math.sin(t * 1.3) * 0.022;
    p.bodyScaleX = 1 + breathWave * 0.011;
    p.bodyScaleY = 1 - breathWave * 0.009;
    p.waveRaysPhase = t * 4.8;

    p.shellRot = Math.sin(t * 1.8 - 0.5) * 0.018;
    p.shellOffsetY = Math.sin(t * 1.8 - 0.4) * 2.0;

    // Hind flippers / hind legs trailing kick with natural phase delay
    p.hindNearAngle = Math.sin(t * 2.1 + Math.PI) * 0.22;
    p.hindFarAngle = Math.sin(t * 2.1) * 0.22;

    // Smooth, continuous entrance easing (smoothstep over 280ms) avoids step-function snapping when emotions begin
    const enterProgress = clamp(mt / 0.28, 0, 1);
    const enterEase = enterProgress * enterProgress * (3 - 2 * enterProgress);

    switch (this.motion) {
      case 'idle': {
        // Active natural walking/swimming locomotion with gentle smile and rhythmic limbs
        const idleCycle = Math.sin(t * 1.8);
        p.bodyX = Math.cos(t * 1.5) * 3.2;
        p.bodyY = idleCycle * 4.2;
        p.bodyRot = Math.sin(t * 1.5) * 0.022;

        p.headX = Math.sin(t * 1.8) * 2.2;
        p.headY = Math.sin(t * 1.8 - 0.3) * 2.6;
        p.headRot = Math.sin(t * 1.5) * 0.028;
        p.headLookX = Math.sin(t * 1.0) * 0.05;
        p.headLookY = Math.cos(t * 1.2) * 0.03;

        // Both front limbs swing in alternating walking/swimming rhythm
        p.nearFlipperDownAmount = 1.0;
        p.nearFlipperTuckAmount = 0;
        p.nearFlipperAngle = locoCycle * 0.24;
        p.nearFlipperBend = locoCos * 0.12;

        p.farFlipperChinAmount = 0;
        p.farFlipperRaiseAmount = 0;
        p.farFlipperAngle = -locoCycle * 0.24;
        p.farFlipperBend = -locoCos * 0.12;

        p.eyeGazeX = Math.sin(t * 1.0) * 0.05;
        p.eyeGazeY = -0.01;
        p.pupilScale = 1.0;
        p.browRaise = 0.14 + idleCycle * 0.04;

        p.mouthOpen = 0.22 + Math.sin(t * 1.6) * 0.04;
        p.mouthSmile = 0.92;
        p.mouthWidth = 0.94;
        p.blushAlpha = 0.18;

        p.waveRaysAlpha = 0;
        p.waveRaysPhase = t * 4.8;
        break;
      }

      case 'waving': {
        // Energetic waving of the near flipper (left-to-right hand waving motion)
        const waveCycle = Math.sin(t * 4.8);
        const waveFollow = Math.cos(t * 4.8 - 0.4);

        p.headX = Math.sin(t * 2.4) * 2.5 * enterEase;
        p.headY = Math.sin(t * 2.4 - 0.3) * 2.8 * enterEase;
        p.headRot = Math.sin(t * 2.4) * 0.038 * enterEase;
        p.headLookX = (0.05 + Math.sin(t * 1.8) * 0.04) * enterEase;
        p.headLookY = -0.02 * enterEase;

        // Near flipper raised high, waving left & right smoothly with wrist follow-through
        p.nearFlipperDownAmount = 1 - enterEase;
        p.nearFlipperTuckAmount = 0;
        p.nearFlipperAngle = waveCycle * 0.25 * enterEase;
        p.nearFlipperBend = waveFollow * 0.15 * enterEase;

        // Far flipper extended down-right balancing gently
        p.farFlipperChinAmount = 0;
        p.farFlipperRaiseAmount = 0;
        p.farFlipperAngle = Math.sin(t * 2.4 + 1.1) * 0.08 * enterEase;
        p.farFlipperBend = Math.cos(t * 2.4) * 0.05 * enterEase;

        p.eyeGazeX = (0.04 + Math.sin(t * 2.1) * 0.04) * enterEase;
        p.eyeGazeY = -0.02 * enterEase;
        p.pupilScale = 1.0 + 0.02 * enterEase;
        p.browRaise = 0.14 + (0.08 + Math.sin(t * 2.4) * 0.04) * enterEase;

        p.mouthOpen = 0.22 + (0.42 + Math.sin(t * 2.4) * 0.05) * enterEase;
        p.mouthSmile = 0.92 + 0.04 * enterEase;
        p.mouthWidth = 0.94 + 0.06 * enterEase;
        p.blushAlpha = 0.18 + 0.06 * enterEase;

        p.waveRaysAlpha = 0.95 * enterEase;
        p.waveRaysPhase = t * 4.8;
        break;
      }

      case 'laugh': {
        // Joyful, smooth chuckling belly laugh (C1 harmonic cosine wave - zero sharp cusps)
        const chuckleBounce = (0.5 - 0.5 * Math.cos(t * 5.2));
        const chuckleWave = Math.sin(t * 5.2);

        p.bodyY = swimBob * 3.5 - chuckleBounce * 6.5 * enterEase;
        p.bodyRot = chuckleWave * 0.03 * enterEase;
        p.bodyScaleX = 1.0 + (0.02 + chuckleBounce * 0.02) * enterEase;
        p.bodyScaleY = 1.0 - (0.02 + chuckleBounce * 0.02) * enterEase;

        p.headX = chuckleWave * 2.5 * enterEase;
        p.headY = -chuckleBounce * 7.5 * enterEase;
        p.headRot = (-0.03 + chuckleWave * 0.045) * enterEase;

        // Near flipper spread outward-left flapping happily
        p.nearFlipperDownAmount = 1 - 0.55 * enterEase;
        p.nearFlipperTuckAmount = 0.25 * enterEase;
        p.nearFlipperAngle = chuckleWave * 0.14 * enterEase;
        p.nearFlipperBend = Math.cos(t * 5.2) * 0.08 * enterEase;

        // Far flipper extended down-right flapping in joyful rhythm
        p.farFlipperChinAmount = 0;
        p.farFlipperRaiseAmount = 0;
        p.farFlipperAngle = -chuckleWave * 0.12 * enterEase;

        // Happy closed ^ ^ laughing eyes!
        p.laughEyeAmount = 1.0 * enterEase;
        p.browRaise = 0.14 + (0.16 + chuckleBounce * 0.06) * enterEase;
        p.blushAlpha = 0.18 + 0.7 * enterEase;

        // Wide open laughing mouth pulsing harmonically with chuckle
        p.mouthOpen = 0.22 + (0.65 + chuckleBounce * 0.14) * enterEase;
        p.mouthSmile = 1.0;
        p.mouthWidth = 0.94 + (0.2 + chuckleBounce * 0.05) * enterEase;
        p.tongueScale = 1.0 + 0.12 * enterEase;

        p.waveRaysAlpha = 0;
        p.laughMarksAlpha = 1.0 * enterEase;
        p.laughMarksBounce = chuckleWave;
        break;
      }

      case 'wondered': {
        // Curious head tilt + far flipper tucked below chin + floating '?'
        const ponderWave = Math.sin(t * 2.4);
        const chinTap = Math.sin(t * 3.6);

        p.headX = (3.5 + ponderWave * 2.0) * enterEase;
        p.headY = (1.8 + Math.cos(t * 2.4) * 2.0) * enterEase;
        p.headRot = (0.07 + ponderWave * 0.035) * enterEase;
        p.headLookX = (0.1 + Math.sin(t * 1.8) * 0.05) * enterEase;
        p.headLookY = (-0.12 + Math.cos(t * 2.0) * 0.04) * enterEase;

        // Near flipper extends down-left
        p.nearFlipperDownAmount = 1.0;
        p.nearFlipperTuckAmount = 0;
        p.nearFlipperAngle = ponderWave * 0.05 * enterEase;

        // Far flipper curls up smoothly below chin
        p.farFlipperChinAmount = 1.0 * enterEase;
        p.farFlipperRaiseAmount = 0;
        p.farFlipperAngle = chinTap * 0.05 * enterEase;
        p.farFlipperBend = ponderWave * 0.04 * enterEase;

        p.eyeGazeX = (0.11 + Math.sin(t * 1.8) * 0.05) * enterEase;
        p.eyeGazeY = (-0.14 + Math.cos(t * 2.2) * 0.04) * enterEase;
        p.pupilScale = 1.0 + 0.06 * enterEase;
        p.browRaise = 0.14 + 0.12 * enterEase;
        p.browAsymmetry = (0.18 + ponderWave * 0.04) * enterEase;

        // Small cute surprised/curious 'o' mouth
        p.mouthOShape = 1.0 * enterEase;
        p.mouthOpen = 0.22 + (0.2 + Math.sin(t * 2.8) * 0.04) * enterEase;
        p.mouthWidth = 0.94 - 0.55 * enterEase;
        p.mouthSmile = 0.92 - 0.85 * enterEase;
        p.blushAlpha = 0.18;

        p.waveRaysAlpha = 0;
        p.questionMarkAlpha = 1.0 * enterEase;
        p.questionMarkBob = Math.sin(t * 2.8);
        break;
      }

      case 'angry': {
        // Grumpy crouched posture, deep V-furrowed brows, tight downturned frown, pulsing red vein
        // Smooth grumpy huff cadence (no high-frequency 22 rad/s tremor)
        const huffCycle = Math.sin(t * 3.2);
        const huffSwell = Math.max(0, huffCycle);

        p.bodyX = Math.cos(t * 1.6) * 1.2 * enterEase;
        p.bodyY = (5 + huffCycle * 2.8) * enterEase;
        p.bodyRot = (0.03 + huffCycle * 0.015) * enterEase;
        p.bodyScaleX = 1.0 + (0.02 + huffSwell * 0.02) * enterEase;
        p.bodyScaleY = 1.0 - 0.02 * enterEase;

        p.headX = (4 + Math.sin(t * 1.6) * 1.4) * enterEase;
        p.headY = (7 + huffCycle * 2.4) * enterEase;
        p.headRot = (0.05 + huffCycle * 0.012) * enterEase;
        p.headLookX = 0.05 * enterEase;
        p.headLookY = 0.06 * enterEase;

        // Near flipper angled down-left, far flipper angled down-right
        p.nearFlipperDownAmount = 1.0;
        p.nearFlipperTuckAmount = 0;
        p.nearFlipperAngle = huffCycle * 0.06 * enterEase;

        p.farFlipperChinAmount = 0;
        p.farFlipperRaiseAmount = 0;
        p.farFlipperAngle = -huffCycle * 0.06 * enterEase;

        p.angryLidAmount = 1.0 * enterEase;
        p.eyeGazeX = 0.04 * enterEase;
        p.eyeGazeY = -0.04 * enterEase;
        p.pupilScale = 1.0 - 0.05 * enterEase;
        p.browRaise = 0.14 - (0.55 + huffSwell * 0.06) * enterEase;
        p.browTilt = -0.85 * enterEase;

        // Tight downturned frown curve
        p.mouthFrownLine = 1.0 * enterEase;
        p.mouthOpen = 0.22 - 0.22 * enterEase;
        p.mouthSmile = 0.92 - 1.82 * enterEase;
        p.mouthWidth = 0.94 - 0.16 * enterEase;
        p.blushAlpha = 0.18 - 0.1 * enterEase;

        p.waveRaysAlpha = 0;
        p.angryVeinAlpha = 1.0 * enterEase;
        p.angryVeinPulse = Math.sin(t * 4.8);
        break;
      }

      case 'crying': {
        // Heartbroken sobbing rhythm, glistening eyes, waterfall tears & droplets, wailing mouth
        // Smooth gentle sobbing heave (eliminates rapid 18 rad/s shiver)
        const sobCycle = Math.sin(t * 3.2);
        const sobHeave = Math.max(0, sobCycle);

        p.bodyX = Math.cos(t * 1.6) * 1.2 * enterEase;
        p.bodyY = (7 + sobCycle * 3.5) * enterEase;
        p.bodyRot = (0.02 + sobCycle * 0.018) * enterEase;

        p.headX = Math.sin(t * 1.6) * 1.4 * enterEase;
        p.headY = (8 + sobCycle * 4.0) * enterEase;
        p.headRot = (0.025 + Math.sin(t * 2.0) * 0.025) * enterEase;

        // Drooping sad flippers
        p.nearFlipperDownAmount = 1.0;
        p.nearFlipperTuckAmount = 0;
        p.nearFlipperAngle = sobCycle * 0.06 * enterEase;

        p.farFlipperChinAmount = 0;
        p.farFlipperRaiseAmount = 0.25 * enterEase;
        p.farFlipperAngle = sobCycle * 0.07 * enterEase;

        p.sadLidAmount = 1.0 * enterEase;
        p.wateryShine = 1.0 * enterEase;
        p.eyeGazeX = 0;
        p.eyeGazeY = (-0.05 + sobCycle * 0.025) * enterEase;
        p.pupilScale = 1.0 + 0.06 * enterEase;
        p.browRaise = 0.14 - 0.02 * enterEase;
        p.browTilt = (0.8 + sobHeave * 0.06) * enterEase;

        // Wide open sad wailing mouth
        p.mouthWailShape = 1.0 * enterEase;
        p.mouthOpen = 0.22 + (0.62 + sobHeave * 0.1) * enterEase;
        p.mouthSmile = 0.92 - 1.77 * enterEase;
        p.mouthWidth = 0.94 + 0.1 * enterEase;
        p.blushAlpha = 0.18 + 0.08 * enterEase;

        p.waveRaysAlpha = 0;
        p.tearsAlpha = 1.0 * enterEase;
        p.tearStreamPhase = t * 4.8;
        break;
      }

      case 'describing': {
        // Enthusiastic manual explaining/presenting motion with rhythmic speech cadence
        const gestureArc = Math.sin(t * 3.8);
        const gestureSub = Math.cos(t * 3.8 - 0.4);
        const syllable = 0.52 + 0.3 * Math.sin(t * 5.2) + 0.12 * Math.cos(t * 2.6);

        p.bodyY = swimBob * 3.5 + Math.sin(t * 3.8) * 2.5 * enterEase;
        p.bodyRot = (-0.015 + gestureArc * 0.02) * enterEase;

        p.headX = (2.5 + gestureArc * 2.8) * enterEase;
        p.headY = (-1.5 + Math.abs(gestureArc) * 2.2) * enterEase;
        p.headRot = (-0.03 + gestureArc * 0.04) * enterEase;
        p.headLookX = (0.12 + gestureArc * 0.04) * enterEase;
        p.headLookY = -0.04 * enterEase;

        // Near flipper curled neatly in front of chest
        p.nearFlipperDownAmount = 1 - enterEase;
        p.nearFlipperTuckAmount = 1.0 * enterEase;
        p.nearFlipperAngle = gestureArc * 0.08 * enterEase;
        p.nearFlipperBend = gestureSub * 0.06 * enterEase;

        // Far flipper raised up-outward to the right gesturing to explain!
        p.farFlipperChinAmount = 0;
        p.farFlipperRaiseAmount = 1.0 * enterEase;
        p.farFlipperAngle = gestureArc * 0.22 * enterEase;
        p.farFlipperBend = gestureSub * 0.14 * enterEase;

        p.eyeGazeX = (0.12 + gestureArc * 0.04) * enterEase;
        p.eyeGazeY = -0.03 * enterEase;
        p.pupilScale = 1.0 + 0.03 * enterEase;
        p.browRaise = 0.14 + (0.12 + Math.max(0, gestureArc) * 0.06) * enterEase;

        // Lively talking mouth opening and closing smoothly on syllables
        p.mouthOpen = 0.22 + (clamp(syllable, 0.25, 0.88) - 0.22) * enterEase;
        p.mouthSmile = 0.94;
        p.mouthWidth = 0.94 + 0.06 * enterEase;
        p.tongueScale = 0.92 + 0.12 * enterEase;
        p.blushAlpha = 0.18 + 0.06 * enterEase;

        p.waveRaysAlpha = 0;
        p.describeRaysAlpha = 0.95 * enterEase;
        p.describeRaysPhase = t * 3.8;
        break;
      }

      case 'sleepy': {
        // Drowsy, peaceful slow breathing, heavy drooping eyelids, nodding head, yawning 'o' mouth + floating Zzz
        const drowsyBreath = Math.sin(t * 1.4);
        const yawnCycle = Math.max(0, Math.sin(t * 1.2 - 0.5));
        const headNod = Math.sin(t * 1.4 + 0.4);

        p.breath = drowsyBreath * 1.3;
        p.bodyX = Math.cos(t * 1.0) * 2.0 * enterEase;
        p.bodyY = (8 + drowsyBreath * 4.0) * enterEase;
        p.bodyRot = (0.035 + headNod * 0.02) * enterEase;
        p.bodyScaleX = 1 + drowsyBreath * 0.014 * enterEase;
        p.bodyScaleY = 1 - drowsyBreath * 0.012 * enterEase;

        // Head heavy and nodding drowsily
        p.headX = (1.5 + headNod * 1.6) * enterEase;
        p.headY = (9 + headNod * 4.5 - yawnCycle * 3.0) * enterEase;
        p.headRot = (0.05 + headNod * 0.035 - yawnCycle * 0.03) * enterEase;
        p.headLookX = -0.04 * enterEase;
        p.headLookY = (0.1 + headNod * 0.04) * enterEase;

        // Both flippers hanging low and relaxed
        p.nearFlipperDownAmount = 1.0;
        p.nearFlipperTuckAmount = 0;
        p.nearFlipperAngle = (-0.06 + drowsyBreath * 0.03) * enterEase;

        p.farFlipperChinAmount = 0;
        p.farFlipperRaiseAmount = 0;
        p.farFlipperAngle = (0.05 - drowsyBreath * 0.03) * enterEase;

        p.hindNearAngle = Math.sin(t * 1.4 - 0.6) * 0.03 * enterEase;
        p.hindFarAngle = Math.sin(t * 1.4 - 1.2) * 0.03 * enterEase;

        // Heavy half-closed droopy sleepy eyelids
        p.sleepyLidAmount = 1.0 * enterEase;
        p.blinkAmount = Math.max(0, Math.sin(t * 1.4 - 1.1) * 0.3) * enterEase;
        p.eyeGazeX = -0.02 * enterEase;
        p.eyeGazeY = 0.12 * enterEase;
        p.pupilScale = 1.0 - 0.04 * enterEase;
        p.browRaise = 0.14 - (0.32 - yawnCycle * 0.1) * enterEase;
        p.browTilt = 0.32 * enterEase;

        // Sleepy yawning / sighing round mouth
        p.mouthOShape = 1.0 * enterEase;
        p.mouthOpen = 0.22 + (0.15 + yawnCycle * 0.55) * enterEase;
        p.mouthWidth = 0.94 - (0.45 - yawnCycle * 0.2) * enterEase;
        p.mouthSmile = 0.92 - 1.05 * enterEase;
        p.blushAlpha = 0.18 - 0.06 * enterEase;

        p.waveRaysAlpha = 0;
        p.sleepyZzzAlpha = 1.0 * enterEase;
        p.sleepyZzzPhase = t * 1.6;
        break;
      }

      case 'blush': {
        // Bashful, shyly swaying turtle with glowing rosy cheeks, hands tucked shyly near face/chest, and floating hearts
        const shySway = Math.sin(t * 2.8);
        const shyFlutter = Math.sin(t * 2.8 + 0.5);

        p.bodyX = shySway * 3.5 * enterEase;
        p.bodyY = (3 + Math.abs(shySway) * 2.5) * enterEase;
        p.bodyRot = (-0.02 + shySway * 0.028) * enterEase;
        p.bodyScaleX = 1.0 - (0.01 - Math.abs(shySway) * 0.012) * enterEase;
        p.bodyScaleY = 1.0 + (0.01 - Math.abs(shySway) * 0.012) * enterEase;

        // Head tucked down-inward bashfully with a cute shy tilt
        p.headX = (-2.5 + shySway * 2.8) * enterEase;
        p.headY = (4.5 + Math.abs(shySway) * 2.4) * enterEase;
        p.headRot = (-0.06 + shySway * 0.04) * enterEase;
        p.headLookX = (-0.1 + shySway * 0.06) * enterEase;
        p.headLookY = -0.08 * enterEase;

        // Near flipper curled shyly across the chest, far flipper tucked up near the cheek
        p.nearFlipperDownAmount = 1 - enterEase;
        p.nearFlipperTuckAmount = 1.0 * enterEase;
        p.nearFlipperAngle = shySway * 0.09 * enterEase;
        p.nearFlipperBend = shyFlutter * 0.05 * enterEase;

        p.farFlipperChinAmount = 1.0 * enterEase;
        p.farFlipperRaiseAmount = 0;
        p.farFlipperAngle = -shySway * 0.08 * enterEase;
        p.farFlipperBend = shyFlutter * 0.04 * enterEase;

        // Big shiny bashful eyes glancing shyly upward/sideways
        p.eyeGazeX = (-0.12 + shySway * 0.06) * enterEase;
        p.eyeGazeY = (-0.1 + Math.cos(t * 2.8) * 0.03) * enterEase;
        p.pupilScale = 1.0 + 0.08 * enterEase;
        p.wateryShine = 0.55 * enterEase;
        p.eyeSparkleAmount = 0.65 * enterEase;
        p.browRaise = 0.14 + 0.02 * enterEase;
        p.browTilt = 0.48 * enterEase;

        // Cute bashful wavy smile + deep rosy blush
        p.mouthShyWave = 1.0 * enterEase;
        p.mouthOpen = 0.22 + (Math.abs(shySway) * 0.06) * enterEase;
        p.mouthSmile = 0.88;
        p.mouthWidth = 0.94 - 0.18 * enterEase;
        p.blushAlpha = 0.18 + 0.82 * enterEase;

        p.waveRaysAlpha = 0;
        p.blushHeartsAlpha = 1.0 * enterEase;
        p.blushHeartsPhase = t * 2.8;
        break;
      }

      case 'congratulate': {
        // Joyful, proud celebratory cheering bounce (C1 harmonic cosine curve - zero sharp cusps)
        const cheerBounce = (0.5 - 0.5 * Math.cos(t * 4.2));
        const cheerSwing = Math.sin(t * 4.2);
        const clapWave = Math.sin(t * 4.2) * 0.12;

        p.bodyX = cheerSwing * 2.4 * enterEase;
        p.bodyY = -cheerBounce * 8.5 * enterEase;
        p.bodyRot = cheerSwing * 0.035 * enterEase;
        p.bodyScaleX = 1.0 + (0.02 - cheerBounce * 0.025) * enterEase;
        p.bodyScaleY = 1.0 - (0.02 - cheerBounce * 0.025) * enterEase;

        p.headX = cheerSwing * 2.8 * enterEase;
        p.headY = (-4 - cheerBounce * 5.5) * enterEase;
        p.headRot = cheerSwing * 0.045 * enterEase;
        p.headLookX = 0.05 * enterEase;
        p.headLookY = -0.06 * enterEase;

        // BOTH front flippers raised high cheering & applauding happily!
        p.nearFlipperDownAmount = 1 - enterEase;
        p.nearFlipperTuckAmount = 0;
        p.nearFlipperAngle = (0.1 + cheerSwing * 0.2 + clapWave) * enterEase;
        p.nearFlipperBend = Math.cos(t * 4.2) * 0.12 * enterEase;

        p.farFlipperChinAmount = 0;
        p.farFlipperRaiseAmount = 1.0 * enterEase;
        p.farFlipperAngle = (-0.18 - cheerSwing * 0.2 - clapWave) * enterEase;
        p.farFlipperBend = Math.sin(t * 4.2) * 0.12 * enterEase;

        // Happy kicking hind flippers
        p.hindNearAngle = cheerSwing * 0.14 * enterEase;
        p.hindFarAngle = -cheerSwing * 0.14 * enterEase;

        // Bright sparkling celebratory eyes
        p.eyeGazeX = 0.05 * enterEase;
        p.eyeGazeY = -0.05 * enterEase;
        p.pupilScale = 1.0 + 0.08 * enterEase;
        p.eyeSparkleAmount = 1.0 * enterEase;
        p.browRaise = 0.14 + (0.2 + cheerBounce * 0.06) * enterEase;
        p.blushAlpha = 0.18 + 0.5 * enterEase;

        // Beaming wide celebratory open smile
        p.mouthOpen = 0.22 + (0.65 + cheerBounce * 0.12) * enterEase;
        p.mouthSmile = 1.0;
        p.mouthWidth = 0.94 + 0.22 * enterEase;
        p.tongueScale = 1.0 + 0.15 * enterEase;

        p.waveRaysAlpha = 0;
        p.congratsAlpha = 1.0 * enterEase;
        p.congratsPhase = t * 4.2;
        break;
      }
    }

    return p;
  }
}
