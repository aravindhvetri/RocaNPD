import * as React from "react";
import { AutoComplete } from "primereact/autocomplete";
import ControlField from "../ControlField/ControlField";
import type { IComboBoxProps } from "./IComboBoxProps";

const ComboBox: React.FC<IComboBoxProps> = ({
  id,
  label,
  required,
  disabled,
  readOnly,
  error,
  helperText,
  className,
  value,
  suggestions,
  onChange,
  onSearch,
  placeholder,
  minLength = 0,
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
    <AutoComplete
      inputId={id}
      value={value}
      suggestions={suggestions}
      field="label"
      placeholder={placeholder}
      minLength={minLength}
      disabled={disabled || readOnly}
      className={`w-full ${error ? "p-invalid" : ""}`}
      inputClassName="w-full"
      data-testid={testId}
      completeMethod={(e) => onSearch(e.query)}
      onChange={(e) => onChange(String(e.value ?? ""))}
      onSelect={(e) => onChange(String(e.value?.value ?? e.value?.label ?? ""))}
    />
  </ControlField>
);

export default ComboBox;
