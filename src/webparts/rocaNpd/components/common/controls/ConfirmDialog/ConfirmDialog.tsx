import * as React from "react";
import { ConfirmDialog as PrimeConfirmDialog } from "primereact/confirmdialog";
import { Config } from "../../../../../../External/CommonServices/Config";
import { getAppRootElement } from "../../appRootTarget";
import type { IConfirmDialogProps } from "./IConfirmDialogProps";
import styles from "./ConfirmDialog.module.scss";

const ConfirmDialog: React.FC<IConfirmDialogProps> = ({
  visible,
  header,
  message,
  acceptLabel = Config.Yes,
  rejectLabel = Config.No,
  acceptClassName,
  onAccept,
  onReject,
  onHide,
}) => (
  <PrimeConfirmDialog
    visible={visible}
    header={header}
    message={message}
    acceptLabel={acceptLabel}
    rejectLabel={rejectLabel}
    acceptClassName={acceptClassName}
    className={styles.confirmDialog}
    appendTo={getAppRootElement()}
    onHide={() => {
      onHide?.();
    }}
    accept={onAccept}
    reject={onReject}
  />
);

export default ConfirmDialog;
