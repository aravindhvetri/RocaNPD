import * as React from "react";
import { Button } from "../../common/controls";
import type { IDataTableColumn } from "../../common/controls/DataTable";
import dataTableStyles from "../../common/controls/DataTable/DataTable.module.scss";
import NpdItemDetailsTableCell from "./NpdItemDetailsTableCell";
import type { INpdItemDetailsFieldDef } from "./npdItemDetailsConfig";
import type {
  INpdItemDetailRow,
  NpdItemDetailFieldKey,
} from "./npdItemDetails.types";
import styles from "./NpdItemDetailsSection.module.scss";

function renderColumnHeader(fieldDef: INpdItemDetailsFieldDef): React.ReactNode {
  return (
    <span className={styles.columnTitle}>
      {fieldDef.header}
      {fieldDef.required ? (
        <span className={styles.requiredMark} aria-hidden="true">
          *
        </span>
      ) : null}
    </span>
  );
}

export interface IUseNpdItemDetailsColumnsParams {
  visibleFields: INpdItemDetailsFieldDef[];
  latestRowId: string | null;
  onFieldChange: (
    rowId: string,
    field: NpdItemDetailFieldKey,
    value: string | string[],
  ) => void;
  onAddLatestRow: () => void;
  onDeleteRow: (rowId: string) => void;
}

export function useNpdItemDetailsColumns({
  visibleFields,
  latestRowId,
  onFieldChange,
  onAddLatestRow,
  onDeleteRow,
}: IUseNpdItemDetailsColumnsParams): IDataTableColumn<INpdItemDetailRow>[] {
  return React.useMemo(() => {
    const fieldColumns: IDataTableColumn<INpdItemDetailRow>[] =
      visibleFields.map((fieldDef) => ({
        field: fieldDef.field,
        header: renderColumnHeader(fieldDef),
        style: { minWidth: fieldDef.minWidth },
        headerStyle: { minWidth: fieldDef.minWidth },
        body: (row) => (
          <NpdItemDetailsTableCell
            id={`${row.id}-${fieldDef.field}`}
            fieldDef={fieldDef}
            row={row}
            onFieldChange={onFieldChange}
          />
        ),
      }));

    return [
      {
        field: "id",
        header: "#",
        style: { width: "3rem", textAlign: "center" },
        headerStyle: { width: "3rem", textAlign: "center" },
        body: (_row, rowIndex) => (
          <span className={styles.rowIndex}>{rowIndex + 1}</span>
        ),
      },
      ...fieldColumns,
      {
        field: "id",
        header: "Actions",
        style: { minWidth: "5.5rem", textAlign: "right" },
        headerStyle: { minWidth: "5.5rem", textAlign: "right" },
        body: (row) => {
          const isLatestRow = row.id === latestRowId;

          return (
            <div className={dataTableStyles.actionCell}>
              {isLatestRow ? (
                <Button
                  variant="text"
                  icon="pi pi-plus"
                  iconOnly
                  size="xs"
                  title="Add item line"
                  aria-label="Add item line"
                  className={styles.addRowAction}
                  onClick={onAddLatestRow}
                />
              ) : (
                <span className={styles.actionPlaceholder} aria-hidden="true" />
              )}
              <Button
                variant="text"
                icon="pi pi-trash"
                iconOnly
                title="Delete row"
                aria-label="Delete row"
                className={dataTableStyles.deleteAction}
                onClick={() => onDeleteRow(row.id)}
              />
            </div>
          );
        },
      },
    ];
  }, [latestRowId, onAddLatestRow, onDeleteRow, onFieldChange, visibleFields]);
}
