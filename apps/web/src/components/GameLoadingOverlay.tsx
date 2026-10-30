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
import { type Language, getLanguage } from "../lib/i18n";

interface GameLoadingOverlayProps {
  language?: Language;
  onComplete: () => void;
}

export function GameLoadingOverlay({ language, onComplete }: GameLoadingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High-DPR razor-sharp buffer configuration
    const dpr = Math.min(3, window.devicePixelRatio || 2);
    canvas.width = Math.round(340 * dpr);
    canvas.height = Math.round(250 * dpr);
    canvas.style.width = "340px";
    canvas.style.height = "250px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

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

      // Refined micro-current bioluminescent motes around the Green Sea Turtle
      for (let i = 0; i < 14; i++) {
        const bx = ((340 - ((elapsed * 0.28 + i * 26) % 360)) + 360) % 360 - 10;
        const by = 48 + ((i * 31) % 155) + Math.sin(elapsed * 0.006 + i) * 8;
        const dotRadius = 1.3 + (i % 3) * 0.5; // delicate 1.3px - 2.3px micro-motes
        ctx.fillStyle =
          i % 2 === 0 ? "rgba(174, 246, 130, 0.65)" : "rgba(56, 189, 248, 0.60)";
        ctx.beginPath();
        ctx.arc(bx, by, dotRadius, 0, Math.PI * 2);
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

  const activeLang = language || getLanguage();
  const localizedContent = {
    English: {
      title: "Entering Sanctuary…",
      subtitle: "Loading initial assets for the game",
    },
    "Bahasa Melayu": {
      title: "Memasuki Santuari…",
      subtitle: "Memuatkan aset awal untuk permainan",
    },
    "中文": {
      title: "正在进入生态天地…",
      subtitle: "正在加载游戏初始生态资源",
    },
    "தமிழ்": {
      title: "சரணாலயத்திற்குள் நுழைகிறது…",
      subtitle: "விளையாட்டின் தொடக்க ஆதாரங்களை ஏற்றுகிறது",
    },
  }[activeLang] || {
    title: "Entering Sanctuary…",
    subtitle: "Loading initial assets for the game",
  };

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
      <div className="teleport-loading-title">{localizedContent.title}</div>
      <div
        className="teleport-loading-subtitle"
        style={{
          fontSize: 13,
          color: "rgba(250, 250, 237, 0.72)",
          fontFamily: "Space Grotesk, sans-serif",
        }}
      >
        {localizedContent.subtitle}
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
