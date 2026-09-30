import React, { useEffect, useRef, useState } from "react";

const TICKS = 4;

// Round the axis max up so every tick lands on a clean value (0, 0.6M, 1.2M…).
function niceMax(value) {
  const step = value / TICKS;
  const mag = 10 ** Math.floor(Math.log10(step));
  const nice = [1, 2, 2.5, 3, 4, 5, 6, 8, 10].find((n) => n * mag >= step);
  return nice * mag * TICKS;
}

/** Grouped vertical bars. series = [{ name, color, points:number[] }] */
export function BarChart({
  series = [],
  labels = [],
  height = 200,
  format = (v) => v,
  legend = false,
  style,
}) {
  const ref = useRef(null);
  const [measured, setMeasured] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([entry]) => setMeasured(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Draw at the real pixel width so bars fill the card and text isn't scaled.
  const W = measured || 640,
    H = height,
    padL = 48,
    padB = 24,
    padT = 10;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.points)));
  const groups = labels.length || series[0]?.points.length || 1;
  const gw = (W - padL - 8) / groups;
  const bw = Math.min(22, (gw - 12) / series.length);
  const y = (v) => padT + (1 - v / max) * (H - padT - padB);
  const colorOf = (s, si) => s.color || "var(--tk-viz-" + ((si % 6) + 1) + ")";
  const chart = (
    <svg ref={ref} viewBox={"0 0 " + W + " " + H} width="100%" height={H} style={legend ? undefined : style}>
      {Array.from({ length: TICKS + 1 }, (_, i) => (max / TICKS) * i).map((v, i) => (
        <g key={i}>
          <line x1={padL} x2={W - 8} y1={y(v)} y2={y(v)} stroke="var(--tk-line)" />
          <text
            x={padL - 8}
            y={y(v) + 4}
            textAnchor="end"
            style={{ font: "400 10px var(--tk-font-sans)", fill: "var(--tk-ink-300)" }}
          >
            {format(v)}
          </text>
        </g>
      ))}
      {series.map((s, si) =>
        s.points.map((p, i) => (
          <rect
            key={si + "-" + i}
            x={padL + i * gw + gw / 2 - (series.length * bw) / 2 + si * bw}
            y={y(p)}
            width={bw - 2}
            height={Math.max(0, y(0) - y(p))}
            rx="3"
            fill={colorOf(s, si)}
          >
            {s.name && <title>{s.name + " · " + (labels[i] ?? "") + ": " + format(p)}</title>}
          </rect>
        )),
      )}
      {labels.map((l, i) => (
        <text
          key={l + i}
          x={padL + i * gw + gw / 2}
          y={H - 6}
          textAnchor="middle"
          style={{ font: "400 10px var(--tk-font-sans)", fill: "var(--tk-ink-400)" }}
        >
          {l}
        </text>
      ))}
    </svg>
  );
  if (!legend) return chart;
  return (
    <div style={style}>
      <div style={{ display: "flex", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
        {series.map((s, si) => (
          <span key={s.name || si} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "500 12px/16px var(--tk-font-sans)", color: "var(--tk-ink-500)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: colorOf(s, si) }} />
            {s.name}
          </span>
        ))}
      </div>
      {chart}
    </div>
  );
}
