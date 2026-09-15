import * as React from "react";
import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type {
  IBrandMaterialExtension,
  ISelectOption,
} from "../../../../../External/CommonServices/Interface";
import {
  Button,
  Dialog,
  Dropdown,
  MultiSelect,
} from "../../common/controls";
import type { IDropdownOption } from "../../common/controls/Dropdown";
import { validateBrandMaterialExtensionForm } from "./brandMaterialExtensionValidation";
import styles from "./BrandMaterialExtensionFormDialog.module.scss";

export type BrandMaterialExtensionDialogMode = "create" | "edit";

export interface IBrandMaterialExtensionFormDialogProps {
  visible: boolean;
  mode: BrandMaterialExtensionDialogMode;
  item: IBrandMaterialExtension | null;
  existingItems: IBrandMaterialExtension[];
  brandOptions: ISelectOption[];
  plantOptions: ISelectOption[];
  brandsLoading: boolean;
  plantsLoading: boolean;
  saving: boolean;
  onHide: () => void;
  onSave: (brand: string, plants: string[]) => Promise<void>;
  onValidationWarning: (message: string) => void;
}

const BrandMaterialExtensionFormDialog: React.FC<
  IBrandMaterialExtensionFormDialogProps
> = ({
  visible,
  mode,
  item,
  existingItems,
  brandOptions,
  plantOptions,
  brandsLoading,
  plantsLoading,
  saving,
  onHide,
  onSave,
  onValidationWarning,
}) => {
  const [brand, setBrand] = React.useState<string | null>(null);
  const [plants, setPlants] = React.useState<string[]>([]);

  const dropdownBrandOptions = React.useMemo<IDropdownOption[]>(
    () =>
      brandOptions.map((option) => ({
        label: String(option.label),
        value: String(option.value),
      })),
    [brandOptions],
  );

  const dropdownPlantOptions = React.useMemo<IDropdownOption[]>(() => {
    const knownValues = new Set(
      plantOptions.map((option) => String(option.value)),
    );
    const extras = plants
      .filter((plant) => !knownValues.has(plant))
      .map((plant) => ({ label: plant, value: plant }));

    return [
      ...plantOptions.map((option) => ({
        label: String(option.label),
        value: String(option.value),
      })),
      ...extras,
    ];
  }, [plantOptions, plants]);

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    setBrand(item?.Brand ? item.Brand : null);
    setPlants(item?.Plants ?? []);
  }, [item, visible]);

  const dialogTitle =
    mode === "create"
      ? "Add Brand Material Extension"
      : "Edit Brand Material Extension";
  const saveLabel = mode === "create" ? "Add" : "Update";
  const controlsDisabled = saving;

  const handleSave = async (): Promise<void> => {
    const validationError = validateBrandMaterialExtensionForm(
      brand ?? "",
      plants,
      brandOptions,
      plantOptions,
      existingItems,
      mode === "edit" ? item?.Id : undefined,
    );

    if (validationError) {
      onValidationWarning(validationError);
      return;
    }

    await onSave((brand ?? "").trim(), plants);
  };

  return (
    <Dialog
      visible={visible}
      title={dialogTitle}
      width="28rem"
      className={styles.formDialog}
      onHide={onHide}
      footer={
        <div className={styles.footer}>
          <Button
            label="Cancel"
            variant="secondary"
            size="sm"
            disabled={controlsDisabled}
            onClick={onHide}
          />
          <Button
            label={saveLabel}
            size="sm"
            loading={saving}
            disabled={controlsDisabled}
            onClick={() => {
              void handleSave();
            }}
          />
        </div>
      }
    >
      <div className={styles.formFields}>
        <Dropdown
          id="brandMaterialExtensionBrand"
          label={FieldLabels.Brand}
          required
          value={brand}
          options={dropdownBrandOptions}
          placeholder="Select Brand"
          filter
          disabled={controlsDisabled || brandsLoading}
          className={styles.formField}
          onChange={(value) =>
            setBrand(value === null || value === undefined ? null : String(value))
          }
        />
        <MultiSelect
          id="brandMaterialExtensionPlant"
          label={FieldLabels.Plant}
          required
          value={plants}
          options={dropdownPlantOptions}
          placeholder="Select Plant"
          display="comma"
          filter
          selectAll
          disabled={controlsDisabled || plantsLoading}
          className={styles.formField}
          onChange={(values) => setPlants(values.map(String))}
        />
      </div>
    </Dialog>
  );
};

export default BrandMaterialExtensionFormDialog;
