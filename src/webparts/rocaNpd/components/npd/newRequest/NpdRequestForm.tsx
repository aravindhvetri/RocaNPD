import * as React from "react";
import { Toast as PrimeToast } from "primereact/toast";
import { useAppDispatch } from "../../../../../store/hooks";
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
import { formatNpdLineItemProgress } from "./npdRequestFormHelpers";
import styles from "./NpdRequestForm.module.scss";

const NpdRequestForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const toastRef = React.useRef<PrimeToast>(null);
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
    successMessage,
    submitProgress,
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
  const isSaving = npdForm.saveStatus === "saving" || npdForm.saveStatus === "submitting";
  const isLoadingRecord = isRecordLoading;
  const { generalInfo } = npdForm;
  const loaderLabel = successMessage
    ? successMessage
    : isSaving
      ? npdForm.saveStatus === "submitting"
        ? "Submitting..."
        : "Saving..."
      : "Loading...";
  const progressCaption = submitProgress
    ? formatNpdLineItemProgress(submitProgress.current, submitProgress.total)
    : undefined;

  return (
    <form
      className={styles.page}
      autoComplete="off"
      onSubmit={(event) => event.preventDefault()}
    >
      <Toast ref={toastRef} />
      <LoaderOverlay
        visible={
          Boolean(successMessage) ||
          Boolean(submitProgress) ||
          isSaving ||
          isLoadingRecord ||
          (isBrandLoading && !npdForm.brandOptions.length) ||
          (npdForm.lookupOptionsStatus === "loading" &&
            !Object.keys(npdForm.lookupOptionsByType).length)
        }
        label={progressCaption ? undefined : loaderLabel}
        progressCurrent={submitProgress?.current}
        progressTotal={submitProgress?.total}
        progressPercent={submitProgress?.percent}
        progressCaption={progressCaption}
      />
      <h1 className={styles.title}>
        {formTitle}
      </h1>
      <div className={styles.sections}>
        <NpdGeneralInfoSection
          brand={generalInfo.brand}
          materialType={generalInfo.materialType}
          plantSource={generalInfo.plantSource}
          brandOptions={npdForm.brandOptions}
          plantSourceOptions={npdForm.plantSourceOptions}
          brandLoading={isBrandLoading || isLoadingRecord}
          plantSourceLoading={isPlantLoading || isLoadingRecord}
          readOnly={generalInfoReadOnly}
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
            loading={npdForm.otherDetailsStatus === "loading"}
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
            disabled={isSaving}
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
        saving={isSaving}
        mode={footerMode}
        onCancel={handleCancel}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onApprove={() => requestAction("Approve")}
        onReject={() => requestAction("Reject")}
        onRework={() => requestAction("Rework")}
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
