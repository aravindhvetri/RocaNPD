import * as React from "react";
import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type { INpdWorkflowStatusViewRow } from "../../../../../External/CommonServices/npdWorkflowStatusView";
import { Button, Dialog } from "../../common/controls";
import styles from "./NpdWorkflowStatusDialog.module.scss";

export interface INpdWorkflowStatusDialogProps {
  visible: boolean;
  rows: INpdWorkflowStatusViewRow[];
  onHide: () => void;
}

const NpdWorkflowStatusDialog: React.FC<INpdWorkflowStatusDialogProps> = ({
  visible,
  rows,
  onHide,
}) => (
  <Dialog
    visible={visible}
    title={FieldLabels.WorkflowStatus}
    width="40rem"
    className={styles.dialog}
    onHide={onHide}
    footer={
      <div className={styles.footer}>
        <Button label="Cancel" variant="secondary" size="sm" onClick={onHide} />
      </div>
    }
  >
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{FieldLabels.Role}</th>
            <th>{FieldLabels.Name}</th>
            <th>{FieldLabels.WorkflowRole}</th>
            <th>{FieldLabels.Status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr
                key={row.key}
                className={row.isHighlighted ? styles.currentRow : undefined}
              >
                <td>{row.role}</td>
                <td>{row.name}</td>
                <td>{row.workflowRole}</td>
                <td>
                  <span className={statusClass(row.statusLabel)}>
                    {row.statusLabel}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className={styles.empty}>
                {FieldLabels.WorkflowNotCreated}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </Dialog>
);

function statusClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "pending") {
    return styles.statusPending;
  }
  if (normalized === "initiated" || normalized === "approved") {
    return styles.statusApproved;
  }
  if (normalized === "rejected") {
    return styles.statusRejected;
  }
  if (normalized === "rework") {
    return styles.statusRework;
  }
  return styles.statusMuted;
}

export default NpdWorkflowStatusDialog;
