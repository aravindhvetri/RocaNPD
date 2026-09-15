import * as React from "react";
import { DataTable as PrimeDataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import type { IDataTableProps } from "./IDataTableProps";
import styles from "./DataTable.module.scss";

function DataTable<T extends Record<string, unknown>>({
  value,
  columns,
  loading = false,
  emptyMessage = "No records found.",
  paginator = true,
  rows = 15,
  rowsPerPageOptions = [15, 25, 50],
  dataKey = "id",
  className,
  header,
  globalFilter,
  globalFilterFields,
  paginatorPosition = "bottom",
  paginatorTemplate = "FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport",
  currentPageReportTemplate = "Showing {first} to {last} of {totalRecords} entries",
}: IDataTableProps<T>): React.ReactElement {
  const mergedClassName = [styles.dataTable, className].filter(Boolean).join(" ");

  return (
    <PrimeDataTable
      value={value}
      loading={loading}
      emptyMessage={emptyMessage}
      paginator={paginator}
      rows={rows}
      rowsPerPageOptions={rowsPerPageOptions}
      dataKey={dataKey}
      className={mergedClassName}
      header={header}
      globalFilter={globalFilter}
      globalFilterFields={globalFilterFields}
      paginatorPosition={paginatorPosition}
      paginatorTemplate={paginatorTemplate}
      currentPageReportTemplate={currentPageReportTemplate}
      stripedRows
      showGridlines={false}
    >
      {columns.map((col) => (
        <Column
          key={col.field}
          field={col.field}
          header={col.header}
          sortable={col.sortable}
          body={col.body ? (row: T) => col.body!(row) : undefined}
          style={col.style}
          headerStyle={col.headerStyle}
        />
      ))}
    </PrimeDataTable>
  );
}

export default DataTable;
