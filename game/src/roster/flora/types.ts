import type { TurtlePose } from '../../turtle/types';

/** Inputs for a refined plant rig. */
export interface PlantRigInput {
  assetId: string;
  pose: TurtlePose;
  /** -1..1 wind sway already computed by renderPlantRig. */
  sway: number;
  yaw: number;
  pitch: number;
  /** 1 vegetative, 2 flowering, 3 fruiting. */
  growthStage: 1 | 2 | 3;
  fruitCount: number;
}

/**
 * A refined plant rig. Called inside renderPlantRig after the plinth/base is drawn, in the
 * same ~500-unit frame the legacy plants use (ground line at y ~ 148-160, x centred on 0).
 */
export type PlantRig = (ctx: CanvasRenderingContext2D, input: PlantRigInput) => void;

/** A refined food icon drawn around (0,0) in a 22-unit radius frame. */
export type FoodIcon = (ctx: CanvasRenderingContext2D) => void;
