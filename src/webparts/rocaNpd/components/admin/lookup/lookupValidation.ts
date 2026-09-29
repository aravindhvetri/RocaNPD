import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type { ILookup } from "../../../../../External/CommonServices/Interface";
import {
  containsSpecialCharacters,
  sanitizeAlphanumericTextInput,
  specialCharactersNotAllowedMessage,
} from "../../../../../External/CommonServices/textInputSanitize";

function normalizeLookupValue(value: string): string {
  return value.trim().toLowerCase();
}

/** @deprecated Prefer sanitizeAlphanumericTextInput from textInputSanitize. */
export const sanitizeLookupTextInput = sanitizeAlphanumericTextInput;

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

  const trimmedCode = lookupCode.trim();

  if (!trimmedCode) {
    return `${FieldLabels.LookupCode} is required.`;
  }

  if (containsSpecialCharacters(trimmedCode)) {
    return specialCharactersNotAllowedMessage(FieldLabels.LookupCode);
  }

  if (trimmedCode.length > 255) {
    return `${FieldLabels.LookupCode} must be 255 characters or less.`;
  }

  const trimmedName = lookupName.trim();

  if (!trimmedName) {
    return `${FieldLabels.LookupName} is required.`;
  }

  if (containsSpecialCharacters(trimmedName)) {
    return specialCharactersNotAllowedMessage(FieldLabels.LookupName);
  }

  if (trimmedName.length > 255) {
    return `${FieldLabels.LookupName} must be 255 characters or less.`;
  }

  const nameKey = normalizeLookupValue(trimmedName);
  const codeKey = normalizeLookupValue(trimmedCode);

  const duplicateName = existingItems.some(
    (item) =>
      item.Id !== editingId &&
      item.LookupTypeId === lookupTypeId &&
      normalizeLookupValue(item.LookupName) === nameKey,
  );

  if (duplicateName) {
    return `"${trimmedName}" already exists.`;
  }

  // Lookup Code must be unique across all Lookup Types.
  const duplicateCode = existingItems.some(
    (item) =>
      item.Id !== editingId &&
      normalizeLookupValue(item.LookupCode) === codeKey,
  );

  if (duplicateCode) {
    return `"${trimmedCode}" already exists as a Lookup Code.`;
  }

  return null;
}
