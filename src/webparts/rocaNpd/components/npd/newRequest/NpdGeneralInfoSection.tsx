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
  readOnly?: boolean;
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
  readOnly = false,
  onBrandChange,
  onMaterialTypeChange,
  onPlantSourceChange,
}) => {
  const materialTypeOptions = React.useMemo(() => getNpdMaterialTypeOptions(), []);
  const isFinishedProducts = selectIsFinishedProductsMaterialType(materialType);
  const hasPlantSourceMaterialType = selectHasPlantSourceMaterialType(materialType);
  const plantDisabled =
    readOnly ||
    !hasPlantSourceMaterialType ||
    plantSourceLoading ||
    !materialType;

  const plantHelperText = !materialType
    ? "Select Material Type above to view applicable Plant / Source"
    : undefined;

  // MIS / VH may not have Initiator brand options — keep saved Brand visible
  const resolvedBrandOptions = React.useMemo(() => {
    const options = [...brandOptions];
    const current = (brand || "").trim();
    if (!current) {
      return options;
    }

    const existingIndex = options.findIndex(
      (option) =>
        String(option.value).trim().toLowerCase() === current.toLowerCase(),
    );
    if (existingIndex >= 0) {
      // Normalize value casing so PrimeReact Dropdown can match the selection
      const matched = options[existingIndex];
      if (String(matched.value) !== current) {
        const next = [...options];
        next[existingIndex] = { label: current, value: current };
        return next;
      }
      return options;
    }

    return [{ label: current, value: current }, ...options];
  }, [brand, brandOptions]);

  const resolvedPlantSourceOptions = React.useMemo(() => {
    const options = [...plantSourceOptions];
    const current = (plantSource || "").trim();
    if (!current) {
      return options;
    }
    if (
      options.some(
        (option) =>
          String(option.value).trim().toLowerCase() === current.toLowerCase(),
      )
    ) {
      return options;
    }
    return [{ label: current, value: current }, ...options];
  }, [plantSource, plantSourceOptions]);

  return (
    <NpdFormSectionPanel
      title="General Information"
      className={styles.generalInfoPanel}
      bodyClassName={styles.generalInfoBody}
    >
      <div className={styles.fieldGrid}>
        <Dropdown
          id="npdBrand"
          label={FieldLabels.BrandMg1}
          required
          value={brand}
          options={resolvedBrandOptions}
          placeholder="Select Brand"
          disabled={brandLoading || readOnly}
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
          disabled={readOnly}
          onChange={(value) =>
            onMaterialTypeChange(typeof value === "string" ? value : null)
          }
        />
        <Dropdown
          id="npdPlantSource"
          label={FieldLabels.PlantSource}
          required
          value={plantSource}
          options={resolvedPlantSourceOptions}
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
