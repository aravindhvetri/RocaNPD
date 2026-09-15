export interface IDeleteConfirmDialogProps {
  visible: boolean;
  entityName: string;
  itemName: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}
