import * as React from "react";
import { InputText, MultiSelect } from "../../common/controls";
import type { INpdItemDetailsFieldDef } from "./npdItemDetailsConfig";
import type { INpdItemDetailRow, NpdItemDetailFieldKey } from "./npdItemDetails.types";
import styles from "./NpdItemDetailsSection.module.scss";

export interface INpdItemDetailsTableCellProps {
  id: string;
  fieldDef: INpdItemDetailsFieldDef;
  row: INpdItemDetailRow;
  onFieldChange: (
    rowId: string,
    field: NpdItemDetailFieldKey,
    value: string | string[],
  ) => void;
}

const NpdItemDetailsTableCell: React.FC<INpdItemDetailsTableCellProps> = ({
  id,
  fieldDef,
  row,
  onFieldChange,
}) => {
  const { field, controlType, placeholder, maxLength } = fieldDef;
  const controlClassName = styles.tableCellControl;

  if (controlType === "text") {
    return (
      <InputText
        id={id}
        value={String(row[field] ?? "")}
        placeholder={placeholder}
        maxLength={maxLength}
        className={controlClassName}
        onChange={(value) => onFieldChange(row.id, field, value)}
      />
    );
  }

  const multiValue = Array.isArray(row[field]) ? (row[field] as string[]) : [];

  return (
    <MultiSelect
      id={id}
      value={multiValue}
      options={[]}
      placeholder={placeholder}
      filter
      display="comma"
      selectAll={false}
      className={controlClassName}
      onChange={(value) =>
        onFieldChange(
          row.id,
          field,
          value.map((entry) => String(entry)),
        )
      }
    />
  );
};

export default NpdItemDetailsTableCell;
