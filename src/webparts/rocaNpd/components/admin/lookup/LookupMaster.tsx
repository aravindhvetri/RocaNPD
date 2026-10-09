import * as React from "react";
import { Toast as PrimeToast } from "primereact/toast";
import { Config } from "../../../../../External/CommonServices/Config";
import type {
  ILookupImportParseResult,
  ILookupRow,
  ITemplateDocument,
} from "../../../../../External/CommonServices/Interface";
import {
  buildImportValidationRows,
  ImportValidationMessages,
  type IImportValidationRow,
} from "../../../../../External/CommonServices/importService";
import { exportLookupsToExcel, LOOKUP_IMPORT_HEADERS } from "../../../../../External/CommonServices/lookupService";
import { matchesAnySearchField } from "../../../../../External/CommonServices/searchTextUtils";
import {
  downloadTemplateFile,
  fetchTemplateByType,
} from "../../../../../External/CommonServices/templateService";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import {
  clearLookupError,
  clearLookupTypeError,
} from "../../../../../store/slices/adminSlice";
import {
  commitImportLookups,
  createLookup,
  fetchLookups,
  previewImportLookups,
  softDeleteLookup,
  updateLookup,
} from "../../../../../store/thunks/lookupThunks";
import { fetchLookupTypes } from "../../../../../store/thunks/lookupTypeThunks";
import { ImportDialog, ImportValidationDialog } from "../../common/importExport";
import {
  DeleteConfirmDialog,
  LoaderOverlay,
  MasterTablePanel,
  showErrorToast,
  showSuccessToast,
  showWarningToast,
  Toast,
} from "../../common/controls";
import { useListPageFetch } from "../../common/hooks";
import LookupFormDialog, { type LookupDialogMode } from "./LookupFormDialog";
import LookupTable from "./LookupTable";
import LookupToolbar from "./LookupToolbar";
import styles from "./LookupMaster.module.scss";

interface IDeleteConfirmSnapshot {
  id: number;
  lookupName: string;
}

const DELETE_CONFIRM_RESET_MS = 300;

const LookupMaster: React.FC = () => {
  const dispatch = useAppDispatch();
  const toastRef = React.useRef<PrimeToast>(null);
  const {
    items,
    status,
    error,
  } = useAppSelector((state) => state.admin.lookup);
  const {
    items: lookupTypes,
    status: lookupTypeStatus,
    error: lookupTypeError,
  } = useAppSelector((state) => state.admin.lookupType);

  const [globalFilter, setGlobalFilter] = React.useState("");
  const [dialogVisible, setDialogVisible] = React.useState(false);
  const [importVisible, setImportVisible] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<LookupDialogMode>("create");
  const [selectedItem, setSelectedItem] = React.useState<ILookupRow | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = React.useState(false);
  const [deleteConfirmSnapshot, setDeleteConfirmSnapshot] =
    React.useState<IDeleteConfirmSnapshot | null>(null);
  const [templateDocument, setTemplateDocument] =
    React.useState<ITemplateDocument | null>(null);
  const [templateLoading, setTemplateLoading] = React.useState(false);
  const [importValidationRows, setImportValidationRows] = React.useState<
    IImportValidationRow[]
  >([]);
  const [importValidationVisible, setImportValidationVisible] =
    React.useState(false);
  const [importPreview, setImportPreview] =
    React.useState<ILookupImportParseResult | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const isLoading = status === "loading" || lookupTypeStatus === "loading";
  const isSaving = status === "saving";

  const listFetchPending = useListPageFetch(
    () =>
      Promise.all([dispatch(fetchLookups()), dispatch(fetchLookupTypes())]),
    [dispatch],
  );

  React.useEffect(() => {
    if (!error) {
      return;
    }
    showErrorToast(toastRef, error);
    dispatch(clearLookupError());
  }, [dispatch, error]);

  React.useEffect(() => {
    if (!lookupTypeError) {
      return;
    }
    showErrorToast(toastRef, lookupTypeError);
    dispatch(clearLookupTypeError());
  }, [dispatch, lookupTypeError]);

  React.useEffect(() => {
    if (deleteConfirmVisible || !deleteConfirmSnapshot) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setDeleteConfirmSnapshot(null);
    }, DELETE_CONFIRM_RESET_MS);

    return () => window.clearTimeout(timer);
  }, [deleteConfirmVisible, deleteConfirmSnapshot]);

  React.useEffect(() => {
    if (!importVisible) {
      setTemplateDocument(null);
      return;
    }

    let cancelled = false;
    setTemplateLoading(true);

    void fetchTemplateByType(Config.TemplateTypes.Lookup)
      .then((template) => {
        if (!cancelled) {
          setTemplateDocument(template);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTemplateDocument(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTemplateLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [importVisible]);

  const tableRows = React.useMemo<ILookupRow[]>(
    () => items.map((item) => ({ ...item })),
    [items],
  );

  const filteredRows = React.useMemo<ILookupRow[]>(() => {
    return tableRows.filter((row) =>
      matchesAnySearchField(
        [row.LookupName, row.LookupCode, row.LookupTypeTitle],
        globalFilter,
      ),
    );
  }, [globalFilter, tableRows]);

  const openCreateDialog = (): void => {
    setDialogMode("create");
    setSelectedItem(null);
    setDialogVisible(true);
  };

  const openEditDialog = (row: ILookupRow): void => {
    setDialogMode("edit");
    setSelectedItem(row);
    setDialogVisible(true);
  };

  const closeDialog = (): void => {
    if (isSaving) {
      return;
    }
    setDialogVisible(false);
    setSelectedItem(null);
  };

  const clearImportValidation = (): void => {
    setImportValidationRows([]);
    setImportPreview(null);
    setImportValidationVisible(false);
  };

  const closeImportDialog = (): void => {
    if (isSaving) {
      return;
    }
    setImportVisible(false);
  };

  const closeImportValidationDialog = (): void => {
    if (isSaving) {
      return;
    }
    clearImportValidation();
  };

  const handleValidationWarning = (message: string): void => {
    showWarningToast(toastRef, message);
  };

  const handleSave = async (
    lookupTypeId: number,
    lookupName: string,
    lookupCode: string,
  ): Promise<void> => {
    const mode = dialogMode;
    const editingItem = selectedItem;
    // Close immediately so the page loader (not the dialog) shows during save.
    setDialogVisible(false);
    setSelectedItem(null);

    try {
      if (mode === "create") {
        await dispatch(
          createLookup({ lookupTypeId, lookupName, lookupCode }),
        ).unwrap();
        showSuccessToast(toastRef, "Lookup created successfully.");
      } else if (editingItem) {
        await dispatch(
          updateLookup({
            id: editingItem.Id,
            lookupTypeId,
            lookupName,
            lookupCode,
          }),
        ).unwrap();
        showSuccessToast(toastRef, "Lookup updated successfully.");
      }
    } catch {
      // Error toast handled via slice error effect.
    }
  };

  const requestDelete = (row: ILookupRow): void => {
    setDeleteConfirmSnapshot({ id: row.Id, lookupName: row.LookupName });
    setDeleteConfirmVisible(true);
  };

  const closeDeleteConfirm = (): void => {
    setDeleteConfirmVisible(false);
  };

  const confirmDelete = (): void => {
    const snapshot = deleteConfirmSnapshot;
    if (!snapshot) {
      return;
    }

    closeDeleteConfirm();

    void (async () => {
      try {
        await dispatch(
          softDeleteLookup({
            id: snapshot.id,
            lookupName: snapshot.lookupName,
          }),
        ).unwrap();
        showSuccessToast(
          toastRef,
          `"${snapshot.lookupName}" deleted successfully.`,
        );
      } catch {
        // Error toast handled via slice error effect.
      }
    })();
  };

  const handleImportClick = (): void => {
    setImportVisible(true);
  };

  const handleDownloadTemplate = (): void => {
    if (!templateDocument) {
      showWarningToast(toastRef, "Template is not available.");
      return;
    }

    void (async () => {
      try {
        await downloadTemplateFile(templateDocument);
      } catch {
        showErrorToast(toastRef, "Failed to download template.");
      }
    })();
  };

  const handleImportFile = async (file: File): Promise<void> => {
    try {
      const result = await dispatch(previewImportLookups(file)).unwrap();
      const validationRows = buildImportValidationRows(
        result.duplicates,
        ImportValidationMessages.duplicateLookupName,
        result.errors,
      );

      if (validationRows.length) {
        setImportValidationRows(validationRows);
        setImportPreview(result);
        setImportVisible(false);
        setImportValidationVisible(true);
        return;
      }

      const count = await dispatch(commitImportLookups(result.toCreate)).unwrap();
      showSuccessToast(
        toastRef,
        `${count} lookup record(s) imported successfully.`,
      );
      closeImportDialog();
      clearImportValidation();
    } catch {
      // Error toast handled via slice error effect.
    }
  };

  const handleImportProceed = async (): Promise<void> => {
    if (!importPreview?.toCreate.length) {
      return;
    }

    try {
      const count = await dispatch(
        commitImportLookups(importPreview.toCreate),
      ).unwrap();
      showSuccessToast(
        toastRef,
        `${count} lookup record(s) imported successfully.`,
      );
      clearImportValidation();
    } catch {
      // Error toast handled via slice error effect.
    }
  };

  const handleExportClick = (): void => {
    if (!filteredRows.length) {
      showWarningToast(toastRef, "No records to export.");
      return;
    }

    setIsExporting(true);
    window.setTimeout(() => {
      try {
        exportLookupsToExcel(filteredRows);
        showSuccessToast(toastRef, "Export completed successfully.");
      } catch {
        showErrorToast(toastRef, "Failed to export lookups.");
      } finally {
        setIsExporting(false);
      }
    }, 0);
  };

  const showPageLoader =
    listFetchPending || isLoading || isSaving || isExporting;
  const pageLoaderLabel = "Processing";


  return (
    <section className={styles.master}>
      <Toast ref={toastRef} />
      <LoaderOverlay visible={showPageLoader} label={pageLoaderLabel} />

      <LookupToolbar
        searchValue={globalFilter}
        filtersActive={Boolean(globalFilter.trim())}
        exportDisabled={!filteredRows.length}
        onSearchChange={setGlobalFilter}
        onResetFilters={() => setGlobalFilter("")}
        onImport={handleImportClick}
        onExport={handleExportClick}
        onAddNew={openCreateDialog}
      />

      <div className={styles.tablePanel}>
        <MasterTablePanel>
          <LookupTable
            rows={tableRows}
            loading={false}
            globalFilter={globalFilter}
            onEdit={openEditDialog}
            onDelete={requestDelete}
          />
        </MasterTablePanel>
      </div>

      <ImportDialog
        visible={importVisible}
        importSectionTitle="Import Lookup Master"
        templateSectionHint="If you need a reference template, you can use this"
        templateFileName={templateDocument?.FileName}
        templateLoading={templateLoading}
        acceptedFormatsLabel={Config.ImportExport.AcceptedFormatsLabel}
        maxSizeLabel={Config.ImportExport.MaxSizeLabel}
        maxFileSizeBytes={Config.ImportExport.MaxFileSizeBytes}
        accept={Config.ImportExport.AcceptedSpreadsheetAccept}
        importing={isSaving}
        expectedHeaders={LOOKUP_IMPORT_HEADERS}
        onHide={closeImportDialog}
        onDownloadTemplate={handleDownloadTemplate}
        onFileRejected={(message) => showWarningToast(toastRef, message)}
        onImport={handleImportFile}
      />

      <ImportValidationDialog
        visible={importValidationVisible}
        sectionTitle="Import Lookup Master"
        validationRows={importValidationRows}
        canProceed={Boolean(importPreview?.toCreate.length)}
        proceeding={isSaving}
        onHide={closeImportValidationDialog}
        onProceed={handleImportProceed}
      />

      <LookupFormDialog
        visible={dialogVisible}
        mode={dialogMode}
        item={selectedItem}
        existingItems={items}
        lookupTypes={lookupTypes}
        saving={isSaving}
        onHide={closeDialog}
        onSave={handleSave}
        onValidationWarning={handleValidationWarning}
      />

      <DeleteConfirmDialog
        visible={deleteConfirmVisible && deleteConfirmSnapshot !== null}
        entityName="Lookup"
        itemName={deleteConfirmSnapshot?.lookupName ?? ""}
        onCancel={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default LookupMaster;
