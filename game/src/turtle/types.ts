export type MotionType =
  | 'idle'
  | 'waving'
  | 'laugh'
  | 'wondered'
  | 'angry'
  | 'crying'
  | 'describing'
  | 'sleepy'
  | 'blush'
  | 'congratulate';

export type EmotionType = MotionType | 'normal';

export type Direction = 'left' | 'right';

export interface TearDrop {
  id: number;
  side: 'left' | 'right';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

export interface TurtlePose {
  // Continuous direction: +1 = facing right, -1 = facing left
  facing: number;

  // Root body transform (normalized units around center)
  bodyX: number;
  bodyY: number;
  bodyRot: number;
  bodyScaleX: number;
  bodyScaleY: number;
  breath: number;

  // Shell & Plastron subtle secondary motion
  shellRot: number;
  shellOffsetX: number;
  shellOffsetY: number;

  // Head transform & 2.5D turn
  headX: number;
  headY: number;
  headRot: number;
  headScaleX: number;
  headScaleY: number;
  headLookX: number;
  headLookY: number;

  // Near Front Flipper (shell-side front flipper)
  // Modes: raised waving (0), lowered down-left (downAmount=1), or chest-curled (tuckAmount=1)
  nearFlipperShoulderX: number;
  nearFlipperShoulderY: number;
  nearFlipperAngle: number;
  nearFlipperBend: number;
  nearFlipperScaleX: number;
  nearFlipperScaleY: number;
  nearFlipperDownAmount: number; // 0 = raised waving blade, 1 = angled down-left paddle
  nearFlipperTuckAmount: number; // 1 = curled inward across chest (describing / blush)

  // Far Front Flipper (snout-side front flipper)
  // Modes: extended down-right (0), raised gesturing (raiseAmount=1), or bent under chin (chinAmount=1)
  farFlipperShoulderX: number;
  farFlipperShoulderY: number;
  farFlipperAngle: number;
  farFlipperBend: number;
  farFlipperScaleX: number;
  farFlipperScaleY: number;
  farFlipperChinAmount: number; // 1 = bent up under face/chin (wondered / blush)
  farFlipperRaiseAmount: number; // 1 = raised outward gesturing/cheering (describing / congratulate)

  // Hind legs
  hindNearAngle: number;
  hindFarAngle: number;

  // Eyes & Eyelids
  eyeGazeX: number;
  eyeGazeY: number;
  pupilScale: number;
  blinkAmount: number; // 0 = open, 1 = closed blink
  laughEyeAmount: number; // 0 = normal, 1 = happy closed ^ ^ arcs
  angryLidAmount: number; // 0 = normal, 1 = angled angry upper eyelid
  sleepyLidAmount: number; // 0 = normal, 1 = heavy half-closed droopy sleepy eyelid
  sadLidAmount: number; // 0 = normal, 1 = watery sad lower lid & shine
  wateryShine: number;
  eyeSparkleAmount: number; // 0 = normal, 1 = celebratory star sparkles in eyes

  // Eyebrows
  browRaise: number; // positive = raised, negative = lowered
  browTilt: number; // positive = sad/worried inner-up, negative = angry inner-down
  browAsymmetry: number; // curious one-brow-up offset

  // Mouth morph targets
  mouthOpen: number; // 0 = closed, 1 = wide open
  mouthSmile: number; // +1 = happy smile, 0 = neutral, -1 = frown
  mouthWidth: number; // 0.35 = small 'o', 1.0 = normal, 1.25 = wide laugh
  mouthOShape: number; // 0..1 blend toward round 'o' mouth (wondered / sleepy yawn)
  mouthWailShape: number; // 0..1 blend toward sad wailing trapezoid mouth (crying)
  mouthFrownLine: number; // 0..1 tight closed angry frown curve
  mouthShyWave: number; // 0..1 cute bashful wavy smile (blush)
  tongueScale: number;

  // Facial overlays & effect props
  blushAlpha: number;
  waveRaysAlpha: number;
  waveRaysPhase: number;
  describeRaysAlpha: number;
  describeRaysPhase: number;
  laughMarksAlpha: number;
  laughMarksBounce: number;
  questionMarkAlpha: number;
  questionMarkBob: number;
  angryVeinAlpha: number;
  angryVeinPulse: number;
  tearsAlpha: number;
  tearStreamPhase: number;
  sleepyZzzAlpha: number;
  sleepyZzzPhase: number;
  blushHeartsAlpha: number;
  blushHeartsPhase: number;
  congratsAlpha: number;
  congratsPhase: number;
}
