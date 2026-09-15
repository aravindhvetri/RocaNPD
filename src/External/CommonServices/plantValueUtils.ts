/** Parses comma-separated Plant values from SharePoint into a trimmed array. */
export function parseCommaSeparatedPlants(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Joins selected Plant values for SharePoint multiline/text storage. */
export function joinCommaSeparatedPlants(values: string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join(", ");
}
