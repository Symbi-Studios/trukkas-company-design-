import * as React from 'react';

/** Custom calendar. Values and real input change events use YYYY-MM-DD. */
export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Month selection uses YYYY-MM values. */
  mode?: 'date' | 'month';
  variant?: 'field' | 'filter';
  allowedMonths?: string[];
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  icon?: string;
  suffix?: React.ReactNode;
}
export declare function DatePicker(props: DatePickerProps): JSX.Element;
