import * as React from 'react';
export interface ChoiceCardProps {
  selected?: boolean;
  icon?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  onSelect?: () => void;
  style?: React.CSSProperties;
  disabled?: boolean;
}
export declare function ChoiceCard(props: ChoiceCardProps): JSX.Element;
