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
    <Button
      label="Cancel / Back"
      variant="secondary"
      size="sm"
      className={styles.cancelButton}
      disabled={saving}
      onClick={onCancel}
    />
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
        <Button
          label="Rework"
          variant="secondary"
          size="sm"
          className={styles.saveButton}
          disabled={saving}
          onClick={onRework}
        />
        <Button
          label="Reject"
          variant="secondary"
          size="sm"
          className={styles.saveButton}
          disabled={saving}
          onClick={onReject}
        />
        <Button
          label="Approve"
          size="sm"
          className={styles.submitButton}
          disabled={saving}
          onClick={onApprove}
        />
      </div>
    ) : null}
    {mode === "mis-pending" ? (
      <div className={styles.primaryActions}>
        <Button
          label="Rework"
          variant="secondary"
          size="sm"
          className={styles.saveButton}
          disabled={saving}
          onClick={onRework}
        />
        <Button
          label="Reject"
          variant="secondary"
          size="sm"
          className={styles.saveButton}
          disabled={saving}
          onClick={onReject}
        />
        <Button
          label="Post to SAP"
          size="sm"
          className={styles.submitButton}
          disabled={saving}
          onClick={onApprove}
        />
      </div>
    ) : null}
  </div>
);

export default NpdRequestFormFooter;
