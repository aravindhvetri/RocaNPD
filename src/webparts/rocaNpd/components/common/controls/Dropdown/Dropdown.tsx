import * as React from "react";
import { Dropdown as PrimeDropdown } from "primereact/dropdown";
import ControlField from "../ControlField/ControlField";
import type { IDropdownProps } from "./IDropdownProps";

const Dropdown: React.FC<IDropdownProps> = ({
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
  showClear,
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
    <PrimeDropdown
      inputId={id}
      value={value}
      options={options}
      optionLabel="label"
      optionValue="value"
      placeholder={placeholder}
      filter={filter}
      showClear={showClear}
      disabled={disabled || readOnly}
      className={`w-full ${error ? "p-invalid" : ""}`}
      data-testid={testId}
      onChange={(e) => onChange(e.value ?? null)}
    />
  </ControlField>
);

export default Dropdown;
