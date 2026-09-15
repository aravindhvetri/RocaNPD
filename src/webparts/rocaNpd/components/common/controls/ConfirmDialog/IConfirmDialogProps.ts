export interface IConfirmDialogProps {
  visible: boolean;
  header: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptClassName?: string;
  onAccept: () => void;
  onReject: () => void;
  /** Called when the dialog closes (escape, overlay, or after accept/reject). */
  onHide?: () => void;
}
