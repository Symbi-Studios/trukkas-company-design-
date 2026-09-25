import { Logo } from "../ds.js";
import styles from "./AppLoadingScreen.module.css";

const LOADING_COPY = {
  startup: {
    title: "Getting your workspace ready",
    description: "Loading your Trukkas company dashboard.",
  },
  session: {
    title: "Checking your session",
    description: "Verifying your access before opening the workspace.",
  },
  logout: {
    title: "Signing you out",
    description: "Closing your session.",
  },
};

export function AppLoadingScreen({ mode = "startup" }) {
  const copy = LOADING_COPY[mode] || LOADING_COPY.startup;

  return (
    <main className={styles.screen} role="status" aria-live="polite">
      <div className={styles.glow} aria-hidden="true" />
      <header className={styles.brand}>
        <Logo size={40} />
      </header>

      <section className={styles.panel} aria-label={copy.title}>
        <div className={styles.loaderVisual} aria-hidden="true">
          <span className={styles.orbit} />
          <span className={styles.orbitAccent} />
          <span className={styles.logoMark}>
            <Logo showWordmark={false} size={34} />
          </span>
        </div>
        <span className={styles.eyebrow}>COMPANY WORKSPACE</span>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.description}>{copy.description}</p>
        <div className={styles.progressTrack} aria-hidden="true">
          <span className={styles.progressBar} />
        </div>
        <span className={styles.loadingLabel}>Please wait</span>
      </section>

      <footer className={styles.footer}>
        <span className={styles.footerDot} aria-hidden="true" />
        Trukkas <span className={styles.footerDivider}>·</span> Move. Earn. Grow.
      </footer>
    </main>
  );
}
