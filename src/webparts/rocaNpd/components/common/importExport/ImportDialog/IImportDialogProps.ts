export interface IImportDialogProps {
  visible: boolean;
  title?: string;
  importSectionTitle: string;
  templateSectionHint: string;
  templateFileName?: string;
  templateLoading?: boolean;
  templateUnavailableMessage?: string;
  acceptedFormatsLabel: string;
  maxSizeLabel: string;
  maxFileSizeBytes: number;
  accept: string;
  importing?: boolean;
  /**
   * Module FieldLabels that must appear as Excel column headers.
   * Validated on browse and drag-drop before the file is accepted.
   */
  expectedHeaders?: readonly string[];
  onHide: () => void;
  onDownloadTemplate?: () => void;
  onFileRejected?: (message: string) => void;
  onImport: (file: File) => Promise<void>;
}
