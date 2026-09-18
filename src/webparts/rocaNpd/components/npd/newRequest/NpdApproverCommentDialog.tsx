import * as React from "react";
import { Button, Dialog, InputTextarea } from "../../common/controls";
import type { NpdWorkflowAction } from "../../../../../External/CommonServices/Interface";
import styles from "./NpdApproverCommentDialog.module.scss";

export interface INpdApproverCommentDialogProps {
  visible: boolean;
  action: NpdWorkflowAction | null;
  saving?: boolean;
  onHide: () => void;
  onSubmit: (comments: string) => void;
}

function getTitle(action: NpdWorkflowAction | null): string {
  if (action === "Approve") {
    return "Approve Request";
  }
  if (action === "Reject") {
    return "Reject Request";
  }
  return "Rework Request";
}

const NpdApproverCommentDialog: React.FC<INpdApproverCommentDialogProps> = ({
  visible,
  action,
  saving = false,
  onHide,
  onSubmit,
}) => {
  const [comments, setComments] = React.useState("");

  React.useEffect(() => {
    if (!visible) {
      setComments("");
    }
  }, [visible]);

  const canSubmit = Boolean(comments.trim()) && !saving;

  return (
    <Dialog
      visible={visible}
      title={getTitle(action)}
      width="32rem"
      className={styles.dialog}
      onHide={onHide}
      footer={
        <div className={styles.footer}>
          <Button
            label="Cancel"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={onHide}
          />
          <Button
            label={action ?? "Submit"}
            size="sm"
            loading={saving}
            disabled={!canSubmit}
            onClick={() => onSubmit(comments.trim())}
          />
        </div>
      }
    >
      <InputTextarea
        id="npdApproverComments"
        label="Comments"
        required
        rows={4}
        value={comments}
        placeholder="Enter comments"
        onChange={setComments}
      />
    </Dialog>
  );
};

export default NpdApproverCommentDialog;
