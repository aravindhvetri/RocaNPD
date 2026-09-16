import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Toast as PrimeToast } from "primereact/toast";
import { Config } from "../../../../../External/CommonServices/Config";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import {
  clearNpdFormError,
  resetNpdFormState,
  selectHasPlantSourceMaterialType,
  setNpdBrand,
  setNpdMaterialType,
  setNpdPlantSource,
} from "../../../../../store/slices/npdFormSlice";
import {
  fetchNpdInitiatorBrandOptions,
  fetchNpdPlantSourceOptions,
} from "../../../../../store/thunks/npdFormThunks";
import { LoaderOverlay, showErrorToast, Toast } from "../../common/controls";
import { createEmptyNpdItemDetailRow } from "./npdItemDetailsConfig";
import type { INpdItemDetailRow } from "./npdItemDetails.types";
import { validateNpdRequestForm } from "./npdItemDetailsValidation";
import NpdGeneralInfoSection from "./NpdGeneralInfoSection";
import NpdItemDetailsSection from "./NpdItemDetailsSection";
import NpdRequestFormFooter from "./NpdRequestFormFooter";
import styles from "./NpdRequestForm.module.scss";

const NpdRequestForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toastRef = React.useRef<PrimeToast>(null);
  const initialized = useAppSelector((state) => state.app.initialized);
  const userEmail = useAppSelector((state) => state.app.userEmail);
  const userLoginName = useAppSelector((state) => state.app.userLoginName);
  const {
    generalInfo,
    brandOptions,
    plantSourceOptions,
    brandOptionsStatus,
    plantSourceStatus,
    error,
  } = useAppSelector((state) => state.npdForm);
  const [itemRows, setItemRows] = React.useState<INpdItemDetailRow[]>(() => [
    createEmptyNpdItemDetailRow(),
  ]);

  const isBrandLoading = brandOptionsStatus === "loading";
  const isPlantLoading = plantSourceStatus === "loading";
  const hasPlantSourceMaterialType = selectHasPlantSourceMaterialType(
    generalInfo.materialType,
  );

  React.useEffect(() => {
    if (!initialized) {
      return;
    }

    dispatch(resetNpdFormState());
    setItemRows([createEmptyNpdItemDetailRow()]);

    if (!userEmail && !userLoginName) {
      return;
    }

    void dispatch(fetchNpdInitiatorBrandOptions());
  }, [dispatch, initialized, userEmail, userLoginName]);

  React.useEffect(() => {
    if (!initialized || !generalInfo.materialType || !hasPlantSourceMaterialType) {
      return;
    }

    void dispatch(fetchNpdPlantSourceOptions(generalInfo.materialType));
  }, [dispatch, generalInfo.materialType, hasPlantSourceMaterialType, initialized]);

  React.useEffect(() => {
    if (!error) {
      return;
    }

    showErrorToast(toastRef, error);
    dispatch(clearNpdFormError());
  }, [dispatch, error]);

  const showValidationErrors = (messages: string[]): void => {
    if (!messages.length) {
      return;
    }

    showErrorToast(toastRef, messages.join("\n"), "Validation");
  };

  const handleCancel = (): void => {
    navigate(Config.Routes.NpdAll);
  };

  const handleSaveDraft = (): void => {
    showErrorToast(toastRef, "Save Draft will be configured in the next phase.");
  };

  const handleSubmit = (): void => {
    const messages = validateNpdRequestForm(generalInfo, itemRows);
    if (messages.length) {
      showValidationErrors(messages);
      return;
    }

    showErrorToast(toastRef, "Submit Request will be configured in the next phase.");
  };

  return (
    <div className={styles.page}>
      <Toast ref={toastRef} />
      <LoaderOverlay visible={isBrandLoading && !brandOptions.length} />
      <h1 className={styles.title}>New NPD Request</h1>
      <div className={styles.sections}>
        <NpdGeneralInfoSection
          brand={generalInfo.brand}
          materialType={generalInfo.materialType}
          plantSource={generalInfo.plantSource}
          brandOptions={brandOptions}
          plantSourceOptions={plantSourceOptions}
          brandLoading={isBrandLoading}
          plantSourceLoading={isPlantLoading}
          onBrandChange={(value) => dispatch(setNpdBrand(value))}
          onMaterialTypeChange={(value) => dispatch(setNpdMaterialType(value))}
          onPlantSourceChange={(value) => dispatch(setNpdPlantSource(value))}
        />
        <NpdItemDetailsSection
          brand={generalInfo.brand}
          rows={itemRows}
          onRowsChange={setItemRows}
        />
      </div>
      <NpdRequestFormFooter
        onCancel={handleCancel}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default NpdRequestForm;
