import { Config } from "./Config";

/**
 * Letters, numbers, and spaces only. Shared rule for Lookup, Lookup Type,
 * NPD Item Details text fields, MG master Code/Description, etc.
 * Remarks / free-text comments are excluded — they may contain punctuation.
 */
export function sanitizeAlphanumericTextInput(value: string): string {
  return String(value ?? "").replace(
    Config.TextInputRules.DisallowedCharactersGlobal,
    "",
  );
}

export function containsSpecialCharacters(value: string): boolean {
  return Config.TextInputRules.DisallowedCharacters.test(String(value ?? ""));
}

export function specialCharactersNotAllowedMessage(fieldLabel: string): string {
  return `${fieldLabel} ${Config.TextInputRules.SpecialCharactersNotAllowedSuffix}`;
}
