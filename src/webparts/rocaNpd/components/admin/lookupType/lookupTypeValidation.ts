import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type { ILookupType } from "../../../../../External/CommonServices/Interface";
import {
  containsSpecialCharacters,
  sanitizeAlphanumericTextInput,
  specialCharactersNotAllowedMessage,
} from "../../../../../External/CommonServices/textInputSanitize";

function normalizeLookupTypeTitle(value: string): string {
  return value.trim().toLowerCase();
}

/** @deprecated Prefer sanitizeAlphanumericTextInput from textInputSanitize. */
export const sanitizeLookupTypeTextInput = sanitizeAlphanumericTextInput;

export function validateLookupTypeTitle(
  title: string,
  existingItems: ILookupType[],
  editingId?: number,
): string | null {
  const trimmed = title.trim();

  if (!trimmed) {
    return `${FieldLabels.LookupTypeName} is required.`;
  }

  if (containsSpecialCharacters(trimmed)) {
    return specialCharactersNotAllowedMessage(FieldLabels.LookupTypeName);
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
