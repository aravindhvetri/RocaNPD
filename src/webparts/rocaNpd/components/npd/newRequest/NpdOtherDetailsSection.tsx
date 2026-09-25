import * as React from "react";
import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type {
  INpdOtherDetails,
  ISelectOption,
} from "../../../../../External/CommonServices/Interface";
import { InputText, MultiSelect } from "../../common/controls";
import NpdFormSectionPanel from "./NpdFormSectionPanel";
import styles from "./NpdOtherDetailsSection.module.scss";

export interface INpdOtherDetailsSectionProps {
  details: INpdOtherDetails;
  profitCenterOptions: ISelectOption[];
  loading?: boolean;
  readOnly?: boolean;
  onProfitCenterChange: (value: string) => void;
  onMaterialExtensionChange: (value: string) => void;
}

const NpdOtherDetailsSection: React.FC<INpdOtherDetailsSectionProps> = ({
  details,
  profitCenterOptions,
  loading = false,
  readOnly = false,
  onProfitCenterChange,
  onMaterialExtensionChange,
}) => {
  const profitOptions = React.useMemo(() => {
    const options = [...profitCenterOptions];
    const current = (details.profitCenter || "").trim();
    if (
      current &&
      !options.some(
        (option) =>
          String(option.value).trim().toLowerCase() === current.toLowerCase(),
      )
    ) {
      options.unshift({ label: current, value: current });
    }
    return options;
  }, [details.profitCenter, profitCenterOptions]);

  const profitValue = React.useMemo(
    () =>
      (details.profitCenter || "").trim()
        ? [(details.profitCenter || "").trim()]
        : [],
    [details.profitCenter],
  );

  return (
    <NpdFormSectionPanel
      title="Other Details"
      className={styles.panel}
      bodyClassName={styles.body}
    >
      <div className={styles.fieldGrid}>
        <InputText
          id="npdMisPlantCode"
          label={FieldLabels.PlantCode}
          value={details.plantCode}
          disabled
          onChange={() => undefined}
        />
        <InputText
          id="npdMisStorageLocation"
          label={FieldLabels.StorageLocation}
          value={details.storageLocation}
          disabled
          onChange={() => undefined}
        />
        <MultiSelect
          id="npdMisProfitCenter"
          label={FieldLabels.ProfitCenter}
          value={profitValue}
          options={profitOptions}
          placeholder="Select Profit Center"
          filter={!readOnly && !loading}
          display="comma"
          selectAll={false}
          selectionLimit={1}
          disabled={readOnly || loading}
          readOnly={readOnly}
          onChange={(value) => {
            const next = value.map((entry) => String(entry)).slice(-1);
            onProfitCenterChange(next[0] || "");
          }}
        />
        <InputText
          id="npdMisMrpGroup"
          label={FieldLabels.MRPGroup}
          value={details.mrpGroup}
          disabled
          onChange={() => undefined}
        />
        <InputText
          id="npdMisMrpController"
          label={FieldLabels.MRPController}
          value={details.mrpController}
          disabled
          onChange={() => undefined}
        />
        <InputText
          id="npdMisValuationClass"
          label={FieldLabels.ValuationClass}
          value={details.valuationClass}
          disabled
          onChange={() => undefined}
        />
        <InputText
          id="npdMisClassType"
          label={FieldLabels.ClassType}
          value={details.classType}
          disabled
          onChange={() => undefined}
        />
        <div className={styles.spanTwo}>
          <InputText
            id="npdMisMaterialExtension"
            label={FieldLabels.MaterialExtension}
            value={details.materialExtension}
            disabled={readOnly || loading}
            onChange={onMaterialExtensionChange}
          />
        </div>
      </div>
    </NpdFormSectionPanel>
  );
};

export default NpdOtherDetailsSection;
