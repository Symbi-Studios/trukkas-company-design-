import styles from './DesktopOnlyNotice.module.css';

export function DesktopOnlyNotice() {
  return (
    <main className={styles.notice} role="status" aria-labelledby="desktop-only-title">
      <div className={styles.content}>
        <svg
          className={styles.illustration}
          viewBox="0 0 240 180"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="120" cy="86" r="76" fill="#F1F5FF" />
          <circle cx="43" cy="48" r="5" fill="#F5A623" />
          <circle cx="197" cy="119" r="4" fill="#1FAF83" />
          <rect x="48" y="38" width="144" height="91" rx="10" fill="#fff" stroke="#183B56" strokeWidth="4" />
          <rect x="58" y="48" width="124" height="70" rx="4" fill="#EAF0FF" />
          <rect x="69" y="60" width="43" height="46" rx="5" fill="#fff" />
          <circle cx="90.5" cy="75" r="9" fill="#D5E1FF" />
          <path d="M76 98c2.8-7 8-10 14.5-10S102 91 105 98v3H76v-3Z" fill="#8EA9F5" />
          <rect x="120" y="62" width="48" height="6" rx="3" fill="#A9BCEB" />
          <rect x="120" y="75" width="38" height="5" rx="2.5" fill="#C3CEE8" />
          <rect x="120" y="88" width="44" height="5" rx="2.5" fill="#C3CEE8" />
          <path d="M106 130h28l5 13h-38l5-13Z" fill="#DCE5F2" stroke="#183B56" strokeWidth="3" strokeLinejoin="round" />
          <path d="M91 145h58" stroke="#183B56" strokeWidth="4" strokeLinecap="round" />
          <path d="M196 47v12m-6-6h12" stroke="#1FAF83" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div className={styles.copy}>
          <h1 id="desktop-only-title">Desktop access only</h1>
          <p>You can only use the Trukkas company dashboard on a desktop or laptop screen.</p>
        </div>
      </div>
    </main>
  );
}
