import * as React from 'react';
export interface SelectOption { value: string; label: string; disabled?: boolean; }
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  label?: React.ReactNode;
  options?: Array<string | SelectOption>;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  placeholder?: string;
  /** colour of a leading status dot, e.g. var(--tk-success) for an Active status select */
  leadingDot?: string;
}
export declare function Select(props: SelectProps): JSX.Element;
