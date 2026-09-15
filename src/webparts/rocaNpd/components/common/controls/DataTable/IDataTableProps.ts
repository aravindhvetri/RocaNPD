import * as React from "react";

export interface IDataTableColumn<T> {
  field: keyof T & string;
  header: string;
  sortable?: boolean;
  body?: (row: T) => React.ReactNode;
  style?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
}

export interface IDataTableProps<T extends Record<string, unknown>> {
  value: T[];
  columns: IDataTableColumn<T>[];
  loading?: boolean;
  emptyMessage?: string;
  paginator?: boolean;
  rows?: number;
  rowsPerPageOptions?: number[];
  dataKey?: string;
  className?: string;
  header?: React.ReactNode;
  globalFilter?: string;
  globalFilterFields?: string[];
  paginatorPosition?: "top" | "bottom" | "both";
  paginatorTemplate?: string;
  currentPageReportTemplate?: string;
}
