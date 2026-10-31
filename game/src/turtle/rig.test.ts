import assert from 'node:assert/strict';
import test from 'node:test';
import {TurtleRigController} from './rig.ts';
import type {MotionType} from './types.ts';
import {ROSTER_ASSETS} from '../roster/catalog.ts';

test('TurtleRigController initializes in idle motion facing right', () => {
  const rig = new TurtleRigController();
  assert.equal(rig.getMotion(), 'idle');
  assert.equal(rig.getDirection(), 'right');
  const pose = rig.step(0.05);
  assert.equal(pose.facing, 1);
  assert.ok(pose.nearFlipperDownAmount > 0.5);
});

test('TurtleRigController smoothly turns between right and left directions', () => {
  const rig = new TurtleRigController('waving', 'right');
  rig.toggleDirection();
  assert.equal(rig.getDirection(), 'left');

  for (let i = 0; i < 40; i++) {
    rig.step(0.03);
  }
  assert.ok(rig.pose.facing < -0.95);

  rig.toggleDirection();
  assert.equal(rig.getDirection(), 'right');
  for (let i = 0; i < 40; i++) {
    rig.step(0.03);
  }
  assert.ok(rig.pose.facing > 0.95);
});

test('TurtleRigController supports all 10 continuous emotion motions plus manual blink in both directions', () => {
  const rig = new TurtleRigController();
  const motions: MotionType[] = [
    'idle',
    'waving',
    'laugh',
    'wondered',
    'angry',
    'crying',
    'describing',
    'sleepy',
    'blush',
    'congratulate',
  ];

  for (const dir of ['right', 'left'] as const) {
    rig.setDirection(dir);
    for (const m of motions) {
      rig.setMotion(m);
      assert.equal(rig.getMotion(), m);
      for (let i = 0; i < 25; i++) {
        rig.step(0.025);
      }

      if (m === 'idle') {
        assert.ok(rig.pose.nearFlipperDownAmount > 0.8);
      } else if (m === 'laugh') {
        assert.ok(rig.pose.laughEyeAmount > 0.8);
      } else if (m === 'wondered') {
        assert.ok(rig.pose.farFlipperChinAmount > 0.8);
        assert.ok(rig.pose.questionMarkAlpha > 0.8);
      } else if (m === 'angry') {
        assert.ok(rig.pose.angryLidAmount > 0.8);
        assert.ok(rig.pose.angryVeinAlpha > 0.8);
      } else if (m === 'crying') {
        assert.ok(rig.pose.tearsAlpha > 0.8);
        assert.ok(rig.tearDrops.length > 0);
      } else if (m === 'describing') {
        assert.ok(rig.pose.farFlipperRaiseAmount > 0.8);
        assert.ok(rig.pose.nearFlipperTuckAmount > 0.8);
      } else if (m === 'sleepy') {
        assert.ok(rig.pose.sleepyLidAmount > 0.8);
        assert.ok(rig.pose.sleepyZzzAlpha > 0.8);
      } else if (m === 'blush') {
        assert.ok(rig.pose.blushAlpha > 0.85);
        assert.ok(rig.pose.blushHeartsAlpha > 0.8);
      } else if (m === 'congratulate') {
        assert.ok(rig.pose.congratsAlpha > 0.8);
        assert.ok(rig.pose.farFlipperRaiseAmount > 0.8);
      }
    }

    rig.triggerBlink();
    rig.step(0.09);
    assert.ok(rig.isBlinking());
  }
});

test('ROSTER_ASSETS contains all 71 entries (41 Animals A01-A41 + 30 Plants P01-P30) with unique IDs and codes', () => {
  assert.equal(ROSTER_ASSETS.length, 71);
  const animals = ROSTER_ASSETS.filter((a) => a.isAnimal);
  const plants = ROSTER_ASSETS.filter((a) => !a.isAnimal);
  assert.equal(animals.length, 41);
  assert.equal(plants.length, 30);

  assert.ok(
    ROSTER_ASSETS.some(
      (a) => a.id === 'animal_28_green_sea_turtle' && a.code === 'A28'
    ),
    'Must include A28 Green Sea Turtle'
  );

  const ids = new Set(ROSTER_ASSETS.map((a) => a.id));
  const codes = new Set(ROSTER_ASSETS.map((a) => a.code));
  assert.equal(ids.size, 71);
  assert.equal(codes.size, 71);
});
