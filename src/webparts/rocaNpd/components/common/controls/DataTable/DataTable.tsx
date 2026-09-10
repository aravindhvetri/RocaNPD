import * as React from "react";
import { DataTable as PrimeDataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import type { IDataTableProps } from "./IDataTableProps";

function DataTable<T extends Record<string, unknown>>({
  value,
  columns,
  loading = false,
  emptyMessage = "No records found.",
  paginator = true,
  rows = 15,
  dataKey = "id",
  className,
}: IDataTableProps<T>): React.ReactElement {
  return (
    <PrimeDataTable
      value={value}
      loading={loading}
      emptyMessage={emptyMessage}
      paginator={paginator}
      rows={rows}
      dataKey={dataKey}
      className={className}
      stripedRows
      showGridlines
    >
      {columns.map((col) => (
        <Column
          key={col.field}
          field={col.field}
          header={col.header}
          sortable={col.sortable}
          body={col.body ? (row: T) => col.body!(row) : undefined}
          style={col.style}
        />
      ))}
    </PrimeDataTable>
  );
}

export default DataTable;
