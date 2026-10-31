import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import type { EmotionType } from "@game/turtle/types";
import type { Language } from "../lib/i18n";
import { TurtleCanvas } from "./TurtleCanvas";

interface TurtleFrontHeadCanvasProps {
  emotion: EmotionType;
  isOpen: boolean;
}

function traceRoundedPoly(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  radius: number,
): void {
  ctx.beginPath();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const v1x = p0[0] - p1[0];
    const v1y = p0[1] - p1[1];
    const v2x = p2[0] - p1[0];
    const v2y = p2[1] - p1[1];
    const l1 = Math.hypot(v1x, v1y) || 1;
    const l2 = Math.hypot(v2x, v2y) || 1;
    const r = Math.min(radius, l1 * 0.4, l2 * 0.4);
    const sx = p1[0] + (v1x / l1) * r;
    const sy = p1[1] + (v1y / l1) * r;
    const ex = p1[0] + (v2x / l2) * r;
    const ey = p1[1] + (v2y / l2) * r;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
    ctx.quadraticCurveTo(p1[0], p1[1], ex, ey);
  }
  ctx.closePath();
}

function drawSpot(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rot: number,
): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Live 2x DPR Canvas rendering the Unplastica Green Sea Turtle mascot's head
 * directly from the front, matching the exact palette, forehead shield scutes,
 * emerald-jade irises, peach plastron collar, and spotted flippers from
 * `game/src/turtle/renderer.ts`.
 */
function TurtleFrontHeadCanvas({ emotion, isOpen }: TurtleFrontHeadCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const emotionRef = useRef<EmotionType>(emotion);
  const isOpenRef = useRef<boolean>(isOpen);
  emotionRef.current = emotion;
  isOpenRef.current = isOpen;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    const startTime = performance.now();
    let nextBlinkAt = startTime + 2400 + Math.random() * 1800;
    const blinkDur = 170;

    const render = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const size = 62;
      const targetW = Math.round(size * dpr);
      if (canvas.width !== targetW || canvas.height !== targetW) {
        canvas.width = targetW;
        canvas.height = targetW;
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      const t = (now - startTime) * 0.001;
      const curEmotion = emotionRef.current;
      const bobY = Math.sin(t * 2.7) * 1.1;
      const headTilt = isOpenRef.current
        ? Math.sin(t * 3.4) * 0.045
        : Math.sin(t * 1.8) * 0.02;

      let blinkAmount = 0;
      if (now >= nextBlinkAt) {
        const elapsed = now - nextBlinkAt;
        if (elapsed <= blinkDur) {
          blinkAmount = Math.sin((elapsed / blinkDur) * Math.PI);
        } else {
          nextBlinkAt = now + 2600 + Math.random() * 2200;
        }
      }

      // Normalize to a 200x200 coordinate space centered at (100, 104)
      ctx.translate(size * 0.5, size * 0.52 + bobY);
      const scale = size / 200;
      ctx.scale(scale, scale);

      // 1. Background Carapace Dome Arch peeking behind head
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 6, 82, 68, 0, Math.PI, 0, false);
      ctx.closePath();
      const shellGrad = ctx.createLinearGradient(0, -64, 0, 18);
      shellGrad.addColorStop(0, "#e5fa75");
      shellGrad.addColorStop(0.55, "#b7e34a");
      shellGrad.addColorStop(1, "#7cb32b");
      ctx.fillStyle = shellGrad;
      ctx.fill();
      ctx.lineWidth = 4.2;
      ctx.strokeStyle = "#1b3610";
      ctx.stroke();

      // Recessed carapace scute hints behind crown
      ctx.fillStyle = "#5b8f22";
      traceRoundedPoly(
        ctx,
        [
          [-26, -54],
          [26, -54],
          [36, -28],
          [-36, -28],
        ],
        6,
      );
      ctx.fill();
      ctx.restore();

      // 2. Creamy Peach Plastron Throat Collar & Lower Neck at bottom
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 66, 54, 24, 0, 0, Math.PI, false);
      ctx.closePath();
      const bellyGrad = ctx.createLinearGradient(0, 48, 0, 90);
      bellyGrad.addColorStop(0, "#fbf0cc");
      bellyGrad.addColorStop(0.65, "#edd59f");
      bellyGrad.addColorStop(1, "#d9bc82");
      ctx.fillStyle = bellyGrad;
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "#254012";
      ctx.stroke();
      ctx.restore();

      // 3. Symmetrical Front Flippers peeking at bottom-left and bottom-right
      const flipperWave = Math.sin(t * 3.2) * 0.08;
      for (const side of [-1, 1] as const) {
        ctx.save();
        ctx.translate(side * 64, 54);
        ctx.rotate(side * (0.42 + flipperWave));
        ctx.beginPath();
        ctx.ellipse(0, 0, 26, 13, 0, 0, Math.PI * 2);
        const flipGrad = ctx.createLinearGradient(-20, -10, 20, 12);
        flipGrad.addColorStop(0, "#dcf668");
        flipGrad.addColorStop(0.55, "#9ed43e");
        flipGrad.addColorStop(1, "#6ea625");
        ctx.fillStyle = flipGrad;
        ctx.fill();
        ctx.lineWidth = 3.6;
        ctx.strokeStyle = "#254012";
        ctx.stroke();

        ctx.fillStyle = "#256829";
        drawSpot(ctx, side * 4, -1, 6.5, 4, side * 0.25);
        drawSpot(ctx, side * -7, 2, 4.5, 3, side * 0.15);
        ctx.restore();
      }

      // 4. Main Front-Facing Head Group
      ctx.save();
      ctx.rotate(headTilt);

      // Front cranium & rounded cheeks silhouette
      const headPath = new Path2D();
      headPath.moveTo(0, -76);
      headPath.bezierCurveTo(54, -76, 78, -36, 78, 8);
      headPath.bezierCurveTo(78, 48, 48, 72, 0, 72);
      headPath.bezierCurveTo(-48, 72, -78, 48, -78, 8);
      headPath.bezierCurveTo(-78, -36, -54, -76, 0, -76);
      headPath.closePath();

      const headGrad = ctx.createRadialGradient(-14, -42, 10, 0, -4, 98);
      headGrad.addColorStop(0, "#f3ff8c");
      headGrad.addColorStop(0.28, "#d9f465");
      headGrad.addColorStop(0.68, "#ace047");
      headGrad.addColorStop(0.9, "#8bc435");
      headGrad.addColorStop(1, "#74ab27");
      ctx.fillStyle = headGrad;
      ctx.fill(headPath);

      ctx.save();
      ctx.clip(headPath);

      // Soft lower jaw shading
      const jawGrad = ctx.createLinearGradient(0, 18, 0, 74);
      jawGrad.addColorStop(0, "rgba(110, 168, 38, 0)");
      jawGrad.addColorStop(1, "rgba(82, 134, 22, 0.42)");
      ctx.fillStyle = jawGrad;
      ctx.fillRect(-85, 18, 170, 60);

      // Top cranium rim highlight
      ctx.strokeStyle = "rgba(250, 255, 195, 0.85)";
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.arc(0, -4, 68, Math.PI * 1.18, Math.PI * 1.82);
      ctx.stroke();

      // Forehead polygonal shield & lower triangle scutes (matching drawForeheadAndTempleSpots)
      const spotGrad = ctx.createLinearGradient(0, -72, 0, -14);
      spotGrad.addColorStop(0, "#6aa63c");
      spotGrad.addColorStop(1, "#4d872d");
      ctx.fillStyle = spotGrad;

      traceRoundedPoly(
        ctx,
        [
          [-22, -62],
          [22, -62],
          [30, -40],
          [0, -28],
          [-30, -40],
        ],
        7,
      );
      ctx.fill();

      traceRoundedPoly(
        ctx,
        [
          [-13, -24],
          [13, -24],
          [0, -7],
        ],
        5,
      );
      ctx.fill();

      // Crown & lateral temple scale spots
      drawSpot(ctx, -32, -58, 9, 4, -0.45);
      drawSpot(ctx, 0, -68, 10, 3.8, 0);
      drawSpot(ctx, 32, -58, 9, 4, 0.45);

      ctx.fillStyle = "#5c9635";
      drawSpot(ctx, -64, -10, 5.5, 8, -0.15);
      drawSpot(ctx, -58, 5, 4.2, 5.5, 0.1);
      drawSpot(ctx, 64, -10, 5.5, 8, 0.15);
      drawSpot(ctx, 58, 5, 4.2, 5.5, -0.1);

      // Rosy Cheek Blushes with cute diagonal highlight ticks
      for (const side of [-1, 1] as const) {
        const bx = side * 48;
        const by = 24;
        const bGrad = ctx.createRadialGradient(bx, by, 2, bx, by, 20);
        bGrad.addColorStop(0, "rgba(255, 118, 92, 0.62)");
        bGrad.addColorStop(1, "rgba(255, 118, 92, 0)");
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.ellipse(bx, by, 20, 12, side * -0.12, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 225, 205, 0.65)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(bx - 5, by - 2);
        ctx.lineTo(bx - 2, by + 2);
        ctx.moveTo(bx + 2, by - 2);
        ctx.lineTo(bx + 5, by + 2);
        ctx.stroke();
      }

      ctx.restore(); // end headPath clip

      // Crisp dark green head outline
      ctx.lineWidth = 4.2;
      ctx.strokeStyle = "#254012";
      ctx.stroke(headPath);

      // 5. Snout Glow & Symmetrical Nostrils
      const noseGlow = ctx.createRadialGradient(0, 14, 1, 0, 14, 15);
      noseGlow.addColorStop(0, "rgba(246, 255, 175, 0.65)");
      noseGlow.addColorStop(1, "rgba(246, 255, 175, 0)");
      ctx.fillStyle = noseGlow;
      ctx.beginPath();
      ctx.arc(0, 14, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#3b691e";
      drawSpot(ctx, -6, 17, 2.3, 1.6, 0.25);
      drawSpot(ctx, 6, 17, 2.3, 1.6, -0.25);

      // 6. Expressive Mouth (reacts to congratulate / crying / friendly smile)
      ctx.save();
      if (curEmotion === "congratulate") {
        // Joyful open smile with pink tongue
        ctx.beginPath();
        ctx.moveTo(-18, 30);
        ctx.quadraticCurveTo(0, 33, 18, 30);
        ctx.bezierCurveTo(16, 52, -16, 52, -18, 30);
        ctx.closePath();
        ctx.fillStyle = "#6e1b26";
        ctx.fill();

        ctx.save();
        ctx.clip();
        ctx.fillStyle = "#ff8da1";
        ctx.beginPath();
        ctx.ellipse(0, 45, 13, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.lineWidth = 3.2;
        ctx.strokeStyle = "#254012";
        ctx.stroke();
      } else if (curEmotion === "crying") {
        // Wobbly sad mouth
        ctx.beginPath();
        ctx.moveTo(-14, 42);
        ctx.quadraticCurveTo(0, 32, 14, 42);
        ctx.lineWidth = 3.4;
        ctx.strokeStyle = "#254012";
        ctx.stroke();
      } else {
        // Warm signature turtle smile with gentle corner dimples
        ctx.beginPath();
        ctx.moveTo(-17, 32);
        ctx.quadraticCurveTo(0, 45, 17, 32);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = "#254012";
        ctx.stroke();

        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(-18, 31, 3, -0.4, 1.2);
        ctx.moveTo(18, 28);
        ctx.arc(18, 31, 3, Math.PI - 1.2, Math.PI + 0.4);
        ctx.stroke();
      }
      ctx.restore();

      // 7. Big Front-Facing Glossy Turtle Eyes (matching drawEye in renderer.ts)
      const eyeRx = 18.5;
      const eyeRy = 21.5;
      for (const side of [-1, 1] as const) {
        const ex = side * 34;
        const ey = -1;
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(side * 0.08);

        const sockPath = new Path2D();
        sockPath.ellipse(0, 0, eyeRx, eyeRy, 0, 0, Math.PI * 2);

        ctx.save();
        ctx.clip(sockPath);

        // White sclera + subtle top shadow
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-eyeRx * 1.2, -eyeRy * 1.2, eyeRx * 2.4, eyeRy * 2.4);

        const scleraShad = ctx.createLinearGradient(0, -eyeRy, 0, -eyeRy * 0.15);
        scleraShad.addColorStop(0, "rgba(175, 200, 185, 0.48)");
        scleraShad.addColorStop(1, "rgba(175, 200, 185, 0)");
        ctx.fillStyle = scleraShad;
        ctx.fillRect(-eyeRx, -eyeRy, eyeRx * 2, eyeRy);

        // Emerald-jade iris
        const irisX = side * -1.8;
        const irisY = 1.0;
        const irisRx = eyeRx * 0.82;
        const irisRy = eyeRy * 0.86;

        const irisGrad = ctx.createLinearGradient(0, irisY - irisRy, 0, irisY + irisRy);
        irisGrad.addColorStop(0, "#071f0d");
        irisGrad.addColorStop(0.45, "#0e3d19");
        irisGrad.addColorStop(0.8, "#1e7d2c");
        irisGrad.addColorStop(1, "#48c73f");
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.ellipse(irisX, irisY, irisRx, irisRy, 0, 0, Math.PI * 2);
        ctx.fill();

        // Lower emerald iris glow
        const glowGrad = ctx.createRadialGradient(
          irisX,
          irisY + irisRy * 0.42,
          1,
          irisX,
          irisY + irisRy * 0.22,
          irisRx * 0.85,
        );
        glowGrad.addColorStop(0, "#62e854");
        glowGrad.addColorStop(0.55, "rgba(40, 165, 58, 0.5)");
        glowGrad.addColorStop(1, "rgba(14, 61, 25, 0)");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.ellipse(irisX, irisY, irisRx * 0.92, irisRy * 0.92, 0, 0, Math.PI * 2);
        ctx.fill();

        // Deep pupil
        ctx.fillStyle = "#061008";
        ctx.beginPath();
        ctx.ellipse(irisX, irisY - 1, irisRx * 0.62, irisRy * 0.64, 0, 0, Math.PI * 2);
        ctx.fill();

        // Primary & secondary specular highlights
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(
          irisX - side * irisRx * 0.26,
          irisY - irisRy * 0.34,
          eyeRx * 0.25,
          eyeRy * 0.23,
          -0.2,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.beginPath();
        ctx.arc(
          irisX + side * irisRx * 0.3,
          irisY + irisRy * 0.26,
          eyeRx * 0.11,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        // Blinking eyelid sweep
        if (blinkAmount > 0.02) {
          const lidY = -eyeRy + eyeRy * 2.05 * blinkAmount;
          const lidGrad = ctx.createLinearGradient(0, -eyeRy, 0, lidY + 4);
          lidGrad.addColorStop(0, "#c4ef58");
          lidGrad.addColorStop(1, "#98cf38");
          ctx.fillStyle = lidGrad;
          ctx.beginPath();
          ctx.moveTo(-eyeRx * 1.2, -eyeRy * 1.2);
          ctx.lineTo(eyeRx * 1.2, -eyeRy * 1.2);
          ctx.lineTo(eyeRx * 1.2, lidY);
          ctx.quadraticCurveTo(0, lidY + 5, -eyeRx * 1.2, lidY);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = "#121c0b";
          ctx.lineWidth = 3.0;
          ctx.beginPath();
          ctx.moveTo(-eyeRx * 1.1, lidY);
          ctx.quadraticCurveTo(0, lidY + 5, eyeRx * 1.1, lidY);
          ctx.stroke();
        }

        ctx.restore(); // end eye socket clip

        // Crisp eye socket & upper lash line
        ctx.lineWidth = 3.4;
        ctx.strokeStyle = "#121c0b";
        ctx.stroke(sockPath);

        // Tear drop on crying state
        if (curEmotion === "crying") {
          ctx.fillStyle = "#67e8f9";
          ctx.beginPath();
          ctx.arc(side * 10, eyeRy - 2 + Math.sin(t * 6) * 2, 4.8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // 8. Expressive Eyebrows
      ctx.strokeStyle = "#1f380e";
      ctx.lineWidth = 3.4;
      for (const side of [-1, 1] as const) {
        ctx.beginPath();
        if (curEmotion === "crying") {
          ctx.moveTo(side * 20, -29);
          ctx.quadraticCurveTo(side * 34, -27, side * 48, -20);
        } else if (curEmotion === "congratulate") {
          ctx.moveTo(side * 20, -26);
          ctx.quadraticCurveTo(side * 34, -35, side * 48, -25);
        } else {
          ctx.moveTo(side * 21, -24);
          ctx.quadraticCurveTo(side * 34, -31, side * 47, -23);
        }
        ctx.stroke();
      }

      ctx.restore(); // end head group
      ctx.restore();

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: 62,
        height: 62,
        display: "block",
        pointerEvents: "none",
      }}
    />
  );
}


interface MascotWidgetProps {
  language: Language;
}

export interface MotivatingDialogue {
  emotion: EmotionType;
  en: string;
  bm: string;
  zh: string;
  ta: string;
}

const MOTIVATING_DIALOGUES: MotivatingDialogue[] = [
  {
    "emotion": "waving",
    "en": "Hi there! Ready to reduce single-use plastic together today?",
    "bm": "Hai! Bersedia untuk kurangkan plastik sekali guna bersama hari ini?",
    "zh": "嗨！今天准备好一起减少一次性塑料了吗？",
    "ta": "வணக்கம்! இன்று ஒருமுறை பயன்படுத்தும் பிளாஸ்டிக்கை குறைக்க தயாரா?"
  },
  {
    "emotion": "laugh",
    "en": "Every reusable bottle you fill brings clean blue waves to our coral reefs!",
    "bm": "Setiap botol guna semula yang anda isi membawa ombak biru bersih ke terumbu karang!",
    "zh": "你每装满一次水壶，就为珊瑚礁带来一朵清澈的浪花！",
    "ta": "நீங்கள் நிரப்பும் ஒவ்வொரு பாட்டிலும் கடலை தூய்மையாக மாற்றுகிறது!"
  },
  {
    "emotion": "waving",
    "en": "My sea turtle flippers are sending you a giant wave of gratitude!",
    "bm": "Sirip penyu laut saya kirimkan lambaian rasa terima kasih yang besar!",
    "zh": "我的海龟鳍正在向你发送大大的感谢挥手！",
    "ta": "எனது துடுப்புகள் உங்களுக்கு மனமார்ந்த நன்றிகளைத் தெரிவிக்கின்றன!"
  },
  {
    "emotion": "congratulate",
    "en": "Bringing your own bag to the store? That is true eco-hero power!",
    "bm": "Bawa beg sendiri ke kedai? Itulah kuasa wira eko yang sebenar!",
    "zh": "自带购物袋去商店？这才是真正的环保英雄超能力！",
    "ta": "கடைக்கு சொந்தப் பையை எடுத்துச் செல்கிறீர்களா? அதுவே உண்மையான ஹீரோ செயல்!"
  },
  {
    "emotion": "laugh",
    "en": "A sip from your refill flask is a sweet victory for all ocean turtles!",
    "bm": "Tegukan dari botol guna semula anda ialah kemenangan manis bagi semua penyu laut!",
    "zh": "用自己的水壶喝一口水，就是给所有海龟带来的一份甜美胜利！",
    "ta": "உங்கள் சொந்த பாட்டிலில் நீர் குடிப்பது கடலாமைகளுக்கு கிடைத்த வெற்றி!"
  },
  {
    "emotion": "wondered",
    "en": "Did you know turtles can live over 80 years? Let’s keep oceans safe for our grandkids!",
    "bm": "Tahukah anda penyu boleh hidup lebih 80 tahun? Jom jaga lautan untuk cucu-cicit kita!",
    "zh": "你知道海龟可以活80多岁吗？让我们一起守护这片海洋吧！",
    "ta": "ஆமைகள் 80 ஆண்டுகளுக்கும் மேல் வாழும் தெரியுமா? கடலை சுத்தமாக வைத்திருப்போம்!"
  },
  {
    "emotion": "describing",
    "en": "Small green habits today build a giant flourishing rainforest tomorrow!",
    "bm": "Amalan hijau kecil hari ini membina hutan hujan yang subur esok hari!",
    "zh": "今天的一个绿色小习惯，能造就明天的一片繁茂雨林！",
    "ta": "இன்றைய சிறு பசுமைப் பழக்கம் நாளைய செழிப்பான காட்டை உருவாக்கும்!"
  },
  {
    "emotion": "congratulate",
    "en": "No plastic straw needed? Awesome! You are swimming in the right direction!",
    "bm": "Tak perlu penyedut minuman plastik? Hebat! Anda berenang ke arah yang tepat!",
    "zh": "不需要塑料吸管？太棒了！你正朝着正确的方向前进！",
    "ta": "பிளாஸ்டிக் உறிஞ்சுகுழல் வேண்டாமா? அற்புதம்! நீங்கள் சரியான வழியில் செல்கிறீர்கள்!"
  },
  {
    "emotion": "crying",
    "en": "I hate floating plastic bags! From below, they look just like delicious jellyfish!",
    "bm": "Saya benci beg plastik hanyut! Dari bawah, rupanya sebiji macam obor-obor lazat!",
    "zh": "我讨厌漂浮的塑料袋！从水下看，它们长得就跟美味水母一模一样！",
    "ta": "மிதக்கும் பிளாஸ்டிக் பைகள் எனக்குப் பிடிக்காது! அவை ஜெல்லிமீன் போலவே தோன்றும்!"
  },
  {
    "emotion": "laugh",
    "en": "One plastic-free meal at a time! You are doing fantastic!",
    "bm": "Satu hidangan bebas plastik demi satu! Anda memang hebat!",
    "zh": "一步一步实现无塑用餐！你做得太棒了！",
    "ta": "ஒரு வேளை பிளாஸ்டிக் இல்லா உணவு! நீங்கள் சிறப்பாகச் செயல்படுகிறீர்கள்!"
  },
  {
    "emotion": "describing",
    "en": "Your sanctuary animals are so happy every time you check in and care for them!",
    "bm": "Haiwan santuari anda gembira setiap kali anda datang menjenguk dan menyayangi mereka!",
    "zh": "你的生态天地里的小动物们每次看到你来都开心极了！",
    "ta": "உங்கள் சரணாலய விலங்குகள் நீங்கள் வரும்போதெல்லாம் மகிழ்ச்சியடைகின்றன!"
  },
  {
    "emotion": "laugh",
    "en": "Eating lunch with your own food container? That deserves a high-flipper!",
    "bm": "Makan tengah hari guna bekas makanan sendiri? Mari kita tepuk sirip!",
    "zh": "用自带餐盒吃午饭？来跟我击个掌（鳍）吧！",
    "ta": "சொந்த உணவுப் பெட்டியைப் பயன்படுத்துகிறீர்களா? வாருங்கள் கைகுலுக்குவோம்!"
  },
  {
    "emotion": "waving",
    "en": "Let's keep Borneo and Peninsular Malaysia clean, green, and thriving!",
    "bm": "Jom pastikan Borneo dan Semenanjung Malaysia sentiasa bersih, hijau dan makmur!",
    "zh": "让我们一起让婆罗洲和马来半岛更加洁净翠绿！",
    "ta": "மலேசியாவின் கடற்கரைகளையும் காடுகளையும் தூய்மையாக வைத்திருப்போம்!"
  },
  {
    "emotion": "wondered",
    "en": "Feeling weary? Take a deep breath of fresh, unpolluted ocean breeze!",
    "bm": "Rasa letih? Tarik nafas dalam-dalam dengan bayu laut yang segar dan bersih!",
    "zh": "累了吗？深吸一口清新的无污染海洋海风吧！",
    "ta": "சோர்வாக உணர்கிறீர்களா? தூய கடல் காற்றை ஆழமாக சுவாசியுங்கள்!"
  },
  {
    "emotion": "congratulate",
    "en": "Together, we are an unstoppable team of Earth guardians!",
    "bm": "Bersama-sama, kita pasukan penjaga Bumi yang tidak terkalahkan!",
    "zh": "在一起，我们就是不可阻挡的地球守护者战队！",
    "ta": "நாம் அனைவரும் இணைந்து பூமியைக் காக்கும் வலிமையான குழுவாக மாறுவோம்!"
  },
  {
    "emotion": "describing",
    "en": "The best time to reduce plastic was yesterday; the next best time is right now!",
    "bm": "Masa terbaik kurangkan plastik ialah semalam; masa kedua terbaik ialah sekarang!",
    "zh": "减少塑料最好的时机是昨天，其次是现在！",
    "ta": "பிளாஸ்டிக்கைக் குறைக்க சிறந்த நேரம் நேற்று; அடுத்த சிறந்த நேரம் இப்போது!"
  },
  {
    "emotion": "wondered",
    "en": "Your green choices inspire everyone around you to do better too!",
    "bm": "Pilihan hijau anda memberi inspirasi kepada orang sekeliling untuk turut berubah!",
    "zh": "你的每一次绿色选择都在潜移默化地激励身边的人！",
    "ta": "உங்கள் பசுமைத் தேர்வுகள் மற்றவர்களுக்கும் நல்ல உத்வேகம் தருகின்றன!"
  },
  {
    "emotion": "laugh",
    "en": "Jellyfish are delicious, but plastic is toxic! Thank you for protecting us!",
    "bm": "Obor-obor memang sedap, tapi plastik bertoksik! Terima kasih melindungi kami!",
    "zh": "水母很好吃，但塑料有毒！感谢你保护我们！",
    "ta": "ஜெல்லிமீன் சுவையானது, ஆனால் பிளாஸ்டிக் நஞ்சானது! எங்களைப் பாதுகாப்பதற்கு நன்றி!"
  },
  {
    "emotion": "waving",
    "en": "Ready to earn more Greenbits? Pick an action in the Earn tab!",
    "bm": "Sedia untuk kumpul lebih banyak Greenbits? Pilih amalan di tab Dapatkan!",
    "zh": "准备好赚取更多绿币了吗？快去“赚取”页面选择一项习惯吧！",
    "ta": "மேலும் கிரீன்பிட்களை சம்பாதிக்க தயாரா? 'சம்பாதிக்க' பக்கத்திற்குச் செல்லுங்கள்!"
  },
  {
    "emotion": "congratulate",
    "en": "Keep shining, champion! The planet and all its wildlife adore you!",
    "bm": "Teruskan bersinar, sang juara! Bumi dan semua hidupan liar menyayangi anda!",
    "zh": "继续闪闪发光吧，冠军！地球和所有生灵都在为你喝彩！",
    "ta": "தொடர்ந்து பிரகாசியுங்கள்! பூமி உங்கள் அன்பை உணர்கிறது!"
  },
  {
    "emotion": "wondered",
    "en": "Did you know Green Sea Turtles can hold their breath underwater for up to 5 hours?",
    "bm": "Tahukah anda Penyu Hijau boleh tahan nafas di dalam air hingga 5 jam?",
    "zh": "你知道绿海龟在水下闭气可以长达5个小时吗？",
    "ta": "பச்சை ஆமைகள் 5 மணி நேரம் வரை நீருக்கடியில் மூச்சடக்கி இருக்கும் தெரியுமா?"
  },
  {
    "emotion": "laugh",
    "en": "My shell feels extra shiny and smooth today thanks to clean, plastic-free waters!",
    "bm": "Karapas saya rasa sangat berkilau dan licin hari ini berkat air laut yang bersih!",
    "zh": "多亏了干净无塑的海水，我今天的龟甲格外光滑发亮！",
    "ta": "தூய கடலினால் என் ஓடு இன்று மிகவும் பளபளப்பாக இருக்கிறது!"
  },
  {
    "emotion": "describing",
    "en": "Beeswax wraps keep food so fresh without needing cling wrap. Have you tried them?",
    "bm": "Pembalut lilin lebah memastikan makanan segar tanpa plastik pembalut. Pernah cuba?",
    "zh": "蜂蜡保鲜膜无需保鲜膜就能锁鲜食物。你试过吗？",
    "ta": "தேன்பழுகு உறைகள் உணவை பிளாஸ்டிக் இல்லாமலே புதியதாக வைக்கின்றன!"
  },
  {
    "emotion": "crying",
    "en": "Ghost nets in the ocean trap hundreds of sea creatures every year. Let's keep fishing clean!",
    "bm": "Pukat hanyut di laut memerangkap ratusan hidupan laut setiap tahun. Jom jaga laut kita!",
    "zh": "海洋里的废弃幽灵渔网每年困住成百上千的生灵。让我们守护海洋清洁！",
    "ta": "கடலில் விடப்படும் பழைய வலைகள் பல உயிரினங்களை பாதிக்கின்றன. கடலைக் காப்போம்!"
  },
  {
    "emotion": "waving",
    "en": "Terengganu and Sabah have some of the most beautiful turtle nesting beaches in the world!",
    "bm": "Terengganu dan Sabah mempunyai pantai pendaratan penyu paling cantik di dunia!",
    "zh": "丁加奴和沙巴拥有全世界最美丽的海龟产卵海滩！",
    "ta": "தெரெங்கானு மற்றும் சபா கடற்கரைகள் உலகப் புகழ்பெற்ற ஆமை சரணாலயங்கள்!"
  },
  {
    "emotion": "laugh",
    "en": "Swimming at 35 km/h across ocean currents is my favorite morning workout!",
    "bm": "Berenang 35 km/j merentasi arus laut ialah senaman pagi kegemaran saya!",
    "zh": "以时速35公里在洋流里畅游是我最爱的晨练！",
    "ta": "கடல் அலைகளில் வேகமாக நீந்துவது எனக்கு மிகவும் பிடித்த காலை உடற்பயிற்சி!"
  },
  {
    "emotion": "wondered",
    "en": "Plastic takes over 450 years to break down. That’s five whole turtle generations!",
    "bm": "Plastik ambil lebih 450 tahun untuk terurai. Itu bersamaan lima generasi penyu!",
    "zh": "塑料需要450多年才能分解。那可是我们海龟整整五代人的寿命啊！",
    "ta": "பிளாஸ்டிக் மக்கிப்போக 450 ஆண்டுகள் ஆகும். அது ஐந்து ஆமை தலைமுறைகளுக்கு சமம்!"
  },
  {
    "emotion": "congratulate",
    "en": "You avoided plastic cutlery today? That means no plastic forks washed into rivers!",
    "bm": "Anda elak kutleri plastik hari ini? Maknanya tiada garpu plastik hanyut ke sungai!",
    "zh": "你今天避免使用塑料刀叉了？这意味着又少了一批塑料垃圾流入江河！",
    "ta": "இன்று பிளாஸ்டிக் கரண்டியை தவிர்த்தீர்களா? நதிகள் தூய்மையாக இருக்கும்!"
  },
  {
    "emotion": "describing",
    "en": "Mangroves trap sediment and shield our coastlines from monstrous storm surges!",
    "bm": "Hutan bakau memerangkap enapan dan melindungi pantai kita daripada ombak ribut!",
    "zh": "红树林能稳固淤泥，阻挡狂暴的风暴潮守护我们的海岸线！",
    "ta": "சதுப்புநிலக் காடுகள் கடலோரப் பகுதிகளை சூறாவளி அலைகளிலிருந்து காக்கின்றன!"
  },
  {
    "emotion": "laugh",
    "en": "Just saw a dugong grazing on seagrass. They are the gentlest sea cows ever!",
    "bm": "Baru nampak dugong meragut rumput laut. Mereka lembu laut paling lemah lembut!",
    "zh": "刚才看到一只儒艮在啃食海草。它们真是我见过最温顺的海牛！",
    "ta": "கடற்பசுக்கள் கடல்புல்லை மேய்வதைப் பார்த்தேன், அவை மிகவும் சாதுவானவை!"
  },
  {
    "emotion": "describing",
    "en": "Tualang trees can grow over 80 meters high! Giant wild honeybees love nesting in them.",
    "bm": "Pokok Tualang boleh membesar lebih 80 meter! Lebah hutan gergasi suka bersarang padanya.",
    "zh": "图阿朗树能长到80多米高！大型野生蜜蜂最喜欢在它的高冠上筑巢。",
    "ta": "துவாலாங் மரங்கள் 80 மீட்டர் வரை வளரக்கூடியவை! காட்டுத் தேனீக்கள் அதில் கூடு கட்டும்."
  },
  {
    "emotion": "wondered",
    "en": "Did you hear the Malayan Tiger’s mighty roar? They are the heart and soul of our jungle.",
    "bm": "Pernah dengar ngauman megah Harimau Malaya? Mereka ialah nadi rimba kita.",
    "zh": "听到马来亚虎威武的咆哮了吗？它们是我们热带雨林的灵魂守护者。",
    "ta": "மலாயா புலியின் கர்ஜனையைக் கேட்டீர்களா? அவை நமது காடுகளின் கம்பீரம்."
  },
  {
    "emotion": "laugh",
    "en": "Orangutans build brand new sleeping nests in tree canopies every single night!",
    "bm": "Orangutan membina sarang tidur baharu di kanopi pokok setiap malam!",
    "zh": "红毛猩猩每天晚上都会在树冠上搭建一个全新的温馨睡巢！",
    "ta": "ஒராங்குட்டான்கள் தினமும் மர உச்சியில் புதிய படுக்கை கூடுகளை உருவாக்குகின்றன!"
  },
  {
    "emotion": "congratulate",
    "en": "Your environmental points are growing fast! Your sanctuary looks so vibrant!",
    "bm": "Mata alam sekitar anda makin meningkat! Santuari anda nampak sangat berseri!",
    "zh": "你的环保积分正在快速增长！你的生态天地看起来生机盎然！",
    "ta": "உங்கள் சுற்றுச்சூழல் புள்ளிகள் உயர்ந்து வருகின்றன! சரணாலயம் அற்புதமாக உள்ளது!"
  },
  {
    "emotion": "waving",
    "en": "Sun bears have super long tongues to slurp up wild honey from hollow tree trunks!",
    "bm": "Beruang matahari ada lidah sangat panjang untuk hirup madu hutan dari batang pokok!",
    "zh": "马来熊有超长的舌头，能从树洞深处舔食甜美的野生蜂蜜！",
    "ta": "சூரியக் கரடிகள் மரப் பொந்துகளில் இருந்து தேனை எடுக்க நீண்ட நாக்கைப் பயன்படுத்துகின்றன!"
  },
  {
    "emotion": "crying",
    "en": "When plastics blow into the jungle, mousedeer and tapirs might swallow them. Thank you for recycling!",
    "bm": "Bila plastik ditiup ke hutan, kancil dan tapir boleh tertelan. Terima kasih kerana mengitar semula!",
    "zh": "塑料如果被风吹进森林，小鼷鹿和马来貘可能会误食。感谢你坚持环保！",
    "ta": "காடுகளில் வீசப்படும் பிளாஸ்டிக்கை விலங்குகள் விழுங்கக்கூடும். மறுசுழற்சிக்கு நன்றி!"
  },
  {
    "emotion": "laugh",
    "en": "Rafflesia has no leaves, stems, or roots—just one colossal, magnificent flower!",
    "bm": "Rafflesia tiada daun, batang, atau akar—hanya satu kuntum bunga gergasi yang menakjubkan!",
    "zh": "大王花没有树叶、茎干或根须——就只有一朵震撼人心的巨大奇花！",
    "ta": "ராஃப்ளேசியாவிற்கு இலை, தண்டு எதுவுமில்லை—ஒரே ஒரு பிரம்மாண்ட மலர் மட்டுமே!"
  },
  {
    "emotion": "describing",
    "en": "Hornbills are known as rainforest farmers because they scatter seeds across miles of jungle!",
    "bm": "Burung enggang digelar petani hutan kerana mereka menyebarkan benih beribu batu!",
    "zh": "犀鸟被称为雨林农夫，因为它们能把果实种子播撒到整片雨林深处！",
    "ta": "இருவாச்சி பறவைகள் விதைகளைப் பரப்பி காடுகளை வளர்க்கும் உன்னத விவசாயிகள்!"
  },
  {
    "emotion": "wondered",
    "en": "Have you checked on your plants today? They might have ripe fruits ready to harvest!",
    "bm": "Dah periksa pokok-pokok anda hari ini? Mungkin ada buah ranum yang sedia dituai!",
    "zh": "你今天去查看你的植物了吗？说不定已经结满成熟可收获的果实了！",
    "ta": "இன்று செடிகளைப் பார்த்தீர்களா? அறுவடைக்கு பழங்கள் தயாராக இருக்கலாம்!"
  },
  {
    "emotion": "congratulate",
    "en": "You are setting an amazing standard for zero-waste living on campus and at home!",
    "bm": "Anda menetapkan standard hebat untuk gaya hidup sifar sisa di kampus dan rumah!",
    "zh": "你在校园和家里树立了零废弃生活的绝佳榜样！",
    "ta": "வளாகத்திலும் வீட்டிலும் கழிவில்லா வாழ்க்கைக்கு நீங்கள் சிறந்த முன்மாதிரி!"
  },
  {
    "emotion": "laugh",
    "en": "Bulk pantry shopping with your own jars saves heaps of plastic packaging!",
    "bm": "Beli barangan runcit pukal guna balang sendiri jimatkan banyak pembungkusan plastik!",
    "zh": "自带玻璃罐去零包装杂货铺，能省下成堆的塑料包装！",
    "ta": "சொந்த பாத்திரங்களை எடுத்துச் சென்று பொருட்கள் வாங்குவது பிளாஸ்டிக்கைக் குறைக்கும்!"
  },
  {
    "emotion": "waving",
    "en": "Don't forget to wash and dry your recyclables before placing them in the recycling bin!",
    "bm": "Jangan lupa basuh dan keringkan barangan kitar semula sebelum masuk tong kitar semula!",
    "zh": "在把可回收物投入回收箱之前，别忘了洗净并晾干哦！",
    "ta": "மறுசுழற்சி செய்வதற்கு முன் பொருட்களைக் கழுவி உலர வைக்க மறக்காதீர்கள்!"
  },
  {
    "emotion": "describing",
    "en": "Composting fruit peels turns kitchen scraps into rich soil for your garden plants!",
    "bm": "Membuat kompos kulit buah menukar sisa dapur menjadi tanah subur untuk tanaman!",
    "zh": "把果皮做成堆肥，能将厨余变成花园植物最爱的肥沃养料！",
    "ta": "பழத்தோல்களை மக்கச் செய்து இயற்கை உரமாக மாற்றி செடிகளுக்குப் பயன்படுத்துங்கள்!"
  },
  {
    "emotion": "wondered",
    "en": "Wondering how much plastic you've diverted? Check your total habit count on your profile!",
    "bm": "Tertanya-tanya berapa banyak plastik anda telah selamatkan? Semak jumlah di profil anda!",
    "zh": "好奇自己已经减少了多少塑料？快去你的个人主页查看习惯累计总数吧！",
    "ta": "நீங்கள் எவ்வளவு பிளாஸ்டிக்கை தவிர்த்துள்ளீர்கள் என்பதை சுயவிவரத்தில் பார்க்கலாம்!"
  },
  {
    "emotion": "congratulate",
    "en": "Leveling up your habits unlocks new animals and rare plants in the Sanctuary Store!",
    "bm": "Tingkatkan amalan anda untuk buka haiwan baharu dan pokok nadir di Kedai!",
    "zh": "提升你的环保习惯，就能在商店解锁全新动物与珍稀植物！",
    "ta": "பழக்கங்களை மேம்படுத்தி புதிய விலங்குகளையும் அரிய தாவரங்களையும் பெறுங்கள்!"
  },
  {
    "emotion": "laugh",
    "en": "Walking or cycling for short trips cuts carbon emissions and keeps you energized!",
    "bm": "Berjalan kaki atau berbasikal untuk perjalanan dekat kurangkan karbon dan beri tenaga!",
    "zh": "短途出行多步行或骑单车，既能减碳又能让你活力满满！",
    "ta": "குறுகிய தூரத்திற்கு நடப்பது அல்லது சைக்கிள் ஓட்டுவது உடலுக்கும் நல்லது!"
  },
  {
    "emotion": "describing",
    "en": "Bamboo grows up to 90 centimeters a day! It is one of Earth's fastest renewable materials.",
    "bm": "Buluh boleh membesar sehingga 90 cm sehari! Antara bahan boleh diperbaharui terpantas.",
    "zh": "竹子一天能长高90厘米！它是地球上生长速度最快、最环保的可再生材料之一。",
    "ta": "மூங்கில் ஒரு நாளில் 90 செமீ வரை வளரும்! மிக விரைவாக வளரும் இயற்கை வளம்."
  },
  {
    "emotion": "crying",
    "en": "Over 8 million tons of plastic enter our oceans each year. But together, we are changing that!",
    "bm": "Lebih 8 juta tan plastik masuk ke lautan setiap tahun. Tapi bersama, kita sedang mengubahnya!",
    "zh": "每年有超过800万吨塑料流入海洋。但有了你我同行，我们正在改变这一切！",
    "ta": "ஆண்டுதோறும் பல மில்லியன் டன் பிளாஸ்டிக் கடலில் கலக்கிறது. நாம் அதை மாற்றுவோம்!"
  },
  {
    "emotion": "waving",
    "en": "Saying 'No plastic bag please' at the cashier takes just one second and saves a turtle's life!",
    "bm": "Cakap 'Tak perlu beg plastik' di kaunter hanya ambil 1 saat dan selamatkan nyawa penyu!",
    "zh": "结账时说一句“不用塑料袋”只需一秒钟，却能拯救海龟的一生！",
    "ta": "கடையில் 'பிளாஸ்டிக் பை வேண்டாம்' என்று சொல்வது ஆமையின் உயிரைக் காக்கும்!"
  },
  {
    "emotion": "laugh",
    "en": "Did you pet your sanctuary animals today? They love gentle chin scratches!",
    "bm": "Dah belai haiwan santuari anda hari ini? Mereka suka digaru manja di bawah dagu!",
    "zh": "你今天抚摸生态天地里的小动物了吗？它们最喜欢被挠下巴了！",
    "ta": "இன்று உங்கள் செல்லப்பிராணிகளைக் கொஞ்சினீர்களா? அவற்றுக்கு அது மிகவும் பிடிக்கும்!"
  },
  {
    "emotion": "congratulate",
    "en": "The APU Plastic-Free Champion challenge has RM 1,000 in cash prizes! Are you participating?",
    "bm": "Cabaran Wira Bebas Plastik APU menawarkan RM 1,000 hadiah tunai! Anda sertai?",
    "zh": "APU无塑先锋挑战赛设有RM 1,000现金总奖金！你参加了吗？",
    "ta": "APU பிளாஸ்டிக் இல்லா சவாலில் RM 1,000 ரொக்கப் பரிசுகள் உள்ளன! பங்கேற்றுள்ளீர்களா?"
  },
  {
    "emotion": "waving",
    "en": "Invite your campus friends to join unplastica! Group impact is ten times more powerful!",
    "bm": "Ajak kawan-kawan kampus sertai unplastica! Impak berkumpulan sepuluh kali lebih hebat!",
    "zh": "邀请你的大学好友加入unplastica吧！团队的力量比一个人强十倍！",
    "ta": "உங்கள் கல்லூரி நண்பர்களையும் இணையுங்கள்! ஒன்றாகச் செயல்படுவது அதிக பலன் தரும்!"
  },
  {
    "emotion": "laugh",
    "en": "Drinking bubble tea? Bringing your own metal boba straw makes it taste twice as refreshing!",
    "bm": "Minum teh boba? Bawa penyedut boba logam sendiri buat rasanya dua kali lebih nikmat!",
    "zh": "喝珍珠奶茶？带上自己的粗不锈钢吸管，喝起来双倍快乐！",
    "ta": "சொந்த மறுபயன்பாட்டு உறிஞ்சுகுழலைப் பயன்படுத்துங்கள், சுவை இன்னும் அதிகரிக்கும்!"
  },
  {
    "emotion": "describing",
    "en": "Snap a clear photo of your eco-action in good lighting to get verified instantly!",
    "bm": "Ambil gambar jelas amalan eko anda dalam pencahayaan baik untuk pengesahan pantas!",
    "zh": "在光线充足的环境下清晰拍摄你的环保行动，就能秒速通过审核！",
    "ta": "நல்ல வெளிச்சத்தில் தெளிவான படம் எடுத்தால் உடனே சரிபார்க்கப்படும்!"
  },
  {
    "emotion": "wondered",
    "en": "Did you know that coral reefs cover less than 1% of the ocean but shelter 25% of marine life?",
    "bm": "Tahukah anda terumbu karang litupi kurang 1% lautan tapi jadi rumah 25% hidupan laut?",
    "zh": "你知道吗？珊瑚礁面积只占海洋的不到1%，却庇护着25%的海洋生物！",
    "ta": "பவளப்பாறைகள் கடலில் 1% மட்டுமே இருந்தாலும் 25% உயிரினங்களுக்கு புகலிடம்!"
  },
  {
    "emotion": "congratulate",
    "en": "Consistency is your superpower! Checking in every day builds unbreakable habits.",
    "bm": "Konsistensi ialah kuasa hebat anda! Buka aplikasi setiap hari bina amalan kukuh.",
    "zh": "坚持就是你的超能力！每天打卡能养成坚不可摧的优良习惯。",
    "ta": "தொடர்ந்து செயல்படுவதே உங்கள் பலம்! தினசரி பழக்கம் நல்ல மாற்றத்தைக் கொண்டுவரும்."
  },
  {
    "emotion": "laugh",
    "en": "Look at that mischievous monkey stealing a banana in the trees! Too cute!",
    "bm": "Tengok monyet nakal tu curi pisang atas pokok! Comel sungguh!",
    "zh": "快看树上那只调皮的小猴子在偷香蕉吃呢！真是太逗了！",
    "ta": "மரத்திலிருந்து குரங்கு வாழைப்பழம் எடுப்பதைப் பாருங்கள்! எவ்வளவு அழகு!"
  },
  {
    "emotion": "describing",
    "en": "Upcycling old plastic containers into mini plant pots gives them a second flourishing life!",
    "bm": "Ubah botol plastik lama jadi pasu anak pokok beri mereka kehidupan kedua yang segar!",
    "zh": "把废旧塑料盒改造成植物盆栽，赋予了它们第二次蓬勃的生命！",
    "ta": "பழைய பிளாஸ்டிக் பாத்திரங்களை செடி தொட்டிகளாக மாற்றி மறுபயன்பாடு செய்யுங்கள்!"
  },
  {
    "emotion": "crying",
    "en": "Microplastics have been found in the deepest ocean trenches. That’s why your actions matter so much!",
    "bm": "Mikroplastik ditemui di jurang laut paling dalam. Sebab itulah tindakan anda sangat bermakna!",
    "zh": "连最深的马里亚纳海沟里都发现了微塑料。正因如此，你的每一次减塑都至关重要！",
    "ta": "ஆழ்கடலிலும் மைக்ரோ பிளாஸ்டிக் உள்ளது. உங்கள் செயல் கடலைக் காக்க உதவும்!"
  },
  {
    "emotion": "waving",
    "en": "Sun, rain, or mist—our sanctuary is always open and welcoming for you!",
    "bm": "Panas, hujan, atau kabus—santuari kita sentiasa sedia menyambut kehadiran anda!",
    "zh": "无论是晴天、雨天还是迷雾，我们的生态天地随时欢迎你的到来！",
    "ta": "வெயில், மழை எதுவாக இருந்தாலும் நமது சரணாலயம் உங்களை எப்போதும் வரவேற்கிறது!"
  },
  {
    "emotion": "laugh",
    "en": "Tapirs look like a cross between a pig and an anteater, but their closest relatives are horses!",
    "bm": "Tapir nampak macam gabungan babi dan tenggiling, tapi saudara terdekat mereka ialah kuda!",
    "zh": "马来貘看起来像猪和食蚁兽的结合体，但它们在生物学上最亲近的亲戚其实是马！",
    "ta": "தபீர் விலங்கு குதிரையின் குடும்பத்தைச் சேர்ந்த விசித்திரமான பாலூட்டி!"
  },
  {
    "emotion": "describing",
    "en": "Pitcher plants can grow large enough in Borneo to catch rainwater and feed small jungle frogs!",
    "bm": "Periuk kera di Borneo boleh membesar hingga tampung air hujan dan jadi rumah katak!",
    "zh": "婆罗洲的巨型猪笼草大到能盛装雨水，甚至能成为树蛙的天然游泳池！",
    "ta": "போர்னியோவின் குடுவை தாவரங்கள் மழைநீரை சேமித்து தவளைகளுக்கு புகலிடம் தரும்!"
  },
  {
    "emotion": "wondered",
    "en": "Did you know whale sharks have unique spot patterns just like human fingerprints?",
    "bm": "Tahukah anda jerung paus ada corak tompok unik seperti cap jari manusia?",
    "zh": "你知道吗？每条鲸鲨身上的斑点图案就像人类的指纹一样独一无二！",
    "ta": "திமிங்கல சுறாக்களின் உடலில் உள்ள புள்ளிகள் மனித கைரேகை போல தனித்துவமானது!"
  },
  {
    "emotion": "congratulate",
    "en": "You are turning plastic reduction into an enjoyable daily game! That is the secret to success.",
    "bm": "Anda jadikan pengurangan plastik sebagai permainan harian yang seronok! Inilah rahsia kejayaan.",
    "zh": "把减少塑料变成一件轻松好玩的日常游戏，这就是成功的终极秘诀！",
    "ta": "பிளாஸ்டிக் குறைப்பை மகிழ்ச்சியான விளையாட்டாக மாற்றிவிட்டீர்கள்! அற்புதம்."
  },
  {
    "emotion": "waving",
    "en": "Sea turtles always return to the very same beach where they were born to lay their eggs!",
    "bm": "Penyu laut sentiasa kembali ke pantai tempat mereka dilahirkan untuk bertelur!",
    "zh": "海龟无论游过多远的大洋，成年后总会回到自己出生的同一片海滩产卵！",
    "ta": "கடலாமைகள் தாங்கள் பிறந்த கடற்கரைக்கே திரும்பி வந்து முட்டையிடுகின்றன!"
  },
  {
    "emotion": "laugh",
    "en": "Mudskippers can breathe through their skin and climb up mangrove roots! How cool is that?",
    "bm": "Ikan tembakul boleh bernafas guna kulit dan panjat akar pokok bakau! Hebat kan?",
    "zh": "弹涂鱼能用皮肤呼吸，还能爬到红树林根须上晒太阳！是不是很神奇？",
    "ta": "தண்ணீர் தாண்டும் மீன்கள் தோலின் வழியே சுவாசித்து மர வேர்களில் ஏறும்!"
  },
  {
    "emotion": "describing",
    "en": "Seagrass meadows store carbon 35 times faster than tropical rainforests! Let's protect our coasts.",
    "bm": "Padang rumput laut serap karbon 35 kali lebih pantas daripada hutan hujan! Jom lindungi pantai.",
    "zh": "海底海草平原吸收碳汇的速度比热带雨林还要快35倍！让我们保护近海生态！",
    "ta": "கடல் புல்வெளிகள் மழைக்காடுகளை விட 35 மடங்கு வேகமாக கரியமில வாயுவை உறிஞ்சுகின்றன!"
  },
  {
    "emotion": "crying",
    "en": "Discarded fishing line can strangle fragile coral branches. Remember to dispose of gear safely!",
    "bm": "Tali pancing terbuang boleh menjerat dahan karang rapuh. Buang sisa dengan selamat ya!",
    "zh": "废弃的鱼线会缠断脆弱的珊瑚分枝。钓鱼用具一定要妥善安全回收哦！",
    "ta": "வீசப்படும் தூண்டில் நூல்கள் பவளப்பாறைகளை சேதப்படுத்தும். பாதுகாப்பாக அகற்றுங்கள்!"
  },
  {
    "emotion": "congratulate",
    "en": "High-five, eco-adventurer! You are making our Malaysian waters cleaner and safer every single day!",
    "bm": "Tepuk tangan, pengembara eko! Anda jadikan perairan Malaysia lebih bersih setiap hari!",
    "zh": "击个掌，生态探险家！你每天都在让马来西亚的海域变得更加清澈安全！",
    "ta": "வாழ்த்துகள்! நீங்கள் தினமும் மலேசிய கடல்களை தூய்மையாக மாற்றுகிறீர்கள்!"
  },
  {
    "emotion": "laugh",
    "en": "Even Sang Kancil the clever mousedeer would be proud of your wise, waste-free decisions!",
    "bm": "Sang Kancil yang cerdik pun pasti bangga dengan keputusan bijak bebas sisa anda!",
    "zh": "连机智聪慧的小鼷鹿都会为你的明智零塑选择竖起大拇指！",
    "ta": "புத்திசாலி சுண்டெலி மான் கூட உங்கள் விவேகமான செயலைப் பாராட்டும்!"
  },
  {
    "emotion": "waving",
    "en": "Every tiny step counts. Never underestimate the ripple of your good deeds!",
    "bm": "Setiap langkah kecil bermakna. Jangan sesekali pandang rendah impak kebaikan anda!",
    "zh": "每一个微小的善举都算数。永远不要低估你的绿色选择掀起的浪花！",
    "ta": "ஒவ்வொரு சிறு படியும் முக்கியம். உங்கள் நல்ல செயலின் தாக்கத்தை குறைத்து மதிப்பிடாதீர்கள்!"
  },
  {
    "emotion": "laugh",
    "en": "I did three backflips underwater just now because of your awesome habit streak!",
    "bm": "Saya baru buat tiga pusingan dalam air sebab gembira dengan rekod amalan anda!",
    "zh": "看到你这么棒的打卡连续记录，我刚才在水下连翻了三个跟头！",
    "ta": "உங்கள் தொடர் பழக்கத்தைக் கண்டு நான் மகிழ்ச்சியில் நீருக்கடியில் துள்ளிக் குதித்தேன்!"
  },
  {
    "emotion": "describing",
    "en": "Remember: refuse what you do not need, reduce what you use, and reuse whenever you can!",
    "bm": "Ingat: tolak yang tak perlu, kurangkan yang diguna, dan guna semula seboleh mungkin!",
    "zh": "记住：拒绝不需要的，减少正在用的，尽可能重复使用手头的物品！",
    "ta": "நினைவில் கொள்க: தேவையில்லாததை மறுக்கவும், பயன்பாட்டைக் குறைக்கவும், மறுபயன்பாடு செய்யவும்!"
  },
  {
    "emotion": "wondered",
    "en": "Ever watched fireflies illuminate mangrove trees like Christmas lights? Clean rivers keep them glowing!",
    "bm": "Pernah tengok kelip-kelip hias pokok bakau macam lampu perayaan? Sungai bersih buat mereka bersinar!",
    "zh": "你看过萤火虫在红树林间如节日彩灯般闪耀吗？洁净的河流是它们长明的光源！",
    "ta": "சதுப்புநிலத்தில் மின்மினிப் பூச்சிகள் மின்னுவதைப் பார்த்திருக்கிறீர்களா? சுத்தமான நதியே காரணம்!"
  },
  {
    "emotion": "congratulate",
    "en": "Congratulations on choosing green today! You are building a world where nature thrives.",
    "bm": "Tahniah kerana pilih hijau hari ini! Anda sedang bina dunia di mana alam mekar subur.",
    "zh": "祝贺你今天做出的绿色选择！你正在共建一个人与自然和谐共生的美好世界。",
    "ta": "இன்று பசுமை வழியைத் தேர்ந்தெடுத்ததற்கு வாழ்த்துகள்! இயற்கை செழிக்க உதவுகிறீர்கள்."
  },
  {
    "emotion": "waving",
    "en": "Whenever you feel alone in your eco-journey, just tap me! I’m always here by your side.",
    "bm": "Bila-bila rasa sunyi dalam perjalanan eko anda, ketuk saya! Saya sentiasa ada di sisi anda.",
    "zh": "每当在环保路上感到孤单时，点点我吧！我永远在屏幕右下角陪伴着你。",
    "ta": "சுற்றுச்சூழல் பயணத்தில் எப்போது வேண்டுமானாலும் என்னை தட்டுங்கள்! நான் உங்களுடன் இருக்கிறேன்."
  },
  {
    "emotion": "laugh",
    "en": "Delicious Malaysian food tastes even better when served in clean, reusable tiffin containers!",
    "bm": "Makanan enak Malaysia rasa jauh lebih sedap bila dihidang dalam mangkuk tingkat guna semula!",
    "zh": "用漂亮的复古环保提锅装马来西亚美食，吃起来滋味更是翻倍香！",
    "ta": "மறுபயன்பாட்டு பாத்திரங்களில் சாப்பிடும்போது மலேசிய உணவு இன்னும் சுவையாக இருக்கும்!"
  },
  {
    "emotion": "describing",
    "en": "Take a postcard photo in your sanctuary to remember how beautiful your ecosystem is becoming!",
    "bm": "Ambil gambar poskad di santuari anda untuk abadikan keindahan ekosistem yang sedang mekar!",
    "zh": "在生态天地里拍一张明信片吧，记录下你的专属家园变得多么绚丽多姿！",
    "ta": "உங்கள் அழகான சரணாலயத்தை நினைவில் வைத்திருக்க ஒரு அஞ்சலட்டை படம் எடுங்கள்!"
  },
  {
    "emotion": "congratulate",
    "en": "Thank you for being a true friend to sea turtles and the wild beauty of Malaysia!",
    "bm": "Terima kasih kerana menjadi sahabat sejati penyu laut dan keindahan rimba Malaysia!",
    "zh": "感谢你成为海龟最真诚的朋友，以及马来西亚自然野性之美的守护者！",
    "ta": "கடலாமைகளுக்கும் மலேசியாவின் இயற்கை அழகிற்கும் உண்மையான நண்பராக இருப்பதற்கு நன்றி!"
  },
  {
    "emotion": "waving",
    "en": "Have an inspiring, peaceful, and plastic-free day! Let’s keep swimming forward!",
    "bm": "Semoga hari anda penuh inspirasi, damai, dan bebas plastik! Jom terus berenang ke hadapan!",
    "zh": "祝你拥有充满灵感、宁静且无塑的一天！让我们一起向前畅游吧！",
    "ta": "இனிய, அமைதியான, பிளாஸ்டிக் இல்லா நாளாக அமையட்டும்! தொடர்ந்து முன்னேறுவோம்!"
  }
];

export function MascotWidget({ language }: MascotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [emotion, setEmotion] = useState<EmotionType>("idle");
  const [activeText, setActiveText] = useState<ReactNode>("");
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [dialogueMode, setDialogueMode] = useState<"random" | "verify-success" | "verify-fail">("random");
  const [verifiedPoints, setVerifiedPoints] = useState<number>(10);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const langKey = language === "Bahasa Melayu" ? "bm" : language === "中文" ? "zh" : language === "தமிழ்" ? "ta" : "en";

  const renderCoinIcon = () => (
    <img
      src="/assets/brand/greenbits.png"
      alt=""
      style={{
        width: 16,
        height: 16,
        objectFit: "contain",
        verticalAlign: "-3px",
        margin: "0 3px",
        display: "inline-block",
      }}
    />
  );

  const buildVerifySuccessNode = useCallback(
    (pts: number): ReactNode => {
      if (langKey === "bm") {
        return (
          <>
            Tahniah! Bukti anda disahkan! +{pts}
            {renderCoinIcon()}diperolehi!
          </>
        );
      }
      if (langKey === "zh") {
        return (
          <>
            太棒了！你的无塑证明已通过审核！+{pts}
            {renderCoinIcon()}已到账！
          </>
        );
      }
      if (langKey === "ta") {
        return (
          <>
            வாழ்த்துகள்! உங்கள் சான்று சரிபார்க்கப்பட்டது! +{pts}
            {renderCoinIcon()}வழங்கப்பட்டது!
          </>
        );
      }
      return (
        <>
          Congratulations! Your habit proof is verified! +{pts}
          {renderCoinIcon()}awarded!
        </>
      );
    },
    [langKey],
  );

  const buildVerifyFailNode = useCallback((): string => {
    if (langKey === "bm") {
      return "Aduh... gambar ini tidak dapat disahkan. Jangan putus asa, cuba lagi ya!";
    }
    if (langKey === "zh") {
      return "呜呜... 这张照片未能通过验证。别灰心，换个角度再试一次吧！";
    }
    if (langKey === "ta") {
      return "அச்சச்சோ... இந்த புகைப்படத்தை சரிபார்க்க முடியவில்லை. கவலைப்பட வேண்டாம், மீண்டும் முயற்சிக்கவும்!";
    }
    return "Oh no... this photo could not be verified. Don't worry, try again!";
  }, [langKey]);

  const triggerRandomMascotTalk = useCallback(() => {
    const nextIdx = Math.floor(Math.random() * MOTIVATING_DIALOGUES.length);
    setDialogueIndex(nextIdx);
    setDialogueMode("random");
    const d = MOTIVATING_DIALOGUES[nextIdx];
    setActiveText(d[langKey]);
    setEmotion(d.emotion);
  }, [langKey]);

  // Listen to verification success or failure events
  useEffect(() => {
    const handleMascotEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail) return;

      if (detail.type === "verification-success") {
        const pts = Number(detail.points ?? 10);
        setVerifiedPoints(pts);
        setDialogueMode("verify-success");
        setIsOpen(true);
        setEmotion("congratulate");
        setActiveText(buildVerifySuccessNode(pts));
      } else if (detail.type === "verification-fail") {
        setDialogueMode("verify-fail");
        setIsOpen(true);
        setEmotion("crying");
        setActiveText(buildVerifyFailNode());
      }
    };

    window.addEventListener("unplastica-mascot-event", handleMascotEvent);
    return () => window.removeEventListener("unplastica-mascot-event", handleMascotEvent);
  }, [buildVerifySuccessNode, buildVerifyFailNode]);

  // Keep text up to date if language changes while dialog is open
  useEffect(() => {
    if (!isOpen) return;
    if (dialogueMode === "verify-success") {
      setActiveText(buildVerifySuccessNode(verifiedPoints));
    } else if (dialogueMode === "verify-fail") {
      setActiveText(buildVerifyFailNode());
    } else if (MOTIVATING_DIALOGUES[dialogueIndex]) {
      setActiveText(MOTIVATING_DIALOGUES[dialogueIndex][langKey]);
    }
  }, [langKey, dialogueIndex, dialogueMode, verifiedPoints, isOpen, buildVerifySuccessNode, buildVerifyFailNode]);

  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem("unplastica_mascot_drag_pos");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: 0, y: 0 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [isPatted, setIsPatted] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number }>({
    clientX: 0,
    clientY: 0,
    startX: 0,
    startY: 0,
  });
  const hasMovedRef = useRef(false);

  const toggleOpen = () => {
    if (!isOpen) {
      setIsOpen(true);
      setTiltAngle(0);
      triggerRandomMascotTalk();
    } else {
      setIsOpen(false);
      setTiltAngle(0);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: dragOffset.x,
      startY: dragOffset.y,
    };
    hasMovedRef.current = false;
    setIsDragging(true);
    setIsPatted(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    if (Math.hypot(dx, dy) > 6) {
      hasMovedRef.current = true;
    }
    const newX = dragStartRef.current.startX + dx;
    const newY = dragStartRef.current.startY + dy;
    const clampedX = Math.max(-window.innerWidth + 200, Math.min(40, newX));
    const clampedY = Math.max(-window.innerHeight + 240, Math.min(40, newY));
    const pos = { x: clampedX, y: clampedY };
    setDragOffset(pos);
    try {
      localStorage.setItem("unplastica_mascot_drag_pos", JSON.stringify(pos));
    } catch {}
    setTiltAngle(Math.max(-18, Math.min(18, dx * 0.14)));
    if (emotion !== "wondered" && emotion !== "waving") {
      setEmotion("wondered");
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    setIsPatted(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (!hasMovedRef.current) {
      triggerRandomMascotTalk();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
    } else {
      setTiltAngle(0);
      setEmotion("laugh");
      // Persistently stay at the dragged place without returning
    }
  };

  return (
    <>
      {/* Pop-out Mascot: Turtle freely standing in the app talking (no card/box enclosing turtle!) */}
      {isOpen && (
        <div
          className="mascot-floating-popup"
          style={{
            position: "fixed",
            bottom: isDesktop ? "32px" : "max(84px, env(safe-area-inset-bottom) + 72px)",
            right: isDesktop ? 32 : 16,
            maxWidth: isDesktop ? 440 : 360,
            width: isDesktop ? "440px" : "calc(100vw - 32px)",
            zIndex: 9995,
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: isDesktop ? 16 : 12,
            transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
            transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            animation: "mascotSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Authentic Comic Chat Bubble (rounded balloon with curved pointer tail as in user screenshot) */}
          <div
            className="comic-chat-bubble"
            style={{
              position: "relative",
              pointerEvents: "auto",
              background: "#ffffff",
              border: "2.5px solid #111827",
              borderRadius: isDesktop ? 32 : 28,
              padding: isDesktop ? "20px 24px 22px" : "16px 20px 18px",
              boxShadow: "0 18px 45px rgba(0, 0, 0, 0.45), 0 4px 16px rgba(0, 0, 0, 0.15)",
              width: "100%",
            }}
          >
            {/* Curved Comic Speech Tail pointing directly down-right toward turtle head */}
            <svg
              width="32"
              height="24"
              viewBox="0 0 32 24"
              style={{
                position: "absolute",
                bottom: -22,
                right: 50,
                overflow: "visible",
                pointerEvents: "none",
              }}
            >
              <path
                d="M 2 0 C 4 10, 16 18, 28 24 C 23 16, 25 7, 30 0"
                fill="#ffffff"
                stroke="#111827"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <rect x="3" y="-2" width="26" height="4" fill="#ffffff" />
            </svg>

            {/* Close mini button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close Mascot"
              style={{
                position: "absolute",
                top: 8,
                right: 12,
                background: "rgba(0, 0, 0, 0.06)",
                border: "none",
                borderRadius: "50%",
                width: 24,
                height: 24,
                color: "#374151",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0, 0, 0, 0.14)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0, 0, 0, 0.06)")}
            >
              ✕
            </button>

            <div
              onClick={triggerRandomMascotTalk}
              style={{
                cursor: "pointer",
                color: "#111827",
                fontSize: isDesktop ? 16 : 14,
                lineHeight: isDesktop ? 1.55 : 1.48,
                fontWeight: 600,
                paddingRight: isDesktop ? 26 : 20,
              }}
            >
              {activeText}
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: isDesktop ? 12.5 : 11,
                fontWeight: 600,
                color: "#15803d",
                opacity: 0.9,
              }}
            >
              {langKey === "bm"
                ? "Ketik penyu untuk sembang!"
                : langKey === "zh"
                  ? "点击海龟跟我互动！"
                  : "Tap turtle to talk!"}
            </div>
          </div>

          {/* Turtle standing freely in the app (No box/container! Sized prominently on PC UI) */}
          <div
            title="Touch or drag me!"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              position: "relative",
              pointerEvents: "auto",
              cursor: isDragging ? "grabbing" : "grab",
              touchAction: "none",
              padding: "2px",
              filter:
                "drop-shadow(0 14px 28px rgba(0, 0, 0, 0.65)) drop-shadow(0 0 20px rgba(174, 246, 130, 0.5))",
              transform: `rotate(${tiltAngle}deg) scale(${isDragging ? 1.08 : isPatted ? 0.94 : 1})`,
              transition: isDragging ? "none" : "transform 0.25s ease",
              marginRight: 6,
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            {/* Cute floating reaction heart on touch */}
            {showHeart && (
              <div
                style={{
                  position: "absolute",
                  top: -10,
                  right: 28,
                  fontSize: 22,
                  pointerEvents: "none",
                  animation: "mascotHeartFloat 0.9s ease-out forwards",
                  zIndex: 20,
                }}
              >
                💚
              </div>
            )}
            <div
              style={{
                animation: isDragging ? "none" : "mascotTalkingBounce 1.5s ease-in-out infinite",
              }}
            >
              <TurtleCanvas
                emotion={emotion}
                direction="right"
                width={isDesktop ? 260 : 185}
                height={isDesktop ? 230 : 165}
              />
            </div>
          </div>
        </div>
      )}

      {/* Super Cute Front-Facing Sea Turtle Head Button - permanently pinned to bottom right corner */}
      <button
        type="button"
        className="mascot-launcher-button"
        onClick={toggleOpen}
        aria-label="Open Sea Turtle Mascot"
        style={{
          position: "fixed",
          bottom: isDesktop ? "32px" : "max(84px, env(safe-area-inset-bottom) + 72px)",
          right: isDesktop ? 32 : 18,
          width: isDesktop ? 80 : 66,
          height: isDesktop ? 80 : 66,
          padding: 0,
          border: "none",
          background: "transparent",
          boxShadow: "none",
          cursor: "pointer",
          zIndex: 9990,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
          filter:
            "drop-shadow(0 8px 18px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 16px rgba(174, 246, 130, 0.65))",
          transform: isOpen ? "scale(0) translateY(24px)" : "scale(1) translateY(0)",
          opacity: isOpen ? 0 : 1,
          pointerEvents: isOpen ? "none" : "auto",
          transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, filter 0.2s ease",
          animation: isOpen ? "none" : "mascotPopOut 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.transform = "scale(1.14) translateY(-3px)";
            e.currentTarget.style.filter =
              "drop-shadow(0 12px 24px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 24px rgba(174, 246, 130, 0.9))";
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.filter =
              "drop-shadow(0 8px 18px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 16px rgba(174, 246, 130, 0.65))";
          }
        }}
      >
        <TurtleFrontHeadCanvas emotion={emotion} isOpen={isOpen} />
      </button>
    </>
  );
}
