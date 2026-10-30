import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { initApp } from "@game/index";
import type { SaveState } from "@game/game/types";
import type { Language } from "../lib/i18n";
import "@game/index.css";

interface GamePageProps {
  balance: number;
  user: User | null;
  language?: Language;
  cloudSaveState?: Partial<SaveState> | null;
  onExit: () => void;
  onBalanceChange?: (newBalance: number) => void;
  onSaveStateChange?: (state: SaveState) => void;
}

export function GamePage({
  balance,
  user,
  language = "English",
  cloudSaveState,
  onExit,
  onBalanceChange,
  onSaveStateChange,
}: GamePageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initialBalanceRef = useRef(balance);
  const initialCloudSaveRef = useRef(cloudSaveState);
  const onExitRef = useRef(onExit);
  const onBalanceChangeRef = useRef(onBalanceChange);
  const onSaveStateChangeRef = useRef(onSaveStateChange);

  onExitRef.current = onExit;
  onBalanceChangeRef.current = onBalanceChange;
  onSaveStateChangeRef.current = onSaveStateChange;

  useEffect(() => {
    window.__UNPLASTICA_APP__ = true;
    const container = containerRef.current;
    if (!container) return;

    const cleanup = initApp({
      rootElement: container,
      balance: initialBalanceRef.current,
      userId: user?.id,
      language,
      initialSaveState: initialCloudSaveRef.current,
      onExit: () => onExitRef.current(),
      onBalanceChange: (nextBal) => onBalanceChangeRef.current?.(nextBal),
      onSaveStateChange: (state) => onSaveStateChangeRef.current?.(state),
    });

    return () => {
      cleanup();
    };
  }, [user?.id, language]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("unplastica-sync-game-balance", {
        detail: { balance },
      }),
    );
  }, [balance]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("unplastica-sync-game-language", {
        detail: { language },
      }),
    );
  }, [language]);

  return (
    <div className="sanctuary-game-page" style={{ position: "fixed", inset: 0, zIndex: 100, background: "#002c17" }}>
      <div ref={containerRef} id="sanctuary-game-root" style={{ width: "100%", height: "100%", position: "relative" }} />
    </div>
  );
}

