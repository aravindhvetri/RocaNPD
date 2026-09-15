import * as React from "react";
import { Toast as PrimeToast } from "primereact/toast";
import { Config } from "../../../../../External/CommonServices/Config";
import type { IWorkflowConfigTableRow } from "../../../../../External/CommonServices/Interface";
import { groupWorkflowStepsByRequestType } from "../../../../../External/CommonServices/workflowConfigurationUtils";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import { clearWorkflowConfigError } from "../../../../../store/slices/adminSlice";
import {
  fetchNpdRoleOptions,
  fetchWorkflowConfigurations,
  saveWorkflowConfiguration,
  softDeleteWorkflowConfiguration,
} from "../../../../../store/thunks/workflowConfigurationThunks";
import {
  DeleteConfirmDialog,
  LoaderOverlay,
  MasterTablePanel,
  showErrorToast,
  showSuccessToast,
  showWarningToast,
  Toast,
} from "../../common/controls";
import WorkflowConfigFormDialog, {
  type WorkflowConfigDialogMode,
} from "./WorkflowConfigFormDialog";
import WorkflowConfigurationTable from "./WorkflowConfigurationTable";
import WorkflowConfigurationToolbar from "./WorkflowConfigurationToolbar";
import styles from "./WorkflowConfigurationMaster.module.scss";

interface IDeleteConfirmSnapshot {
  requestType: string;
  stepIds: number[];
}

const DELETE_CONFIRM_RESET_MS = 300;

const WorkflowConfigurationMaster: React.FC = () => {
  const dispatch = useAppDispatch();
  const toastRef = React.useRef<PrimeToast>(null);
  const initialized = useAppSelector((state) => state.app.initialized);
  const { steps, status, error, npdRoles, npdRolesStatus } = useAppSelector(
    (state) => state.admin.workflowConfig,
  );

  const [globalFilter, setGlobalFilter] = React.useState("");
  const [dialogVisible, setDialogVisible] = React.useState(false);
  const [dialogMode, setDialogMode] =
    React.useState<WorkflowConfigDialogMode>("create");
  const [selectedRow, setSelectedRow] =
    React.useState<IWorkflowConfigTableRow | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = React.useState(false);
  const [deleteConfirmSnapshot, setDeleteConfirmSnapshot] =
    React.useState<IDeleteConfirmSnapshot | null>(null);

  const isLoading = status === "loading";
  const isSaving = status === "saving";

  React.useEffect(() => {
    if (!initialized) {
      return;
    }

    void dispatch(fetchWorkflowConfigurations());
    void dispatch(fetchNpdRoleOptions());
  }, [dispatch, initialized]);

  React.useEffect(() => {
    if (!error) {
      return;
    }
    showErrorToast(toastRef, error);
    dispatch(clearWorkflowConfigError());
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

  const tableRows = React.useMemo<IWorkflowConfigTableRow[]>(
    () => groupWorkflowStepsByRequestType(steps).map((row) => ({ ...row })),
    [steps],
  );

  const configuredRequestTypes = React.useMemo(
    () => new Set(tableRows.map((row) => row.RequestType.trim())),
    [tableRows],
  );

  const openCreateDialog = (): void => {
    const allRequestTypes = Object.values(Config.WorkflowRequestTypes);
    const availableRequestTypes = allRequestTypes.filter(
      (requestType) => !configuredRequestTypes.has(requestType),
    );

    if (!availableRequestTypes.length) {
      showWarningToast(
        toastRef,
        "Workflow configuration already exists for all request types.",
      );
      return;
    }

    if (npdRolesStatus === "loading") {
      showWarningToast(toastRef, "NPD role options are still loading. Please wait.");
      return;
    }

    setDialogMode("create");
    setSelectedRow(null);
    setDialogVisible(true);
  };

  const openEditDialog = (row: IWorkflowConfigTableRow): void => {
    setDialogMode("edit");
    setSelectedRow(row);
    setDialogVisible(true);
  };

  const closeDialog = (): void => {
    if (isSaving) {
      return;
    }
    setDialogVisible(false);
    setSelectedRow(null);
  };

  const handleValidationWarning = (message: string): void => {
    showWarningToast(toastRef, message);
  };

  const handleSave = async (
    requestType: string,
    formSteps: { currentRole: string; nextRole: string }[],
    existingStepIds?: number[],
  ): Promise<void> => {
    try {
      await dispatch(
        saveWorkflowConfiguration({
          requestType,
          steps: formSteps,
          existingStepIds,
        }),
      ).unwrap();

      showSuccessToast(
        toastRef,
        dialogMode === "create"
          ? "Workflow configuration created successfully."
          : "Workflow configuration updated successfully.",
      );
      setDialogVisible(false);
      setSelectedRow(null);
    } catch {
      // Error toast handled via slice error effect.
    }
  };

  const requestDelete = (row: IWorkflowConfigTableRow): void => {
    setDeleteConfirmSnapshot({
      requestType: row.RequestType,
      stepIds: row.StepIds,
    });
    setDeleteConfirmVisible(true);
  };

  const closeDeleteConfirm = (): void => {
    setDeleteConfirmVisible(false);
  };

  const confirmDelete = (): void => {
    const snapshot = deleteConfirmSnapshot;
    if (!snapshot?.stepIds.length) {
      return;
    }

    closeDeleteConfirm();

    void (async () => {
      try {
        await dispatch(
          softDeleteWorkflowConfiguration(snapshot.stepIds),
        ).unwrap();
        showSuccessToast(
          toastRef,
          `Workflow for "${snapshot.requestType}" was deleted.`,
        );
      } catch {
        // Error toast handled via slice error effect.
      }
    })();
  };

  const showPageLoader = isLoading || isSaving;
  const pageLoaderLabel = isSaving ? "Saving..." : "Loading...";

  return (
    <section className={styles.master}>
      <Toast ref={toastRef} />
      <LoaderOverlay visible={showPageLoader} label={pageLoaderLabel} />

      <WorkflowConfigurationToolbar
        searchValue={globalFilter}
        filtersActive={Boolean(globalFilter.trim())}
        onSearchChange={setGlobalFilter}
        onResetFilters={() => setGlobalFilter("")}
        onAddNew={openCreateDialog}
      />

      <div className={styles.tablePanel}>
        <MasterTablePanel>
          <WorkflowConfigurationTable
            rows={tableRows}
            loading={false}
            globalFilter={globalFilter}
            onEdit={openEditDialog}
            onDelete={requestDelete}
          />
        </MasterTablePanel>
      </div>

      <WorkflowConfigFormDialog
        visible={dialogVisible}
        mode={dialogMode}
        item={selectedRow}
        existingRows={tableRows}
        npdRoleOptions={npdRoles}
        npdRolesLoading={npdRolesStatus === "loading"}
        saving={isSaving}
        onHide={closeDialog}
        onSave={handleSave}
        onValidationWarning={handleValidationWarning}
      />

      <DeleteConfirmDialog
        visible={deleteConfirmVisible && deleteConfirmSnapshot !== null}
        entityName="Workflow Configuration"
        itemName={deleteConfirmSnapshot?.requestType ?? ""}
        onCancel={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default WorkflowConfigurationMaster;
