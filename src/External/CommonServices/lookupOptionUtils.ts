import type { ILookup, ISelectOption } from "./Interface";
import { fetchActiveLookups } from "./lookupService";

/**
 * NPD_Lookup has no LookupName column.
 * - Lookup Name in the UI = list column Title
 * - Lookup Type in the UI = expanded LookupType/Title
 * fetchActiveLookups() already maps those onto ILookup.LookupName / LookupTypeTitle.
 */

export function normalizeLookupCompareValue(value: string): string {
  return value.trim().toLowerCase();
}

function expandCamelCase(value: string): string {
  return value
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

function stripParentheticals(value: string): string {
  return value.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

function compactLookupKey(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "").toLowerCase();
}

function extractParentheticalCodes(value: string): string[] {
  const codes: string[] = [];
  const pattern = /\(([^)]+)\)/g;
  let match: RegExpExecArray | null = pattern.exec(value);

  while (match) {
    const compact = compactLookupKey(match[1]);
    if (compact) {
      codes.push(compact);
    }
    match = pattern.exec(value);
  }

  return codes;
}

/** Keys used to match a field header/name to LookupType/Title. */
export function getLookupMatchKeys(value: string): string[] {
  const sources = [value, expandCamelCase(value), stripParentheticals(value)];
  const keys: string[] = [];

  sources.forEach((source) => {
    const normalized = normalizeLookupCompareValue(source);
    if (!normalized) {
      return;
    }

    keys.push(normalized);
    const compact = compactLookupKey(normalized);
    if (compact) {
      keys.push(compact);
    }
  });

  extractParentheticalCodes(value).forEach((code) => keys.push(code));

  return keys.filter((key, index) => keys.indexOf(key) === index);
}

export function lookupValuesMatch(left: string, right: string): boolean {
  const rightKeys = new Set(getLookupMatchKeys(right));
  return getLookupMatchKeys(left).some((key) => rightKeys.has(key));
}

function getLookupTypeTitle(lookup: ILookup): string {
  return lookup.LookupTypeTitle.trim();
}

function getLookupItemTitle(lookup: ILookup): string {
  return lookup.LookupName.trim();
}

function toTitleOption(title: string): ISelectOption | null {
  if (!title) {
    return null;
  }

  return { label: title, value: title };
}

function pushUniqueTitleOption(options: ISelectOption[], title: string): void {
  const option = toTitleOption(title);
  if (!option) {
    return;
  }

  const optionKey = normalizeLookupCompareValue(String(option.value));
  const alreadyPresent = options.some(
    (entry) => normalizeLookupCompareValue(String(entry.value)) === optionKey,
  );
  if (alreadyPresent) {
    return;
  }

  options.push(option);
}

/** Title options whose expanded LookupType/Title matches `fieldName`. */
export function getLookupNameOptionsForType(
  lookups: readonly ILookup[],
  fieldName: string,
): ISelectOption[] {
  const options: ISelectOption[] = [];

  lookups.forEach((lookup) => {
    if (!lookupValuesMatch(getLookupTypeTitle(lookup), fieldName)) {
      return;
    }

    pushUniqueTitleOption(options, getLookupItemTitle(lookup));
  });

  return options.sort((left, right) => left.label.localeCompare(right.label));
}

export function buildLookupOptionsByType(
  lookups: readonly ILookup[],
): Record<string, ISelectOption[]> {
  const grouped: Record<string, ISelectOption[]> = {};

  lookups.forEach((lookup) => {
    const typeKeys = getLookupMatchKeys(getLookupTypeTitle(lookup));
    if (!typeKeys.length) {
      return;
    }

    let optionList = grouped[typeKeys[0]];
    if (!optionList) {
      optionList = [];
      typeKeys.forEach((typeKey) => {
        if (!grouped[typeKey]) {
          grouped[typeKey] = optionList;
        }
      });
    }

    pushUniqueTitleOption(optionList, getLookupItemTitle(lookup));
  });

  Object.keys(grouped).forEach((typeKey) => {
    grouped[typeKey].sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  });

  return grouped;
}

export function getLookupOptionsByFieldName(
  optionsByType: Record<string, ISelectOption[]>,
  fieldName: string,
  ...additionalNames: string[]
): ISelectOption[] {
  const candidates = [fieldName, ...additionalNames];

  for (const candidate of candidates) {
    for (const key of getLookupMatchKeys(candidate)) {
      const options = optionsByType[key];
      if (options?.length) {
        return options;
      }
    }
  }

  return [];
}

export async function fetchLookupOptionsByType(): Promise<
  Record<string, ISelectOption[]>
> {
  const lookups = await fetchActiveLookups();
  return buildLookupOptionsByType(lookups);
}
