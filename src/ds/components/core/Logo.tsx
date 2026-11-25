import React from "react";
import trukkasIcon from "../../assets/icons/trukkas-icon.png";

/** Trukkas mark + wordmark. */
export function Logo({
  showWordmark = true,
  size = 38,
  onDark = false,
  style,
}: LogoProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, ...style }}>
      <img
        src={trukkasIcon.src || (trukkasIcon as unknown as string)}
        alt="Trukkas"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          flex: "0 0 auto",
        }}
      />
      {showWordmark && (
        <div style={{ lineHeight: 1.1 }}>
          <div
            style={{
              font: "700 20px/24px var(--tk-font-sans)",
              letterSpacing: "-0.3px",
              color: onDark ? "#fff" : "var(--tk-ink-900)",
            }}
          >
            Trukkas
          </div>
          <div
            style={{
              font: "400 12px/16px var(--tk-font-sans)",
              color: onDark ? "var(--tk-ink-on-navy-dim)" : "var(--tk-ink-400)",
            }}
          >
            Move. Earn. Grow.
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * @startingPoint section="Brand" subtitle="Trukkas mark and lockup" viewport="700x120"
 */
export interface LogoProps {
  showWordmark?: boolean;
  /** tile edge in px, default 38 */
  size?: number;
  /** flips the wordmark to white — for the navy wallet card, not the sidebar */
  onDark?: boolean;
  style?: React.CSSProperties;
}
