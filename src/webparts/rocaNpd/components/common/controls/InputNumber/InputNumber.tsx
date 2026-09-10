import * as React from "react";
import { InputNumber as PrimeInputNumber } from "primereact/inputnumber";
import ControlField from "../ControlField/ControlField";
import type { IInputNumberProps } from "./IInputNumberProps";

const InputNumber: React.FC<IInputNumberProps> = ({
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
  min,
  max,
  minFractionDigits,
  maxFractionDigits,
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
    <PrimeInputNumber
      inputId={id}
      value={value}
      placeholder={placeholder}
      min={min}
      max={max}
      minFractionDigits={minFractionDigits}
      maxFractionDigits={maxFractionDigits}
      disabled={disabled}
      readOnly={readOnly}
      className={error ? "p-invalid" : undefined}
      inputClassName="w-full"
      data-testid={testId}
      onValueChange={(e) => onChange(e.value ?? null)}
    />
  </ControlField>
);

export default InputNumber;
