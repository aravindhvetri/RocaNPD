import * as React from "react";
import type { ISelectOption } from "../../../../../External/CommonServices/Interface";
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

const NpdItemDetailsTableCell: React.FC<INpdItemDetailsTableCellProps> = ({
  id,
  fieldDef,
  row,
  lookupOptions,
  onFieldChange,
  readOnly = false,
}) => {
  const { field, controlType, placeholder, maxLength } = fieldDef;
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
        onChange={handleChange}
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

  const multiValue = Array.isArray(row[field]) ? (row[field] as string[]) : [];

  return (
    <MultiSelect
      id={id}
      value={multiValue}
      options={lookupOptions}
      placeholder={placeholder}
      filter={!readOnly}
      display="comma"
      selectAll={false}
      readOnly={readOnly}
      disabled={readOnly}
      className={controlClassName}
      onChange={(value) =>
        handleChange(value.map((entry) => String(entry)))
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
