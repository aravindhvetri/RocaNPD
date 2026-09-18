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
  emptyMessage = "No available options",
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
      showSelectAll={selectAll}
      disabled={disabled || readOnly}
      appendTo={getAppRootElement()}
      panelClassName={styles.panel}
      className={`w-full ${error ? "p-invalid" : ""}`}
      emptyMessage={emptyMessage}
      pt={{
        input: {
          autoComplete: "off",
        },
        filterInput: {
          name: `${id ?? "multiselect"}-filter`,
          autoComplete: "off",
          autoCorrect: "off",
          spellCheck: false,
        },
      }}
      data-testid={testId}
      onChange={(event) => onChange(event.value ?? [])}
    />
  </ControlField>
);

export default MultiSelect;
