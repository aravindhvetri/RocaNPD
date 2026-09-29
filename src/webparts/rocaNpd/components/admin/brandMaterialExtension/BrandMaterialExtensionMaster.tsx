import * as React from "react";
import { Toast as PrimeToast } from "primereact/toast";
import type { IBrandMaterialExtensionRow } from "../../../../../External/CommonServices/Interface";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import {
  clearBrandMaterialExtensionError,
  clearRocaMasterOptionsError,
} from "../../../../../store/slices/adminSlice";
import {
  createBrandMaterialExtension,
  fetchBrandMaterialExtensions,
  fetchRocaBrandOptions,
  fetchRocaPlantOptions,
  softDeleteBrandMaterialExtension,
  updateBrandMaterialExtension,
} from "../../../../../store/thunks/brandMaterialExtensionThunks";
import { exportBrandMaterialExtensionsToExcel } from "../../../../../External/CommonServices/brandMaterialExtensionService";
import { matchesAnySearchField } from "../../../../../External/CommonServices/searchTextUtils";
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
import BrandMaterialExtensionFormDialog, {
  type BrandMaterialExtensionDialogMode,
} from "./BrandMaterialExtensionFormDialog";
import BrandMaterialExtensionTable from "./BrandMaterialExtensionTable";
import BrandMaterialExtensionToolbar from "./BrandMaterialExtensionToolbar";
import styles from "./BrandMaterialExtensionMaster.module.scss";

interface IDeleteConfirmSnapshot {
  id: number;
  brand: string;
}

const DELETE_CONFIRM_RESET_MS = 300;

const BrandMaterialExtensionMaster: React.FC = () => {
  const dispatch = useAppDispatch();
  const toastRef = React.useRef<PrimeToast>(null);
  const initialized = useAppSelector((state) => state.app.initialized);
  const { items, status, error, rocaOptions } = useAppSelector(
    (state) => state.admin.brandMaterialExtension,
  );

  const [globalFilter, setGlobalFilter] = React.useState("");
  const [dialogVisible, setDialogVisible] = React.useState(false);
  const [dialogMode, setDialogMode] =
    React.useState<BrandMaterialExtensionDialogMode>("create");
  const [selectedItem, setSelectedItem] =
    React.useState<IBrandMaterialExtensionRow | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = React.useState(false);
  const [deleteConfirmSnapshot, setDeleteConfirmSnapshot] =
    React.useState<IDeleteConfirmSnapshot | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const isLoading = status === "loading";
  const isSaving = status === "saving";

  const listFetchPending = useListPageFetch(
    () =>
      Promise.all([
        dispatch(fetchBrandMaterialExtensions()),
        dispatch(fetchRocaBrandOptions()),
        dispatch(fetchRocaPlantOptions()),
      ]),
    [dispatch],
    initialized,
  );

  React.useEffect(() => {
    if (!error) {
      return;
    }
    showErrorToast(toastRef, error);
    dispatch(clearBrandMaterialExtensionError());
  }, [dispatch, error]);

  React.useEffect(() => {
    if (!rocaOptions.error) {
      return;
    }
    showErrorToast(toastRef, rocaOptions.error);
    dispatch(clearRocaMasterOptionsError());
  }, [dispatch, rocaOptions.error]);

  React.useEffect(() => {
    if (deleteConfirmVisible || !deleteConfirmSnapshot) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setDeleteConfirmSnapshot(null);
    }, DELETE_CONFIRM_RESET_MS);

    return () => window.clearTimeout(timer);
  }, [deleteConfirmVisible, deleteConfirmSnapshot]);

  const tableRows = React.useMemo<IBrandMaterialExtensionRow[]>(
    () => items.map((item) => ({ ...item })),
    [items],
  );

  const filteredRows = React.useMemo(() => {
    return tableRows.filter((row) =>
      matchesAnySearchField([row.Brand, row.Plant], globalFilter),
    );
  }, [globalFilter, tableRows]);

  const handleExportClick = (): void => {
    if (!filteredRows.length) {
      showWarningToast(toastRef, "No records to export.");
      return;
    }

    setIsExporting(true);
    window.setTimeout(() => {
      try {
        exportBrandMaterialExtensionsToExcel(filteredRows);
        showSuccessToast(toastRef, "Export completed successfully.");
      } catch {
        showErrorToast(toastRef, "Failed to export brand material extensions.");
      } finally {
        setIsExporting(false);
      }
    }, 0);
  };

  const openCreateDialog = (): void => {
    if (rocaOptions.brandsStatus === "loading") {
      showWarningToast(toastRef, "Brand options are still loading. Please wait.");
      return;
    }

    if (!rocaOptions.brands.length) {
      showWarningToast(
        toastRef,
        "Brand options are not available. Please refresh and try again.",
      );
      return;
    }

    setDialogMode("create");
    setSelectedItem(null);
    setDialogVisible(true);
  };

  const openEditDialog = (row: IBrandMaterialExtensionRow): void => {
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

  const handleValidationWarning = (message: string): void => {
    showWarningToast(toastRef, message);
  };

  const handleSave = async (brand: string, plants: string[]): Promise<void> => {
    const mode = dialogMode;
    const editingItem = selectedItem;
    setDialogVisible(false);
    setSelectedItem(null);

    try {
      if (mode === "create") {
        await dispatch(createBrandMaterialExtension({ brand, plants })).unwrap();
        showSuccessToast(
          toastRef,
          "Brand material extension created successfully.",
        );
      } else if (editingItem) {
        await dispatch(
          updateBrandMaterialExtension({
            id: editingItem.Id,
            brand,
            plants,
          }),
        ).unwrap();
        showSuccessToast(
          toastRef,
          "Brand material extension updated successfully.",
        );
      }
    } catch {
      // Error toast handled via slice error effect.
    }
  };

  const requestDelete = (row: IBrandMaterialExtensionRow): void => {
    setDeleteConfirmSnapshot({ id: row.Id, brand: row.Brand });
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
        await dispatch(softDeleteBrandMaterialExtension(snapshot.id)).unwrap();
        showSuccessToast(toastRef, `"${snapshot.brand}" deleted successfully.`);
      } catch {
        // Error toast handled via slice error effect.
      }
    })();
  };

  const showPageLoader =
    listFetchPending || isLoading || isSaving || isExporting;
  const pageLoaderLabel = "Processing";


  return (
    <section className={styles.master}>
      <Toast ref={toastRef} />
      <LoaderOverlay visible={showPageLoader} label={pageLoaderLabel} />

      <BrandMaterialExtensionToolbar
        searchValue={globalFilter}
        filtersActive={Boolean(globalFilter.trim())}
        exportDisabled={!filteredRows.length}
        onSearchChange={setGlobalFilter}
        onResetFilters={() => setGlobalFilter("")}
        onExport={handleExportClick}
        onAddNew={openCreateDialog}
      />

      <div className={styles.tablePanel}>
        <MasterTablePanel>
          <BrandMaterialExtensionTable
            rows={filteredRows}
            loading={false}
            globalFilter=""
            onEdit={openEditDialog}
            onDelete={requestDelete}
          />
        </MasterTablePanel>
      </div>

      <BrandMaterialExtensionFormDialog
        visible={dialogVisible}
        mode={dialogMode}
        item={selectedItem}
        existingItems={items}
        brandOptions={rocaOptions.brands}
        plantOptions={rocaOptions.plants}
        brandsLoading={rocaOptions.brandsStatus === "loading"}
        plantsLoading={rocaOptions.plantsStatus === "loading"}
        saving={isSaving}
        onHide={closeDialog}
        onSave={handleSave}
        onValidationWarning={handleValidationWarning}
      />

      <DeleteConfirmDialog
        visible={deleteConfirmVisible && deleteConfirmSnapshot !== null}
        entityName="Brand Material Extension"
        itemName={deleteConfirmSnapshot?.brand ?? ""}
        onCancel={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default BrandMaterialExtensionMaster;
