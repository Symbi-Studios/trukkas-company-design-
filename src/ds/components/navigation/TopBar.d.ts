import * as React from 'react';
/**
 * @startingPoint section="Navigation" subtitle="Console top bar" viewport="700x90"
 */
export interface TopBarSearchItem {
  key: string;
  label: string;
  meta?: string;
  /** short status shown at the row's right edge */
  tag?: string;
  icon?: string;
  [extra: string]: unknown;
}
export interface TopBarProps {
  onMenu?: () => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** grouped hits shown in a dropdown under the search while it has text */
  searchResults?: Array<{ section: string; total: number; items: TopBarSearchItem[] }>;
  onSearchSelect?: (item: TopBarSearchItem) => void;
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
