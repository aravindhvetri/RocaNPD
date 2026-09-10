import * as React from "react";
import { ConfirmDialog as PrimeConfirmDialog } from "primereact/confirmdialog";
import type { IConfirmDialogProps } from "./IConfirmDialogProps";

const ConfirmDialog: React.FC<IConfirmDialogProps> = ({
  visible,
  header,
  message,
  acceptLabel = "Yes",
  rejectLabel = "No",
  acceptClassName,
  onAccept,
  onReject,
}) => (
  <PrimeConfirmDialog
    visible={visible}
    header={header}
    message={message}
    acceptLabel={acceptLabel}
    rejectLabel={rejectLabel}
    acceptClassName={acceptClassName}
    onHide={onReject}
    accept={onAccept}
    reject={onReject}
  />
);

export default ConfirmDialog;
