import { useEffect, useRef } from "react";
import { Icon } from "../../components/Icon";
import { useCopy } from "../../shared/context";

export function HomePage({ onEnter }: { onEnter: () => void }) {
  const t = useCopy();
  const ringRotorRef = useRef<HTMLSpanElement | null>(null);
  const glowRotorRef = useRef<HTMLSpanElement | null>(null);
  const animsRef = useRef<Animation[]>([]);

  useEffect(() => {
    const elements = [ringRotorRef.current, glowRotorRef.current].filter(
      (el): el is HTMLSpanElement => Boolean(el && typeof el.animate === "function"),
    );
    const created = elements.map((el) =>
      el.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
        { duration: 3200, iterations: Infinity, easing: "linear" },
      ),
    );
    animsRef.current = created;
    return () => {
      for (const anim of created) anim.cancel();
      animsRef.current = [];
    };
  }, []);

  const setRingSpeed = (rate: number) => {
    for (const anim of animsRef.current) {
      try {
        anim.updatePlaybackRate(rate);
      } catch {
        anim.playbackRate = rate;
      }
    }
  };

  return <div className="content home-content">
    <section className="home-hero">
      <video className="hero-video" autoPlay muted loop playsInline aria-label="Polluted river with plastic waste">
        <source src="/assets/home/polluted-river.mp4" type="video/mp4" />
      </video>
      <div className="hero-tint" />
      <h1>{t("home.title1")}<br /><span>{t("home.title2")}</span></h1>
    </section>
    <section className="sanctuary" id="sanctuary-section">
      <h2>{t("home.sanctuary")}</h2>
      <button
        className="sanctuary-enter-button"
        onClick={onEnter}
        onPointerEnter={() => setRingSpeed(3.4)}
        onPointerLeave={() => setRingSpeed(1)}
        onFocus={() => setRingSpeed(3.4)}
        onBlur={() => setRingSpeed(1)}
      >
        <span className="sanctuary-enter-glow" aria-hidden="true">
          <span ref={glowRotorRef} className="sanctuary-enter-rotor" />
        </span>
        <span className="sanctuary-enter-ring" aria-hidden="true">
          <span ref={ringRotorRef} className="sanctuary-enter-rotor" />
        </span>
        <span className="sanctuary-enter-fill" aria-hidden="true" />
        <span className="sanctuary-enter-content">
          <span>{t("home.enter")}</span>
          <Icon name="arrow" size={20} />
        </span>
      </button>
      <p className="speech-card">{t("home.speech")}</p>
    </section>
  </div>;
}

export default HomePage;
