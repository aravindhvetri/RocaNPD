import * as React from "react";
import type { ISelectOption } from "../../../../../External/CommonServices/Interface";
import { getLookupOptionsByFieldName } from "../../../../../External/CommonServices/lookupOptionUtils";
import type { IDataTableColumn } from "../../common/controls/DataTable";
import NpdItemDetailsActionCell from "./NpdItemDetailsActionCell";
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
  allowDeleteRows: boolean;
  lookupOptionsByType: Record<string, ISelectOption[]>;
  readOnly?: boolean;
  onFieldChange: (
    rowId: string,
    field: NpdItemDetailFieldKey,
    value: NpdItemDetailFieldValue,
  ) => void;
}

const CENTER_ALIGN: React.CSSProperties["textAlign"] = "center";
const EMPTY_LOOKUP_OPTIONS: ISelectOption[] = [];

export function useNpdItemDetailsColumns({
  visibleFields,
  allowDeleteRows,
  lookupOptionsByType,
  onFieldChange,
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
        // PrimeReact rowIndex is absolute across the full value array (not page-local).
        <span className={styles.rowIndex}>{rowIndex + 1}</span>
      ),
    };

    // Remount Actions when 1 ↔ 2+ rows so Delete appears/hides immediately
    // (PrimeReact otherwise keeps stale cells until an unrelated row edit).
    const actionColumn: IDataTableColumn<INpdItemDetailRow> = {
      field: "actions",
      columnKey: `npd-item-actions-${allowDeleteRows ? "multi" : "single"}`,
      header: "Actions",
      style: { width: "5rem", minWidth: "5rem", textAlign: CENTER_ALIGN },
      headerStyle: {
        width: "5rem",
        minWidth: "5rem",
        textAlign: CENTER_ALIGN,
      },
      body: (row) => <NpdItemDetailsActionCell rowId={row.id} />,
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
    allowDeleteRows,
    lookupOptionsByType,
    onFieldChange,
    readOnly,
    visibleFields,
  ]);
}
