import * as React from 'react';
/**
 * @startingPoint section="Navigation" subtitle="Console top bar" viewport="700x90"
 */
export interface TopBarProps {
  onMenu?: () => void;
  searchPlaceholder?: string;
  /** label beside the green dot; pass null to hide the pill */
  health?: React.ReactNode;
  notifications?: number;
  user?: string;
  role?: string;
  /** optional photo URL for the account avatar; initials are shown when omitted */
  avatarSrc?: string;
  style?: React.CSSProperties;
}
export declare function TopBar(props: TopBarProps): JSX.Element;
