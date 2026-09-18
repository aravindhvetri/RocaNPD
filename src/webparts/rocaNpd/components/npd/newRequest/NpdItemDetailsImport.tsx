import * as React from "react";
import { Toast as PrimeToast } from "primereact/toast";
import { Config } from "../../../../../External/CommonServices/Config";
import type {
  INpdItemDetailsImportParseResult,
  ISelectOption,
  ITemplateDocument,
} from "../../../../../External/CommonServices/Interface";
import {
  buildImportValidationRows,
  ImportValidationMessages,
  type IImportValidationRow,
} from "../../../../../External/CommonServices/importService";
import { parseNpdItemDetailsImportFile } from "../../../../../External/CommonServices/npdItemDetailsImportService";
import {
  downloadTemplateFile,
  fetchTemplateByType,
} from "../../../../../External/CommonServices/templateService";
import { ImportDialog, ImportValidationDialog } from "../../common/importExport";
import { showErrorToast, showSuccessToast } from "../../common/controls";
import {
  isEmptyItemDetailRow,
  toNpdItemDetailRecord,
  toNpdItemDetailRow,
} from "./npdItemDetailsConfig";
import type { INpdItemDetailRow } from "./npdItemDetails.types";

export interface INpdItemDetailsImportProps {
  visible: boolean;
  brand: string | null;
  rows: INpdItemDetailRow[];
  lookupOptionsByType: Record<string, ISelectOption[]>;
  toastRef: React.RefObject<PrimeToast>;
  onHide: () => void;
  onRowsChange: React.Dispatch<React.SetStateAction<INpdItemDetailRow[]>>;
}

const NpdItemDetailsImport: React.FC<INpdItemDetailsImportProps> = ({
  visible,
  brand,
  rows,
  lookupOptionsByType,
  toastRef,
  onHide,
  onRowsChange,
}) => {
  const [templateDocument, setTemplateDocument] =
    React.useState<ITemplateDocument | null>(null);
  const [templateLoading, setTemplateLoading] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [validationVisible, setValidationVisible] = React.useState(false);
  const [validationRows, setValidationRows] = React.useState<IImportValidationRow[]>([]);
  const [preview, setPreview] =
    React.useState<INpdItemDetailsImportParseResult | null>(null);

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    setTemplateLoading(true);
    void fetchTemplateByType(Config.TemplateTypes.NpdItemDetails)
      .then((template) => setTemplateDocument(template))
      .catch(() => setTemplateDocument(null))
      .finally(() => setTemplateLoading(false));
  }, [visible]);

  const applyRecords = (result: INpdItemDetailsImportParseResult): void => {
    const importedRows = result.toCreate.map(toNpdItemDetailRow);
    onRowsChange((current) => {
      const keepExisting = current.filter((row) => !isEmptyItemDetailRow(row));
      return keepExisting.length ? [...keepExisting, ...importedRows] : importedRows;
    });
    showSuccessToast(
      toastRef,
      importedRows.length === 1
        ? "1 item line imported."
        : `${importedRows.length} item lines imported.`,
    );
    setPreview(null);
    setValidationRows([]);
    setValidationVisible(false);
    onHide();
  };

  const handleImport = async (file: File): Promise<void> => {
    setImporting(true);
    try {
      const result = await parseNpdItemDetailsImportFile(
        file,
        rows.filter((row) => !isEmptyItemDetailRow(row)).map(toNpdItemDetailRecord),
        lookupOptionsByType,
        brand,
      );

      if (result.duplicates.length || result.errors.length) {
        setPreview(result);
        setValidationRows(
          buildImportValidationRows(
            result.duplicates,
            ImportValidationMessages.duplicateNpdItemDetails,
            result.errors,
          ),
        );
        setValidationVisible(true);
        onHide();
        return;
      }

      applyRecords(result);
    } catch (error) {
      showErrorToast(
        toastRef,
        error instanceof Error ? error.message : "Failed to import Item Details.",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <ImportDialog
        visible={visible}
        title="Import Item Details"
        importSectionTitle="Upload Item Details file"
        templateSectionHint="If you need a reference template, you can use this"
        templateFileName={templateDocument?.FileName}
        templateLoading={templateLoading}
        acceptedFormatsLabel={Config.ImportExport.AcceptedFormatsLabel}
        maxSizeLabel={Config.ImportExport.MaxSizeLabel}
        maxFileSizeBytes={Config.ImportExport.MaxFileSizeBytes}
        accept={Config.ImportExport.AcceptedSpreadsheetAccept}
        importing={importing}
        onHide={onHide}
        onDownloadTemplate={
          templateDocument
            ? () => {
                void downloadTemplateFile(templateDocument).catch(() => {
                  showErrorToast(toastRef, "Failed to download template.");
                });
              }
            : undefined
        }
        onFileRejected={(message) => showErrorToast(toastRef, message)}
        onImport={handleImport}
      />
      <ImportValidationDialog
        visible={validationVisible}
        sectionTitle="Item Details import validation"
        validationRows={validationRows}
        canProceed={Boolean(preview?.toCreate.length)}
        proceeding={importing}
        onHide={() => {
          setValidationVisible(false);
          setPreview(null);
        }}
        onProceed={async () => {
          if (preview?.toCreate.length) {
            applyRecords(preview);
          }
        }}
      />
    </>
  );
};

export default NpdItemDetailsImport;
