import * as React from "react";
import { InputTextarea as PrimeInputTextarea } from "primereact/inputtextarea";
import ControlField from "../ControlField/ControlField";
import type { IInputTextareaProps } from "./IInputTextareaProps";

const InputTextarea: React.FC<IInputTextareaProps> = ({
  id,
  label,
  required,
  disabled,
  readOnly,
  error,
  helperText,
  className,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  autoResize,
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
    <PrimeInputTextarea
      id={id}
      value={value}
      rows={rows}
      placeholder={placeholder}
      maxLength={maxLength}
      autoResize={autoResize}
      disabled={disabled}
      readOnly={readOnly}
      className={`w-full ${error ? "p-invalid" : ""}`}
      data-testid={testId}
      onChange={(e) => onChange(e.target.value)}
    />
  </ControlField>
);

export default InputTextarea;
