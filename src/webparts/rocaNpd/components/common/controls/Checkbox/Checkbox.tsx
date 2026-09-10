import * as React from "react";
import { Checkbox as PrimeCheckbox } from "primereact/checkbox";
import ControlField from "../ControlField/ControlField";
import type { ICheckboxProps } from "./ICheckboxProps";

const Checkbox: React.FC<ICheckboxProps> = ({
  id,
  label,
  required,
  disabled,
  readOnly,
  error,
  helperText,
  className,
  checked,
  onChange,
  'data-testid': testId,
}) => (
  <ControlField
    id={id}
    error={error}
    helperText={helperText}
    className={className}
  >
    <div className="flex align-items-center gap-2">
      <PrimeCheckbox
        inputId={id}
        checked={checked}
        disabled={disabled || readOnly}
        className={error ? "p-invalid" : undefined}
        data-testid={testId}
        onChange={(e) => onChange(!!e.checked)}
      />
      {label && (
        <label htmlFor={id} className="cursor-pointer">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
    </div>
  </ControlField>
);

export default Checkbox;
