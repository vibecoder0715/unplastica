import type { TurtlePose } from '../../turtle/types';

/**
 * A refined animal rig. Called inside renderAnimalAsset after the body transform
 * (translate bodyX/bodyY, rotate bodyRot, scale bodyScaleX/Y) and facing flip, in the
 * same ~650-unit drawing frame the legacy rigs use (feet on y ~ 186 for land species).
 * Read extra state with getAnimalRenderState() from '../animalRenderer'.
 */
export type AnimalRig = (ctx: CanvasRenderingContext2D, pose: TurtlePose) => void;
