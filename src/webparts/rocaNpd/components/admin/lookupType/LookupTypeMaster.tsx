import * as React from "react";
import { Toast as PrimeToast } from "primereact/toast";
import { Config, FieldLabels } from "../../../../../External/CommonServices/Config";
import type {
  IImportParseResult,
  ILookupTypeRow,
  ITemplateDocument,
} from "../../../../../External/CommonServices/Interface";
import {
  buildImportValidationRows,
  ImportValidationMessages,
  type IImportValidationRow,
} from "../../../../../External/CommonServices/importService";
import { validateLookupTypeDeleteAllowed } from "../../../../../External/CommonServices/dependencyValidationService";
import { exportLookupTypesToExcel } from "../../../../../External/CommonServices/lookupTypeService";
import {
  downloadTemplateFile,
  fetchTemplateByType,
} from "../../../../../External/CommonServices/templateService";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import { clearLookupTypeError } from "../../../../../store/slices/adminSlice";
import {
  commitImportLookupTypes,
  createLookupType,
  fetchLookupTypes,
  previewImportLookupTypes,
  softDeleteLookupType,
  updateLookupType,
} from "../../../../../store/thunks/lookupTypeThunks";
import { ImportDialog, ImportValidationDialog } from "../../common/importExport";
import {
  DeleteBlockedDialog,
  DeleteConfirmDialog,
  LoaderOverlay,
  MasterTablePanel,
  showErrorToast,
  showSuccessToast,
  showWarningToast,
  Toast,
} from "../../common/controls";
import LookupTypeFormDialog, {
  type LookupTypeDialogMode,
} from "./LookupTypeFormDialog";
import LookupTypeTable from "./LookupTypeTable";
import LookupTypeToolbar from "./LookupTypeToolbar";
import styles from "./LookupTypeMaster.module.scss";

interface IDeleteConfirmSnapshot {
  id: number;
  title: string;
}

const DELETE_CONFIRM_RESET_MS = 300;

const LookupTypeMaster: React.FC = () => {
  const dispatch = useAppDispatch();
  const toastRef = React.useRef<PrimeToast>(null);
  const { items, status, error } = useAppSelector((state) => state.admin.lookupType);

  const [globalFilter, setGlobalFilter] = React.useState("");
  const [dialogVisible, setDialogVisible] = React.useState(false);
  const [importVisible, setImportVisible] = React.useState(false);
  const [dialogMode, setDialogMode] =
    React.useState<LookupTypeDialogMode>("create");
  const [selectedItem, setSelectedItem] = React.useState<ILookupTypeRow | null>(
    null,
  );
  const [deleteConfirmVisible, setDeleteConfirmVisible] = React.useState(false);
  const [deleteConfirmSnapshot, setDeleteConfirmSnapshot] =
    React.useState<IDeleteConfirmSnapshot | null>(null);
  const [deleteBlockedVisible, setDeleteBlockedVisible] = React.useState(false);
  const [deleteBlockedMessage, setDeleteBlockedMessage] = React.useState("");
  const [templateDocument, setTemplateDocument] =
    React.useState<ITemplateDocument | null>(null);
  const [templateLoading, setTemplateLoading] = React.useState(false);
  const [importValidationRows, setImportValidationRows] = React.useState<
    IImportValidationRow[]
  >([]);
  const [importValidationVisible, setImportValidationVisible] =
    React.useState(false);
  const [importPreview, setImportPreview] =
    React.useState<IImportParseResult | null>(null);

  const isLoading = status === "loading";
  const isSaving = status === "saving";

  React.useEffect(() => {
    void dispatch(fetchLookupTypes());
  }, [dispatch]);

  React.useEffect(() => {
    if (!error) {
      return;
    }
    showErrorToast(toastRef, error);
    dispatch(clearLookupTypeError());
  }, [dispatch, error]);

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

    void fetchTemplateByType(Config.TemplateTypes.LookupType)
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

  const tableRows = React.useMemo<ILookupTypeRow[]>(
    () => items.map((item) => ({ ...item })),
    [items],
  );

  const filteredRows = React.useMemo<ILookupTypeRow[]>(() => {
    const query = globalFilter.trim().toLowerCase();
    if (!query) {
      return tableRows;
    }

    return tableRows.filter((row) =>
      row.Title.toLowerCase().includes(query),
    );
  }, [globalFilter, tableRows]);

  const openCreateDialog = (): void => {
    setDialogMode("create");
    setSelectedItem(null);
    setDialogVisible(true);
  };

  const openEditDialog = (row: ILookupTypeRow): void => {
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

  const handleSave = async (title: string): Promise<void> => {
    try {
      if (dialogMode === "create") {
        await dispatch(createLookupType(title)).unwrap();
        showSuccessToast(toastRef, "Lookup type created successfully.");
      } else if (selectedItem) {
        await dispatch(
          updateLookupType({ id: selectedItem.Id, title }),
        ).unwrap();
        showSuccessToast(toastRef, "Lookup type updated successfully.");
      }
      setDialogVisible(false);
      setSelectedItem(null);
    } catch {
      // Error toast handled via slice error effect.
    }
  };

  const requestDelete = (row: ILookupTypeRow): void => {
    void (async () => {
      try {
        const blockedMessage = await validateLookupTypeDeleteAllowed(
          row.Id,
          row.Title,
        );

        if (blockedMessage) {
          setDeleteBlockedMessage(blockedMessage);
          setDeleteBlockedVisible(true);
          return;
        }

        setDeleteConfirmSnapshot({ id: row.Id, title: row.Title });
        setDeleteConfirmVisible(true);
      } catch {
        showErrorToast(toastRef, "Unable to verify whether this lookup type can be deleted.");
      }
    })();
  };

  const closeDeleteBlockedDialog = (): void => {
    setDeleteBlockedVisible(false);
    setDeleteBlockedMessage("");
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
          softDeleteLookupType({ id: snapshot.id, title: snapshot.title }),
        ).unwrap();
        showSuccessToast(toastRef, `"${snapshot.title}" was deleted.`);
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
      const result = await dispatch(previewImportLookupTypes(file)).unwrap();
      const validationRows = buildImportValidationRows(
        result.duplicates,
        ImportValidationMessages.duplicateLookupType,
        result.errors,
      );

      if (validationRows.length) {
        setImportValidationRows(validationRows);
        setImportPreview(result);
        setImportVisible(false);
        setImportValidationVisible(true);
        return;
      }

      const count = await dispatch(
        commitImportLookupTypes(result.toCreate),
      ).unwrap();
      showSuccessToast(
        toastRef,
        `${count} lookup type(s) imported successfully.`,
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
        commitImportLookupTypes(importPreview.toCreate),
      ).unwrap();
      showSuccessToast(
        toastRef,
        `${count} lookup type(s) imported successfully.`,
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

    try {
      exportLookupTypesToExcel(filteredRows);
      showSuccessToast(toastRef, "Export completed successfully.");
    } catch {
      showErrorToast(toastRef, "Failed to export lookup types.");
    }
  };

  const showPageLoader = isLoading || isSaving;
  const pageLoaderLabel = isSaving ? "Saving..." : "Loading...";

  return (
    <section className={styles.master}>
      <Toast ref={toastRef} />
      <LoaderOverlay visible={showPageLoader} label={pageLoaderLabel} />

      <LookupTypeToolbar
        searchValue={globalFilter}
        filtersActive={Boolean(globalFilter.trim())}
        onSearchChange={setGlobalFilter}
        onResetFilters={() => setGlobalFilter("")}
        onImport={handleImportClick}
        onExport={handleExportClick}
        onAddNew={openCreateDialog}
      />

      <div className={styles.tablePanel}>
        <MasterTablePanel>
          <LookupTypeTable
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
        importSectionTitle="Import Lookup Type Master"
        templateSectionHint="If you need a reference template, you can use this"
        templateFileName={templateDocument?.FileName}
        templateLoading={templateLoading}
        acceptedFormatsLabel={Config.ImportExport.AcceptedFormatsLabel}
        maxSizeLabel={Config.ImportExport.MaxSizeLabel}
        maxFileSizeBytes={Config.ImportExport.MaxFileSizeBytes}
        accept={Config.ImportExport.AcceptedSpreadsheetAccept}
        importing={isSaving}
        onHide={closeImportDialog}
        onDownloadTemplate={handleDownloadTemplate}
        onFileRejected={(message) => showWarningToast(toastRef, message)}
        onImport={handleImportFile}
      />

      <ImportValidationDialog
        visible={importValidationVisible}
        sectionTitle="Import Lookup Type Master"
        recordColumnHeader={FieldLabels.LookupTypeName}
        validationRows={importValidationRows}
        canProceed={Boolean(importPreview?.toCreate.length)}
        proceeding={isSaving}
        onHide={closeImportValidationDialog}
        onProceed={handleImportProceed}
      />

      <LookupTypeFormDialog
        visible={dialogVisible}
        mode={dialogMode}
        item={selectedItem}
        existingItems={items}
        saving={isSaving}
        onHide={closeDialog}
        onSave={handleSave}
        onValidationWarning={handleValidationWarning}
      />

      <DeleteConfirmDialog
        visible={deleteConfirmVisible && deleteConfirmSnapshot !== null}
        entityName="Lookup Type"
        itemName={deleteConfirmSnapshot?.title ?? ""}
        onCancel={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />

      <DeleteBlockedDialog
        visible={deleteBlockedVisible}
        message={deleteBlockedMessage}
        onClose={closeDeleteBlockedDialog}
      />
    </section>
  );
};

export default LookupTypeMaster;
