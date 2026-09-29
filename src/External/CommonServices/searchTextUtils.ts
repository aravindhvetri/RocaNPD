/**
 * Shared list-search normalization: lowercase + strip all whitespace so
 * "aariaravind" matches "Aari Aravind".
 */
export function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

/**
 * True when `candidate` contains `query` after space-insensitive lowercase normalize.
 * Empty / whitespace-only query matches everything.
 */
export function matchesSearchText(
  candidate: unknown,
  query: unknown,
): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  return normalizeSearchText(candidate).includes(normalizedQuery);
}

/** True when any field matches the search query (OR). */
export function matchesAnySearchField(
  fields: readonly unknown[],
  query: unknown,
): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  return fields.some((field) => matchesSearchText(field, normalizedQuery));
}
