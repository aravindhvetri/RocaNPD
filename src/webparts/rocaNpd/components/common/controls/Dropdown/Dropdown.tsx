import * as React from "react";
import { Dropdown as PrimeDropdown } from "primereact/dropdown";
import { getAppRootElement } from "../../appRootTarget";
import ControlField from "../ControlField/ControlField";
import type { IDropdownProps } from "./IDropdownProps";
import styles from "./Dropdown.module.scss";

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
    className={`${styles.dropdown} ${className ?? ""}`}
  >
    <PrimeDropdown
      inputId={id}
      name={id}
      value={value}
      options={options}
      optionLabel="label"
      optionValue="value"
      placeholder={placeholder}
      filter={filter}
      showClear={showClear}
      disabled={disabled || readOnly}
      appendTo={getAppRootElement()}
      panelClassName={styles.panel}
      className={`w-full ${error ? "p-invalid" : ""}`}
      pt={{
        input: {
          autoComplete: "off",
        },
        filterInput: {
          name: `${id ?? "dropdown"}-filter`,
          autoComplete: "off",
          autoCorrect: "off",
          spellCheck: false,
        },
      }}
      data-testid={testId}
      onChange={(e) => onChange(e.value ?? null)}
    />
  </ControlField>
);

export default Dropdown;
