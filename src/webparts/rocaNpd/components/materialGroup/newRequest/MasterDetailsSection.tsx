import * as React from "react";
import { Button, InputText } from "../../common/controls";
import type { IMasterDetailsSectionProps } from "./materialGroupTypes";
import styles from "./MasterDetailsSection.module.scss";

const MasterDetailsSection: React.FC<IMasterDetailsSectionProps> = ({
  configs,
  selectedConfigIds,
  entriesByConfigId,
  readOnly = false,
  isConsultantMode = false,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
}) => {
  const configMap = React.useMemo(() => {
    const map = new Map<number, string>();
    configs.forEach((c) => map.set(c.id, c.title));
    return map;
  }, [configs]);

  const totalEntries = React.useMemo(() => {
    let count = 0;
    for (const configId of selectedConfigIds) {
      count += (entriesByConfigId[configId] || []).length;
    }
    return count;
  }, [selectedConfigIds, entriesByConfigId]);

  return (
    <div className={styles.sectionCard}>
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <h2 className={styles.title}>
            MASTER CODE &amp; DESCRIPTION DETAILS
          </h2>
        </div>
        <div className={styles.totalEntriesGroup}>
          <span className={styles.totalEntriesLabel}>Total Entries:</span>
          <span className={styles.totalBadge}>{totalEntries}</span>
        </div>
      </div>

      {selectedConfigIds.length === 0 ? (
        <div className={styles.emptySelectionMessage}>
          No masters selected. Please select at least one master category above to configure entries.
        </div>
      ) : (
        selectedConfigIds.map((configId) => {
          const masterTitle = configMap.get(configId) || `Master (${configId})`;
          const rows = entriesByConfigId[configId] || [];
          const rowCount = rows.length;

          return (
            <div key={configId} className={styles.masterCard}>
              <div className={styles.cardHeader}>
                <div className={styles.masterTitleGroup}>
                  <span className={styles.dot}>●</span>
                  <span className={styles.masterName}>{masterTitle}</span>
                  <span className={styles.entryBadge}>
                    {rowCount} {rowCount === 1 ? "entry" : "entries"}
                  </span>
                </div>
                {!readOnly && (
                  <Button
                    label="Add Row"
                    icon="pi pi-plus"
                    variant="secondary"
                    size="sm"
                    className={styles.addRowBtn}
                    onClick={() => onAddRow(configId)}
                  />
                )}
              </div>

              <div className={styles.tableContainer}>
                <div className={styles.columnHeaderRow}>
                  <div className={styles.colHeader}>
                    <span>Code</span>
                    {isConsultantMode && (
                      <span className={styles.requiredAsterisk}>*</span>
                    )}
                  </div>
                  <div className={styles.colHeader}>
                    <span>Description</span>
                    <span className={styles.requiredAsterisk}>*</span>
                  </div>
                  {!readOnly && (
                    <div className={styles.actionColHeader}>Action</div>
                  )}
                </div>

                {rows.length > 0 ? (
                  rows.map((row) => (
                    <div
                      key={row.tempId}
                      className={`${styles.dataRow}${row.isNew ? ` ${styles.newRow}` : ""}`}
                    >
                      <div className={styles.inputField}>
                        <InputText
                          value={row.code}
                          placeholder={
                            isConsultantMode
                              ? `Code for ${masterTitle} (Required)`
                              : `e.g. Code for ${masterTitle}`
                          }
                          disabled={readOnly}
                          required={isConsultantMode}
                          onChange={(val) =>
                            onUpdateRow(configId, row.tempId, "code", val)
                          }
                        />
                      </div>
                      <div className={styles.inputField}>
                        <InputText
                          value={row.description}
                          placeholder={`e.g. Description for ${masterTitle}`}
                          required
                          disabled={readOnly}
                          onChange={(val) =>
                            onUpdateRow(configId, row.tempId, "description", val)
                          }
                        />
                      </div>
                      {!readOnly && (
                        <div className={styles.actionCol}>
                          <Button
                            variant="text"
                            icon="pi pi-trash"
                            iconOnly
                            className={styles.deleteAction}
                            onClick={() => onRemoveRow(configId, row.tempId)}
                            title="Delete row"
                            aria-label="Delete row"
                          />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyMasterRowsMessage}>
                    No entries added. {!readOnly && 'Click "Add Row" above to add an entry.'}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default MasterDetailsSection;
