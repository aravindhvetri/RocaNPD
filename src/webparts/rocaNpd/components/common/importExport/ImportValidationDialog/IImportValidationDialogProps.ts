import type { IImportValidationRow } from "../../../../../../External/CommonServices/importService";

export interface IImportValidationDialogProps {
  visible: boolean;
  title?: string;
  sectionTitle: string;
  recordColumnHeader?: string;
  validationRows: IImportValidationRow[];
  canProceed?: boolean;
  proceeding?: boolean;
  onHide: () => void;
  onProceed: () => Promise<void>;
}
