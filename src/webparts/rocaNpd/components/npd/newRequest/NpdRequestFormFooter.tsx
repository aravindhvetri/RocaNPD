import * as React from "react";
import { Config } from "../../../../../External/CommonServices/Config";
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
  /** When true (Rework status), primary submit shows Resubmit instead of Submit Request. */
  isResubmit?: boolean;
  /** Rework keeps Resubmit and Cancel only. */
  showSaveDraft?: boolean;
  /**
   * MIS Coordinator only: hide Reject and Rework after at least one Item Detail
   * has been posted to SAP. Cancel and Post to SAP stay.
   */
  hideMisRejectRework?: boolean;
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
  isResubmit = false,
  showSaveDraft = true,
  hideMisRejectRework = false,
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
        label={Config.Cancel}
        variant="secondary"
        size="sm"
        disabled={saving}
        onClick={onCancel}
      />
    </div>
    {mode === "initiator-edit" ? (
      <div className={styles.primaryActions}>
        {showSaveDraft ? (
          <Button
            label={Config.SaveAsDraft}
            variant="secondary"
            icon="pi pi-save"
            size="sm"
            className={styles.saveButton}
            loading={saving}
            disabled={saving}
            onClick={onSaveDraft}
          />
        ) : null}
        <Button
          label={isResubmit ? "RESUBMIT" : "SUBMIT REQUEST"}
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
            label={Config.Rework}
            size="sm"
            disabled={saving}
            onClick={onRework}
          />
        </div>
        <div className={styles.rejectButton}>
          <Button
            label={Config.Reject}
            size="sm"
            disabled={saving}
            onClick={onReject}
          />
        </div>
        <div className={styles.approveButton}>
          <Button
            label={Config.Approve}
            size="sm"
            disabled={saving}
            onClick={onApprove}
          />
        </div>
      </div>
    ) : null}
    {mode === "mis-pending" ? (
      <div className={styles.primaryActions}>
        {hideMisRejectRework ? null : (
          <div className={styles.reworkButton}>
            <Button
              label={Config.Rework}
              size="sm"
              disabled={saving}
              onClick={onRework}
            />
          </div>
        )}
        {hideMisRejectRework ? null : (
          <div className={styles.rejectButton}>
            <Button
              label={Config.Reject}
              size="sm"
              disabled={saving}
              onClick={onReject}
            />
          </div>
        )}
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
