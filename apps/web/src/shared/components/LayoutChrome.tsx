import { type ReactNode, useEffect } from "react";
import { Icon, type IconName } from "../../components/Icon";
import { formatPoints } from "../../lib/format";
import { useCopy } from "../context";
import type { Page } from "../types";

export function Header({
  page,
  eventSubpage,
  onEventBack,
  balance,
  scrolled,
  avatarUrl,
  onProfile,
  onHome,
}: {
  page: Page;
  eventSubpage?: "challenge" | "done" | null;
  onEventBack?: () => void;
  balance: number;
  scrolled: boolean;
  avatarUrl: string | null;
  onProfile: () => void;
  onHome: () => void;
}) {
  const t = useCopy();
  return (
    <header className={"topbar topbar-" + page}>
      <div className="topbar-inner">
        {page === "settings" ? <>
          <button className="header-back" onClick={onHome} aria-label={t("common.back")}><Icon name="back" /></button>
          <h1 className="settings-header-title">{t("settings.profile")}</h1>
          <span className="header-spacer" />
        </> : <>
          {page === "events" && eventSubpage ? (
            <button className="header-back" onClick={onEventBack} aria-label={t("common.back")}>
              <Icon name="back" />
            </button>
          ) : (
            <button className={"brand-button " + (scrolled ? "is-scrolled" : "")} onClick={onHome} aria-label={t("nav.home")}>
              <BrandLogo scrolled={scrolled} />
            </button>
          )}
          {page !== "login" && <div className="balance-pill"><img src="/assets/brand/greenbits.png" alt="" /><strong>{formatPoints(balance)}</strong></div>}
          {page !== "login" && <button className="avatar-button" onClick={onProfile} aria-label={t("common.profile")}>{avatarUrl ? <img className="header-avatar-photo" src={avatarUrl} alt="" /> : <Icon name="user" />}</button>}
        </>}
      </div>
    </header>
  );
}

export function BrandWordmark({ className = "", width = "220px" }: { className?: string; width?: string }) {
  return (
    <div className={"brand-wordmark-wrapper " + className} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img className="brand-image-light" src="/assets/brand/brand-wordmark-light.png?v=0.6.0" alt="Unplastica" style={{ width, height: "auto", maxWidth: "75vw", objectFit: "contain", background: "transparent" }} />
      <img className="brand-image-dark" src="/assets/brand/brand-wordmark-dark.png?v=0.6.0" alt="Unplastica" style={{ width, height: "auto", maxWidth: "75vw", objectFit: "contain", background: "transparent" }} />
    </div>
  );
}

export function BrandLogo({ scrolled = false }: { scrolled?: boolean } = {}) {
  return (
    <span className={"brand-crop " + (scrolled ? "wordmark-visible" : "mark-visible")} aria-hidden="true">
      <img className="brand-mark brand-image-light" src="/assets/brand/brand-mark-light.png?v=0.6.0" alt="Unplastica" />
      <img className="brand-mark brand-image-dark" src="/assets/brand/brand-mark-dark.png?v=0.6.0" alt="Unplastica" />
      <img className="brand-wordmark brand-image-light" src="/assets/brand/brand-wordmark-light.png?v=0.6.0" alt="Unplastica" />
      <img className="brand-wordmark brand-image-dark" src="/assets/brand/brand-wordmark-dark.png?v=0.6.0" alt="Unplastica" />
    </span>
  );
}

export function BottomNav({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  const t = useCopy();
  const items: Array<{ page: Page; title: string; icon: IconName }> = [
    { page: "home", title: t("nav.home"), icon: "home" },
    { page: "earn", title: t("nav.earn"), icon: "earn" },
    { page: "events", title: t("nav.events"), icon: "events" },
  ];
  return <nav className="bottom-nav" aria-label={t("nav.mainNav")}>
    {items.map((item) => <button key={item.page} className={"nav-tab " + (page === item.page ? "active" : "")} onClick={() => onNavigate(item.page)} aria-current={page === item.page ? "page" : undefined}>
      {item.page === "earn" ? (
        <img src="/assets/brand/greenbits.png" alt="" className="nav-earn-icon" style={{ width: 23, height: 23, objectFit: "contain", display: "block", background: "transparent" }} />
      ) : (
        <Icon name={item.icon} size={23} />
      )}
      <span>{item.title}</span>
    </button>)}
  </nav>;
}

export function GreenbitLogo({ size = 16 }: { size?: number }) {
  return (
    <img
      src="/assets/brand/greenbits.png"
      alt=""
      className="inline-greenbit-logo"
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        verticalAlign: "-3px",
        margin: "0 3px",
        display: "inline-block",
        background: "transparent",
      }}
    />
  );
}


export function Modal({ children, onClose, labelledBy }: { children: ReactNode; onClose: () => void; labelledBy: string }) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handle);
    document.body.classList.add("modal-open");
    return () => { document.removeEventListener("keydown", handle); document.body.classList.remove("modal-open"); };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby={labelledBy}>{children}</div>
  </div>;
}

