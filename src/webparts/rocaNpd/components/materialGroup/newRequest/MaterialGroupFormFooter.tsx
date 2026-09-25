import * as React from "react";
import { Button } from "../../common/controls";
import type { IMaterialGroupFormFooterProps } from "./materialGroupTypes";
import styles from "./MaterialGroupFormFooter.module.scss";

const MaterialGroupFormFooter: React.FC<IMaterialGroupFormFooterProps> = ({
  mode = "create",
  saving = false,
  submitting = false,
  onCancel,
  onSaveDraft,
  onSubmit,
  onConsultantAction,
}) => {
  const isBusy = saving || submitting;

  if (mode === "view") {
    return (
      <div className={styles.footer}>
        <div className={styles.cancelButton}>
          <Button
            label="Cancel"
            variant="secondary"
            size="sm"
            onClick={onCancel}
          />
        </div>
      </div>
    );
  }

  if (mode === "consultant-edit") {
    return (
      <div className={styles.footer}>
        <div className={styles.cancelButton}>
          <Button
            label="Cancel"
            variant="secondary"
            size="sm"
            disabled={isBusy}
            onClick={onCancel}
          />
        </div>

        <div className={styles.primaryActions}>
          <div className={styles.reworkButton}>
            <Button
              label="Rework"
              size="sm"
              disabled={isBusy}
              onClick={() => onConsultantAction?.("Rework")}
            />
          </div>
          <div className={styles.rejectButton}>
            <Button
              label="Reject"
              size="sm"
              disabled={isBusy}
              onClick={() => onConsultantAction?.("Rejected")}
            />
          </div>
          <div className={styles.completeButton}>
            <Button
              label="Complete"
              size="sm"
              loading={isBusy}
              disabled={isBusy}
              onClick={() => onConsultantAction?.("Completed")}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.footer}>
      <div className={styles.cancelButton}>
        <Button
          label="Cancel"
          variant="secondary"
          size="sm"
          disabled={isBusy}
          onClick={onCancel}
        />
      </div>

      <div className={styles.primaryActions}>
        <Button
          label="Save Draft"
          variant="secondary"
          icon="pi pi-save"
          size="sm"
          className={styles.saveButton}
          loading={saving}
          disabled={isBusy}
          onClick={onSaveDraft}
        />

        <Button
          label="Submit to Consultant"
          icon="pi pi-send"
          size="sm"
          className={styles.submitButton}
          loading={submitting}
          disabled={isBusy}
          onClick={onSubmit}
        />
      </div>
    </div>
  );
};

export default MaterialGroupFormFooter;
