import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type { ILookupType } from "../../../../../External/CommonServices/Interface";

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

  const isDuplicate = existingItems.some(
    (item) =>
      item.Id !== editingId &&
      item.Title.trim().toLowerCase() === trimmed.toLowerCase(),
  );

  if (isDuplicate) {
    return `${FieldLabels.LookupTypeName} already exists.`;
  }

  return null;
}
