import { HABITS, type HabitCode } from "@unplastica/shared";
import { Icon } from "../../components/Icon";
import { GreenbitLogo } from "../../shared/components/LayoutChrome";
import { useCopy } from "../../shared/context";
import { habitImages } from "../../shared/types";

export function EarnPage({ selected, dailyUsage, boxCutleryCooldownMs, onSelect, onInfo, onCamera }: {
  selected: HabitCode | null;
  dailyUsage: Record<string, number>;
  boxCutleryCooldownMs: number;
  onSelect: (code: HabitCode) => void;
  onInfo: (code: HabitCode) => void;
  onCamera: () => void;
}) {
  const t = useCopy();
  const habit = HABITS.find((item) => item.code === selected);
  const selectedLimit = selected === "box_cutlery" ? 3 : 1;
  const selectedUsed = (selected && dailyUsage[selected]) || 0;
  const isSelectedCapped = selectedUsed >= selectedLimit;
  const isBoxCooldown = selected === "box_cutlery" && boxCutleryCooldownMs > 0;
  const isBlocked = isSelectedCapped || isBoxCooldown;

  return <div className="content earn-content">
    <section className="earn-heading" id="earn-heading"><h1><span>{t("earn.titleStart")}</span><img src="/assets/brand/greenbits.png" alt="" style={{ background: "transparent" }} /><span>{t("earn.titleEnd")}</span></h1><p>{t("earn.subtitle")}</p></section>
    <section className="camera-section">
      <div className="section-heading"><h2>{t("earn.checker")}</h2></div>
      <button className={"camera-frame " + (isBlocked ? "is-capped" : "")} onClick={onCamera}>
        <i className="frame-corner corner-top-left" /><i className="frame-corner corner-top-right" />
        <i className="frame-corner corner-bottom-left" /><i className="frame-corner corner-bottom-right" />
        <span className="camera-helper"><img src="/assets/brand/greenbits.png" alt="" style={{ width: 28, height: 28, objectFit: "contain", background: "transparent" }} /></span>
        <span className="camera-copy">
          <strong>{habit ? t("habit." + habit.code) : t("camera.title")}</strong>
          <span>
            {isBoxCooldown
              ? t("earn.cooldownActive", { h: Math.floor(boxCutleryCooldownMs / 3600000), m: Math.ceil((boxCutleryCooldownMs % 3600000) / 60000) })
              : isSelectedCapped
              ? t("earn.dailyLimitReachedToday")
              : habit
              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{t("earn.reward", { points: habit.points })}<GreenbitLogo size={16} /></span>
              : t("earn.hold")}
          </span>
        </span>
        <span className="camera-action"><Icon name="camera" size={25} /></span>
      </button>
    </section>
    <section className="habit-section">
      <div className="section-heading"><h2>{t("earn.habits")}</h2></div>
      <div className="habit-list" id="habit-list">{HABITS.map((item) => {
        const limit = item.code === "box_cutlery" ? 3 : 1;
        const used = dailyUsage[item.code] || 0;
        const capped = used >= limit;
        const isCooldown = item.code === "box_cutlery" && boxCutleryCooldownMs > 0;
        return (
          <article key={item.code} className={"habit-row " + (selected === item.code ? "selected" : "") + (capped || isCooldown ? " is-capped" : "")}>
            <button className="habit-select" onClick={() => onSelect(item.code)} aria-pressed={selected === item.code}>
              <img src={habitImages[item.code]} alt="" />
              <span className="habit-labels">
                <strong>{t("habit." + item.code)}</strong>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <b style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}><img className="habit-points-icon" src="/assets/brand/greenbits.png" alt="" style={{ width: 16, height: 16, objectFit: "contain", background: "transparent" }} />+{item.points}</b>
                  <span className={"daily-quota-pill" + (capped || isCooldown ? " capped" : "")}>
                    {isCooldown ? t("earn.dailyQuotaCooldown", { h: Math.floor(boxCutleryCooldownMs / 3600000), m: Math.ceil((boxCutleryCooldownMs % 3600000) / 60000) }) : capped ? t("earn.dailyQuotaCapped") : t("earn.dailyQuotaToday", { used, limit })}
                  </span>
                </span>
              </span>
            </button>
            <button className="info-button" aria-label={t("common.about", { habit: t("habit." + item.code) })} onClick={() => onInfo(item.code)}><Icon name="info" /></button>
          </article>
        );
      })}</div>
    </section>
  </div>;
}

export default EarnPage;
