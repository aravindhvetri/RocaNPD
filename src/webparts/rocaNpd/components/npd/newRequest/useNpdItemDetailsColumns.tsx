import * as React from "react";
import type { ISelectOption } from "../../../../../External/CommonServices/Interface";
import { getLookupOptionsByFieldName } from "../../../../../External/CommonServices/lookupOptionUtils";
import { Button } from "../../common/controls";
import type { IDataTableColumn } from "../../common/controls/DataTable";
import NpdItemDetailsTableCell from "./NpdItemDetailsTableCell";
import type { INpdItemDetailsFieldDef } from "./npdItemDetailsConfig";
import type {
  INpdItemDetailRow,
  NpdItemDetailFieldKey,
  NpdItemDetailFieldValue,
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
  first?: number;
  lookupOptionsByType: Record<string, ISelectOption[]>;
  readOnly?: boolean;
  onFieldChange: (
    rowId: string,
    field: NpdItemDetailFieldKey,
    value: NpdItemDetailFieldValue,
  ) => void;
  onAddLatestRow: () => void;
  onDeleteRow: (rowId: string) => void;
}

const CENTER_ALIGN: React.CSSProperties["textAlign"] = "center";
const EMPTY_LOOKUP_OPTIONS: ISelectOption[] = [];

export function useNpdItemDetailsColumns({
  visibleFields,
  latestRowId,
  first = 0,
  lookupOptionsByType,
  onFieldChange,
  onAddLatestRow,
  onDeleteRow,
  readOnly = false,
}: IUseNpdItemDetailsColumnsParams): IDataTableColumn<INpdItemDetailRow>[] {
  return React.useMemo(() => {
    const optionsByField: Partial<Record<NpdItemDetailFieldKey, ISelectOption[]>> =
      {};
    visibleFields.forEach((fieldDef) => {
      if (fieldDef.controlType === "multiselect") {
        optionsByField[fieldDef.field] = getLookupOptionsByFieldName(
          lookupOptionsByType,
          fieldDef.header,
          fieldDef.field,
        );
      }
    });

    const fieldColumns: IDataTableColumn<INpdItemDetailRow>[] =
      visibleFields.map((fieldDef) => ({
        field: fieldDef.field,
        header: renderColumnHeader(fieldDef),
        style: { minWidth: fieldDef.minWidth, width: fieldDef.minWidth },
        headerStyle: { minWidth: fieldDef.minWidth, width: fieldDef.minWidth },
        body: (row) => (
          <NpdItemDetailsTableCell
            id={`${row.id}-${fieldDef.field}`}
            fieldDef={fieldDef}
            row={row}
            lookupOptions={optionsByField[fieldDef.field] ?? EMPTY_LOOKUP_OPTIONS}
            onFieldChange={onFieldChange}
            readOnly={readOnly}
          />
        ),
      }));

    const serialColumn: IDataTableColumn<INpdItemDetailRow> = {
      field: "id",
      header: "S.No",
      style: { width: "3.25rem", minWidth: "3.25rem", textAlign: CENTER_ALIGN },
      headerStyle: {
        width: "3.25rem",
        minWidth: "3.25rem",
        textAlign: CENTER_ALIGN,
      },
      body: (_row, rowIndex) => (
        <span className={styles.rowIndex}>{first + rowIndex + 1}</span>
      ),
    };

    const actionColumn: IDataTableColumn<INpdItemDetailRow> = {
      field: "id",
      header: "Actions",
      style: { width: "4.5rem", minWidth: "4.5rem", textAlign: CENTER_ALIGN },
      headerStyle: {
        width: "4.5rem",
        minWidth: "4.5rem",
        textAlign: CENTER_ALIGN,
      },
      body: (row) => {
        const isLatestRow = row.id === latestRowId;

        return (
          <div className={styles.actionCell}>
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
              size="xs"
              title="Delete row"
              aria-label="Delete row"
              className={styles.deleteRowAction}
              onClick={() => onDeleteRow(row.id)}
            />
          </div>
        );
      },
    };

    const columns: IDataTableColumn<INpdItemDetailRow>[] = [
      serialColumn,
      ...fieldColumns,
    ];
    if (!readOnly) {
      columns.push(actionColumn);
    }

    return columns;
  }, [
    latestRowId,
    first,
    lookupOptionsByType,
    onAddLatestRow,
    onDeleteRow,
    onFieldChange,
    readOnly,
    visibleFields,
  ]);
}
