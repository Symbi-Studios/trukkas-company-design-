import * as React from 'react';
export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** kebab-case Lucide glyph id, e.g. "truck", "map-pin", "shield-check" */
  name: string;
  /** px box; 16 inline, 18 default, 20 in buttons and nav */
  size?: number;
  /** defaults to currentColor */
  color?: string;
  /** paint the solid variant where one exists (currently "star") */
  filled?: boolean;
  title?: string;
}
export declare function Icon(props: IconProps): JSX.Element;
