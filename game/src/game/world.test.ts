import assert from 'node:assert/strict';
import test from 'node:test';
import {ROSTER_ASSETS} from '../roster/catalog';
import {
  ANIMAL_THREE_ROUND_CRITIQUE,
  EYE_ENLARGED_SPECIES_REPORT,
  getAnimalWaveConfig,
} from '../roster/animalRenderer';
import {
  PLANT_THREE_ROUND_CRITIQUE,
} from '../roster/plantRenderer';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT_MULTIPLIER,
  TELEPORT_TOWERS,
  HABITAT_ZONES,
  ASSET_ECO_CONFIG,
  FOOD_CATALOG,
  validateAssetDropZone,
  rollSleepingTouchReaction,
  rollAwakeTapReaction,
  canAnimalEatFood,
  createInitialSaveState,
  getWaterSurfaceY,
} from './worldConfig';
import {
  computeAnimalLoveLevel,
  recordAnimalCareInteraction,
} from './persistence';

test('Phase 1: All 41 animals wave at a 120° offset away from facing direction with anatomical limb or custom alternative gesture', () => {
  const animals = ROSTER_ASSETS.filter((a) => a.isAnimal);
  assert.equal(animals.length, 41);

  for (const animal of animals) {
    const cfg = getAnimalWaveConfig(animal.id);
    assert.equal(
      cfg.offsetDegreesFromFacing,
      120,
      `${animal.code} ${animal.name} must wave at 120° offset`
    );
    assert.ok(cfg.description.length > 10);
  }

  // Limbless / Sessile species must have documented custom alternative gestures
  const pythonWave = getAnimalWaveConfig('animal_16_reticulated_python');
  assert.equal(pythonWave.limbType, 'alternative_coil');

  const clamWave = getAnimalWaveConfig('animal_35_giant_clam');
  assert.equal(clamWave.limbType, 'alternative_siphon');

  const seaStarWave = getAnimalWaveConfig('animal_40_sea_star');
  assert.equal(seaStarWave.limbType, 'alternative_ray');
});

test('Phase 2: Whales, sharks, and small-eyed species have +30% enlarged eyes (1.30x multiplier) with documented reasons', () => {
  const reportList = Object.values(EYE_ENLARGED_SPECIES_REPORT);
  assert.ok(reportList.length >= 18);

  const requiredIds = [
    'animal_30_whale_shark',
    'animal_33_blacktip_reef_shark',
    'animal_32_false_killer_whale',
    'animal_31_indo_pacific_humpback_dolphin',
    'animal_27_dugong',
    'animal_02_asian_elephant',
  ];

  for (const id of requiredIds) {
    const entry = EYE_ENLARGED_SPECIES_REPORT[id];
    assert.ok(entry, `Missing ${id} in EYE_ENLARGED_SPECIES_REPORT`);
    assert.equal(entry.multiplier, 1.3);
    assert.ok(entry.reason.length > 15);
  }
});

test('Phase 3 World: Four habitat zones follow approved left-to-right order (Forest -> River Pond -> Mud Shore -> Coral Sea)', () => {
  assert.deepEqual(
    HABITAT_ZONES.map((z) => z.id),
    ['forest', 'river', 'mud', 'sea']
  );
  assert.equal(HABITAT_ZONES[0].xStart, 0);
  assert.ok(HABITAT_ZONES[0].xEnd === HABITAT_ZONES[1].xStart);
  assert.ok(HABITAT_ZONES[1].xEnd === HABITAT_ZONES[2].xStart);
  assert.ok(HABITAT_ZONES[2].xEnd === HABITAT_ZONES[3].xStart);
});

test('Phase 3 Starter & Habitat Validation: Player starts owning only Green Sea Turtle (A28) and wrong-zone drops are rejected', () => {
  const initial = createInitialSaveState();
  const ownedKeys = Object.keys(initial.ownedAssets).filter(
    (k) => (initial.ownedAssets[k] ?? 0) > 0
  );
  assert.deepEqual(ownedKeys, ['animal_28_green_sea_turtle']);
  assert.equal(initial.placedAnimals.length, 1);
  assert.equal(
    initial.placedAnimals[0].assetId,
    'animal_28_green_sea_turtle'
  );
  assert.equal(initial.placedAnimals[0].zoneId, 'sea');

  // Green Sea Turtle rejected on land (forest), river, and mud, allowed on sea
  assert.equal(
    validateAssetDropZone('animal_28_green_sea_turtle', 'forest').valid,
    false
  );
  assert.equal(
    validateAssetDropZone('animal_28_green_sea_turtle', 'river').valid,
    false
  );
  assert.equal(
    validateAssetDropZone('animal_28_green_sea_turtle', 'mud').valid,
    false
  );
  assert.equal(
    validateAssetDropZone('animal_28_green_sea_turtle', 'sea').valid,
    true
  );

  // All 71 assets have valid ecosystem configurations
  for (const asset of ROSTER_ASSETS) {
    const eco = ASSET_ECO_CONFIG[asset.id];
    assert.ok(eco, `Missing ASSET_ECO_CONFIG for ${asset.id}`);
    assert.ok(eco.allowedZones.length >= 1);
  }
});

test('Phase 3 Behavior & Food Chain: Sleeping touch rolls 70% angry / 30% wondered, awake tap rolls 50/50 wave/wondered, and diet matches', () => {
  assert.equal(rollSleepingTouchReaction(0.0), 'angry');
  assert.equal(rollSleepingTouchReaction(0.69), 'angry');
  assert.equal(rollSleepingTouchReaction(0.7), 'wondered');
  assert.equal(rollSleepingTouchReaction(0.99), 'wondered');

  assert.equal(rollAwakeTapReaction(0.2), 'waving');
  assert.equal(rollAwakeTapReaction(0.8), 'wondered');

  assert.equal(Object.keys(FOOD_CATALOG).length, 8);
  assert.equal(
    canAnimalEatFood('animal_28_green_sea_turtle', 'food_seaweed_kelp'),
    true
  );
  assert.equal(
    canAnimalEatFood('animal_01_malayan_tiger', 'food_durian_fruit'),
    true
  );
});

test('Phase 3 Sky & Weather Gradient: Chained lerpColor calls across hex and rgb strings never produce NaN', async () => {
  const {lerpColor} = await import('./worldRenderer');
  const firstPass = lerpColor('#bae6fd', '#1e293b', 0.35);
  assert.match(firstPass, /^rgb\(\d+, \d+, \d+\)$/);
  const sunsetPass = lerpColor(firstPass, '#fb923c', 0.5);
  assert.match(sunsetPass, /^rgb\(\d+, \d+, \d+\)$/);
  const cloudyPass = lerpColor(sunsetPass, '#64748b', 0.55);
  assert.match(cloudyPass, /^rgb\(\d+, \d+, \d+\)$/);
  assert.ok(!cloudyPass.includes('NaN'));
});

test('Sanctuary Overhaul: 180x map width, 4x height, Teleport Towers, Store prices (300/150/50 GB), 2-sentence Info Cards, and 1-3 week Love Lv.5 progression', () => {
  assert.equal(WORLD_WIDTH, 3600 * 180);
  assert.equal(WORLD_HEIGHT_MULTIPLIER, 4);
  assert.ok(TELEPORT_TOWERS.length >= 12);

  // Water is strictly contained inside river and sea basins (zero leak on forest or mud)
  assert.equal(getWaterSurfaceY(10000, 800), null);
  assert.equal(getWaterSurfaceY(390000, 800), null);
  assert.equal(getWaterSurfaceY(240000, 800), 800 * 0.56);
  assert.equal(getWaterSurfaceY(540000, 800), 800 * 0.56);

  // Store pricing & 2-sentence info cards
  for (const asset of ROSTER_ASSETS) {
    const eco = ASSET_ECO_CONFIG[asset.id];
    assert.ok(eco);
    if (asset.isAnimal) {
      assert.ok(eco.price >= 100 && eco.price <= 300, `${asset.id} price ${eco.price} out of [100, 300]`);
    } else {
      assert.ok(eco.price >= 50 && eco.price <= 150, `${asset.id} price ${eco.price} out of [50, 150]`);
    }
    assert.equal(eco.infoSentences.length, 2);
    assert.ok(eco.infoSentences[0].length > 10);
    assert.ok(eco.infoSentences[1].length > 10);
    assert.ok(eco.searchQuery.length > 5);
  }

  for (const food of Object.values(FOOD_CATALOG)) {
    assert.ok(food.price >= 10 && food.price <= 50);
    assert.equal(food.infoSentences.length, 2);
    assert.ok(food.searchQuery.length > 5);
  }

  // Love Lv.1..5 requires both care XP and 1-3 weeks (14+ days) of care to reach Lv.5
  const initial = createInitialSaveState();
  const turtle = initial.placedAnimals[0];
  turtle.bondXp = 500;
  turtle.careDaysCount = 1;
  turtle.careStartTimestampMs = Date.now();
  // Even with max 500 XP on day 1, Love level is capped at Lv.2 and cannot jump to Lv.5 without 1-3 weeks of care
  assert.equal(computeAnimalLoveLevel(turtle), 2);

  // After 15 days of care and 14+ distinct care days + 500 XP -> reaches Love Lv.5
  turtle.careStartTimestampMs = Date.now() - 15 * 86_400_000;
  turtle.careDaysCount = 14;
  recordAnimalCareInteraction(turtle, 20);
  assert.equal(computeAnimalLoveLevel(turtle), 5);
});

test('3-Round Zoological & Botanical Realism Critique: 3 rounds with >= 3 biological critiques per round', () => {
  assert.equal(ANIMAL_THREE_ROUND_CRITIQUE.length, 3);
  for (const r of ANIMAL_THREE_ROUND_CRITIQUE) {
    assert.ok(r.critiques.length >= 3);
  }
  assert.equal(PLANT_THREE_ROUND_CRITIQUE.length, 3);
  for (const r of PLANT_THREE_ROUND_CRITIQUE) {
    assert.ok(r.critiques.length >= 3);
  }
});

