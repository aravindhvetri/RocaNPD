import * as React from "react";
import { Toast as PrimeToast } from "primereact/toast";
import { flushSync } from "react-dom";
import { Config } from "../../../../../External/CommonServices/Config";
import type {
  INpdItemDetailsImportParseResult,
  ISelectOption,
  ITemplateDocument,
} from "../../../../../External/CommonServices/Interface";
import {
  buildImportValidationRows,
  type IImportValidationRow,
} from "../../../../../External/CommonServices/importService";
import { parseNpdItemDetailsImportFile, getNpdItemDetailsRequiredHeaders } from "../../../../../External/CommonServices/npdItemDetailsImportService";
import {
  downloadTemplateFile,
  fetchTemplateByType,
} from "../../../../../External/CommonServices/templateService";
import {
  awaitUiPaint,
  ImportDialog,
  ImportValidationDialog,
} from "../../common/importExport";
import { LoaderOverlay, showErrorToast, showSuccessToast } from "../../common/controls";
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
  isMisCoordinatorActing?: boolean;
  toastRef: React.RefObject<PrimeToast>;
  onHide: () => void;
  onRowsChange: React.Dispatch<React.SetStateAction<INpdItemDetailRow[]>>;
}

const NpdItemDetailsImport: React.FC<INpdItemDetailsImportProps> = ({
  visible,
  brand,
  rows,
  lookupOptionsByType,
  isMisCoordinatorActing = false,
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
    const importedRows = result.toCreate.map((record) =>
      toNpdItemDetailRow({
        ...record,
        isMisAdded: Boolean(isMisCoordinatorActing || record.isMisAdded),
      }),
    );
    onRowsChange((current) => {
      const keepExisting = current.filter((row) => !isEmptyItemDetailRow(row));
      if (!keepExisting.length) {
        return importedRows;
      }
      // MIS imports stay at the top of the Item Details grid.
      return isMisCoordinatorActing
        ? [...importedRows, ...keepExisting]
        : [...keepExisting, ...importedRows];
    });
    showSuccessToast(
      toastRef,
      importedRows.length === 1
        ? "1 item line imported successfully."
        : `${importedRows.length} item lines imported successfully.`,
    );
    setPreview(null);
    setValidationRows([]);
    setValidationVisible(false);
  };

  const handleImport = async (file: File): Promise<void> => {
    flushSync(() => {
      setImporting(true);
    });
    try {
      // Let LoaderOverlay paint before spreadsheet parse / row apply.
      // Critical for small files that would otherwise finish in the same tick.
      await awaitUiPaint();

      const result = await parseNpdItemDetailsImportFile(
        file,
        rows.filter((row) => !isEmptyItemDetailRow(row)).map(toNpdItemDetailRecord),
        lookupOptionsByType,
        brand,
      );

      if (result.duplicates.length || result.errors.length) {
        setPreview(result);
        // Duplicate strings already name the field(s). Pass them as errors so
        // the Validation Error column shows that text, not a generic label.
        setValidationRows(
          buildImportValidationRows([], "", [
            ...result.duplicates,
            ...result.errors,
          ]),
        );
        setValidationVisible(true);
        return;
      }

      applyRecords(result);
      // Yield after grid apply so the loader stays until React can commit rows.
      await awaitUiPaint();
    } catch (error) {
      showErrorToast(
        toastRef,
        error instanceof Error ? error.message : "Failed to import Item Details.",
      );
    } finally {
      // Close Import dialog only after work finishes so small imports cannot
      // leave a stuck dialog mask from closing mid-busy.
      onHide();
      setImporting(false);
    }
  };

  return (
    <>
      {/* Survives ImportDialog hide (validation / success) for any row count. */}
      <LoaderOverlay visible={importing} label="Processing" />
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
        expectedHeaders={getNpdItemDetailsRequiredHeaders(brand)}
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
        canProceed={
          Boolean(preview?.toCreate.length) &&
          !(preview?.duplicates.length)
        }
        proceeding={importing}
        onHide={() => {
          setValidationVisible(false);
          setPreview(null);
        }}
        onProceed={async () => {
          if (!preview?.toCreate.length) {
            return;
          }
          flushSync(() => {
            setImporting(true);
          });
          try {
            await awaitUiPaint();
            applyRecords(preview);
            await awaitUiPaint();
          } finally {
            setImporting(false);
          }
        }}
      />
    </>
  );
};

export default NpdItemDetailsImport;
