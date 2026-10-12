import * as React from "react";
import { flushSync } from "react-dom";
import { Button, Dialog, LoaderOverlay } from "../../controls";
import { awaitUiPaint } from "../awaitUiPaint";
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
  const [localProceeding, setLocalProceeding] = React.useState(false);
  const busy = proceeding || localProceeding;

  const handleProceed = (): void => {
    if (!canProceed || busy) {
      return;
    }

    flushSync(() => {
      setLocalProceeding(true);
    });
    void (async () => {
      await awaitUiPaint();
      try {
        await onProceed();
      } finally {
        setLocalProceeding(false);
      }
    })();
  };

  return (
    <>
      <LoaderOverlay visible={busy} label="Processing" />
      <Dialog
        visible={visible}
        title={title}
        width="38rem"
        className={styles.validationDialog}
        onHide={busy ? () => undefined : onHide}
        footer={
          <div className={styles.footer}>
            <Button
              label="Cancel"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={onHide}
            />
            <Button
              label="Proceed"
              size="sm"
              className={styles.proceedButton}
              loading={busy}
              disabled={!canProceed || busy}
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
                      <span
                        className={styles.validationError}
                        title={row.validationError || undefined}
                      >
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
    </>
  );
};

export default ImportValidationDialog;
