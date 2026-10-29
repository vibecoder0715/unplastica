import { useEffect, useRef } from "react";
import { TurtleRigController } from "@game/turtle/rig";
import { renderAnimalAsset } from "@game/roster/animalRenderer";

export function SanctuaryAnimalBackdrop() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    const tigerRig = new TurtleRigController("idle", "right");
    const turtleRig = new TurtleRigController("waving", "right");
    const pandaRig = new TurtleRigController("idle", "left");

    let logicalW = Math.max(300, container.clientWidth || 720);
    let logicalH = Math.max(220, container.clientHeight || 280);

    const syncSize = () => {
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      logicalW = Math.max(280, Math.round(rect.width || container.clientWidth || 720));
      logicalH = Math.max(200, Math.round(rect.height || container.clientHeight || 280));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(logicalW * dpr);
      const targetH = Math.round(logicalH * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    syncSize();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => syncSize())
        : null;
    ro?.observe(container);
    window.addEventListener("resize", syncSize);

    let lastMs = performance.now();

    const drawCenteredAnimal = (
      assetId: string,
      cx: number,
      cy: number,
      scale: number,
      pose: ReturnType<TurtleRigController["step"]>,
      timeSec: number,
    ) => {
      ctx.save();
      // renderAnimalAsset draws centered inside a 320x260 logical box (center = 160, 130)
      ctx.translate(cx - 160 * scale, cy - 130 * scale);
      ctx.scale(scale, scale);
      renderAnimalAsset(ctx, assetId, 320, 260, pose, [], timeSec, {
        skipClear: true,
        framingScale: 0.84,
      });
      ctx.restore();
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastMs) / 1000));
      lastMs = now;
      const timeSec = now / 1000;

      const dpr = canvas.width / Math.max(1, logicalW);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, logicalW, logicalH);

      const isCompact = logicalW < 560;
      const baseScale = isCompact
        ? Math.max(0.32, Math.min(0.42, logicalW / 980))
        : Math.max(0.46, Math.min(0.58, logicalW / 1450));

      // Low alpha and lowest layer priority for Harimau, Sea Turtle, and Panda
      ctx.save();
      ctx.globalAlpha = 0.16;

      const tigerPose = tigerRig.step(dt);
      const turtlePose = turtleRig.step(dt);
      const pandaPose = pandaRig.step(dt);

      // 1. Harimau (Malayan Tiger) on the left
      drawCenteredAnimal(
        "animal_01_malayan_tiger",
        logicalW * (isCompact ? 0.18 : 0.19),
        logicalH * (isCompact ? 0.56 : 0.55),
        baseScale * 1.04,
        tigerPose,
        timeSec,
      );

      // 2. Green Sea Turtle swimming gracefully in the upper center
      drawCenteredAnimal(
        "animal_28_green_sea_turtle",
        logicalW * 0.5,
        logicalH * (isCompact ? 0.24 : 0.25) + Math.sin(timeSec * 1.8) * 5,
        baseScale * 0.96,
        turtlePose,
        timeSec,
      );

      // 3. Giant Panda resting on the right
      drawCenteredAnimal(
        "animal_41_giant_panda",
        logicalW * (isCompact ? 0.83 : 0.81),
        logicalH * (isCompact ? 0.56 : 0.55),
        baseScale * 1.0,
        pandaPose,
        timeSec,
      );

      ctx.restore();

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      ro?.disconnect();
      window.removeEventListener("resize", syncSize);
    };
  }, []);

  return (
    <div ref={containerRef} className="sanctuary-animal-backdrop" aria-hidden="true">
      <canvas ref={canvasRef} className="sanctuary-animal-canvas" />
    </div>
  );
}
