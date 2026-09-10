import * as React from "react";

export interface IDataTableColumn<T> {
  field: keyof T & string;
  header: string;
  sortable?: boolean;
  body?: (row: T) => React.ReactNode;
  style?: React.CSSProperties;
}

export interface IDataTableProps<T extends Record<string, unknown>> {
  value: T[];
  columns: IDataTableColumn<T>[];
  loading?: boolean;
  emptyMessage?: string;
  paginator?: boolean;
  rows?: number;
  dataKey?: string;
  className?: string;
}
