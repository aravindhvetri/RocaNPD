import * as React from "react";
import { AutoComplete } from "primereact/autocomplete";
import { getAppRootElement } from "../../appRootTarget";
import ControlField from "../ControlField/ControlField";
import type { IComboBoxProps } from "./IComboBoxProps";
import styles from "./ComboBox.module.scss";

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
  forceSelection = true,
  dropdown = true,
  "data-testid": testId,
}) => (
  <ControlField
    id={id}
    label={label}
    required={required}
    error={error}
    helperText={helperText}
    className={`${styles.comboBox} ${className ?? ""}`}
  >
    <AutoComplete
      inputId={id}
      value={value}
      suggestions={suggestions}
      field="label"
      placeholder={placeholder}
      minLength={minLength}
      dropdown={dropdown}
      forceSelection={forceSelection}
      disabled={disabled || readOnly}
      appendTo={getAppRootElement()}
      panelClassName={styles.panel}
      className={error ? "p-invalid" : undefined}
      inputClassName="w-full"
      pt={{
        input: {
          root: {
            name: id,
            autoComplete: "off",
            autoCorrect: "off",
            spellCheck: false,
          },
        },
      }}
      data-testid={testId}
      completeMethod={(event) => onSearch(event.query)}
      onChange={(event) => onChange(String(event.value ?? ""))}
      onSelect={(event) =>
        onChange(String(event.value?.value ?? event.value?.label ?? ""))
      }
    />
  </ControlField>
);

export default ComboBox;
