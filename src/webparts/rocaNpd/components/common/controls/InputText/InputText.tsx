import * as React from "react";
import { InputText as PrimeInputText } from "primereact/inputtext";
import { stripLeadingSpaces } from "../../../../../../External/CommonServices/textInputSanitize";
import ControlField from "../ControlField/ControlField";
import type { IInputTextProps } from "./IInputTextProps";

const InputText: React.FC<IInputTextProps> = ({
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
  maxLength,
  type = "text",
  "data-testid": testId,
}) => (
  <ControlField
    id={id}
    label={label}
    required={required}
    error={error}
    helperText={helperText}
    className={className}
  >
    <PrimeInputText
      id={id}
      name={id}
      value={value}
      type={type}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      readOnly={readOnly}
      autoComplete={type === "password" ? "new-password" : "off"}
      autoCorrect="off"
      spellCheck={false}
      className={error ? "p-invalid" : undefined}
      data-testid={testId}
      onChange={(e) => onChange(stripLeadingSpaces(e.target.value))}
    />
  </ControlField>
);

export default InputText;
