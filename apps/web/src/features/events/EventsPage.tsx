import { Icon, type IconName } from "../../components/Icon";
import { useCopy } from "../../shared/context";
import { habitImages } from "../../shared/types";

function renderHashtags(text: string) {
  const parts = text.split(/(#unplasticaAPU|#unplastica|@ our official social media|@ media sosial rasmi kami|@ 我们的官方社交账号)/gi);
  return parts.map((part, idx) => {
    if (part.startsWith("#") || part.startsWith("@")) {
      return <strong key={idx}>{part}</strong>;
    }
    return part;
  });
}

export function EventsPage({
  activeTab,
  onSelectTab,
  onSample,
}: {
  activeTab: "challenge" | "done" | null;
  onSelectTab: (tab: "challenge" | "done" | null) => void;
  onSample: () => void;
}) {
  const t = useCopy();

  const milestones = [
    { title: t("events.items"), detail: t("events.itemsDetail"), image: habitImages.box_cutlery },
    { title: t("events.campus"), detail: t("events.campusDetail"), image: habitImages.recycle_bags },
    { title: t("events.pioneer"), detail: t("events.pioneerDetail"), image: "/assets/events/apu-mark.png" },
  ];

  return (
    <div className="content events-content">
      {/* Horizontal Rectangle Event Cards Overview: only shown before clicking */}
      {!activeTab && (
        <section className="events-columns-selector" id="events-heading">
          <button
            className="event-column-card"
            id="challenge-card"
            onClick={() => onSelectTab("challenge")}
          >
            <div className="event-column-bg" style={{ backgroundImage: "url(/assets/events/noplastic-challenge.png)" }} />
            <div className="event-column-overlay" />
            <div className="event-column-content">
              <h3>{t("events.columnChallenge")}</h3>
            </div>
            <span className="event-card-arrow"><Icon name="arrow" size={20} /></span>
          </button>

          <button
            className="event-column-card"
            onClick={() => onSelectTab("done")}
          >
            <div className="event-column-bg apu-logo-bg" style={{ backgroundImage: "url(/assets/events/apu-mark.png)" }} />
            <div className="event-column-overlay" />
            <div className="event-column-content">
              <h3>{t("events.columnDone")}</h3>
            </div>
            <span className="event-card-arrow"><Icon name="arrow" size={20} /></span>
          </button>
        </section>
      )}

      {/* Column 1 Content: No-plastic Challenge */}
      {activeTab === "challenge" && (
        <div className="event-column-view challenge-view">
          <section className="event-intro">
            <h1>{t("events.headline")}</h1>
            <article className="campus-feature">
              <div className="campus-feature-main">
                <img className="campus-feature-logo" src="/assets/events/apu-mark.png" alt="APU logo" />
                <div className="campus-feature-info">
                  <h2>{t("events.campusName")}</h2>
                  <p>{t("events.campusFullName")}</p>
                </div>
              </div>
              <div className="deadline-badge">
                <strong>{t("events.deadline")}</strong>
              </div>
            </article>
          </section>

          <div className="challenge-columns-wrapper">
            <section className="prizes">
              <div className="section-heading"><h2>{t("events.prizes")}</h2></div>
              <article className="champion-prize">
                <span className="prize-icon"><Icon name="trophy" /></span>
                <strong>{t("events.champion")}</strong>
                <b>{t("events.prizeChampion")}</b>
              </article>
              <div className="runner-up-prizes">
                <article>
                  <span><Icon name="medal" size={18} /> {t("events.runner")}</span>
                  <b>{t("events.prizeSecond")}</b>
                </article>
                <article>
                  <span><Icon name="medal" size={18} /> {t("events.tiers")}</span>
                  <b>{t("events.prizeThird")}</b>
                </article>
              </div>
            </section>

            <div className="challenge-divider" aria-hidden="true" />

            <section className="tournament">
              <h2>{t("events.details")}</h2>
              <div className="action-card">
                <h3>{t("events.action")}</h3>
                <p><Icon name="check" />{t("events.proof")}</p>
                <p><Icon name="check" />{t("events.actionCollab")}</p>
                <div className="social-rule">
                  <strong className="supported-social-media-title">{t("events.socialRule")}</strong>
                </div>
                <img className="social-media-strip" src="/assets/brand/social-media.png" alt="Supported social media" />
                <p className="hashtag-note">
                  {renderHashtags(t("events.tagRule"))}
                </p>
              </div>
            </section>
          </div>

          <section className="criteria">
            <h2>{t("events.judging")}</h2>
            <div className="criteria-grid">
              <Criterion icon="leaf" percent="50%" title={t("events.impact")} detail={t("events.diversion")} />
              <Criterion icon="users" percent="25%" title={t("events.collaboration")} detail={t("events.engagement")} />
              <Criterion icon="like" percent="15%" title={t("events.popularity")} detail={t("events.verification")} />
              <Criterion icon="bulb" percent="10%" title={t("events.creative")} detail={t("events.substitutes")} />
            </div>
          </section>

          <button className="sample-link" onClick={onSample}>
            <span className="play-circle"><Icon name="play" /></span>
            <span><strong>{t("events.sample")}</strong><small>{t("events.inspect")}</small></span>
            <Icon name="arrow" />
          </button>
        </div>
      )}

      {/* Column 2 Content: What we had done in APU? */}
      {activeTab === "done" && (
        <div className="event-column-view done-view">
          <section className="milestones">
            <div className="section-heading"><h2>{t("events.done")}</h2><span>{t("events.milestones")}</span></div>
            <div className="milestone-list">
              {milestones.map((item) => (
                <article className="milestone" key={item.title}>
                  <img src={item.image} alt="" />
                  <div><span>{item.title}</span><strong>{item.detail}</strong></div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Criterion({ icon, percent, title, detail }: { icon: IconName; percent: string; title: string; detail: string }) {
  return <article className="criterion"><div className="criterion-top"><span><Icon name={icon} /></span><b>{percent}</b></div><strong>{title}</strong><small>{detail}</small></article>;
}

export default EventsPage;
