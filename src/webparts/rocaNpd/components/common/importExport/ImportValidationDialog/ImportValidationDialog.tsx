import * as React from "react";
import { Button, Dialog } from "../../controls";
import type { IImportValidationDialogProps } from "./IImportValidationDialogProps";
import styles from "./ImportValidationDialog.module.scss";

const ImportValidationDialog: React.FC<IImportValidationDialogProps> = ({
  visible,
  title = "Import",
  sectionTitle,
  validationRows,
  canProceed = false,
  proceeding = false,
  onHide,
  onProceed,
}) => {
  const handleProceed = (): void => {
    if (!canProceed || proceeding) {
      return;
    }

    void onProceed();
  };

  return (
    <Dialog
      visible={visible}
      title={title}
      width="38rem"
      className={styles.validationDialog}
      onHide={onHide}
      footer={
        <div className={styles.footer}>
          <Button
            label="Cancel"
            variant="secondary"
            size="sm"
            disabled={proceeding}
            onClick={onHide}
          />
          <Button
            label="Proceed"
            size="sm"
            className={styles.proceedButton}
            loading={proceeding}
            disabled={!canProceed || proceeding}
            onClick={handleProceed}
          />
        </div>
      }
    >
      <div className={styles.body}>
        <h3 className={styles.sectionTitle}>{sectionTitle}</h3>

        <div className={styles.validationTableWrap}>
          <table className={styles.validationTable}>
            <thead>
              <tr>
                <th>S.NO</th>
                <th>Validation Error</th>
              </tr>
            </thead>
            <tbody>
              {validationRows.map((row) => (
                <tr key={`${row.serialNo}-${row.validationError}`}>
                  <td>{row.serialNo}</td>
                  <td>
                    <span className={styles.validationError}>
                      {row.validationError}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Dialog>
  );
};

export default ImportValidationDialog;
