import type { IMaterialGroupEntryRow } from "./Interface";

function normalizeDescriptionKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Within-request Description duplicates (case-insensitive).
 * Same rule family as Lookup Code uniqueness: first duplicate wins the error.
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

      const key = normalizeDescriptionKey(description);
      if (seen.has(key)) {
        return `"${description}" already exists.`;
      }
      seen.add(key);
    }
  }

  return null;
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
