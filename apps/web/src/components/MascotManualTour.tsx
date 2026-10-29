import React, { useEffect, useState, useCallback } from "react";
import type { EmotionType, Direction } from "@game/turtle/types";
import type { Language } from "../lib/i18n";
import { TurtleCanvas } from "./TurtleCanvas";

export interface MascotTourStep {
  page: "home" | "earn" | "events" | "profile";
  focus: string | null;
  emotion: EmotionType;
  direction: Direction;
  text: {
    en: (coinImg: React.ReactNode) => React.ReactNode;
    bm: (coinImg: React.ReactNode) => React.ReactNode;
    zh: (coinImg: React.ReactNode) => React.ReactNode;
  };
}

const GREENBIT_COIN = (
  <img
    src="/assets/brand/greenbits.png"
    alt=""
    style={{
      width: 18,
      height: 18,
      verticalAlign: "middle",
      display: "inline-block",
      margin: "0 3px",
      borderRadius: "50%",
    }}
  />
);

export const TOUR_STEPS: MascotTourStep[] = [
  // 1
  {
    page: "home",
    focus: null,
    emotion: "waving",
    direction: "right",
    text: {
      en: () => "Welcome to unplastica!",
      bm: () => "Selamat datang ke unplastica!",
      zh: () => "欢迎来到 unplastica！",
    },
  },
  // 2
  {
    page: "home",
    focus: null,
    emotion: "blush",
    direction: "right",
    text: {
      en: () => "Do you know that reducing plastics saves me?",
      bm: () => "Tahukah anda mengurangkan plastik menyelamatkan saya?",
      zh: () => "你知道减少塑料可以拯救我吗？",
    },
  },
  // 3
  {
    page: "home",
    focus: null,
    emotion: "angry",
    direction: "left",
    text: {
      en: () => "I hate plastics! Sometimes I ate it and thought it is a jellyfish!",
      bm: () => "Saya benci plastik! Kadang-kadang saya termakannya kerana sangka ia obor-obor!",
      zh: () => "我讨厌塑料！有时我误以为它是水母吃下去了！",
    },
  },
  // 4
  {
    page: "home",
    focus: null,
    emotion: "describing",
    direction: "right",
    text: {
      en: () => "Now, let me show you how to use this app!",
      bm: () => "Sekarang, mari saya tunjukkan cara menggunakan aplikasi ini!",
      zh: () => "现在，让我带你了解如何使用这个应用吧！",
    },
  },
  // 5
  {
    page: "home",
    focus: "#sanctuary-section",
    emotion: "describing",
    direction: "right",
    text: {
      en: () => "You can enter your personal virtual ecosystem in here!",
      bm: () => "Anda boleh memasuki ekosistem maya peribadi anda di sini!",
      zh: () => "你可以在这里进入你的专属虚拟生态天地！",
    },
  },
  // 6
  {
    page: "home",
    focus: "#sanctuary-section",
    emotion: "wondered",
    direction: "right",
    text: {
      en: (coin) => <>Wonder how you can use {coin}? Directly in this virtual ecosystem!</>,
      bm: (coin) => <>Tertanya-tanya bagaimana menggunakan {coin}? Terus dalam ekosistem maya ini!</>,
      zh: (coin) => <>想知道怎么使用 {coin} 吗？直接在这个虚拟生态里使用！</>,
    },
  },
  // 7
  {
    page: "earn",
    focus: "#earn-heading",
    emotion: "describing",
    direction: "right",
    text: {
      en: (coin) => <>Here is where you can earn {coin} for your personal virtual ecosystem!</>,
      bm: (coin) => <>Di sinilah anda boleh mengumpul {coin} untuk ekosistem maya anda!</>,
      zh: (coin) => <>这里就是为你的虚拟生态天地赚取 {coin} 的地方！</>,
    },
  },
  // 8
  {
    page: "earn",
    focus: "#habit-list",
    emotion: "describing",
    direction: "left",
    text: {
      en: (coin) => <>By reducing plastics using these habits, you get to earn coins {coin}!</>,
      bm: (coin) => <>Dengan mengurangkan plastik melalui amalan ini, anda boleh dapatkan syiling {coin}!</>,
      zh: (coin) => <>通过实践这些无塑习惯减少塑料，就能赚取硬币 {coin}！</>,
    },
  },
  // 9
  {
    page: "events",
    focus: "#events-heading",
    emotion: "describing",
    direction: "right",
    text: {
      en: () => "These are the important events unplastica organised!",
      bm: () => "Inilah acara penting yang dianjurkan oleh unplastica!",
      zh: () => "这些是 unplastica 举办的重要活动！",
    },
  },
  // 10
  {
    page: "events",
    focus: "#challenge-card",
    emotion: "congratulate",
    direction: "right",
    text: {
      en: () => "Do you know that you can win up to RM 500 just by reducing plastics? Join now!",
      bm: () => "Tahukah anda bahawa anda boleh memenangi sehingga RM 500 hanya dengan kurangkan plastik? Sertai sekarang!",
      zh: () => "你知道吗？只要减少塑料就有机会赢得高达 RM 500 奖金！快来参加吧！",
    },
  },
  // 11
  {
    page: "profile",
    focus: "#profile-details",
    emotion: "describing",
    direction: "right",
    text: {
      en: () => "Here is where you can change your personal settings!",
      bm: () => "Di sinilah tempat anda mengubah tetapan peribadi anda!",
      zh: () => "这里是你可以修改个人设置的地方！",
    },
  },
  // 12
  {
    page: "profile",
    focus: "#preferences-section",
    emotion: "describing",
    direction: "right",
    text: {
      en: () => "Here is where you rerun this manual again, allow notifications or set language and theme!",
      bm: () => "Di sinilah anda boleh mainkan manual ini semula, benarkan pemberitahuan atau tetapkan bahasa dan tema!",
      zh: () => "在这里你可以重看使用指南、开启通知，或设置语言与主题！",
    },
  },
  // 13
  {
    page: "profile",
    focus: null,
    emotion: "waving",
    direction: "right",
    text: {
      en: () => "Have a nice day! Thanks for being part of us!",
      bm: () => "Semoga hari anda ceria! Terima kasih kerana menjadi sebahagian daripada kami!",
      zh: () => "祝你有美好的一天！感谢你加入我们！",
    },
  },
];

interface MascotManualTourProps {
  language: Language;
  onNavigatePage: (page: "home" | "earn" | "events" | "profile") => void;
  onComplete: () => void;
}

export function MascotManualTour({
  language,
  onNavigatePage,
  onComplete,
}: MascotManualTourProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [focusRect, setFocusRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStepIdx];
  const langKey = language === "Bahasa Melayu" ? "bm" : language === "中文" ? "zh" : "en";

  const updateFocus = useCallback((shouldScroll = false) => {
    if (!step.focus) {
      setFocusRect(null);
      return;
    }
    const el = document.querySelector(step.focus);
    if (el) {
      if (shouldScroll) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const r = el.getBoundingClientRect();
      setFocusRect(r);
    } else {
      setFocusRect(null);
    }
  }, [step.focus]);

  useEffect(() => {
    // Navigate to page first
    onNavigatePage(step.page);
    // Give time for layout transition before scrolling to target element and updating spotlight rect
    const t1 = setTimeout(() => updateFocus(true), 120);
    const t2 = setTimeout(() => updateFocus(false), 420);
    const t3 = setTimeout(() => updateFocus(false), 720);
    const onReposition = () => updateFocus(false);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, { passive: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition);
    };
  }, [step.page, updateFocus]);

  const handleNext = () => {
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  const isLast = currentStepIdx === TOUR_STEPS.length - 1;

  const quitLabel = langKey === "bm" ? "Keluar" : langKey === "zh" ? "退出" : "Quit";
  const backLabel = langKey === "bm" ? "Kembali" : langKey === "zh" ? "上一步" : "Back";
  const nextLabel = isLast
    ? langKey === "bm"
      ? "Selesai"
      : langKey === "zh"
      ? "完成"
      : "Finish"
    : langKey === "bm"
    ? "Seterusnya"
    : langKey === "zh"
    ? "下一步"
    : "Next";

  return (
    <div className="mascot-tour-overlay" style={{ position: "fixed", inset: 0, zIndex: 9998, pointerEvents: "auto" }}>
      {/* Darkened backdrop with spotlight cutout */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <defs>
          <mask id="mascot-spotlight-mask">
            {/* White covers all (blocks light) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout reveals element underneath */}
            {focusRect && (
              <rect
                x={focusRect.left - 8}
                y={focusRect.top - 8}
                width={focusRect.width + 16}
                height={focusRect.height + 16}
                rx={18}
                ry={18}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(3, 16, 9, 0.78)"
          mask="url(#mascot-spotlight-mask)"
        />
      </svg>

      {/* Pulsing highlight ring on focused element */}
      {focusRect && (
        <div
          className="mascot-focus-ring"
          style={{
            position: "fixed",
            left: focusRect.left - 8,
            top: focusRect.top - 8,
            width: focusRect.width + 16,
            height: focusRect.height + 16,
            borderRadius: 18,
            pointerEvents: "none",
            border: "2px solid #aef682",
            boxShadow: "0 0 24px rgba(174, 246, 130, 0.45), inset 0 0 12px rgba(174, 246, 130, 0.25)",
            animation: "pulseMascotFocus 1.8s infinite ease-in-out",
          }}
        />
      )}

      {/* Floating Mascot Dialogue Bottom Container */}
      <div
        className="mascot-tour-card-wrapper"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: "max(18px, env(safe-area-inset-bottom) + 12px)",
          display: "flex",
          justifyContent: "center",
          padding: "0 16px",
          zIndex: 9999,
          pointerEvents: "auto",
        }}
      >
        <div
          className="mascot-bubble-card"
          style={{
            maxWidth: 520,
            width: "100%",
            background: "rgba(8, 28, 18, 0.94)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1.5px solid rgba(174, 246, 130, 0.38)",
            borderRadius: 24,
            padding: "16px 20px",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.55), 0 0 30px rgba(86, 217, 133, 0.18)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            position: "relative",
          }}
        >
          {/* Header row with step counter & Quit button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#aef682",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Step {currentStepIdx + 1} of {TOUR_STEPS.length}
            </span>
            <button
              type="button"
              onClick={onComplete}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                borderRadius: 999,
                color: "#c8ded0",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {quitLabel}
            </button>
          </div>

          {/* Center row with animated turtle canvas and speech text bubble */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexDirection: step.direction === "left" ? "row-reverse" : "row",
            }}
          >
            {/* Animated Mascot Rig */}
            <div style={{ flexShrink: 0 }}>
              <TurtleCanvas
                emotion={step.emotion}
                direction={step.direction}
                width={110}
                height={100}
              />
            </div>

            {/* Speech bubble */}
            <div
              className="mascot-speech-bubble"
              style={{
                flex: 1,
                background: "rgba(16, 44, 28, 0.9)",
                border: "1.2px solid rgba(174, 246, 130, 0.28)",
                borderRadius: 16,
                padding: "12px 16px",
                color: "#fcfdfa",
                fontSize: 15,
                lineHeight: 1.45,
                fontWeight: 500,
                position: "relative",
              }}
            >
              {step.text[langKey](GREENBIT_COIN)}
            </div>
          </div>

          {/* Action buttons row */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            {currentStepIdx > 0 && (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: 12,
                  color: "#d4ede0",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "8px 16px",
                  cursor: "pointer",
                }}
              >
                {backLabel}
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              style={{
                background: "linear-gradient(135deg, #aef682 0%, #34d399 100%)",
                border: "none",
                borderRadius: 12,
                color: "#032311",
                fontSize: 13,
                fontWeight: 700,
                padding: "8px 20px",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(174, 246, 130, 0.35)",
              }}
            >
              {nextLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
