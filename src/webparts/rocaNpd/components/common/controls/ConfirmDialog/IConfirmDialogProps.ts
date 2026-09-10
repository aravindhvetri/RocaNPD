export interface IConfirmDialogProps {
  visible: boolean;
  header: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptClassName?: string;
  onAccept: () => void;
  onReject: () => void;
}
