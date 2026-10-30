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

interface MascotDialogue {
  en: string;
  bm: string;
  zh: string;
}

const MOTIVATING_DIALOGUES: MascotDialogue[] = [
  {
    en: "Hi, you look good today! Wanna reduce plastics together?",
    bm: "Hai, anda nampak hebat hari ini! Jom kurangkan plastik bersama?",
    zh: "嗨，你今天气色真好！要一起减少塑料吗？",
  },
  {
    en: "Every single-use bottle you refuse makes our oceans cleaner!",
    bm: "Setiap botol sekali guna yang anda tolak menjadikan lautan kita lebih bersih!",
    zh: "你每拒绝一个塑料瓶，我们的海洋就更干净一分！",
  },
  {
    en: "My coral reef friends send their thank-you waves to you!",
    bm: "Rakan terumbu karang saya kirimkan lambaian terima kasih kepada anda!",
    zh: "我的珊瑚礁朋友们向你发来感谢的波浪！",
  },
  {
    en: "Carrying a reusable bag is the coolest superpower in Malaysia!",
    bm: "Membawa beg guna semula adalah kuasa luar biasa paling hebat di Malaysia!",
    zh: "自带购物袋是马来西亚最酷的超能力！",
  },
  {
    en: "A sip from your refill flask is a victory for the turtles!",
    bm: "Tegukan daripada botol guna semula anda ialah kemenangan bagi penyu!",
    zh: "用自己的水壶喝一口水，就是给海龟带来的一份胜利！",
  },
  {
    en: "Did you know turtles can live over 80 years? Let’s keep oceans safe for my grandkids!",
    bm: "Tahukah anda penyu boleh hidup lebih 80 tahun? Jom jaga lautan untuk cucu-cicit saya!",
    zh: "你知道海龟能活80多岁吗？让我们一起守护这片海洋吧！",
  },
  {
    en: "Small green habits today build a giant lush forest tomorrow!",
    bm: "Amalan hijau kecil hari ini membina hutan yang subur esok hari!",
    zh: "今天的一个绿色小习惯，能造就明天的一片大森林！",
  },
  {
    en: "No straw? Awesome! You are swimming in the right direction!",
    bm: "Tak guna penyedut minuman? Hebat! Anda berenang ke arah yang betul!",
    zh: "不使用吸管？太棒了！你正朝着正确的方向前进！",
  },
  {
    en: "I love swimming through clear water instead of plastic bags!",
    bm: "Saya suka berenang dalam air yang jernih berbanding celah beg plastik!",
    zh: "比起塑料袋，我更喜欢在清澈的海水里畅游！",
  },
  {
    en: "You've got this! One plastic-free meal at a time!",
    bm: "Anda pasti boleh! Satu hidangan bebas plastik pada satu masa!",
    zh: "你一定可以的！每餐少用一点塑料！",
  },
  {
    en: "Your sanctuary animals are so happy you checked in today!",
    bm: "Haiwan santuari anda gembira melihat kehadiran anda hari ini!",
    zh: "你的生态天地里的小动物们今天看到你开心极了！",
  },
  {
    en: "Eating lunch with your own box? That deserves a high-flipper!",
    bm: "Makan tengah hari guna bekas sendiri? Mari tepuk sirip!",
    zh: "用自带餐盒吃午饭？来跟我击个掌（鳍）吧！",
  },
  {
    en: "Let's keep Borneo and Peninsular Malaysia clean and green!",
    bm: "Jom pastikan Borneo dan Semenanjung Malaysia sentiasa bersih dan hijau!",
    zh: "让我们一起让婆罗洲和马来半岛更加洁净翠绿！",
  },
  {
    en: "Feeling tired? Take a deep breath of fresh, unpolluted ocean air!",
    bm: "Rasa penat? Tarik nafas dalam-dalam dengan udara laut yang segar!",
    zh: "累了吗？深吸一口清新的无污染海洋空气吧！",
  },
  {
    en: "Together, we are unstoppable eco-warriors!",
    bm: "Bersama-sama, kita pahlawan eko yang tidak dapat ditandingi!",
    zh: "在一起，我们就是不可阻挡的生态勇士！",
  },
  {
    en: "The best time to reduce plastic was yesterday; the next best time is right now!",
    bm: "Masa terbaik untuk kurangkan plastik ialah semalam; masa kedua terbaik ialah sekarang!",
    zh: "减少塑料最好的时机是昨天，其次是现在！",
  },
  {
    en: "Your choices inspire everyone around you to do better!",
    bm: "Pilihan anda memberi inspirasi kepada orang sekeliling untuk menjadi lebih baik!",
    zh: "你的每一个选择都在激励身边的人！",
  },
  {
    en: "Jellyfish are delicious, but plastic is toxic! Thanks for keeping them separate!",
    bm: "Obor-obor memang lazat, tetapi plastik toksik! Terima kasih kerana mengelakkannya!",
    zh: "水母很好吃，但塑料有毒！感谢你帮我区分它们！",
  },
  {
    en: "Ready to earn more rewards? Pick an action in the Earn tab!",
    bm: "Sedia untuk kumpul lebih banyak ganjaran? Pilih amalan dalam tab Dapatkan!",
    zh: "准备好赚取更多奖励了吗？快去“赚取”页面选择一项习惯吧！",
  },
  {
    en: "Keep shining, hero! The planet loves you!",
    bm: "Teruskan bersemangat, wira! Bumi menyayangi anda!",
    zh: "继续加油，英雄！地球为你点赞！",
  },
];

export function MascotWidget({ language }: MascotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [emotion, setEmotion] = useState<EmotionType>("idle");
  const [activeText, setActiveText] = useState<ReactNode>("");
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [dialogueMode, setDialogueMode] = useState<"random" | "verify-success" | "verify-fail">("random");
  const [verifiedPoints, setVerifiedPoints] = useState<number>(10);

  const langKey = language === "Bahasa Melayu" ? "bm" : language === "中文" ? "zh" : "en";

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
    return langKey === "bm"
      ? "Aduh... gambar ini tidak dapat disahkan. Jangan putus asa, cuba lagi ya!"
      : langKey === "zh"
        ? "呜呜... 这张照片未能通过验证。别灰心，换个角度再试一次吧！"
        : "Oh no... this photo could not be verified. Don't worry, try again!";
  }, [langKey]);

  const triggerRandomMascotTalk = useCallback(() => {
    const nextIdx = Math.floor(Math.random() * MOTIVATING_DIALOGUES.length);
    setDialogueIndex(nextIdx);
    setDialogueMode("random");
    setActiveText(MOTIVATING_DIALOGUES[nextIdx][langKey]);
    const nextEmotion: EmotionType = Math.random() > 0.5 ? "waving" : "wondered";
    setEmotion(nextEmotion);
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
            bottom: "max(84px, env(safe-area-inset-bottom) + 72px)",
            right: 16,
            maxWidth: 360,
            width: "calc(100vw - 32px)",
            zIndex: 9995,
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 12,
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
              borderRadius: 28,
              padding: "16px 20px 18px",
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
                fontSize: 14,
                lineHeight: 1.48,
                fontWeight: 600,
                paddingRight: 20,
              }}
            >
              {activeText}
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 11,
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

          {/* Turtle standing freely in the app (No box/container! 40% larger + dynamic dragging/touching interaction) */}
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
                width={185}
                height={165}
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
          bottom: "max(84px, env(safe-area-inset-bottom) + 72px)",
          right: 18,
          width: 66,
          height: 66,
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
