import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { initApp } from "@game/index";
import type { SaveState } from "@game/game/types";
import "@game/index.css";

interface GamePageProps {
  balance: number;
  user: User | null;
  cloudSaveState?: Partial<SaveState> | null;
  onExit: () => void;
  onBalanceChange?: (newBalance: number) => void;
  onSaveStateChange?: (state: SaveState) => void;
}

export function GamePage({
  balance,
  user,
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
      initialSaveState: initialCloudSaveRef.current,
      onExit: () => onExitRef.current(),
      onBalanceChange: (nextBal) => onBalanceChangeRef.current?.(nextBal),
      onSaveStateChange: (state) => onSaveStateChangeRef.current?.(state),
    });

    return () => {
      cleanup();
    };
  }, [user?.id]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("unplastica-sync-game-balance", {
        detail: { balance },
      }),
    );
  }, [balance]);

  return (
    <div className="sanctuary-game-page" style={{ position: "fixed", inset: 0, zIndex: 100, background: "#002c17" }}>
      <div ref={containerRef} id="sanctuary-game-root" style={{ width: "100%", height: "100%", position: "relative" }} />
    </div>
  );
}

