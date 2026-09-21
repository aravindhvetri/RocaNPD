/** Max values shown in DataTable cells before appending an ellipsis. */
export const MULTI_VALUE_CELL_LIMIT = 8;

export interface IMultiValueCellFormatOptions {
  /** Split pattern — default comma-separated lists. */
  splitPattern?: RegExp | string;
  /** Join string for display / tooltip — default `", "`. */
  joinWith?: string;
  /** Max visible values before `...` — default {@link MULTI_VALUE_CELL_LIMIT}. */
  limit?: number;
}

export interface IMultiValueCellFormatResult {
  display: string;
  title: string;
  truncated: boolean;
}

/**
 * Formats a delimited multi-value string for DataTable cells:
 * show the first N values, then `...` when more remain.
 * `title` is always the full joined list (for hover tooltips when truncated).
 */
export function formatMultiValueCell(
  raw: string | null | undefined,
  options: IMultiValueCellFormatOptions = {},
): IMultiValueCellFormatResult {
  const limit = options.limit ?? MULTI_VALUE_CELL_LIMIT;
  const joinWith = options.joinWith ?? ", ";
  const splitPattern = options.splitPattern ?? /\s*,\s*/;

  const parts = String(raw ?? "")
    .split(splitPattern)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const title = parts.join(joinWith);

  if (parts.length <= limit) {
    return { display: title, title, truncated: false };
  }

  return {
    display: `${parts.slice(0, limit).join(joinWith)}...`,
    title,
    truncated: true,
  };
}
