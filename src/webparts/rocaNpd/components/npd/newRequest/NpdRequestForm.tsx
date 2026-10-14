import * as React from "react";
import { Toast as PrimeToast } from "primereact/toast";
import { isNpdRequestIdTitle } from "../../../../../External/CommonServices/npdRequestIdService";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import {
  setNpdBrand,
  setNpdMaterialType,
  setNpdOtherDetailsMaterialExtension,
  setNpdOtherDetailsProfitCenter,
  setNpdPlantSource,
} from "../../../../../store/slices/npdFormSlice";
import { LoaderOverlay, Toast } from "../../common/controls";
import NpdApproverRemarks from "./NpdApproverRemarks";
import NpdAuditLogTable from "./NpdAuditLogTable";
import NpdGeneralInfoSection from "./NpdGeneralInfoSection";
import NpdItemDetailsImport from "./NpdItemDetailsImport";
import NpdItemDetailsSection from "./NpdItemDetailsSection";
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
    isMisCoordinatorActing,
    showOtherDetails,
    otherDetailsReadOnly,
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
          onRowsChange={setItemRows}
          onImportClick={() => setImportVisible(true)}
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
        rows={itemRows}
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
