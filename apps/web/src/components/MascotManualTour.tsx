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
      {/* Interactive Mascot Tour: Turtle freely standing in the app talking (NO enclosing box around turtle!) */}
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
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            maxWidth: 580,
            width: "100%",
            display: "flex",
            alignItems: "flex-end",
            gap: 14,
            flexDirection: step.direction === "left" ? "row-reverse" : "row",
            pointerEvents: "auto",
          }}
        >
          {/* Animated Mascot Rig: Standing freely in the app (40% larger, talking & interacting animation) */}
          <div
            style={{
              flexShrink: 0,
              filter:
                "drop-shadow(0 14px 28px rgba(0, 0, 0, 0.65)) drop-shadow(0 0 20px rgba(174, 246, 130, 0.5))",
              transform: "translateY(8px)",
              animation: "mascotSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1), mascotTalkingBounce 1.5s ease-in-out infinite",
            }}
          >
            <TurtleCanvas
              emotion={step.emotion}
              direction={step.direction}
              width={180}
              height={162}
            />
          </div>

          {/* Authentic Comic Chat Bubble (rounded balloon with curved pointer tail as in screenshot) */}
          <div
            className="comic-speech-bubble"
            style={{
              flex: 1,
              background: "#ffffff",
              border: "2.5px solid #111827",
              borderRadius: 30,
              padding: "18px 22px 20px",
              boxShadow:
                "0 20px 48px rgba(0, 0, 0, 0.45), 0 4px 16px rgba(0, 0, 0, 0.15)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              position: "relative",
              animation: "mascotSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Curved Comic Speech Tail pointing directly toward turtle */}
            <svg
              width="32"
              height="24"
              viewBox="0 0 32 24"
              style={{
                position: "absolute",
                bottom: -22,
                left: step.direction === "left" ? "auto" : 42,
                right: step.direction === "left" ? 42 : "auto",
                transform: step.direction === "left" ? "none" : "scaleX(-1)",
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

            {/* Header row with step counter & Quit button (expands naturally without squeezing) */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "#15803d",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  padding: "4px 12px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Step {currentStepIdx + 1} of {TOUR_STEPS.length}
              </span>
              <button
                type="button"
                onClick={onComplete}
                style={{
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: 999,
                  color: "#4b5563",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "5px clamp(12px, 3vw, 18px)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  minWidth: "max-content",
                  transition: "all 0.2s ease",
                }}
              >
                {quitLabel}
              </button>
            </div>

            {/* Speech message text */}
            <div
              style={{
                color: "#111827",
                fontSize: 15.5,
                lineHeight: 1.48,
                fontWeight: 600,
              }}
            >
              {step.text[langKey](GREENBIT_COIN)}
            </div>

            {/* Action buttons row (dynamically adjusts to text length without squeezing) */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 10,
                marginTop: 4,
                width: "100%",
              }}
            >
              {currentStepIdx > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  style={{
                    background: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: 999,
                    color: "#374151",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "8px clamp(16px, 4vw, 24px)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    minWidth: "max-content",
                    boxSizing: "border-box",
                  }}
                >
                  {backLabel}
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                style={{
                  background: "#166534",
                  border: "none",
                  borderRadius: 999,
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "8px clamp(18px, 5vw, 28px)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  minWidth: "max-content",
                  boxShadow: "0 4px 14px rgba(22, 101, 52, 0.35)",
                  transition: "transform 0.15s ease",
                  boxSizing: "border-box",
                }}
              >
                {nextLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
