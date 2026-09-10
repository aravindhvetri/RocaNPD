import * as React from "react";
import { Dialog as PrimeDialog } from "primereact/dialog";
import type { IDialogProps } from "./IDialogProps";

const Dialog: React.FC<IDialogProps> = ({
  visible,
  title,
  onHide,
  children,
  footer,
  width = "32rem",
  closable = true,
}) => (
  <PrimeDialog
    header={title}
    visible={visible}
    style={{ width }}
    modal
    closable={closable}
    draggable={false}
    footer={footer}
    onHide={onHide}
  >
    {children}
  </PrimeDialog>
);

export default Dialog;
