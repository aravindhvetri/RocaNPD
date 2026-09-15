import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type { ILookup } from "../../../../../External/CommonServices/Interface";

export function validateLookupForm(
  lookupTypeId: number | null,
  lookupName: string,
  lookupCode: string,
  existingItems: ILookup[],
  editingId?: number,
): string | null {
  if (!lookupTypeId) {
    return `${FieldLabels.LookupType} is required.`;
  }

  const trimmedName = lookupName.trim();

  if (!trimmedName) {
    return `${FieldLabels.LookupName} is required.`;
  }

  if (trimmedName.length > 255) {
    return `${FieldLabels.LookupName} must be 255 characters or less.`;
  }

  const trimmedCode = lookupCode.trim();

  if (!trimmedCode) {
    return `${FieldLabels.LookupCode} is required.`;
  }

  if (trimmedCode.length > 255) {
    return `${FieldLabels.LookupCode} must be 255 characters or less.`;
  }

  const isDuplicate = existingItems.some(
    (item) =>
      item.Id !== editingId &&
      item.LookupTypeId === lookupTypeId &&
      item.LookupName.trim().toLowerCase() === trimmedName.toLowerCase(),
  );

  if (isDuplicate) {
    return `"${trimmedName}" already exists.`;
  }

  return null;
}
