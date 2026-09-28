import * as React from "react";
import { flushSync } from "react-dom";
import { MultiSelect as PrimeMultiSelect } from "primereact/multiselect";
import { getAppRootElement } from "../../appRootTarget";
import ControlField from "../ControlField/ControlField";
import type { IDropdownOption } from "../Dropdown/IDropdownProps";
import type { IMultiSelectProps } from "./IMultiSelectProps";
import styles from "./MultiSelect.module.scss";

function sanitizePanelToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function readTriggerWidth(host: HTMLElement | null): number {
  const trigger = host?.querySelector(".p-multiselect") as HTMLElement | null;
  if (!trigger) {
    return 0;
  }
  return Math.round(trigger.getBoundingClientRect().width);
}

const MultiSelect: React.FC<IMultiSelectProps> = ({
  id,
  label,
  required,
  disabled,
  readOnly,
  error,
  helperText,
  className,
  panelClassName,
  value,
  options,
  onChange,
  placeholder = "Select",
  filter = true,
  display = "comma",
  selectAll = false,
  selectionLimit,
  emptyMessage = "No available options",
  "data-testid": testId,
}) => {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const panelToken = React.useMemo(
    () => `roca-ms-panel-${sanitizePanelToken(id || "default")}`,
    [id],
  );
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties>();

  const lockPanelToTriggerWidth = React.useCallback(() => {
    const width = readTriggerWidth(hostRef.current);
    if (width <= 0) {
      return;
    }

    const next: React.CSSProperties = {
      width: `${width}px`,
      minWidth: `${width}px`,
      maxWidth: `${width}px`,
      boxSizing: "border-box",
    };

    // Commit before Prime paints the overlay so the first frame is correct size.
    flushSync(() => {
      setPanelStyle(next);
    });
  }, []);

  const syncOverlayToTrigger = React.useCallback(() => {
    const trigger = hostRef.current?.querySelector(
      ".p-multiselect",
    ) as HTMLElement | null;
    const panel = document.querySelector(
      `.${panelToken}`,
    ) as HTMLElement | null;
    if (!trigger || !panel) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const width = Math.round(rect.width);
    if (width <= 0) {
      return;
    }

    panel.style.setProperty("width", `${width}px`, "important");
    panel.style.setProperty("max-width", `${width}px`, "important");
    panel.style.setProperty("min-width", `${width}px`, "important");
    panel.style.setProperty("box-sizing", "border-box", "important");
    panel.style.left = `${Math.round(rect.left)}px`;
  }, [panelToken]);

  const itemTemplate = React.useCallback((option: IDropdownOption) => {
    const text = String(option?.label ?? "");
    return (
      <span className={styles.optionLabel} title={text}>
        {text}
      </span>
    );
  }, []);

  return (
    <ControlField
      id={id}
      label={label}
      required={required}
      error={error}
      helperText={helperText}
      className={`${styles.multiSelect} ${className ?? ""}`}
    >
      <div
        ref={hostRef}
        className={styles.host}
        onMouseDown={lockPanelToTriggerWidth}
        onFocus={lockPanelToTriggerWidth}
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
          showSelectAll={selectAll && selectionLimit !== 1}
          selectionLimit={selectionLimit}
          disabled={disabled || readOnly}
          appendTo={getAppRootElement()}
          panelClassName={`${styles.panel} ${panelToken} ${panelClassName ?? ""}`}
          panelStyle={panelStyle}
          className={`w-full ${error ? "p-invalid" : ""}`}
          emptyMessage={emptyMessage}
          itemTemplate={itemTemplate}
          onShow={syncOverlayToTrigger}
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
          onChange={(event) => {
            const next = event.value ?? [];
            if (
              typeof selectionLimit === "number" &&
              selectionLimit > 0 &&
              next.length > selectionLimit
            ) {
              onChange(next.slice(-selectionLimit));
              return;
            }
            onChange(next);
          }}
        />
      </div>
    </ControlField>
  );
};

export default MultiSelect;
