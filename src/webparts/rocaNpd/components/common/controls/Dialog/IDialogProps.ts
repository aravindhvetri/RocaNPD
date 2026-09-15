import * as React from "react";

export interface IDialogProps {
  visible: boolean;
  title: string;
  onHide: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  closable?: boolean;
  className?: string;
}
