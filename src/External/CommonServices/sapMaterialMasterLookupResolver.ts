import type { ILookup } from "./Interface";
import {
  getLookupMatchKeys,
  lookupValuesMatch,
  normalizeLookupCompareValue,
} from "./lookupOptionUtils";

export interface ISapLookupCodeResolver {
  /**
   * Resolves a LookupComponent display value to NPD_Lookup.LookupCode when possible.
   * Falls back to the display value (used by the SAP payload builder).
   */
  codeForLookupField(lookupTypeHints: string[], displayValue: string): string;
  /**
   * Returns NPD_Lookup.LookupCode only when a matching row exists; otherwise "".
   * Used for NPD_MaterialMaster *Code columns.
   */
  matchedLookupCode(lookupTypeHints: string[], displayValue: string): string;
}

function lookupNameMatches(lookup: ILookup, displayValue: string): boolean {
  const displayKey = normalizeLookupCompareValue(displayValue);
  if (!displayKey) {
    return false;
  }

  const name = lookup.LookupName.trim();
  if (normalizeLookupCompareValue(name) === displayKey) {
    return true;
  }

  const nameKeys = new Set(getLookupMatchKeys(name));
  return getLookupMatchKeys(displayValue).some((key) => nameKeys.has(key));
}

function lookupTypeMatches(lookup: ILookup, lookupTypeHints: string[]): boolean {
  const typeTitle = lookup.LookupTypeTitle.trim();
  return lookupTypeHints.some((hint) => lookupValuesMatch(typeTitle, hint));
}

function findLookupCode(
  lookups: readonly ILookup[],
  lookupTypeHints: string[],
  displayValue: string,
): string {
  const display = String(displayValue ?? "").trim();
  if (!display || !lookupTypeHints.length) {
    return "";
  }

  const match = lookups.find(
    (lookup) =>
      lookupTypeMatches(lookup, lookupTypeHints) &&
      lookupNameMatches(lookup, display),
  );

  return (match?.LookupCode ?? "").trim();
}

export function createSapLookupCodeResolver(
  lookups: readonly ILookup[],
): ISapLookupCodeResolver {
  return {
    matchedLookupCode(lookupTypeHints, displayValue) {
      return findLookupCode(lookups, lookupTypeHints, displayValue);
    },
    codeForLookupField(lookupTypeHints, displayValue) {
      const display = String(displayValue ?? "").trim();
      return findLookupCode(lookups, lookupTypeHints, display) || display;
    },
  };
}

/** Used when lookup catalog is unavailable; sends the stored display value. */
export function createPassthroughSapLookupCodeResolver(): ISapLookupCodeResolver {
  return {
    matchedLookupCode(_lookupTypeHints, displayValue) {
      return String(displayValue ?? "").trim();
    },
    codeForLookupField(_lookupTypeHints, displayValue) {
      return String(displayValue ?? "").trim();
    },
  };
}
