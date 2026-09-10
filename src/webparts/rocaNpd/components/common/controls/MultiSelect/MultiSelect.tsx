import * as React from "react";
import { MultiSelect as PrimeMultiSelect } from "primereact/multiselect";
import ControlField from "../ControlField/ControlField";
import type { IMultiSelectProps } from "./IMultiSelectProps";

const MultiSelect: React.FC<IMultiSelectProps> = ({
  id,
  label,
  required,
  disabled,
  readOnly,
  error,
  helperText,
  className,
  value,
  options,
  onChange,
  placeholder = "Select",
  filter,
  display = "chip",
  'data-testid': testId,
}) => (
  <ControlField
    id={id}
    label={label}
    required={required}
    error={error}
    helperText={helperText}
    className={className}
  >
    <PrimeMultiSelect
      inputId={id}
      value={value}
      options={options}
      optionLabel="label"
      optionValue="value"
      placeholder={placeholder}
      filter={filter}
      display={display}
      disabled={disabled || readOnly}
      className={`w-full ${error ? "p-invalid" : ""}`}
      data-testid={testId}
      onChange={(e) => onChange(e.value ?? [])}
    />
  </ControlField>
);

export default MultiSelect;
