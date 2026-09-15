import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type {
  IBrandMaterialExtension,
  ISelectOption,
} from "../../../../../External/CommonServices/Interface";

export function validateBrandMaterialExtensionForm(
  brand: string,
  plants: string[],
  brandOptions: ISelectOption[],
  plantOptions: ISelectOption[],
  existingItems: IBrandMaterialExtension[],
  editingId?: number,
): string | null {
  const trimmedBrand = brand.trim();

  if (!trimmedBrand) {
    return `${FieldLabels.Brand} is required.`;
  }

  if (!plants.length) {
    return `${FieldLabels.Plant} is required.`;
  }

  const brandExists = brandOptions.some(
    (option) =>
      String(option.label).trim().toLowerCase() === trimmedBrand.toLowerCase(),
  );

  if (!brandExists) {
    return `Selected ${FieldLabels.Brand} is not available in BrandMaster.`;
  }

  const plantValues = new Set(
    plantOptions.map((option) => String(option.value).trim().toLowerCase()),
  );
  const invalidPlant = plants.find(
    (plant) => !plantValues.has(plant.trim().toLowerCase()),
  );

  if (invalidPlant) {
    return `Selected ${FieldLabels.Plant} "${invalidPlant}" is not available in Plant Master.`;
  }

  const isDuplicate = existingItems.some(
    (item) =>
      item.Id !== editingId &&
      item.Brand.trim().toLowerCase() === trimmedBrand.toLowerCase(),
  );

  if (isDuplicate) {
    return `"${trimmedBrand}" already exists.`;
  }

  return null;
}
