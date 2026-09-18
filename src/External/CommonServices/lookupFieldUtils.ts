function titleFromLegacyLookupString(value: string): string {
  const delimiter = value.indexOf(";#");
  if (delimiter < 0) {
    return value.trim();
  }

  const left = value.slice(0, delimiter).trim();
  const right = value.slice(delimiter + 2).trim();
  if (/^\d+$/.test(left) && right) {
    return right;
  }

  return (right || left).trim();
}

/** Reads lookup Title values from single/multi expanded lookup payloads. */
export function getLookupTitles(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    const title = titleFromLegacyLookupString(value);
    return title ? [title] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => getLookupTitles(entry));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (Array.isArray(record.results)) {
      return getLookupTitles(record.results);
    }

    const title = String(
      record.Title ??
        record.title ??
        record.Name ??
        record.LookupValue ??
        record.lookupValue ??
        "",
    ).trim();
    return title ? [title] : [];
  }

  return [];
}

export function lookupTitlesInclude(value: unknown, expected: string): boolean {
  const expectedTitle = expected.trim().toLowerCase();
  if (!expectedTitle) {
    return false;
  }

  return getLookupTitles(value).some(
    (title) => title.toLowerCase() === expectedTitle,
  );
}

export function isDeletedYesFlag(value: unknown): boolean {
  if (value === true || value === 1) {
    return true;
  }

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return normalized === "yes" || normalized === "true" || normalized === "1";
}

export function isDeletedApproverRow(row: Record<string, unknown>): boolean {
  return isDeletedYesFlag(row.IsDelete ?? row.IsDeleted);
}
