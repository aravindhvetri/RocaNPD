import type { IMaterialGroupEntryRow } from "./Interface";

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Within-request Code duplicates (case-insensitive).
 * Empty Code is allowed for Initiator — blanks are skipped.
 */
export function findDuplicateMaterialGroupCode(
  selectedConfigIds: number[],
  entriesByConfigId: Record<number, IMaterialGroupEntryRow[]>,
): string | null {
  const seen = new Set<string>();

  for (const configId of selectedConfigIds) {
    const rows = entriesByConfigId[configId] || [];
    for (const row of rows) {
      const code = (row.code || "").trim();
      if (!code) {
        continue;
      }

      const key = normalizeKey(code);
      if (seen.has(key)) {
        return `"${code}" already exists as a Code.`;
      }
      seen.add(key);
    }
  }

  return null;
}

/**
 * Within-request Description duplicates (case-insensitive).
 * Empty Description values are skipped for the uniqueness check.
 */
export function findDuplicateMaterialGroupDescription(
  selectedConfigIds: number[],
  entriesByConfigId: Record<number, IMaterialGroupEntryRow[]>,
): string | null {
  const seen = new Set<string>();

  for (const configId of selectedConfigIds) {
    const rows = entriesByConfigId[configId] || [];
    for (const row of rows) {
      const description = (row.description || "").trim();
      if (!description) {
        continue;
      }

      const key = normalizeKey(description);
      if (seen.has(key)) {
        return `"${description}" already exists as a Description.`;
      }
      seen.add(key);
    }
  }

  return null;
}

/**
 * Within-request Code / Description duplicates.
 * When both exist, returns one combined message.
 */
export function findDuplicateMaterialGroupField(
  selectedConfigIds: number[],
  entriesByConfigId: Record<number, IMaterialGroupEntryRow[]>,
): string | null {
  const codeDup = findDuplicateMaterialGroupCode(
    selectedConfigIds,
    entriesByConfigId,
  );
  const descriptionDup = findDuplicateMaterialGroupDescription(
    selectedConfigIds,
    entriesByConfigId,
  );
  if (codeDup && descriptionDup) {
    return `${codeDup} ${descriptionDup}`;
  }
  return codeDup || descriptionDup;
}

/** Collect trimmed non-empty Codes from selected master rows. */
export function collectMaterialGroupCodes(
  selectedConfigIds: number[],
  entriesByConfigId: Record<number, IMaterialGroupEntryRow[]>,
): string[] {
  const codes: string[] = [];
  for (const configId of selectedConfigIds) {
    for (const row of entriesByConfigId[configId] || []) {
      const code = (row.code || "").trim();
      if (code) {
        codes.push(code);
      }
    }
  }
  return codes;
}

/** Collect trimmed non-empty Descriptions from selected master rows. */
export function collectMaterialGroupDescriptions(
  selectedConfigIds: number[],
  entriesByConfigId: Record<number, IMaterialGroupEntryRow[]>,
): string[] {
  const descriptions: string[] = [];
  for (const configId of selectedConfigIds) {
    for (const row of entriesByConfigId[configId] || []) {
      const description = (row.description || "").trim();
      if (description) {
        descriptions.push(description);
      }
    }
  }
  return descriptions;
}
