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

    // Smooth exponential interpolation across all channels
    const kBody = 1 - Math.exp(-clampedDt * 10);
    const kLimb = 1 - Math.exp(-clampedDt * 13);
    const kFace = 1 - Math.exp(-clampedDt * 15);
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
        // Energetic waving of the near flipper (left-to-right hand waving motion!)
        const waveCycle = Math.sin(t * 6.4);
        const waveFollow = Math.cos(t * 6.4 - 0.4);

        p.headX = Math.sin(t * 3.2) * 3;
        p.headY = Math.sin(t * 3.2 - 0.3) * 3.5;
        p.headRot = Math.sin(t * 3.2) * 0.045;
        p.headLookX = 0.05 + Math.sin(t * 1.8) * 0.04;
        p.headLookY = -0.02;

        // Near flipper raised high, waving left & right smoothly with wrist follow-through
        p.nearFlipperDownAmount = 0;
        p.nearFlipperTuckAmount = 0;
        p.nearFlipperAngle = waveCycle * 0.28;
        p.nearFlipperBend = waveFollow * 0.18;

        // Far flipper extended down-right balancing gently
        p.farFlipperChinAmount = 0;
        p.farFlipperRaiseAmount = 0;
        p.farFlipperAngle = Math.sin(t * 3.2 + 1.1) * 0.08;
        p.farFlipperBend = Math.cos(t * 3.2) * 0.05;

        p.eyeGazeX = 0.04 + Math.sin(t * 2.1) * 0.04;
        p.eyeGazeY = -0.02;
        p.pupilScale = 1.02;
        p.browRaise = 0.2 + Math.sin(t * 3.2) * 0.05;

        p.mouthOpen = 0.68 + Math.sin(t * 3.2) * 0.07;
        p.mouthSmile = 0.95;
        p.mouthWidth = 1.0;
        p.blushAlpha = 0.16;

        p.waveRaysAlpha = 0.95;
        p.waveRaysPhase = t * 6.4;
        break;
      }

      case 'laugh': {
        // Joyful chuckling bounce
        const chuckle = Math.abs(Math.sin(t * 9.5));
        const chuckleSigned = Math.sin(t * 9.5);

        p.bodyY = swimBob * 3.5 - chuckle * 8.5;
        p.bodyRot = Math.sin(t * 4.75) * 0.04;
        p.bodyScaleX = 1.02 + chuckle * 0.022;
        p.bodyScaleY = 0.98 - chuckle * 0.022;

        p.headX = Math.sin(t * 4.75) * 3.5;
        p.headY = -chuckle * 10;
        p.headRot = -0.05 + Math.sin(t * 4.75) * 0.06;

        // Near flipper spread outward-left flapping happily
        p.nearFlipperDownAmount = 0.45;
        p.nearFlipperTuckAmount = 0.25;
        p.nearFlipperAngle = chuckleSigned * 0.16;
        p.nearFlipperBend = Math.cos(t * 9.5) * 0.1;

        // Far flipper extended down-right flapping in joyful rhythm
        p.farFlipperChinAmount = 0;
        p.farFlipperRaiseAmount = 0;
        p.farFlipperAngle = -chuckleSigned * 0.14;

        // Happy closed ^ ^ laughing eyes!
        p.laughEyeAmount = 1.0;
        p.browRaise = 0.28 + chuckle * 0.08;
        p.blushAlpha = 0.88;

        // Wide open laughing mouth pulsing with each chuckle
        p.mouthOpen = 0.9 + chuckle * 0.16;
        p.mouthSmile = 1.0;
        p.mouthWidth = 1.16 + chuckle * 0.05;
        p.tongueScale = 1.12;

        p.waveRaysAlpha = 0;
        p.laughMarksAlpha = 1.0;
        p.laughMarksBounce = chuckleSigned;
        break;
      }

      case 'wondered': {
        // Curious head tilt + far hand tucked right below face/chin + floating '?'
        const ponderWave = Math.sin(t * 2.7);
        const chinTap = Math.sin(t * 5.4);

        p.headX = 4 + ponderWave * 2.5;
        p.headY = 2 + Math.cos(t * 2.7) * 2.5;
        p.headRot = 0.08 + ponderWave * 0.045;
        p.headLookX = 0.1 + Math.sin(t * 1.8) * 0.06;
        p.headLookY = -0.14 + Math.cos(t * 2.2) * 0.05;

        // Near flipper extends down-left
        p.nearFlipperDownAmount = 1.0;
        p.nearFlipperTuckAmount = 0;
        p.nearFlipperAngle = ponderWave * 0.06;

        // Far flipper curls up to rest right below the chin/mouth!
        p.farFlipperChinAmount = 1.0;
        p.farFlipperRaiseAmount = 0;
        p.farFlipperAngle = chinTap * 0.06;
        p.farFlipperBend = ponderWave * 0.05;

        p.eyeGazeX = 0.12 + Math.sin(t * 1.9) * 0.07;
        p.eyeGazeY = -0.16 + Math.cos(t * 2.4) * 0.05;
        p.pupilScale = 1.06;
        p.browRaise = 0.24;
        p.browAsymmetry = 0.2 + ponderWave * 0.05;

        // Small cute surprised/curious 'o' mouth
        p.mouthOShape = 1.0;
        p.mouthOpen = 0.44 + Math.sin(t * 3.2) * 0.05;
        p.mouthWidth = 0.36;
        p.mouthSmile = 0.05;
        p.blushAlpha = 0.1;

        p.waveRaysAlpha = 0;
        p.questionMarkAlpha = 1.0;
        p.questionMarkBob = Math.sin(t * 3.4);
        break;
      }

      case 'angry': {
        // Grumpy crouched posture, deep V-furrowed eyebrows, tight frown, pulsing red vein
        const huff = Math.sin(t * 4.2);
        const tremor = Math.sin(t * 22) * (0.35 + 0.65 * Math.max(0, huff));

        p.bodyX = tremor * 1.3;
        p.bodyY = 7 + huff * 3.5;
        p.bodyRot = 0.04 + huff * 0.018;
        p.bodyScaleX = 1.025 + Math.max(0, huff) * 0.02;
        p.bodyScaleY = 0.975;

        p.headX = 5 + tremor * 1.6;
        p.headY = 9 + huff * 3.0;
        p.headRot = 0.06 + tremor * 0.01;
        p.headLookX = 0.05;
        p.headLookY = 0.06;

        // Near flipper angled down-left, far flipper angled down-right
        p.nearFlipperDownAmount = 1.0;
        p.nearFlipperTuckAmount = 0;
        p.nearFlipperAngle = huff * 0.07;

        p.farFlipperChinAmount = 0;
        p.farFlipperRaiseAmount = 0;
        p.farFlipperAngle = -huff * 0.07;

        p.angryLidAmount = 1.0;
        p.eyeGazeX = 0.04;
        p.eyeGazeY = -0.04;
        p.pupilScale = 0.95;
        p.browRaise = -0.45 - Math.max(0, huff) * 0.08;
        p.browTilt = -0.85;

        // Tight downturned frown curve
        p.mouthFrownLine = 1.0;
        p.mouthOpen = 0.0;
        p.mouthSmile = -0.9;
        p.mouthWidth = 0.78;
        p.blushAlpha = 0.06;

        p.waveRaysAlpha = 0;
        p.angryVeinAlpha = 1.0;
        p.angryVeinPulse = Math.sin(t * 8.5);
        break;
      }

      case 'crying': {
        // Heartbroken sobbing motion, glistening eyes, waterfall tears & droplets, wailing mouth
        const sobCycle = Math.sin(t * 5.6);
        const sobShiver = Math.sin(t * 18) * 1.4;

        p.bodyX = sobShiver * 0.8;
        p.bodyY = 9 + sobCycle * 4.5;
        p.bodyRot = 0.025 + sobCycle * 0.022;

        p.headX = sobShiver;
        p.headY = 10 + sobCycle * 5.0;
        p.headRot = 0.03 + Math.sin(t * 2.8) * 0.035;

        // Drooping sad flippers
        p.nearFlipperDownAmount = 1.0;
        p.nearFlipperTuckAmount = 0;
        p.nearFlipperAngle = sobCycle * 0.07;

        p.farFlipperChinAmount = 0;
        p.farFlipperRaiseAmount = 0.28;
        p.farFlipperAngle = sobCycle * 0.08;

        p.sadLidAmount = 1.0;
        p.wateryShine = 1.0;
        p.eyeGazeX = 0;
        p.eyeGazeY = -0.05 + sobCycle * 0.03;
        p.pupilScale = 1.06;
        p.browRaise = 0.12;
        p.browTilt = 0.84 + sobCycle * 0.06;

        // Wide open sad wailing mouth
        p.mouthWailShape = 1.0;
        p.mouthOpen = 0.86 + sobCycle * 0.12;
        p.mouthSmile = -0.85;
        p.mouthWidth = 1.04;
        p.blushAlpha = 0.22;

        p.waveRaysAlpha = 0;
        p.tearsAlpha = 1.0;
        p.tearStreamPhase = t * 6.0;
        break;
      }

      case 'describing': {
        // Enthusiastic manual explaining/presenting motion
        const gestureArc = Math.sin(t * 5.2);
        const gestureSub = Math.cos(t * 10.4);
        const syllable =
          0.52 +
          0.28 * Math.sin(t * 11.5) +
          0.18 * Math.cos(t * 7.3) +
          0.1 * Math.sin(t * 16.5);

        p.bodyY = swimBob * 4.5 + Math.sin(t * 5.2) * 3;
        p.bodyRot = -0.02 + gestureArc * 0.025;

        p.headX = 3 + gestureArc * 3.5;
        p.headY = -2 + Math.abs(gestureArc) * 3.0;
        p.headRot = -0.04 + gestureArc * 0.055;
        p.headLookX = 0.14 + gestureArc * 0.05;
        p.headLookY = -0.05;

        // Near flipper curled neatly in front of chest
        p.nearFlipperDownAmount = 0;
        p.nearFlipperTuckAmount = 1.0;
        p.nearFlipperAngle = gestureArc * 0.09;
        p.nearFlipperBend = gestureSub * 0.07;

        // Far flipper raised up-outward to the right gesturing to explain!
        p.farFlipperChinAmount = 0;
        p.farFlipperRaiseAmount = 1.0;
        p.farFlipperAngle = gestureArc * 0.25;
        p.farFlipperBend = gestureSub * 0.16;

        p.eyeGazeX = 0.14 + gestureArc * 0.05;
        p.eyeGazeY = -0.04;
        p.pupilScale = 1.03;
        p.browRaise = 0.26 + Math.max(0, gestureArc) * 0.07;

        // Lively talking mouth that opens and closes on speech syllables
        p.mouthOpen = clamp(syllable, 0.28, 0.92);
        p.mouthSmile = 0.94;
        p.mouthWidth = 0.95 + clamp(syllable, 0, 1) * 0.1;
        p.tongueScale = 0.92 + clamp(syllable, 0, 1) * 0.15;
        p.blushAlpha = 0.24;

        p.waveRaysAlpha = 0;
        p.describeRaysAlpha = 0.95;
        p.describeRaysPhase = t * 5.2;
        break;
      }

      case 'sleepy': {
        // Drowsy, sleepy/bored slow breathing, heavy drooping eyelids, nodding head, yawning 'o' mouth + floating Zzz
        const drowsyBreath = Math.sin(t * 1.6);
        const yawnCycle = Math.max(0, Math.sin(t * 1.4 - 0.5));
        const headNod = Math.sin(t * 1.6 + 0.4);

        p.breath = drowsyBreath * 1.4;
        p.bodyX = Math.cos(t * 1.1) * 2.5;
        p.bodyY = 10 + drowsyBreath * 5.0;
        p.bodyRot = 0.045 + headNod * 0.025;
        p.bodyScaleX = 1 + drowsyBreath * 0.016;
        p.bodyScaleY = 1 - drowsyBreath * 0.014;

        // Head heavy and nodding drowsily
        p.headX = 2 + headNod * 2.0;
        p.headY = 11 + headNod * 5.5 - yawnCycle * 3.5;
        p.headRot = 0.07 + headNod * 0.045 - yawnCycle * 0.04;
        p.headLookX = -0.04;
        p.headLookY = 0.12 + headNod * 0.05;

        // Both flippers hanging low and relaxed
        p.nearFlipperDownAmount = 1.0;
        p.nearFlipperTuckAmount = 0;
        p.nearFlipperAngle = -0.08 + drowsyBreath * 0.04;

        p.farFlipperChinAmount = 0;
        p.farFlipperRaiseAmount = 0;
        p.farFlipperAngle = 0.06 - drowsyBreath * 0.04;

        p.hindNearAngle = Math.sin(t * 1.6 - 0.6) * 0.04;
        p.hindFarAngle = Math.sin(t * 1.6 - 1.2) * 0.04;

        // Heavy half-closed droopy sleepy eyelids
        p.sleepyLidAmount = 1.0;
        p.blinkAmount = Math.max(0, Math.sin(t * 1.6 - 1.1) * 0.35);
        p.eyeGazeX = -0.02;
        p.eyeGazeY = 0.14;
        p.pupilScale = 0.96;
        p.browRaise = -0.18 + yawnCycle * 0.12;
        p.browTilt = 0.32;

        // Sleepy yawning / sighing round mouth
        p.mouthOShape = 1.0;
        p.mouthOpen = 0.32 + yawnCycle * 0.68;
        p.mouthWidth = 0.42 + yawnCycle * 0.25;
        p.mouthSmile = -0.15;
        p.blushAlpha = 0.12;

        p.waveRaysAlpha = 0;
        p.sleepyZzzAlpha = 1.0;
        p.sleepyZzzPhase = t * 1.8;
        break;
      }

      case 'blush': {
        // Bashful, shyly wiggling turtle with glowing rosy cheeks, hands tucked shyly near face/chest, and floating hearts
        const shySway = Math.sin(t * 3.6);
        const shyFlutter = Math.sin(t * 7.2);

        p.bodyX = shySway * 4.5;
        p.bodyY = 4 + Math.abs(shySway) * 3.5;
        p.bodyRot = -0.025 + shySway * 0.038;
        p.bodyScaleX = 0.99 + Math.abs(shySway) * 0.015;
        p.bodyScaleY = 1.01 - Math.abs(shySway) * 0.015;

        // Head tucked down-inward bashfully with a cute shy tilt
        p.headX = -3 + shySway * 3.5;
        p.headY = 6 + Math.abs(shySway) * 3.0;
        p.headRot = -0.08 + shySway * 0.055;
        p.headLookX = -0.12 + shySway * 0.08;
        p.headLookY = -0.1;

        // Near flipper curled shyly across the chest, far flipper tucked up near the cheek!
        p.nearFlipperDownAmount = 0;
        p.nearFlipperTuckAmount = 1.0;
        p.nearFlipperAngle = shySway * 0.11;
        p.nearFlipperBend = shyFlutter * 0.06;

        p.farFlipperChinAmount = 1.0;
        p.farFlipperRaiseAmount = 0;
        p.farFlipperAngle = -shySway * 0.09;
        p.farFlipperBend = shyFlutter * 0.05;

        // Big shiny bashful eyes glancing shyly upward/sideways
        p.eyeGazeX = -0.15 + shySway * 0.08;
        p.eyeGazeY = -0.12 + Math.cos(t * 3.6) * 0.04;
        p.pupilScale = 1.09;
        p.wateryShine = 0.55;
        p.eyeSparkleAmount = 0.65;
        p.browRaise = 0.16;
        p.browTilt = 0.48;

        // Cute bashful wavy smile + deep rosy blush
        p.mouthShyWave = 1.0;
        p.mouthOpen = 0.18 + Math.abs(shySway) * 0.08;
        p.mouthSmile = 0.88;
        p.mouthWidth = 0.76;
        p.blushAlpha = 1.0;

        p.waveRaysAlpha = 0;
        p.blushHeartsAlpha = 1.0;
        p.blushHeartsPhase = t * 3.6;
        break;
      }

      case 'congratulate': {
        // Joyful, proud celebratory cheering bounce with BOTH flippers raised high, starry eyes, and festive confetti/stars!
        const cheerBeat = Math.abs(Math.sin(t * 7.6));
        const cheerSwing = Math.sin(t * 7.6);
        const clapWave = Math.sin(t * 15.2);

        p.bodyX = cheerSwing * 3.0;
        p.bodyY = -cheerBeat * 11.5;
        p.bodyRot = cheerSwing * 0.045;
        p.bodyScaleX = 1.025 - cheerBeat * 0.03;
        p.bodyScaleY = 0.975 + cheerBeat * 0.035;

        p.headX = cheerSwing * 3.5;
        p.headY = -5 - cheerBeat * 7.5;
        p.headRot = cheerSwing * 0.06;
        p.headLookX = 0.06;
        p.headLookY = -0.08;

        // BOTH front flippers raised high cheering & applauding happily!
        p.nearFlipperDownAmount = 0;
        p.nearFlipperTuckAmount = 0;
        p.nearFlipperAngle = 0.12 + cheerSwing * 0.24 + clapWave * 0.06;
        p.nearFlipperBend = Math.cos(t * 7.6) * 0.16;

        p.farFlipperChinAmount = 0;
        p.farFlipperRaiseAmount = 1.0;
        p.farFlipperAngle = -0.22 - cheerSwing * 0.24 - clapWave * 0.06;
        p.farFlipperBend = Math.sin(t * 7.6) * 0.16;

        // Happy kicking hind flippers
        p.hindNearAngle = cheerSwing * 0.16;
        p.hindFarAngle = -cheerSwing * 0.16;

        // Bright sparkling celebratory eyes
        p.eyeGazeX = 0.05;
        p.eyeGazeY = -0.06;
        p.pupilScale = 1.08;
        p.eyeSparkleAmount = 1.0;
        p.browRaise = 0.34 + cheerBeat * 0.08;
        p.blushAlpha = 0.68;

        // Beaming wide celebratory open smile
        p.mouthOpen = 0.88 + cheerBeat * 0.16;
        p.mouthSmile = 1.0;
        p.mouthWidth = 1.14 + cheerBeat * 0.05;
        p.tongueScale = 1.1;

        p.waveRaysAlpha = 0;
        p.congratsAlpha = 1.0;
        p.congratsPhase = t * 5.0;
        break;
      }
    }

    // Subtle entrance pop when a motion button is freshly clicked
    if (mt < 0.26) {
      const pop = Math.sin((mt / 0.26) * Math.PI);
      p.bodyScaleX += pop * 0.03;
      p.bodyScaleY -= pop * 0.022;
      p.headY -= pop * 4.5;
    }

    return p;
  }
}
