import * as React from "react";
import { FieldLabels } from "../../../../../External/CommonServices/Config";
import { getNpdMaterialTypeOptions } from "../../../../../External/CommonServices/npdFormDataService";
import type { ISelectOption } from "../../../../../External/CommonServices/Interface";
import {
  selectHasPlantSourceMaterialType,
  selectIsFinishedProductsMaterialType,
} from "../../../../../store/slices/npdFormSlice";
import { Dropdown } from "../../common/controls";
import NpdFormSectionPanel from "./NpdFormSectionPanel";
import styles from "./NpdGeneralInfoSection.module.scss";

export interface INpdGeneralInfoSectionProps {
  brand: string | null;
  materialType: string | null;
  plantSource: string | null;
  brandOptions: ISelectOption[];
  plantSourceOptions: ISelectOption[];
  brandLoading: boolean;
  plantSourceLoading: boolean;
  onBrandChange: (value: string | null) => void;
  onMaterialTypeChange: (value: string | null) => void;
  onPlantSourceChange: (value: string | null) => void;
}

const NpdGeneralInfoSection: React.FC<INpdGeneralInfoSectionProps> = ({
  brand,
  materialType,
  plantSource,
  brandOptions,
  plantSourceOptions,
  brandLoading,
  plantSourceLoading,
  onBrandChange,
  onMaterialTypeChange,
  onPlantSourceChange,
}) => {
  const materialTypeOptions = React.useMemo(() => getNpdMaterialTypeOptions(), []);
  const isFinishedProducts = selectIsFinishedProductsMaterialType(materialType);
  const hasPlantSourceMaterialType = selectHasPlantSourceMaterialType(materialType);
  const plantDisabled =
    !hasPlantSourceMaterialType || plantSourceLoading || !materialType;

  const plantHelperText = !materialType
    ? "Select Material Type above to view applicable Plant / Source"
    : undefined;

  return (
    <NpdFormSectionPanel title="General Information">
      <div className={styles.fieldGrid}>
        <Dropdown
          id="npdBrand"
          label={FieldLabels.BrandMg1}
          required
          value={brand}
          options={brandOptions}
          placeholder="Select Brand"
          disabled={brandLoading}
          filter
          onChange={(value) =>
            onBrandChange(typeof value === "string" ? value : null)
          }
        />
        <Dropdown
          id="npdMaterialType"
          label={FieldLabels.MaterialType}
          required
          value={materialType}
          options={materialTypeOptions}
          placeholder="Select Material Type"
          onChange={(value) =>
            onMaterialTypeChange(typeof value === "string" ? value : null)
          }
        />
        <Dropdown
          id="npdPlantSource"
          label={FieldLabels.PlantSource}
          required
          value={plantSource}
          options={plantSourceOptions}
          placeholder={
            hasPlantSourceMaterialType
              ? "Select Plant / Source"
              : "Select Material Type first"
          }
          disabled={plantDisabled}
          helperText={plantHelperText}
          filter={isFinishedProducts}
          onChange={(value) =>
            onPlantSourceChange(typeof value === "string" ? value : null)
          }
        />
      </div>
    </NpdFormSectionPanel>
  );
};

export default NpdGeneralInfoSection;
