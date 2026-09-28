import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type { ILookupType } from "../../../../../External/CommonServices/Interface";

function normalizeLookupTypeTitle(value: string): string {
  return value.trim().toLowerCase();
}

export function validateLookupTypeTitle(
  title: string,
  existingItems: ILookupType[],
  editingId?: number,
): string | null {
  const trimmed = title.trim();

  if (!trimmed) {
    return `${FieldLabels.LookupTypeName} is required.`;
  }

  if (trimmed.length > 255) {
    return `${FieldLabels.LookupTypeName} must be 255 characters or less.`;
  }

  const titleKey = normalizeLookupTypeTitle(trimmed);
  const isDuplicate = existingItems.some(
    (item) =>
      item.Id !== editingId &&
      normalizeLookupTypeTitle(item.Title) === titleKey,
  );

  if (isDuplicate) {
    return `${FieldLabels.LookupTypeName} already exists.`;
  }

  return null;
}
