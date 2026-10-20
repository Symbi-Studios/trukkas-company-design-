import * as React from 'react';
export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}
export declare function Skeleton(props: SkeletonProps): JSX.Element;
export interface SkeletonRowProps {
  columns?: number;
  rows?: number;
  action?: boolean;
  variant?: 'table' | 'form' | 'preferences' | 'bank' | 'list' | 'security' | 'roles' | 'chart' | 'detail' | 'review';
  style?: React.CSSProperties;
}
export declare function SkeletonRow(props: SkeletonRowProps): JSX.Element;
