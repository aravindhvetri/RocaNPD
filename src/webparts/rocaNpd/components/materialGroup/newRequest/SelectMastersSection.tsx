import * as React from "react";
import { Button } from "../../common/controls";
import type { ISelectMastersSectionProps } from "./materialGroupTypes";
import styles from "./SelectMastersSection.module.scss";

const SelectMastersSection: React.FC<ISelectMastersSectionProps> = ({
  configs,
  selectedConfigIds,
  loading = false,
  readOnly = false,
  onToggleConfig,
  onSelectAll,
  onClearAll,
}) => {
  const selectedSet = React.useMemo(
    () => new Set(selectedConfigIds),
    [selectedConfigIds],
  );

  return (
    <div className={styles.sectionCard}>
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <h2 className={styles.title}>
            SELECT MASTERS TO CONFIGURE
            <span className={styles.requiredAsterisk}>*</span>
          </h2>
          <span className={styles.countBadge}>
            {selectedConfigIds.length} of {configs.length} Selected
          </span>
        </div>
        {!readOnly && (
          <div className={styles.actionsGroup}>
            <Button
              label="Select All"
              variant="secondary"
              size="sm"
              className={styles.headerBtn}
              onClick={onSelectAll}
              disabled={loading || configs.length === 0}
            />
            <Button
              label="Clear All"
              variant="secondary"
              size="sm"
              className={styles.headerBtn}
              onClick={onClearAll}
              disabled={loading || selectedConfigIds.length === 0}
            />
          </div>
        )}
      </div>

      <div className={styles.optionsGrid}>
        {configs.length === 0 && !loading && (
          <div className={styles.emptyConfigs}>
            No master configurations available.
          </div>
        )}
        {configs.map((config) => {
          const isSelected = selectedSet.has(config.id);
          return (
            <div
              key={config.id}
              className={[
                styles.optionCard,
                isSelected ? styles.selected : "",
                readOnly ? styles.readOnly : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => !readOnly && onToggleConfig(config.id)}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={readOnly ? -1 : 0}
              onKeyDown={(e) => {
                if (!readOnly && (e.key === " " || e.key === "Enter")) {
                  e.preventDefault();
                  onToggleConfig(config.id);
                }
              }}
            >
              <div
                className={`${styles.checkboxIcon} ${isSelected ? styles.checked : ""}`}
              >
                <i className="pi pi-check" />
              </div>
              <span className={styles.optionLabel} title={config.title}>
                {config.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SelectMastersSection;
