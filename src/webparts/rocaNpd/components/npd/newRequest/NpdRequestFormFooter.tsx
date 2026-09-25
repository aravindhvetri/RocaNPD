import * as React from "react";
import { Button } from "../../common/controls";
import styles from "./NpdRequestFormFooter.module.scss";

export type NpdRequestFooterMode =
  | "initiator-edit"
  | "vertical-head-pending"
  | "mis-pending"
  | "read-only";

export interface INpdRequestFormFooterProps {
  saving?: boolean;
  mode: NpdRequestFooterMode;
  onCancel: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRework: () => void;
}

const NpdRequestFormFooter: React.FC<INpdRequestFormFooterProps> = ({
  saving = false,
  mode,
  onCancel,
  onSaveDraft,
  onSubmit,
  onApprove,
  onReject,
  onRework,
}) => (
  <div className={styles.footer}>
    <div className={styles.cancelButton}>
      <Button
        label="Cancel"
        variant="secondary"
        size="sm"
        disabled={saving}
        onClick={onCancel}
      />
    </div>
    {mode === "initiator-edit" ? (
      <div className={styles.primaryActions}>
        <Button
          label="Save Draft"
          variant="secondary"
          icon="pi pi-save"
          size="sm"
          className={styles.saveButton}
          loading={saving}
          disabled={saving}
          onClick={onSaveDraft}
        />
        <Button
          label="SUBMIT REQUEST"
          icon="pi pi-send"
          size="sm"
          className={styles.submitButton}
          loading={saving}
          disabled={saving}
          onClick={onSubmit}
        />
      </div>
    ) : null}
    {mode === "vertical-head-pending" ? (
      <div className={styles.primaryActions}>
        <div className={styles.reworkButton}>
          <Button
            label="Rework"
            size="sm"
            disabled={saving}
            onClick={onRework}
          />
        </div>
        <div className={styles.rejectButton}>
          <Button
            label="Reject"
            size="sm"
            disabled={saving}
            onClick={onReject}
          />
        </div>
        <div className={styles.approveButton}>
          <Button
            label="Approve"
            size="sm"
            disabled={saving}
            onClick={onApprove}
          />
        </div>
      </div>
    ) : null}
    {mode === "mis-pending" ? (
      <div className={styles.primaryActions}>
        <div className={styles.reworkButton}>
          <Button
            label="Rework"
            size="sm"
            disabled={saving}
            onClick={onRework}
          />
        </div>
        <div className={styles.rejectButton}>
          <Button
            label="Reject"
            size="sm"
            disabled={saving}
            onClick={onReject}
          />
        </div>
        <div className={styles.approveButton}>
          <Button
            label="Post to SAP"
            size="sm"
            disabled={saving}
            onClick={onApprove}
          />
        </div>
      </div>
    ) : null}
  </div>
);

export default NpdRequestFormFooter;
