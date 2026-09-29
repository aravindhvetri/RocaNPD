import * as React from "react";
import { FilterService } from "primereact/api";
import { DataTable as PrimeDataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { FieldLabels } from "../../../../../../External/CommonServices/Config";
import { matchesSearchText } from "../../../../../../External/CommonServices/searchTextUtils";
import type { IDataTableProps } from "./IDataTableProps";
import { wrapDataTableCellContent } from "./EmptyDash";
import styles from "./DataTable.module.scss";

/** Override Prime "contains" so list search is space-insensitive + lowercase. */
FilterService.register(
  "contains",
  (value: unknown, filter: unknown): boolean =>
    matchesSearchText(value, filter),
);

function DataTable<T extends Record<string, unknown>>({
  value,
  columns,
  loading = false,
  emptyMessage = FieldLabels.NoRecordsFound,
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
  first,
  onPage,
  rowClassName,
}: IDataTableProps<T>): React.ReactElement {
  const mergedClassName = [styles.dataTable, className].filter(Boolean).join(" ");
  const pageSize = rows > 0 ? rows : 15;
  // Hide pagination until a second page is actually needed.
  const showPaginator = Boolean(paginator) && value.length > pageSize;

  return (
    <PrimeDataTable
      value={value}
      loading={loading}
      emptyMessage={<div className={styles.emptyMessage}>{emptyMessage}</div>}
      paginator={showPaginator}
      rows={pageSize}
      rowsPerPageOptions={rowsPerPageOptions}
      dataKey={dataKey}
      className={mergedClassName}
      header={header}
      globalFilter={globalFilter}
      globalFilterFields={globalFilterFields}
      globalFilterMatchMode="contains"
      paginatorPosition={paginatorPosition}
      paginatorTemplate={paginatorTemplate}
      currentPageReportTemplate={currentPageReportTemplate}
      rowClassName={rowClassName}
      {...(typeof first === "number" ? { first, onPage } : {})}
      stripedRows
      showGridlines={false}
    >
      {columns.map((col, columnIndex) => {
        const isCentered =
          col.alignHeader === "center" ||
          col.headerStyle?.textAlign === "center" ||
          col.style?.textAlign === "center";
        const headerCls = [
          col.headerClassName,
          isCentered ? styles.headerCentered : "",
        ]
          .filter(Boolean)
          .join(" ");
        const bodyCls = [
          col.className,
          isCentered ? styles.cellCentered : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Column
            key={col.columnKey ?? `${String(col.field)}-${columnIndex}`}
            field={col.field}
            header={col.header}
            sortable={col.sortable}
            alignHeader={isCentered ? "center" : col.alignHeader}
            align={isCentered ? "center" : col.align}
            headerClassName={headerCls || undefined}
            className={bodyCls || undefined}
            body={(row: T, options: { rowIndex: number }) => {
              const content = col.body
                ? col.body(row, options.rowIndex)
                : ((row as Record<string, unknown>)[col.field] as React.ReactNode);
              return wrapDataTableCellContent(content);
            }}
            style={col.style}
            headerStyle={col.headerStyle}
          />
        );
      })}
    </PrimeDataTable>
  );
}

export default DataTable;
