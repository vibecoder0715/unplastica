import { useEffect, useRef } from "react";
import type { EmotionType, Direction } from "@game/turtle/types";
import { TurtleRigController } from "@game/turtle/rig";
import { renderTurtle } from "@game/turtle/renderer";

interface TurtleCanvasProps {
  emotion?: EmotionType;
  direction?: Direction;
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
}

export function TurtleCanvas({
  emotion = "idle",
  direction = "right",
  width = 180,
  height = 160,
  className = "",
  onClick,
}: TurtleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rigRef = useRef<TurtleRigController | null>(null);

  if (!rigRef.current) {
    rigRef.current = new TurtleRigController(emotion === "normal" ? "idle" : emotion, direction);
  }

  useEffect(() => {
    if (rigRef.current) {
      rigRef.current.setEmotion(emotion);
    }
  }, [emotion]);

  useEffect(() => {
    if (rigRef.current) {
      rigRef.current.setDirection(direction);
    }
  }, [direction]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let isVisible = true;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 1.5);
    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    // Only render when canvas is in viewport
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        isVisible = entry ? entry.isIntersecting : true;
      }, { threshold: 0.05 });
      observer.observe(canvas);
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        isVisible = false;
      } else {
        isVisible = true;
        lastTime = performance.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const minFrameInterval = 14; // Smooth 60 FPS playback on all screen refresh rates (60Hz/90Hz/120Hz) without frame-pacing judder
    let lastRenderTime = 0;

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      if (!isVisible || document.hidden) return;
      if (now - lastRenderTime < minFrameInterval) return;

      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;
      lastRenderTime = now;

      if (rigRef.current) {
        const pose = rigRef.current.update(dt);
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        renderTurtle(
          ctx,
          width,
          height,
          pose,
          rigRef.current.tearDrops,
          false,
          undefined,
          { skipClear: true, framingScale: 1.04 }
        );
        ctx.restore();
      }
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      onClick={onClick}
      style={{
        width,
        height,
        display: "block",
        cursor: onClick ? "pointer" : "default",
      }}
    />
  );
}
