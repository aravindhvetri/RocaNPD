import * as React from "react";
import type { ISelectOption } from "../../../../../External/CommonServices/Interface";
import { getLookupOptionsByFieldName } from "../../../../../External/CommonServices/lookupOptionUtils";
import type { IDataTableColumn } from "../../common/controls/DataTable";
import { Tag } from "../../common/controls";
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
    <span className={styles.columnTitle} title={fieldDef.header}>
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
  /** Same visibility as Other Details. Display-only; not an editable field. */
  showSapStatus?: boolean;
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
  showSapStatus = false,
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
          ...(fieldDef.field === "materialGroup"
            ? [
                "Material Group",
                "Material / Business Group",
                "Material / Business group",
              ]
            : []),
        );
      }
    });

    const fieldColumns: IDataTableColumn<INpdItemDetailRow>[] =
      visibleFields.map((fieldDef) => {
        // Lock column width so long MultiSelect / text values ellipsis
        // instead of expanding the cell.
        const columnWidth = {
          minWidth: fieldDef.minWidth,
          width: fieldDef.minWidth,
          maxWidth: fieldDef.minWidth,
        };
        return {
          field: fieldDef.field,
          header: renderColumnHeader(fieldDef),
          style: columnWidth,
          headerStyle: columnWidth,
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
        };
      });

    const serialColumn: IDataTableColumn<INpdItemDetailRow> = {
      field: "id",
      header: "S.No",
      style: {
        width: "3.25rem",
        minWidth: "3.25rem",
        maxWidth: "3.25rem",
        textAlign: CENTER_ALIGN,
      },
      headerStyle: {
        width: "3.25rem",
        minWidth: "3.25rem",
        maxWidth: "3.25rem",
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
      style: {
        width: "5rem",
        minWidth: "5rem",
        maxWidth: "5rem",
        textAlign: CENTER_ALIGN,
      },
      headerStyle: {
        width: "5rem",
        minWidth: "5rem",
        maxWidth: "5rem",
        textAlign: CENTER_ALIGN,
      },
      body: (row) => <NpdItemDetailsActionCell rowId={row.id} />,
    };

    const sapStatusWidth = {
      width: "8.75rem",
      minWidth: "8.75rem",
      maxWidth: "8.75rem",
    };
    const sapStatusColumn: IDataTableColumn<INpdItemDetailRow> = {
      field: "sapPosted",
      header: <span className={styles.columnTitle}>SAP Status</span>,
      style: sapStatusWidth,
      headerStyle: sapStatusWidth,
      body: (row) =>
        row.sapPosted === true ? (
          <Tag
            value="Posted"
            icon="pi pi-check-circle"
            className={styles.statusApproved}
          />
        ) : (
          <Tag
            value="Pending"
            icon="pi pi-clock"
            className={styles.statusPending}
          />
        ),
    };

    const columns: IDataTableColumn<INpdItemDetailRow>[] = [
      serialColumn,
      ...fieldColumns,
    ];
    if (showSapStatus) {
      columns.push(sapStatusColumn);
    }
    if (!readOnly) {
      columns.push(actionColumn);
    }

    return columns;
  }, [
    allowDeleteRows,
    lookupOptionsByType,
    onFieldChange,
    readOnly,
    showSapStatus,
    visibleFields,
  ]);
}
