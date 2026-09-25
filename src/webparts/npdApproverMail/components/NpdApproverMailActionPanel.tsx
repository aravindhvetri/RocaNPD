import * as React from "react";
import type { NpdWorkflowAction } from "../../../External/CommonServices/Interface";
import styles from "./NpdApproverMail.module.scss";

export interface INpdApproverMailActionPanelProps {
  requestTitle?: string;
  action: NpdWorkflowAction;
  comments: string;
  commentsRequired: boolean;
  commentsError?: string;
  submitting: boolean;
  onCommentsChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function getPrompt(action: NpdWorkflowAction): string {
  if (action === "Approve") {
    return "Are you sure, you want to Approve?";
  }
  if (action === "Reject") {
    return "Are you sure, you want to Reject?";
  }
  return "Are you sure, you want to Re-work?";
}

const NpdApproverMailActionPanel: React.FC<INpdApproverMailActionPanelProps> = ({
  requestTitle,
  action,
  comments,
  commentsError,
  submitting,
  onCommentsChange,
  onConfirm,
  onCancel,
}) => {
  const titleText = `Request for NPD Approval`;

  return (
    <div className={styles.actionContainer}>
      <h1 className={styles.actionTitle}>{titleText}</h1>
      <p className={styles.promptText}>{getPrompt(action)}</p>

      <textarea
        id="npdApproverMailComments"
        className={`${styles.commentsTextarea} ${commentsError ? styles.commentsTextareaError : ""
          }`}
        placeholder="Enter comments here"
        value={comments}
        disabled={submitting}
        style={{ resize: "none" }}
        rows={4}
        onChange={(e) => onCommentsChange(e.target.value)}
      />

      <div className={styles.actionsRow}>
        <button
          type="button"
          className={styles.yesButton}
          disabled={submitting}
          onClick={onConfirm}
        >
          {submitting ? "..." : "Yes"}
        </button>
        <button
          type="button"
          className={styles.noButton}
          disabled={submitting}
          onClick={onCancel}
        >
          No
        </button>
      </div>
    </div>
  );
};

export default NpdApproverMailActionPanel;
