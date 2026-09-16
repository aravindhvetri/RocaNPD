import * as React from "react";
import { Calendar } from "primereact/calendar";
import { getAppRootElement } from "../../appRootTarget";
import ControlField from "../ControlField/ControlField";
import type { IDatePickerProps } from "./IDatePickerProps";

const DatePicker: React.FC<IDatePickerProps> = ({
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
  showTime,
  dateFormat = "dd/mm/yy",
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
    <Calendar
      inputId={id}
      value={value}
      placeholder={placeholder}
      showTime={showTime}
      dateFormat={dateFormat}
      disabled={disabled}
      readOnlyInput={readOnly}
      className={`w-full ${error ? "p-invalid" : ""}`}
      appendTo={getAppRootElement()}
      data-testid={testId}
      onChange={(e) => onChange((e.value as Date) ?? null)}
    />
  </ControlField>
);

export default DatePicker;
