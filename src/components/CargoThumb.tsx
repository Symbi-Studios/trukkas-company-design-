import { Icon } from '../ds';

// No cargo photography ships with the prototype, so jobs and trips show a
// tinted category tile. Swap for real uploads when the API provides them.
const CATEGORY: Record<string, [string, string, string]> = {
  Container: ['var(--tk-blue-soft)', 'var(--tk-blue)', 'container'],
  'Break-bulk': ['var(--tk-orange-soft)', 'var(--tk-orange-ink)', 'layers'],
  'General Cargo': ['var(--tk-teal-soft)', 'var(--tk-teal)', 'package'],
  'Return Trip': ['var(--tk-purple-soft)', 'var(--tk-purple)', 'repeat'],
};

export function CargoThumb({ category, width = 88, height = 64, radius = 'var(--tk-r-md)', iconSize, children, style }: { category: string; width?: number | string; height?: number | string; radius?: number | string; iconSize?: number; children?: React.ReactNode; style?: React.CSSProperties }) {
  const [bg, fg, icon] = CATEGORY[category] || CATEGORY['General Cargo'];
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'relative', width, height, flex: '0 0 auto', display: 'grid', placeItems: 'center',
        borderRadius: radius, background: bg, color: fg, overflow: 'hidden', ...style,
      }}
    >
      <Icon name={icon} size={iconSize || Math.round(Math.min(Number(width) || 64, Number(height) || 64) * 0.42)} />
      {children}
    </span>
  );
}
