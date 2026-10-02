import React from 'react';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@0.462.0/icons';

// Solid variants for glyphs whose outline reads as "empty" (rating stars).
const FILLED = {
  star: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black' stroke='black' stroke-width='2' stroke-linejoin='round'%3E%3Cpolygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'/%3E%3C/svg%3E")`,
};

/**
 * Lucide glyph rendered as a CSS mask so it always paints in currentColor.
 * name is the kebab-case Lucide id: "truck", "map-pin", "wallet", "chevron-down".
 * `filled` paints the solid variant where one exists (currently "star").
 */
export function Icon({ name, size = 18, color = 'currentColor', filled = false, style, title, ...rest }) {
  const url = (filled && FILLED[name]) || `url("${CDN}/${name}.svg")`;
  return (
    <span
      role="img"
      aria-label={title || name}
      {...rest}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        flex: '0 0 auto',
        backgroundColor: color,
        WebkitMask: url + ' center / contain no-repeat',
        mask: url + ' center / contain no-repeat',
        ...style,
      }}
    />
  );
}
