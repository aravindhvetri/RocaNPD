import * as React from "react";
import { Button } from "../Button";
import { Dialog } from "../Dialog";
import type { IDeleteBlockedDialogProps } from "./IDeleteBlockedDialogProps";
import styles from "./DeleteBlockedDialog.module.scss";

const DeleteBlockedDialog: React.FC<IDeleteBlockedDialogProps> = ({
  visible,
  message,
  onClose,
}) => (
  <Dialog
    visible={visible}
    title="Cannot Delete"
    width="22rem"
    className={styles.blockedDialog}
    onHide={onClose}
    footer={
      <div className={styles.footer}>
        <Button
          label="Close"
          size="sm"
          className={styles.closeButton}
          onClick={onClose}
        />
      </div>
    }
  >
    <p className={styles.message}>{message}</p>
  </Dialog>
);

export default DeleteBlockedDialog;
