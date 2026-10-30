import * as React from "react";
import { Toast as PrimeToast } from "primereact/toast";
import { exportNpdItemDetailsToExcel } from "../../../../../External/CommonServices/npdItemDetailsImportService";
import { isNpdRequestIdTitle } from "../../../../../External/CommonServices/npdRequestIdService";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import {
  setNpdBrand,
  setNpdMaterialType,
  setNpdOtherDetailsMaterialExtension,
  setNpdOtherDetailsProfitCenter,
  setNpdPlantSource,
} from "../../../../../store/slices/npdFormSlice";
import {
  LoaderOverlay,
  showErrorToast,
  showSuccessToast,
  Toast,
} from "../../common/controls";
import NpdApproverRemarks from "./NpdApproverRemarks";
import NpdAuditLogTable from "./NpdAuditLogTable";
import NpdGeneralInfoSection from "./NpdGeneralInfoSection";
import NpdItemDetailsImport from "./NpdItemDetailsImport";
import NpdItemDetailsSection from "./NpdItemDetailsSection";
import {
  isEmptyItemDetailRow,
  toNpdItemDetailRecord,
} from "./npdItemDetailsConfig";
import NpdOtherDetailsSection from "./NpdOtherDetailsSection";
import NpdRequestFormFooter from "./NpdRequestFormFooter";
import NpdEditingRestrictedDialog from "../tabLock/NpdEditingRestrictedDialog";
import { useNpdRequestFormController } from "./useNpdRequestFormController";
import styles from "./NpdRequestForm.module.scss";

const NpdRequestForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const toastRef = React.useRef<PrimeToast>(null);
  const globalProcessing = useAppSelector((state) => state.ui.globalProcessing);
  const {
    itemRows,
    setItemRows,
    npdForm,
    importVisible,
    setImportVisible,
    approverRemarks,
    setApproverRemarks,
    auditLogs,
    showApproverRemarks,
    showAuditLog,
    formTitle,
    isRecordLoading,
    footerMode,
    generalInfoReadOnly,
    itemDetailsReadOnly,
    showItemDetailsExport,
    isMisCoordinatorActing,
    showOtherDetails,
    otherDetailsReadOnly,
    hasAnyItemPostedToSap,
    handleCancel,
    handleSaveDraft,
    handleSubmit,
    requestAction,
    tabRestriction,
    handleTabLockDashboard,
    handleTabLockReload,
  } = useNpdRequestFormController(toastRef);

  const isBrandLoading = npdForm.brandOptionsStatus === "loading";
  const isPlantLoading = npdForm.plantSourceStatus === "loading";
  const isSaving =
    npdForm.saveStatus === "saving" || npdForm.saveStatus === "submitting";
  const isLoadingRecord = isRecordLoading;
  const { generalInfo } = npdForm;
  // Global SAP Datas progress (MainComponent) replaces the plain form overlay.
  const showFormLoader =
    (isSaving ||
      isLoadingRecord ||
      (isBrandLoading && !npdForm.brandOptions.length) ||
      (npdForm.lookupOptionsStatus === "loading" &&
        !Object.keys(npdForm.lookupOptionsByType).length)) &&
    !globalProcessing?.showItemProgress;

  return (
    <form
      className={styles.page}
      autoComplete="off"
      onSubmit={(event) => event.preventDefault()}
    >
      <Toast ref={toastRef} />
      <LoaderOverlay visible={showFormLoader} label="Processing" />
      <h1 className={styles.title}>{formTitle}</h1>
      <div className={styles.sections}>
        <NpdGeneralInfoSection
          brand={generalInfo.brand}
          materialType={generalInfo.materialType}
          plantSource={generalInfo.plantSource}
          brandOptions={npdForm.brandOptions}
          plantSourceOptions={npdForm.plantSourceOptions}
          readOnly={generalInfoReadOnly}
          brandLoading={isBrandLoading}
          plantSourceLoading={isPlantLoading}
          onBrandChange={(value) => dispatch(setNpdBrand(value))}
          onMaterialTypeChange={(value) => dispatch(setNpdMaterialType(value))}
          onPlantSourceChange={(value) => dispatch(setNpdPlantSource(value))}
        />
        <NpdItemDetailsSection
          brand={generalInfo.brand}
          rows={itemRows}
          lookupOptionsByType={npdForm.lookupOptionsByType}
          readOnly={itemDetailsReadOnly}
          isMisCoordinatorActing={isMisCoordinatorActing}
          showExport={showItemDetailsExport}
          showSapStatus={showOtherDetails}
          onRowsChange={setItemRows}
          onImportClick={() => setImportVisible(true)}
          onExportClick={() => {
            const exportRows = itemRows
              .filter((row) => !isEmptyItemDetailRow(row))
              .map(toNpdItemDetailRecord);
            if (!exportRows.length) {
              return;
            }
            try {
              exportNpdItemDetailsToExcel(exportRows, generalInfo.brand);
              showSuccessToast(toastRef, "Export completed successfully.");
            } catch {
              showErrorToast(toastRef, "Failed to export Item Details.");
            }
          }}
        />
        {showOtherDetails ? (
          <NpdOtherDetailsSection
            details={npdForm.otherDetails}
            profitCenterOptions={npdForm.profitCenterOptions}
            readOnly={otherDetailsReadOnly}
            onProfitCenterChange={(value) =>
              dispatch(setNpdOtherDetailsProfitCenter(value))
            }
            onMaterialExtensionChange={(value) =>
              dispatch(setNpdOtherDetailsMaterialExtension(value))
            }
          />
        ) : null}
        {showApproverRemarks ? (
          <NpdApproverRemarks
            value={approverRemarks}
            onChange={setApproverRemarks}
          />
        ) : null}
        {showAuditLog ? (
          <NpdAuditLogTable
            rows={auditLogs}
            requestStatus={npdForm.requestStatus}
            workflowSteps={npdForm.workflowSteps}
          />
        ) : null}
      </div>
      <NpdRequestFormFooter
        mode={footerMode}
        isResubmit={
          // Rework, or Draft saved after Rework (already has NPD Request ID).
          (npdForm.requestStatus || "").trim().toLowerCase() === "rework" ||
          (npdForm.requestStatus || "").trim().toLowerCase() === "in rework" ||
          ((npdForm.requestStatus || "").trim().toLowerCase() === "draft" &&
            isNpdRequestIdTitle(npdForm.requestTitle || ""))
        }
        showSaveDraft={
          (npdForm.requestStatus || "").trim().toLowerCase() !== "rework" &&
          (npdForm.requestStatus || "").trim().toLowerCase() !== "in rework"
        }
        hideMisRejectRework={
          footerMode === "mis-pending" && hasAnyItemPostedToSap
        }
        onCancel={handleCancel}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onApprove={() => requestAction("Approve")}
        onRework={() => requestAction("Rework")}
        onReject={() => requestAction("Reject")}
      />
      <NpdItemDetailsImport
        visible={importVisible}
        brand={generalInfo.brand}
        lookupOptionsByType={npdForm.lookupOptionsByType}
        isMisCoordinatorActing={isMisCoordinatorActing}
        toastRef={toastRef}
        onHide={() => setImportVisible(false)}
        onRowsChange={setItemRows}
      />
      <NpdEditingRestrictedDialog
        restriction={tabRestriction}
        onGoToDashboard={handleTabLockDashboard}
        onReload={handleTabLockReload}
      />
    </form>
  );
};

export default NpdRequestForm;
