import * as React from "react";
import { MultiSelect as PrimeMultiSelect } from "primereact/multiselect";
import { getAppRootElement } from "../../appRootTarget";
import ControlField from "../ControlField/ControlField";
import type { IMultiSelectProps } from "./IMultiSelectProps";
import styles from "./MultiSelect.module.scss";

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
  filter = true,
  display = "comma",
  selectAll = false,
  "data-testid": testId,
}) => (
  <ControlField
    id={id}
    label={label}
    required={required}
    error={error}
    helperText={helperText}
    className={`${styles.multiSelect} ${className ?? ""}`}
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
      selectAll={selectAll}
      disabled={disabled || readOnly}
      appendTo={getAppRootElement()}
      panelClassName={styles.panel}
      className={`w-full ${error ? "p-invalid" : ""}`}
      data-testid={testId}
      onChange={(event) => onChange(event.value ?? [])}
    />
  </ControlField>
);

export default MultiSelect;
