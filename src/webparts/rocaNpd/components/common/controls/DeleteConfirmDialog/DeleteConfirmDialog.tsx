import * as React from "react";
import { Button } from "../Button";
import { Dialog } from "../Dialog";
import type { IDeleteConfirmDialogProps } from "./IDeleteConfirmDialogProps";
import styles from "./DeleteConfirmDialog.module.scss";

const DeleteConfirmDialog: React.FC<IDeleteConfirmDialogProps> = ({
  visible,
  entityName,
  itemName,
  onCancel,
  onConfirm,
  loading = false,
}) => (
  <Dialog
    visible={visible}
    title="Confirm Delete"
    width="22rem"
    closable={!loading}
    className={styles.deleteDialog}
    onHide={onCancel}
    footer={
      <div className={styles.footer}>
        <Button
          label="Cancel"
          variant="secondary"
          size="sm"
          disabled={loading}
          onClick={onCancel}
        />
        <Button
          label="Delete"
          size="sm"
          loading={loading}
          disabled={loading}
          onClick={onConfirm}
        />
      </div>
    }
  >
    <div className={styles.iconWrap}>
      <i className={`pi pi-trash ${styles.trashIcon}`} aria-hidden="true" />
    </div>
    <p className={styles.message}>
      Remove {entityName} &quot;{itemName}&quot;?
    </p>
  </Dialog>
);

export default DeleteConfirmDialog;
