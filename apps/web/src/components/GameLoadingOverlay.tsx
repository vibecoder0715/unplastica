import { useEffect, useRef, useState } from "react";
import { TurtleRigController } from "@game/turtle/rig";
import { renderTurtle } from "@game/turtle/renderer";
import {
  getAssetThumbnailDataUrl,
  getFoodThumbnailDataUrl,
  getGreenbitsCoinImage,
} from "@game/game/worldRenderer";
import { FOOD_CATALOG } from "@game/game/worldConfig";
import { loadSaveState } from "@game/game/persistence";
import { ROSTER_ASSETS } from "@game/roster/catalog";
import { soundEngine } from "@game/game/sound";

interface GameLoadingOverlayProps {
  onComplete: () => void;
}

export function GameLoadingOverlay({ onComplete }: GameLoadingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let cancelled = false;
    let redirectTimer: number | undefined;
    const turtleRig = new TurtleRigController("waving", "right");
    const startMs = performance.now();
    const minDurationMs = 1650;
    let lastMs = startMs;

    // Play the game's teleport/loading wave chirp if audio is unmuted
    try {
      const loaded = loadSaveState();
      soundEngine.muted = Boolean(loaded.state.soundMuted);
      soundEngine.playWaveChirp();
    } catch {
      // Ignore audio autoplay restrictions
    }

    // 1. Preload & decode core image files used by the game HUD and world renderer
    const imageUrls = [
      "/assets/brand/greenbits.png",
      "/assets/aistudio/image_3961e3ca.png",
      "/assets/brand/brand-mark-light.png",
      "/assets/brand/brand-mark-dark.png",
    ];
    getGreenbitsCoinImage();

    let imagesLoaded = 0;
    for (const url of imageUrls) {
      const img = new Image();
      const markDone = () => {
        imagesLoaded += 1;
      };
      img.onload = markDone;
      img.onerror = markDone;
      img.src = url;
    }

    // 2. Build incremental pre-warm tasks for initial game assets (SaveState, foods, placed/owned/starter species)
    const warmTasks: Array<() => void> = [];
    try {
      const { state } = loadSaveState();
      for (const foodId of Object.keys(FOOD_CATALOG)) {
        warmTasks.push(() => {
          getFoodThumbnailDataUrl(foodId);
        });
      }

      const priorityAssetIds = new Set<string>([
        "animal_28_green_sea_turtle",
        "animal_01_malayan_tiger",
        "animal_41_giant_panda",
        ...Object.keys(state.ownedAssets ?? {}),
        ...(state.placedAnimals ?? []).map((a) => a.assetId),
        ...(state.placedPlants ?? []).map((p) => p.assetId),
        ...ROSTER_ASSETS.slice(0, 12).map((a) => a.id),
      ]);

      for (const assetId of priorityAssetIds) {
        warmTasks.push(() => {
          getAssetThumbnailDataUrl(assetId);
        });
      }
    } catch {
      // Fallback if storage is restricted
    }

    const totalTaskCount = Math.max(1, imageUrls.length + warmTasks.length);
    let completedWarmTasks = 0;

    const step = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastMs) / 1000));
      lastMs = now;
      const elapsed = now - startMs;

      // Execute up to 2 asset warm-up tasks per frame within a 6ms budget so 60 FPS animation stays silky smooth
      const frameStart = performance.now();
      let ranThisFrame = 0;
      while (
        completedWarmTasks < warmTasks.length &&
        ranThisFrame < 2 &&
        performance.now() - frameStart < 6
      ) {
        warmTasks[completedWarmTasks]();
        completedWarmTasks += 1;
        ranThisFrame += 1;
      }

      const assetFraction = Math.min(
        1,
        (imagesLoaded + completedWarmTasks) / totalTaskCount,
      );
      const timeFraction = Math.min(1, Math.max(0, elapsed / minDurationMs));
      const combinedProgress = Math.min(
        1,
        timeFraction * 0.45 + assetFraction * 0.55,
      );
      const isReady =
        timeFraction >= 1 &&
        completedWarmTasks >= warmTasks.length &&
        (imagesLoaded >= imageUrls.length || elapsed >= minDurationMs + 600);

      setProgress(isReady ? 100 : Math.min(99, Math.round(combinedProgress * 100)));

      ctx.clearRect(0, 0, 340, 250);

      // Swirling bioluminescent eco-current rings around the Green Sea Turtle (matches game loading scene)
      for (let i = 0; i < 12; i++) {
        const bx = ((340 - ((elapsed * 0.28 + i * 32) % 360)) + 360) % 360 - 10;
        const by = 45 + ((i * 37) % 160) + Math.sin(elapsed * 0.006 + i) * 10;
        ctx.fillStyle =
          i % 2 === 0 ? "rgba(174, 246, 130, 0.45)" : "rgba(56, 189, 248, 0.42)";
        ctx.beginPath();
        ctx.arc(bx, by, 3.5 + (i % 3) * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      const pose = turtleRig.step(dt);
      renderTurtle(
        ctx,
        340,
        250,
        {
          ...pose,
          bodyY: pose.bodyY + Math.sin(elapsed * 0.008) * 10,
          bodyRot: Math.sin(elapsed * 0.006) * 0.08,
        },
        [],
        false,
        undefined,
        { skipClear: true, framingScale: 0.88 },
      );

      if (!isReady) {
        animId = requestAnimationFrame(step);
      } else {
        redirectTimer = window.setTimeout(() => {
          if (!cancelled) onComplete();
        }, 60);
      }
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      if (redirectTimer !== undefined) window.clearTimeout(redirectTimer);
    };
  }, [onComplete]);

  return (
    <div
      className="teleport-loading-overlay game-launch-overlay"
      role="status"
      aria-live="polite"
    >
      <canvas
        ref={canvasRef}
        width={340}
        height={250}
        className="teleport-loading-canvas"
      />
      <div className="teleport-loading-title">Entering Sanctuary…</div>
      <div
        className="teleport-loading-subtitle"
        style={{
          fontSize: 13,
          color: "rgba(250, 250, 237, 0.72)",
          fontFamily: "Space Grotesk, sans-serif",
        }}
      >
        Loading initial assets for the game
      </div>
      <div className="teleport-progress-track">
        <div
          className="teleport-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
