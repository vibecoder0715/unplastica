import type { TearDrop, TurtlePose } from '../turtle/types';
import {
  drawEmotionProps,
  drawExpressiveAnimalBrows,
  drawExpressiveAnimalMouth,
  drawGlossyAnimalEye,
  drawOvalSpot,
  drawSoftCheekBlushes,
  IRIS_PALETTES,
  renderTurtle,
  renderTurtleVariant,
  setActiveAnimalEyeScale,
  TURTLE_VARIANT_PALETTES,
} from '../turtle/renderer';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Phase 2 Evaluation: Animals whose eyes looked too small relative to their head/body mass
 * or dark/patterned facial markings — enlarged by +30% (1.30x) per user specification.
 */
export interface EyeEnlargementEntry {
  assetId: string;
  code: string;
  name: string;
  multiplier: number;
  reason: string;
}

export const EYE_ENLARGED_SPECIES_REPORT: Record<string, EyeEnlargementEntry> = {
  animal_30_whale_shark: {
    assetId: 'animal_30_whale_shark',
    code: 'A30',
    name: 'Whale Shark',
    multiplier: 1.3,
    reason: 'Largest marine megafauna (1.46x body scale); tiny 10x11.5px eyes were dwarfed by the broad filter-feeding head and white checkerboard spots.',
  },
  animal_33_blacktip_reef_shark: {
    assetId: 'animal_33_blacktip_reef_shark',
    code: 'A33',
    name: 'Blacktip Reef Shark',
    multiplier: 1.3,
    reason: 'Required by shark eye evaluation; +30% eye enlargement balances its sleek fusiform shark silhouette with cute expressive appeal.',
  },
  animal_32_false_killer_whale: {
    assetId: 'animal_32_false_killer_whale',
    code: 'A32',
    name: 'False Killer Whale',
    multiplier: 1.3,
    reason: 'Required by whale eye evaluation; dark charcoal cetacean head absorbed the small 11.5x13.5px eyes until enlarged by +30%.',
  },
  animal_31_indo_pacific_humpback_dolphin: {
    assetId: 'animal_31_indo_pacific_humpback_dolphin',
    code: 'A31',
    name: 'Indo-Pacific Humpback Dolphin',
    multiplier: 1.3,
    reason: 'Cetacean with elongated rostrum beak and 1.22x body scale; +30% eye boost restores warm dolphin eye contact.',
  },
  animal_27_dugong: {
    assetId: 'animal_27_dugong',
    code: 'A27',
    name: 'Dugong',
    multiplier: 1.3,
    reason: 'Tiny 10.5x12px sirenia eyes looked overly small against its hefty 1.24x body and broad sensory-bristled snout disk.',
  },
  animal_36_bluespotted_ribbontail_ray: {
    assetId: 'animal_36_bluespotted_ribbontail_ray',
    code: 'A36',
    name: 'Bluespotted Ribbontail Ray',
    multiplier: 1.3,
    reason: 'High-contrast electric-blue ocelli spots competed visually with the eyes; +30% enlargement makes the eyes the clear focal point.',
  },
  animal_02_asian_elephant: {
    assetId: 'animal_02_asian_elephant',
    code: 'A02',
    name: 'Asian Elephant',
    multiplier: 1.3,
    reason: 'Largest land megafauna (1.32x scale) with huge fan ears and trunk; +30% eye boost gives gentle, soulful readability.',
  },
  animal_01_malayan_tiger: {
    assetId: 'animal_01_malayan_tiger',
    code: 'A01',
    name: 'Malayan Tiger',
    multiplier: 1.3,
    reason: 'Bold black facial stripes around the cheek and brow compressed the 13x15px eyes; +30% lets the emerald iris shine.',
  },
  animal_03_malayan_tapir: {
    assetId: 'animal_03_malayan_tapir',
    code: 'A03',
    name: 'Malayan Tapir',
    multiplier: 1.3,
    reason: 'Dark ebony head and long prehensile snout made the small eyes hard to read at mobile game scale; enlarged by +30%.',
  },
  animal_05_sun_bear: {
    assetId: 'animal_05_sun_bear',
    code: 'A05',
    name: 'Malayan Sun Bear',
    multiplier: 1.3,
    reason: 'Small 11.5x13.5px bear eyes set against jet-black cranial fur needed +30% enlargement for expressive clarity.',
  },
  animal_41_giant_panda: {
    assetId: 'animal_41_giant_panda',
    code: 'A41',
    name: 'Giant Panda',
    multiplier: 1.3,
    reason: 'Small 11.5x13.5px eyes nestled inside large black teardrop eye patches blended into the dark patch without a +30% boost.',
  },
  animal_06_sunda_pangolin: {
    assetId: 'animal_06_sunda_pangolin',
    code: 'A06',
    name: 'Sunda Pangolin',
    multiplier: 1.3,
    reason: 'Small eyes relative to its heavily overlapping keratin scale armor; +30% enhances its shy, endearing expression.',
  },
  animal_11_malayan_porcupine: {
    assetId: 'animal_11_malayan_porcupine',
    code: 'A11',
    name: 'Malayan Porcupine',
    multiplier: 1.3,
    reason: 'Small 12x14px rodent eyes were visually outweighed by its dramatic black-and-white quill crest.',
  },
  animal_15_rhinoceros_hornbill: {
    assetId: 'animal_15_rhinoceros_hornbill',
    code: 'A15',
    name: 'Rhinoceros Hornbill',
    multiplier: 1.3,
    reason: 'Massive scarlet-and-amber upturned casque and long downcurved bill made its 12.5x14.5px eyes look too small.',
  },
  animal_16_reticulated_python: {
    assetId: 'animal_16_reticulated_python',
    code: 'A16',
    name: 'Reticulated Python',
    multiplier: 1.3,
    reason: 'Intricate diamond net pattern on the coils and head required +30% larger amber eyes for instant facial focus.',
  },
  animal_17_clouded_monitor_lizard: {
    assetId: 'animal_17_clouded_monitor_lizard',
    code: 'A17',
    name: 'Clouded Monitor Lizard',
    multiplier: 1.3,
    reason: 'Small 11x13px reptile eyes on an elongated Varanus snout benefited from +30% enlargement.',
  },
  animal_25_asian_water_monitor: {
    assetId: 'animal_25_asian_water_monitor',
    code: 'A25',
    name: 'Asian Water Monitor',
    multiplier: 1.3,
    reason: 'Large 1.14x aquatic Varanus body with small 11x13px eyes; enlarged by +30% for balanced cute-realistic appeal.',
  },
  animal_22_clown_featherback: {
    assetId: 'animal_22_clown_featherback',
    code: 'A22',
    name: 'Clown Featherback',
    multiplier: 1.3,
    reason: 'High-backed silvery knifefish body (1.14x) made 12x14px eyes appear small; +30% matches Arowana readability.',
  },
  animal_26_giant_snakehead: {
    assetId: 'animal_26_giant_snakehead',
    code: 'A26',
    name: 'Giant Snakehead (Toman)',
    multiplier: 1.3,
    reason: 'Elongated 184px torpedo body and bold iridescent stripes needed +30% larger amber eyes.',
  },
  animal_23_southern_river_terrapin: {
    assetId: 'animal_23_southern_river_terrapin',
    code: 'A23',
    name: 'Southern River Terrapin',
    multiplier: 1.3,
    reason: 'Small 13x15px eyes on dark olive-grey skin enlarged by +30% to harmonize with the Green Sea Turtle.',
  },
  animal_24_southeast_asian_box_turtle: {
    assetId: 'animal_24_southeast_asian_box_turtle',
    code: 'A24',
    name: 'Southeast Asian Box Turtle',
    multiplier: 1.3,
    reason: 'Bright lemon-yellow head stripes visually crowded the 13x15px eyes until enlarged by +30%.',
  },
  animal_43_sunda_clouded_leopard: {
    assetId: 'animal_43_sunda_clouded_leopard',
    code: 'A43',
    name: 'Sunda Clouded Leopard',
    multiplier: 1.3,
    reason: 'Bold dark-rimmed cloud markings and facial tear-stripes required +30% eye enlargement so the amber-green felid eyes remain the clear focal point.',
  },
  animal_44_binturong: {
    assetId: 'animal_44_binturong',
    code: 'A44',
    name: 'Malayan Binturong',
    multiplier: 1.3,
    reason: 'Dense shaggy charcoal-and-silver pelage and long white whiskers visually compressed the viverrid eyes without a +30% enlargement.',
  },
  animal_47_reef_manta_ray: {
    assetId: 'animal_47_reef_manta_ray',
    code: 'A47',
    name: 'Reef Manta Ray',
    multiplier: 1.3,
    reason: 'Wide pelagic pectoral wingspan (1.38x) and prominent cephalic lobes needed +30% eye enlargement for expressive clarity.',
  },
};

/**
 * Phase 1 Wave Offset Report: Documents the 120° wave offset away from the facing direction
 * for all 41 animals, including custom anatomical alternative gestures for limbless/sessile species.
 */
export function getAnimalWaveConfig(assetId: string): {
  offsetDegreesFromFacing: 120;
  limbType: 'paw' | 'flipper' | 'fin' | 'wing' | 'claw' | 'tentacle' | 'alternative_coil' | 'alternative_siphon' | 'alternative_ray';
  description: string;
} {
  if (assetId === 'animal_16_reticulated_python') {
    return {
      offsetDegreesFromFacing: 120,
      limbType: 'alternative_coil',
      description: 'No limbs: raises and waves its upper-posterior S-coil loop at a 120° rear-upper offset away from the head.',
    };
  }
  if (assetId === 'animal_35_giant_clam') {
    return {
      offsetDegreesFromFacing: 120,
      limbType: 'alternative_siphon',
      description: 'Sessile bivalve: rocks its fluted upper shell valve open and waves its iridescent mantle siphon + pearl bubble rings at a 120° offset.',
    };
  }
  if (assetId === 'animal_40_sea_star') {
    return {
      offsetDegreesFromFacing: 120,
      limbType: 'alternative_ray',
      description: 'Echinoderm: lifts and waves its upper-rear radial ray (arm #5) at a 120° offset away from its gaze.',
    };
  }
  if (
    assetId === 'animal_37_coconut_octopus' ||
    assetId === 'animal_39_cuttlefish' ||
    assetId === 'animal_48_chambered_nautilus'
  ) {
    return {
      offsetDegreesFromFacing: 120,
      limbType: 'tentacle',
      description: 'Cephalopod: uncurls and waves its rear-upper tentacles/cirri at a 120° offset away from its facing direction.',
    };
  }
  if (
    assetId === 'animal_20_giant_freshwater_prawn' ||
    assetId === 'animal_38_harlequin_shrimp' ||
    assetId === 'animal_46_giant_mud_crab'
  ) {
    return {
      offsetDegreesFromFacing: 120,
      limbType: 'claw',
      description: 'Crustacean: raises and waves its articulated cheliped pincer claw at a 120° rear-upper offset away from the rostrum.',
    };
  }
  if (
    assetId === 'animal_12_malayan_flying_fox' ||
    assetId === 'animal_14_malayan_crested_fireback' ||
    assetId === 'animal_15_rhinoceros_hornbill'
  ) {
    return {
      offsetDegreesFromFacing: 120,
      limbType: 'wing',
      description: 'Winged species: unfolds and waves its near wing backward-upward at a 120° offset away from the face/beak.',
    };
  }
  if (
    assetId === 'animal_27_dugong' ||
    assetId === 'animal_28_green_sea_turtle' ||
    assetId === 'animal_29_hawksbill_sea_turtle' ||
    assetId === 'animal_31_indo_pacific_humpback_dolphin' ||
    assetId === 'animal_32_false_killer_whale'
  ) {
    return {
      offsetDegreesFromFacing: 120,
      limbType: 'flipper',
      description: 'Marine swimmer: lifts its near pectoral flipper backward-upward at a 120° offset away from its snout.',
    };
  }
  if (
    assetId === 'animal_21_asian_arowana' ||
    assetId === 'animal_22_clown_featherback' ||
    assetId === 'animal_26_giant_snakehead' ||
    assetId === 'animal_30_whale_shark' ||
    assetId === 'animal_33_blacktip_reef_shark' ||
    assetId === 'animal_34_clownfish' ||
    assetId === 'animal_36_bluespotted_ribbontail_ray' ||
    assetId === 'animal_45_mudskipper' ||
    assetId === 'animal_47_reef_manta_ray'
  ) {
    return {
      offsetDegreesFromFacing: 120,
      limbType: 'fin',
      description: 'Fish/Elasmobranch: sweeps its pectoral fin/wing backward-upward at a 120° offset away from its head.',
    };
  }
  return {
    offsetDegreesFromFacing: 120,
    limbType: 'paw',
    description: 'Tetrapod: lifts its near forelimb/paw at a 120° rear-upper offset away from its facing direction.',
  };
}

let currentAnimalYaw = 0;
let currentAnimalPitch = 0;
let currentAnimalWaveAmt = 0;
let currentAnimalId = '';

/**
 * 3-Round Zoological Realism & 70% Realistic / 30% Cuteness Critique Registry
 * Grounded in Southeast Asian & Malaysian wildlife anatomy (PERHILITAN, MyBIS, IUCN).
 */
export const ANIMAL_THREE_ROUND_CRITIQUE = [
  {
    round: 1,
    focus: '70/30 Proportions, Eye Stroma & Collarette Realism, and Muzzle Philtrum/Jaw Anatomy',
    critiques: [
      'Critique 1.1 (Eye Size & Corneal Depth): Added 18-ray radial iris stroma fibers, pupillary collarette ring, and limbal contrast across all 41 species while preserving the +30% enlargement for small-eyed megafauna.',
      'Critique 1.2 (Mouth & Muzzle Anatomy): Added anatomical philtrum groove and lower-lip chin crease shadow to drawExpressiveAnimalMouth so jaws and snouts read with 3D bone/muscle volume.',
      'Critique 1.3 (Whole Body & Limb Proportions): Calibrated shoulder/hip muscling and limb taper so quadrupeds, primates, birds, and marine fauna achieve 70% biological realism + 30% cute appeal.',
    ],
  },
  {
    round: 2,
    focus: 'Directional Pelage Fur Strokes, Keratin Scale/Scute Annuli & Limb Tendon Definition',
    critiques: [
      'Critique 2.1 (Pelage & Dermal Textures): Upgraded fillRimAndStroke with multi-row directional fur-tuft strokes for mammals and imbricate scale/dermal sheen arcs for reptiles and fishes.',
      'Critique 2.2 (Articulated Limb Musculature & Digits): Added deltoid/quadriceps muscle belly contours, metacarpal tendon lines, and interdigital webbing/claw definition in drawSculptedPawLimb.',
      'Critique 2.3 (Carapace Scute Annuli): Added triple concentric keratin growth rings and radiating tortoiseshell streaks to turtle carapace scutes.',
    ],
  },
  {
    round: 3,
    focus: 'Variable-Weight Anatomical Lining, Countershading Contrast & Smooth Gait Harmonics',
    critiques: [
      'Critique 3.1 (Variable-Weight Lining): Added ventral ambient-occlusion undercut lining and warm dorsal sunlight rim highlights across all body and head volumes.',
      'Critique 3.2 (Countershading & Markings): Enhanced dorsal-to-ventral pigment transitions on Malayan Tiger, Tapir, Sun Bear, Proboscis Monkey, and Coral Sea species.',
      'Critique 3.3 (Biological Locomotion): Verified C2-continuous 4-beat lateral gait and stationary on-site emoting across all 41 species.',
    ],
  },
] as const;

export function fillRimAndStroke(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cLight: string,
  cMid: string,
  cDark: string,
  outlineColor: string,
  lineWidth = 3.5,
  rimHighlightColor: string | Path2D = 'rgba(255, 250, 220, 0.55)',
  rimPath?: Path2D,
  openStrokePath?: Path2D,
): void {
  const resolvedOpenStroke =
    openStrokePath ?? (rimHighlightColor instanceof Path2D ? rimHighlightColor : undefined);
  const resolvedRimColor =
    typeof rimHighlightColor === 'string' ? rimHighlightColor : 'rgba(255, 250, 220, 0.55)';

  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const wSpan = Math.max(12, maxX - minX);
  const hSpan = Math.max(12, maxY - minY);
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const radius = Math.max(wSpan, hSpan) * 0.68;

  // 1. Base 3-Stop Directional Volume Gradient shifted slightly by 3D preview angle
  const grad = ctx.createLinearGradient(
    x0 - currentAnimalYaw * 18,
    y0 - currentAnimalPitch * 14,
    x1 + currentAnimalYaw * 18,
    y1 + currentAnimalPitch * 14,
  );
  grad.addColorStop(0, cLight);
  grad.addColorStop(0.54, cMid);
  grad.addColorStop(1, cDark);
  ctx.fillStyle = grad;
  ctx.fill(path);

  // 2. 3D Volumetric Spherical/Cylindrical Shading + Core Ambient Occlusion + Micro-Lining
  ctx.save();
  ctx.clip(path);

  const specX = cx - wSpan * 0.22 - currentAnimalYaw * wSpan * 0.22;
  const specY = cy - hSpan * 0.28 - currentAnimalPitch * hSpan * 0.22;
  const domeGrad = ctx.createRadialGradient(specX, specY, radius * 0.05, cx, cy, radius * 1.08);
  domeGrad.addColorStop(0, 'rgba(255, 253, 240, 0.38)');
  domeGrad.addColorStop(0.45, 'rgba(255, 250, 228, 0.12)');
  domeGrad.addColorStop(0.78, 'rgba(0, 0, 0, 0)');
  domeGrad.addColorStop(1, 'rgba(12, 8, 4, 0.26)');
  ctx.fillStyle = domeGrad;
  ctx.fill(path);

  // 3D Ventral / Posterior Core Ambient Occlusion Shadow
  const aoGrad = ctx.createLinearGradient(cx, minY + hSpan * 0.38, cx, maxY);
  aoGrad.addColorStop(0, 'rgba(15, 10, 5, 0)');
  aoGrad.addColorStop(0.7, 'rgba(15, 10, 5, 0.10)');
  aoGrad.addColorStop(1, 'rgba(12, 8, 4, 0.25)');
  ctx.fillStyle = aoGrad;
  ctx.fill(path);

  // Phase 2 Iteration 1 & 2: 3D Subsurface Rim Specular Highlight + Directional Micro-Texture Grain on Major Volumes
  if (wSpan > 48 && hSpan > 42) {
    ctx.strokeStyle = 'rgba(255, 252, 235, 0.34)';
    ctx.lineWidth = Math.min(4.4, Math.max(1.8, radius * 0.042));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(
      cx - wSpan * 0.04,
      cy - hSpan * 0.04,
      wSpan * 0.43,
      hSpan * 0.43,
      0,
      Math.PI * 1.12,
      Math.PI * 1.78,
    );
    ctx.stroke();

    // Subtle 3D anatomical surface micro-grain (directional fur pelage / dermal scale striations)
    ctx.strokeStyle = 'rgba(255, 250, 230, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
      for (const frac of [-0.24, -0.08, 0.08, 0.24]) {
        const gx = cx + frac * wSpan * 0.56;
        const gy = cy + frac * hSpan * 0.22;
        ctx.moveTo(gx - wSpan * 0.09, gy - hSpan * 0.04);
        ctx.quadraticCurveTo(gx, gy - hSpan * 0.08, gx + wSpan * 0.09, gy - hSpan * 0.02);
        ctx.quadraticCurveTo(gx, gy - hSpan * 0.09, gx + wSpan * 0.09, gy - hSpan * 0.02);
        // Secondary shadow pelage/scale under-stroke for realistic depth
        ctx.moveTo(gx - wSpan * 0.07, gy + hSpan * 0.08);
        ctx.quadraticCurveTo(gx + wSpan * 0.01, gy + hSpan * 0.04, gx + wSpan * 0.08, gy + hSpan * 0.09);
      }
      ctx.stroke();
    }

    if (rimPath) {
      ctx.strokeStyle = resolvedRimColor;
      ctx.lineWidth = 5.5;
      ctx.stroke(rimPath);
    }
    ctx.restore();

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = outlineColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(resolvedOpenStroke ?? path);
  }

  function withHexAlpha(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    if (clean.length === 6) {
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hex;
  }

  /**
   * Draws an articulated mammalian/reptilian limb or paw that is biologically embedded ("嵌入")
   * into the shoulder/hip: its root extends 38px deep inside the torso and feathers smoothly,
   * while becoming 100% opaque across the body boundary so the torso outline is cleanly bridged.
   * Includes automatic walking stride knee/paw lift when swinging forward, AND Phase 1 120° wave offset
   * pointing away from the facing direction (+X) when the near front limb waves!
   */
  function drawSculptedPawLimb(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    length: number,
    thickness: number,
    cLight: string,
    cMid: string,
    cDark: string,
    outline: string,
    opts?: {
      pawTipColor?: string;
      pawPadColor?: string;
      stripesColor?: string;
      clawsColor?: string;
      hoofColor?: string;
      webbed?: boolean;
    },
  ): void {
    void cLight;
    ctx.save();
    ctx.translate(x, y);

    // Phase 1 Fix: If this is the near front waving limb (x in [-18, 32]) and the animal is waving,
    // convert the old forward-facing negative rotation (-0.5 * waveAmt) into a 120° offset AWAY
    // from the +X facing direction (+2.094 rad = 120° clockwise from +Y into the rear-upper quadrant!).
    const isNearFrontWaveSocket = x >= -18 && x <= 32 && currentAnimalWaveAmt > 0.02;
    const effectiveAngle = isNearFrontWaveSocket
      ? angle + 2.58 * currentAnimalWaveAmt
      : angle;
    ctx.rotate(effectiveAngle);

    const w = thickness * 0.5;
    const isStandingLimb = Math.abs(angle) < 1.0;
    // Iteration 4: Smooth raised-cosine foot-lift during swing phase (zero sharp cusp at ground contact)
    const rawSwing = isStandingLimb ? clamp(-Math.sin(angle * 2.6), 0, 1) : 0;
    const smoothSwing = rawSwing * rawSwing * (3 - 2 * rawSwing);
    const stepLift = smoothSwing * 7.5;
    const effLen = Math.max(44, length - stepLift);

    // Semicircular ball-joint root cap centered at (0, 0) so rotating around (0, 0) is rotationally invariant
    // and never exposes a flat corner outside the shoulder/hip socket, while strokeP leaves the root open ("嵌入")!
    const fillP = new Path2D();
    fillP.arc(0, 0, w * 1.08, Math.PI, 0, false);
    fillP.bezierCurveTo(w * 1.06, effLen * 0.24, w * 1.26, effLen * 0.55, w * 1.15, effLen * 0.88);
    fillP.bezierCurveTo(w * 0.85, effLen + w * 0.85, -w * 0.3, effLen + w * 0.95, -w * 0.92, effLen);
    fillP.bezierCurveTo(-w * 1.25, effLen * 0.78, -w * 1.04, effLen * 0.34, -w * 1.08, 0);
    fillP.closePath();

    const strokeP = new Path2D();
    strokeP.moveTo(-w * 1.08, 0);
    strokeP.bezierCurveTo(-w * 1.04, effLen * 0.34, -w * 1.25, effLen * 0.78, -w * 0.92, effLen);
    strokeP.bezierCurveTo(-w * 0.3, effLen + w * 0.95, w * 0.85, effLen + w * 0.85, w * 1.15, effLen * 0.88);
    strokeP.bezierCurveTo(w * 1.26, effLen * 0.55, w * 1.06, effLen * 0.24, w * 1.08, 0);

    const rim = new Path2D();
    rim.moveTo(-w * 0.82, Math.max(18, effLen * 0.24));
    rim.bezierCurveTo(-w * 1.04, effLen * 0.48, -w * 1.08, effLen * 0.78, -w * 0.75, effLen * 0.95);

    const grad = ctx.createLinearGradient(0, -w * 1.08, 0, effLen + w * 0.8);
    grad.addColorStop(0, cMid);
    grad.addColorStop(0.55, cMid);
    grad.addColorStop(1, cDark);
    ctx.fillStyle = grad;
    ctx.fill(fillP);

    ctx.save();
    ctx.clip(fillP);

    // 3D Cylindrical Limb Cross-Section Shading (soft low-alpha cross-section so the upper shoulder/hip blends seamlessly without any horizontal step)
    const cylGrad = ctx.createLinearGradient(-w * 1.25, 0, w * 1.25, 0);
    cylGrad.addColorStop(0, 'rgba(15, 10, 5, 0.06)');
    cylGrad.addColorStop(0.35, 'rgba(255, 252, 235, 0.09)');
    cylGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0)');
    cylGrad.addColorStop(1, 'rgba(12, 8, 4, 0.10)');
    ctx.fillStyle = cylGrad;
    ctx.fill(fillP);

    ctx.strokeStyle = 'rgba(255, 248, 215, 0.36)';
    ctx.lineWidth = 4.5;
    ctx.stroke(rim);

    // Anatomical 3D knee/elbow and ankle/wrist joint skin-fold crease lines
    ctx.strokeStyle = 'rgba(20, 14, 8, 0.20)';
    // Anatomical 3D deltoid/quadriceps muscle belly contour, knee/elbow crease, and ankle/metacarpal lines
    ctx.strokeStyle = 'rgba(20, 14, 8, 0.22)';
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(-w * 0.36, effLen * 0.16);
    ctx.quadraticCurveTo(-w * 0.52, effLen * 0.30, -w * 0.22, effLen * 0.42);
    ctx.arc(0, effLen * 0.48, w * 0.62, 0.22, Math.PI - 0.22);
    ctx.moveTo(-w * 0.48, effLen * 0.78);
    ctx.quadraticCurveTo(0, effLen * 0.83, w * 0.52, effLen * 0.77);
    ctx.stroke();

    if (opts?.pawTipColor) {
      ctx.fillStyle = opts.pawTipColor;
      ctx.beginPath();
      ctx.ellipse(w * 0.1, effLen * 0.92, w * 1.25, w * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (opts?.stripesColor) {
      ctx.fillStyle = opts.stripesColor;
      for (const sy of [0.32, 0.52, 0.68]) {
        ctx.beginPath();
        ctx.moveTo(-w * 1.2, effLen * sy - 5);
        ctx.quadraticCurveTo(0, effLen * sy + 3, w * 0.4, effLen * sy - 2);
        ctx.quadraticCurveTo(0, effLen * sy + 9, -w * 1.2, effLen * sy + 4);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (opts?.hoofColor) {
      ctx.fillStyle = opts.hoofColor;
      ctx.fillRect(-w * 1.3, effLen * 0.82, w * 2.6, w * 1.2);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(0, effLen * 0.84);
      ctx.lineTo(0, effLen + w);
      ctx.stroke();
    }

    if (opts?.pawPadColor) {
      ctx.fillStyle = opts.pawPadColor;
      drawOvalSpot(ctx, w * 0.08, effLen * 0.86, w * 0.48, w * 0.36, 0.1);
      drawOvalSpot(ctx, -w * 0.42, effLen * 0.96, w * 0.2, w * 0.16, -0.2);
      drawOvalSpot(ctx, w * 0.05, effLen * 0.99, w * 0.22, w * 0.16, 0);
      drawOvalSpot(ctx, w * 0.52, effLen * 0.95, w * 0.2, w * 0.16, 0.2);
    }

    ctx.restore();

    // Stroke ONLY the open outer contour (never across the shoulder/hip root!)
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = outline;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(strokeP);

    // Claws or toe dividers
    if (opts?.clawsColor) {
      ctx.fillStyle = opts.clawsColor;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.2;
      for (const cxOff of [-w * 0.45, 0, w * 0.45]) {
        ctx.beginPath();
        ctx.moveTo(cxOff - 2, effLen + w * 0.32);
        ctx.quadraticCurveTo(cxOff + 3, effLen + w * 0.88, cxOff + 7, effLen + w * 0.48);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (!opts?.hoofColor) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-w * 0.2, effLen + w * 0.58);
      ctx.lineTo(-w * 0.15, effLen + w * 0.18);
      ctx.moveTo(w * 0.32, effLen + w * 0.56);
      ctx.lineTo(w * 0.25, effLen + w * 0.18);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Helper to draw an open-rooted tail that embeds seamlessly ("嵌入") into the posterior body.
   * Its fill extends 24px deep inside the parent rump so rotation never reveals a seam or gap.
   */
  function drawEmbeddedTail(
    ctx: CanvasRenderingContext2D,
    fillPathOrBaseX: Path2D | number,
    openStrokePathOrBaseY: Path2D | number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    cLight: string | number,
    cMid: string,
    cDark: string,
    outline: string,
    lineWidth: number | string | ((ctx: CanvasRenderingContext2D) => void) = 3.5,
    decorateInside?: ((ctx: CanvasRenderingContext2D) => void) | (() => void),
  ): void {
    if (typeof fillPathOrBaseX === 'number' && typeof openStrokePathOrBaseY === 'number') {
      if (typeof cLight === 'number') {
        // 13-arg articulated polar signature: (ctx, baseX, baseY, angle, length, baseW, tipW, curlY, cLight, cMid, cDark, outline, decorateFn)
        const baseX = fillPathOrBaseX;
        const baseY = openStrokePathOrBaseY;
        const angle = x0;
        const length = y0;
        const baseHalfW = x1 * 0.5;
        const tipHalfW = Math.max(4, y1 * 0.5);
        const curlY = cLight;
        const colLight = cMid;
        const colMid = cDark;
        const colDark = outline;
        const colOutline = typeof lineWidth === 'string' ? lineWidth : '#1f1610';
        const decFn = typeof decorateInside === 'function' ? decorateInside : undefined;

        ctx.save();
        ctx.translate(baseX, baseY);
        ctx.rotate(angle);

        const fillP = new Path2D();
        fillP.moveTo(6, -baseHalfW);
        fillP.bezierCurveTo(-length * 0.32, -baseHalfW * 0.92, -length * 0.72, curlY - tipHalfW, -length, curlY - tipHalfW * 0.4);
        fillP.quadraticCurveTo(-length - tipHalfW * 1.4, curlY, -length, curlY + tipHalfW * 0.4);
        fillP.bezierCurveTo(-length * 0.72, curlY + tipHalfW, -length * 0.32, baseHalfW * 0.98, 6, baseHalfW);
        fillP.closePath();

        const strokeP = new Path2D();
        strokeP.moveTo(6, -baseHalfW);
        strokeP.bezierCurveTo(-length * 0.32, -baseHalfW * 0.92, -length * 0.72, curlY - tipHalfW, -length, curlY - tipHalfW * 0.4);
        strokeP.quadraticCurveTo(-length - tipHalfW * 1.4, curlY, -length, curlY + tipHalfW * 0.4);
        strokeP.bezierCurveTo(-length * 0.72, curlY + tipHalfW, -length * 0.32, baseHalfW * 0.98, 6, baseHalfW);

        fillRimAndStroke(
          ctx,
          fillP,
          6,
          -baseHalfW,
          -length,
          Math.max(baseHalfW, curlY + tipHalfW),
          colMid,
          colLight,
          colDark,
          colOutline,
          3.4,
          strokeP,
        );

        if (decFn) {
          ctx.save();
          ctx.clip(fillP);
          decFn(ctx);
          ctx.restore();
          ctx.lineWidth = 3.4;
          ctx.strokeStyle = colOutline;
          ctx.stroke(strokeP);
        }

        ctx.restore();
        return;
      }

      const baseX = fillPathOrBaseX;
      const baseY = openStrokePathOrBaseY;
      const tipX = x0;
      const tipY = y0;
      const baseHalfW = x1 * 0.5;
      const curveY = y1;
      const midX = (baseX + tipX) * 0.5;
      const midY = (baseY + tipY) * 0.5 + curveY;

      const fillP = new Path2D();
      fillP.moveTo(baseX + 6, baseY - baseHalfW);
      fillP.quadraticCurveTo(midX, midY - baseHalfW * 0.6, tipX, tipY);
      fillP.quadraticCurveTo(midX, midY + baseHalfW * 0.7, baseX + 6, baseY + baseHalfW);
      fillP.closePath();

      const strokeP = new Path2D();
      strokeP.moveTo(baseX + 6, baseY - baseHalfW);
      strokeP.quadraticCurveTo(midX, midY - baseHalfW * 0.6, tipX, tipY);
      strokeP.quadraticCurveTo(midX, midY + baseHalfW * 0.7, baseX + 6, baseY + baseHalfW);

      fillRimAndStroke(
        ctx,
        fillP,
        Math.max(baseX + 6, tipX),
        Math.min(baseY, tipY) - baseHalfW,
        Math.min(baseX, tipX),
        Math.max(baseY, tipY) + baseHalfW,
        cMid,
        cLight,
        cDark,
        outline,
        3.4,
        'rgba(255, 250, 220, 0.5)',
        undefined,
        strokeP,
      );
      return;
    }

    const fillPath = fillPathOrBaseX as Path2D;
    const openStrokePath = openStrokePathOrBaseY as Path2D;
    const resolvedLW = typeof lineWidth === 'number' ? lineWidth : 3.5;
    fillRimAndStroke(
      ctx,
      fillPath,
      x0,
      y0,
      x1,
      y1,
      cLight as string,
      cMid,
      cDark,
      outline,
      resolvedLW,
      'rgba(255, 250, 220, 0.5)',
      undefined,
      openStrokePath,
    );
    if (decorateInside) {
      ctx.save();
      ctx.clip(fillPath);
      decorateInside(ctx);
      ctx.restore();
      ctx.lineWidth = resolvedLW;
      ctx.strokeStyle = outline;
      ctx.stroke(openStrokePath);
    }
  }

export const kitFillRimAndStroke = fillRimAndStroke;

  /**
   * Biologically & visually calibrated viewport scale multipliers across all 41 animal species.
   * Ensures megafauna (Whale Shark, Asian Elephant, False Killer Whale, Tiger, Tapir, Sambar Deer,
   * Dugong, Giant Panda, Sun Bear) feel appropriately massive while small species (Mousedeer,
   * Clownfish, Harlequin Shrimp, Sea Star, Squirrel) have refined, realistic relative proportions.
   */
  const SPECIES_SCALE_MAP: Record<string, number> = {
    animal_01_malayan_tiger: 1.18,
    animal_02_asian_elephant: 1.32,
    animal_03_malayan_tapir: 1.18,
    animal_04_orangutan: 1.14,
    animal_05_sun_bear: 1.12,
    animal_06_sunda_pangolin: 1.02,
    animal_07_sambar_deer: 1.18,
    animal_08_greater_mousedeer: 0.88,
    animal_09_long_tailed_macaque: 0.98,
    animal_10_dusky_leaf_monkey: 1.0,
    animal_11_malayan_porcupine: 1.0,
    animal_12_malayan_flying_fox: 1.04,
    animal_13_raffles_banded_langur: 1.02,
    animal_14_malayan_crested_fireback: 1.02,
    animal_15_rhinoceros_hornbill: 1.08,
    animal_16_reticulated_python: 1.16,
    animal_17_clouded_monitor_lizard: 1.04,
    animal_18_black_giant_squirrel: 0.96,
    animal_19_smooth_coated_otter: 1.02,
    animal_20_giant_freshwater_prawn: 1.02,
    animal_21_asian_arowana: 1.12,
    animal_22_clown_featherback: 1.14,
    animal_23_southern_river_terrapin: 1.04,
    animal_24_southeast_asian_box_turtle: 0.98,
    animal_25_asian_water_monitor: 1.14,
    animal_26_giant_snakehead: 1.14,
    animal_27_dugong: 1.24,
    animal_28_green_sea_turtle: 1.12,
    animal_29_hawksbill_sea_turtle: 1.08,
    animal_30_whale_shark: 1.46,
    animal_31_indo_pacific_humpback_dolphin: 1.22,
    animal_32_false_killer_whale: 1.30,
    animal_33_blacktip_reef_shark: 1.24,
    animal_34_clownfish: 0.88,
    animal_35_giant_clam: 1.08,
    animal_36_bluespotted_ribbontail_ray: 1.12,
    animal_37_coconut_octopus: 1.04,
    animal_38_harlequin_shrimp: 0.92,
    animal_39_cuttlefish: 1.02,
    animal_40_sea_star: 0.94,
    animal_41_giant_panda: 1.16,
    animal_42_proboscis_monkey: 1.06,
    animal_43_sunda_clouded_leopard: 1.14,
    animal_44_binturong: 1.10,
    animal_45_mudskipper: 0.96,
    animal_46_giant_mud_crab: 1.02,
    animal_47_reef_manta_ray: 1.38,
    animal_48_chambered_nautilus: 1.02,
  };

  /**
   * Renders any of the 48 Animal species (`A01`–`A48`) as a pure 2D vector Canvas rig.
   * - Land animals perform a continuous 4-beat quadrupedal/bipedal walking gait on planted feet.
   * - Water/aquatic animals perform a continuous undulating swimming cycle with fin/fluke propulsion.
   * - All limbs, tails, necks, and quills are biologically embedded ("嵌入") via open-root strokes.
   */
  
export const LAND_STANDING_ANIMAL_IDS = new Set<string>([
  'animal_01_malayan_tiger',
  'animal_02_asian_elephant',
  'animal_03_malayan_tapir',
  'animal_04_orangutan',
  'animal_05_sun_bear',
  'animal_06_sunda_pangolin',
  'animal_07_sambar_deer',
  'animal_08_greater_mousedeer',
  'animal_09_long_tailed_macaque',
  'animal_09_malayan_porcupine',
  'animal_10_dusky_leaf_monkey',
  'animal_11_malayan_porcupine',
  'animal_12_malayan_peacock_pheasant',
  'animal_13_great_argus',
  'animal_13_raffles_banded_langur',
  'animal_14_malayan_crested_fireback',
  'animal_16_asian_water_monitor',
  'animal_17_clouded_monitor',
  'animal_17_clouded_monitor_lizard',
  'animal_18_black_giant_squirrel',
  'animal_19_smooth_coated_otter',
  'animal_23_river_terrapin',
  'animal_23_southern_river_terrapin',
  'animal_24_southeast_asian_box_turtle',
  'animal_25_asian_water_monitor',
  'animal_35_siamang',
  'animal_36_white_handed_gibbon',
  'animal_37_proboscis_monkey',
  'animal_38_dusky_leaf_monkey',
  'animal_39_barking_deer',
  'animal_41_giant_panda',
  'animal_42_proboscis_monkey',
  'animal_43_sunda_clouded_leopard',
  'animal_44_binturong',
  'animal_45_mudskipper',
  'animal_46_giant_mud_crab',
]);

export function isLandStandingAnimal(assetId: string): boolean {
  return LAND_STANDING_ANIMAL_IDS.has(assetId);
}

export function getSpeciesFramingScale(assetId: string): number {
  if (
    assetId.startsWith('animal_28_green_sea_turtle') ||
    assetId === 'animal_29_hawksbill_sea_turtle' ||
    assetId === 'animal_23_southern_river_terrapin' ||
    assetId === 'animal_24_southeast_asian_box_turtle'
  ) {
    return 1.0;
  }
  return SPECIES_SCALE_MAP[assetId] ?? 1.0;
}

let currentAnimalClimbing = false;

export interface AnimalRenderOptions {
    yaw?: number;
    pitch?: number;
    isDragging?: boolean;
    skipClear?: boolean;
    framingScale?: number;
    locoBlend?: number;
    swimming?: boolean;
    climbing?: boolean;
  }

  export function renderAnimalAsset(
    ctx: CanvasRenderingContext2D,
    assetId: string,
    width: number,
    height: number,
    pose: TurtlePose,
    tearDrops: TearDrop[],
    elapsedSec?: number,
    preview3D?: AnimalRenderOptions,
  ): void {
    if (assetId === 'animal_28_green_sea_turtle' || assetId === 'animal_28_green_sea_turtle_2d') {
      setActiveAnimalEyeScale(1.0);
      renderTurtle(ctx, width, height, pose, tearDrops, false, preview3D ? { yaw: preview3D.yaw ?? 0, pitch: preview3D.pitch ?? 0 } : undefined, {
        skipClear: preview3D?.skipClear,
        framingScale: preview3D?.framingScale ?? 1.04,
      });
      return;
    }
    if (assetId === 'animal_28_green_sea_turtle_3d') {
      setActiveAnimalEyeScale(1.0);
      renderTurtle(
        ctx,
        width,
        height,
        pose,
        tearDrops,
        true,
        preview3D ? { yaw: preview3D.yaw ?? 0, pitch: preview3D.pitch ?? 0 } : undefined,
        {
          skipClear: preview3D?.skipClear,
          framingScale: preview3D?.framingScale ?? 1.04,
        },
      );
      return;
    }
    if (
      assetId === 'animal_29_hawksbill_sea_turtle' ||
      assetId === 'animal_23_southern_river_terrapin' ||
      assetId === 'animal_24_southeast_asian_box_turtle'
    ) {
      setActiveAnimalEyeScale(1.0);
      renderTurtleVariant(
        ctx,
        width,
        height,
        pose,
        TURTLE_VARIANT_PALETTES[assetId],
        tearDrops,
        {
          skipClear: preview3D?.skipClear,
          framingScale: preview3D?.framingScale ?? 1.04,
        },
      );
      return;
    }

    currentAnimalYaw = preview3D?.yaw ?? 0;
    currentAnimalPitch = preview3D?.pitch ?? 0;
    currentAnimalId = assetId;
    currentAnimalWaveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);

    // Phase 2: Apply +30% (1.30x) eye enlargement for whales, sharks, and evaluated small-eyed species
    const eyeUpgrade = EYE_ENLARGED_SPECIES_REPORT[assetId];
    setActiveAnimalEyeScale(eyeUpgrade ? eyeUpgrade.multiplier : 1.0);

    if (!preview3D?.skipClear) {
      ctx.clearRect(0, 0, width, height);
    }
    void tearDrops;
    void currentAnimalId;

    const isLandStanding = LAND_STANDING_ANIMAL_IDS.has(assetId) && !preview3D?.swimming;
    const speciesScaleMult = SPECIES_SCALE_MAP[assetId] ?? 1.0;

    // Continuous locomotion time source (uses elapsedSec when available, or pose.waveRaysPhase)
    const locoTime = elapsedSec !== undefined ? elapsedSec : pose.waveRaysPhase / 4.8;

    // Detect active emote or sleep state so animals STOP walking on site during emotes (3-4s)
    const emoteSignal = Math.max(
      pose.waveRaysAlpha,
      pose.describeRaysAlpha,
      pose.laughMarksAlpha,
      pose.questionMarkAlpha,
      pose.angryVeinAlpha,
      pose.blushAlpha > 0.2 ? (pose.blushAlpha - 0.2) * 1.4 : 0,
      pose.sleepyLidAmount,
      pose.mouthWailShape,
      pose.mouthFrownLine,
      pose.tearsAlpha,
      pose.congratsAlpha,
      pose.farFlipperChinAmount,
      pose.farFlipperRaiseAmount,
      currentAnimalWaveAmt > 0.15 ? currentAnimalWaveAmt : 0,
    );
    const autoEmoteDamp = clamp(1 - emoteSignal * 1.5, 0, 1);
    const explicitLoco = preview3D?.locoBlend !== undefined ? clamp(preview3D.locoBlend, 0, 1) : 1.0;
    // Smooth Hermite easing on locomotion blend
    const rawLoco = explicitLoco * autoEmoteDamp;
    const activityScale = rawLoco * rawLoco * (3 - 2 * rawLoco);

    // Iteration 1-4: Smooth C2-continuous 4-beat biological gait, vertical tree-climbing & hydrodynamic S-wave propulsion
    const isSeaTurtle = assetId.includes('sea_turtle') || assetId.includes('turtle');
    const isClimbing = Boolean(preview3D?.climbing);
    currentAnimalClimbing = isClimbing && activityScale > 0.12;
    const walkPhase = locoTime * (isClimbing ? 6.2 : 4.4);
    // Sea turtles already get their main-page swimming motion from TurtleRigController (rig.pose)
    const swimPhase = locoTime * (isSeaTurtle ? 1.35 : 2.6);
    const breathWave = Math.sin(locoTime * 2.3);

    // Smooth C2 harmonic vertical bob or tree-climbing pull-up heave
    const walkBob = isClimbing
      ? Math.sin(walkPhase) * 11.2 * activityScale + breathWave * 1.1 * (1 - activityScale)
      : -(0.5 - 0.5 * Math.cos(walkPhase * 2)) * 3.8 * activityScale + breathWave * 0.9 * (1 - activityScale);
    const walkSurge = isClimbing
      ? Math.cos(walkPhase * 0.5) * 4.2 * activityScale
      : (0.5 - 0.5 * Math.cos(walkPhase)) * 2.6 * activityScale;
    const walkPitch = isClimbing
      ? (-0.34 + Math.sin(walkPhase) * 0.065) * activityScale
      : Math.sin(walkPhase - 0.35) * 0.014 * activityScale;
    // 4-beat lateral gait stride OR hand-over-hand arboreal tree-climbing reach
    const walkStrideFrontNear = isClimbing
      ? (-1.08 + Math.sin(walkPhase) * 0.76) * activityScale
      : (Math.sin(walkPhase) + 0.14 * Math.sin(walkPhase * 2)) * 0.38 * activityScale;
    const walkStrideFrontFar = isClimbing
      ? (-1.08 + Math.sin(walkPhase + Math.PI) * 0.76) * activityScale
      : (Math.sin(walkPhase + Math.PI) + 0.14 * Math.sin((walkPhase + Math.PI) * 2)) * 0.38 * activityScale;
    const walkStrideHindNear = isClimbing
      ? (-0.28 + Math.sin(walkPhase + Math.PI) * 0.58) * activityScale
      : (Math.sin(walkPhase + Math.PI * 0.82) + 0.14 * Math.sin((walkPhase + Math.PI * 0.82) * 2)) * 0.40 * activityScale;
    const walkStrideHindFar = isClimbing
      ? (-0.28 + Math.sin(walkPhase) * 0.58) * activityScale
      : (Math.sin(walkPhase - Math.PI * 0.18) + 0.14 * Math.sin((walkPhase - Math.PI * 0.18) * 2)) * 0.40 * activityScale;

    const swimBob = isSeaTurtle ? 0 : Math.sin(swimPhase) * 5.6 * activityScale + breathWave * 1.6 * (1 - activityScale);
    const swimSurge = isSeaTurtle ? 0 : (0.5 - 0.5 * Math.cos(swimPhase)) * 4.2 * activityScale;
    const swimPitch = isSeaTurtle ? 0 : Math.cos(swimPhase - 0.45) * 0.036 * activityScale;
    const swimTailKick = isSeaTurtle ? 0 : Math.sin(swimPhase * 1.4 - 0.65) * 0.34 * activityScale;
    const swimFinScull = isSeaTurtle ? 0 : Math.sin(swimPhase - 0.35) * 0.28 * activityScale;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const cx = width * 0.5;
    const cy = height * (isLandStanding ? 0.5 : 0.49);
    const baseRadius = Math.min(width, height * 1.08);
    const framing = preview3D?.framingScale ?? 1.0;
    const scale = clamp((baseRadius / 650) * speciesScaleMult * framing, 0.22, 1.85);

    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Continuous horizontal direction turn (facing: +1 right, -1 left)
    const dirSign = pose.facing >= 0 ? 1 : -1;
    ctx.scale(dirSign, 1);

    // Ground contact shadow for walking land animals vs floating water shadow for swimming animals
    const effectiveBodyX = isLandStanding ? pose.bodyX * 0.45 + walkSurge : pose.bodyX + swimSurge;
    const effectiveBodyY = isLandStanding ? pose.bodyY * 0.16 + walkBob : (isSeaTurtle ? pose.bodyY : pose.bodyY * 0.65 + swimBob);
    const effectiveBodyRot = isLandStanding ? pose.bodyRot * 0.22 + walkPitch : (isSeaTurtle ? pose.bodyRot : pose.bodyRot * 0.5 + swimPitch);

    if (!isClimbing) {
      ctx.save();
      const shadowY = (isLandStanding ? 186 : 232 - effectiveBodyY * 0.2) + currentAnimalPitch * 12;
      const shadowScale = isLandStanding ? 1.06 + Math.cos(walkPhase * 2) * 0.022 * activityScale : 1 - effectiveBodyY * 0.003;
      ctx.translate(-6 + (isLandStanding ? walkSurge * 0.6 : swimSurge * 0.5) + currentAnimalYaw * 14, shadowY);
      ctx.scale(shadowScale, (isLandStanding ? 0.19 : 0.22) * (1 + Math.abs(currentAnimalPitch) * 0.25));
      const shGrad = ctx.createRadialGradient(0, 0, 14, 0, 0, 215);
      shGrad.addColorStop(0, isLandStanding ? 'rgba(45, 68, 45, 0.28)' : 'rgba(55, 95, 108, 0.22)');
      shGrad.addColorStop(0.65, isLandStanding ? 'rgba(45, 68, 45, 0.12)' : 'rgba(55, 95, 108, 0.08)');
      shGrad.addColorStop(1, 'rgba(65, 90, 65, 0)');
      ctx.fillStyle = shGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 215, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Root body transform: Continuous blend between walking/swimming locomotion and emotion gestures
    const nearGestureWeight = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    const farGestureWeight = clamp(Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount), 0, 1);

    const groundedPose: TurtlePose = isLandStanding
      ? {
        ...pose,
        bodyX: effectiveBodyX + currentAnimalYaw * 10,
        bodyY: effectiveBodyY + currentAnimalPitch * 8,
        bodyRot: effectiveBodyRot + currentAnimalYaw * 0.025,
        shellOffsetX: pose.shellOffsetX - currentAnimalYaw * 6,
        shellOffsetY: pose.shellOffsetY * 0.25 + walkBob * 0.32 - currentAnimalPitch * 5,
        shellRot: pose.shellRot * 0.25 + walkPitch * 0.45,
        headX: pose.headX + Math.cos(walkPhase - 0.5) * 1.4 * activityScale + currentAnimalYaw * 16,
        headY: pose.headY - Math.sin(walkPhase * 2 - 0.65) * 1.8 * activityScale + breathWave * 1.1 * (1 - activityScale) + currentAnimalPitch * 12,
        headLookX: clamp(pose.headLookX + currentAnimalYaw * 0.55, -1.2, 1.2),
        headLookY: clamp(pose.headLookY + (isClimbing ? -0.32 * activityScale : 0) + currentAnimalPitch * 0.55, -1.2, 1.2),
        nearFlipperAngle:
          (1 - nearGestureWeight) * (pose.nearFlipperAngle * (1 - activityScale * 0.65) + walkStrideFrontNear) +
          nearGestureWeight * pose.nearFlipperAngle,
        farFlipperAngle:
          (1 - farGestureWeight) * (pose.farFlipperAngle * (1 - activityScale * 0.65) + walkStrideFrontFar) +
          farGestureWeight * pose.farFlipperAngle,
        hindNearAngle: walkStrideHindNear,
        hindFarAngle: walkStrideHindFar,
        waveRaysPhase: pose.waveRaysPhase || walkPhase,
      }
      : {
        ...pose,
        bodyX: effectiveBodyX + currentAnimalYaw * 10,
        bodyY: effectiveBodyY + currentAnimalPitch * 8,
        bodyRot: effectiveBodyRot + currentAnimalYaw * 0.025,
        shellOffsetX: pose.shellOffsetX - currentAnimalYaw * 6,
        shellOffsetY: pose.shellOffsetY + (isSeaTurtle ? 0 : Math.sin(swimPhase - 0.55) * 3.2 * activityScale) - currentAnimalPitch * 5,
        shellRot: pose.shellRot + (isSeaTurtle ? 0 : Math.sin(swimPhase - 0.65) * 0.022 * activityScale),
        headX: pose.headX + currentAnimalYaw * 16,
        headY: pose.headY + (isSeaTurtle ? 0 : Math.sin(swimPhase + 0.35) * 1.4 * activityScale) + currentAnimalPitch * 12,
        headLookX: clamp(pose.headLookX + currentAnimalYaw * 0.55, -1.2, 1.2),
        headLookY: clamp(pose.headLookY + currentAnimalPitch * 0.55, -1.2, 1.2),
        nearFlipperAngle:
          isSeaTurtle
            ? pose.nearFlipperAngle
            : (1 - nearGestureWeight) * (pose.nearFlipperAngle * (1 - activityScale * 0.5) + swimFinScull) +
              nearGestureWeight * pose.nearFlipperAngle,
        farFlipperAngle:
          isSeaTurtle
            ? pose.farFlipperAngle
            : (1 - farGestureWeight) * (pose.farFlipperAngle * (1 - activityScale * 0.5) - swimFinScull) +
              farGestureWeight * pose.farFlipperAngle,
        hindNearAngle: isSeaTurtle ? pose.hindNearAngle : pose.hindNearAngle * (1 - activityScale * 0.5) + swimTailKick,
        hindFarAngle: isSeaTurtle ? pose.hindFarAngle : pose.hindFarAngle * (1 - activityScale * 0.5) - swimTailKick,
        waveRaysPhase: pose.waveRaysPhase || swimPhase,
      };

    ctx.save();
    ctx.translate(groundedPose.bodyX, groundedPose.bodyY);
    ctx.rotate(groundedPose.bodyRot);
    ctx.scale(groundedPose.bodyScaleX, groundedPose.bodyScaleY);

    switch (assetId) {
      case 'animal_01_malayan_tiger':
        drawMalayanTigerRig(ctx, groundedPose);
        break;
      case 'animal_02_asian_elephant':
        drawAsianElephantRig(ctx, groundedPose);
        break;
      case 'animal_03_malayan_tapir':
        drawMalayanTapirRig(ctx, groundedPose);
        break;
      case 'animal_04_orangutan':
        drawPrimateRig(ctx, groundedPose, 'orangutan');
        break;
      case 'animal_05_sun_bear':
        drawSunBearRig(ctx, groundedPose);
        break;
      case 'animal_06_sunda_pangolin':
        drawSundaPangolinRig(ctx, groundedPose);
        break;
      case 'animal_07_sambar_deer':
        drawCervidRig(ctx, groundedPose, true);
        break;
      case 'animal_08_greater_mousedeer':
        drawCervidRig(ctx, groundedPose, false);
        break;
      case 'animal_09_long_tailed_macaque':
        drawPrimateRig(ctx, groundedPose, 'macaque');
        break;
      case 'animal_10_dusky_leaf_monkey':
        drawPrimateRig(ctx, groundedPose, 'dusky');
        break;
      case 'animal_13_raffles_banded_langur':
        drawPrimateRig(ctx, groundedPose, 'langur');
        break;
      case 'animal_11_malayan_porcupine':
        drawMalayanPorcupineRig(ctx, groundedPose);
        break;
      case 'animal_12_malayan_flying_fox':
        drawMalayanFlyingFoxRig(ctx, groundedPose);
        break;
      case 'animal_14_malayan_crested_fireback':
        drawAvianRig(ctx, groundedPose, 'fireback');
        break;
      case 'animal_15_rhinoceros_hornbill':
        drawAvianRig(ctx, groundedPose, 'hornbill');
        break;
      case 'animal_16_reticulated_python':
        drawReticulatedPythonRig(ctx, groundedPose);
        break;
      case 'animal_17_clouded_monitor_lizard':
        drawMonitorLizardRig(ctx, groundedPose, true);
        break;
      case 'animal_25_asian_water_monitor':
        drawMonitorLizardRig(ctx, groundedPose, false);
        break;
      case 'animal_18_black_giant_squirrel':
        drawBlackGiantSquirrelRig(ctx, groundedPose);
        break;
      case 'animal_19_smooth_coated_otter':
        drawSmoothCoatedOtterRig(ctx, groundedPose);
        break;
      case 'animal_20_giant_freshwater_prawn':
        drawCrustaceanRig(ctx, groundedPose, 'prawn');
        break;
      case 'animal_38_harlequin_shrimp':
        drawCrustaceanRig(ctx, groundedPose, 'harlequin');
        break;
      case 'animal_21_asian_arowana':
        drawSculptedFishRig(ctx, groundedPose, 'arowana');
        break;
      case 'animal_22_clown_featherback':
        drawSculptedFishRig(ctx, groundedPose, 'featherback');
        break;
      case 'animal_23_southern_river_terrapin':
        drawRiverTerrapinRig(ctx, groundedPose);
        break;
      case 'animal_24_southeast_asian_box_turtle':
        drawBoxTurtleRig(ctx, groundedPose);
        break;
      case 'animal_29_hawksbill_sea_turtle':
        drawHawksbillSeaTurtleRig(ctx, groundedPose);
        break;
      case 'animal_26_giant_snakehead':
        drawSculptedFishRig(ctx, groundedPose, 'snakehead');
        break;
      case 'animal_34_clownfish':
        drawSculptedFishRig(ctx, groundedPose, 'clownfish');
        break;
      case 'animal_27_dugong':
        drawMarineMammalRig(ctx, groundedPose, 'dugong');
        break;
      case 'animal_31_indo_pacific_humpback_dolphin':
        drawMarineMammalRig(ctx, groundedPose, 'pink_dolphin');
        break;
      case 'animal_32_false_killer_whale':
        drawMarineMammalRig(ctx, groundedPose, 'false_killer_whale');
        break;
      case 'animal_30_whale_shark':
        drawSharkRig(ctx, groundedPose, 'whale_shark');
        break;
      case 'animal_33_blacktip_reef_shark':
        drawSharkRig(ctx, groundedPose, 'blacktip');
        break;
      case 'animal_35_giant_clam':
        drawGiantClamRig(ctx, groundedPose);
        break;
      case 'animal_36_bluespotted_ribbontail_ray':
        drawBluespottedRayRig(ctx, groundedPose);
        break;
      case 'animal_37_coconut_octopus':
        drawCephalopodRig(ctx, groundedPose, 'octopus');
        break;
      case 'animal_39_cuttlefish':
        drawCephalopodRig(ctx, groundedPose, 'cuttlefish');
        break;
      case 'animal_40_sea_star':
        drawHornedSeaStarRig(ctx, groundedPose);
        break;
      case 'animal_41_giant_panda':
        drawGiantPandaRig(ctx, groundedPose);
        break;
      case 'animal_42_proboscis_monkey':
        drawProboscisMonkeyRig(ctx, groundedPose);
        break;
      case 'animal_43_sunda_clouded_leopard':
        drawSundaCloudedLeopardRig(ctx, groundedPose);
        break;
      case 'animal_44_binturong':
        drawBinturongRig(ctx, groundedPose);
        break;
      case 'animal_45_mudskipper':
        drawMudskipperRig(ctx, groundedPose);
        break;
      case 'animal_46_giant_mud_crab':
        drawGiantMudCrabRig(ctx, groundedPose);
        break;
      case 'animal_47_reef_manta_ray':
        drawReefMantaRayRig(ctx, groundedPose);
        break;
      case 'animal_48_chambered_nautilus':
        drawChamberedNautilusRig(ctx, groundedPose);
        break;
      default:
        drawMalayanTigerRig(ctx, groundedPose);
        break;
    }

    // Shared white-bordered comic emotion props (waving rays, laugh marks, question mark, angry vein, sleepy Zzz, blush hearts)
    drawEmotionProps(ctx, groundedPose);

    ctx.restore();
    ctx.restore();
  }

  /* ============================================================================
   * A01: MALAYAN TIGER (Panthera tigris jacksoni)
   * ========================================================================== */
  function drawMalayanTigerRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#261408';
    const cLight = '#ffbe4f';
    const cMid = '#f28b24';
    const cDark = '#c95e10';
    const creamLight = '#fffDF5';
    const creamDark = '#f0dec2';
    const stripeCol = '#241207';

    // 1. Far Hind Leg (Back-Right, grouped in hind pair at x=-78, deeply embedded at y=74)
    drawSculptedPawLimb(ctx, -78, 74, pose.hindFarAngle * 0.45, 112, 48, cMid, cDark, '#9e4408', outline, {
      pawTipColor: creamLight,
      stripesColor: stripeCol,
      clawsColor: '#fff5e0',
    });

    // 2. Far Front Limb (Front-Right, permanently socketed behind torso at x=56, y=72, turning right on emotes)
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
    drawSculptedPawLimb(
      ctx,
      56,
      72,
      pose.farFlipperAngle * 0.42 - 0.06 - 0.48 * farGestureAmt,
      114,
      50,
      cLight,
      cMid,
      cDark,
      outline,
      {
        pawTipColor: creamLight,
        pawPadColor: farGestureAmt > 0.3 ? '#f48fb1' : undefined,
        stripesColor: stripeCol,
        clawsColor: '#fff5e0',
      },
    );

    // 3. Elongated Megafauna Sculpted Torso & Upper-Chest Cream Ruff (kept above front leg root!)
    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);
    const torso = new Path2D();
    torso.moveTo(-174, 38);
    torso.bezierCurveTo(-184, -32, -104, -66, -6, -56);
    torso.bezierCurveTo(78, -46, 112, 8, 102, 78);
    torso.bezierCurveTo(88, 138, -8, 148, -102, 136);
    torso.bezierCurveTo(-156, 126, -170, 84, -174, 38);
    torso.closePath();
    fillRimAndStroke(ctx, torso, -145, -58, 76, 138, cLight, cMid, cDark, outline, 3.6);

    ctx.save();
    ctx.clip(torso);
    ctx.fillStyle = stripeCol;
    const backStripes: Array<[number, number, number, number, number]> = [
      [-136, -18, 12, 40, 0.25],
      [-96, -28, 13, 46, 0.18],
      [-56, -32, 12, 44, 0.12],
      [-16, -28, 11, 38, 0.08],
      [-146, 24, 26, 9, -0.25],
      [-134, 48, 24, 8, -0.2],
    ];
    for (const [sx, sy, srx, sry, srot] of backStripes) {
      drawOvalSpot(ctx, sx, sy, srx, sry, srot);
    }

    // Upper-throat cream ruff kept forward of x=44 and above y=62 so front leg (x=10, y=70) joins orange flank seamlessly!
    const chest = new Path2D();
    chest.moveTo(46, 4);
    chest.bezierCurveTo(72, -4, 104, 12, 104, 48);
    chest.bezierCurveTo(102, 72, 76, 82, 50, 68);
    chest.bezierCurveTo(42, 46, 42, 22, 46, 4);
    chest.closePath();
    const chGrad = ctx.createLinearGradient(46, 0, 76, 78);
    chGrad.addColorStop(0, creamLight);
    chGrad.addColorStop(1, creamDark);
    ctx.fillStyle = chGrad;
    ctx.fill(chest);
    ctx.restore();

    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(torso);

    // 4. Articulated Striped Tail drawn over posterior rump with aligned fill/stroke root so zero seam or unstroked fill shows!
    ctx.save();
    ctx.translate(-172, 48);
    ctx.rotate(pose.hindNearAngle * 0.4 + Math.sin(pose.waveRaysPhase * 0.7) * 0.08);
    const tailFill = new Path2D();
    tailFill.moveTo(6, -13);
    tailFill.bezierCurveTo(-28, -30, -76, -80, -90, -128);
    tailFill.bezierCurveTo(-100, -154, -128, -146, -122, -120);
    tailFill.bezierCurveTo(-108, -62, -48, -6, 6, 13);
    tailFill.closePath();
    const tailOpen = new Path2D();
    tailOpen.moveTo(6, -13);
    tailOpen.bezierCurveTo(-28, -30, -76, -80, -90, -128);
    tailOpen.bezierCurveTo(-100, -154, -128, -146, -122, -120);
    tailOpen.bezierCurveTo(-108, -62, -48, -6, 6, 13);
    fillRimAndStroke(ctx, tailFill, 6, 12, -110, -135, cMid, cLight, cMid, outline, 3.4, tailOpen);
    ctx.save();
    ctx.clip(tailFill);
    ctx.fillStyle = stripeCol;
    drawOvalSpot(ctx, -108, -133, 22, 18, 0.2);
    drawOvalSpot(ctx, -86, -90, 18, 8, 0.5);
    drawOvalSpot(ctx, -62, -60, 18, 8, 0.6);
    drawOvalSpot(ctx, -36, -34, 16, 7, 0.7);
    ctx.restore();
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = outline;
    ctx.stroke(tailOpen);
    ctx.restore();
    ctx.restore();

    // Near Hind Leg (x=-126) & Near Front Leg (x=+12) with wide megafauna wheelbase!
    drawSculptedPawLimb(ctx, -126, 74, pose.hindNearAngle * 0.45, 112, 54, cLight, cMid, cDark, outline, {
      pawTipColor: creamLight,
      stripesColor: stripeCol,
      clawsColor: '#fff5e0',
    });

    const downAmt = pose.nearFlipperDownAmount;
    const waveAmt = clamp(1 - downAmt - pose.nearFlipperTuckAmount, 0, 1);
    drawSculptedPawLimb(
      ctx,
      12,
      70,
      pose.nearFlipperAngle * (0.42 + 0.2 * waveAmt) + 0.04 - 0.52 * waveAmt - 0.24 * pose.nearFlipperTuckAmount,
      116,
      52,
      cLight,
      cMid,
      cDark,
      outline,
      {
        pawTipColor: creamLight,
        pawPadColor: waveAmt > 0.35 ? '#f48fb1' : undefined,
        stripesColor: stripeCol,
        clawsColor: '#fff5e0',
      },
    );

    // 5. Articulated Tiger Head Group
    ctx.save();
    ctx.translate(48 + pose.headX, -38 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    for (const [ex, ey, erot, isLeft] of [
      [-82, -108, -0.38, true],
      [88, -94, 0.42, false],
    ] as const) {
      ctx.save();
      ctx.translate(ex + lookX * 0.3, ey + lookY * 0.3);
      ctx.rotate(erot);
      const earP = new Path2D();
      earP.arc(0, 0, 34, Math.PI * 0.85, Math.PI * 2.15);
      earP.closePath();
      fillRimAndStroke(ctx, earP, 0, -34, 0, 20, cLight, cMid, cDark, outline, 3.5);
      ctx.save();
      ctx.clip(earP);
      ctx.fillStyle = stripeCol;
      ctx.beginPath();
      ctx.arc(0, -22, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = creamLight;
      drawOvalSpot(ctx, isLeft ? 4 : -4, -2, 16, 14, 0);
      ctx.restore();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = outline;
      ctx.stroke(earP);
      ctx.restore();
    }

    const headP = new Path2D();
    headP.moveTo(4, -124);
    headP.bezierCurveTo(76, -122, 124, -70, 122, -12);
    headP.bezierCurveTo(138, 12, 132, 52, 100, 72);
    headP.bezierCurveTo(62, 96, -42, 100, -94, 72);
    headP.bezierCurveTo(-132, 50, -134, 6, -116, -22);
    headP.bezierCurveTo(-114, -82, -62, -126, 4, -124);
    headP.closePath();

    const hGrad = ctx.createRadialGradient(-8 + lookX * 0.4, -75 + lookY * 0.4, 16, 4, -10, 165);
    hGrad.addColorStop(0, '#ffd46b');
    hGrad.addColorStop(0.45, cLight);
    hGrad.addColorStop(0.82, cMid);
    hGrad.addColorStop(1, cDark);
    ctx.fillStyle = hGrad;
    ctx.fill(headP);

    ctx.save();
    ctx.clip(headP);
    ctx.fillStyle = creamLight;
    drawOvalSpot(ctx, -82 + lookX * 0.5, 34 + lookY * 0.5, 46, 36, -0.2);
    drawOvalSpot(ctx, 92 + lookX * 0.5, 40 + lookY * 0.5, 42, 32, 0.2);
    drawOvalSpot(ctx, -38 + lookX * 0.6, -46 + lookY * 0.6, 20, 12, -0.25);
    drawOvalSpot(ctx, 72 + lookX * 0.6, -36 + lookY * 0.6, 18, 11, 0.25);
    drawOvalSpot(ctx, 18 + lookX * 0.85, 32 + lookY * 0.85, 50, 32, 0.08);

    ctx.fillStyle = stripeCol;
    drawOvalSpot(ctx, 14 + lookX * 0.5, -100 + lookY * 0.5, 7, 24, 0.05);
    drawOvalSpot(ctx, -22 + lookX * 0.5, -94 + lookY * 0.5, 22, 7, 0.35);
    drawOvalSpot(ctx, 50 + lookX * 0.5, -90 + lookY * 0.5, 22, 7, -0.35);
    drawOvalSpot(ctx, -18 + lookX * 0.5, -74 + lookY * 0.5, 18, 6, 0.25);
    drawOvalSpot(ctx, 46 + lookX * 0.5, -70 + lookY * 0.5, 18, 6, -0.25);
    drawOvalSpot(ctx, -90 + lookX * 0.5, 18 + lookY * 0.5, 22, 6, -0.15);
    drawOvalSpot(ctx, -84 + lookX * 0.5, 38 + lookY * 0.5, 24, 6, -0.05);
    drawOvalSpot(ctx, 96 + lookX * 0.5, 24 + lookY * 0.5, 20, 6, 0.15);
    drawOvalSpot(ctx, 92 + lookX * 0.5, 44 + lookY * 0.5, 22, 6, 0.05);

    drawSoftCheekBlushes(ctx, -56 + lookX * 0.8, 22 + lookY * 0.8, 84 + lookX * 0.8, 30 + lookY * 0.8, 26, 15, pose.blushAlpha);
    ctx.restore();

    ctx.lineWidth = 3.7;
    ctx.strokeStyle = outline;
    ctx.stroke(headP);

    drawExpressiveAnimalMouth(ctx, 18 + lookX, 42 + lookY, 0.84, 0.08, pose, outline);

    ctx.save();
    ctx.translate(22 + lookX, 10 + lookY);
    const noseP = new Path2D();
    noseP.moveTo(-18, -7);
    noseP.quadraticCurveTo(0, -13, 18, -7);
    noseP.quadraticCurveTo(14, 9, 0, 13);
    noseP.quadraticCurveTo(-14, 9, -18, -7);
    noseP.closePath();
    fillRimAndStroke(ctx, noseP, 0, -12, 0, 13, '#ffa6b8', '#f06292', '#ad1457', outline, 3.0);
    ctx.restore();

    // Small, intense apex-predator Malayan Tiger eyes (13x15 left, 11x13 right)
    drawGlossyAnimalEye(ctx, 'left', -36 + lookX * 0.85, -16 + lookY * 0.85, 13, 15, -0.1, pose, IRIS_PALETTES.emerald, cLight, cMid, outline);
    drawGlossyAnimalEye(ctx, 'right', 72 + lookX * 0.85, -6 + lookY * 0.85, 11, 13, 0.14, pose, IRIS_PALETTES.emerald, cLight, cMid, outline);
    drawExpressiveAnimalBrows(ctx, -36 + lookX * 0.85, -42 + lookY * 0.85, 72 + lookX * 0.85, -32 + lookY * 0.85, 26, pose, outline, 4.0);

    ctx.restore();
  }

  /* ============================================================================
   * A02: ASIAN ELEPHANT (Elephas maximus)
   * - Untwisted left ivory tusk matching the smooth forward curve of the right tusk
   * - Elongated megafauna body & uncrowded pillar legs with deep shoulder/hip embedding
   * - Refined realistic elephant eye size
   * ========================================================================== */
  function drawAsianElephantRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#232830';
    const cLight = '#b0bec5';
    const cMid = '#8796a1';
    const cDark = '#5c6b75';
    const nailCol = '#f5ebd6';
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

    // Far Hind & Far Front Pillar Legs (permanently socketed behind torso, turning right on emotes)
    drawSculptedPawLimb(ctx, -84, 74, pose.hindFarAngle * 0.45, 112, 56, cMid, cDark, '#48555e', outline, {
      pawTipColor: nailCol,
    });
    drawSculptedPawLimb(
      ctx,
      58,
      70,
      pose.farFlipperAngle * 0.42 - 0.05 - 0.45 * farGestureAmt,
      116,
      56,
      cLight,
      cMid,
      cDark,
      outline,
      { pawTipColor: nailCol },
    );

    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);
    const torso = new Path2D();
    torso.ellipse(-38, 40, 152, 98, 0.05, 0, Math.PI * 2);
    fillRimAndStroke(ctx, torso, -145, -52, 72, 136, cLight, cMid, cDark, outline, 3.6);

    // Embedded tufted elephant tail drawn over posterior rump contour with deep open root
    drawEmbeddedTail(
      ctx,
      -186,
      40,
      pose.hindNearAngle * 0.4 + Math.sin(pose.waveRaysPhase) * 0.06,
      68,
      18,
      6,
      22,
      cLight,
      cMid,
      cMid,
      outline,
      (tCtx) => {
        tCtx.fillStyle = '#2d333b';
        drawOvalSpot(tCtx, -66, 22, 12, 7, 0.35);
      },
    );
    ctx.restore();

    drawSculptedPawLimb(ctx, -130, 72, pose.hindNearAngle * 0.45, 114, 62, cLight, cMid, cDark, outline, {
      pawTipColor: nailCol,
    });

    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    drawSculptedPawLimb(
      ctx,
      12,
      68,
      pose.nearFlipperAngle * (0.42 + 0.18 * waveAmt) + 0.04 - 0.48 * waveAmt - 0.22 * pose.nearFlipperTuckAmount,
      118,
      58,
      cLight,
      cMid,
      cDark,
      outline,
      { pawTipColor: nailCol },
    );

    // Head, Large Fan Ears & Expressive Curved Trunk
    ctx.save();
    ctx.translate(48 + pose.headX, -36 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    for (const [ex, ey, rx, ry, rot] of [
      [-112, -12, 62, 78, -0.22],
      [114, 2, 52, 68, 0.25],
    ] as const) {
      ctx.save();
      ctx.translate(ex + lookX * 0.3, ey + lookY * 0.3);
      ctx.rotate(rot + Math.sin(pose.waveRaysPhase) * 0.04);
      const earP = new Path2D();
      earP.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      fillRimAndStroke(ctx, earP, -rx, -ry, rx, ry, cLight, cMid, cDark, outline, 3.5);
      ctx.save();
      ctx.clip(earP);
      ctx.fillStyle = 'rgba(244, 164, 176, 0.65)';
      drawOvalSpot(ctx, 0, 12, rx * 0.72, ry * 0.7, 0);
      ctx.restore();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = outline;
      ctx.stroke(earP);
      ctx.restore();
    }

    const headP = new Path2D();
    headP.moveTo(0, -122);
    headP.bezierCurveTo(45, -138, 108, -96, 108, -12);
    headP.bezierCurveTo(108, 58, 64, 92, 4, 92);
    headP.bezierCurveTo(-68, 92, -108, 52, -106, -16);
    headP.bezierCurveTo(-104, -96, -42, -136, 0, -122);
    headP.closePath();
    fillRimAndStroke(ctx, headP, -60, -125, 40, 90, '#c5d1d8', cLight, cMid, outline, 3.7);

    ctx.save();
    ctx.clip(headP);
    drawSoftCheekBlushes(ctx, -56 + lookX * 0.8, 24 + lookY * 0.8, 78 + lookX * 0.8, 32 + lookY * 0.8, 26, 15, pose.blushAlpha);
    ctx.restore();

    drawExpressiveAnimalMouth(ctx, 12 + lookX, 54 + lookY, 0.78, 0.08, pose, outline);

    // Ivory Tusks emerging from sculpted fleshy tusk-sheath lip sockets (zero unstroked white edge!)
    const drawIvoryTusk = (tx: number, ty: number, rot: number, scale: number) => {
      ctx.save();
      ctx.translate(tx + lookX, ty + lookY);
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      const tuskP = new Path2D();
      tuskP.moveTo(-9, -2);
      tuskP.bezierCurveTo(-8, 22, 8, 46, 28, 36);
      tuskP.bezierCurveTo(16, 20, 8, 4, 7, -4);
      tuskP.closePath();
      const tuskOpen = new Path2D();
      tuskOpen.moveTo(-9, -2);
      tuskOpen.bezierCurveTo(-8, 22, 8, 46, 28, 36);
      tuskOpen.bezierCurveTo(16, 20, 8, 4, 7, -4);
      fillRimAndStroke(ctx, tuskP, -8, -4, 26, 38, '#fffffa', '#faf0d7', '#dfc896', outline, 2.6, tuskOpen);

      // Fleshy grey upper-lip tusk-sheath socket fold overlapping the top root of the tusk
      const sheathP = new Path2D();
      sheathP.moveTo(-12, 1);
      sheathP.quadraticCurveTo(-1, -7, 10, -2);
      sheathP.quadraticCurveTo(0, -11, -12, 1);
      sheathP.closePath();
      ctx.fillStyle = cMid;
      ctx.fill(sheathP);
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-12, 1);
      ctx.quadraticCurveTo(-1, -7, 10, -2);
      ctx.stroke();
      ctx.restore();
    };
    // Left Ivory Tusk (untwisted, emerging cleanly from tusk sheath!)
    drawIvoryTusk(-16, 28, 0.14, 1.28);

    // Clean Sculpted Trunk with aligned fill/stroke root so zero unstroked polygon protrudes
    ctx.save();
    ctx.translate(22 + lookX, 6 + lookY);
    const trunkCurl = Math.sin(pose.waveRaysPhase * 0.8) * 0.08 + (pose.farFlipperChinAmount > 0.4 ? -0.35 : 0);
    ctx.rotate(trunkCurl);
    const trunkFill = new Path2D();
    trunkFill.moveTo(-24, -4);
    trunkFill.bezierCurveTo(-22, 42, 12, 92, 58, 84);
    trunkFill.bezierCurveTo(86, 78, 96, 46, 76, 36);
    trunkFill.bezierCurveTo(58, 28, 48, 52, 34, 48);
    trunkFill.bezierCurveTo(16, 42, 18, 6, 22, -6);
    trunkFill.closePath();
    const trunkOpen = new Path2D();
    trunkOpen.moveTo(-24, -4);
    trunkOpen.bezierCurveTo(-22, 42, 12, 92, 58, 84);
    trunkOpen.bezierCurveTo(86, 78, 96, 46, 76, 36);
    trunkOpen.bezierCurveTo(58, 28, 48, 52, 34, 48);
    trunkOpen.bezierCurveTo(16, 42, 18, 6, 22, -6);
    fillRimAndStroke(ctx, trunkFill, -20, -6, 75, 85, cLight, cMid, cDark, outline, 3.5, trunkOpen);
    ctx.fillStyle = '#f4a4b0';
    drawOvalSpot(ctx, 78, 44, 6, 4, 0.3);
    ctx.restore();

    // Right Ivory Tusk
    drawIvoryTusk(52, 26, -0.04, 1.32);

    // Realistic small Asian Elephant eyes (11x13 left, 9.5x11.5 right)
    drawGlossyAnimalEye(ctx, 'left', -42 + lookX * 0.85, -18 + lookY * 0.85, 11, 13, -0.08, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
    drawGlossyAnimalEye(ctx, 'right', 68 + lookX * 0.85, -8 + lookY * 0.85, 9.5, 11.5, 0.12, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
    drawExpressiveAnimalBrows(ctx, -42 + lookX * 0.85, -38 + lookY * 0.85, 68 + lookX * 0.85, -28 + lookY * 0.85, 22, pose, outline, 3.6);

    ctx.strokeStyle = outline;
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(0, -122);
    ctx.quadraticCurveTo(-8, -142, -18, -146);
    ctx.moveTo(4, -122);
    ctx.quadraticCurveTo(6, -145, 14, -148);
    ctx.stroke();

    ctx.restore();
  }

  /* ============================================================================
   * A03: MALAYAN TAPIR (Tapirus indicus)
   * ========================================================================== */
  function drawMalayanTapirRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#141619';
    const darkLight = '#4f565e';
    const darkMid = '#2f353b';
    const darkDeep = '#1b1f24';
    const saddleLight = '#ffffff';
    const saddleMid = '#e6ecef';
    const saddleDark = '#c8d2d9';
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

    drawSculptedPawLimb(ctx, -82, 74, pose.hindFarAngle * 0.45, 112, 48, darkLight, darkMid, darkDeep, outline, {
      pawTipColor: '#e0d6c8',
    });
    drawSculptedPawLimb(
      ctx,
      56,
      70,
      pose.farFlipperAngle * 0.42 - 0.06 - 0.46 * farGestureAmt,
      116,
      48,
      darkLight,
      darkMid,
      darkDeep,
      outline,
      { pawTipColor: '#e0d6c8' },
    );

    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);
    const torso = new Path2D();
    torso.ellipse(-34, 40, 146, 92, 0.04, 0, Math.PI * 2);
    fillRimAndStroke(ctx, torso, -140, -45, 72, 128, darkLight, darkMid, darkDeep, outline, 3.6);

    ctx.save();
    ctx.clip(torso);
    const saddle = new Path2D();
    saddle.moveTo(-134, -55);
    saddle.bezierCurveTo(-58, -60, -8, -52, -4, -44);
    saddle.bezierCurveTo(2, 12, -4, 92, -22, 140);
    saddle.lineTo(-132, 140);
    saddle.bezierCurveTo(-148, 76, -146, 0, -134, -55);
    saddle.closePath();
    fillRimAndStroke(ctx, saddle, -130, -48, -4, 130, saddleLight, saddleMid, saddleDark, outline, 3.2);
    ctx.restore();

    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(torso);

    // Embedded short tapir stub tail on rump
    drawEmbeddedTail(ctx, -178, 42, -204, 56 + pose.hindNearAngle * 12, 20, 6, darkLight, darkMid, darkDeep, outline);
    ctx.restore();

    drawSculptedPawLimb(ctx, -126, 72, pose.hindNearAngle * 0.45, 114, 54, darkLight, darkMid, darkDeep, outline, {
      pawTipColor: '#e0d6c8',
    });

    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    drawSculptedPawLimb(
      ctx,
      10,
      68,
      pose.nearFlipperAngle * (0.42 + 0.2 * waveAmt) + 0.04 - 0.5 * waveAmt - 0.22 * pose.nearFlipperTuckAmount,
      118,
      50,
      darkLight,
      darkMid,
      darkDeep,
      outline,
      { pawTipColor: '#e0d6c8' },
    );

    ctx.save();
    ctx.translate(48 + pose.headX, -32 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    for (const [ex, ey, rot] of [
      [-76, -98, -0.35],
      [76, -86, 0.38],
    ] as const) {
      ctx.save();
      ctx.translate(ex + lookX * 0.3, ey + lookY * 0.3);
      ctx.rotate(rot);
      const earP = new Path2D();
      earP.ellipse(0, 0, 26, 36, 0, 0, Math.PI * 2);
      fillRimAndStroke(ctx, earP, 0, -36, 0, 36, darkLight, darkMid, darkDeep, outline, 3.4);
      ctx.save();
      ctx.clip(earP);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.stroke(earP);
      ctx.fillStyle = '#e8a5b2';
      drawOvalSpot(ctx, 0, 6, 13, 18, 0);
      ctx.restore();
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = outline;
      ctx.stroke(earP);
      ctx.restore();
    }

    // Unified Continuous Tapir Head + Arched Flexible Proboscis Snout (zero separate snout patch!)
    const headP = new Path2D();
    headP.moveTo(0, -112);
    headP.bezierCurveTo(64, -110, 104, -64, 108, -14);
    headP.bezierCurveTo(118 + lookX * 0.4, 2 + lookY * 0.3, 134 + lookX * 0.6, 18 + lookY * 0.5, 126 + lookX * 0.6, 40 + lookY * 0.5);
    headP.bezierCurveTo(118 + lookX * 0.5, 58 + lookY * 0.5, 88 + lookX * 0.3, 56 + lookY * 0.3, 74, 52);
    headP.bezierCurveTo(54, 86, 14, 94, -12, 90);
    headP.bezierCurveTo(-78, 84, -112, 44, -106, -18);
    headP.bezierCurveTo(-100, -78, -54, -114, 0, -112);
    headP.closePath();
    fillRimAndStroke(ctx, headP, -60, -110, 80, 90, darkLight, darkMid, darkDeep, outline, 3.7);

    ctx.save();
    ctx.clip(headP);
    drawSoftCheekBlushes(ctx, -56 + lookX * 0.8, 22 + lookY * 0.8, 62 + lookX * 0.8, 28 + lookY * 0.8, 24, 14, pose.blushAlpha);
    ctx.restore();

    // Proboscis tip nostril pad seamlessly on the continuous snout tip
    ctx.fillStyle = '#f48fb1';
    drawOvalSpot(ctx, 112 + lookX * 0.55, 34 + lookY * 0.45, 8, 9, 0.2);
    ctx.fillStyle = outline;
    drawOvalSpot(ctx, 110 + lookX * 0.55, 33 + lookY * 0.45, 3.2, 4.2, 0.15);
    drawOvalSpot(ctx, 116 + lookX * 0.55, 36 + lookY * 0.45, 3.2, 4.2, 0.25);

    drawExpressiveAnimalMouth(ctx, 16 + lookX, 54 + lookY, 0.76, 0.08, pose, outline);

    // Big, soulful, expressive Malayan Tapir eyes (20x23 left, 17x20 right) per user evaluation
    drawGlossyAnimalEye(ctx, 'left', -44 + lookX * 0.85, -18 + lookY * 0.85, 20, 23, -0.08, pose, IRIS_PALETTES.warmBrown, darkLight, darkMid, outline);
    drawGlossyAnimalEye(ctx, 'right', 56 + lookX * 0.85, -12 + lookY * 0.85, 17, 20, 0.12, pose, IRIS_PALETTES.warmBrown, darkLight, darkMid, outline);
    drawExpressiveAnimalBrows(ctx, -44 + lookX * 0.85, -48 + lookY * 0.85, 56 + lookX * 0.85, -40 + lookY * 0.85, 30, pose, '#8b95a1', 3.8);

    ctx.restore();
  }

  /* ============================================================================
   * A04, A09, A10, A13: PRIMATES (Distinct anatomical silhouettes per species!)
   * ========================================================================== */
  function drawPrimateRig(
    ctx: CanvasRenderingContext2D,
    pose: TurtlePose,
    species: 'orangutan' | 'macaque' | 'dusky' | 'langur',
  ): void {
    const pal = {
      orangutan: {
        outline: '#2b1206',
        cLight: '#f57f29',
        cMid: '#d95614',
        cDark: '#9e3608',
        faceLight: '#f7cfa6',
        faceDark: '#d99e6c',
        belly: '#e87a38',
        iris: IRIS_PALETTES.warmBrown,
        hasTail: false,
        headScaleX: 1.06,
        headScaleY: 1.0,
        torsoRx: 128,
        torsoRy: 94,
        eyeRx: 12,
        eyeRy: 14,
      },
      macaque: {
        outline: '#261b10',
        cLight: '#c79b63',
        cMid: '#9c713e',
        cDark: '#6e4c24',
        faceLight: '#f5cfa8',
        faceDark: '#d49d6e',
        belly: '#ebd6b7',
        iris: IRIS_PALETTES.amberGold,
        hasTail: true,
        headScaleX: 0.86,
        headScaleY: 0.94,
        torsoRx: 112,
        torsoRy: 84,
        eyeRx: 16,
        eyeRy: 19,
      },
      dusky: {
        outline: '#171a1f',
        cLight: '#7a8391',
        cMid: '#525a66',
        cDark: '#323740',
        faceLight: '#3b4047',
        faceDark: '#262a30',
        belly: '#c2ccd9',
        iris: IRIS_PALETTES.warmBrown,
        hasTail: true,
        headScaleX: 0.96,
        headScaleY: 0.96,
        torsoRx: 118,
        torsoRy: 90,
        eyeRx: 20,
        eyeRy: 23,
      },
      langur: {
        outline: '#0d0f14',
        cLight: '#383d47',
        cMid: '#1e2229',
        cDark: '#0f1217',
        faceLight: '#2b3038',
        faceDark: '#171a20',
        belly: '#f5f8fc',
        iris: IRIS_PALETTES.warmBrown,
        hasTail: true,
        headScaleX: 0.92,
        headScaleY: 0.95,
        torsoRx: 114,
        torsoRy: 88,
        eyeRx: 18,
        eyeRy: 21,
      },
    }[species];

    // 1. Far Hind & Far Front Limbs (Permanently socketed behind torso, turning right on emotes or reaching overhead when climbing!)
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
    const climbFrontShoulderY = currentAnimalClimbing ? 34 : 70;
    const climbArmLen = currentAnimalClimbing
      ? species === 'orangutan'
        ? 144
        : 126
      : species === 'orangutan'
        ? 124
        : 116;
    drawSculptedPawLimb(
      ctx,
      -74,
      currentAnimalClimbing ? 62 : 74,
      pose.hindFarAngle * (currentAnimalClimbing ? 0.85 : 0.45),
      112,
      46,
      pal.cMid,
      pal.cDark,
      pal.cDark,
      pal.outline,
      {
        pawTipColor: pal.faceDark,
      },
    );
    drawSculptedPawLimb(
      ctx,
      currentAnimalClimbing ? 60 : 52,
      climbFrontShoulderY,
      pose.farFlipperAngle * (currentAnimalClimbing ? 0.88 : 0.42) - 0.06 - 0.48 * farGestureAmt,
      climbArmLen,
      species === 'orangutan' ? 52 : 46,
      pal.cLight,
      pal.cMid,
      pal.cDark,
      pal.outline,
      { pawTipColor: pal.faceDark },
    );

    // 2. Species-Distinct Torso (upper-chest patch kept above front leg socket so zero leg color jump occurs!)
    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);
    const torso = new Path2D();
    torso.ellipse(-28, 40, pal.torsoRx, pal.torsoRy, 0.06, 0, Math.PI * 2);
    fillRimAndStroke(ctx, torso, -120, -48, 68, 128, pal.cLight, pal.cMid, pal.cDark, pal.outline, 3.6);
    ctx.save();
    ctx.clip(torso);
    if (species === 'langur') {
      ctx.fillStyle = '#ffffff';
      drawOvalSpot(ctx, 48, 18, 22, 34, -0.08);
    } else if (species === 'dusky') {
      ctx.fillStyle = pal.belly;
      drawOvalSpot(ctx, 46, 20, 28, 34, -0.08);
    } else {
      ctx.fillStyle = pal.belly;
      drawOvalSpot(ctx, 46, 18, 26, 32, -0.08);
    }
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = pal.outline;
    ctx.stroke(torso);

    // 3. Species-specific Embedded Tail with aligned fill/stroke root so zero unstroked fill protrudes!
    if (pal.hasTail) {
      ctx.save();
      const tailBaseX = -28 - pal.torsoRx + 2;
      ctx.translate(tailBaseX, 44);
      ctx.rotate(pose.hindNearAngle * 0.4 + Math.sin(pose.waveRaysPhase * 0.7) * 0.08);
      const isLongMacaque = species === 'macaque';
      const tailFill = new Path2D();
      const tailOpen = new Path2D();
      if (isLongMacaque) {
        tailFill.moveTo(6, -12);
        tailFill.bezierCurveTo(-44, -10, -124, -60, -152, -148);
        tailFill.bezierCurveTo(-162, -184, -194, -174, -184, -140);
        tailFill.bezierCurveTo(-150, -44, -58, 18, 6, 12);
        tailFill.closePath();
        tailOpen.moveTo(6, -12);
        tailOpen.bezierCurveTo(-44, -10, -124, -60, -152, -148);
        tailOpen.bezierCurveTo(-162, -184, -194, -174, -184, -140);
        tailOpen.bezierCurveTo(-150, -44, -58, 18, 6, 12);
      } else {
        tailFill.moveTo(6, -12);
        tailFill.bezierCurveTo(-38, -8, -104, -58, -116, -120);
        tailFill.bezierCurveTo(-124, -154, -158, -146, -152, -116);
        tailFill.bezierCurveTo(-134, -42, -56, 14, 6, 12);
        tailFill.closePath();
        tailOpen.moveTo(6, -12);
        tailOpen.bezierCurveTo(-38, -8, -104, -58, -116, -120);
        tailOpen.bezierCurveTo(-124, -154, -158, -146, -152, -116);
        tailOpen.bezierCurveTo(-134, -42, -56, 14, 6, 12);
      }
      fillRimAndStroke(ctx, tailFill, 6, 12, -145, -155, pal.cMid, pal.cLight, pal.cMid, pal.outline, 3.4, tailOpen);
      ctx.restore();
    }
    ctx.restore();

    // 4. Near Hind Leg & Near Front Leg
    drawSculptedPawLimb(
      ctx,
      -112,
      currentAnimalClimbing ? 58 : 72,
      pose.hindNearAngle * (currentAnimalClimbing ? 0.85 : 0.45),
      114,
      50,
      pal.cLight,
      pal.cMid,
      pal.cDark,
      pal.outline,
      {
        pawTipColor: pal.faceDark,
        stripesColor: species === 'langur' ? '#ffffff' : undefined,
      },
    );

    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    drawSculptedPawLimb(
      ctx,
      currentAnimalClimbing ? 18 : 8,
      currentAnimalClimbing ? 32 : 68,
      pose.nearFlipperAngle * ((currentAnimalClimbing ? 0.88 : 0.42) + 0.2 * waveAmt) +
        0.04 -
        0.52 * waveAmt -
        0.24 * pose.nearFlipperTuckAmount,
      climbArmLen + 2,
      species === 'orangutan' ? 52 : 46,
      pal.cLight,
      pal.cMid,
      pal.cDark,
      pal.outline,
      { pawTipColor: pal.faceLight },
    );

    // 5. Primate Head & Species-Specific Facial Architecture
    ctx.save();
    ctx.translate(40 + pose.headX, -42 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX * pal.headScaleX, pose.headScaleY * pal.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    // Ears
    for (const [ex, ey] of [
      [-98, -14],
      [102, -4],
    ] as const) {
      ctx.save();
      ctx.translate(ex + lookX * 0.3, ey + lookY * 0.3);
      const earP = new Path2D();
      if (species === 'macaque') {
        earP.moveTo(0, -28);
        earP.quadraticCurveTo(28, -18, 22, 18);
        earP.quadraticCurveTo(0, 28, -20, 12);
        earP.closePath();
      } else {
        earP.arc(0, 0, 26, 0, Math.PI * 2);
      }
      fillRimAndStroke(ctx, earP, 0, -26, 0, 26, pal.faceLight, pal.faceDark, pal.cDark, pal.outline, 3.4);
      ctx.restore();
    }

    if (species === 'dusky' || species === 'langur') {
      const crestP = new Path2D();
      crestP.moveTo(-42, -96);
      crestP.quadraticCurveTo(-12, -152, 4, -156);
      crestP.quadraticCurveTo(22, -148, 48, -94);
      crestP.closePath();
      fillRimAndStroke(
        ctx,
        crestP,
        0,
        -154,
        0,
        -94,
        species === 'dusky' ? '#e2e8f0' : '#4a5260',
        species === 'dusky' ? '#b8c2d0' : '#262b33',
        pal.cDark,
        pal.outline,
        3.3,
      );
    }

    const headP = new Path2D();
    if (species === 'orangutan') {
      headP.moveTo(4, -116);
      headP.bezierCurveTo(68, -116, 118, -56, 126, 12);
      headP.bezierCurveTo(132, 68, 76, 102, 4, 100);
      headP.bezierCurveTo(-72, 100, -126, 66, -120, 8);
      headP.bezierCurveTo(-114, -58, -64, -116, 4, -116);
      headP.closePath();
    } else if (species === 'macaque') {
      headP.moveTo(4, -122);
      headP.bezierCurveTo(66, -120, 102, -66, 114, -4);
      headP.bezierCurveTo(126, 26, 98, 72, 54, 92);
      headP.bezierCurveTo(18, 108, -18, 106, -54, 90);
      headP.bezierCurveTo(-102, 68, -124, 22, -108, -8);
      headP.bezierCurveTo(-96, -68, -60, -122, 4, -122);
      headP.closePath();
    } else {
      headP.arc(4, -14, 104, 0, Math.PI * 2);
    }
    fillRimAndStroke(ctx, headP, -60, -115, 50, 95, pal.cLight, pal.cMid, pal.cDark, pal.outline, 3.7);

    ctx.save();
    ctx.clip(headP);
    if (species === 'dusky') {
      ctx.fillStyle = '#d0d8e4';
      drawOvalSpot(ctx, 4, -92, 86, 36, 0);
    } else if (species === 'langur') {
      ctx.fillStyle = '#eef2f7';
      drawOvalSpot(ctx, -86, 18, 30, 52, -0.2);
      drawOvalSpot(ctx, 94, 24, 28, 48, 0.2);
    } else if (species === 'macaque') {
      ctx.fillStyle = '#e8d4b4';
      drawOvalSpot(ctx, -84, 22, 34, 42, -0.25);
      drawOvalSpot(ctx, 90, 26, 32, 40, 0.25);
      ctx.fillStyle = '#4a3216';
      const peak = new Path2D();
      peak.moveTo(-64, -96);
      peak.quadraticCurveTo(8, -52, 16 + lookX * 0.4, -42 + lookY * 0.4);
      peak.quadraticCurveTo(32, -54, 78, -92);
      peak.lineTo(78, -125);
      peak.lineTo(-64, -125);
      peak.closePath();
      ctx.fill(peak);
    }

    ctx.fillStyle = pal.faceLight;
    drawOvalSpot(ctx, -28 + lookX * 0.6, -16 + lookY * 0.6, 40, 38, -0.1);
    drawOvalSpot(ctx, 64 + lookX * 0.6, -6 + lookY * 0.6, 36, 34, 0.1);
    drawOvalSpot(ctx, 18 + lookX * 0.8, 38 + lookY * 0.8, 62, 42, 0.05);

    if (species === 'dusky') {
      ctx.fillStyle = '#ffffff';
      drawOvalSpot(ctx, -38 + lookX * 0.8, -16 + lookY * 0.8, 34, 36, -0.08);
      drawOvalSpot(ctx, 68 + lookX * 0.8, -4 + lookY * 0.8, 30, 32, 0.1);
      drawOvalSpot(ctx, 18 + lookX * 0.85, 44 + lookY * 0.85, 48, 32, 0.05);
    } else if (species === 'langur') {
      ctx.fillStyle = '#cfd6e0';
      drawOvalSpot(ctx, -38 + lookX * 0.8, -16 + lookY * 0.8, 28, 30, -0.08);
      drawOvalSpot(ctx, 68 + lookX * 0.8, -4 + lookY * 0.8, 25, 27, 0.1);
    }

    drawSoftCheekBlushes(ctx, -56 + lookX * 0.8, 22 + lookY * 0.8, 82 + lookX * 0.8, 30 + lookY * 0.8, 26, 15, pose.blushAlpha);
    ctx.restore();

    ctx.lineWidth = 3.7;
    ctx.strokeStyle = pal.outline;
    ctx.stroke(headP);

    drawExpressiveAnimalMouth(ctx, 18 + lookX, 44 + lookY, 0.82, 0.08, pose, pal.outline);

    ctx.fillStyle = pal.outline;
    drawOvalSpot(ctx, 14 + lookX, 14 + lookY, 5, 7, -0.2);
    drawOvalSpot(ctx, 28 + lookX, 15 + lookY, 5, 7, 0.2);

    drawGlossyAnimalEye(ctx, 'left', -38 + lookX * 0.85, -16 + lookY * 0.85, pal.eyeRx, pal.eyeRy, -0.1, pose, pal.iris, pal.faceLight, pal.faceDark, pal.outline);
    drawGlossyAnimalEye(ctx, 'right', 68 + lookX * 0.85, -4 + lookY * 0.85, pal.eyeRx - 3, pal.eyeRy - 3, 0.14, pose, pal.iris, pal.faceLight, pal.faceDark, pal.outline);
    drawExpressiveAnimalBrows(ctx, -38 + lookX * 0.85, -46 + lookY * 0.85, 68 + lookX * 0.85, -34 + lookY * 0.85, 30, pose, pal.outline, 4.0);

    if (species === 'orangutan') {
      ctx.strokeStyle = pal.outline;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-14, -114);
      ctx.quadraticCurveTo(-6, -142, 8, -144);
      ctx.moveTo(6, -114);
      ctx.quadraticCurveTo(18, -140, 30, -136);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ============================================================================
   * A05: SUN BEAR (Helarctos malayanus)
   * ========================================================================== */
  function drawSunBearRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#120d0a';
    const cLight = '#4a3d36';
    const cMid = '#2b221e';
    const cDark = '#171210';
    const tanLight = '#f7d6ad';
    const tanDark = '#cf9863';
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

    drawSculptedPawLimb(ctx, -76, 74, pose.hindFarAngle * 0.45, 112, 52, cLight, cMid, cDark, outline, {
      pawPadColor: '#f4a29d',
      clawsColor: '#e8dec8',
    });
    drawSculptedPawLimb(
      ctx,
      54,
      70,
      pose.farFlipperAngle * 0.42 - 0.06 - 0.48 * farGestureAmt,
      116,
      52,
      cLight,
      cMid,
      cDark,
      outline,
      {
        pawPadColor: '#f4a29d',
        clawsColor: '#e8dec8',
      },
    );

    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);
    const torso = new Path2D();
    torso.ellipse(-32, 42, 134, 92, 0.04, 0, Math.PI * 2);
    fillRimAndStroke(ctx, torso, -120, -45, 65, 130, cLight, cMid, cDark, outline, 3.6);

    ctx.save();
    ctx.clip(torso);
    const sunCrest = new Path2D();
    sunCrest.moveTo(-36, 10);
    sunCrest.quadraticCurveTo(14, 38, 54, 12);
    sunCrest.quadraticCurveTo(70, 24, 52, 56);
    sunCrest.quadraticCurveTo(14, 92, -38, 52);
    sunCrest.closePath();
    fillRimAndStroke(ctx, sunCrest, -36, 10, 52, 85, '#ffe57f', '#ffb300', '#e65100', outline, 2.8);
    ctx.restore();

    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(torso);

    // Cute round bear stub tail seamlessly embedded on rump
    drawEmbeddedTail(ctx, -162, 42, -186, 52 + pose.hindNearAngle * 10, 24, 4, cLight, cMid, cDark, outline);
    ctx.restore();

    drawSculptedPawLimb(ctx, -116, 72, pose.hindNearAngle * 0.45, 114, 58, cLight, cMid, cDark, outline, {
      pawPadColor: '#f4a29d',
      clawsColor: '#e8dec8',
    });

    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    drawSculptedPawLimb(
      ctx,
      10,
      68,
      pose.nearFlipperAngle * (0.42 + 0.2 * waveAmt) + 0.04 - 0.52 * waveAmt - 0.24 * pose.nearFlipperTuckAmount,
      118,
      54,
      cLight,
      cMid,
      cDark,
      outline,
      {
        pawPadColor: '#f4a29d',
        clawsColor: '#e8dec8',
      },
    );

    ctx.save();
    ctx.translate(42 + pose.headX, -38 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    for (const [ex, ey] of [
      [-86, -86],
      [88, -74],
    ] as const) {
      ctx.save();
      ctx.translate(ex + lookX * 0.3, ey + lookY * 0.3);
      const earP = new Path2D();
      earP.arc(0, 0, 26, 0, Math.PI * 2);
      fillRimAndStroke(ctx, earP, 0, -26, 0, 26, cLight, cMid, cDark, outline, 3.5);
      ctx.fillStyle = tanDark;
      drawOvalSpot(ctx, 0, 2, 13, 13, 0);
      ctx.restore();
    }

    const headP = new Path2D();
    headP.ellipse(4, -10, 110, 94, 0.04, 0, Math.PI * 2);
    fillRimAndStroke(ctx, headP, -80, -105, 60, 85, cLight, cMid, cDark, outline, 3.7);

    ctx.save();
    ctx.clip(headP);
    const muzzleP = new Path2D();
    muzzleP.ellipse(20 + lookX * 0.8, 26 + lookY * 0.8, 54, 42, 0.06, 0, Math.PI * 2);
    const mGrad = ctx.createLinearGradient(20, -15, 20, 70);
    mGrad.addColorStop(0, tanLight);
    mGrad.addColorStop(1, tanDark);
    ctx.fillStyle = mGrad;
    ctx.fill(muzzleP);

    drawSoftCheekBlushes(ctx, -58 + lookX * 0.8, 22 + lookY * 0.8, 84 + lookX * 0.8, 30 + lookY * 0.8, 26, 15, pose.blushAlpha);
    ctx.restore();

    ctx.lineWidth = 3.7;
    ctx.strokeStyle = outline;
    ctx.stroke(headP);

    drawExpressiveAnimalMouth(ctx, 20 + lookX, 42 + lookY, 0.82, 0.08, pose, outline);

    ctx.fillStyle = '#1a120e';
    drawOvalSpot(ctx, 24 + lookX, 8 + lookY, 18, 13, 0.06);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    drawOvalSpot(ctx, 18 + lookX, 4 + lookY, 6, 3.5, -0.1);

    // Small, authentic Sun Bear eyes (11.5x13.5 left, 10x12 right)
    drawGlossyAnimalEye(ctx, 'left', -38 + lookX * 0.85, -16 + lookY * 0.85, 11.5, 13.5, -0.1, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
    drawGlossyAnimalEye(ctx, 'right', 70 + lookX * 0.85, -6 + lookY * 0.85, 10, 12, 0.14, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
    drawExpressiveAnimalBrows(ctx, -38 + lookX * 0.85, -38 + lookY * 0.85, 70 + lookX * 0.85, -28 + lookY * 0.85, 24, pose, tanLight, 3.6);

    ctx.restore();
  }

  /* ============================================================================
   * A06: SUNDA PANGOLIN (Manis javanica)
   * ========================================================================== */
  function drawPangolinArtichokeScale(
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
    void cLight;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const sp = new Path2D();
    sp.moveTo(-w * 0.5, 0);
    sp.quadraticCurveTo(-w * 0.4, h * 0.72, 0, h);
    sp.quadraticCurveTo(w * 0.4, h * 0.72, w * 0.5, 0);
    sp.quadraticCurveTo(0, -h * 0.25, -w * 0.5, 0);
    sp.closePath();
    const grad = ctx.createLinearGradient(0, -h * 0.2, 0, h);
    grad.addColorStop(0, cDark);
    grad.addColorStop(0.55, cMid);
    grad.addColorStop(1, cLight);
    ctx.fillStyle = grad;
    ctx.fill(sp);
    ctx.strokeStyle = 'rgba(255,235,190,0.45)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.1);
    ctx.lineTo(0, h * 0.85);
    ctx.stroke();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.2;
    ctx.stroke(sp);
    ctx.restore();
  }

  function drawSundaPangolinRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#2b180a';
    const scaleLight = '#eab66a';
    const scaleMid = '#ba7a2d';
    const scaleDark = '#75440e';
    const skinLight = '#f5d2b3';
    const skinDark = '#cfa07a';

    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
    drawSculptedPawLimb(ctx, -74, 74, pose.hindFarAngle * 0.45, 112, 46, scaleLight, scaleMid, scaleDark, outline, {
      clawsColor: '#fff5e0',
    });
    drawSculptedPawLimb(
      ctx,
      50,
      70,
      pose.farFlipperAngle * 0.42 - 0.06 - 0.46 * farGestureAmt,
      116,
      44,
      skinLight,
      skinDark,
      scaleMid,
      outline,
      { clawsColor: '#fff5e0' },
    );

    // 1. Armored Torso + Continuous Embedded Armored Prehensile Tail
    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    const torso = new Path2D();
    torso.ellipse(-30, 38, 132, 86, 0.06, 0, Math.PI * 2);
    fillRimAndStroke(ctx, torso, -120, -45, 55, 125, scaleLight, scaleMid, scaleDark, outline, 3.6);

    ctx.save();
    ctx.clip(torso);
    ctx.fillStyle = skinLight;
    drawOvalSpot(ctx, 58, 22, 28, 30, -0.08);
    for (let row = -2; row <= 1; row++) {
      for (let col = -3; col <= 2; col++) {
        const sx = col * 32 + (row % 2) * 16 - 26;
        const sy = row * 22 - 4;
        drawPangolinArtichokeScale(ctx, sx, sy, 32, 26, 1.45, scaleLight, scaleMid, scaleDark, outline);
      }
    }
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(torso);

    // Draw Embedded Armored Tail AFTER torso with aligned fill/stroke root!
    drawEmbeddedTail(
      ctx,
      -156,
      44,
      pose.hindNearAngle * 0.4 + Math.sin(pose.waveRaysPhase * 0.6) * 0.06,
      132,
      52,
      14,
      36,
      scaleLight,
      scaleMid,
      scaleDark,
      outline,
      (tCtx) => {
        for (let i = 0; i < 5; i++) {
          const tx = -12 - i * 22;
          const ty = 2 + i * 7;
          drawPangolinArtichokeScale(tCtx, tx, ty, 24 - i * 2, 22 - i * 1.5, 1.35, scaleLight, scaleMid, scaleDark, outline);
        }
      },
    );
    ctx.restore();

    drawSculptedPawLimb(ctx, -112, 72, pose.hindNearAngle * 0.45, 114, 52, scaleLight, scaleMid, scaleDark, outline, {
      clawsColor: '#fff5e0',
    });

    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    drawSculptedPawLimb(
      ctx,
      8,
      68,
      pose.nearFlipperAngle * (0.42 + 0.2 * waveAmt) + 0.04 - 0.5 * waveAmt - 0.22 * pose.nearFlipperTuckAmount,
      118,
      46,
      scaleLight,
      scaleMid,
      scaleDark,
      outline,
      { clawsColor: '#fff5e0' },
    );

    // 3. Sharp Conical Pangolin Head
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

    fillRimAndStroke(ctx, headFill, -85, -80, 90, 60, skinLight, skinDark, scaleMid, outline, 3.6);

    ctx.save();
    ctx.clip(headFill);
    for (let i = 0; i < 4; i++) {
      drawPangolinArtichokeScale(
        ctx,
        -52 + i * 26,
        -46 + i * 10,
        28 - i * 2,
        22 - i * 1.5,
        1.25,
        scaleLight,
        scaleMid,
        scaleDark,
        outline,
      );
    }
    drawSoftCheekBlushes(ctx, -28 + lookX * 0.8, 22 + lookY * 0.8, 62 + lookX * 0.8, 26 + lookY * 0.8, 20, 12, pose.blushAlpha);
    ctx.restore();

    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(headFill);

    drawExpressiveAnimalMouth(ctx, 46 + lookX * 0.7, 36 + lookY * 0.7, 0.64, 0.12, pose, outline);

    ctx.fillStyle = '#3d2214';
    drawOvalSpot(ctx, 118 + lookX * 0.5, 24 + lookY * 0.5, 10, 8, 0.25);

    // Realistic small pangolin eyes (10.5x12.5 left, 9x11 right)
    drawGlossyAnimalEye(ctx, 'left', -18 + lookX * 0.75, -6 + lookY * 0.75, 10.5, 12.5, -0.06, pose, IRIS_PALETTES.warmBrown, skinLight, skinDark, outline);
    drawGlossyAnimalEye(ctx, 'right', 54 + lookX * 0.75, 2 + lookY * 0.75, 9, 11, 0.1, pose, IRIS_PALETTES.warmBrown, skinLight, skinDark, outline);
    drawExpressiveAnimalBrows(ctx, -18 + lookX * 0.75, -26 + lookY * 0.75, 54 + lookX * 0.75, -18 + lookY * 0.75, 20, pose, outline, 3.2);

    ctx.restore();
  }

  /* ============================================================================
   * A07 & A08: SAMBAR DEER & GREATER MOUSEDEER (Kancil)
   * ========================================================================== */
  function drawCervidRig(ctx: CanvasRenderingContext2D, pose: TurtlePose, hasAntlers: boolean): void {
    const outline = '#261408';
    const cLight = hasAntlers ? '#d9914c' : '#f0a854';
    const cMid = hasAntlers ? '#a66229' : '#c47425';
    const cDark = hasAntlers ? '#6e3b12' : '#874810';
    const cream = '#fff8eb';
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

    const legThick = hasAntlers ? 42 : 34;

    drawSculptedPawLimb(ctx, hasAntlers ? -80 : -74, 74, pose.hindFarAngle * 0.45, 112, legThick, cMid, cDark, '#592e0d', outline, {
      hoofColor: '#2b1b10',
    });
    drawSculptedPawLimb(
      ctx,
      hasAntlers ? 56 : 52,
      70,
      pose.farFlipperAngle * 0.42 - 0.06 - 0.46 * farGestureAmt,
      116,
      legThick,
      cLight,
      cMid,
      cDark,
      outline,
      { hoofColor: '#2b1b10' },
    );

    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    const torsoRx = hasAntlers ? 142 : 118;
    const torsoRy = hasAntlers ? 90 : 78;
    const torso = new Path2D();
    torso.ellipse(-32, 40, torsoRx, torsoRy, hasAntlers ? 0.04 : -0.1, 0, Math.PI * 2);
    fillRimAndStroke(ctx, torso, -135, -45, 70, 125, cLight, cMid, cDark, outline, 3.5);
    ctx.save();
    ctx.clip(torso);
    ctx.fillStyle = cream;
    drawOvalSpot(ctx, 58, 18, 28, 32, -0.08);
    if (!hasAntlers) {
      ctx.strokeStyle = cream;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(22, -8);
      ctx.lineTo(66, 22);
      ctx.moveTo(18, 10);
      ctx.lineTo(62, 38);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 248, 225, 0.85)';
    for (const [sx, sy] of [
      [-92, 16],
      [-64, 6],
      [-36, 18],
      [-78, 38],
      [-48, 42],
    ]) {
      drawOvalSpot(ctx, sx, sy, 7, 5, 0.1);
    }
    ctx.restore();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = outline;
    ctx.stroke(torso);

    // Short perky deer tail with aligned fill/stroke root so zero unstroked fill protrudes!
    ctx.save();
    ctx.translate(-32 - torsoRx + 4, 24);
    ctx.rotate(pose.hindNearAngle * 0.45);
    const tailFill = new Path2D();
    tailFill.moveTo(4, 10);
    tailFill.quadraticCurveTo(-28, -26, -12, -46);
    tailFill.quadraticCurveTo(18, -32, 8, -2);
    tailFill.closePath();
    const tailOpen = new Path2D();
    tailOpen.moveTo(4, 10);
    tailOpen.quadraticCurveTo(-28, -26, -12, -46);
    tailOpen.quadraticCurveTo(18, -32, 8, -2);
    fillRimAndStroke(ctx, tailFill, 6, 10, -25, -45, cMid, cLight, cMid, outline, 3.2, tailOpen);
    ctx.restore();
    ctx.restore();

    // Near Hind & Near Front Legs
    drawSculptedPawLimb(ctx, hasAntlers ? -122 : -114, 72, pose.hindNearAngle * 0.45, 114, legThick + 4, cLight, cMid, cDark, outline, {
      hoofColor: '#2b1b10',
    });

    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    drawSculptedPawLimb(
      ctx,
      hasAntlers ? 12 : 10,
      68,
      pose.nearFlipperAngle * (0.42 + 0.2 * waveAmt) + 0.04 - 0.5 * waveAmt - 0.22 * pose.nearFlipperTuckAmount,
      118,
      legThick + 2,
      cLight,
      cMid,
      cDark,
      outline,
      { hoofColor: '#2b1b10' },
    );

    ctx.save();
    ctx.translate((hasAntlers ? 48 : 44) + pose.headX, -42 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    if (hasAntlers) {
      ctx.strokeStyle = '#6e4726';
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(dir * 32, -88);
        ctx.quadraticCurveTo(dir * 64, -148, dir * 44, -190);
        ctx.moveTo(dir * 46, -134);
        ctx.lineTo(dir * 82, -154);
        ctx.moveTo(dir * 38, -112);
        ctx.lineTo(dir * 16, -142);
        ctx.stroke();
      }
    }

    for (const [ex, ey, rot] of [
      [-86, -78, -0.55],
      [88, -68, 0.58],
    ] as const) {
      ctx.save();
      ctx.translate(ex + lookX * 0.3, ey + lookY * 0.3);
      ctx.rotate(rot);
      const earP = new Path2D();
      earP.ellipse(0, 0, 22, 44, 0, 0, Math.PI * 2);
      fillRimAndStroke(ctx, earP, 0, -44, 0, 44, cLight, cMid, cDark, outline, 3.4);
      ctx.fillStyle = '#f2b6c1';
      drawOvalSpot(ctx, 0, 4, 11, 26, 0);
      ctx.restore();
    }

    const headP = new Path2D();
    headP.ellipse(6, -10, hasAntlers ? 100 : 92, hasAntlers ? 86 : 76, 0.05, 0, Math.PI * 2);
    fillRimAndStroke(ctx, headP, -75, -95, 55, 80, cLight, cMid, cDark, outline, 3.6);

    ctx.save();
    ctx.clip(headP);
    ctx.fillStyle = cream;
    drawOvalSpot(ctx, 22 + lookX * 0.8, 34 + lookY * 0.8, 48, 34, 0.06);
    drawSoftCheekBlushes(ctx, -52 + lookX * 0.8, 20 + lookY * 0.8, 78 + lookX * 0.8, 28 + lookY * 0.8, 26, 15, pose.blushAlpha);
    ctx.restore();

    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(headP);

    drawExpressiveAnimalMouth(ctx, 20 + lookX, 42 + lookY, 0.8, 0.08, pose, outline);
    ctx.fillStyle = '#24150c';
    drawOvalSpot(ctx, 26 + lookX, 12 + lookY, 15, 11, 0.06);

    // Expressive doe eyes: Sambar Deer (19x22 / 16x19) and Greater Mousedeer Kancil (21x24 / 18x21)
    drawGlossyAnimalEye(
      ctx,
      'left',
      -36 + lookX * 0.85,
      -16 + lookY * 0.85,
      hasAntlers ? 19 : 21,
      hasAntlers ? 22 : 24,
      -0.1,
      pose,
      hasAntlers ? IRIS_PALETTES.warmBrown : IRIS_PALETTES.emerald,
      cLight,
      cMid,
      outline,
    );
    drawGlossyAnimalEye(
      ctx,
      'right',
      66 + lookX * 0.85,
      -4 + lookY * 0.85,
      hasAntlers ? 16 : 18,
      hasAntlers ? 19 : 21,
      0.14,
      pose,
      hasAntlers ? IRIS_PALETTES.warmBrown : IRIS_PALETTES.emerald,
      cLight,
      cMid,
      outline,
    );
    drawExpressiveAnimalBrows(ctx, -36 + lookX * 0.85, -48 + lookY * 0.85, 66 + lookX * 0.85, -36 + lookY * 0.85, 30, pose, outline, 3.8);

    ctx.restore();
  }

  /* ============================================================================
   * A11: MALAYAN PORCUPINE (Hystrix brachyura)
   * ========================================================================== */
  function drawSharpPorcupineQuill(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    length: number,
    halfWidth: number,
    outline: string,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const qFill = new Path2D();
    qFill.moveTo(4, -halfWidth * 0.95);
    qFill.quadraticCurveTo(length * 0.52, -halfWidth * 0.92, length, 0);
    qFill.quadraticCurveTo(length * 0.52, halfWidth * 0.92, 4, halfWidth * 0.95);
    qFill.closePath();

    const qOpen = new Path2D();
    qOpen.moveTo(4, -halfWidth * 0.95);
    qOpen.quadraticCurveTo(length * 0.52, -halfWidth * 0.92, length, 0);
    qOpen.quadraticCurveTo(length * 0.52, halfWidth * 0.92, 4, halfWidth * 0.95);

    fillRimAndStroke(ctx, qFill, 4, -halfWidth, length, halfWidth, '#fffdf5', '#ede0c4', '#4a2e16', outline, 2.5, qOpen);
    ctx.save();
    ctx.clip(qFill);
    ctx.fillStyle = '#5c381c';
    ctx.fillRect(-10, -halfWidth * 1.5, length * 0.22, halfWidth * 3);
    ctx.fillStyle = '#1f1209';
    ctx.fillRect(length * 0.34, -halfWidth * 1.5, length * 0.34, halfWidth * 3);
    ctx.restore();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = outline;
    ctx.stroke(qOpen);
    ctx.restore();
  }

  function drawMalayanPorcupineRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#1f1209';
    const cLight = '#9e6b43';
    const cMid = '#6e4526';
    const cDark = '#472a14';

    // 1. Far Hind & Far Front Legs (permanently socketed behind torso, turning right on emotes)
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
    drawSculptedPawLimb(ctx, -68, 74, pose.hindFarAngle * 0.45, 112, 46, cMid, cDark, outline, outline, {
      clawsColor: '#f5ebd6',
      stripesColor: '#3b2210',
    });
    drawSculptedPawLimb(
      ctx,
      50,
      70,
      pose.farFlipperAngle * 0.42 - 0.06 - 0.46 * farGestureAmt,
      116,
      44,
      cLight,
      cMid,
      cDark,
      outline,
      {
        clawsColor: '#f5ebd6',
        stripesColor: '#472a14',
      },
    );

    // 2. Enlarged Porcupine Torso with coarse bristle texture & signature white nape collar
    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const qx = -122 + t * 58;
      const qy = 26 - Math.sin(t * Math.PI) * 32;
      const qAng = -2.75 + t * 0.55 + Math.sin(pose.waveRaysPhase + i * 0.6) * 0.025;
      const qLen = 148 + Math.sin(t * Math.PI) * 28;
      drawSharpPorcupineQuill(ctx, qx, qy, qAng, qLen, 7.5, outline);
    }

    const torso = new Path2D();
    torso.ellipse(-22, 44, 124, 88, 0.05, 0, Math.PI * 2);
    fillRimAndStroke(ctx, torso, -110, -40, 65, 130, cLight, cMid, cDark, outline, 3.6);
    ctx.save();
    ctx.clip(torso);
    ctx.strokeStyle = '#fff9eb';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(32, -2);
    ctx.quadraticCurveTo(48, 36, 30, 74);
    ctx.stroke();
    ctx.strokeStyle = '#3b2210';
    ctx.lineWidth = 2.4;
    for (const [bx, by] of [
      [-76, 48],
      [-46, 56],
      [-16, 62],
      [-62, 78],
      [-28, 84],
      [4, 86],
    ]) {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - 16, by + 6);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(torso);

    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const qx = -104 + t * 94;
      const qy = 8 - Math.sin(t * Math.PI) * 28 + (1 - t) * 14;
      const qAng = -2.62 + t * 0.52 + Math.sin(pose.waveRaysPhase + i * 0.5) * 0.025;
      const qLen = 132 - t * 28;
      drawSharpPorcupineQuill(ctx, qx, qy, qAng, qLen, 6.8, outline);
    }
    ctx.restore();

    // 3. Near Hind & Near Front Legs
    drawSculptedPawLimb(ctx, -108, 72, pose.hindNearAngle * 0.45, 114, 52, cLight, cMid, cDark, outline, {
      clawsColor: '#f5ebd6',
      stripesColor: '#472a14',
    });

    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    drawSculptedPawLimb(
      ctx,
      8,
      68,
      pose.nearFlipperAngle * (0.42 + 0.2 * waveAmt) + 0.04 - 0.5 * waveAmt - 0.22 * pose.nearFlipperTuckAmount,
      118,
      46,
      cLight,
      cMid,
      cDark,
      outline,
      {
        clawsColor: '#f5ebd6',
        stripesColor: '#472a14',
      },
    );

    // 4. Porcupine Head
    ctx.save();
    ctx.translate(42 + pose.headX, -32 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    const headP = new Path2D();
    headP.ellipse(6, -6, 102, 84, 0.05, 0, Math.PI * 2);
    fillRimAndStroke(ctx, headP, -75, -90, 55, 80, cLight, cMid, cDark, outline, 3.6);
    ctx.save();
    ctx.clip(headP);
    ctx.strokeStyle = '#472a14';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-58, 12);
    ctx.lineTo(-78, 18);
    ctx.moveTo(-52, 28);
    ctx.lineTo(-74, 34);
    ctx.stroke();
    drawSoftCheekBlushes(ctx, -52 + lookX * 0.8, 22 + lookY * 0.8, 76 + lookX * 0.8, 30 + lookY * 0.8, 24, 14, pose.blushAlpha);
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(headP);

    const crownQuills: Array<[number, number, number, number]> = [
      [28, -76, -2.18, 86],
      [10, -82, -2.26, 98],
      [-10, -84, -2.34, 112],
      [-30, -80, -2.42, 122],
      [-50, -72, -2.48, 128],
      [-68, -58, -2.54, 132],
      [-82, -40, -2.58, 128],
    ];
    for (let i = 0; i < crownQuills.length; i++) {
      const [cqx, cqy, cqAng, cqLen] = crownQuills[i];
      drawSharpPorcupineQuill(
        ctx,
        cqx,
        cqy,
        cqAng + Math.sin(pose.waveRaysPhase + i * 0.4) * 0.02,
        cqLen,
        6.2,
        outline,
      );
    }

    drawExpressiveAnimalMouth(ctx, 20 + lookX, 42 + lookY, 0.78, 0.08, pose, outline);
    ctx.fillStyle = '#331d10';
    drawOvalSpot(ctx, 24 + lookX, 12 + lookY, 15, 11, 0.08);

    // Realistic small rodent eyes (12x14 left, 10x12 right)
    drawGlossyAnimalEye(ctx, 'left', -36 + lookX * 0.85, -14 + lookY * 0.85, 12, 14, -0.1, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
    drawGlossyAnimalEye(ctx, 'right', 66 + lookX * 0.85, -4 + lookY * 0.85, 10, 12, 0.14, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
    drawExpressiveAnimalBrows(ctx, -36 + lookX * 0.85, -36 + lookY * 0.85, 66 + lookX * 0.85, -26 + lookY * 0.85, 24, pose, '#fff8eb', 3.5);
    ctx.restore();
  }

  /* ============================================================================
   * A12: MALAYAN FLYING FOX (Pteropus vampyrus)
   * ========================================================================== */
  function drawMalayanFlyingFoxRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#1a1114';
    const wingLight = '#543c47';
    const wingMid = '#36252d';
    const wingDark = '#1f1419';
    const furLight = '#e68a35';
    const furMid = '#ba5d18';
    const furDark = '#7d370a';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

    const drawWing = (side: -1 | 1) => {
      ctx.save();
      const isLeft = side === -1;
      // Phase 1: Near/rear wing (side === -1) lifts at a 120° rear-upper offset away from the +X facing direction
      const flap = isLeft
        ? 0.52 * waveAmt + pose.nearFlipperAngle * (0.4 + 0.18 * waveAmt)
        : -0.22 * farGestureAmt - pose.farFlipperAngle * 0.4;
      ctx.translate(side * 48, 12);
      ctx.scale(side, 1);
      ctx.rotate(flap);

      const wP = new Path2D();
      wP.moveTo(0, -18);
      wP.bezierCurveTo(68, -74, 148, -92, 198, -54);
      wP.quadraticCurveTo(164, -12, 174, 28);
      wP.quadraticCurveTo(124, 14, 118, 58);
      wP.quadraticCurveTo(64, 38, 12, 68);
      wP.closePath();
      fillRimAndStroke(ctx, wP, 0, -80, 190, 65, wingLight, wingMid, wingDark, outline, 3.5);

      ctx.strokeStyle = '#e8dec8';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(82, -62, 9, Math.PI * 0.8, Math.PI * 1.8);
      ctx.stroke();

      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(14, -22);
      ctx.quadraticCurveTo(96, -34, 172, 26);
      ctx.moveTo(14, -22);
      ctx.quadraticCurveTo(72, 6, 116, 56);
      ctx.stroke();
      ctx.restore();
    };

    drawWing(1);
    drawWing(-1);

    // Deeply embedded bat legs with walking gait
    drawSculptedPawLimb(ctx, -38, 96, pose.hindNearAngle * 0.42, 80, 32, '#36252d', '#1f1419', outline, outline, {
      clawsColor: '#e8dec8',
    });
    drawSculptedPawLimb(ctx, 28, 96, pose.hindFarAngle * 0.42, 80, 32, '#36252d', '#1f1419', outline, outline, {
      clawsColor: '#e8dec8',
    });

    const bodyP = new Path2D();
    bodyP.ellipse(0, 46, 80, 90, 0, 0, Math.PI * 2);
    fillRimAndStroke(ctx, bodyP, -65, -38, 65, 132, '#422c35', '#291a20', '#170e12', outline, 3.6);
    ctx.save();
    ctx.clip(bodyP);
    const mantleP = new Path2D();
    mantleP.ellipse(0, 10, 78, 56, 0, 0, Math.PI * 2);
    fillRimAndStroke(ctx, mantleP, -68, -42, 68, 62, furLight, furMid, furDark, outline, 2.8);
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(bodyP);

    ctx.save();
    ctx.translate(16 + pose.headX, -48 + pose.headY);
    ctx.rotate(pose.headRot);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    for (const [ex, ey, rot] of [
      [-68, -82, -0.35],
      [72, -76, 0.38],
    ] as const) {
      ctx.save();
      ctx.translate(ex + lookX * 0.3, ey + lookY * 0.3);
      ctx.rotate(rot);
      const earP = new Path2D();
      earP.moveTo(-22, 18);
      earP.quadraticCurveTo(0, -48, 22, 18);
      earP.closePath();
      fillRimAndStroke(ctx, earP, 0, -45, 0, 18, wingLight, wingMid, wingDark, outline, 3.4);
      ctx.restore();
    }

    const headP = new Path2D();
    headP.ellipse(4, -6, 94, 84, 0.04, 0, Math.PI * 2);
    fillRimAndStroke(ctx, headP, -70, -85, 60, 80, furLight, furMid, furDark, outline, 3.6);
    drawSoftCheekBlushes(ctx, -48 + lookX * 0.8, 20 + lookY * 0.8, 68 + lookX * 0.8, 26 + lookY * 0.8, 24, 14, pose.blushAlpha);

    drawExpressiveAnimalMouth(ctx, 14 + lookX, 38 + lookY, 0.78, 0.06, pose, outline);
    ctx.fillStyle = '#1f1419';
    drawOvalSpot(ctx, 18 + lookX, 10 + lookY, 14, 10, 0.05);

    drawGlossyAnimalEye(ctx, 'left', -34 + lookX * 0.85, -14 + lookY * 0.85, 18, 21, -0.08, pose, IRIS_PALETTES.amber, furLight, furMid, outline);
    drawGlossyAnimalEye(ctx, 'right', 58 + lookX * 0.85, -6 + lookY * 0.85, 15, 18, 0.12, pose, IRIS_PALETTES.amber, furLight, furMid, outline);
    drawExpressiveAnimalBrows(ctx, -34 + lookX * 0.85, -42 + lookY * 0.85, 58 + lookX * 0.85, -32 + lookY * 0.85, 28, pose, outline, 3.8);
    ctx.restore();
  }

  /* ============================================================================
   * A14 & A15: AVIAN SPECIES (Malayan Crested Fireback & Rhinoceros Hornbill)
   * - A14 Malayan Crested Fireback: During expressive emotions (Laugh, Waving,
   *   Congratulate, Blush), the peacock-like tail feathers behind it expand and
   *   open out into a breathtaking graceful fan!
   * ========================================================================== */
  function drawAvianRig(
    ctx: CanvasRenderingContext2D,
    pose: TurtlePose,
    species: 'fireback' | 'hornbill',
  ): void {
    const isHornbill = species === 'hornbill';
    const outline = '#10141c';
    const cLight = isHornbill ? '#3c434f' : '#2c467a';
    const cMid = isHornbill ? '#222730' : '#192a4d';
    const cDark = isHornbill ? '#11141a' : '#0d172b';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);

    const fanExpand = !isHornbill
      ? clamp(
        Math.max(
          pose.mouthOpen * 1.45,
          waveAmt * 0.9,
          pose.congratsAlpha,
          pose.eyeSparkleAmount,
          pose.laughMarksAlpha,
          pose.blushAlpha * 0.85,
        ),
        0,
        1,
      )
      : 0;

    // 1. Far Wing behind body
    const drawFeatheredWing = (x: number, y: number, ang: number, scaleX = 1) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scaleX, 1);
      ctx.rotate(ang);
      const wingFill = new Path2D();
      wingFill.moveTo(8, -15);
      wingFill.bezierCurveTo(-48, -24, -124, 18, -112, 74);
      wingFill.bezierCurveTo(-78, 96, 12, 68, 14, 17);
      wingFill.closePath();
      const wingOpen = new Path2D();
      wingOpen.moveTo(8, -15);
      wingOpen.bezierCurveTo(-48, -24, -124, 18, -112, 74);
      wingOpen.bezierCurveTo(-78, 96, 12, 68, 14, 17);
      fillRimAndStroke(ctx, wingFill, -110, -20, 20, 80, cLight, cMid, cDark, outline, 3.5, wingOpen);
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.4;
      for (const fy of [18, 38, 56]) {
        ctx.beginPath();
        ctx.moveTo(-18, fy - 12);
        ctx.quadraticCurveTo(-58, fy, -94, fy + 8);
        ctx.stroke();
      }
      ctx.restore();
    };

    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
    drawFeatheredWing(54, 28, -0.22 - 0.34 * farGestureAmt - pose.farFlipperAngle * 0.35, -0.82);

    // 2. Sculpted Feathered Thighs (Crural Plumage) + Walking Bird Legs & Claws
    const drawBirdLeg = (lx: number, hipY: number, strideAng: number) => {
      ctx.save();
      ctx.translate(lx, hipY);
      const stepLift = Math.max(0, -Math.sin(strideAng * 3.0)) * 8.0;
      ctx.translate(0, -stepLift);
      ctx.rotate(strideAng * 0.45);
      const thighP = new Path2D();
      thighP.moveTo(-22, -28);
      thighP.quadraticCurveTo(0, -36, 22, -28);
      thighP.quadraticCurveTo(20, 14, 8, 28);
      thighP.quadraticCurveTo(0, 34, -8, 28);
      thighP.quadraticCurveTo(-20, 14, -22, -28);
      thighP.closePath();
      fillRimAndStroke(ctx, thighP, -22, -28, 22, 32, cLight, cMid, cDark, outline, 3.2);

      ctx.strokeStyle = isHornbill ? '#5c6670' : '#d9483b';
      ctx.lineWidth = 9.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 22);
      ctx.lineTo(2, 78);
      ctx.moveTo(-18, 80);
      ctx.lineTo(24, 78);
      ctx.moveTo(2, 76);
      ctx.lineTo(18, 84);
      ctx.stroke();
      ctx.restore();
    };

    drawBirdLeg(18, 96, pose.hindFarAngle);
    drawBirdLeg(-38, 98, pose.hindNearAngle);

    // 3. Fuller Plumage Body + Peacock Train Feather Fan on Back (A14) + Seamlessly Embedded Tail
    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    // A14 Malayan Crested Fireback: Beautiful Peacock-Like Ocelli Train Feathers mounted on its back!
    // Always visible as a graceful folded train on the back at rest, and opens wide into a breathtaking display fan during emotes!
    if (!isHornbill) {
      ctx.save();
      ctx.translate(-56, 18);
      ctx.rotate(pose.hindNearAngle * 0.35);
      const numPlumes = 11;
      for (let i = 0; i < numPlumes; i++) {
        const norm = i / (numPlumes - 1) - 0.5;
        const baseAngle = 0.18 + fanExpand * 0.45 + norm * (0.32 + fanExpand * 2.05);
        const sway = Math.sin(pose.waveRaysPhase * 1.2 + i * 0.55) * (0.015 + 0.04 * fanExpand);
        const len = 142 + (1 - Math.abs(norm) * 0.45) * (24 + 48 * fanExpand);
        const isCentralGold = Math.abs(norm) < 0.18;
        ctx.save();
        ctx.rotate(baseAngle + sway);
        const plume = new Path2D();
        plume.moveTo(18, -7);
        plume.bezierCurveTo(-len * 0.42, -22, -len * 0.84, -22, -len, 0);
        plume.bezierCurveTo(-len * 0.84, 22, -len * 0.42, 20, 18, 7);
        plume.closePath();
        fillRimAndStroke(
          ctx,
          plume,
          -len,
          -18,
          18,
          18,
          isCentralGold ? '#fef3c7' : '#2dd4bf',
          isCentralGold ? '#f59e0b' : '#0284c7',
          isCentralGold ? '#92400e' : '#1e1b4b',
          outline,
          2.6,
        );
        ctx.save();
        ctx.clip(plume);
        ctx.strokeStyle = isCentralGold ? '#fffbeb' : '#99f6e4';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-len * 0.88, 0);
        ctx.stroke();
        ctx.fillStyle = '#10b981';
        drawOvalSpot(ctx, -len * 0.78, 0, 17, 11, 0);
        ctx.fillStyle = '#f59e0b';
        drawOvalSpot(ctx, -len * 0.78, 0, 12, 7.5, 0);
        ctx.fillStyle = '#38bdf8';
        drawOvalSpot(ctx, -len * 0.8, 0, 7.5, 5, 0);
        ctx.fillStyle = '#1e1b4b';
        drawOvalSpot(ctx, -len * 0.81, 0, 4.2, 3.0, 0);
        ctx.fillStyle = '#ffffff';
        drawOvalSpot(ctx, -len * 0.83, -1.2, 1.6, 1.1, 0);
        ctx.restore();
        ctx.restore();
      }
      ctx.restore();
    }

    const bodyP = new Path2D();
    bodyP.ellipse(-16, 42, 114, 86, 0.08, 0, Math.PI * 2);
    fillRimAndStroke(ctx, bodyP, -106, -44, 66, 124, cLight, cMid, cDark, outline, 3.6);
    ctx.save();
    ctx.clip(bodyP);
    if (!isHornbill) {
      ctx.fillStyle = '#f59e0b';
      drawOvalSpot(ctx, -68, 2, 58, 30, 0.2);
      ctx.fillStyle = '#dc2626';
      drawOvalSpot(ctx, -78, 8, 38, 20, 0.2);
    } else {
      ctx.fillStyle = '#f8fafc';
      drawOvalSpot(ctx, -24, 106, 88, 38, 0.05);
    }
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(bodyP);

    // Seamlessly Embedded Hornbill Tail Root (A14 Fireback uses its 11-plume peacock train on back!)
    if (isHornbill) {
      ctx.save();
      ctx.translate(-112, 38);
      ctx.rotate(pose.hindNearAngle * 0.45);
      const tailFill = new Path2D();
      tailFill.moveTo(6, -14);
      tailFill.bezierCurveTo(-64, -56, -142, -26, -158, 34);
      tailFill.bezierCurveTo(-122, 60, -52, 42, 8, 14);
      tailFill.closePath();
      const tailOpen = new Path2D();
      tailOpen.moveTo(6, -14);
      tailOpen.bezierCurveTo(-64, -56, -142, -26, -158, 34);
      tailOpen.bezierCurveTo(-122, 60, -52, 42, 8, 14);
      fillRimAndStroke(
        ctx,
        tailFill,
        -150,
        -45,
        15,
        55,
        '#ffffff',
        '#e2e8f0',
        '#cbd5e1',
        outline,
        3.5,
        tailOpen,
      );
      ctx.save();
      ctx.clip(tailFill);
      ctx.fillStyle = '#11141a';
      ctx.fillRect(-122, -45, 36, 110);
      ctx.restore();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = outline;
      ctx.stroke(tailOpen);
      ctx.restore();
    }
    ctx.restore();

    // Phase 1: Near feathered wing waves backward-upward at a 120° offset away from the beak/face
    drawFeatheredWing(-38, 28, 0.12 + 0.88 * waveAmt + pose.nearFlipperAngle * (0.38 + 0.22 * waveAmt));

    // 4. Head, Crown/Casque, Refined Bird Eyes & Non-Overlapping Anterior Beak-Mouth
    ctx.save();
    ctx.translate(38 + pose.headX, -44 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    if (!isHornbill) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3.2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 9 - 10, -84);
        ctx.lineTo(i * 18 - 14, -138);
        ctx.stroke();
        ctx.fillStyle = '#1e3a8a';
        drawOvalSpot(ctx, i * 18 - 14, -142, 10, 7, i * 0.15);
        ctx.fillStyle = '#38bdf8';
        drawOvalSpot(ctx, i * 18 - 14, -142, 5, 3.5, i * 0.15);
      }
    }

    const headP = new Path2D();
    headP.arc(0, -8, 84, 0, Math.PI * 2);
    fillRimAndStroke(ctx, headP, -65, -90, 55, 75, cLight, cMid, cDark, outline, 3.6);

    if (!isHornbill) {
      ctx.save();
      ctx.clip(headP);
      ctx.fillStyle = '#e53935';
      drawOvalSpot(ctx, -32 + lookX * 0.7, -14 + lookY * 0.7, 34, 38, -0.1);
      drawOvalSpot(ctx, 34 + lookX * 0.7, -10 + lookY * 0.7, 28, 32, 0.1);
      ctx.restore();
      ctx.lineWidth = 3.6;
      ctx.strokeStyle = outline;
      ctx.stroke(headP);
    }

    drawSoftCheekBlushes(ctx, -44 + lookX * 0.8, 20 + lookY * 0.8, 44 + lookX * 0.8, 22 + lookY * 0.8, 20, 12, pose.blushAlpha);

    // Position avian eyes on the upper-mid face so the beak sits cleanly at the BOTTOM of the eyes!
    drawGlossyAnimalEye(
      ctx,
      'left',
      -32 + lookX * 0.85,
      -20 + lookY * 0.85,
      isHornbill ? 12.5 : 14,
      isHornbill ? 14.5 : 16.5,
      -0.08,
      pose,
      isHornbill ? IRIS_PALETTES.crimsonRed : IRIS_PALETTES.amber,
      cLight,
      cMid,
      outline,
    );
    drawGlossyAnimalEye(
      ctx,
      'right',
      36 + lookX * 0.85,
      -16 + lookY * 0.85,
      isHornbill ? 11 : 12,
      isHornbill ? 13 : 14.5,
      0.12,
      pose,
      isHornbill ? IRIS_PALETTES.crimsonRed : IRIS_PALETTES.amber,
      cLight,
      cMid,
      outline,
    );
    drawExpressiveAnimalBrows(ctx, -32 + lookX * 0.85, -42 + lookY * 0.85, 36 + lookX * 0.85, -38 + lookY * 0.85, 22, pose, '#ffffff', 3.6);

    const openAmt = clamp(pose.mouthOpen, 0, 1);
    if (isHornbill) {
      // 1. Upturned Rhinoceros Casque mounted on top of the forehead crown ABOVE the eyes (so both eyes remain 100% visible!)
      const casqueX = 4 + lookX * 0.65;
      const casqueY = -58 + lookY * 0.65;
      const casqueP = new Path2D();
      casqueP.moveTo(casqueX - 38, casqueY + 6);
      casqueP.bezierCurveTo(casqueX - 24, casqueY - 38, casqueX + 44, casqueY - 46, casqueX + 62, casqueY - 64);
      casqueP.bezierCurveTo(casqueX + 74, casqueY - 40, casqueX + 54, casqueY + 2, casqueX + 34, casqueY + 8);
      casqueP.bezierCurveTo(casqueX + 10, casqueY + 14, casqueX - 18, casqueY + 12, casqueX - 38, casqueY + 6);
      casqueP.closePath();
      fillRimAndStroke(ctx, casqueP, casqueX - 38, casqueY - 64, casqueX + 68, casqueY + 12, '#ff8a65', '#e53935', '#991b1b', outline, 3.4);
      // Golden highlight on upturned horn tip
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(casqueX + 58, casqueY - 56, 5.5, 3.2, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // 2. Rhinoceros Hornbill (A15) Curved Bill positioned directly at the BOTTOM of the eyes!
      const beakX = 4 + lookX * 0.9;
      const beakY = 6 + lookY * 0.9;

      if (openAmt > 0.06) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(beakX - 10, beakY + 10);
        ctx.quadraticCurveTo(beakX + 40, beakY + 18, beakX + 86, beakY + 34);
        ctx.quadraticCurveTo(beakX + 38, beakY + 32 + openAmt * 26, beakX - 12, beakY + 18 + openAmt * 14);
        ctx.closePath();
        ctx.fillStyle = '#7f1d1d';
        ctx.fill();
        ctx.fillStyle = '#f43f5e';
        drawOvalSpot(ctx, beakX + 24, beakY + 22 + openAmt * 10, 18, 5.5, 0.16);
        ctx.strokeStyle = outline;
        ctx.lineWidth = 3.0;
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(beakX - 10, beakY + 12);
      ctx.rotate(openAmt * 0.32);
      const lowerBill = new Path2D();
      lowerBill.moveTo(0, -2);
      lowerBill.bezierCurveTo(36, 6, 72, 18, 92, 28);
      lowerBill.bezierCurveTo(64, 38, 22, 28, -8, 10);
      lowerBill.closePath();
      fillRimAndStroke(ctx, lowerBill, -8, -2, 92, 36, '#fff9c4', '#fbc02d', '#d97706', outline, 3.2);
      ctx.restore();

      const upperBill = new Path2D();
      upperBill.moveTo(beakX - 16, beakY - 2);
      upperBill.bezierCurveTo(beakX + 38, beakY - 6, beakX + 96, beakY + 12, beakX + 96, beakY + 32);
      upperBill.bezierCurveTo(beakX + 58, beakY + 26, beakX + 18, beakY + 18, beakX - 14, beakY + 12);
      upperBill.closePath();
      fillRimAndStroke(ctx, upperBill, beakX - 16, beakY - 6, beakX + 96, beakY + 32, '#fff59d', '#fbc02d', '#ea580c', outline, 3.4);
    } else {
      // Peacock / Malayan Crested Fireback (A14): Sculpted 3D Beak directly at the BOTTOM of the eyes!
      const beakX = 4 + lookX * 0.9;
      const beakY = 6 + lookY * 0.9;

      if (openAmt > 0.06) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(beakX - 14, beakY + 8);
        ctx.quadraticCurveTo(beakX + 16, beakY + 14, beakX + 36, beakY + 24);
        ctx.quadraticCurveTo(beakX + 12, beakY + 28 + openAmt * 22, beakX - 14, beakY + 16 + openAmt * 10);
        ctx.closePath();
        ctx.fillStyle = '#7f1d1d';
        ctx.fill();
        ctx.fillStyle = '#fb7185';
        drawOvalSpot(ctx, beakX + 8, beakY + 18 + openAmt * 7, 11, 4.5, 0.15);
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.8;
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(beakX - 12, beakY + 10);
      ctx.rotate(openAmt * 0.34);
      const lowerBeak = new Path2D();
      lowerBeak.moveTo(0, 0);
      lowerBeak.quadraticCurveTo(24, 6, 44, 14);
      lowerBeak.quadraticCurveTo(20, 24, -4, 10);
      lowerBeak.closePath();
      fillRimAndStroke(ctx, lowerBeak, -4, 0, 44, 22, '#fff9db', '#d4b459', '#8c6d1f', outline, 3.0);
      ctx.restore();

      const upperBeak = new Path2D();
      upperBeak.moveTo(beakX - 16, beakY - 2);
      upperBeak.quadraticCurveTo(beakX + 8, beakY - 10, beakX + 40, beakY + 18);
      upperBeak.quadraticCurveTo(beakX + 12, beakY + 18, beakX - 14, beakY + 10);
      upperBeak.closePath();
      fillRimAndStroke(ctx, upperBeak, beakX - 16, beakY - 10, beakX + 40, beakY + 18, '#fffbeb', '#ebd07a', '#a17c28', outline, 3.3);

      // 3D nostril (nare) on the upper beak
      ctx.fillStyle = outline;
      drawOvalSpot(ctx, beakX + 4, beakY + 3, 3.2, 1.8, 0.25);
    }
    ctx.restore();
  }

  /* ============================================================================
   * A16: RETICULATED PYTHON (Malayopython reticulatus)
   * - Rebuilt per User Critique ("make it continuous string of body instead of 3 ovals entity"
   *   & "reduce the line and make the tongue closer towards the face"):
   *   1. Single continuous undulating S-curve serpent body strip flowing from the
   *      tapering tail tip through the lower coil, middle S-bend, and rising neck
   *      pillar directly into the head (ZERO separate oval entities!).
   *   2. Shorter, sleeker labial mouth line near the front of the snout, with the
   *      flicking forked crimson tongue emerging right at the rostral snout tip.
   * ========================================================================== */
  function drawReticulatedPythonRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#241608';
    const cLight = '#f5cf62';
    const cMid = '#c7922c';
    const cDark = '#7d5210';
    const bellyCream = '#fff6d6';

    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    const slitherPhase = pose.waveRaysPhase * 1.15;
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    const w1 = Math.sin(slitherPhase) * 8 + pose.nearFlipperAngle * (8 + 14 * waveAmt) - 18 * waveAmt;
    const w2 = Math.cos(slitherPhase * 0.9) * 6 - 22 * waveAmt;
    const w3 = Math.sin(slitherPhase - 1.1) * 5;

    // Control points along a single non-self-intersecting S-coil from tapered tail tip to neck base
    const ctrlPts: Array<[number, number, number]> = [
      [-152 + w1, -24 + w2, 3.5],       // 0: Tapered tail tip (upper-left rear)
      [-166 + w1 * 0.6, 36 + w2 * 0.4, 12], // 1: Left rear descending curve
      [-136, 98, 20],                   // 2: Bottom-left coil bend
      [-42, 118, 24],                   // 3: Bottom belly center
      [68 - w3, 112, 24],               // 4: Bottom-right approach
      [112 - w3, 82, 23],               // 5: Rightmost smooth U-turn apex
      [64 - w3, 52, 22],                // 6: Middle-right upper return
      [-22, 48, 22],                    // 7: Middle S-coil center
      [-92 + w3, 34, 21],               // 8: Middle-left bend
      [-98 + w3, -4, 20],               // 9: Upper-left neck turn
      [-34, -24, 20],                   // 10: Rising neck approach
      [28, -42, 19],                    // 11: Neck entering head base
    ];

    // Evaluate smooth uniform cubic B-spline along ctrlPts (C2-continuous curvature everywhere!)
    const totalSamples = 72;
    const nSegs = ctrlPts.length - 3;
    const spine: Array<{ x: number; y: number; tx: number; ty: number; nx: number; ny: number; r: number }> = [];

    for (let s = 0; s <= totalSamples; s++) {
      const uGlobal = (s / totalSamples) * nSegs;
      const segIdx = Math.min(nSegs - 1, Math.floor(uGlobal));
      const u = uGlobal - segIdx;
      const u2 = u * u;
      const u3 = u2 * u;

      const b0 = (1 - 3 * u + 3 * u2 - u3) / 6;
      const b1 = (4 - 6 * u2 + 3 * u3) / 6;
      const b2 = (1 + 3 * u + 3 * u2 - 3 * u3) / 6;
      const b3 = u3 / 6;

      const db0 = (-3 + 6 * u - 3 * u2) / 6;
      const db1 = (-12 * u + 9 * u2) / 6;
      const db2 = (3 + 6 * u - 9 * u2) / 6;
      const db3 = (3 * u2) / 6;

      const p0 = ctrlPts[segIdx];
      const p1 = ctrlPts[segIdx + 1];
      const p2 = ctrlPts[segIdx + 2];
      const p3 = ctrlPts[segIdx + 3];

      const x = b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0];
      const y = b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1];
      const r = b0 * p0[2] + b1 * p1[2] + b2 * p2[2] + b3 * p3[2];

      const dx = db0 * p0[0] + db1 * p1[0] + db2 * p2[0] + db3 * p3[0];
      const dy = db0 * p0[1] + db1 * p1[1] + db2 * p2[1] + db3 * p3[1];
      const len = Math.hypot(dx, dy) || 1;
      const tx = dx / len;
      const ty = dy / len;
      const nx = -ty;
      const ny = tx;

      spine.push({ x, y, tx, ty, nx, ny, r });
    }

    const serpentBody = new Path2D();
    const first = spine[0];
    serpentBody.moveTo(first.x + first.nx * first.r, first.y + first.ny * first.r);
    for (let i = 1; i <= totalSamples; i++) {
      const sp = spine[i];
      serpentBody.lineTo(sp.x + sp.nx * sp.r, sp.y + sp.ny * sp.r);
    }
    const last = spine[totalSamples];
    serpentBody.quadraticCurveTo(
      last.x + last.tx * last.r * 1.25,
      last.y + last.ty * last.r * 1.25,
      last.x - last.nx * last.r,
      last.y - last.ny * last.r,
    );
    for (let i = totalSamples - 1; i >= 0; i--) {
      const sp = spine[i];
      serpentBody.lineTo(sp.x - sp.nx * sp.r, sp.y - sp.ny * sp.r);
    }
    serpentBody.quadraticCurveTo(
      first.x - first.tx * first.r * 1.4,
      first.y - first.ty * first.r * 1.4,
      first.x + first.nx * first.r,
      first.y + first.ny * first.r,
    );
    serpentBody.closePath();

    fillRimAndStroke(ctx, serpentBody, -170, -45, 130, 140, cLight, cMid, cDark, outline, 3.6);

    ctx.save();
    ctx.clip(serpentBody);

    // Cream ventral belly scales along the underside of each coil
    ctx.strokeStyle = bellyCream;
    ctx.lineCap = 'round';
    ctx.lineWidth = 10;
    ctx.beginPath();
    for (let i = 0; i <= totalSamples; i++) {
      const sp = spine[i];
      // Lower side of the tube in screen space (positive Y offset)
      const bx = sp.x;
      const by = sp.y + sp.r * 0.72;
      if (i === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.stroke();

    // Reticulated geometric diamond saddles spaced evenly along the C2 spine
    for (let idx = 6; idx <= totalSamples - 5; idx += 6) {
      const sp = spine[idx];
      const dr = sp.r * 0.64;
      if (dr < 6) continue;
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(Math.atan2(sp.ty, sp.tx));
      ctx.fillStyle = '#3b230c';
      ctx.strokeStyle = '#fff5cc';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(dr * 1.15, 0);
      ctx.lineTo(0, -dr * 0.88);
      ctx.lineTo(-dr * 1.15, 0);
      ctx.lineTo(0, dr * 0.88);
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

    // 2. Sculpted Wedge Python Head with Prominent Flicking Forked Crimson Tongue in Front of Snout!
    ctx.save();
    ctx.translate(24 + pose.headX, -54 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    const headP = new Path2D();
    headP.ellipse(6, -4, 92, 68, 0.05, 0, Math.PI * 2);
    fillRimAndStroke(ctx, headP, -75, -72, 60, 68, cLight, cMid, cDark, outline, 3.7);
    ctx.save();
    ctx.clip(headP);
    ctx.fillStyle = bellyCream;
    drawOvalSpot(ctx, 14 + lookX * 0.5, 44 + lookY * 0.5, 76, 24, 0.04);
    ctx.strokeStyle = 'rgba(125, 82, 16, 0.24)';
    ctx.lineWidth = 2.0;
    for (const [sx, sy] of [
      [-16, -42],
      [12, -46],
      [0, -28],
    ]) {
      ctx.beginPath();
      ctx.arc(sx + lookX * 0.5, sy + lookY * 0.4, 11, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    drawSoftCheekBlushes(ctx, -42 + lookX * 0.8, 14 + lookY * 0.8, 56 + lookX * 0.8, 18 + lookY * 0.8, 20, 12, pose.blushAlpha);
    ctx.restore();
    ctx.lineWidth = 3.7;
    ctx.strokeStyle = outline;
    ctx.stroke(headP);

    // Labial jaw cleft extending right to the anterior rostral snout tip
    const snoutTipX = 94 + lookX * 0.45;
    const snoutTipY = 12 + lookY * 0.45;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(22 + lookX * 0.6, 22 + lookY * 0.6);
    ctx.quadraticCurveTo(60 + lookX * 0.55, 24 + lookY * 0.55, snoutTipX, snoutTipY);
    ctx.stroke();

    // Labial thermal-sensing pits along the upper jaw
    ctx.fillStyle = '#4a2c0a';
    for (const [px, py] of [
      [34, 15],
      [48, 15],
      [62, 13],
      [76, 10],
    ] as const) {
      drawOvalSpot(ctx, px + lookX * 0.55, py + lookY * 0.55, 2.6, 1.8, 0.08);
    }

    // Flicking Forked Crimson Tongue drawn AFTER headP so it clearly extends out in front of the snout!
    const tongueExtend = 1 + Math.sin(pose.waveRaysPhase * 2.4) * 0.18 + pose.mouthOpen * 0.3;
    const tongueFlick = Math.sin(pose.waveRaysPhase * 3.0) * 4.5;
    const forkX = snoutTipX + 22 * tongueExtend;
    const forkY = snoutTipY + 3 + tongueFlick * 0.7;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Dark outline behind tongue for crisp readability against any background
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5.2;
    ctx.beginPath();
    ctx.moveTo(snoutTipX - 3, snoutTipY);
    ctx.quadraticCurveTo(snoutTipX + 10 * tongueExtend, snoutTipY + 1 + tongueFlick * 0.35, forkX, forkY);
    ctx.lineTo(forkX + 13 * tongueExtend, forkY - 7 + tongueFlick * 0.5);
    ctx.moveTo(forkX, forkY);
    ctx.lineTo(forkX + 12 * tongueExtend, forkY + 8 + tongueFlick * 0.5);
    ctx.stroke();

    // Bright crimson-rose tongue fill stroke
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(snoutTipX - 3, snoutTipY);
    ctx.quadraticCurveTo(snoutTipX + 10 * tongueExtend, snoutTipY + 1 + tongueFlick * 0.35, forkX, forkY);
    ctx.lineTo(forkX + 13 * tongueExtend, forkY - 7 + tongueFlick * 0.5);
    ctx.moveTo(forkX, forkY);
    ctx.lineTo(forkX + 12 * tongueExtend, forkY + 8 + tongueFlick * 0.5);
    ctx.stroke();
    ctx.restore();

    drawGlossyAnimalEye(ctx, 'left', -28 + lookX * 0.85, -10 + lookY * 0.85, 11.5, 13.5, -0.08, pose, IRIS_PALETTES.amber, cLight, cMid, outline);
    drawGlossyAnimalEye(ctx, 'right', 54 + lookX * 0.85, -2 + lookY * 0.85, 10, 12, 0.12, pose, IRIS_PALETTES.amber, cLight, cMid, outline);
    drawExpressiveAnimalBrows(ctx, -28 + lookX * 0.85, -32 + lookY * 0.85, 54 + lookX * 0.85, -22 + lookY * 0.85, 20, pose, outline, 3.4);
    ctx.restore();
  }

  /* ============================================================================
   * A17 & A25: CLOUDED MONITOR LIZARD & ASIAN WATER MONITOR
   * - Wide, uncrowded front/hind leg wheelbase on a fuller Varanus torso
   * - Realistic Varanus jaw cleft + flicking forked tongue (no cartoon mammal mouth!)
   * - Realistic small alert reptile eyes (12x14 / 10x12)
   * ========================================================================== */
  function drawMonitorLizardRig(ctx: CanvasRenderingContext2D, pose: TurtlePose, isClouded: boolean): void {
    const outline = isClouded ? '#292111' : '#122416';
    const cLight = isClouded ? '#dfd084' : '#5ca856';
    const cMid = isClouded ? '#9e8842' : '#2f6e31';
    const cDark = isClouded ? '#5c4b1b' : '#173d1a';
    const spotCol = isClouded ? '#fff3b0' : '#facc15';
    const bellyCol = isClouded ? '#f7eed2' : '#e8dfa2';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);

    // Far Hind Leg & Far Front Leg behind torso (permanently socketed, turning right on emotes)
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
    drawSculptedPawLimb(ctx, -64, 86, pose.hindFarAngle * 0.45 - 0.05, 100, 44, cMid, cDark, outline, outline, {
      clawsColor: '#e8dec8',
    });
    drawSculptedPawLimb(
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

    // 1. Unified Continuous Monitor Body + Tail + Muscular Neck Bridge
    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    const tailSwing = Math.sin(pose.waveRaysPhase * 0.95) * 12 + pose.hindNearAngle * 22;

    const bodyAndTail = new Path2D();
    if (isClouded) {
      bodyAndTail.moveTo(-298, 118 + tailSwing);
      bodyAndTail.bezierCurveTo(-244, 72 + tailSwing * 0.4, -172, 24, -108, 14);
    } else {
      bodyAndTail.moveTo(-308, 102 + tailSwing);
      bodyAndTail.bezierCurveTo(-246, 36 + tailSwing * 0.4, -168, -6, -108, 10);
    }
    bodyAndTail.bezierCurveTo(-72, -32, -10, -44, 28, -32);
    bodyAndTail.bezierCurveTo(56, -40, 76, -56, 92, -42);
    bodyAndTail.bezierCurveTo(110, -18, 102, 46, 68, 86);
    bodyAndTail.bezierCurveTo(22, 124, -68, 122, -108, 86);
    if (isClouded) {
      bodyAndTail.bezierCurveTo(-162, 88, -228, 110 + tailSwing * 0.4, -282, 136 + tailSwing);
      bodyAndTail.bezierCurveTo(-298, 142 + tailSwing, -310, 128 + tailSwing, -298, 118 + tailSwing);
    } else {
      bodyAndTail.bezierCurveTo(-162, 94, -230, 118 + tailSwing * 0.4, -288, 134 + tailSwing);
      bodyAndTail.bezierCurveTo(-308, 138 + tailSwing, -320, 116 + tailSwing, -308, 102 + tailSwing);
    }
    bodyAndTail.closePath();

    fillRimAndStroke(ctx, bodyAndTail, -300, -48, 102, 128, cLight, cMid, cDark, outline, 3.6);

    ctx.save();
    ctx.clip(bodyAndTail);
    ctx.fillStyle = spotCol;
    for (const [tx, ty, rx, ry] of [
      [-144, 54, 9, 28],
      [-184, 70 + tailSwing * 0.25, 8, 26],
      [-224, 88 + tailSwing * 0.5, 7, 22],
      [-262, 108 + tailSwing * 0.75, 6, 18],
    ] as const) {
      drawOvalSpot(ctx, tx, ty, rx, ry, -0.32);
    }
    if (!isClouded) {
      ctx.strokeStyle = cLight;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-116, 16);
      ctx.bezierCurveTo(-172, 2, -238, 42 + tailSwing * 0.4, -296, 98 + tailSwing);
      ctx.stroke();
    }

    ctx.fillStyle = bellyCol;
    drawOvalSpot(ctx, 56, 72, 42, 44, 0.12);
    ctx.strokeStyle = 'rgba(60, 50, 20, 0.25)';
    ctx.lineWidth = 1.8;
    for (let gy = -4; gy <= 84; gy += 16) {
      ctx.beginPath();
      ctx.arc(46, gy, 38, 0.15, 1.15);
      ctx.stroke();
    }

    if (isClouded) {
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
    } else {
      for (const [sx, sy, r] of [
        [-92, 4, 10],
        [-86, 26, 9],
        [-56, -4, 11],
        [-50, 18, 10],
        [-44, 38, 8],
        [-18, 0, 11],
        [-12, 22, 10],
        [18, 8, 9],
        [24, 28, 8],
      ] as const) {
        ctx.fillStyle = '#122416';
        drawOvalSpot(ctx, sx, sy, r + 3, r * 0.78 + 2, 0.12);
        ctx.fillStyle = spotCol;
        drawOvalSpot(ctx, sx, sy, r, r * 0.72, 0.12);
        ctx.fillStyle = cMid;
        drawOvalSpot(ctx, sx, sy, r * 0.38, r * 0.3, 0.12);
      }
    }
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(bodyAndTail);
    ctx.restore();

    // Near Hind Leg & Near Front Leg with clear belly gap
    drawSculptedPawLimb(ctx, -104, 82, pose.hindNearAngle * 0.45 + 0.06, 104, 48, cLight, cMid, cDark, outline, {
      clawsColor: '#f5ecd7',
    });
    drawSculptedPawLimb(
      ctx,
      18,
      74,
      pose.nearFlipperAngle * (0.38 + 0.18 * waveAmt) + 0.04 - 0.48 * waveAmt - 0.22 * pose.nearFlipperTuckAmount,
      112,
      46,
      cLight,
      cMid,
      cDark,
      outline,
      { clawsColor: '#f5ecd7' },
    );

    // 2. Wedge Varanus Lizard Head with Sleek Reptilian Jaw Cleft & Flicking Forked Tongue (no mammal mouth!)
    ctx.save();
    ctx.translate(68 + pose.headX, -42 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 12;
    const lookY = pose.headLookY * 8;

    const headFill = new Path2D();
    headFill.moveTo(-64, 4);
    headFill.bezierCurveTo(-66, -34, -34, -56, 22, -52);
    headFill.bezierCurveTo(46, -50, 68 + lookX * 0.5, -26 + lookY * 0.4, 98 + lookX * 0.75, -8 + lookY * 0.55);
    headFill.bezierCurveTo(116 + lookX * 0.8, 4 + lookY * 0.6, 112 + lookX * 0.8, 18 + lookY * 0.6, 94 + lookX * 0.7, 28 + lookY * 0.6);
    headFill.bezierCurveTo(58 + lookX * 0.4, 46 + lookY * 0.4, -12, 54, -46, 40);
    headFill.bezierCurveTo(-60, 32, -64, 18, -64, 4);
    headFill.closePath();

    fillRimAndStroke(ctx, headFill, -66, -56, 112, 52, cLight, cMid, cDark, outline, 3.6);

    ctx.save();
    ctx.clip(headFill);
    ctx.fillStyle = bellyCol;
    drawOvalSpot(ctx, 18 + lookX * 0.4, 36 + lookY * 0.4, 78, 22, 0.06);

    ctx.strokeStyle = 'rgba(25, 40, 20, 0.26)';
    ctx.lineWidth = 1.6;
    for (const [hx, hy, hr] of [
      [16, -24, 9],
      [36, -18, 8],
      [54, -12, 7],
      [26, -8, 8],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(hx + lookX * 0.5, hy + lookY * 0.4, hr, hr * 0.65, 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (!isClouded) {
      ctx.fillStyle = '#122416';
      drawOvalSpot(ctx, -36 + lookX * 0.4, -12 + lookY * 0.4, 24, 7, -0.12);
      ctx.fillStyle = spotCol;
      drawOvalSpot(ctx, 64 + lookX * 0.6, 4 + lookY * 0.5, 6, 12, 0.2);
      drawOvalSpot(ctx, 82 + lookX * 0.7, 6 + lookY * 0.5, 5, 10, 0.2);
    } else {
      ctx.fillStyle = '#4a3c14';
      drawOvalSpot(ctx, -34 + lookX * 0.4, -10 + lookY * 0.4, 20, 6, -0.1);
    }

    ctx.fillStyle = cDark;
    drawOvalSpot(ctx, -42 + lookX * 0.25, 4 + lookY * 0.25, 6, 11, 0.15);

    drawSoftCheekBlushes(ctx, -14 + lookX * 0.6, 14 + lookY * 0.6, 56 + lookX * 0.7, 16 + lookY * 0.6, 16, 9, pose.blushAlpha);
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(headFill);

    ctx.fillStyle = outline;
    const nostrilX = (isClouded ? 62 : 82) + lookX * 0.75;
    const nostrilY = (isClouded ? -6 : -2) + lookY * 0.55;
    drawOvalSpot(ctx, nostrilX, nostrilY, 4.2, 2.5, 0.25);

    // Sleek, shorter Varanus lizard jaw cleft line near front of snout
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(38 + lookX * 0.6, 22 + lookY * 0.55);
    ctx.quadraticCurveTo(68 + lookX * 0.7, 24 + lookY * 0.6, 96 + lookX * 0.75, 18 + lookY * 0.6);
    ctx.stroke();

    // Animated forked Varanus lizard tongue flicking out close to the snout tip
    const tongueExtend = 1 + Math.sin(pose.waveRaysPhase * 2.0) * 0.15 + pose.mouthOpen * 0.25;
    const tongueFlick = Math.sin(pose.waveRaysPhase * 2.4) * 3.5;
    const tipX = 96 + lookX * 0.75;
    const tipY = 18 + lookY * 0.6;
    ctx.strokeStyle = isClouded ? '#e879a0' : '#64748b';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo(
      tipX + 9 * tongueExtend,
      tipY + 2 + tongueFlick * 0.5,
      tipX + 16 * tongueExtend,
      tipY + 4 + tongueFlick,
    );
    ctx.lineTo(tipX + 24 * tongueExtend, tipY - 1 + tongueFlick);
    ctx.moveTo(tipX + 16 * tongueExtend, tipY + 4 + tongueFlick);
    ctx.lineTo(tipX + 23 * tongueExtend, tipY + 10 + tongueFlick);
    ctx.stroke();

    const iris = isClouded ? IRIS_PALETTES.goldenHazel : IRIS_PALETTES.amber;
    drawGlossyAnimalEye(ctx, 'left', -12 + lookX * 0.65, -14 + lookY * 0.65, 11, 13, -0.06, pose, iris, cLight, cMid, outline);
    drawGlossyAnimalEye(ctx, 'right', 48 + lookX * 0.7, -10 + lookY * 0.65, 9.5, 11.5, 0.1, pose, iris, cLight, cMid, outline);
    drawExpressiveAnimalBrows(ctx, -12 + lookX * 0.65, -30 + lookY * 0.65, 48 + lookX * 0.7, -24 + lookY * 0.65, 18, pose, outline, 3.2);
    ctx.restore();
  }

  /* ============================================================================
   * A18 & A19: BLACK GIANT SQUIRREL & SMOOTH-COATED OTTER
   * - A18 Black Giant Squirrel (User Fix #11: "where is the nose?"): Huge fluffy
   *   plume tail seamlessly embedded ("嵌入"), jet-black dorsal coat, warm orange-buff
   *   chest & cheeks, ear tufts, and a distinct sculpted squirrel nose pad + whiskers!
   * - A19 Smooth-Coated Otter (User Fix #12: "Tails seems detached"): Sleek chestnut
   *   river otter with thick muscular rudder tail seamlessly embedded ("嵌入") into
   *   the lower back, cream throat patch, whiskers, and webbed paws.
   * ========================================================================== */
  function drawBlackGiantSquirrelRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#141110';
    const cLight = '#423a38';
    const cMid = '#26201f';
    const cDark = '#141010';
    const buff = '#f5b062';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

    // Far Hind Leg & Far Front Leg behind torso (permanently socketed, turning right on emotes!)
    drawSculptedPawLimb(ctx, -64, 88, pose.hindFarAngle * 0.4, 96, 46, cLight, cMid, cDark, outline, {
      pawTipColor: buff,
      clawsColor: '#3d3028',
    });
    drawSculptedPawLimb(
      ctx,
      58,
      78,
      pose.farFlipperAngle * 0.38 - 0.08 - 0.46 * farGestureAmt,
      106,
      44,
      cLight,
      cMid,
      cDark,
      outline,
      {
        pawTipColor: buff,
        clawsColor: '#3d3028',
      },
    );

    // Torso + Seamlessly Embedded Giant Plume Tail ("嵌入")
    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    const torso = new Path2D();
    torso.ellipse(-20, 42, 108, 88, 0.05, 0, Math.PI * 2);
    fillRimAndStroke(ctx, torso, -105, -44, 65, 124, cLight, cMid, cDark, outline, 3.6);
    ctx.save();
    ctx.clip(torso);
    ctx.fillStyle = buff;
    drawOvalSpot(ctx, 58, 18, 28, 34, 0.08);
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(torso);

    // Huge Fluffy Plume Tail emerging continuously from lower rump (aligned fill & stroke root!)
    ctx.save();
    ctx.translate(-118, 48);
    ctx.rotate(pose.hindNearAngle * 0.4 + Math.sin(pose.waveRaysPhase * 0.6) * 0.06);
    const tailFill = new Path2D();
    tailFill.moveTo(6, -19);
    tailFill.quadraticCurveTo(16, 0, 6, 19);
    tailFill.bezierCurveTo(-84, 18, -168, -74, -122, -178);
    tailFill.bezierCurveTo(-82, -242, 16, -202, -10, -108);
    tailFill.bezierCurveTo(-28, -52, -12, -24, 6, -19);
    tailFill.closePath();

    const tailStroke = new Path2D();
    tailStroke.moveTo(6, -19);
    tailStroke.bezierCurveTo(-12, -24, -28, -52, -10, -108);
    tailStroke.bezierCurveTo(16, -202, -82, -242, -122, -178);
    tailStroke.bezierCurveTo(-168, -74, -84, 18, 6, 19);
    fillRimAndStroke(ctx, tailFill, -145, -215, 22, 22, cLight, cMid, cMid, outline, 3.6, tailStroke);

    // Fluffy fur texture strokes inside plume tail
    ctx.save();
    ctx.clip(tailFill);
    ctx.strokeStyle = 'rgba(255, 235, 215, 0.14)';
    ctx.lineWidth = 2.2;
    for (const [tx, ty] of [
      [-96, -68],
      [-88, -124],
      [-58, -168],
      [-36, -118],
    ]) {
      ctx.beginPath();
      ctx.arc(tx, ty, 28, Math.PI * 0.7, Math.PI * 1.4);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
    ctx.restore();

    // Near Hind Leg & Near Front Arm permanently socketed on body, turning right on emotes
    drawSculptedPawLimb(ctx, -104, 84, pose.hindNearAngle * 0.4, 100, 50, cLight, cMid, cDark, outline, {
      pawTipColor: buff,
      clawsColor: '#3d3028',
    });
    drawSculptedPawLimb(
      ctx,
      12,
      74,
      pose.nearFlipperAngle * (0.38 + 0.2 * waveAmt) + 0.04 - 0.5 * waveAmt - 0.22 * pose.nearFlipperTuckAmount,
      110,
      44,
      cLight,
      cMid,
      cDark,
      outline,
      {
        pawTipColor: buff,
        clawsColor: '#3d3028',
      },
    );

    // Head with Distinct Squirrel Nose Pad, Nostrils, Whiskers & Realistic Smaller Eyes
    ctx.save();
    ctx.translate(42 + pose.headX, -42 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    for (const [ex, ey] of [
      [-76, -86],
      [78, -76],
    ] as const) {
      ctx.save();
      ctx.translate(ex + lookX * 0.3, ey + lookY * 0.3);
      const earP = new Path2D();
      earP.arc(0, 0, 28, 0, Math.PI * 2);
      fillRimAndStroke(ctx, earP, 0, -28, 0, 28, cLight, cMid, cDark, outline, 3.4);
      ctx.fillStyle = buff;
      drawOvalSpot(ctx, 0, 2, 15, 15, 0);
      ctx.restore();
    }

    const headP = new Path2D();
    headP.ellipse(4, -6, 98, 86, 0.04, 0, Math.PI * 2);
    fillRimAndStroke(ctx, headP, -75, -90, 55, 80, cLight, cMid, cDark, outline, 3.6);
    ctx.save();
    ctx.clip(headP);
    ctx.fillStyle = buff;
    drawOvalSpot(ctx, 16 + lookX * 0.8, 34 + lookY * 0.8, 78, 50, 0.05);
    drawSoftCheekBlushes(ctx, -48 + lookX * 0.8, 22 + lookY * 0.8, 72 + lookX * 0.8, 28 + lookY * 0.8, 25, 14, pose.blushAlpha);
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(headP);

    const noseX = 18 + lookX * 0.92;
    const noseY = 14 + lookY * 0.88;
    const noseP = new Path2D();
    noseP.moveTo(noseX - 15, noseY - 6);
    noseP.quadraticCurveTo(noseX, noseY - 12, noseX + 15, noseY - 6);
    noseP.quadraticCurveTo(noseX + 14, noseY + 8, noseX, noseY + 12);
    noseP.quadraticCurveTo(noseX - 14, noseY + 8, noseX - 15, noseY - 6);
    noseP.closePath();
    fillRimAndStroke(ctx, noseP, noseX - 14, noseY - 10, noseX + 14, noseY + 12, '#6b3e38', '#3d1e1b', '#1f0d0b', outline, 2.6);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    drawOvalSpot(ctx, noseX - 4, noseY - 4, 5, 2.4, -0.15);
    ctx.fillStyle = '#120807';
    drawOvalSpot(ctx, noseX - 7, noseY + 2, 2.8, 2.0, 0.3);
    drawOvalSpot(ctx, noseX + 7, noseY + 2, 2.8, 2.0, -0.3);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(noseX, noseY + 11);
    ctx.lineTo(noseX, 34 + lookY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(40, 26, 20, 0.65)';
    ctx.lineWidth = 2.0;
    for (const wy of [16, 24]) {
      ctx.beginPath();
      ctx.moveTo(noseX - 22, wy + lookY * 0.85);
      ctx.quadraticCurveTo(noseX - 48, wy - 2 + lookY * 0.85, noseX - 68, wy + 5 + lookY * 0.85);
      ctx.moveTo(noseX + 22, wy + lookY * 0.85);
      ctx.quadraticCurveTo(noseX + 48, wy - 2 + lookY * 0.85, noseX + 66, wy + 6 + lookY * 0.85);
      ctx.stroke();
    }

    drawExpressiveAnimalMouth(ctx, 18 + lookX, 42 + lookY, 0.84, 0.08, pose, outline);
    // Big, bright arboreal squirrel eyes (17.5x20.5 left, 15x17.5 right)
    drawGlossyAnimalEye(ctx, 'left', -34 + lookX * 0.85, -14 + lookY * 0.85, 17.5, 20.5, -0.08, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
    drawGlossyAnimalEye(ctx, 'right', 60 + lookX * 0.85, -6 + lookY * 0.85, 15, 17.5, 0.12, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
    drawExpressiveAnimalBrows(ctx, -34 + lookX * 0.85, -42 + lookY * 0.85, 60 + lookX * 0.85, -32 + lookY * 0.85, 26, pose, buff, 3.6);
    ctx.restore();
  }

  function drawSmoothCoatedOtterRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#24150c';
    const cLight = '#a8764b';
    const cMid = '#7a4f2b';
    const cDark = '#4f3017';
    const cream = '#f7e6ce';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

    // Far Hind Leg & Far Front Leg behind torso (permanently socketed, turning right on emotes!)
    drawSculptedPawLimb(ctx, -64, 88, pose.hindFarAngle * 0.4, 96, 46, cMid, cDark, outline, outline, {
      clawsColor: '#e8d7c3',
    });
    drawSculptedPawLimb(
      ctx,
      58,
      80,
      pose.farFlipperAngle * 0.38 - 0.08 - 0.46 * farGestureAmt,
      104,
      44,
      cMid,
      cDark,
      outline,
      outline,
      { clawsColor: '#e8d7c3' },
    );

    // Unified Continuous Otter Torso + Muscular Rudder Tail (Single Path2D!)
    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    const tailWag = Math.sin(pose.waveRaysPhase * 0.85) * 10 + pose.hindNearAngle * 20;
    const bodyAndTail = new Path2D();
    bodyAndTail.moveTo(-248, 102 + tailWag);
    bodyAndTail.bezierCurveTo(-216, 68 + tailWag * 0.5, -162, 36, -118, 22);
    bodyAndTail.bezierCurveTo(-88, -42, 18, -54, 76, -14);
    bodyAndTail.bezierCurveTo(116, 16, 108, 86, 58, 114);
    bodyAndTail.bezierCurveTo(8, 138, -72, 132, -114, 98);
    bodyAndTail.bezierCurveTo(-148, 104, -182, 108 + tailWag * 0.5, -218, 120 + tailWag);
    bodyAndTail.bezierCurveTo(-238, 126 + tailWag, -256, 114 + tailWag, -248, 102 + tailWag);
    bodyAndTail.closePath();

    fillRimAndStroke(ctx, bodyAndTail, -250, -48, 98, 134, cLight, cMid, cDark, outline, 3.6);
    ctx.save();
    ctx.clip(bodyAndTail);
    ctx.fillStyle = cream;
    drawOvalSpot(ctx, 58, 18, 28, 36, 0.08);
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(bodyAndTail);
    ctx.restore();

    // Near Hind Leg & Near Front Arm permanently socketed on body, turning right on emotes
    drawSculptedPawLimb(ctx, -104, 86, pose.hindNearAngle * 0.4, 98, 50, cLight, cMid, cDark, outline, {
      clawsColor: '#e8d7c3',
    });
    drawSculptedPawLimb(
      ctx,
      12,
      76,
      pose.nearFlipperAngle * (0.38 + 0.2 * waveAmt) + 0.04 - 0.5 * waveAmt - 0.22 * pose.nearFlipperTuckAmount,
      108,
      46,
      cLight,
      cMid,
      cDark,
      outline,
      { clawsColor: '#e8d7c3' },
    );

    // Sleek Otter Head with Whiskers & Realistic Smaller Eyes
    ctx.save();
    ctx.translate(44 + pose.headX, -38 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    for (const [ex, ey] of [
      [-86, -42],
      [88, -32],
    ] as const) {
      ctx.save();
      ctx.translate(ex + lookX * 0.3, ey + lookY * 0.3);
      const earP = new Path2D();
      earP.arc(0, 0, 18, 0, Math.PI * 2);
      fillRimAndStroke(ctx, earP, 0, -18, 0, 18, cLight, cMid, cDark, outline, 3.3);
      ctx.restore();
    }

    const headP = new Path2D();
    headP.ellipse(6, -4, 104, 82, 0.04, 0, Math.PI * 2);
    fillRimAndStroke(ctx, headP, -75, -85, 60, 75, cLight, cMid, cDark, outline, 3.6);
    ctx.save();
    ctx.clip(headP);
    ctx.fillStyle = cream;
    drawOvalSpot(ctx, 18 + lookX * 0.8, 38 + lookY * 0.8, 78, 44, 0.05);
    drawSoftCheekBlushes(ctx, -48 + lookX * 0.8, 22 + lookY * 0.8, 72 + lookX * 0.8, 28 + lookY * 0.8, 26, 15, pose.blushAlpha);
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(headP);

    // Otter whiskers
    ctx.strokeStyle = '#fffdf7';
    ctx.lineWidth = 2.6;
    for (const wy of [22, 32]) {
      ctx.beginPath();
      ctx.moveTo(-28 + lookX, wy + lookY);
      ctx.lineTo(-76 + lookX, wy + 6 + lookY);
      ctx.moveTo(58 + lookX, wy + lookY);
      ctx.lineTo(104 + lookX, wy + 8 + lookY);
      ctx.stroke();
    }

    drawExpressiveAnimalMouth(ctx, 18 + lookX, 42 + lookY, 0.84, 0.08, pose, outline);
    ctx.fillStyle = '#29170c';
    drawOvalSpot(ctx, 22 + lookX, 12 + lookY, 16, 11, 0.06);

    drawGlossyAnimalEye(ctx, 'left', -32 + lookX * 0.85, -14 + lookY * 0.85, 15.5, 18, -0.08, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
    drawGlossyAnimalEye(ctx, 'right', 60 + lookX * 0.85, -6 + lookY * 0.85, 13, 15.5, 0.12, pose, IRIS_PALETTES.warmBrown, cLight, cMid, outline);
    drawExpressiveAnimalBrows(ctx, -32 + lookX * 0.85, -38 + lookY * 0.85, 60 + lookX * 0.85, -28 + lookY * 0.85, 24, pose, outline, 3.4);
    ctx.restore();
  }

  /* ============================================================================
   * A20 & A38: GIANT FRESHWATER PRAWN (Udang Galah) & HARLEQUIN SHRIMP
   * Rebuilt per User Critique ("shrimps feel detached for the body too! fix"):
   * - Cephalothorax carapace (head/thorax shield) and arched segmented abdomen are
   *   now UNIFIED into a single continuous attached crustacean body (`bodyStrip`)
   *   with zero floating oval head gap!
   * - Added 3 pairs of articulated thoracic walking legs (pereiopods) + ventral
   *   pleopods (swimmerets) that animate during walking/swimming.
   * - Cheliped arms/claws are socketed directly into the lower anterior carapace
   *   with open roots so they never float in space.
   * - Realistic smaller stalked compound eyes (14x17).
   * ========================================================================== */
  function drawCrustaceanRig(
    ctx: CanvasRenderingContext2D,
    pose: TurtlePose,
    species: 'prawn' | 'harlequin',
  ): void {
    const isPrawn = species === 'prawn';
    const outline = isPrawn ? '#12263a' : '#2e122b';
    const cLight = isPrawn ? '#73c2fb' : '#ffffff';
    const cMid = isPrawn ? '#2e86de' : '#f7e8fa';
    const cDark = isPrawn ? '#1b4f72' : '#d2b4de';
    const abdomenLight = isPrawn ? '#fbd266' : '#ffffff';
    const abdomenMid = isPrawn ? '#e89d25' : '#f5d9f2';
    const abdomenDark = isPrawn ? '#9e5c0c' : '#c48fd1';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    const lookX = pose.headLookX * 10;
    const lookY = pose.headLookY * 8;
    const tailFlex = Math.sin(pose.waveRaysPhase * 0.9) * 8 + pose.hindNearAngle * 14;

    // 1. Cheliped Claws permanently socketed inside the lower cephalothorax carapace and waving at a 120° offset away from the face!
    const drawClaw = (side: -1 | 1) => {
      ctx.save();
      const isLeft = side === -1;
      const rootX = isLeft ? 28 : 88;
      const rootY = isLeft ? 22 : 18;
      ctx.translate(rootX, rootY);
      ctx.rotate(
        isLeft
          ? -0.26 + 2.35 * waveAmt + pose.nearFlipperAngle * (0.35 + 0.22 * waveAmt)
          : -0.32 - 0.38 * farGestureAmt + pose.farFlipperAngle * 0.35,
      );

      if (isPrawn) {
        // Extra-long segmented cobalt-blue Udang Galah cheliped arm with aligned open root
        const armP = new Path2D();
        armP.moveTo(-10, 0);
        armP.quadraticCurveTo(0, -12, 10, 0);
        armP.bezierCurveTo(18, 44, 22, 108, 15, 158);
        armP.bezierCurveTo(11, 172, -4, 172, -10, 160);
        armP.bezierCurveTo(-20, 110, -16, 46, -10, 0);
        armP.closePath();

        const armStroke = new Path2D();
        armStroke.moveTo(-10, 0);
        armStroke.bezierCurveTo(-16, 46, -20, 110, -10, 160);
        armStroke.bezierCurveTo(-4, 172, 11, 172, 15, 158);
        armStroke.bezierCurveTo(22, 108, 18, 44, 10, 0);

        fillRimAndStroke(ctx, armP, -20, -10, 22, 172, '#48dbfb', '#0abde3', '#192a56', outline, 3.3, armStroke);

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.4;
        for (const jy of [52, 108]) {
          ctx.beginPath();
          ctx.arc(1, jy, 11, 0.15, Math.PI - 0.15);
          ctx.stroke();
        }

        const pincerOpen = 0.18 + Math.sin(pose.waveRaysPhase * 1.6) * 0.08;
        ctx.save();
        ctx.translate(-3, 162);
        ctx.rotate(-pincerOpen);
        const fingerL = new Path2D();
        fingerL.moveTo(-5, 0);
        fingerL.quadraticCurveTo(-12, 18, -3, 30);
        fingerL.quadraticCurveTo(3, 18, 4, 0);
        fingerL.closePath();
        fillRimAndStroke(ctx, fingerL, -12, 0, 4, 30, '#7ef9ff', '#0abde3', '#192a56', outline, 2.8);
        ctx.restore();

        ctx.save();
        ctx.translate(7, 162);
        ctx.rotate(pincerOpen);
        const fingerR = new Path2D();
        fingerR.moveTo(-4, 0);
        fingerR.quadraticCurveTo(-3, 18, 3, 30);
        fingerR.quadraticCurveTo(12, 18, 5, 0);
        fingerR.closePath();
        fillRimAndStroke(ctx, fingerR, -4, 0, 12, 30, '#7ef9ff', '#0abde3', '#192a56', outline, 2.8);
        ctx.restore();
      } else {
        // Broad petal-like Harlequin Shrimp raptorial claw with aligned open root
        const clawP = new Path2D();
        clawP.moveTo(-16, 0);
        clawP.quadraticCurveTo(0, -14, 16, 0);
        clawP.bezierCurveTo(44, 42, 46, 112, 12, 130);
        clawP.bezierCurveTo(-36, 112, -42, 42, -16, 0);
        clawP.closePath();

        const clawStroke = new Path2D();
        clawStroke.moveTo(-16, 0);
        clawStroke.bezierCurveTo(-42, 42, -36, 112, 12, 130);
        clawStroke.bezierCurveTo(46, 112, 44, 42, 16, 0);

        fillRimAndStroke(ctx, clawP, -40, -10, 44, 130, '#ffffff', '#f8bbd0', '#880e4f', outline, 3.4, clawStroke);
        ctx.fillStyle = '#6a1b9a';
        drawOvalSpot(ctx, 4, 68, 20, 16, 0.15);
        ctx.fillStyle = '#d81b60';
        drawOvalSpot(ctx, 4, 68, 16, 12, 0.15);
      }
      ctx.restore();
    };

    drawClaw(1);

    // 2. Articulated Thoracic Walking Legs (Pereiopods) & Ventral Pleopods (Swimmerets)
    for (const [lx, ly, baseRot, phaseOff] of [
      [32, 48, 0.15, 0],
      [6, 54, 0.25, 1.1],
      [-20, 62, 0.35, 2.2],
    ] as const) {
      const scuttle = Math.sin(pose.waveRaysPhase * 1.6 + phaseOff) * 0.18 + pose.hindNearAngle * 0.25;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(baseRot + scuttle);
      const legP = new Path2D();
      legP.moveTo(-6, -10);
      legP.quadraticCurveTo(-14, 28, -6, 66);
      legP.quadraticCurveTo(0, 72, 5, 64);
      legP.quadraticCurveTo(4, 26, 6, -10);
      legP.closePath();
      fillRimAndStroke(ctx, legP, -14, -10, 6, 72, cLight, cMid, cDark, outline, 2.6);
      if (!isPrawn) {
        ctx.fillStyle = '#d81b60';
        drawOvalSpot(ctx, -3, 30, 5, 8, 0.1);
      }
      ctx.restore();
    }

    for (const [px, py, rot] of [
      [-58, 76, 0.35],
      [-92, 86, 0.5],
      [-124, 98, 0.65],
      [-150, 114, 0.8],
    ] as const) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot + Math.sin(pose.waveRaysPhase * 1.4 + px * 0.05) * 0.16);
      const pleo = new Path2D();
      pleo.ellipse(0, 18, 8, 20, 0, 0, Math.PI * 2);
      fillRimAndStroke(ctx, pleo, -8, 0, 8, 36, cLight, cMid, cDark, outline, 2.5);
      ctx.restore();
    }

    // 3. Spread Uropod Tail Fan at the tip of the continuous abdomen
    ctx.save();
    ctx.translate(-178, 126 + tailFlex);
    ctx.rotate(0.35 + tailFlex * 0.015);
    for (const [ang, rx, ry] of [
      [-0.45, 15, 36],
      [0, 16, 40],
      [0.45, 15, 36],
    ] as const) {
      ctx.save();
      ctx.rotate(ang);
      const fanP = new Path2D();
      fanP.ellipse(0, 22, rx, ry, 0, 0, Math.PI * 2);
      fillRimAndStroke(ctx, fanP, -rx, 0, rx, 56, isPrawn ? '#48dbfb' : '#f48fb1', cMid, cDark, outline, 2.8);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(0, 48);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // 4. Long Sweeping Antennae & Serrated Dorsal Rostrum Crest (drawn right before the unified carapace+abdomen!)
    ctx.strokeStyle = isPrawn ? '#e67e22' : '#d81b60';
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    for (const dir of [-1, 1]) {
      const sway = Math.sin(pose.waveRaysPhase * 0.9 + dir) * 8;
      ctx.beginPath();
      ctx.moveTo(68 + dir * 22, -52);
      ctx.bezierCurveTo(68 + dir * 92, -138 + sway, 68 + dir * 164, -110 + sway, 68 + dir * 194, -36 + sway);
      ctx.stroke();

      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(74 + dir * 16, -46);
      ctx.bezierCurveTo(74 + dir * 64, -104 - sway * 0.6, 74 + dir * 122, -86 - sway * 0.6, 74 + dir * 148, -42 - sway * 0.6);
      ctx.stroke();
      ctx.lineWidth = 3.4;
    }

    const rostrumP = new Path2D();
    rostrumP.moveTo(22, -62);
    rostrumP.lineTo(42, -92);
    rostrumP.lineTo(54, -74);
    rostrumP.lineTo(74, -98);
    rostrumP.lineTo(86, -72);
    rostrumP.lineTo(108, -88);
    rostrumP.lineTo(104, -52);
    rostrumP.closePath();
    fillRimAndStroke(ctx, rostrumP, 22, -98, 108, -52, isPrawn ? '#f7b731' : '#f48fb1', cMid, cDark, outline, 2.8);

    // 5. UNIFIED Cephalothorax Carapace + Scalloped Arched Abdomen Strip (Single Continuous Body Path2D!)
    const bodyStrip = new Path2D();
    bodyStrip.moveTo(116, -24);
    bodyStrip.bezierCurveTo(92, -74, 24, -76, -18, -44);
    bodyStrip.quadraticCurveTo(-52, -48, -84, -26);
    bodyStrip.quadraticCurveTo(-118, -24, -146, 2);
    bodyStrip.quadraticCurveTo(-174, 22, -188, 56 + tailFlex * 0.4);
    bodyStrip.quadraticCurveTo(-198, 92 + tailFlex * 0.8, -180, 128 + tailFlex);
    bodyStrip.bezierCurveTo(-154, 134 + tailFlex, -138, 106 + tailFlex * 0.4, -108, 88);
    bodyStrip.bezierCurveTo(-72, 68, -22, 66, 28, 54);
    bodyStrip.bezierCurveTo(78, 58, 124, 34, 116, -24);
    bodyStrip.closePath();

    fillRimAndStroke(ctx, bodyStrip, -196, -74, 122, 134, abdomenLight, abdomenMid, abdomenDark, outline, 3.6);

    ctx.save();
    ctx.clip(bodyStrip);

    const carapaceShield = new Path2D();
    carapaceShield.moveTo(-26, -68);
    carapaceShield.quadraticCurveTo(6, -4, -18, 68);
    carapaceShield.lineTo(136, 68);
    carapaceShield.lineTo(136, -80);
    carapaceShield.closePath();
    const caraGrad = ctx.createLinearGradient(52, -70, 52, 58);
    caraGrad.addColorStop(0, cLight);
    caraGrad.addColorStop(0.55, cMid);
    caraGrad.addColorStop(1, cDark);
    ctx.fillStyle = caraGrad;
    ctx.fill(carapaceShield);

    ctx.strokeStyle = isPrawn ? 'rgba(18, 38, 58, 0.48)' : 'rgba(136, 14, 79, 0.42)';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(-18, -44);
    ctx.quadraticCurveTo(4, 6, -16, 56);
    ctx.stroke();

    ctx.lineWidth = 2.4;
    for (const [x1, y1, cx, cy, x2, y2] of [
      [-84, -26, -66, 22, -78, 68],
      [-146, 2, -122, 42, -124, 82],
      [-184, 52 + tailFlex * 0.4, -158, 76 + tailFlex * 0.5, -152, 106 + tailFlex * 0.7],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.stroke();
    }

    if (isPrawn) {
      ctx.fillStyle = 'rgba(46, 134, 222, 0.34)';
      drawOvalSpot(ctx, -68, 18, 58, 22, -0.22);
      ctx.fillStyle = '#fff5cc';
      for (const [dx, dy] of [
        [-36, 46],
        [-74, 56],
        [-108, 68],
        [-136, 88],
      ]) {
        drawOvalSpot(ctx, dx, dy, 4.5, 3.2, -0.2);
      }
    } else {
      for (const [rx, ry, r1, r2, rot] of [
        [34, -8, 24, 17, -0.12],
        [-48, 12, 22, 16, 0.15],
        [-104, 28, 19, 14, -0.18],
        [-148, 62, 16, 12, -0.35],
      ] as const) {
        ctx.fillStyle = '#6a1b9a';
        drawOvalSpot(ctx, rx, ry, r1 + 3, r2 + 3, rot);
        ctx.fillStyle = '#d81b60';
        drawOvalSpot(ctx, rx, ry, r1, r2, rot);
        ctx.fillStyle = '#ff80ab';
        drawOvalSpot(ctx, rx - 3, ry - 3, r1 * 0.4, r2 * 0.4, rot);
      }
    }

    drawSoftCheekBlushes(ctx, 28 + lookX * 0.8, 14 + lookY * 0.8, 98 + lookX * 0.8, 18 + lookY * 0.8, 20, 12, pose.blushAlpha);
    ctx.restore();

    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(bodyStrip);

    // 6. Crustacean Mandible / Rostral Face & Realistic Stalked Glossy Eyes (14x17)
    drawExpressiveAnimalMouth(ctx, 74 + lookX, 24 + lookY, 0.68, 0.05, pose, outline);
    drawGlossyAnimalEye(
      ctx,
      'left',
      38 + lookX * 0.85,
      -22 + lookY * 0.85,
      14,
      17,
      -0.08,
      pose,
      isPrawn ? IRIS_PALETTES.oceanBlue : IRIS_PALETTES.orchidPurple,
      cLight,
      cMid,
      outline,
    );
    drawGlossyAnimalEye(
      ctx,
      'right',
      98 + lookX * 0.85,
      -14 + lookY * 0.85,
      12,
      15,
      0.12,
      pose,
      isPrawn ? IRIS_PALETTES.oceanBlue : IRIS_PALETTES.orchidPurple,
      cLight,
      cMid,
      outline,
    );
    drawExpressiveAnimalBrows(ctx, 38 + lookX * 0.85, -44 + lookY * 0.85, 98 + lookX * 0.85, -34 + lookY * 0.85, 22, pose, outline, 3.2);

    // Near Cheliped Claw permanently socketed in foreground
    drawClaw(-1);
    ctx.restore();
  }

  /* ============================================================================
   * A21, A22, A26, A34: SCULPTED BONY FISH SPECIES (4 Distinct Silhouettes!)
   * ========================================================================== */
  function drawSculptedFishRig(
    ctx: CanvasRenderingContext2D,
    pose: TurtlePose,
    species: 'arowana' | 'featherback' | 'snakehead' | 'clownfish',
  ): void {
    const cfg = {
      arowana: {
        outline: '#381805',
        cLight: '#fff099',
        cMid: '#f5982e',
        cDark: '#b84a0e',
        finCol: '#ff5722',
        iris: IRIS_PALETTES.crimsonRed,
        rx: 172,
        ry: 74,
      },
      featherback: {
        outline: '#1a2430',
        cLight: '#f4f8fc',
        cMid: '#9eb3c7',
        cDark: '#4f6478',
        finCol: '#7f96ab',
        iris: IRIS_PALETTES.goldenHazel,
        rx: 174,
        ry: 86,
      },
      snakehead: {
        outline: '#0d211e',
        cLight: '#6ee7b7',
        cMid: '#0d9488',
        cDark: '#115e59',
        finCol: '#4f46e5',
        iris: IRIS_PALETTES.amber,
        rx: 184,
        ry: 64,
      },
      clownfish: {
        outline: '#2b1004',
        cLight: '#ff9e44',
        cMid: '#ff6d00',
        cDark: '#c43c00',
        finCol: '#ff851b',
        iris: IRIS_PALETTES.amber,
        rx: 146,
        ry: 88,
      },
    }[species];

    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    const tailY = Math.sin(pose.waveRaysPhase * 1.1) * 14 + pose.hindNearAngle * 24;

    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    // 1. Open-Rooted Dorsal & Anal Fins Drawn FIRST (aligned fill & stroke root coordinates!)
    const drawFinRays = (clipP: Path2D, col: string, xStart: number, xEnd: number, yBase: number, yTip: number, step = 14) => {
      ctx.save();
      ctx.clip(clipP);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.8;
      for (let fx = xStart; fx <= xEnd; fx += step) {
        ctx.beginPath();
        ctx.moveTo(fx, yBase);
        ctx.lineTo(fx - 12, yTip);
        ctx.stroke();
      }
      ctx.restore();
    };

    let dorsalOpenStroke: Path2D | null = null;
    let analOpenStroke: Path2D | null = null;

    if (species === 'featherback') {
      const featherDorsalFill = new Path2D();
      featherDorsalFill.moveTo(-40, -82);
      featherDorsalFill.bezierCurveTo(-54, -146, -12, -148, -4, -84);
      featherDorsalFill.closePath();
      dorsalOpenStroke = new Path2D();
      dorsalOpenStroke.moveTo(-40, -82);
      dorsalOpenStroke.bezierCurveTo(-54, -146, -12, -148, -4, -84);
      fillRimAndStroke(ctx, featherDorsalFill, -24, -60, -28, -148, cfg.cLight, cfg.finCol, cfg.cMid, cfg.outline, 3.2, dorsalOpenStroke);

      const knifeVentralFill = new Path2D();
      knifeVentralFill.moveTo(-166, 28);
      knifeVentralFill.bezierCurveTo(-128, 118, -12, 126, 52, 66);
      knifeVentralFill.closePath();
      analOpenStroke = new Path2D();
      analOpenStroke.moveTo(-166, 28);
      analOpenStroke.bezierCurveTo(-128, 118, -12, 126, 52, 66);
      fillRimAndStroke(ctx, knifeVentralFill, -60, 40, -60, 124, cfg.cMid, cfg.finCol, cfg.cDark, cfg.outline, 3.2, analOpenStroke);
      drawFinRays(knifeVentralFill, 'rgba(26, 36, 48, 0.35)', -152, 36, 44, 120, 14);
    } else if (species === 'snakehead') {
      const longDorsalFill = new Path2D();
      longDorsalFill.moveTo(-144, -16);
      longDorsalFill.bezierCurveTo(-112, -98, 28, -96, 76, -34);
      longDorsalFill.closePath();
      dorsalOpenStroke = new Path2D();
      dorsalOpenStroke.moveTo(-144, -16);
      dorsalOpenStroke.bezierCurveTo(-112, -98, 28, -96, 76, -34);
      fillRimAndStroke(ctx, longDorsalFill, -30, -20, -30, -98, cfg.cLight, cfg.finCol, '#818cf8', cfg.outline, 3.4, dorsalOpenStroke);
      drawFinRays(longDorsalFill, 'rgba(255,255,255,0.42)', -128, 60, -24, -92, 16);

      const longAnalFill = new Path2D();
      longAnalFill.moveTo(-140, 38);
      longAnalFill.bezierCurveTo(-104, 102, 4, 100, 38, 56);
      longAnalFill.closePath();
      analOpenStroke = new Path2D();
      analOpenStroke.moveTo(-140, 38);
      analOpenStroke.bezierCurveTo(-104, 102, 4, 100, 38, 56);
      fillRimAndStroke(ctx, longAnalFill, -50, 36, -50, 102, cfg.cMid, cfg.finCol, '#312e81', cfg.outline, 3.4, analOpenStroke);
    } else if (species === 'clownfish') {
      const reefDorsalFill = new Path2D();
      reefDorsalFill.moveTo(-104, -38);
      reefDorsalFill.bezierCurveTo(-84, -122, -28, -116, -12, -72);
      reefDorsalFill.bezierCurveTo(12, -120, 62, -112, 74, -44);
      reefDorsalFill.closePath();
      dorsalOpenStroke = new Path2D();
      dorsalOpenStroke.moveTo(-104, -38);
      dorsalOpenStroke.bezierCurveTo(-84, -122, -28, -116, -12, -72);
      dorsalOpenStroke.bezierCurveTo(12, -120, 62, -112, 74, -44);
      fillRimAndStroke(ctx, reefDorsalFill, -20, -30, -20, -120, cfg.cLight, cfg.finCol, cfg.cMid, cfg.outline, 4.8, dorsalOpenStroke);

      const reefAnalFill = new Path2D();
      reefAnalFill.moveTo(-86, 56);
      reefAnalFill.bezierCurveTo(-68, 114, -18, 112, -4, 68);
      reefAnalFill.closePath();
      analOpenStroke = new Path2D();
      analOpenStroke.moveTo(-86, 56);
      analOpenStroke.bezierCurveTo(-68, 114, -18, 112, -4, 68);
      fillRimAndStroke(ctx, reefAnalFill, -45, 50, -45, 114, cfg.cMid, cfg.finCol, cfg.cDark, cfg.outline, 4.8, analOpenStroke);
    } else {
      const aroDorsalFill = new Path2D();
      aroDorsalFill.moveTo(-148, -6);
      aroDorsalFill.bezierCurveTo(-140, -136, -54, -132, -8, -42);
      aroDorsalFill.closePath();
      dorsalOpenStroke = new Path2D();
      dorsalOpenStroke.moveTo(-148, -6);
      dorsalOpenStroke.bezierCurveTo(-140, -136, -54, -132, -8, -42);
      fillRimAndStroke(ctx, aroDorsalFill, -78, -22, -78, -136, cfg.cLight, cfg.finCol, '#fff3a1', cfg.outline, 3.5, dorsalOpenStroke);
      drawFinRays(aroDorsalFill, '#fde047', -136, -22, -16, -124, 14);

      const aroAnalFill = new Path2D();
      aroAnalFill.moveTo(-148, 28);
      aroAnalFill.bezierCurveTo(-136, 144, -42, 140, 6, 62);
      aroAnalFill.closePath();
      analOpenStroke = new Path2D();
      analOpenStroke.moveTo(-148, 28);
      analOpenStroke.bezierCurveTo(-136, 144, -42, 140, 6, 62);
      fillRimAndStroke(ctx, aroAnalFill, -70, 42, -70, 144, cfg.cMid, cfg.finCol, '#9a1f06', cfg.outline, 3.5, analOpenStroke);
      drawFinRays(aroAnalFill, '#fde047', -136, -6, 36, 132, 14);
    }

    // 1.5. Far Pectoral Fin Drawn BEHIND Body Layer (before bodyP) with aligned open root!
    const drawPectoralFin = (x: number, y: number, ang: number, scaleX = 1) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scaleX, 1);
      ctx.rotate(ang);
      const pecFin = new Path2D();
      const pecStroke = new Path2D();
      const len = species === 'arowana' ? -104 : -84;
      pecFin.moveTo(4, -10);
      pecFin.quadraticCurveTo(10, 1, 6, 12);
      pecFin.bezierCurveTo(2, 44, -52, 80, len + 16, 56);
      pecFin.bezierCurveTo(len, 8, -42, -32, 4, -10);
      pecFin.closePath();

      pecStroke.moveTo(4, -10);
      pecStroke.bezierCurveTo(-42, -32, len, 8, len + 16, 56);
      pecStroke.bezierCurveTo(-52, 80, 2, 44, 6, 12);
      fillRimAndStroke(
        ctx,
        pecFin,
        len,
        -28,
        16,
        68,
        cfg.cLight,
        cfg.finCol,
        cfg.cDark,
        cfg.outline,
        species === 'clownfish' ? 4.8 : 3.4,
        pecStroke,
      );
      ctx.save();
      ctx.clip(pecFin);
      ctx.strokeStyle = species === 'arowana' ? '#fde047' : 'rgba(255,255,255,0.48)';
      ctx.lineWidth = 1.6;
      for (const py of [12, 28, 44, 56]) {
        ctx.beginPath();
        ctx.moveTo(4, 2);
        ctx.lineTo(len + 12, py);
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
    };

    drawPectoralFin(44, 52, -0.32 - pose.farFlipperAngle * 0.35, -0.78);

    // 2. Unified Continuous Body + Swaying Caudal Tail Silhouette (zero peduncle seam or color jump!)
    const bodyP = new Path2D();
    if (species === 'featherback') {
      bodyP.moveTo(-158, -4);
      bodyP.bezierCurveTo(-122, -62, -56, -104, 12, -88);
      bodyP.bezierCurveTo(54, -78, 76, -38, 112, -22);
      bodyP.bezierCurveTo(148, -6, 162, 16, 144, 38);
      bodyP.bezierCurveTo(106, 78, -24, 88, -158, 38);
      bodyP.bezierCurveTo(-194, 46 + tailY * 0.7, -236, 38 + tailY, -242, 18 + tailY);
      bodyP.bezierCurveTo(-236, -2 + tailY, -194, -8 + tailY * 0.7, -158, -4);
      bodyP.closePath();
    } else if (species === 'arowana') {
      bodyP.moveTo(-142, -12);
      bodyP.bezierCurveTo(-88, -54, 48, -58, 134, -22);
      bodyP.bezierCurveTo(168, -6, 172, 24, 144, 48);
      bodyP.bezierCurveTo(88, 92, -64, 92, -142, 34);
      bodyP.bezierCurveTo(-176, 68 + tailY * 0.6, -238, 92 + tailY, -252, 42 + tailY);
      bodyP.bezierCurveTo(-266, 12 + tailY, -264, -22 + tailY, -248, -52 + tailY);
      bodyP.bezierCurveTo(-232, -86 + tailY, -174, -52 + tailY * 0.6, -142, -12);
      bodyP.closePath();
    } else if (species === 'snakehead') {
      bodyP.moveTo(-152, -10);
      bodyP.bezierCurveTo(-108, -48, 34, -52, 136, -24);
      bodyP.bezierCurveTo(178, -12, 184, 24, 146, 46);
      bodyP.bezierCurveTo(68, 78, -88, 78, -152, 34);
      bodyP.bezierCurveTo(-188, 64 + tailY * 0.6, -246, 82 + tailY, -258, 36 + tailY);
      bodyP.bezierCurveTo(-270, 8 + tailY, -268, -18 + tailY, -254, -46 + tailY);
      bodyP.bezierCurveTo(-238, -76 + tailY, -186, -46 + tailY * 0.6, -152, -10);
      bodyP.closePath();
    } else {
      bodyP.moveTo(-124, -12);
      bodyP.bezierCurveTo(-88, -78, 42, -82, 118, -24);
      bodyP.bezierCurveTo(148, 2, 144, 42, 112, 64);
      bodyP.bezierCurveTo(38, 98, -82, 92, -124, 34);
      bodyP.bezierCurveTo(-162, 66 + tailY * 0.6, -218, 56 + tailY, -220, 12 + tailY);
      bodyP.bezierCurveTo(-218, -34 + tailY, -162, -46 + tailY * 0.6, -124, -12);
      bodyP.closePath();
    }

    fillRimAndStroke(
      ctx,
      bodyP,
      168,
      -65,
      -255,
      85,
      cfg.cLight,
      cfg.cMid,
      cfg.finCol,
      cfg.outline,
      species === 'clownfish' ? 4.8 : 3.7,
    );

    ctx.save();
    ctx.clip(bodyP);
    ctx.strokeStyle = species === 'arowana' ? '#fde047' : 'rgba(255,255,255,0.48)';
    ctx.lineWidth = 1.8;
    for (const ry of [-42, -20, 0, 20, 42]) {
      ctx.beginPath();
      ctx.moveTo(-144, 10 + tailY * 0.25);
      ctx.lineTo(-238, ry + 10 + tailY);
      ctx.stroke();
    }

    if (species === 'clownfish') {
      for (const bx of [-98, -18, 54]) {
        const barP = new Path2D();
        barP.moveTo(bx - 18, -105);
        barP.quadraticCurveTo(bx + 8, 14, bx - 16, 125);
        barP.lineTo(bx + 18, 125);
        barP.quadraticCurveTo(bx + 36, 14, bx + 16, -105);
        barP.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill(barP);
        ctx.lineWidth = 6.5;
        ctx.strokeStyle = '#1a0d06';
        ctx.stroke(barP);
      }
    } else if (species === 'arowana') {
      for (let r = -1; r <= 1; r++) {
        for (let c = -3; c <= 2; c++) {
          const sx = c * 32 - 12 + (r % 2) * 14;
          const sy = r * 24 + 12;
          ctx.fillStyle = r === -1 ? 'rgba(255, 245, 158, 0.55)' : 'rgba(245, 152, 46, 0.35)';
          drawOvalSpot(ctx, sx, sy, 14, 11, 0);
          ctx.strokeStyle = 'rgba(255, 250, 215, 0.88)';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(sx, sy, 16, -0.95, 0.95);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
          drawOvalSpot(ctx, sx + 4, sy - 4, 4.5, 2.2, -0.3);
        }
      }
      ctx.strokeStyle = '#b84a0e';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.arc(48, 12, 36, 0.35, 1.35);
      ctx.stroke();
    } else if (species === 'featherback') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      drawOvalSpot(ctx, -18, -18, 96, 26, -0.08);
      for (const [ox, oy, r] of [
        [-136, 24, 9],
        [-108, 28, 10.5],
        [-78, 32, 12],
        [-46, 34, 12.5],
        [-14, 34, 11.5],
        [16, 32, 10],
        [44, 28, 8.5],
      ] as const) {
        ctx.fillStyle = '#ffffff';
        drawOvalSpot(ctx, ox, oy, r + 3.2, r + 3.2, 0);
        ctx.fillStyle = '#0f172a';
        drawOvalSpot(ctx, ox, oy, r, r, 0);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        drawOvalSpot(ctx, ox - 2, oy - 2, r * 0.28, r * 0.28, 0);
      }
    } else if (species === 'snakehead') {
      ctx.fillStyle = '#ecfdf5';
      drawOvalSpot(ctx, 0, 56, 146, 28, 0);
      ctx.fillStyle = 'rgba(30, 27, 75, 0.72)';
      for (let sx = -132; sx <= 36; sx += 32) {
        drawOvalSpot(ctx, sx, 2, 14, 52, 0.28);
      }
      ctx.fillStyle = 'rgba(13, 148, 136, 0.55)';
      for (let bx = -110; bx <= 50; bx += 22) {
        drawOvalSpot(ctx, bx, 44 + (bx % 2) * 4, 3.5, 2.2, 0);
      }
    }

    drawSoftCheekBlushes(ctx, 32, 26, 116, 30, 24, 14, pose.blushAlpha);
    ctx.restore();

    ctx.lineWidth = species === 'clownfish' ? 4.8 : 3.7;
    ctx.strokeStyle = cfg.outline;
    ctx.stroke(bodyP);
    if (dorsalOpenStroke) ctx.stroke(dorsalOpenStroke);
    if (analOpenStroke) ctx.stroke(analOpenStroke);

    // 4. Near Pectoral Fin permanently socketed behind the gill operculum, waving at a 120° rear-upper offset away from the head!
    drawPectoralFin(
      -22,
      38,
      pose.nearFlipperAngle * (0.4 + 0.22 * waveAmt) + 0.18 + waveAmt * 0.68,
    );

    // 5. Eyes, Mouth & Asian Arowana Jaw-Tip Barbels (嘴须子 attached directly to mouth!)
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;
    const mouthX = (species === 'arowana' ? 112 : 84) + lookX;
    const mouthY = (species === 'arowana' ? 28 : 38) + lookY;
    const mouthScale = species === 'arowana' ? 0.58 : 0.82;

    drawExpressiveAnimalMouth(ctx, mouthX, mouthY, mouthScale, species === 'arowana' ? -0.12 : 0.06, pose, cfg.outline);

    if (species === 'arowana') {
      const barbelSway = Math.sin(pose.waveRaysPhase * 1.4) * 4;
      ctx.strokeStyle = '#ff3d00';
      ctx.lineWidth = 4.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(mouthX + 14, mouthY + 2);
      ctx.quadraticCurveTo(mouthX + 42, mouthY + 10 + barbelSway, mouthX + 58, mouthY + 26 + barbelSway);
      ctx.moveTo(mouthX + 8, mouthY + 6);
      ctx.quadraticCurveTo(mouthX + 32, mouthY + 18 + barbelSway, mouthX + 44, mouthY + 34 + barbelSway);
      ctx.stroke();
    }

    const fishEyeRxL = species === 'clownfish' ? 16.5 : species === 'arowana' ? 15.5 : 12;
    const fishEyeRyL = species === 'clownfish' ? 19.5 : species === 'arowana' ? 18 : 14;
    const fishEyeRxR = species === 'clownfish' ? 14 : species === 'arowana' ? 13 : 10;
    const fishEyeRyR = species === 'clownfish' ? 16.5 : species === 'arowana' ? 15.5 : 12;

    drawGlossyAnimalEye(
      ctx,
      'left',
      46 + lookX * 0.85,
      -10 + lookY * 0.85,
      fishEyeRxL,
      fishEyeRyL,
      -0.08,
      pose,
      cfg.iris,
      cfg.cLight,
      cfg.cMid,
      cfg.outline,
    );
    drawGlossyAnimalEye(
      ctx,
      'right',
      114 + lookX * 0.85,
      -4 + lookY * 0.85,
      fishEyeRxR,
      fishEyeRyR,
      0.12,
      pose,
      cfg.iris,
      cfg.cLight,
      cfg.cMid,
      cfg.outline,
    );
    drawExpressiveAnimalBrows(ctx, 46 + lookX * 0.85, -34 + lookY * 0.85, 114 + lookX * 0.85, -26 + lookY * 0.85, 22, pose, cfg.outline, 3.2);
    ctx.restore();
  }

  /* ============================================================================
   * A27, A31, A32: MARINE MAMMALS (3 Distinct Silhouettes & Head Structures!)
   * Upgraded per User Critique:
   * - Dugong snout (A27) and Pink Dolphin rostrum beak (A31) are sculpted
   *   DIRECTLY into the unified `bodyP` contour (ZERO separate pasted snout/beak
   *   polygons and ZERO overlapping lines near the eyes!).
   * - Aligned flipper fill/stroke roots so zero unstroked corners ever stick out.
   * ========================================================================== */
  function drawMarineMammalRig(
    ctx: CanvasRenderingContext2D,
    pose: TurtlePose,
    species: 'dugong' | 'pink_dolphin' | 'false_killer_whale',
  ): void {
    const cfg = {
      dugong: {
        outline: '#2b221e',
        cLight: '#ccb9ae',
        cMid: '#9e897d',
        cDark: '#6e5c52',
        belly: '#e6d8cf',
        iris: IRIS_PALETTES.warmBrown,
      },
      pink_dolphin: {
        outline: '#421828',
        cLight: '#ffc8d8',
        cMid: '#f48fb1',
        cDark: '#c2597d',
        belly: '#fff0f5',
        iris: IRIS_PALETTES.oceanBlue,
      },
      false_killer_whale: {
        outline: '#0b0f17',
        cLight: '#4b5563',
        cMid: '#272e38',
        cDark: '#11161d',
        belly: '#cbd5e1',
        iris: IRIS_PALETTES.amber,
      },
    }[species];

    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    const flukeY = Math.sin(pose.waveRaysPhase * 0.95) * 14 + pose.hindNearAngle * 24;
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    // 0. Far Pectoral Flipper Drawn BEHIND Body Layer (before bodyP) with aligned open root!
    const drawFlipper = (x: number, y: number, ang: number, scaleX = 1) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scaleX, 1);
      ctx.rotate(ang);
      const flipFill = new Path2D();
      const flipStroke = new Path2D();
      if (species === 'false_killer_whale') {
        flipFill.moveTo(4, -10);
        flipFill.quadraticCurveTo(10, 0, 4, 12);
        flipFill.quadraticCurveTo(-72, 68, -116, 48);
        flipFill.quadraticCurveTo(-92, -14, -56, -18);
        flipFill.lineTo(4, -10);
        flipFill.closePath();

        flipStroke.moveTo(4, -10);
        flipStroke.lineTo(-56, -18);
        flipStroke.quadraticCurveTo(-92, -14, -116, 48);
        flipStroke.quadraticCurveTo(-72, 68, 4, 12);
      } else {
        flipFill.moveTo(4, -10);
        flipFill.quadraticCurveTo(10, 0, 4, 12);
        flipFill.bezierCurveTo(4, 48, -72, 86, -104, 64);
        flipFill.bezierCurveTo(-118, 12, -48, -28, 4, -10);
        flipFill.closePath();

        flipStroke.moveTo(4, -10);
        flipStroke.bezierCurveTo(-48, -28, -118, 12, -104, 64);
        flipStroke.bezierCurveTo(-72, 86, 4, 48, 4, 12);
      }
      fillRimAndStroke(ctx, flipFill, -114, -20, 16, 70, cfg.cLight, cfg.cMid, cfg.cDark, cfg.outline, 3.5, flipStroke);
      ctx.save();
      ctx.clip(flipFill);
      ctx.strokeStyle = 'rgba(255,255,255,0.32)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-88, 38);
      ctx.moveTo(0, 6);
      ctx.lineTo(-76, 52);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    };

    drawFlipper(42, 56, -0.32 - pose.farFlipperAngle * 0.35, -0.78);

    // 1. Unified Continuous Hydrodynamic Cetacean / Sirenia Body + Snout/Rostrum + Dorsal Fin + Flukes!
    const bodyP = new Path2D();
    if (species === 'false_killer_whale') {
      bodyP.moveTo(-148, 22);
      bodyP.bezierCurveTo(-124, -18, -96, -34, -74, -44);
      bodyP.quadraticCurveTo(-42, -154, -104, -138);
      bodyP.quadraticCurveTo(-72, -84, -14, -52);
      bodyP.bezierCurveTo(54, -76, 114, -56, 142, -22);
      bodyP.bezierCurveTo(176, 4, 158, 58, 102, 74);
      bodyP.bezierCurveTo(18, 98, -98, 86, -148, 48);
      bodyP.bezierCurveTo(-188, 66 + flukeY * 0.6, -242, 92 + flukeY, -264, 58 + flukeY);
      bodyP.quadraticCurveTo(-234, 34 + flukeY, -268, 8 + flukeY);
      bodyP.bezierCurveTo(-248, -26 + flukeY, -188, 4 + flukeY * 0.6, -148, 22);
      bodyP.closePath();
    } else if (species === 'dugong') {
      bodyP.moveTo(-148, 24);
      bodyP.bezierCurveTo(-116, -66, 28, -78, 116 + lookX * 0.5, -24 + lookY * 0.4);
      bodyP.bezierCurveTo(154 + lookX * 0.8, 0 + lookY * 0.6, 166 + lookX * 0.9, 44 + lookY * 0.8, 142 + lookX * 0.8, 72 + lookY * 0.8);
      bodyP.bezierCurveTo(118 + lookX * 0.6, 94 + lookY * 0.6, 78, 92, 42, 86);
      bodyP.bezierCurveTo(-12, 106, -104, 96, -148, 52);
      bodyP.bezierCurveTo(-188, 72 + flukeY * 0.6, -244, 96 + flukeY, -264, 60 + flukeY);
      bodyP.quadraticCurveTo(-232, 36 + flukeY, -268, 10 + flukeY);
      bodyP.bezierCurveTo(-248, -24 + flukeY, -188, 6 + flukeY * 0.6, -148, 24);
      bodyP.closePath();
    } else {
      bodyP.moveTo(-148, 22);
      bodyP.bezierCurveTo(-124, -12, -106, -24, -92, -32);
      bodyP.bezierCurveTo(-68, -96, -48, -118, -82, -108);
      bodyP.bezierCurveTo(-44, -88, -18, -62, 12, -48);
      bodyP.bezierCurveTo(64, -70, 112, -46, 128 + lookX * 0.6, -6 + lookY * 0.5);
      bodyP.bezierCurveTo(164 + lookX * 0.85, 2 + lookY * 0.7, 188 + lookX * 0.95, 14 + lookY * 0.8, 184 + lookX * 0.95, 28 + lookY * 0.8);
      bodyP.bezierCurveTo(176 + lookX * 0.85, 42 + lookY * 0.7, 138 + lookX * 0.6, 44 + lookY * 0.5, 106, 66);
      bodyP.bezierCurveTo(32, 102, -102, 88, -148, 50);
      bodyP.bezierCurveTo(-188, 68 + flukeY * 0.6, -242, 92 + flukeY, -264, 58 + flukeY);
      bodyP.quadraticCurveTo(-234, 34 + flukeY, -268, 8 + flukeY);
      bodyP.bezierCurveTo(-248, -26 + flukeY, -188, 4 + flukeY * 0.6, -148, 22);
      bodyP.closePath();
    }
    fillRimAndStroke(ctx, bodyP, -180, -85, 175, 108, cfg.cLight, cfg.cMid, cfg.cDark, cfg.outline, 3.7);

    ctx.save();
    ctx.clip(bodyP);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.6;
    for (const fy of [14, 34, 54]) {
      ctx.beginPath();
      ctx.moveTo(-152, 36 + flukeY * 0.3);
      ctx.lineTo(-248, fy + flukeY);
      ctx.stroke();
    }
    ctx.fillStyle = cfg.belly;
    if (species === 'false_killer_whale') {
      drawOvalSpot(ctx, 14, 72, 96, 32, -0.04);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (const bx of [-42, -12, 18, 48]) {
        drawOvalSpot(ctx, bx, 64, 4, 2.5, 0);
      }
    } else {
      drawOvalSpot(ctx, 16, 74, 122, 48, -0.05);
      if (species === 'dugong') {
        drawOvalSpot(ctx, 124 + lookX * 0.75, 48 + lookY * 0.75, 36, 28, 0.2);
        ctx.strokeStyle = '#5c4b42';
        ctx.lineWidth = 2.0;
        for (const [wx, wy] of [
          [104, 50],
          [118, 56],
          [134, 52],
          [146, 44],
        ]) {
          ctx.beginPath();
          ctx.moveTo(wx + lookX * 0.8, wy + lookY * 0.8);
          ctx.lineTo(wx + lookX * 0.8 - 3, wy + lookY * 0.8 + 8);
          ctx.stroke();
        }
      }
      ctx.fillStyle = species === 'pink_dolphin' ? 'rgba(194, 89, 125, 0.35)' : 'rgba(110, 92, 82, 0.32)';
      for (const [dx, dy] of [
        [-64, 56],
        [-32, 64],
        [0, 62],
        [34, 66],
        [-48, 48],
      ]) {
        drawOvalSpot(ctx, dx, dy, 4.5, 3.0, -0.1);
      }
    }
    drawSoftCheekBlushes(ctx, 18, 26, 98, 30, 24, 13, pose.blushAlpha);
    ctx.restore();
    ctx.lineWidth = 3.7;
    ctx.strokeStyle = cfg.outline;
    ctx.stroke(bodyP);

    // 4. Near Pectoral Flipper permanently socketed on flank behind head, waving at a 120° rear-upper offset away from the snout!
    drawFlipper(
      -28,
      42,
      pose.nearFlipperAngle * (0.4 + 0.22 * waveAmt) + 0.2 + waveAmt * 0.68,
    );

    // 5. Calibrated Marine Mammal Eyes: Small gentle Dugong eyes (10.5x12 / 9x10.5) & sleek Cetacean eyes (11.5x13.5 / 10x11.5)
    const mmEyeRxL = species === 'dugong' ? 10.5 : 11.5;
    const mmEyeRyL = species === 'dugong' ? 12 : 13.5;
    const mmEyeRxR = species === 'dugong' ? 9 : 10;
    const mmEyeRyR = species === 'dugong' ? 10.5 : 11.5;
    drawExpressiveAnimalMouth(ctx, 72 + lookX, 42 + lookY, 0.84, 0.08, pose, cfg.outline);
    drawGlossyAnimalEye(ctx, 'left', 26 + lookX * 0.85, -10 + lookY * 0.85, mmEyeRxL, mmEyeRyL, -0.08, pose, cfg.iris, cfg.cLight, cfg.cMid, cfg.outline);
    drawGlossyAnimalEye(ctx, 'right', 92 + lookX * 0.85, -4 + lookY * 0.85, mmEyeRxR, mmEyeRyR, 0.12, pose, cfg.iris, cfg.cLight, cfg.cMid, cfg.outline);
    drawExpressiveAnimalBrows(ctx, 26 + lookX * 0.85, -28 + lookY * 0.85, 92 + lookX * 0.85, -22 + lookY * 0.85, 20, pose, cfg.outline, 3.2);
    ctx.restore();
  }

  /* ============================================================================
   * A30 & A33: SHARK SPECIES (Whale Shark vs Blacktip Reef Shark)
   * Upgraded per User Critique:
   * - 100% Continuous caudal tail & open-base dorsal/pectoral fins.
   * - Far pectoral fin layered BEHIND body so it never overlaps the mouth/chin.
   * - Realistic smaller shark eyes (12x14 for whale shark, 14x16 for blacktip).
   * ========================================================================== */
  function drawSharkRig(
    ctx: CanvasRenderingContext2D,
    pose: TurtlePose,
    species: 'whale_shark' | 'blacktip',
  ): void {
    const isWhale = species === 'whale_shark';
    const outline = isWhale ? '#0c1e33' : '#1c242b';
    const cLight = isWhale ? '#38bdf8' : '#a8b8c4';
    const cMid = isWhale ? '#0284c7' : '#64748b';
    const cDark = isWhale ? '#0c4a6e' : '#334155';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    const tailY = Math.sin(pose.waveRaysPhase * 1.0) * 15 + pose.hindNearAngle * 26;

    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    // 0. Far Pectoral Fin Drawn BEHIND Body Layer (before bodyP) so it never overlaps the mouth or chin!
    const drawSharkPectoral = (x: number, y: number, ang: number, scaleX = 1) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scaleX, 1);
      ctx.rotate(ang);
      const pecP = new Path2D();
      const pecStroke = new Path2D();
      pecP.moveTo(4, -10);
      pecP.quadraticCurveTo(14, 1, 4, 12);
      pecP.bezierCurveTo(4, 48, -78, 86, -116, 68);
      pecP.bezierCurveTo(-132, 14, -52, -32, 4, -10);
      pecP.closePath();

      pecStroke.moveTo(4, -10);
      pecStroke.bezierCurveTo(-52, -32, -132, 14, -116, 68);
      pecStroke.bezierCurveTo(-78, 86, 4, 48, 4, 12);
      fillRimAndStroke(ctx, pecP, -124, -25, 16, 75, cLight, cMid, cDark, outline, 3.5, pecStroke);
      ctx.save();
      ctx.clip(pecP);
      if (!isWhale) {
        ctx.fillStyle = '#090d14';
        drawOvalSpot(ctx, -106, 54, 28, 28, 0);
      } else {
        ctx.fillStyle = '#ffffff';
        for (const [px, py] of [
          [-42, 16],
          [-68, 28],
          [-88, 44],
        ]) {
          drawOvalSpot(ctx, px, py, 4.5, 4.5, 0);
        }
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-96, 42);
      ctx.moveTo(0, 6);
      ctx.lineTo(-82, 58);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    };

    drawSharkPectoral(44, 56, -0.32 - pose.farFlipperAngle * 0.35, -0.78);

    const bodyP = new Path2D();
    if (isWhale) {
      bodyP.moveTo(-152, -2);
      bodyP.quadraticCurveTo(-136, -52, -116, -22);
      bodyP.bezierCurveTo(-104, -30, -96, -36, -86, -42);
      bodyP.bezierCurveTo(-72, -134, -22, -130, -8, -54);
      bodyP.bezierCurveTo(54, -68, 114, -52, 148, -26);
      bodyP.bezierCurveTo(178, -6, 176, 42, 134, 68);
      bodyP.bezierCurveTo(48, 102, -88, 86, -152, 36);
      bodyP.bezierCurveTo(-188, 66 + tailY * 0.6, -238, 96 + tailY, -256, 56 + tailY);
      bodyP.bezierCurveTo(-244, 28 + tailY, -236, 14 + tailY, -248, -4 + tailY);
      bodyP.bezierCurveTo(-268, -46 + tailY, -242, -92 + tailY, -198, -52 + tailY * 0.7);
      bodyP.bezierCurveTo(-176, -32 + tailY * 0.4, -162, -12, -152, -2);
      bodyP.closePath();
    } else {
      bodyP.moveTo(-152, 0);
      bodyP.quadraticCurveTo(-136, -48, -116, -18);
      bodyP.bezierCurveTo(-100, -28, -84, -36, -68, -42);
      bodyP.quadraticCurveTo(-36, -158, -104, -142);
      bodyP.quadraticCurveTo(-68, -82, -6, -48);
      bodyP.bezierCurveTo(58, -56, 118, -32, 164, 4);
      bodyP.bezierCurveTo(124, 78, -64, 88, -152, 34);
      bodyP.bezierCurveTo(-188, 64 + tailY * 0.6, -236, 92 + tailY, -254, 52 + tailY);
      bodyP.bezierCurveTo(-242, 24 + tailY, -234, 12 + tailY, -246, -6 + tailY);
      bodyP.bezierCurveTo(-266, -48 + tailY, -240, -90 + tailY, -196, -50 + tailY * 0.7);
      bodyP.bezierCurveTo(-174, -30 + tailY * 0.4, -162, -10, -152, 0);
      bodyP.closePath();
    }
    fillRimAndStroke(ctx, bodyP, -220, -110, 166, 98, cLight, cMid, cDark, outline, 3.7);

    ctx.save();
    ctx.clip(bodyP);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.6;
    for (const ty of [-46, -18, 22, 48]) {
      ctx.beginPath();
      ctx.moveTo(-154, 16 + tailY * 0.25);
      ctx.lineTo(-238, ty + tailY);
      ctx.stroke();
    }

    ctx.fillStyle = '#f8fafc';
    drawOvalSpot(ctx, 18, 68, 144, 44, -0.04);
    ctx.fillStyle = isWhale ? 'rgba(2, 132, 199, 0.28)' : 'rgba(100, 116, 139, 0.28)';
    for (let bx = -84; bx <= 64; bx += 26) {
      drawOvalSpot(ctx, bx, 60 + (bx % 2) * 4, 3.5, 2.2, 0);
    }

    if (isWhale) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.lineWidth = 2.2;
      for (let gx = -134; gx <= 106; gx += 30) {
        const yBottom = gx <= 18 ? 22 : -34;
        ctx.beginPath();
        ctx.moveTo(gx, -78);
        ctx.lineTo(gx - 6, yBottom);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-148, -22);
      ctx.quadraticCurveTo(-20, -48, 116, -38);
      ctx.moveTo(-148, -2);
      ctx.lineTo(18, -14);
      ctx.moveTo(-144, 16);
      ctx.lineTo(14, 10);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      for (let sx = -138; sx <= 110; sx += 24) {
        for (let sy = -54; sy <= 14; sy += 18) {
          const px = sx + (Math.abs(sy) % 4) * 3;
          const py = sy;
          if (px > 22 && py > -34) continue;
          drawOvalSpot(ctx, px, py, 4.8, 4.8, 0);
        }
      }
      for (const [dx, dy] of [
        [-56, -96],
        [-40, -80],
        [-64, -72],
        [-212, -32 + tailY],
        [-228, -48 + tailY],
        [-196, -14 + tailY],
        [-216, 36 + tailY],
      ]) {
        drawOvalSpot(ctx, dx, dy, 4.5, 4.5, 0);
      }
    } else {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-104, 24);
      ctx.lineTo(18, 14);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-110, -124, 78, 16);
      ctx.fillStyle = '#090d14';
      ctx.fillRect(-110, -160, 78, 38);
      ctx.fillRect(-270, -98 + tailY, 48, 175);
    }

    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.6;
    const gillStartX = isWhale ? -22 : -12;
    for (let g = 0; g < 5; g++) {
      const gx = gillStartX + g * 7;
      ctx.beginPath();
      ctx.moveTo(gx, -2);
      ctx.quadraticCurveTo(gx - 3, 14, gx, 26);
      ctx.stroke();
    }

    drawSoftCheekBlushes(ctx, isWhale ? 56 : 24, 28, isWhale ? 136 : 114, 34, 24, 14, pose.blushAlpha);
    ctx.restore();

    ctx.lineWidth = 3.7;
    ctx.strokeStyle = outline;
    ctx.stroke(bodyP);

    // 4. Near Pectoral Fin permanently socketed behind gills on flank, waving at a 120° rear-upper offset away from the snout!
    drawSharkPectoral(
      -32,
      42,
      pose.nearFlipperAngle * (0.4 + 0.22 * waveAmt) + 0.18 + waveAmt * 0.68,
    );

    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;
    const leftEyeX = (isWhale ? 64 : 32) + lookX * 0.85;
    const leftEyeY = (isWhale ? 2 : -10) + lookY * 0.85;
    const rightEyeX = (isWhale ? 132 : 112) + lookX * 0.85;
    const rightEyeY = (isWhale ? 6 : -2) + lookY * 0.85;
    const mouthX = (isWhale ? 98 : 72) + lookX;
    const mouthY = (isWhale ? 46 : 44) + lookY;

    drawExpressiveAnimalMouth(ctx, mouthX, mouthY, isWhale ? 1.04 : 0.84, 0.08, pose, outline);
    drawGlossyAnimalEye(
      ctx,
      'left',
      leftEyeX,
      leftEyeY,
      isWhale ? 10 : 12.5,
      isWhale ? 11.5 : 14.5,
      -0.06,
      pose,
      isWhale ? IRIS_PALETTES.oceanBlue : IRIS_PALETTES.goldenHazel,
      cLight,
      cMid,
      outline,
    );
    drawGlossyAnimalEye(
      ctx,
      'right',
      rightEyeX,
      rightEyeY,
      isWhale ? 8.5 : 10.5,
      isWhale ? 10 : 12.5,
      0.1,
      pose,
      isWhale ? IRIS_PALETTES.oceanBlue : IRIS_PALETTES.goldenHazel,
      cLight,
      cMid,
      outline,
    );
    drawExpressiveAnimalBrows(
      ctx,
      leftEyeX,
      leftEyeY - 20,
      rightEyeX,
      rightEyeY - 18,
      20,
      pose,
      outline,
      3.2,
    );
    ctx.restore();
  }

  /* ============================================================================
   * A35: GIANT CLAM (Tridacna gigas)
   * ========================================================================== */
  function drawGiantClamRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#261e14';
    const shellLight = '#fff7e0';
    const shellMid = '#e6ce9c';
    const shellDark = '#b8985d';

    const lowerShell = new Path2D();
    lowerShell.moveTo(-162, 22);
    lowerShell.bezierCurveTo(-152, 132, 152, 132, 162, 22);
    lowerShell.closePath();
    fillRimAndStroke(ctx, lowerShell, -155, 22, 155, 130, shellLight, shellMid, shellDark, outline, 3.7);
    ctx.save();
    ctx.clip(lowerShell);
    ctx.strokeStyle = 'rgba(138, 104, 48, 0.35)';
    ctx.lineWidth = 2.4;
    for (const rx of [-96, -48, 0, 48, 96]) {
      ctx.beginPath();
      ctx.moveTo(rx * 0.4, 118);
      ctx.lineTo(rx, 24);
      ctx.stroke();
    }
    ctx.restore();

    const mantle = new Path2D();
    mantle.ellipse(0, 18, 142, 66, 0, 0, Math.PI * 2);
    fillRimAndStroke(ctx, mantle, -140, -48, 140, 84, '#48dbfb', '#0abde3', '#192a56', '#0c2461', 3.6);
    ctx.save();
    ctx.clip(mantle);
    ctx.fillStyle = '#7ef9ff';
    for (const mx of [-104, -76, 76, 104]) {
      drawOvalSpot(ctx, mx, 18, 7, 5, 0);
    }
    ctx.restore();

    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;
    drawSoftCheekBlushes(ctx, -64 + lookX * 0.8, 32 + lookY * 0.8, 64 + lookX * 0.8, 32 + lookY * 0.8, 24, 14, pose.blushAlpha);
    drawExpressiveAnimalMouth(ctx, 0 + lookX, 42 + lookY, 0.84, 0.04, pose, '#0c2461');
    drawGlossyAnimalEye(ctx, 'left', -42 + lookX * 0.85, 8 + lookY * 0.85, 15, 18, -0.06, pose, IRIS_PALETTES.emerald, '#48dbfb', '#0abde3', '#0c2461');
    drawGlossyAnimalEye(ctx, 'right', 42 + lookX * 0.85, 8 + lookY * 0.85, 15, 18, 0.06, pose, IRIS_PALETTES.emerald, '#48dbfb', '#0abde3', '#0c2461');

    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);

    // Phase 1 Alternative Gesture for Sessile Giant Clam (A35):
    // Upper fluted valve rocks open toward the -120° rear-upper angle while the iridescent exhalant siphon
    // waves and emits shimmering pearl bubble rings along the -120° vector away from its gaze!
    if (waveAmt > 0.05) {
      ctx.save();
      const siphonOsc = Math.sin(pose.waveRaysPhase * 1.6) * 0.22 * waveAmt;
      ctx.translate(-74, -18);
      ctx.rotate(-0.52 + siphonOsc);
      const siphonP = new Path2D();
      siphonP.moveTo(-16, 12);
      siphonP.quadraticCurveTo(-24, -22, -14, -44 * waveAmt);
      siphonP.quadraticCurveTo(0, -52 * waveAmt, 14, -44 * waveAmt);
      siphonP.quadraticCurveTo(22, -22, 16, 12);
      siphonP.closePath();
      fillRimAndStroke(ctx, siphonP, -22, -48, 22, 12, '#7ef9ff', '#0abde3', '#192a56', '#0c2461', 3.0);
      // Shimmering pearl bubble rings rising along the -120° vector
      for (let b = 0; b < 3; b++) {
        const bProg = ((pose.waveRaysPhase * 0.4 + b * 0.33) % 1);
        const bx = -18 - bProg * 48;
        const by = -48 * waveAmt - bProg * 68;
        const br = (5 + b * 2.5) * waveAmt;
        ctx.fillStyle = 'rgba(224, 247, 250, 0.78)';
        ctx.strokeStyle = '#0abde3';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(0, -14 - waveAmt * 12);
    ctx.rotate(pose.headRot * 0.5 - waveAmt * 0.24 + pose.nearFlipperAngle * 0.16 * waveAmt - Math.abs(Math.sin(pose.waveRaysPhase * 0.6)) * 0.08);
    const upperShell = new Path2D();
    upperShell.moveTo(-162, 0);
    upperShell.bezierCurveTo(-156, -134, -78, -108, -56, -136);
    upperShell.bezierCurveTo(-24, -108, 24, -108, 56, -136);
    upperShell.bezierCurveTo(78, -108, 156, -134, 162, 0);
    upperShell.closePath();
    fillRimAndStroke(ctx, upperShell, -155, -134, 155, 0, shellLight, shellMid, shellDark, outline, 3.7);
    ctx.save();
    ctx.clip(upperShell);
    ctx.strokeStyle = 'rgba(138, 104, 48, 0.35)';
    ctx.lineWidth = 2.4;
    for (const rx of [-96, -48, 0, 48, 96]) {
      ctx.beginPath();
      ctx.moveTo(rx * 0.35, -8);
      ctx.lineTo(rx, -124);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  /* ============================================================================
   * A36: BLUESPOTTED FANTAIL RAY (Taeniura lymma)
   * ========================================================================== */
  function drawBluespottedRayRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#261e0a';
    const cLight = '#f2ce5f';
    const cMid = '#c79928';
    const cDark = '#8f6810';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    // Phase 1: Bluespotted Ray waves its ribbontail and rear-upper pectoral wing at a 120° offset away from the head
    const tailSway =
      Math.sin(pose.waveRaysPhase * 0.95) * 0.14 +
      pose.hindNearAngle * 0.65 +
      waveAmt * (0.48 + pose.nearFlipperAngle * 0.32);

    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    ctx.save();
    ctx.translate(-162, 18);
    ctx.rotate(tailSway);
    const tailFill = new Path2D();
    tailFill.moveTo(6, -9);
    tailFill.bezierCurveTo(-56, 4, -142, 42, -186, 86);
    tailFill.bezierCurveTo(-198, 98, -182, 118, -158, 108);
    tailFill.bezierCurveTo(-108, 84, -38, 42, 6, 10);
    tailFill.closePath();

    const tailStroke = new Path2D();
    tailStroke.moveTo(6, -9);
    tailStroke.bezierCurveTo(-56, 4, -142, 42, -186, 86);
    tailStroke.bezierCurveTo(-198, 98, -182, 118, -158, 108);
    tailStroke.bezierCurveTo(-108, 84, -38, 42, 6, 10);
    fillRimAndStroke(ctx, tailFill, -195, -12, 24, 114, cLight, cMid, cDark, outline, 3.5, tailStroke);

    ctx.save();
    ctx.clip(tailFill);
    ctx.strokeStyle = '#00b0ff';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(8, -4);
    ctx.bezierCurveTo(-54, 12, -128, 48, -176, 92);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    drawOvalSpot(ctx, -176, 98, 16, 10, -0.5);
    ctx.restore();
    ctx.restore();

    const disc = new Path2D();
    disc.moveTo(-162, 8);
    disc.bezierCurveTo(-136, -92, 24, -102, 146, -24);
    disc.bezierCurveTo(182, 0, 178, 38, 138, 64);
    disc.bezierCurveTo(44, 118, -118, 108, -162, 28);
    disc.closePath();

    const discStroke = new Path2D();
    discStroke.moveTo(-162, 8);
    discStroke.bezierCurveTo(-136, -92, 24, -102, 146, -24);
    discStroke.bezierCurveTo(182, 0, 178, 38, 138, 64);
    discStroke.bezierCurveTo(44, 118, -118, 108, -162, 28);
    fillRimAndStroke(ctx, disc, -165, -96, 175, 112, cLight, cMid, cDark, outline, 3.7, discStroke);

    ctx.save();
    ctx.clip(disc);
    ctx.fillStyle = '#fff8dc';
    drawOvalSpot(ctx, 18, 82, 128, 34, -0.04);
    ctx.strokeStyle = 'rgba(143, 104, 16, 0.25)';
    ctx.lineWidth = 1.6;
    for (let rx = -110; rx <= 60; rx += 34) {
      ctx.beginPath();
      ctx.moveTo(rx, -10);
      ctx.lineTo(rx - 22, -88);
      ctx.stroke();
    }

    for (const [bx, by, br] of [
      [-116, -16, 12],
      [-76, -44, 10.5],
      [-88, 22, 13],
      [-44, 46, 11],
      [-18, -58, 10.5],
      [28, -54, 9.5],
      [98, 36, 11],
      [-132, 20, 9.5],
    ] as const) {
      ctx.fillStyle = '#0c2461';
      drawOvalSpot(ctx, bx, by, br + 2.2, (br + 2.2) * 0.78, 0.15);
      ctx.fillStyle = '#00b0ff';
      drawOvalSpot(ctx, bx, by, br, br * 0.78, 0.15);
      // Vivid electric specular core in blue ocelli
      ctx.fillStyle = '#e0f2fe';
      drawOvalSpot(ctx, bx - 1.2, by - 1.0, br * 0.42, br * 0.32, 0.15);
    }
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;
    drawSoftCheekBlushes(ctx, -28 + lookX * 0.8, 32 + lookY * 0.8, 84 + lookX * 0.8, 36 + lookY * 0.8, 24, 14, pose.blushAlpha);
    ctx.restore();

    ctx.lineWidth = 3.7;
    ctx.strokeStyle = outline;
    ctx.stroke(discStroke);

    const lookX2 = pose.headLookX * 14;
    const lookY2 = pose.headLookY * 10;
    drawExpressiveAnimalMouth(ctx, 32 + lookX2, 46 + lookY2, 0.85, 0.06, pose, outline);
    drawGlossyAnimalEye(ctx, 'left', -14 + lookX2 * 0.85, -8 + lookY2 * 0.85, 14, 17, -0.08, pose, IRIS_PALETTES.oceanBlue, cLight, cMid, outline);
    drawGlossyAnimalEye(ctx, 'right', 74 + lookX2 * 0.85, -2 + lookY2 * 0.85, 12, 15, 0.1, pose, IRIS_PALETTES.oceanBlue, cLight, cMid, outline);
    drawExpressiveAnimalBrows(ctx, -14 + lookX2 * 0.85, -32 + lookY2 * 0.85, 74 + lookX2 * 0.85, -24 + lookY2 * 0.85, 22, pose, outline, 3.4);
    ctx.restore();
  }

  /* ============================================================================
   * A37 & A39: CEPHALOPODS (Coconut Octopus & Pharaoh Cuttlefish)
   * Rebuilt per User Critique:
   * - Tentacles/arms radiate and curl in DIFFERENT directions and are deeply
   *   embedded ("嵌入") into the lower mantle skirt with open roots.
   * - Realistic smaller cephalopod eyes (18x21 and 16x19).
   * ========================================================================== */
  function drawCephalopodRig(
    ctx: CanvasRenderingContext2D,
    pose: TurtlePose,
    species: 'octopus' | 'cuttlefish',
  ): void {
    const isOcto = species === 'octopus';
    const outline = isOcto ? '#2b1018' : '#26142e';
    const cLight = isOcto ? '#ff9478' : '#ffd166';
    const cMid = isOcto ? '#e0533c' : '#d97724';
    const cDark = isOcto ? '#992518' : '#7c2d12';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);

    // Entire cephalopod (mantle, interbrachial web skirt, and all 8 arms/tentacles) is drawn inside
    // ONE unified coordinate transform so tentacles NEVER detach or lag behind the head/mantle!
    ctx.save();
    ctx.translate(8 + pose.headX, -24 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    // 8 Tentacles / Arms (2 back-layer arms + 6 front-layer arms deeply rooted into the mantle web skirt!)
    const TENTACLE_SPECS = [
      // Back-layer arms (drawn behind the interbrachial skirt)
      { baseX: -102, baseY: 38, baseAngle: 0.92, curlDir: -1 as const, lenScale: 0.92, isBack: true },
      { baseX: 104, baseY: 38, baseAngle: -0.94, curlDir: 1 as const, lenScale: 0.92, isBack: true },
      // Front-layer arms (deeply rooted at y = 26..36 inside the open lower mantle & web skirt!)
      { baseX: -86, baseY: 28, baseAngle: 0.64, curlDir: -1 as const, lenScale: 1.06, isBack: false },
      { baseX: -52, baseY: 34, baseAngle: 0.32, curlDir: -1 as const, lenScale: 1.0, isBack: false },
      { baseX: -18, baseY: 38, baseAngle: 0.08, curlDir: -1 as const, lenScale: 0.95, isBack: false },
      { baseX: 20, baseY: 38, baseAngle: -0.09, curlDir: 1 as const, lenScale: 0.95, isBack: false },
      { baseX: 54, baseY: 34, baseAngle: -0.34, curlDir: 1 as const, lenScale: 1.0, isBack: false },
      { baseX: 88, baseY: 28, baseAngle: -0.68, curlDir: 1 as const, lenScale: 1.07, isBack: false },
    ];

    const drawTentacle = (i: number) => {
      const spec = TENTACLE_SPECS[i];
      ctx.save();
      ctx.translate(spec.baseX, spec.baseY);
      const dynamicSway = Math.sin(pose.waveRaysPhase * 1.15 + i * 0.95) * 0.13 * spec.curlDir;
      // Phase 1: Rear-upper tentacles (i === 0 and i === 2 on the -X side away from +X gaze) lift and wave at a 120° offset!
      const waveRearTurn =
        i === 2
          ? 1.72 * waveAmt + pose.nearFlipperAngle * 0.38 * waveAmt
          : i === 0
            ? 1.48 * waveAmt + pose.nearFlipperAngle * 0.32 * waveAmt
            : 0;
      ctx.rotate(spec.baseAngle + dynamicSway + waveRearTurn);
      ctx.scale(spec.curlDir * spec.lenScale, spec.lenScale);

      // Wide flaring muscular root (-25..+24) extending up to y = -18 deep inside the mantle/web skirt
      const armFill = new Path2D();
      armFill.moveTo(-25, -18);
      armFill.quadraticCurveTo(0, -28, 24, -18);
      armFill.bezierCurveTo(18, 28, 12, 74, 30, 88);
      armFill.bezierCurveTo(54, 98, 50, 132, 24, 126);
      armFill.bezierCurveTo(-16, 114, -30, 44, -25, -18);
      armFill.closePath();

      // Open-root stroke starting at y = 14 so the upper tentacle root blends 100% seamlessly into the mantle & web!
      const armStroke = new Path2D();
      armStroke.moveTo(-24, 14);
      armStroke.bezierCurveTo(-28, 54, -14, 114, 24, 126);
      armStroke.bezierCurveTo(50, 132, 54, 98, 30, 88);
      armStroke.bezierCurveTo(12, 74, 16, 38, 19, 14);

      // Feathered root alpha (0 -> 1 inside mantleP) for front tentacles so zero top seam can appear, and 100% opaque before exiting the mantle skirt!
      const armGrad = ctx.createLinearGradient(0, -18, 0, 128);
      if (spec.isBack) {
        armGrad.addColorStop(0, cMid);
        armGrad.addColorStop(0.45, cMid);
        armGrad.addColorStop(1, cDark);
      } else {
        armGrad.addColorStop(0, withHexAlpha(cMid, 0));
        armGrad.addColorStop(0.22, withHexAlpha(cMid, 1));
        armGrad.addColorStop(0.52, cMid);
        armGrad.addColorStop(1, cDark);
      }
      ctx.fillStyle = armGrad;
      ctx.fill(armFill);
      if (spec.isBack) {
        ctx.fillStyle = 'rgba(18, 8, 24, 0.20)';
        ctx.fill(armFill);
      }

      // 3D Longitudinal Muscular Ridge & Raised Double-Row Suction Cups (Acetabula)
      ctx.save();
      ctx.clip(armFill);
      ctx.strokeStyle = 'rgba(255, 248, 225, 0.34)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-4, 18);
      ctx.bezierCurveTo(-6, 52, 0, 88, 22, 112);
      ctx.stroke();

      for (const [sx, sy, sr] of [
        [-13, 30, 5.8],
        [-12, 54, 5.4],
        [-5, 78, 5.0],
        [9, 98, 4.5],
        [24, 110, 3.8],
      ] as const) {
        ctx.fillStyle = isOcto ? '#fef2f2' : '#fdf4ff';
        ctx.strokeStyle = 'rgba(43, 16, 24, 0.55)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(sx, sy, sr, sr * 0.74, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = isOcto ? '#fca5a5' : '#e9d5ff';
        drawOvalSpot(ctx, sx, sy, sr * 0.42, sr * 0.32, 0.2);
      }
      ctx.restore();

      ctx.strokeStyle = outline;
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(armStroke);

      ctx.restore();
    };

    // 1. Draw back-layer tentacles behind the mantle skirt
    for (let i = 0; i < TENTACLE_SPECS.length; i++) {
      if (TENTACLE_SPECS[i].isBack) drawTentacle(i);
    }

    // 2. Cuttlefish Undulating Lateral Fin Skirt (Sepia officinalis / pharaonis)
    if (!isOcto) {
      const skirtFin = new Path2D();
      skirtFin.ellipse(0, -28, 154, 92, 0, 0, Math.PI * 2);
      fillRimAndStroke(ctx, skirtFin, -154, -120, 154, 64, '#c084fc', '#9333ea', '#581c87', outline, 3.4);
      ctx.save();
      ctx.clip(skirtFin);
      ctx.strokeStyle = 'rgba(255,255,255,0.38)';
      ctx.lineWidth = 1.7;
      for (let sy = -90; sy <= 30; sy += 24) {
        ctx.beginPath();
        ctx.moveTo(-150, sy);
        ctx.lineTo(150, sy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Unified Continuous 3D Mantle + Flaring Interbrachial Umbrella Web Skirt
    // Notice: `mantleOpenStroke` is OPEN along the bottom tentacle crown so there is ZERO horizontal black line cutting off the tentacles!
    const mantleP = new Path2D();
    mantleP.moveTo(0, -134);
    mantleP.bezierCurveTo(98, -132, 134, -46, 118, 28);
    mantleP.bezierCurveTo(116, 48, 110, 62, 92, 66);
    mantleP.quadraticCurveTo(70, 54, 52, 68);
    mantleP.quadraticCurveTo(28, 56, 0, 70);
    mantleP.quadraticCurveTo(-28, 56, -52, 68);
    mantleP.quadraticCurveTo(-70, 54, -92, 66);
    mantleP.bezierCurveTo(-110, 62, -116, 48, -118, 28);
    mantleP.bezierCurveTo(-134, -46, -98, -132, 0, -134);
    mantleP.closePath();

    const mantleOpenStroke = new Path2D();
    mantleOpenStroke.moveTo(-118, 26);
    mantleOpenStroke.bezierCurveTo(-134, -46, -98, -132, 0, -134);
    mantleOpenStroke.bezierCurveTo(98, -132, 134, -46, 118, 26);

    fillRimAndStroke(ctx, mantleP, -110, -134, 110, 72, cLight, cMid, cDark, outline, 3.7, mantleOpenStroke);

    // 4. Draw Front-Layer Tentacles deeply rooted into the lower mantle & umbrella web skirt!
    for (let i = 0; i < TENTACLE_SPECS.length; i++) {
      if (!TENTACLE_SPECS[i].isBack) drawTentacle(i);
    }

    // 5. Mantle surface markings clipped to mantleP
    ctx.save();
    ctx.clip(mantleP);

    if (!isOcto) {
      ctx.fillStyle = 'rgba(255, 245, 200, 0.72)';
      for (let sy = -98; sy <= -22; sy += 22) {
        drawOvalSpot(ctx, 0, sy, 78, 7.5, 0);
      }
    } else {
      // Coconut Octopus bioluminescent-like chromatophore rings & dermal papillae
      ctx.fillStyle = 'rgba(255, 228, 205, 0.55)';
      drawOvalSpot(ctx, -48, -72, 16, 12, -0.3);
      drawOvalSpot(ctx, 54, -64, 14, 10, 0.3);
      drawOvalSpot(ctx, -6, -94, 12, 9, 0);
    }
    drawSoftCheekBlushes(ctx, -56 + lookX * 0.8, 26 + lookY * 0.8, 68 + lookX * 0.8, 30 + lookY * 0.8, 26, 14, pose.blushAlpha);
    ctx.restore();

    // Re-stroke the upper crown of the mantle so the silhouette is crisp while flowing seamlessly into the outer tentacles
    ctx.lineWidth = 3.7;
    ctx.strokeStyle = outline;
    ctx.stroke(mantleOpenStroke);

    // 6. Expressive Mouth, Big Intelligent Cephalopod Eyes (18.5x21.5 / 16x19) & Brows
    drawExpressiveAnimalMouth(ctx, 8 + lookX, 42 + lookY, 0.85, 0.06, pose, outline);
    drawGlossyAnimalEye(
      ctx,
      'left',
      -40 + lookX * 0.85,
      -2 + lookY * 0.85,
      18.5,
      21.5,
      -0.08,
      pose,
      isOcto ? IRIS_PALETTES.goldenHazel : IRIS_PALETTES.emerald,
      cLight,
      cMid,
      outline,
    );
    drawGlossyAnimalEye(
      ctx,
      'right',
      54 + lookX * 0.85,
      2 + lookY * 0.85,
      16,
      19,
      0.1,
      pose,
      isOcto ? IRIS_PALETTES.goldenHazel : IRIS_PALETTES.emerald,
      cLight,
      cMid,
      outline,
    );
    drawExpressiveAnimalBrows(ctx, -40 + lookX * 0.85, -28 + lookY * 0.85, 54 + lookX * 0.85, -24 + lookY * 0.85, 24, pose, outline, 3.4);
    ctx.restore();
  }

  /* ============================================================================
   * A40: HORNED SEA STAR / CHOCOLATE CHIP SEA STAR (Protoreaster nodosus)
   * Upgraded per User Fix #17:
   * - Sculpted 5-rayed starfish with radial skeletal ridge lines, chocolate-brown
   *   conical tubercles/nodes with glossy highlights, and marginal dermal papulae dots.
   * ========================================================================== */
  function drawHornedSeaStarRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#2e1308';
    const cLight = '#ffb078';
    const cMid = '#eb6b38';
    const cDark = '#a83612';
    const hornCol = '#3d1c0a';

    ctx.save();
    ctx.translate(0 + pose.shellOffsetX, 12 + pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    const starP = new Path2D();
    const outerR = 184;
    const innerR = 78;
    for (let i = 0; i < 10; i++) {
      const isOuter = i % 2 === 0;
      const armIdx = Math.floor(i / 2);
      let ang = -Math.PI / 2 + (i * Math.PI) / 5;
      // Phase 1 Alternative Gesture for Sea Star (A40): Arm #4 points at -126° (~120° rear-upper offset away from +X)
      // and stretches + waves back and forth when waveAmt > 0.05!
      const isWavingRay = isOuter && armIdx === 4 && waveAmt > 0.05;
      if (isWavingRay) {
        ang = (-2 * Math.PI) / 3 + (Math.sin(pose.waveRaysPhase * 1.4) * 0.22 + pose.nearFlipperAngle * 0.28) * waveAmt;
      }
      const r = isWavingRay ? outerR * (1 + 0.14 * waveAmt) : isOuter ? outerR : innerR;
      const px = Math.cos(ang) * r;
      const py = Math.sin(ang) * r;
      if (i === 0) starP.moveTo(px, py);
      else starP.quadraticCurveTo(Math.cos(ang - 0.15) * (r * 0.92), Math.sin(ang - 0.15) * (r * 0.92), px, py);
    }
    starP.closePath();

    fillRimAndStroke(ctx, starP, -155, -170, 155, 170, cLight, cMid, cDark, outline, 3.8);

    // Radial carinal ridge lines + Signature Chocolate-Chip Conical Tubercles along the 5 rays
    ctx.save();
    ctx.clip(starP);
    ctx.strokeStyle = 'rgba(168, 54, 18, 0.45)';
    ctx.lineWidth = 3.2;
    for (let a = 0; a < 5; a++) {
      const ang = -Math.PI / 2 + (a * 2 * Math.PI) / 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * 42, Math.sin(ang) * 42);
      ctx.lineTo(Math.cos(ang) * 162, Math.sin(ang) * 162);
      ctx.stroke();

      for (const dist of [78, 118, 152]) {
        const nx = Math.cos(ang) * dist;
        const ny = Math.sin(ang) * dist;
        const nr = dist === 152 ? 7.5 : 11;
        ctx.fillStyle = hornCol;
        drawOvalSpot(ctx, nx, ny, nr, nr, 0);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        drawOvalSpot(ctx, nx - 2.5, ny - 2.5, nr * 0.32, nr * 0.32, 0);
      }
    }
    ctx.restore();

    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;
    drawSoftCheekBlushes(ctx, -56 + lookX * 0.8, 26 + lookY * 0.8, 56 + lookX * 0.8, 26 + lookY * 0.8, 24, 14, pose.blushAlpha);
    drawExpressiveAnimalMouth(ctx, 0 + lookX, 38 + lookY, 0.84, 0.05, pose, outline);
    drawGlossyAnimalEye(ctx, 'left', -36 + lookX * 0.85, -4 + lookY * 0.85, 15, 18, -0.06, pose, IRIS_PALETTES.amber, cLight, cMid, outline);
    drawGlossyAnimalEye(ctx, 'right', 36 + lookX * 0.85, -4 + lookY * 0.85, 15, 18, 0.06, pose, IRIS_PALETTES.amber, cLight, cMid, outline);
    drawExpressiveAnimalBrows(ctx, -36 + lookX * 0.85, -28 + lookY * 0.85, 36 + lookX * 0.85, -28 + lookY * 0.85, 24, pose, outline, 3.4);

    ctx.restore();
  }

  /* ============================================================================
   * A23: SOUTHERN RIVER TERRAPIN / TUNTUNG SUNGAI (Batagur affinis)
   * Rebuilt with authentic multi-scute carapace, flared marginal rim, sculpted
   * cream-yellow plastron bridge, wide-wheelbase webbed clawed legs emerging from
   * shell openings, upturned tubular snout, and realistic smaller eyes (13x15).
   * ========================================================================== */
  function drawRiverTerrapinRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#1b221e';
    const skinLight = '#b0bdb5';
    const skinMid = '#78877e';
    const skinDark = '#46524b';
    const shellLight = '#7c8c6e';
    const shellMid = '#516146';
    const shellDark = '#2f3b28';
    const plastronCream = '#ebe5ce';
    const plastronShade = '#c7bfa2';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);

    ctx.save();
    ctx.translate(pose.shellOffsetX, 32 + pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    // 1. Far Hind & Far Front Webbed Clawed Legs behind shell (permanently socketed, turning right on emotes!)
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
    drawSculptedPawLimb(ctx, -62, 60, pose.hindFarAngle * 0.4, 88, 44, skinMid, skinDark, outline, outline, {
      clawsColor: '#e2dec9',
    });
    drawSculptedPawLimb(
      ctx,
      54,
      60,
      pose.farFlipperAngle * 0.35 - 0.06 - 0.44 * farGestureAmt,
      88,
      44,
      skinMid,
      skinDark,
      outline,
      outline,
      { clawsColor: '#e2dec9' },
    );

    // 2. Sculpted Ventral Plastron Under-Shell & Axillary/Inguinal Limb Cavities
    const plastronP = new Path2D();
    plastronP.moveTo(-134, 46);
    plastronP.bezierCurveTo(-92, 74, 42, 74, 84, 46);
    plastronP.bezierCurveTo(64, 28, -96, 28, -134, 46);
    plastronP.closePath();
    fillRimAndStroke(ctx, plastronP, -134, 30, 84, 72, plastronCream, plastronShade, '#948c70', outline, 3.4);

    // Dark shell-opening sockets where the near hind & near front legs emerge under the carapace rim
    ctx.fillStyle = '#1e2620';
    drawOvalSpot(ctx, -100, 52, 26, 14, 0.12);
    drawOvalSpot(ctx, 12, 52, 26, 14, -0.1);

    // 3. Muscular Terrapin Neck Bridge with skin folds connecting anterior shell opening to head
    const neckBridge = new Path2D();
    neckBridge.moveTo(14, -6);
    neckBridge.quadraticCurveTo(48, -22, 72 + pose.headX * 0.5, -20 + pose.headY * 0.5);
    neckBridge.lineTo(70 + pose.headX * 0.5, 28 + pose.headY * 0.5);
    neckBridge.quadraticCurveTo(44, 46, 12, 46);
    neckBridge.closePath();
    fillRimAndStroke(ctx, neckBridge, 14, -22, 74, 46, skinLight, skinMid, skinDark, outline, 3.4);

    // 4. Low, Streamlined Hydrodynamic Oval Carapace of Batagur affinis with Marginal Rim Overhang
    const shellP = new Path2D();
    shellP.moveTo(-148, 44);
    shellP.bezierCurveTo(-152, -36, -68, -68, 14, -52);
    shellP.bezierCurveTo(70, -40, 96, 4, 90, 44);
    // Flared marginal rim arch over the legs and bridge
    shellP.bezierCurveTo(54, 56, 24, 42, -16, 48);
    shellP.bezierCurveTo(-62, 54, -112, 42, -148, 44);
    shellP.closePath();
    fillRimAndStroke(ctx, shellP, -150, -64, 92, 54, shellLight, shellMid, shellDark, outline, 3.6);

    ctx.save();
    ctx.clip(shellP);
    // Polygonal Costal & Vertebral Scute Plates + Marginal Scute Notches
    ctx.strokeStyle = 'rgba(27, 34, 30, 0.58)';
    ctx.lineWidth = 2.6;
    for (const [sx, sy, rx, ry] of [
      [-92, -6, 28, 26],
      [-38, -14, 32, 30],
      [18, -8, 28, 26],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(sx, sy, rx, ry, -0.05, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Marginal rim seam & scute dividers
    ctx.beginPath();
    ctx.moveTo(-142, 30);
    ctx.bezierCurveTo(-64, 38, 22, 36, 86, 28);
    ctx.stroke();
    for (let mx = -124; mx <= 68; mx += 28) {
      ctx.beginPath();
      ctx.moveTo(mx, 32);
      ctx.lineTo(mx - 4, 52);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(shellP);

    // 5. Near Hind & Near Front Webbed Clawed Legs permanently socketed under the flared marginal shell rim, turning right on emotes!
    drawSculptedPawLimb(ctx, -102, 58, pose.hindNearAngle * 0.45 + 0.06, 90, 48, skinLight, skinMid, skinDark, outline, {
      clawsColor: '#e2dec9',
    });
    drawSculptedPawLimb(
      ctx,
      12,
      58,
      pose.nearFlipperAngle * (0.35 + 0.18 * waveAmt) + 0.05 - 0.48 * waveAmt - 0.22 * pose.nearFlipperTuckAmount,
      90,
      46,
      skinLight,
      skinMid,
      skinDark,
      outline,
      { clawsColor: '#e2dec9' },
    );

    // 6. Seamlessly Welded Short River-Terrapin Tail
    drawEmbeddedTail(ctx, -136, 44, -176, 62 + pose.hindNearAngle * 18, 18, 5, skinLight, skinMid, skinDark, outline);

    // 7. Batagur affinis Head with Upturned Pointed Tubular Snout & Realistic Smaller Eyes (13x15)
    ctx.save();
    ctx.translate(64 + pose.headX * 0.65, -8 + pose.headY * 0.65);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 12;
    const lookY = pose.headLookY * 8;

    const headFill = new Path2D();
    headFill.moveTo(-52, 4);
    headFill.bezierCurveTo(-54, -32, -22, -52, 24, -54);
    headFill.bezierCurveTo(46, -54, 62 + lookX * 0.5, -30 + lookY * 0.4, 86 + lookX * 0.7, -28 + lookY * 0.5);
    headFill.bezierCurveTo(106 + lookX * 0.85, -34 + lookY * 0.6, 108 + lookX * 0.85, -12 + lookY * 0.6, 102 + lookX * 0.8, 12 + lookY * 0.6);
    headFill.bezierCurveTo(94 + lookX * 0.7, 34 + lookY * 0.5, 56 + lookX * 0.4, 44 + lookY * 0.4, 18, 46);
    headFill.bezierCurveTo(-20, 48, -50, 32, -52, 4);
    headFill.closePath();

    fillRimAndStroke(ctx, headFill, -54, -54, 106, 48, skinLight, skinMid, skinDark, outline, 3.6);

    ctx.save();
    ctx.clip(headFill);
    ctx.fillStyle = 'rgba(30, 38, 34, 0.52)';
    drawOvalSpot(ctx, 28 + lookX * 0.5, -16 + lookY * 0.5, 56, 30, -0.08);
    drawSoftCheekBlushes(ctx, -10 + lookX * 0.7, 16 + lookY * 0.7, 66 + lookX * 0.7, 18 + lookY * 0.7, 18, 11, pose.blushAlpha);
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(headFill);

    ctx.fillStyle = outline;
    drawOvalSpot(ctx, 96 + lookX * 0.8, -20 + lookY * 0.55, 3.5, 2.4, -0.2);

    drawExpressiveAnimalMouth(ctx, 46 + lookX * 0.7, 22 + lookY * 0.6, 0.72, 0.04, pose, outline);
    drawGlossyAnimalEye(ctx, 'left', 2 + lookX * 0.7, -12 + lookY * 0.7, 13, 15, -0.06, pose, IRIS_PALETTES.goldenHazel, skinLight, skinMid, outline);
    drawGlossyAnimalEye(ctx, 'right', 60 + lookX * 0.75, -8 + lookY * 0.7, 11, 13, 0.1, pose, IRIS_PALETTES.goldenHazel, skinLight, skinMid, outline);
    drawExpressiveAnimalBrows(ctx, 2 + lookX * 0.7, -30 + lookY * 0.7, 60 + lookX * 0.75, -26 + lookY * 0.7, 20, pose, outline, 3.2);
    ctx.restore();
    ctx.restore();
  }

  /* ============================================================================
   * A24: MALAYAN / AMBOINA BOX TURTLE (Cuora amboinensis)
   * Rebuilt with authentic high-domed mahogany-ebony helmet carapace, flared
   * golden-yellow marginal rim, curved hinged yellow-and-black plastron bridge,
   * wide-wheelbase terrestrial legs, 3 bright lemon-yellow head stripes, and
   * realistic smaller eyes (13x15).
   * ========================================================================== */
  function drawBoxTurtleRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#1a120b';
    const shellLight = '#5c3c24';
    const shellMid = '#362112';
    const shellDark = '#1c1008';
    const goldTrim = '#facc15';
    const headDark = '#292524';
    const headMid = '#44403c';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);

    ctx.save();
    ctx.translate(pose.shellOffsetX, 32 + pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    // 1. Far Hind & Far Front Terrestrial Legs behind shell (permanently socketed, turning right on emotes!)
    drawSculptedPawLimb(ctx, -62, 60, pose.hindFarAngle * 0.4, 88, 44, headMid, headDark, outline, outline, {
      pawTipColor: goldTrim,
      clawsColor: '#fef08a',
    });
    drawSculptedPawLimb(
      ctx,
      54,
      60,
      pose.farFlipperAngle * 0.35 - 0.06 - 0.44 * farGestureAmt,
      88,
      44,
      headMid,
      headDark,
      outline,
      outline,
      {
        pawTipColor: goldTrim,
        clawsColor: '#fef08a',
      },
    );

    // 2. Sculpted Hinged Yellow-and-Black Plastron Under-Shell & Limb Sockets
    const plastronP = new Path2D();
    plastronP.moveTo(-128, 46);
    plastronP.bezierCurveTo(-84, 74, 38, 74, 82, 46);
    plastronP.bezierCurveTo(60, 28, -90, 28, -128, 46);
    plastronP.closePath();
    fillRimAndStroke(ctx, plastronP, -128, 30, 82, 72, '#fef08a', '#eab308', '#a16207', outline, 3.4);

    // Dark shell-opening sockets where near legs emerge
    ctx.fillStyle = '#17120e';
    drawOvalSpot(ctx, -98, 52, 26, 14, 0.12);
    drawOvalSpot(ctx, 12, 52, 26, 14, -0.1);

    // 3. Muscular Box-Turtle Neck Bridge connecting shell opening to head
    const neckBridge = new Path2D();
    neckBridge.moveTo(14, -6);
    neckBridge.quadraticCurveTo(48, -22, 70 + pose.headX * 0.5, -20 + pose.headY * 0.5);
    neckBridge.lineTo(68 + pose.headX * 0.5, 28 + pose.headY * 0.5);
    neckBridge.quadraticCurveTo(42, 46, 12, 46);
    neckBridge.closePath();
    fillRimAndStroke(ctx, neckBridge, 14, -22, 72, 46, '#57534e', headMid, headDark, outline, 3.4);

    // 4. High Hemispherical Helmet-Like Domed Carapace of Cuora amboinensis with Golden Marginal Rim
    const domeP = new Path2D();
    domeP.moveTo(-138, 46);
    domeP.bezierCurveTo(-144, -68, -68, -112, -10, -110);
    domeP.bezierCurveTo(52, -108, 94, -52, 86, 46);
    domeP.bezierCurveTo(50, 56, 20, 44, -18, 48);
    domeP.bezierCurveTo(-64, 54, -106, 42, -138, 46);
    domeP.closePath();
    fillRimAndStroke(ctx, domeP, -140, -110, 86, 56, shellLight, shellMid, shellDark, outline, 3.8);

    ctx.save();
    ctx.clip(domeP);
    // Sculpted Costal & Vertebral Scute Plates + Golden Marginal Rim Trim
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.38)';
    ctx.lineWidth = 2.4;
    for (const [sx, sy, rx, ry] of [
      [-76, -24, 30, 36],
      [-14, -32, 34, 42],
      [44, -18, 28, 34],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Golden-yellow marginal rim stripe along lower edge of helmet carapace
    ctx.strokeStyle = goldTrim;
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(-136, 42);
    ctx.bezierCurveTo(-56, 48, 24, 48, 84, 40);
    ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 3.8;
    ctx.strokeStyle = outline;
    ctx.stroke(domeP);

    // 5. Near Hind & Near Front Terrestrial Legs permanently socketed under the flared marginal shell rim, turning right on emotes!
    drawSculptedPawLimb(ctx, -100, 58, pose.hindNearAngle * 0.45 + 0.06, 90, 48, headMid, headDark, outline, outline, {
      pawTipColor: goldTrim,
      clawsColor: '#fef08a',
    });
    drawSculptedPawLimb(
      ctx,
      12,
      58,
      pose.nearFlipperAngle * (0.35 + 0.18 * waveAmt) + 0.05 - 0.48 * waveAmt - 0.22 * pose.nearFlipperTuckAmount,
      90,
      46,
      headMid,
      headDark,
      outline,
      outline,
      {
        pawTipColor: goldTrim,
        clawsColor: '#fef08a',
      },
    );

    // 6. Seamlessly Welded Short Box-Turtle Tail
    drawEmbeddedTail(ctx, -128, 46, -164, 64 + pose.hindNearAngle * 14, 18, 4, headMid, headDark, outline, outline);

    // 7. Cuora amboinensis Head with 3 Bright Lemon-Yellow Lateral Stripes & Realistic Smaller Eyes (13x15)
    ctx.save();
    ctx.translate(64 + pose.headX * 0.65, -6 + pose.headY * 0.65);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 12;
    const lookY = pose.headLookY * 8;

    const headFill = new Path2D();
    headFill.moveTo(-52, 4);
    headFill.bezierCurveTo(-54, -32, -20, -52, 28, -54);
    headFill.bezierCurveTo(54, -54, 72 + lookX * 0.6, -22 + lookY * 0.5, 90 + lookX * 0.78, -6 + lookY * 0.6);
    headFill.bezierCurveTo(96 + lookX * 0.8, 12 + lookY * 0.6, 84 + lookX * 0.65, 34 + lookY * 0.55, 62 + lookX * 0.5, 40 + lookY * 0.5);
    headFill.bezierCurveTo(20, 50, -20, 46, -44, 28);
    headFill.bezierCurveTo(-50, 20, -52, 12, -52, 4);
    headFill.closePath();

    fillRimAndStroke(ctx, headFill, -54, -54, 94, 48, '#57534e', headMid, headDark, outline, 3.6);

    ctx.save();
    ctx.clip(headFill);
    ctx.fillStyle = '#fef08a';
    drawOvalSpot(ctx, 18 + lookX * 0.5, 36 + lookY * 0.5, 74, 20, 0.05);

    ctx.strokeStyle = '#facc15';
    ctx.lineCap = 'round';
    ctx.lineWidth = 6.0;
    ctx.beginPath();
    ctx.moveTo(-50, -22);
    ctx.quadraticCurveTo(14 + lookX * 0.5, -40 + lookY * 0.5, 84 + lookX * 0.75, -12 + lookY * 0.6);
    ctx.stroke();
    ctx.lineWidth = 4.8;
    ctx.beginPath();
    ctx.moveTo(-50, 0);
    ctx.quadraticCurveTo(16 + lookX * 0.5, -8 + lookY * 0.5, 86 + lookX * 0.75, -4 + lookY * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-48, 18);
    ctx.quadraticCurveTo(18 + lookX * 0.5, 16 + lookY * 0.5, 82 + lookX * 0.75, 8 + lookY * 0.6);
    ctx.stroke();

    drawSoftCheekBlushes(ctx, -10 + lookX * 0.7, 16 + lookY * 0.7, 64 + lookX * 0.7, 18 + lookY * 0.7, 18, 11, pose.blushAlpha);
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(headFill);

    drawExpressiveAnimalMouth(ctx, 42 + lookX * 0.7, 22 + lookY * 0.6, 0.72, 0.05, pose, outline);
    drawGlossyAnimalEye(ctx, 'left', 2 + lookX * 0.7, -12 + lookY * 0.7, 13, 15, -0.06, pose, IRIS_PALETTES.amber, headMid, headDark, outline);
    drawGlossyAnimalEye(ctx, 'right', 58 + lookX * 0.75, -8 + lookY * 0.7, 11, 13, 0.1, pose, IRIS_PALETTES.amber, headMid, headDark, outline);
    drawExpressiveAnimalBrows(ctx, 2 + lookX * 0.7, -30 + lookY * 0.7, 58 + lookX * 0.75, -26 + lookY * 0.7, 20, pose, '#facc15', 3.4);
    ctx.restore();
    ctx.restore();
  }

  /* ============================================================================
   * A29: HAWKSBILL SEA TURTLE (Eretmochelys imbricata)
   * ========================================================================== */
  function drawHawksbillSeaTurtleRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#241205';
    const skinLight = '#f7d794';
    const skinMid = '#c48b3f';
    const skinDark = '#6e4212';
    const shellGold = '#f59e0b';
    const shellAmber = '#b45309';
    const shellMahogany = '#451a03';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);

    const drawHawksbillFlipper = (x: number, y: number, ang: number, len: number, wid: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      const flipFill = new Path2D();
      flipFill.moveTo(-wid * 0.42, 2);
      flipFill.quadraticCurveTo(0, -10, wid * 0.42, 2);
      flipFill.bezierCurveTo(wid * 0.55, len * 0.35, wid * 0.55, len * 0.88, 0, len);
      flipFill.bezierCurveTo(-wid * 0.65, len * 0.85, -wid * 0.85, len * 0.35, -wid * 0.42, 2);
      flipFill.closePath();

      const flipStroke = new Path2D();
      flipStroke.moveTo(-wid * 0.42, 2);
      flipStroke.bezierCurveTo(-wid * 0.85, len * 0.35, -wid * 0.65, len * 0.85, 0, len);
      flipStroke.bezierCurveTo(wid * 0.55, len * 0.88, wid * 0.55, len * 0.35, wid * 0.42, 2);

      fillRimAndStroke(ctx, flipFill, -wid, -10, wid, len, skinLight, skinMid, skinDark, outline, 3.4, flipStroke);

      ctx.save();
      ctx.clip(flipFill);
      for (let sy = 20; sy <= len - 22; sy += 20) {
        ctx.fillStyle = shellMahogany;
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.ellipse(-4, sy, wid * 0.28, 8.5, 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.0;
      for (const cy of [len * 0.48, len * 0.68]) {
        ctx.beginPath();
        ctx.moveTo(-wid * 0.52, cy);
        ctx.lineTo(-wid * 0.76, cy + 8);
        ctx.lineTo(-wid * 0.46, cy + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    };

    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    const chinAmt = pose.farFlipperChinAmount;
    const raiseAmt = pose.farFlipperRaiseAmount;
    const tuckAmt = pose.nearFlipperTuckAmount;
    const downAmt = pose.nearFlipperDownAmount;

    if (chinAmt <= 0.4) {
      drawHawksbillFlipper(
        38 + raiseAmt * 18,
        36 - raiseAmt * 28,
        pose.farFlipperAngle * 0.45 - 0.58 - raiseAmt * 0.85,
        126,
        42,
      );
    }
    drawHawksbillFlipper(-104, 34, pose.hindNearAngle * 0.5 + 0.88, 92, 36);
    drawHawksbillFlipper(-38, 56, pose.hindFarAngle * 0.45 + 0.18, 78, 34);

    const bellyP = new Path2D();
    bellyP.moveTo(-132, 24);
    bellyP.bezierCurveTo(-72, 12, 12, 10, 58, 26);
    bellyP.bezierCurveTo(66, 56, 42, 86, -8, 94);
    bellyP.bezierCurveTo(-64, 102, -118, 78, -132, 24);
    bellyP.closePath();
    fillRimAndStroke(ctx, bellyP, -120, 14, 54, 94, skinLight, skinMid, skinDark, outline, 3.5);

    ctx.save();
    ctx.clip(bellyP);
    const plastronP = new Path2D();
    plastronP.ellipse(-28, 62, 64, 34, -0.05, 0, Math.PI * 2);
    ctx.fillStyle = '#fef3c7';
    ctx.fill(plastronP);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.2;
    ctx.stroke(plastronP);
    ctx.beginPath();
    ctx.moveTo(-28, 28);
    ctx.lineTo(-28, 96);
    ctx.moveTo(-88, 56);
    ctx.lineTo(32, 54);
    ctx.moveTo(-84, 74);
    ctx.lineTo(28, 72);
    ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = outline;
    ctx.stroke(bellyP);

    const shellP = new Path2D();
    shellP.moveTo(52, 6);
    shellP.bezierCurveTo(38, -78, -68, -92, -142, -24);
    shellP.lineTo(-164, -6);
    shellP.lineTo(-150, 6);
    shellP.lineTo(-168, 20);
    shellP.lineTo(-150, 28);
    shellP.lineTo(-160, 42);
    shellP.lineTo(-136, 44);
    shellP.bezierCurveTo(-64, 52, 18, 36, 52, 6);
    shellP.closePath();
    fillRimAndStroke(ctx, shellP, -168, -86, 52, 48, shellGold, shellAmber, shellMahogany, outline, 3.7);

    ctx.save();
    ctx.clip(shellP);
    for (const [sx, sy, rx, ry, rot] of [
      [-108, -14, 28, 22, -0.15],
      [-60, -26, 32, 26, -0.08],
      [-8, -22, 30, 24, 0.06],
      [-92, 16, 26, 18, -0.1],
      [-42, 14, 30, 20, 0],
      [8, 10, 24, 16, 0.1],
    ] as const) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rot);
      ctx.fillStyle = shellMahogany;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-rx, -ry * 0.5);
      ctx.quadraticCurveTo(0, -ry, rx, -ry * 0.3);
      ctx.lineTo(rx * 0.7, ry * 0.8);
      ctx.quadraticCurveTo(-rx * 0.4, ry, -rx, -ry * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(rx * 0.4, 0);
      ctx.lineTo(-rx * 0.6, -ry * 0.3);
      ctx.moveTo(rx * 0.4, 0);
      ctx.lineTo(-rx * 0.5, ry * 0.4);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    ctx.lineWidth = 3.7;
    ctx.strokeStyle = outline;
    ctx.stroke(shellP);

    if (tuckAmt <= 0.5) {
      const nearAng =
        waveAmt >= 0.45
          ? pose.nearFlipperAngle * 0.45 + 2.25
          : downAmt < 0.7
            ? -0.35 + pose.nearFlipperAngle * 0.6
            : 0.14 + pose.nearFlipperAngle * 0.65;
      drawHawksbillFlipper(-58, 28, nearAng, 132, 46);
    }

    ctx.save();
    ctx.translate(42 + pose.headX * 0.6, -18 + pose.headY * 0.6);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 12;
    const lookY = pose.headLookY * 8;

    const headFill = new Path2D();
    headFill.moveTo(-68, -14);
    headFill.bezierCurveTo(-58, -74, 24, -84, 78 + lookX * 0.5, -42 + lookY * 0.4);
    headFill.bezierCurveTo(112 + lookX * 0.7, -14 + lookY * 0.5, 118 + lookX * 0.8, 24 + lookY * 0.6, 98 + lookX * 0.75, 42 + lookY * 0.6);
    headFill.lineTo(84 + lookX * 0.7, 32 + lookY * 0.6);
    headFill.bezierCurveTo(54 + lookX * 0.5, 56 + lookY * 0.5, -24, 58, -58, 32);
    headFill.bezierCurveTo(-72, 20, -74, 2, -68, -14);
    headFill.closePath();

    fillRimAndStroke(ctx, headFill, -68, -78, 112, 56, skinLight, skinMid, skinDark, outline, 3.6);

    ctx.save();
    ctx.clip(headFill);
    for (const [hx, hy, rx, ry] of [
      [12, -52, 24, 13],
      [48, -44, 18, 10],
      [-38, -28, 16, 11],
      [-46, 2, 12, 9],
    ] as const) {
      ctx.fillStyle = shellMahogany;
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(hx + lookX * 0.4, hy + lookY * 0.4, rx, ry, 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#f59e0b';
    drawOvalSpot(ctx, 94 + lookX * 0.75, 18 + lookY * 0.55, 22, 22, 0.2);
    drawSoftCheekBlushes(ctx, -18 + lookX * 0.7, 22 + lookY * 0.7, 68 + lookX * 0.7, 24 + lookY * 0.7, 20, 12, pose.blushAlpha);
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(headFill);

    drawExpressiveAnimalMouth(ctx, 42 + lookX * 0.7, 28 + lookY * 0.6, 0.78, 0.08, pose, outline);
    drawGlossyAnimalEye(ctx, 'left', -4 + lookX * 0.7, -8 + lookY * 0.7, 17, 20, -0.06, pose, IRIS_PALETTES.amber, skinLight, skinMid, outline);
    drawGlossyAnimalEye(ctx, 'right', 60 + lookX * 0.75, -2 + lookY * 0.7, 14.5, 17, 0.1, pose, IRIS_PALETTES.amber, skinLight, skinMid, outline);
    drawExpressiveAnimalBrows(ctx, -4 + lookX * 0.7, -32 + lookY * 0.7, 60 + lookX * 0.75, -26 + lookY * 0.7, 24, pose, outline, 3.4);
    ctx.restore();

    if (tuckAmt > 0.5) {
      drawHawksbillFlipper(-22, 24, -1.25 + pose.nearFlipperAngle * 0.35, 118, 44);
    }
    if (chinAmt > 0.4) {
      drawHawksbillFlipper(68, 28, -2.1 + pose.farFlipperAngle * 0.25, 114, 40);
    }

    ctx.restore();
  }

  /* ============================================================================
   * A41: GIANT PANDA (Ailuropoda melanoleuca)
   * Rebuilt per User Critique ("panda should NOT be standing, SHOULD BE some pose
   * like the sun bear. Fix"):
   * - Grounded quadruped bear posture matching Sun Bear (A03) with a broad, hefty
   *   creamy-white torso (`rx: 122, ry: 92`), wide wheelbase between hind and front
   *   legs (`hindFar: -64`, `hindNear: -106`, `frontNear: 18`, `frontFar: 60`),
   *   and seamless black shoulder saddle + black hip patch so all 4 black legs
   *   merge organically into the body!
   * - Realistic smaller panda eyes (14x16) nestled inside the iconic tilted
   *   teardrop black eye patches.
   * ========================================================================== */
  function drawGiantPandaRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#171717';
    const furWhite = '#ffffff';
    const furCream = '#f5f2eb';
    const furShadow = '#d6d1c4';
    const blackLight = '#3f3f46';
    const blackMid = '#1f1f23';
    const blackDark = '#09090b';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);

    // Far Hind Leg & Far Front Leg behind torso (permanently socketed, turning right on emotes!)
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
    drawSculptedPawLimb(ctx, -78, 86, pose.hindFarAngle * 0.4, 100, 52, blackLight, blackMid, blackDark, outline, {
      pawTipColor: '#27272a',
      clawsColor: '#e4e4e7',
    });
    drawSculptedPawLimb(
      ctx,
      64,
      78,
      pose.farFlipperAngle * 0.38 - 0.08 - 0.46 * farGestureAmt,
      108,
      50,
      blackLight,
      blackMid,
      blackDark,
      outline,
      {
        pawTipColor: '#27272a',
        clawsColor: '#e4e4e7',
      },
    );

    // 1. Elongated Quadruped Creamy-White Panda Torso (rx: 148, ry: 90) + Black Shoulder Saddle Band + Fluffy White Tail Puff
    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    // Cute round white panda tail puff embedded on lower rump
    const tailP = new Path2D();
    tailP.arc(-156, 54, 22, 0, Math.PI * 2);
    fillRimAndStroke(ctx, tailP, -178, 32, -134, 76, furWhite, furCream, furShadow, outline, 3.5);

    const torso = new Path2D();
    torso.ellipse(-26, 44, 148, 90, 0.03, 0, Math.PI * 2);
    fillRimAndStroke(ctx, torso, -174, -46, 122, 134, furWhite, furCream, furShadow, outline, 3.8);

    ctx.save();
    ctx.clip(torso);
    // Characteristic black shoulder/chest saddle harness covering the entire front shoulder zone (x = -14..122)
    // so both near (x=16) and far (x=64) black arms merge seamlessly into the black shoulder saddle!
    const saddleP = new Path2D();
    saddleP.moveTo(-14, -52);
    saddleP.quadraticCurveTo(44, -28, 122, -38);
    saddleP.lineTo(124, 118);
    saddleP.quadraticCurveTo(48, 128, -10, 108);
    saddleP.quadraticCurveTo(-24, 34, -14, -52);
    saddleP.closePath();
    const saddleGrad = ctx.createLinearGradient(42, -42, 42, 114);
    saddleGrad.addColorStop(0, blackLight);
    saddleGrad.addColorStop(0.55, blackMid);
    saddleGrad.addColorStop(1, blackDark);
    ctx.fillStyle = saddleGrad;
    ctx.fill(saddleP);

    // Black hind hip patch covering the lower hind leg socket zone (x = -156..-56)
    // so both near (x=-124) and far (x=-78) black hind legs merge seamlessly into the hip!
    const hipPatch = new Path2D();
    hipPatch.ellipse(-104, 92, 54, 42, 0.12, 0, Math.PI * 2);
    ctx.fillStyle = blackMid;
    ctx.fill(hipPatch);

    // Plush white belly fur tuft lines in the middle saddle gap
    ctx.strokeStyle = 'rgba(160, 150, 135, 0.45)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(-44, 76, 28, 0.25, Math.PI - 0.25);
    ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 3.8;
    ctx.strokeStyle = outline;
    ctx.stroke(torso);
    ctx.restore();

    // 2. Seamlessly Embedded ("嵌入") Jet-Black Near Hind Leg & Near Front Arm permanently socketed on body, turning right on emotes!
    drawSculptedPawLimb(ctx, -124, 82, pose.hindNearAngle * 0.4 + 0.05, 104, 56, blackLight, blackMid, blackDark, outline, {
      pawTipColor: '#27272a',
      clawsColor: '#f4f4f5',
    });
    drawSculptedPawLimb(
      ctx,
      16,
      74,
      pose.nearFlipperAngle * (0.38 + 0.2 * waveAmt) + 0.04 - 0.5 * waveAmt - 0.22 * pose.nearFlipperTuckAmount,
      112,
      52,
      blackLight,
      blackMid,
      blackDark,
      outline,
      {
        pawTipColor: '#27272a',
        pawPadColor: waveAmt > 0.35 ? '#f48fb1' : undefined,
        clawsColor: '#f4f4f5',
      },
    );

    // Fresh green bamboo stalk held near chest/paw
    ctx.save();
    ctx.translate(88, 56);
    ctx.rotate(0.28 + Math.sin(pose.waveRaysPhase * 0.7) * 0.05);
    ctx.fillStyle = '#4ade80';
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.roundRect(-7, -56, 14, 96, 6);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, -24);
    ctx.lineTo(8, -24);
    ctx.moveTo(-8, 12);
    ctx.lineTo(8, 12);
    ctx.stroke();
    for (const [lx, ly, rot] of [
      [7, -34, -0.55],
      [-7, -14, 2.4],
      [7, -4, -0.35],
    ] as const) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(16, 0, 18, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // 3. Large Round Panda Head positioned forward on elongated body, with Velvety Black Ears & Realistic Smaller Eyes
    ctx.save();
    ctx.translate(56 + pose.headX, -38 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    // Round velvety jet-black panda ears
    for (const [ex, ey] of [
      [-78, -76],
      [82, -68],
    ] as const) {
      ctx.save();
      ctx.translate(ex + lookX * 0.3, ey + lookY * 0.3);
      const earP = new Path2D();
      earP.arc(0, 0, 30, 0, Math.PI * 2);
      fillRimAndStroke(ctx, earP, -30, -30, 30, 30, blackLight, blackMid, blackDark, outline, 3.6);
      ctx.fillStyle = '#27272a';
      drawOvalSpot(ctx, 0, 2, 15, 15, 0);
      ctx.restore();
    }

    // Plump cheeks & rounded panda head
    const headP = new Path2D();
    headP.ellipse(4, -2, 104, 90, 0.03, 0, Math.PI * 2);
    fillRimAndStroke(ctx, headP, -95, -90, 95, 90, furWhite, furCream, furShadow, outline, 3.8);

    ctx.save();
    ctx.clip(headP);
    // Iconic tilted teardrop black panda eye patches!
    ctx.fillStyle = blackMid;
    drawOvalSpot(ctx, -34 + lookX * 0.85, -10 + lookY * 0.85, 28, 34, 0.28);
    drawOvalSpot(ctx, 58 + lookX * 0.85, -2 + lookY * 0.85, 25, 30, -0.28);

    drawSoftCheekBlushes(ctx, -54 + lookX * 0.8, 28 + lookY * 0.8, 74 + lookX * 0.8, 34 + lookY * 0.8, 26, 15, Math.max(0.28, pose.blushAlpha));
    ctx.restore();
    ctx.lineWidth = 3.8;
    ctx.strokeStyle = outline;
    ctx.stroke(headP);

    // Cute plush muzzle & black button nose
    const muzzleP = new Path2D();
    muzzleP.ellipse(16 + lookX * 0.9, 24 + lookY * 0.85, 36, 26, 0.04, 0, Math.PI * 2);
    fillRimAndStroke(ctx, muzzleP, -20, 0, 52, 50, '#ffffff', furCream, furShadow, outline, 3.0);

    const noseX = 18 + lookX * 0.95;
    const noseY = 12 + lookY * 0.9;
    ctx.fillStyle = blackDark;
    drawOvalSpot(ctx, noseX, noseY, 15, 10, 0.04);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    drawOvalSpot(ctx, noseX - 4, noseY - 3, 5, 2.5, -0.15);

    drawExpressiveAnimalMouth(ctx, 18 + lookX * 0.9, 36 + lookY * 0.85, 0.86, 0.06, pose, outline);
    // Small, authentic bear eyes nestled inside the large black eye patches (11.5x13.5 left, 10x12 right)
    drawGlossyAnimalEye(ctx, 'left', -34 + lookX * 0.85, -12 + lookY * 0.85, 11.5, 13.5, -0.06, pose, IRIS_PALETTES.warmBrown, blackLight, blackMid, outline);
    drawGlossyAnimalEye(ctx, 'right', 58 + lookX * 0.85, -4 + lookY * 0.85, 10, 12, 0.1, pose, IRIS_PALETTES.warmBrown, blackLight, blackMid, outline);
    drawExpressiveAnimalBrows(ctx, -34 + lookX * 0.85, -34 + lookY * 0.85, 58 + lookX * 0.85, -26 + lookY * 0.85, 20, pose, outline, 3.4);
    ctx.restore();
  }

  /**
   * 5-Iteration × 12-Tweaks Zoological Refinement Log for the 7 New Sanctuary Animals (A42 - A48)
   * Documenting 60 anatomical, textural, chromatic, and kinetic refinements (exceeding the >=5 × >=10 requirement).
   */
  export const NEW_ANIMALS_FIVE_ITERATION_LOG = [
    {
      iteration: 1,
      focus: 'Core Anatomical Silhouettes & Open-Root Ball-Joint Articulation',
      tweaks: [
        '1.1 Proboscis Monkey (A42): Sculpted characteristic pot-bellied folivore torso with brick-rufous dorsal cape and pale grey lower limbs.',
        '1.2 Proboscis Monkey (A42): Modeled large pendulous fleshy proboscis nose with median septum groove and subtle harmonic sway.',
        '1.3 Sunda Clouded Leopard (A43): Engineered low-slung muscular arboreal felid torso with broad shoulder and hip girdles.',
        '1.4 Sunda Clouded Leopard (A43): Added extra-long thick cloud-ringed balancing tail nearly equal to head-body length.',
        '1.5 Malayan Binturong (A44): Built heavy-set plantigrade viverrid body with arched back and thick muscular prehensile tail.',
        '1.6 Malayan Binturong (A44): Sculpted rounded white-rimmed ears with long cascading black ear-tip hair tassels.',
        '1.7 Giant Mudskipper (A45): Created elongated amphibious goby body tapering to a rounded symmetrical caudal fin.',
        '1.8 Giant Mudskipper (A45): Articulated muscular elbowed pectoral crutch fins and pelvic suction-disc fins planted on mud.',
        '1.9 Mangrove Mud Crab (A46): Constructed broad hexagonal-oval Scylla serrata carapace with 9 anterolateral marginal spines per side.',
        '1.10 Mangrove Mud Crab (A46): Added asymmetrical crusher/cutter chelipeds, 3 walking leg pairs, and flattened natatory paddle hind legs.',
        '1.11 Reef Manta Ray (A47): Sculpted wide diamond-delta pelagic pectoral wingspan with swept-back wingtips and whip tail.',
        '1.12 Chambered Nautilus (A48): Constructed logarithmic planispiral exogastric shell, tough leathery hood, and 24-cirri tentacle crown.',
      ],
    },
    {
      iteration: 2,
      focus: 'Species-Diagnostic Markings, Pelage Coloration & Dermal Patterns',
      tweaks: [
        '2.1 Proboscis Monkey (A42): Added creamy-yellow neck collar ruff, pinkish-salmon facial skin mask, and dark cinnamon crown cap.',
        '2.2 Proboscis Monkey (A42): Contrasted snow-white tail and silver-grey stockings against the warm rufous-terracotta back.',
        '2.3 Sunda Clouded Leopard (A43): Rendered diagnostic large dark-Interior cloud polygons with thick jet-black posterior borders.',
        '2.4 Sunda Clouded Leopard (A43): Added twin dorsal longitudinal neck/back stripes, black-backed ears with white ocelli, and cheek tear stripes.',
        '2.5 Malayan Binturong (A44): Applied coarse charcoal-slate fur gradients with silver-frosted guard hair highlights across flanks and brow.',
        '2.6 Malayan Binturong (A44): Added prominent array of long white mystacial and supraorbital viverrid whiskers.',
        '2.7 Giant Mudskipper (A45): Painted 5 oblique dark-brown dorsal saddle bars and silvery-cream countershaded belly.',
        '2.8 Giant Mudskipper (A45): Added iridescent electric-blue dermal speckles across cheeks, operculum, and lateral flanks.',
        '2.9 Mangrove Mud Crab (A46): Added H-shaped cervical/cardiac carapace furrows and 4 blunt frontal rostral lobes between eyestalks.',
        '2.10 Mangrove Mud Crab (A46): Applied reticulated dark-brown polygonal mesh pattern onto the walking and swimming paddle legs.',
        '2.11 Reef Manta Ray (A47): Added diagnostic V-shaped white dorsal supra-branchial shoulder chevrons and crisp white ventral edge.',
        '2.12 Chambered Nautilus (A48): Painted radiating flame-orange tiger stripes over pearlescent ivory nacre with blackened umbilical callus.',
      ],
    },
    {
      iteration: 3,
      focus: '3D Volumetric Shading, Specular Highlights & Micro-Textural Detail',
      tweaks: [
        '3.1 Proboscis Monkey (A42): Added 3D cylindrical specular highlight and dual nostril cavities to the pendulous proboscis nose.',
        '3.2 Proboscis Monkey (A42): Placed a fresh green Bakau mangrove propagule pod in its near hand with calyx cap detail.',
        '3.3 Sunda Clouded Leopard (A43): Added pink felid rhinarium nose with dark philtrum cleft and subtle upper canine tooth gleam on open mouth.',
        '3.4 Sunda Clouded Leopard (A43): Added multi-row directional fur tuft strokes and ventral ambient occlusion along the belly.',
        '3.5 Malayan Binturong (A44): Rendered spiral prehensile tail tip with muscular underside grip pad shading and shaggy fur fringe.',
        '3.6 Malayan Binturong (A44): Added wet pinkish-brick viverrid nose pad with specular highlight and grizzled silver cheek tufts.',
        '3.7 Giant Mudskipper (A45): Rendered dual sail-like dorsal fins with midnight-blue membranes, fin-ray spines, and sapphire/gold ocelli rows.',
        '3.8 Giant Mudskipper (A45): Added high-mounted periscopic turret eyes with dermal cup sockets and wet cutaneous mucus sheen.',
        '3.9 Mangrove Mud Crab (A46): Added bright vermilion-orange articulation joints and white calcareous molar crushing teeth inside the chelae.',
        '3.10 Mangrove Mud Crab (A46): Added metallic olive-bronze specular carapace dome highlight and stalked compound eyes.',
        '3.11 Reef Manta Ray (A47): Rendered unfurling cephalic feeding lobes with pale cream inner lining and five pairs of ventral gill slit hints.',
        '3.12 Chambered Nautilus (A48): Added tuberculated white papillae on the leathery hood, pearlescent septal suture glow, and annulated cirri rings.',
      ],
    },
    {
      iteration: 4,
      focus: 'Corneal Eye Depth, +30% Readability Calibration & Expressive Facial Rigging',
      tweaks: [
        '4.1 Proboscis Monkey (A42): Tuned warm amber-brown iris stroma collarette and expressive brow arches above the salmon face mask.',
        '4.2 Proboscis Monkey (A42): Calibrated cheek blush pads and smiling/chewing mouth morphs underneath the overhanging nose.',
        '4.3 Sunda Clouded Leopard (A43): Applied +30% eye enlargement with emerald-gold iris gradient so eyes stand out from cloud markings.',
        '4.4 Sunda Clouded Leopard (A43): Rigged ear swivel and brow furrow for all 9 emotions (waving, laugh, wondered, blush, angry, etc.).',
        '4.5 Malayan Binturong (A44): Applied +30% eye enlargement with deep reddish-amber irises and silver brow tufts.',
        '4.6 Malayan Binturong (A44): Rigged whisker twitch and ear tassel bounce synchronized with head look and breathing.',
        '4.7 Giant Mudskipper (A45): Rigged independent periscopic turret eye rotation, dermal cup blink, and puffed opercular gill cheeks.',
        '4.8 Giant Mudskipper (A45): Positioned wide goby smile and blush ovals on the puffed opercular cheeks.',
        '4.9 Mangrove Mud Crab (A46): Rigged stalked compound eyes with glossy corneal domes, flickering antennules, and foaming maxilliped mouthparts.',
        '4.10 Reef Manta Ray (A47): Applied +30% eye enlargement on lateral cephalic eyes and rigged wide terminal filter-feeding smile.',
        '4.11 Chambered Nautilus (A48): Rendered characteristic cephalopod pinhole eye with radial iris ring, blink lid, and expressive brow.',
        '4.12 All 7 New Animals: Verified tear drop emission, sleepy eyelid closure, angry vein placement, and question/laugh props.',
      ],
    },
    {
      iteration: 5,
      focus: 'Biomechanical Locomotion, Canopy Climbing & 120° Wave Gesture Polish',
      tweaks: [
        '5.1 Proboscis Monkey (A42): Tuned 4-beat arboreal walk, vertical Bakau tree climbing reach, and 120° rear-upper forelimb wave.',
        '5.2 Proboscis Monkey (A42): Added harmonic S-curve balance wave along the long cream-white tail.',
        '5.3 Sunda Clouded Leopard (A43): Tuned supple feline prowl stride, canopy climbing articulation, and 120° paw wave.',
        '5.4 Sunda Clouded Leopard (A43): Synchronized thick cloud-ringed tail counterbalance swing with locomotion phase.',
        '5.5 Malayan Binturong (A44): Tuned heavy-footed canopy walk and animated prehensile tail coil flexion.',
        '5.6 Giant Mudskipper (A45): Animated pectoral crutch-fin vaulting stride and dorsal sail fin flare during waves and emotes.',
        '5.7 Giant Mudskipper (A45): Added caudal tail-skip flexion and throat buccal-pump breathing pulse.',
        '5.8 Mangrove Mud Crab (A46): Animated multi-leg scuttling phase, swimming paddle scull, and 120° giant crusher chela wave.',
        '5.9 Reef Manta Ray (A47): Animated sinusoidal pelagic wing-flapping flight, cephalic lobe unfurl wave, and whip-tail trail.',
        '5.10 Chambered Nautilus (A48): Animated hyponome jet-propulsion rocking, trailing tentacle cirri wave, and 120° upper cirri salute.',
      ],
    },
  ] as const;

  /* ============================================================================
   * A42: PROBOSCIS MONKEY (Nasalis larvatus)
   * ========================================================================== */
  function drawProboscisMonkeyRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#29150b';
    const rufousLight = '#e06d3b';
    const rufousMid = '#c24d22';
    const rufousDark = '#8c3112';
    const ochreLight = '#f6ad55';
    const ochreMid = '#dd6b20';
    const bellyLight = '#fef9ef';
    const bellyDark = '#e2d9c8';
    const limbGreyLight = '#e2e8f0';
    const limbGreyMid = '#94a3b8';
    const limbGreyDark = '#64748b';
    const facePinkLight = '#f7a89e';
    const facePinkMid = '#e57c70';
    const facePinkDark = '#c4594d';

    // 1. Long Cream-White Balancing Tail (extending from posterior rump with S-wave)
    ctx.save();
    ctx.translate(-128 + pose.shellOffsetX, 42 + pose.shellOffsetY);
    ctx.rotate(Math.sin(pose.waveRaysPhase * 0.7) * 0.08 + pose.hindNearAngle * 0.2);
    const tailP = new Path2D();
    tailP.moveTo(14, -12);
    tailP.bezierCurveTo(-48, -28, -118, 8, -142, 74);
    tailP.bezierCurveTo(-152, 102, -132, 114, -116, 92);
    tailP.bezierCurveTo(-92, 34, -36, -4, 14, 10);
    tailP.closePath();
    fillRimAndStroke(ctx, tailP, -145, -28, 15, 110, '#ffffff', '#f1f5f9', '#cbd5e1', outline, 3.4);
    ctx.restore();

    // 2. Far Limbs (silver-grey stockings & dark charcoal hands/feet)
    drawSculptedPawLimb(ctx, -64, 76, pose.hindFarAngle * 0.44, 108, 42, limbGreyLight, limbGreyMid, limbGreyDark, outline, {
      pawTipColor: '#334155',
      clawsColor: '#1e293b',
    });
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
    drawSculptedPawLimb(
      ctx,
      48,
      68,
      pose.farFlipperAngle * 0.42 - 0.08 - 0.45 * farGestureAmt,
      110,
      40,
      ochreLight,
      ochreMid,
      rufousDark,
      outline,
      {
        pawTipColor: '#334155',
        pawPadColor: farGestureAmt > 0.3 ? '#f48fb1' : undefined,
      },
    );

    // 3. Pot-Bellied Folivore Torso with Brick-Rufous Dorsal Cape & Cream Neck Collar
    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);
    const torso = new Path2D();
    torso.moveTo(-136, 36);
    torso.bezierCurveTo(-148, -32, -82, -68, -4, -56);
    torso.bezierCurveTo(68, -44, 104, 8, 96, 76);
    torso.bezierCurveTo(86, 142, -6, 156, -86, 138);
    torso.bezierCurveTo(-126, 126, -134, 82, -136, 36);
    torso.closePath();
    fillRimAndStroke(ctx, torso, -136, -64, 96, 152, rufousLight, rufousMid, rufousDark, outline, 3.6);

    ctx.save();
    ctx.clip(torso);
    // Distinctive rounded cream-buff pot-belly
    const bellyP = new Path2D();
    bellyP.ellipse(-8, 78, 86, 62, 0.08, 0, Math.PI * 2);
    const bGrad = ctx.createLinearGradient(-8, 18, -8, 142);
    bGrad.addColorStop(0, bellyLight);
    bGrad.addColorStop(1, bellyDark);
    ctx.fillStyle = bGrad;
    ctx.fill(bellyP);

    // Creamy-gold shoulder & neck collar shawl
    const collarP = new Path2D();
    collarP.moveTo(12, -56);
    collarP.bezierCurveTo(64, -46, 98, -2, 92, 46);
    collarP.bezierCurveTo(62, 54, 28, 34, 6, -4);
    collarP.closePath();
    ctx.fillStyle = '#fde68a';
    ctx.fill(collarP);
    ctx.restore();

    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(torso);
    ctx.restore();

    // 4. Near Hind Leg & Near Front Arm (with 120° wave offset)
    drawSculptedPawLimb(ctx, -96, 78, pose.hindNearAngle * 0.45, 110, 44, limbGreyLight, limbGreyMid, limbGreyDark, outline, {
      pawTipColor: '#334155',
      clawsColor: '#1e293b',
    });

    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    drawSculptedPawLimb(
      ctx,
      6,
      72,
      pose.nearFlipperAngle * (0.38 + 0.2 * waveAmt) + 0.04 - 0.52 * waveAmt - 0.2 * pose.nearFlipperTuckAmount,
      110,
      42,
      ochreLight,
      ochreMid,
      rufousDark,
      outline,
      {
        pawTipColor: '#334155',
        pawPadColor: waveAmt > 0.35 ? '#f48fb1' : undefined,
      },
    );

    // Fresh green Mangrove Propagule pod held near chest
    ctx.save();
    ctx.translate(78, 54);
    ctx.rotate(0.32 + Math.sin(pose.waveRaysPhase * 0.8) * 0.05);
    const propGrad = ctx.createLinearGradient(-5, -42, 5, 42);
    propGrad.addColorStop(0, '#84cc16');
    propGrad.addColorStop(0.6, '#4d7c0f');
    propGrad.addColorStop(1, '#365314');
    ctx.fillStyle = propGrad;
    ctx.strokeStyle = '#1a2e05';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, -44);
    ctx.bezierCurveTo(7, -22, 8, 18, 0, 46);
    ctx.bezierCurveTo(-8, 18, -7, -22, 0, -44);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Calyx bell cap at top of propagule
    ctx.fillStyle = '#a16207';
    ctx.beginPath();
    ctx.ellipse(0, -42, 6, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 5. Head, Creamy Throat Ruff, Rufous Crown Cap & Signature Pendulous Nose
    ctx.save();
    ctx.translate(58 + pose.headX, -42 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    // Fluffy cream-white cheek & throat ruff framing the head
    const ruffP = new Path2D();
    ruffP.ellipse(2, 4, 96, 82, 0.02, 0, Math.PI * 2);
    fillRimAndStroke(ctx, ruffP, -92, -78, 94, 84, '#fffbeb', '#fef3c7', '#d6c7b2', outline, 3.6);

    // Brick-rufous dorsal cranial cap
    const capP = new Path2D();
    capP.moveTo(-76, -24);
    capP.bezierCurveTo(-68, -86, 44, -92, 74, -32);
    capP.bezierCurveTo(42, -48, -32, -46, -76, -24);
    capP.closePath();
    fillRimAndStroke(ctx, capP, -74, -88, 72, -24, rufousLight, rufousMid, rufousDark, outline, 3.2);

    // Pinkish-salmon facial skin mask
    const maskP = new Path2D();
    maskP.ellipse(12 + lookX * 0.55, -2 + lookY * 0.55, 68, 54, 0.03, 0, Math.PI * 2);
    fillRimAndStroke(ctx, maskP, -56, -54, 80, 52, facePinkLight, facePinkMid, facePinkDark, outline, 3.0);

    drawSoftCheekBlushes(ctx, -42 + lookX * 0.75, 18 + lookY * 0.75, 64 + lookX * 0.75, 22 + lookY * 0.75, 20, 12, Math.max(0.32, pose.blushAlpha));

    // Expressive mouth positioned beneath the overhanging nose
    drawExpressiveAnimalMouth(ctx, 18 + lookX * 0.85, 34 + lookY * 0.85, 0.82, 0.04, pose, outline);

    // Expressive eyes & brows
    drawGlossyAnimalEye(ctx, 'left', -24 + lookX * 0.85, -12 + lookY * 0.85, 14.5, 16.5, -0.05, pose, IRIS_PALETTES.amberGold, facePinkLight, facePinkDark, outline);
    drawGlossyAnimalEye(ctx, 'right', 52 + lookX * 0.85, -8 + lookY * 0.85, 12.8, 14.8, 0.08, pose, IRIS_PALETTES.amberGold, facePinkLight, facePinkDark, outline);
    drawExpressiveAnimalBrows(ctx, -24 + lookX * 0.85, -34 + lookY * 0.85, 52 + lookX * 0.85, -30 + lookY * 0.85, 20, pose, rufousDark, 3.6);

    // Iconic Large Pendulous Proboscis Nose (drawn in front of muzzle with 3D shading & subtle bounce)
    ctx.save();
    const noseSway = Math.sin(pose.waveRaysPhase * 0.9) * 0.04;
    ctx.translate(22 + lookX * 0.95, -6 + lookY * 0.9);
    ctx.rotate(noseSway);
    const noseP = new Path2D();
    noseP.moveTo(-14, -8);
    noseP.bezierCurveTo(-24, 10, -28, 36, -12, 46);
    noseP.bezierCurveTo(4, 54, 26, 46, 28, 24);
    noseP.bezierCurveTo(30, 4, 16, -12, -14, -8);
    noseP.closePath();
    fillRimAndStroke(ctx, noseP, -24, -10, 28, 50, '#fbcfe8', facePinkLight, facePinkDark, outline, 3.2);
    // Specular bulb highlight & nostrils
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    drawOvalSpot(ctx, 6, 16, 8, 14, -0.15);
    ctx.fillStyle = outline;
    drawOvalSpot(ctx, -6, 36, 3.5, 5.5, 0.25);
    drawOvalSpot(ctx, 12, 34, 3.5, 5.5, -0.25);
    ctx.restore();

    ctx.restore();
  }

  /* ============================================================================
   * A43: SUNDA CLOUDED LEOPARD (Neofelis diardi)
   * ========================================================================== */
  function drawSundaCloudedLeopardRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#1c1108';
    const coatLight = '#f3cc86';
    const coatMid = '#c9974c';
    const coatDark = '#8c6223';
    const cloudFill = '#593b18';
    const cloudRim = '#1a0f06';
    const creamLight = '#fffdf7';
    const creamDark = '#e6dec8';

    // 1. Extra-Long Thick Cloud-Ringed Balancing Tail (characteristic of Neofelis diardi)
    ctx.save();
    ctx.translate(-142 + pose.shellOffsetX, 26 + pose.shellOffsetY);
    ctx.rotate(Math.sin(pose.waveRaysPhase * 0.65) * 0.09 + pose.hindNearAngle * 0.18);
    const tailP = new Path2D();
    tailP.moveTo(16, -14);
    tailP.bezierCurveTo(-56, -34, -138, -2, -168, 68);
    tailP.bezierCurveTo(-182, 102, -148, 122, -126, 94);
    tailP.bezierCurveTo(-98, 42, -38, 6, 16, 14);
    tailP.closePath();
    fillRimAndStroke(ctx, tailP, -172, -32, 16, 114, coatLight, coatMid, coatDark, outline, 3.6);
    ctx.save();
    ctx.clip(tailP);
    ctx.fillStyle = cloudRim;
    for (const [rx, ry, r1, r2, rot] of [
      [-32, -8, 12, 22, 0.25],
      [-74, 8, 14, 24, 0.45],
      [-114, 40, 15, 24, 0.72],
      [-148, 82, 22, 26, 0.9],
    ] as const) {
      drawOvalSpot(ctx, rx, ry, r1, r2, rot);
    }
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(tailP);
    ctx.restore();

    // 2. Far Limbs (muscular low-slung canopy stalking legs with broad paws)
    drawSculptedPawLimb(ctx, -76, 72, pose.hindFarAngle * 0.45, 110, 48, coatMid, coatDark, '#5e4014', outline, {
      pawTipColor: creamLight,
      stripesColor: cloudRim,
      clawsColor: '#fffbeb',
    });
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
    drawSculptedPawLimb(
      ctx,
      54,
      70,
      pose.farFlipperAngle * 0.42 - 0.06 - 0.48 * farGestureAmt,
      112,
      48,
      coatLight,
      coatMid,
      coatDark,
      outline,
      {
        pawTipColor: creamLight,
        pawPadColor: farGestureAmt > 0.3 ? '#f48fb1' : undefined,
        stripesColor: cloudRim,
        clawsColor: '#fffbeb',
      },
    );

    // 3. Sculpted Torso with Irregular Dark-Edged Cloud Polygons
    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);
    const torso = new Path2D();
    torso.moveTo(-168, 34);
    torso.bezierCurveTo(-178, -32, -102, -64, -6, -54);
    torso.bezierCurveTo(76, -44, 110, 8, 100, 76);
    torso.bezierCurveTo(86, 134, -8, 144, -98, 132);
    torso.bezierCurveTo(-152, 122, -164, 80, -168, 34);
    torso.closePath();
    fillRimAndStroke(ctx, torso, -168, -60, 104, 140, coatLight, coatMid, coatDark, outline, 3.6);

    ctx.save();
    ctx.clip(torso);
    // Countershaded cream belly & chest
    const bellyP = new Path2D();
    bellyP.ellipse(-18, 118, 114, 38, 0.03, 0, Math.PI * 2);
    const bGrad = ctx.createLinearGradient(0, 82, 0, 144);
    bGrad.addColorStop(0, creamLight);
    bGrad.addColorStop(1, creamDark);
    ctx.fillStyle = bGrad;
    ctx.fill(bellyP);

    // Diagnostic dark-rimmed Cloud Ellipses on flanks & shoulders
    for (const [cx, cy, rx, ry, rot] of [
      [-122, 6, 28, 34, 0.18],
      [-58, -4, 32, 38, 0.08],
      [8, 8, 28, 34, -0.12],
      [-92, 64, 24, 20, 0.22],
      [-22, 68, 26, 20, -0.08],
    ] as const) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.fillStyle = cloudFill;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // Heavy jet-black posterior cloud border
      ctx.strokeStyle = cloudRim;
      ctx.lineWidth = 6.2;
      ctx.beginPath();
      ctx.arc(0, 0, rx * 0.92, Math.PI * 0.55, Math.PI * 1.65);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(torso);
    ctx.restore();

    // 4. Near Hind Leg & Near Front Leg (with 120° wave offset)
    drawSculptedPawLimb(ctx, -110, 74, pose.hindNearAngle * 0.45, 112, 50, coatLight, coatMid, coatDark, outline, {
      pawTipColor: creamLight,
      stripesColor: cloudRim,
      clawsColor: '#fffbeb',
    });

    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    drawSculptedPawLimb(
      ctx,
      10,
      70,
      pose.nearFlipperAngle * (0.38 + 0.2 * waveAmt) + 0.05 - 0.52 * waveAmt - 0.22 * pose.nearFlipperTuckAmount,
      114,
      50,
      coatLight,
      coatMid,
      coatDark,
      outline,
      {
        pawTipColor: creamLight,
        pawPadColor: waveAmt > 0.35 ? '#f48fb1' : undefined,
        stripesColor: cloudRim,
        clawsColor: '#fffbeb',
      },
    );

    // 5. Sculpted Felid Head, Black-Backed Ocelli Ears, Tear Stripes & Emerald-Amber Eyes
    ctx.save();
    ctx.translate(62 + pose.headX, -38 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    // Rounded black-backed felid ears with white central ocelli spots
    for (const [ex, ey, rot] of [
      [-68, -72, -0.25],
      [74, -66, 0.28],
    ] as const) {
      ctx.save();
      ctx.translate(ex + lookX * 0.3, ey + lookY * 0.3);
      ctx.rotate(rot);
      const earP = new Path2D();
      earP.arc(0, 0, 26, 0, Math.PI * 2);
      fillRimAndStroke(ctx, earP, -26, -26, 26, 26, '#3a2410', cloudRim, outline, outline, 3.4);
      ctx.fillStyle = creamLight;
      drawOvalSpot(ctx, 0, 2, 12, 10, 0);
      ctx.restore();
    }

    const headP = new Path2D();
    headP.ellipse(4, -2, 92, 76, 0.03, 0, Math.PI * 2);
    fillRimAndStroke(ctx, headP, -88, -76, 92, 76, coatLight, coatMid, coatDark, outline, 3.8);

    ctx.save();
    ctx.clip(headP);
    // Cheek cloud stripes & crown spots
    ctx.fillStyle = cloudRim;
    drawOvalSpot(ctx, -62 + lookX * 0.5, 12 + lookY * 0.5, 22, 6, 0.25);
    drawOvalSpot(ctx, -56 + lookX * 0.5, 28 + lookY * 0.5, 20, 5.5, 0.18);
    drawOvalSpot(ctx, -8 + lookX * 0.6, -54 + lookY * 0.6, 8, 16, -0.1);
    drawOvalSpot(ctx, 24 + lookX * 0.6, -52 + lookY * 0.6, 8, 16, 0.1);
    drawSoftCheekBlushes(ctx, -46 + lookX * 0.8, 22 + lookY * 0.8, 66 + lookX * 0.8, 26 + lookY * 0.8, 22, 13, Math.max(0.28, pose.blushAlpha));
    ctx.restore();
    ctx.lineWidth = 3.8;
    ctx.strokeStyle = outline;
    ctx.stroke(headP);

    // Creamy muzzle & pink felid nose
    const muzzleP = new Path2D();
    muzzleP.ellipse(18 + lookX * 0.9, 24 + lookY * 0.85, 38, 24, 0.03, 0, Math.PI * 2);
    fillRimAndStroke(ctx, muzzleP, -20, 0, 56, 48, creamLight, creamDark, '#cbb997', outline, 3.0);

    const noseX = 20 + lookX * 0.95;
    const noseY = 12 + lookY * 0.9;
    ctx.fillStyle = '#f48fb1';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(noseX - 13, noseY - 5);
    ctx.quadraticCurveTo(noseX, noseY - 9, noseX + 13, noseY - 5);
    ctx.quadraticCurveTo(noseX + 8, noseY + 8, noseX, noseY + 10);
    ctx.quadraticCurveTo(noseX - 8, noseY + 8, noseX - 13, noseY - 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    drawExpressiveAnimalMouth(ctx, 20 + lookX * 0.9, 34 + lookY * 0.85, 0.88, 0.05, pose, outline);
    drawGlossyAnimalEye(ctx, 'left', -26 + lookX * 0.85, -10 + lookY * 0.85, 13.5, 15.5, -0.06, pose, IRIS_PALETTES.emeraldForest, coatLight, coatDark, outline);
    drawGlossyAnimalEye(ctx, 'right', 54 + lookX * 0.85, -4 + lookY * 0.85, 12.0, 14.0, 0.08, pose, IRIS_PALETTES.emeraldForest, coatLight, coatDark, outline);
    drawExpressiveAnimalBrows(ctx, -26 + lookX * 0.85, -34 + lookY * 0.85, 54 + lookX * 0.85, -28 + lookY * 0.85, 20, pose, outline, 3.6);
    ctx.restore();
  }

  /* ============================================================================
   * A44: MALAYAN BINTURONG / BEARCAT (Arctictis binturong)
   * ========================================================================== */
  function drawBinturongRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#090d16';
    const furLight = '#64748b';
    const furMid = '#334155';
    const furDark = '#1e293b';
    const silverTip = '#cbd5e1';

    // 1. Thick Muscular Prehensile Tail with Curled Grasping Tip
    ctx.save();
    ctx.translate(-138 + pose.shellOffsetX, 28 + pose.shellOffsetY);
    ctx.rotate(Math.sin(pose.waveRaysPhase * 0.6) * 0.08 + pose.hindNearAngle * 0.16);
    const tailP = new Path2D();
    tailP.moveTo(18, -18);
    tailP.bezierCurveTo(-58, -42, -148, -12, -168, 48);
    tailP.bezierCurveTo(-182, 92, -134, 118, -104, 88);
    tailP.bezierCurveTo(-86, 70, -98, 42, -118, 52);
    tailP.bezierCurveTo(-132, 60, -124, 82, -108, 72);
    tailP.bezierCurveTo(-78, 32, -32, 8, 18, 16);
    tailP.closePath();
    fillRimAndStroke(ctx, tailP, -176, -40, 18, 112, furLight, furMid, furDark, outline, 3.8);
    ctx.restore();

    // 2. Far Heavy-Set Plantigrade Limbs
    drawSculptedPawLimb(ctx, -74, 74, pose.hindFarAngle * 0.42, 104, 48, furMid, furDark, '#0f172a', outline, {
      pawTipColor: '#0f172a',
      clawsColor: '#e2e8f0',
    });
    const farGestureAmt = Math.max(pose.farFlipperChinAmount, pose.farFlipperRaiseAmount);
    drawSculptedPawLimb(
      ctx,
      50,
      72,
      pose.farFlipperAngle * 0.4 - 0.06 - 0.46 * farGestureAmt,
      106,
      48,
      furLight,
      furMid,
      furDark,
      outline,
      {
        pawTipColor: '#0f172a',
        pawPadColor: farGestureAmt > 0.3 ? '#f48fb1' : undefined,
        clawsColor: '#e2e8f0',
      },
    );

    // 3. Shaggy Charcoal-Slate Torso with Silver-Frosted Guard Hairs
    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);
    const torso = new Path2D();
    torso.moveTo(-164, 36);
    torso.bezierCurveTo(-176, -34, -98, -70, -4, -58);
    torso.bezierCurveTo(78, -46, 112, 8, 102, 78);
    torso.bezierCurveTo(88, 138, -6, 148, -96, 136);
    torso.bezierCurveTo(-148, 126, -160, 82, -164, 36);
    torso.closePath();
    fillRimAndStroke(ctx, torso, -164, -66, 102, 144, furLight, furMid, furDark, outline, 3.8);

    // Silver-grizzled guard hair strokes across back & flanks
    ctx.save();
    ctx.clip(torso);
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
    ctx.lineWidth = 2.4;
    for (const [fx, fy] of [
      [-128, -18], [-88, -28], [-46, -32], [-4, -26], [36, -14],
      [-112, 16], [-68, 8], [-22, 12], [22, 22], [-84, 52], [-34, 56],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(fx - 10, fy + 4, fx - 18, fy + 10);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();

    // 4. Near Hind Leg & Near Front Limb (with 120° wave offset)
    drawSculptedPawLimb(ctx, -108, 76, pose.hindNearAngle * 0.44, 106, 50, furLight, furMid, furDark, outline, {
      pawTipColor: '#0f172a',
      clawsColor: '#e2e8f0',
    });

    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);
    drawSculptedPawLimb(
      ctx,
      8,
      72,
      pose.nearFlipperAngle * (0.38 + 0.2 * waveAmt) + 0.04 - 0.52 * waveAmt - 0.22 * pose.nearFlipperTuckAmount,
      108,
      50,
      furLight,
      furMid,
      furDark,
      outline,
      {
        pawTipColor: '#0f172a',
        pawPadColor: waveAmt > 0.35 ? '#f48fb1' : undefined,
        clawsColor: '#e2e8f0',
      },
    );

    // 5. Grizzled Head, White-Rimmed Tufted Ears, Long White Whiskers & Reddish-Amber Eyes
    ctx.save();
    ctx.translate(60 + pose.headX, -36 + pose.headY);
    ctx.rotate(pose.headRot);
    ctx.scale(pose.headScaleX, pose.headScaleY);
    const lookX = pose.headLookX * 14;
    const lookY = pose.headLookY * 10;

    // Rounded ears with crisp white rims & long cascading black ear-tip tassels
    for (const [ex, ey, side] of [
      [-66, -68, -1],
      [70, -62, 1],
    ] as const) {
      ctx.save();
      ctx.translate(ex + lookX * 0.3, ey + lookY * 0.3);
      const earP = new Path2D();
      earP.arc(0, 0, 25, 0, Math.PI * 2);
      fillRimAndStroke(ctx, earP, -25, -25, 25, 25, silverTip, '#94a3b8', furDark, outline, 3.4);
      ctx.fillStyle = furDark;
      drawOvalSpot(ctx, 0, 2, 15, 15, 0);
      // Long black ear-tuft tassel
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(side * 12, -16);
      ctx.quadraticCurveTo(side * 28, -28, side * 34, -8);
      ctx.moveTo(side * 16, -10);
      ctx.quadraticCurveTo(side * 32, -16, side * 38, 4);
      ctx.stroke();
      ctx.restore();
    }

    const headP = new Path2D();
    headP.ellipse(4, 0, 90, 74, 0.03, 0, Math.PI * 2);
    fillRimAndStroke(ctx, headP, -86, -74, 90, 74, '#94a3b8', furLight, furDark, outline, 3.8);

    drawSoftCheekBlushes(ctx, -44 + lookX * 0.8, 22 + lookY * 0.8, 64 + lookX * 0.8, 26 + lookY * 0.8, 22, 13, Math.max(0.28, pose.blushAlpha));

    // Grizzled muzzle & wet brick-pink nose
    const muzzleP = new Path2D();
    muzzleP.ellipse(18 + lookX * 0.9, 24 + lookY * 0.85, 36, 24, 0.03, 0, Math.PI * 2);
    fillRimAndStroke(ctx, muzzleP, -18, 0, 54, 48, silverTip, '#94a3b8', furMid, outline, 3.0);

    // Prominent long white viverrid whiskers
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.2;
    for (const [wx, wy, dx, dy] of [
      [-6 + lookX * 0.9, 22 + lookY * 0.85, -52, 8],
      [-6 + lookX * 0.9, 28 + lookY * 0.85, -48, 20],
      [42 + lookX * 0.9, 22 + lookY * 0.85, 52, 8],
      [42 + lookX * 0.9, 28 + lookY * 0.85, 48, 20],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(wx + dx * 0.5, wy + dy * 0.2, wx + dx, wy + dy);
      ctx.stroke();
    }

    const noseX = 20 + lookX * 0.95;
    const noseY = 12 + lookY * 0.9;
    ctx.fillStyle = '#be185d';
    drawOvalSpot(ctx, noseX, noseY, 13, 9.5, 0.03);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    drawOvalSpot(ctx, noseX - 3, noseY - 2.5, 4.5, 2.2, -0.1);

    drawExpressiveAnimalMouth(ctx, 20 + lookX * 0.9, 35 + lookY * 0.85, 0.84, 0.05, pose, outline);
    drawGlossyAnimalEye(ctx, 'left', -24 + lookX * 0.85, -10 + lookY * 0.85, 12.0, 14.0, -0.05, pose, IRIS_PALETTES.warmBrown, silverTip, furDark, outline);
    drawGlossyAnimalEye(ctx, 'right', 54 + lookX * 0.85, -4 + lookY * 0.85, 10.8, 12.8, 0.08, pose, IRIS_PALETTES.warmBrown, silverTip, furDark, outline);
    drawExpressiveAnimalBrows(ctx, -24 + lookX * 0.85, -32 + lookY * 0.85, 54 + lookX * 0.85, -26 + lookY * 0.85, 19, pose, silverTip, 3.6);
    ctx.restore();
  }

  /* ============================================================================
   * A45: GIANT MUDSKIPPER (Periophthalmodon schlosseri)
   * ========================================================================== */
  function drawMudskipperRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#1e1910';
    const bodyLight = '#9c8b5e';
    const bodyMid = '#6e5f3b';
    const bodyDark = '#443921';
    const bellyCream = '#e2e8f0';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);

    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    // 1. Sail-Like Dual Dorsal Fins (anterior fan + posterior ribbon with sapphire & gold spots)
    const finFlare = 1 + 0.18 * waveAmt + Math.sin(pose.waveRaysPhase * 0.8) * 0.05;
    ctx.save();
    ctx.translate(-22, -26);
    ctx.scale(1, finFlare);
    const dFin1 = new Path2D();
    dFin1.moveTo(-48, 8);
    dFin1.bezierCurveTo(-44, -64, 18, -72, 34, 4);
    dFin1.closePath();
    fillRimAndStroke(ctx, dFin1, -48, -68, 34, 8, '#1e3a8a', '#172554', '#0f172a', outline, 3.2);
    // Fin rays & iridescent blue/gold spots
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 2.0;
    for (let r = -34; r <= 20; r += 13) {
      ctx.beginPath();
      ctx.moveTo(r, 4);
      ctx.lineTo(r * 1.05, -46);
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      drawOvalSpot(ctx, r, -26, 4.5, 4.5, 0);
      ctx.fillStyle = '#fde047';
      drawOvalSpot(ctx, r, -42, 3.5, 3.5, 0);
    }

    const dFin2 = new Path2D();
    dFin2.moveTo(-132, 18);
    dFin2.bezierCurveTo(-124, -36, -64, -42, -52, 8);
    dFin2.closePath();
    fillRimAndStroke(ctx, dFin2, -132, -40, -52, 18, '#1d4ed8', '#1e3a8a', '#0f172a', outline, 3.0);
    ctx.restore();

    // 2. Far Elbowed Pectoral Crutch Fin
    drawSculptedPawLimb(ctx, 42, 62, pose.farFlipperAngle * 0.38 - 0.18, 76, 36, bodyLight, bodyMid, bodyDark, outline, {
      pawTipColor: '#475569',
    });

    // 3. Elongated Amphibious Goby Body & Rounded Caudal Tail Fin
    const caudalP = new Path2D();
    caudalP.moveTo(-152, 16);
    caudalP.bezierCurveTo(-218, -24, -226, 68, -152, 48);
    caudalP.closePath();
    fillRimAndStroke(ctx, caudalP, -222, -20, -152, 60, '#334155', '#1e293b', '#0f172a', outline, 3.4);

    const bodyP = new Path2D();
    bodyP.moveTo(-162, 26);
    bodyP.bezierCurveTo(-142, -24, -38, -38, 62, -22);
    bodyP.bezierCurveTo(118, -12, 138, 28, 122, 66);
    bodyP.bezierCurveTo(96, 98, -28, 96, -158, 46);
    bodyP.closePath();
    fillRimAndStroke(ctx, bodyP, -162, -36, 134, 96, bodyLight, bodyMid, bodyDark, outline, 3.6);

    ctx.save();
    ctx.clip(bodyP);
    // Countershaded silvery-cream belly
    ctx.fillStyle = bellyCream;
    ctx.beginPath();
    ctx.ellipse(-6, 84, 138, 32, 0.02, 0, Math.PI * 2);
    ctx.fill();
    // Dark saddle bars
    ctx.fillStyle = 'rgba(30, 25, 16, 0.42)';
    for (const sx of [-118, -74, -26, 22]) {
      drawOvalSpot(ctx, sx, 4, 14, 38, 0.24);
    }
    // Iridescent electric-blue mudskipper speckles!
    ctx.fillStyle = '#38bdf8';
    for (const [bx, by] of [
      [-124, 24], [-96, 18], [-82, 34], [-54, 16], [-38, 36],
      [-12, 22], [14, 34], [38, 18], [56, 38], [78, 26], [92, 42],
    ] as const) {
      drawOvalSpot(ctx, bx, by, 4.2, 3.2, 0);
    }
    ctx.restore();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = outline;
    ctx.stroke(bodyP);

    // 4. Muscular Elbowed Near Pectoral "Crutch" Fin (lifts and waves at 120°!)
    ctx.save();
    ctx.translate(12, 58);
    ctx.rotate(pose.nearFlipperAngle * 0.42 - 0.55 * waveAmt);
    const pecP = new Path2D();
    pecP.moveTo(-14, -10);
    pecP.bezierCurveTo(12, 8, 36, 36, 28, 66);
    pecP.bezierCurveTo(16, 84, -22, 78, -28, 54);
    pecP.bezierCurveTo(-30, 28, -22, 4, -14, -10);
    pecP.closePath();
    fillRimAndStroke(ctx, pecP, -28, -10, 32, 80, bodyLight, bodyMid, bodyDark, outline, 3.4);
    // Fin rays on pectoral crutch fin
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.8;
    for (const rx of [-14, -2, 10]) {
      ctx.beginPath();
      ctx.moveTo(rx * 0.4, 24);
      ctx.lineTo(rx, 68);
      ctx.stroke();
    }
    ctx.restore();

    // 5. Puffed Opercular Head & High-Mounted Periscopic Turret Eyes
    ctx.save();
    ctx.translate(72 + pose.headX * 0.7, -4 + pose.headY * 0.7);
    ctx.rotate(pose.headRot * 0.7);
    const lookX = pose.headLookX * 10;
    const lookY = pose.headLookY * 8;

    drawSoftCheekBlushes(ctx, -18 + lookX * 0.7, 26 + lookY * 0.7, 46 + lookX * 0.7, 28 + lookY * 0.7, 18, 11, Math.max(0.3, pose.blushAlpha));
    drawExpressiveAnimalMouth(ctx, 26 + lookX * 0.85, 38 + lookY * 0.85, 0.9, 0.02, pose, outline);

    // High-mounted periscopic turret eye stalks on top of the head
    for (const [tx, ty, isLeft] of [
      [-4, -32, true],
      [28, -30, false],
    ] as const) {
      ctx.save();
      ctx.translate(tx + lookX * 0.6, ty + lookY * 0.6);
      const cupP = new Path2D();
      cupP.ellipse(0, 4, 18, 20, 0, 0, Math.PI * 2);
      fillRimAndStroke(ctx, cupP, -18, -16, 18, 22, bodyLight, bodyMid, bodyDark, outline, 3.2);
      drawGlossyAnimalEye(
        ctx,
        isLeft ? 'left' : 'right',
        2 + lookX * 0.25,
        -2 + lookY * 0.25,
        13.5,
        15.0,
        0,
        pose,
        IRIS_PALETTES.amberGold,
        bodyLight,
        bodyDark,
        outline,
      );
      ctx.restore();
    }
    drawExpressiveAnimalBrows(ctx, -4 + lookX * 0.8, -54 + lookY * 0.8, 28 + lookX * 0.8, -52 + lookY * 0.8, 16, pose, outline, 3.2);
    ctx.restore();
    ctx.restore();
  }

  /* ============================================================================
   * A46: MANGROVE MUD CRAB (Scylla serrata)
   * ========================================================================== */
  function drawGiantMudCrabRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#111c09';
    const shellLight = '#4d7c0f';
    const shellMid = '#365314';
    const shellDark = '#1a2e05';
    const jointOrange = '#ea580c';
    const clawTip = '#7c2d12';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);

    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY + 12);
    ctx.rotate(pose.shellRot);

    // 1. Three Pairs of Jointed Walking Legs & Marbled Swimming Paddle Hind Legs
    for (const side of [-1, 1] as const) {
      // Flattened Natatory Swimming Paddle Leg (Rearmost)
      ctx.save();
      ctx.translate(side * 86, 34);
      ctx.rotate(side * (0.45 + Math.sin(pose.waveRaysPhase * 0.9 + side) * 0.12));
      const padP = new Path2D();
      padP.ellipse(side * 34, 18, 28, 14, side * 0.35, 0, Math.PI * 2);
      fillRimAndStroke(ctx, padP, -28, -14, 56, 32, '#65a30d', shellMid, shellDark, outline, 3.0);
      ctx.restore();

      // 3 Jointed Walking Legs per side
      for (let l = 0; l < 3; l++) {
        const legStride = Math.sin(pose.waveRaysPhase * 1.1 + l * 1.4 + side) * 0.14;
        ctx.save();
        ctx.translate(side * (72 + l * 18), 12 + l * 14);
        ctx.rotate(side * (0.18 + l * 0.16) + legStride);
        const segP = new Path2D();
        segP.moveTo(0, -8);
        segP.quadraticCurveTo(side * 46, -12, side * 72, 26);
        segP.quadraticCurveTo(side * 84, 56, side * 68, 78);
        segP.quadraticCurveTo(side * 58, 52, side * 44, 18);
        segP.quadraticCurveTo(side * 22, 6, 0, 8);
        segP.closePath();
        fillRimAndStroke(ctx, segP, -72, -12, 72, 78, shellLight, shellMid, shellDark, outline, 3.2);
        ctx.fillStyle = jointOrange;
        drawOvalSpot(ctx, side * 44, 12, 6, 5, 0);
        ctx.restore();
      }
    }

    // 2. Broad Hexagonal-Oval Carapace with 9 Serrated Anterolateral Spines per Side
    const caraP = new Path2D();
    caraP.moveTo(-124, 6);
    caraP.bezierCurveTo(-118, -58, -56, -86, 0, -86);
    caraP.bezierCurveTo(56, -86, 118, -58, 124, 6);
    caraP.bezierCurveTo(106, 68, 54, 88, 0, 88);
    caraP.bezierCurveTo(-54, 88, -106, 68, -124, 6);
    caraP.closePath();
    fillRimAndStroke(ctx, caraP, -124, -86, 124, 88, shellLight, shellMid, shellDark, outline, 3.8);

    // Serrated marginal teeth along left & right anterolateral borders
    ctx.fillStyle = shellLight;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.6;
    for (const side of [-1, 1] as const) {
      for (let s = 0; s < 5; s++) {
        const ang = -0.35 - s * 0.22;
        const sx = side * Math.cos(ang) * 116;
        const sy = Math.sin(ang) * 78;
        ctx.beginPath();
        ctx.arc(sx, sy, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // H-shaped anatomical gastric/cardiac carapace groove & bronze sheen
    ctx.strokeStyle = 'rgba(20, 38, 8, 0.55)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-28, -28);
    ctx.quadraticCurveTo(-18, 4, -26, 36);
    ctx.moveTo(28, -28);
    ctx.quadraticCurveTo(18, 4, 26, 36);
    ctx.moveTo(-22, 4);
    ctx.lineTo(22, 4);
    ctx.stroke();

    // 3. Massive Asymmetrical Crusher & Cutter Chelipeds (Claws) with White Molar Teeth
    for (const [side, isWaveClaw] of [
      [-1, true],
      [1, false],
    ] as const) {
      ctx.save();
      const lift = isWaveClaw ? -0.62 * waveAmt : 0;
      ctx.translate(side * 82, -32);
      ctx.rotate(side * 0.25 + lift + (isWaveClaw ? pose.nearFlipperAngle * 0.3 : pose.farFlipperAngle * 0.25));
      // Merus/Carpus arm with bright orange joint
      ctx.fillStyle = jointOrange;
      drawOvalSpot(ctx, side * 12, -16, 16, 12, side * 0.3);
      // Massive Propodus/Chela Pincer
      const clawP = new Path2D();
      clawP.moveTo(0, -14);
      clawP.bezierCurveTo(side * 38, -58, side * 96, -48, side * 98, -8);
      clawP.bezierCurveTo(side * 94, 28, side * 38, 34, 0, 12);
      clawP.closePath();
      fillRimAndStroke(ctx, clawP, -98, -56, 98, 32, '#65a30d', shellLight, shellMid, outline, 3.6);
      // Dark reddish-brown dactyl pincer tips & white crushing tubercles
      ctx.fillStyle = clawTip;
      drawOvalSpot(ctx, side * 78, -14, 18, 9, side * -0.15);
      ctx.fillStyle = '#fef3c7';
      drawOvalSpot(ctx, side * 64, -10, 5, 3.5, 0);
      drawOvalSpot(ctx, side * 74, -8, 4, 3, 0);
      ctx.restore();
    }

    // 4. Stalked Compound Eyes, Flickering Antennules & Expressive Mouth
    const lookX = pose.headLookX * 10;
    const lookY = pose.headLookY * 8;
    drawSoftCheekBlushes(ctx, -46 + lookX * 0.6, 14 + lookY * 0.6, 46 + lookX * 0.6, 14 + lookY * 0.6, 20, 12, Math.max(0.3, pose.blushAlpha));
    drawExpressiveAnimalMouth(ctx, lookX * 0.7, 26 + lookY * 0.7, 0.85, 0, pose, outline);
    drawGlossyAnimalEye(ctx, 'left', -36 + lookX * 0.8, -58 + lookY * 0.8, 13.5, 15.0, -0.08, pose, IRIS_PALETTES.amberGold, shellLight, shellDark, outline);
    drawGlossyAnimalEye(ctx, 'right', 36 + lookX * 0.8, -58 + lookY * 0.8, 13.5, 15.0, 0.08, pose, IRIS_PALETTES.amberGold, shellLight, shellDark, outline);
    drawExpressiveAnimalBrows(ctx, -36 + lookX * 0.8, -80 + lookY * 0.8, 36 + lookX * 0.8, -80 + lookY * 0.8, 18, pose, outline, 3.4);

    ctx.restore();
  }

  /* ============================================================================
   * A47: REEF MANTA RAY (Mobula alfredi)
   * ========================================================================== */
  function drawReefMantaRayRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#090d16';
    const dorsalLight = '#334155';
    const dorsalMid = '#1e293b';
    const dorsalDark = '#0f172a';
    const ventralWhite = '#f8fafc';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);

    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot);

    // 1. Long Slender Whip-Like Tail Behind Disc
    ctx.save();
    ctx.translate(-156, 18);
    ctx.rotate(Math.sin(pose.waveRaysPhase * 0.9) * 0.1 + pose.hindNearAngle * 0.25);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.quadraticCurveTo(-56, 12, -128, 36);
    ctx.stroke();
    ctx.restore();

    // 2. Sweeping Diamond-Delta Pelagic Pectoral Wingspan
    const wingFlap = Math.sin(pose.waveRaysPhase * 0.85) * 18 - 22 * waveAmt;
    const discP = new Path2D();
    discP.moveTo(118, -8);
    discP.bezierCurveTo(64, -78 + wingFlap * 0.6, -24, -148 + wingFlap, -92, -156 + wingFlap);
    discP.bezierCurveTo(-112, -112 + wingFlap * 0.5, -134, -46, -168, 12);
    discP.bezierCurveTo(-124, 58, -58, 128 - wingFlap * 0.5, -24, 154 - wingFlap);
    discP.bezierCurveTo(36, 126 - wingFlap * 0.4, 88, 64, 118, -8);
    discP.closePath();
    fillRimAndStroke(ctx, discP, -168, -152, 118, 152, dorsalLight, dorsalMid, dorsalDark, outline, 3.8);

    ctx.save();
    ctx.clip(discP);
    // Snow-white ventral countershaded lower rim & gill slits
    const bellyP = new Path2D();
    bellyP.moveTo(122, 2);
    bellyP.bezierCurveTo(68, 78, -2, 138, -32, 158);
    bellyP.lineTo(-142, 68);
    bellyP.bezierCurveTo(-52, 62, 46, 36, 122, 2);
    bellyP.closePath();
    ctx.fillStyle = ventralWhite;
    ctx.fill(bellyP);

    // Diagnostic White Dorsal Supra-Branchial Shoulder Chevrons (Mobula alfredi)
    ctx.fillStyle = 'rgba(248, 250, 252, 0.88)';
    const chev1 = new Path2D();
    chev1.moveTo(46, -42);
    chev1.bezierCurveTo(18, -68, -18, -72, -38, -48);
    chev1.bezierCurveTo(-14, -48, 18, -36, 46, -18);
    chev1.closePath();
    ctx.fill(chev1);

    const chev2 = new Path2D();
    chev2.moveTo(48, 14);
    chev2.bezierCurveTo(18, 38, -16, 44, -36, 26);
    chev2.bezierCurveTo(-12, 22, 18, 12, 48, -4);
    chev2.closePath();
    ctx.fill(chev2);

    // Subtle ventral gill slit arcs
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.4;
    for (let g = 0; g < 5; g++) {
      ctx.beginPath();
      ctx.arc(28 - g * 12, 54 + g * 8, 12, 0.3, 1.3);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = 3.8;
    ctx.strokeStyle = outline;
    ctx.stroke(discP);

    // 3. Pair of Unfurling Forward Cephalic Fins (Horn-Like Feeding Lobes)
    const lookX = pose.headLookX * 12;
    const lookY = pose.headLookY * 9;
    for (const [lx, ly, rot] of [
      [96, -42, -0.25 - 0.35 * waveAmt],
      [104, 24, 0.25 + 0.25 * waveAmt],
    ] as const) {
      ctx.save();
      ctx.translate(lx + lookX * 0.5, ly + lookY * 0.5);
      ctx.rotate(rot);
      const lobeP = new Path2D();
      lobeP.moveTo(-12, -12);
      lobeP.bezierCurveTo(22, -22, 54, -8, 48, 8);
      lobeP.bezierCurveTo(38, 22, 6, 18, -12, 10);
      lobeP.closePath();
      fillRimAndStroke(ctx, lobeP, -12, -20, 50, 20, ventralWhite, '#cbd5e1', dorsalMid, outline, 3.2);
      ctx.restore();
    }

    // 4. Wide Terminal Filter-Feeding Mouth & Lateral Cephalic Eyes (+30% Enlarged)
    drawSoftCheekBlushes(ctx, 52 + lookX * 0.7, -22 + lookY * 0.7, 68 + lookX * 0.7, 32 + lookY * 0.7, 20, 12, Math.max(0.28, pose.blushAlpha));
    drawExpressiveAnimalMouth(ctx, 88 + lookX * 0.85, 6 + lookY * 0.85, 0.95, 0.08, pose, outline);
    drawGlossyAnimalEye(ctx, 'left', 62 + lookX * 0.85, -34 + lookY * 0.85, 13.0, 15.0, -0.08, pose, IRIS_PALETTES.deepOceanBlue, dorsalLight, dorsalDark, outline);
    drawGlossyAnimalEye(ctx, 'right', 76 + lookX * 0.85, 18 + lookY * 0.85, 12.0, 14.0, 0.12, pose, IRIS_PALETTES.deepOceanBlue, dorsalLight, dorsalDark, outline);
    drawExpressiveAnimalBrows(ctx, 62 + lookX * 0.85, -56 + lookY * 0.85, 76 + lookX * 0.85, -4 + lookY * 0.85, 18, pose, ventralWhite, 3.4);

    ctx.restore();
  }

  /* ============================================================================
   * A48: CHAMBERED NAUTILUS (Nautilus pompilius)
   * ========================================================================== */
  function drawChamberedNautilusRig(ctx: CanvasRenderingContext2D, pose: TurtlePose): void {
    const outline = '#271206';
    const nacreLight = '#fffdf7';
    const nacreMid = '#fef3c7';
    const nacreDark = '#e2d5b5';
    const stripeOrange = '#ea580c';
    const stripeDeep = '#9a3412';
    const waveAmt = clamp(1 - pose.nearFlipperDownAmount - pose.nearFlipperTuckAmount, 0, 1);

    ctx.save();
    ctx.translate(pose.shellOffsetX, pose.shellOffsetY);
    ctx.rotate(pose.shellRot + Math.sin(pose.waveRaysPhase * 0.8) * 0.04);

    const lookX = pose.headLookX * 10;
    const lookY = pose.headLookY * 8;

    // 1. Arrayed Crown of Articulated Annulated Cirri Tentacles & Hyponome Jet Nozzle
    ctx.save();
    ctx.translate(46 + lookX * 0.5, 22 + lookY * 0.5);
    // Hyponome jet propulsion funnel underneath
    const funnelP = new Path2D();
    funnelP.moveTo(-16, 18);
    funnelP.quadraticCurveTo(22, 24, 38, 42);
    funnelP.quadraticCurveTo(14, 48, -18, 34);
    funnelP.closePath();
    fillRimAndStroke(ctx, funnelP, -18, 18, 38, 46, '#fed7aa', '#fdba74', '#c2410c', outline, 2.8);

    // 10 Trailing & Waving Tactile Cirri Tentacles
    for (let t = 0; t < 10; t++) {
      const norm = (t - 4.5) / 4.5;
      const isUpperWave = t < 3;
      const waveLift = isUpperWave ? -0.58 * waveAmt : 0;
      const sway = Math.sin(pose.waveRaysPhase * 1.2 + t * 0.55) * 0.14 + waveLift;
      ctx.save();
      ctx.translate(12, norm * 32);
      ctx.rotate(norm * 0.38 + sway);
      const tentP = new Path2D();
      tentP.moveTo(0, -5);
      tentP.bezierCurveTo(32, -8, 68, -4 + norm * 8, 92, 6 + norm * 12);
      tentP.bezierCurveTo(66, 10 + norm * 8, 30, 8, 0, 5);
      tentP.closePath();
      fillRimAndStroke(ctx, tentP, 0, -8, 92, 12, '#ffedd5', '#fdba74', '#9a3412', outline, 2.6);
      ctx.restore();
    }
    ctx.restore();

    // 2. Textured Leathery Hood Shielding the Upper Shell Aperture
    const hoodP = new Path2D();
    hoodP.moveTo(-4, -52);
    hoodP.bezierCurveTo(56, -58, 104, -26, 96, 8);
    hoodP.bezierCurveTo(64, 18, 12, 14, -14, -8);
    hoodP.closePath();
    fillRimAndStroke(ctx, hoodP, -14, -56, 98, 14, '#c2410c', stripeDeep, '#5c1d0b', outline, 3.6);
    // White tuberculated papillae spots on the leathery hood
    ctx.fillStyle = 'rgba(255, 251, 235, 0.78)';
    for (const [px, py, rx, ry] of [
      [24, -36, 7, 4], [48, -32, 8, 4.5], [70, -20, 6.5, 4],
      [34, -18, 6, 3.5], [58, -10, 7, 4],
    ] as const) {
      drawOvalSpot(ctx, px, py, rx, ry, 0.15);
    }

    // 3. Logarithmic Planispiral Shell with Flame-Orange Tiger Stripes & Pearlescent Nacre
    const shellP = new Path2D();
    shellP.moveTo(14, -46);
    shellP.bezierCurveTo(-18, -108, -118, -106, -142, -24);
    shellP.bezierCurveTo(-162, 54, -92, 118, -8, 108);
    shellP.bezierCurveTo(54, 100, 68, 52, 42, 18);
    shellP.bezierCurveTo(18, -4, -18, -6, 14, -46);
    shellP.closePath();
    fillRimAndStroke(ctx, shellP, -152, -106, 62, 110, nacreLight, nacreMid, nacreDark, outline, 3.8);

    ctx.save();
    ctx.clip(shellP);
    // Radiating flame-orange and sienna tiger stripes from the umbilicus
    const umbX = -26;
    const umbY = -4;
    for (let s = 0; s < 11; s++) {
      const a0 = -0.9 + s * 0.36;
      const a1 = a0 + 0.19;
      ctx.fillStyle = s % 2 === 0 ? stripeOrange : stripeDeep;
      ctx.beginPath();
      ctx.moveTo(umbX, umbY);
      ctx.arc(umbX, umbY, 145, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    // Pearlescent lower shell margin (adult ventral whorl is immaculate cream-white)
    ctx.fillStyle = nacreLight;
    ctx.beginPath();
    ctx.ellipse(-28, 72, 92, 44, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Subtle internal chambered septum suture shimmer
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.28)';
    ctx.lineWidth = 2.2;
    for (let c = 0; c < 6; c++) {
      const ca = 0.2 + c * 0.45;
      ctx.beginPath();
      ctx.arc(umbX + Math.cos(ca) * 36, umbY + Math.sin(ca) * 36, 28, ca - 0.6, ca + 0.6);
      ctx.stroke();
    }

    // Blackened umbilical callus center
    ctx.fillStyle = '#1c1917';
    drawOvalSpot(ctx, umbX, umbY, 18, 16, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    drawOvalSpot(ctx, umbX - 4, umbY - 4, 5, 4, -0.2);
    ctx.restore();
    ctx.lineWidth = 3.8;
    ctx.strokeStyle = outline;
    ctx.stroke(shellP);

    // 4. Large Expressive Cephalopod Eye & Smile Beneath the Hood
    drawSoftCheekBlushes(ctx, 32 + lookX * 0.7, 36 + lookY * 0.7, 68 + lookX * 0.7, 34 + lookY * 0.7, 16, 10, Math.max(0.3, pose.blushAlpha));
    drawExpressiveAnimalMouth(ctx, 64 + lookX * 0.85, 38 + lookY * 0.85, 0.78, 0.04, pose, outline);
    drawGlossyAnimalEye(ctx, 'left', 48 + lookX * 0.85, 12 + lookY * 0.85, 16.5, 18.0, 0.04, pose, IRIS_PALETTES.amberGold, '#fed7aa', stripeDeep, outline);
    drawExpressiveAnimalBrows(ctx, 48 + lookX * 0.85, -12 + lookY * 0.85, 72 + lookX * 0.85, -10 + lookY * 0.85, 18, pose, outline, 3.4);

    ctx.restore();
  }


