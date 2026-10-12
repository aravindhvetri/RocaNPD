import * as React from "react";
import type { ISelectOption } from "../../../../../External/CommonServices/Interface";
import {
  sanitizeAlphanumericTextInput,
  sanitizeDigitsOnlyTextInput,
} from "../../../../../External/CommonServices/textInputSanitize";
import { InputNumber, InputText, MultiSelect } from "../../common/controls";
import type { INpdItemDetailsFieldDef } from "./npdItemDetailsConfig";
import type {
  INpdItemDetailRow,
  NpdItemDetailFieldKey,
  NpdItemDetailFieldValue,
} from "./npdItemDetails.types";
import styles from "./NpdItemDetailsSection.module.scss";

export interface INpdItemDetailsTableCellProps {
  id: string;
  fieldDef: INpdItemDetailsFieldDef;
  row: INpdItemDetailRow;
  lookupOptions: ISelectOption[];
  readOnly?: boolean;
  onFieldChange: (
    rowId: string,
    field: NpdItemDetailFieldKey,
    value: NpdItemDetailFieldValue,
  ) => void;
}

function toNumberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sanitizeTextFieldValue(
  value: string,
  textFilter: INpdItemDetailsFieldDef["textFilter"],
): string {
  if (textFilter === "digits") {
    return sanitizeDigitsOnlyTextInput(value);
  }
  if (textFilter === "alphanumeric") {
    return sanitizeAlphanumericTextInput(value);
  }
  // Default: allow special characters (Roca Global Code, Material Code,
  // Material Description, HSN Code, etc.).
  return value;
}

const NpdItemDetailsTableCell: React.FC<INpdItemDetailsTableCellProps> = ({
  id,
  fieldDef,
  row,
  lookupOptions,
  onFieldChange,
  readOnly = false,
}) => {
  const { field, controlType, placeholder, maxLength, textFilter } = fieldDef;
  const controlClassName = styles.tableCellControl;
  const handleChange = React.useCallback(
    (value: NpdItemDetailFieldValue) => {
      onFieldChange(row.id, field, value);
    },
    [field, onFieldChange, row.id],
  );

  if (controlType === "text") {
    return (
      <InputText
        id={id}
        value={String(row[field] ?? "")}
        placeholder={placeholder}
        maxLength={maxLength}
        readOnly={readOnly}
        disabled={readOnly}
        className={controlClassName}
        onChange={(value) =>
          handleChange(sanitizeTextFieldValue(value, textFilter))
        }
      />
    );
  }

  if (controlType === "number") {
    return (
      <InputNumber
        id={id}
        value={toNumberValue(row[field])}
        placeholder={placeholder}
        min={0}
        maxFractionDigits={3}
        readOnly={readOnly}
        disabled={readOnly}
        className={controlClassName}
        onChange={handleChange}
      />
    );
  }

  const multiValue = Array.isArray(row[field])
    ? (row[field] as string[])
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => {
          const key = entry.toLowerCase();
          return Boolean(entry) && key !== "null" && key !== "undefined";
        })
        .slice(0, 1)
    : [];

  // Keep SharePoint values visible even when Lookup options are still loading
  // or the stored label is not in the current option list (special chars, etc.).
  const optionsWithSelected = [...lookupOptions];
  multiValue.forEach((selected) => {
    const alreadyPresent = optionsWithSelected.some(
      (option) => String(option.value ?? "") === selected,
    );
    if (!alreadyPresent) {
      optionsWithSelected.push({ label: selected, value: selected });
    }
  });

  return (
    <MultiSelect
      id={id}
      value={multiValue}
      options={optionsWithSelected}
      placeholder={placeholder}
      filter={!readOnly}
      display="comma"
      selectAll={false}
      selectionLimit={1}
      readOnly={readOnly}
      disabled={readOnly}
      className={controlClassName}
      panelClassName={styles.itemDetailsMultiSelectPanel}
      onChange={(value) =>
        handleChange(
          value
            .map((entry) => String(entry ?? "").trim())
            .filter((entry) => {
              const key = entry.toLowerCase();
              return Boolean(entry) && key !== "null" && key !== "undefined";
            })
            .slice(0, 1),
        )
      }
    />
  );
};

function areCellPropsEqual(
  prev: INpdItemDetailsTableCellProps,
  next: INpdItemDetailsTableCellProps,
): boolean {
  if (
    prev.id !== next.id ||
    prev.readOnly !== next.readOnly ||
    prev.fieldDef !== next.fieldDef ||
    prev.lookupOptions !== next.lookupOptions ||
    prev.onFieldChange !== next.onFieldChange ||
    prev.row.id !== next.row.id
  ) {
    return false;
  }

  return prev.row[prev.fieldDef.field] === next.row[next.fieldDef.field];
}

export default React.memo(NpdItemDetailsTableCell, areCellPropsEqual);
