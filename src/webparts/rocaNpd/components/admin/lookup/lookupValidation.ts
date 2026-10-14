import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type { ILookup } from "../../../../../External/CommonServices/Interface";

function normalizeLookupValue(value: string): string {
  return value.trim().toLowerCase();
}

/** True when another active Lookup already uses this Code under the same Lookup Type. */
export function isLookupCodeDuplicateInType(
  existingItems: ILookup[],
  lookupTypeId: number,
  lookupCode: string,
  editingId?: number,
): boolean {
  const codeKey = normalizeLookupValue(lookupCode);
  if (!codeKey || !lookupTypeId) {
    return false;
  }

  return existingItems.some(
    (item) =>
      item.Id !== editingId &&
      item.LookupTypeId === lookupTypeId &&
      normalizeLookupValue(item.LookupCode) === codeKey,
  );
}

/**
 * Required fields + Lookup Code unique within the selected Lookup Type.
 * Lookup Name may repeat; the same Code may exist under a different Type.
 */
export function validateLookupForm(
  lookupTypeId: number | null,
  lookupName: string,
  lookupCode: string,
  existingItems: ILookup[] = [],
  editingId?: number,
): string | null {
  if (!lookupTypeId) {
    return `${FieldLabels.LookupType} is required.`;
  }

  const trimmedCode = lookupCode.trim();

  if (!trimmedCode) {
    return `${FieldLabels.LookupCode} is required.`;
  }

  if (trimmedCode.length > 255) {
    return `${FieldLabels.LookupCode} must be 255 characters or less.`;
  }

  const trimmedName = lookupName.trim();

  if (!trimmedName) {
    return `${FieldLabels.LookupName} is required.`;
  }

  if (trimmedName.length > 255) {
    return `${FieldLabels.LookupName} must be 255 characters or less.`;
  }

  if (
    isLookupCodeDuplicateInType(
      existingItems,
      lookupTypeId,
      trimmedCode,
      editingId,
    )
  ) {
    return `"${trimmedCode}" already exists as a Lookup Code under this Lookup Type.`;
  }

  return null;
}
