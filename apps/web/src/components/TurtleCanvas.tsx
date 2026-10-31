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
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 3);
    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;

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
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
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
