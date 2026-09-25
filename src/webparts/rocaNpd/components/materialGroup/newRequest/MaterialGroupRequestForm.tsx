import * as React from "react";
import { Toast as PrimeToast } from "primereact/toast";
import { Config } from "../../../../../External/CommonServices/Config";
import { isMgRequestIdTitle } from "../../../../../External/CommonServices/materialGroupIdService";
import { LoaderOverlay, Toast } from "../../common/controls";
import MasterDetailsSection from "./MasterDetailsSection";
import MaterialGroupApproverRemarks from "./MaterialGroupApproverRemarks";
import MaterialGroupAuditLogTable from "./MaterialGroupAuditLogTable";
import MaterialGroupFormFooter from "./MaterialGroupFormFooter";
import SelectMastersSection from "./SelectMastersSection";
import { useMaterialGroupFormController } from "./useMaterialGroupFormController";
import styles from "./MaterialGroupRequestForm.module.scss";

const MaterialGroupRequestForm: React.FC = () => {
  const toastRef = React.useRef<PrimeToast>(null);
  const {
    mode,
    configs,
    configsLoading,
    isLoadingRecord,
    selectedConfigIds,
    entriesByConfigId,
    currentRequestId,
    currentStatus,
    initiatorName,
    auditLogs,
    isSaving,
    isSubmitting,
    showApproverRemarks,
    approverRemarks,
    approverRemarksLabel,
    setApproverRemarks,
    handleToggleConfig,
    handleSelectAll,
    handleClearAll,
    handleAddRow,
    handleRemoveRow,
    handleUpdateRow,
    handleCancel,
    handleSaveDraft,
    handleSubmit,
    handleConsultantAction,
  } = useMaterialGroupFormController(toastRef);

  const isReadOnly = mode === "view";
  const isConsultantMode = mode === "consultant-edit";
  const isInitiatorScreen =
    mode === "create" || mode === "edit" || mode === "view";

  const headerTitle = React.useMemo(() => {
    const status = (currentStatus || "").trim().toLowerCase();
    const isCompleted =
      status === Config.MaterialGroupStatus.Completed.toLowerCase();
    const isDraft =
      !status ||
      status === Config.MaterialGroupStatus.Draft.toLowerCase();

    // Draft (or create): never show dashes / placeholder IDs
    if (isDraft || mode === "create") {
      if (mode === "create") {
        return "Create New Material Group Request";
      }
      return "Material Group Request";
    }

    // When status is Completed (e.g. MIS Post to SAP / Consultant completed) or mode is view:
    // any approver (MIS Coordinator, Vertical Head, Consultant) sees "View Material Group"
    if (isCompleted || mode === "view") {
      return "View Material Group";
    }

    if (mode === "consultant-edit") {
      return "Consultant Review & Codification";
    }

    return "Edit Material Group";
  }, [currentStatus, mode]);

  const headerSubtitle = React.useMemo(() => {
    if (isConsultantMode) {
      return `Review initiator descriptions, enter mandatory SAP Codes, and complete or request rework from ${initiatorName || "Initiator"}.`;
    }
    if (isReadOnly) {
      return "View configured material group categories, descriptions, and codified values.";
    }
    return "Select master categories, configure descriptions and submit for Consultant verification and SAP codification.";
  }, [isConsultantMode, isReadOnly, initiatorName]);

  const badgeText = React.useMemo(() => {
    const idPrefix = currentRequestId ? `${currentRequestId} • ` : "";
    if (currentStatus) {
      return `${idPrefix}${currentStatus} Workflow`;
    }
    return `${idPrefix}Draft Initiator Workflow`;
  }, [currentRequestId, currentStatus]);

  const loaderLabel = isSaving
    ? isSubmitting
      ? "Submitting..."
      : "Saving..."
    : "Loading...";

  return (
    <div className={styles.page}>
      <Toast ref={toastRef} />
      <LoaderOverlay
        visible={
          isSaving ||
          isLoadingRecord ||
          (configsLoading && configs.length === 0)
        }
        label={loaderLabel}
      />

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <i className="pi pi-file-edit" />
          </div>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>{headerTitle}</h1>
            <p className={styles.subtitle}>{headerSubtitle}</p>
          </div>
        </div>

        <div className={styles.headerRight}>
          <span className={styles.workflowBadge}>{badgeText}</span>
        </div>
      </div>

      <div className={styles.content}>
        <SelectMastersSection
          configs={configs}
          selectedConfigIds={selectedConfigIds}
          loading={configsLoading}
          readOnly={isReadOnly || isConsultantMode}
          onToggleConfig={handleToggleConfig}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearAll}
        />

        <MasterDetailsSection
          configs={configs}
          selectedConfigIds={selectedConfigIds}
          entriesByConfigId={entriesByConfigId}
          readOnly={isReadOnly}
          isConsultantMode={isConsultantMode}
          onAddRow={handleAddRow}
          onRemoveRow={handleRemoveRow}
          onUpdateRow={handleUpdateRow}
        />

        {showApproverRemarks ? (
          <MaterialGroupApproverRemarks
            label={approverRemarksLabel}
            value={approverRemarks}
            required
            disabled={isSaving}
            onChange={setApproverRemarks}
          />
        ) : null}

        {isInitiatorScreen && !isConsultantMode ? (
          <MaterialGroupAuditLogTable
            rows={auditLogs}
            requestStatus={currentStatus}
          />
        ) : null}
      </div>

      <MaterialGroupFormFooter
        mode={mode}
        saving={isSaving}
        submitting={isSubmitting}
        onCancel={handleCancel}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onConsultantAction={handleConsultantAction}
      />
    </div>
  );
};

export default MaterialGroupRequestForm;
