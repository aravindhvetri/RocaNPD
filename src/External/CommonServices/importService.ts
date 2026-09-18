import * as XLSX from "xlsx";
import { Config } from "./Config";

function ensureSheetRange(sheet: XLSX.WorkSheet): void {
  const cellAddresses = Object.keys(sheet).filter((key) =>
    /^[A-Z]+[0-9]+$/i.test(key),
  );
  if (!cellAddresses.length) {
    return;
  }

  let maxRow = 0;
  let maxCol = 0;
  cellAddresses.forEach((address) => {
    const decoded = XLSX.utils.decode_cell(address);
    maxRow = Math.max(maxRow, decoded.r);
    maxCol = Math.max(maxCol, decoded.c);
  });

  const currentRange = sheet["!ref"]
    ? XLSX.utils.decode_range(sheet["!ref"])
    : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };

  sheet["!ref"] = XLSX.utils.encode_range({
    s: {
      r: Math.min(currentRange.s.r, 0),
      c: Math.min(currentRange.s.c, 0),
    },
    e: {
      r: Math.max(currentRange.e.r, maxRow),
      c: Math.max(currentRange.e.c, maxCol),
    },
  });
}

function sheetToStringRows(sheet: XLSX.WorkSheet): string[][] {
  ensureSheetRange(sheet);
  const rawRows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    sheet,
    { header: 1, defval: "" },
  );

  return rawRows.map((row) =>
    row.map((cell) => normalizeImportedCell(cell)),
  );
}

function normalizeImportedCell(value: unknown): string {
  return String(value ?? "")
    .replace(/_x0020_/gi, " ")
    .replace(/^\uFEFF/, "")
    .replace(/[\u00A0\u1680\u2000-\u200D\u2028\u2029\u202F\u205F\u3000\uFEFF]/g, " ")
    .replace(/\r\n|\r|\n/g, " ")
    .trim();
}

export async function readSpreadsheetWorkbook(
  file: File,
): Promise<{ sheetName: string; rows: string[][] }[]> {
  validateSpreadsheetFile(file);

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  if (!workbook.SheetNames.length) {
    throw new Error("The uploaded file does not contain any worksheets.");
  }

  return workbook.SheetNames.map((sheetName) => ({
    sheetName,
    rows: sheetToStringRows(workbook.Sheets[sheetName]),
  }));
}

export async function readSpreadsheetRows(file: File): Promise<string[][]> {
  const sheets = await readSpreadsheetWorkbook(file);
  return sheets[0]?.rows ?? [];
}

export function validateSpreadsheetFile(file: File): void {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const allowedExtensions = Config.ImportExport.AcceptedSpreadsheetExtensions;

  if (
    !allowedExtensions.includes(
      extension as (typeof allowedExtensions)[number],
    )
  ) {
    throw new Error(
      `Invalid file type. ${Config.ImportExport.AcceptedFormatsLabel}.`,
    );
  }

  if (file.size > Config.ImportExport.MaxFileSizeBytes) {
    throw new Error(`File exceeds ${Config.ImportExport.MaxSizeLabel}.`);
  }
}

export function normalizeHeaderValue(value: string): string {
  return normalizeImportedCell(value)
    .replace(/\*+$/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Whitespace-insensitive key: "Material Code" and "MaterialCode" become "materialcode". */
export function normalizeHeaderWhitespaceKey(value: string): string {
  return normalizeHeaderValue(value).replace(/\s+/g, "");
}

/** Punctuation-insensitive key used when Excel omits parentheses, dots, or slashes. */
export function compactHeaderKey(value: string): string {
  return normalizeHeaderWhitespaceKey(value).replace(/[^a-z0-9]+/g, "");
}

export function headersMatch(left: string, right: string): boolean {
  const normalizedLeft = normalizeHeaderValue(left);
  const normalizedRight = normalizeHeaderValue(right);
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  if (normalizeHeaderWhitespaceKey(left) === normalizeHeaderWhitespaceKey(right)) {
    return true;
  }

  const compactLeft = compactHeaderKey(left);
  const compactRight = compactHeaderKey(right);
  return Boolean(compactLeft) && compactLeft === compactRight;
}

export function findColumnIndex(
  headerRow: string[],
  expectedHeader: string,
): number {
  return headerRow.findIndex((cell) => headersMatch(cell, expectedHeader));
}

export function countMatchingHeaders(
  headerRow: string[],
  expectedHeaders: string[],
): number {
  return expectedHeaders.reduce(
    (count, header) => count + (findColumnIndex(headerRow, header) >= 0 ? 1 : 0),
    0,
  );
}

export function findBestHeaderRowIndex(
  rows: string[][],
  expectedHeaders: string[],
  maxScanRows = 30,
): number {
  let bestIndex = -1;
  let bestScore = 0;
  const limit = Math.min(rows.length, Math.max(1, maxScanRows));

  for (let rowIndex = 0; rowIndex < limit; rowIndex++) {
    const row = rows[rowIndex];
    if (!row?.some((cell) => cell.trim())) {
      continue;
    }

    const score = countMatchingHeaders(row, expectedHeaders);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = rowIndex;
    }
  }

  if (bestScore > 0) {
    return bestIndex;
  }

  return rows.findIndex((row) => row.some((cell) => cell.trim()));
}

export function extractColumnValues(
  rows: string[][],
  columnIndex: number,
  headerRowIndex = 0,
): string[] {
  const values: string[] = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row || !row.length) {
      continue;
    }

    const rawValue = String(row[columnIndex] ?? "").trim();
    if (rawValue) {
      values.push(rawValue);
    }
  }

  return values;
}

export function partitionImportValues(
  values: string[],
  existingValues: string[],
  maxLength = 255,
): {
  toCreate: string[];
  duplicates: string[];
  errors: string[];
} {
  const existingLower = new Set(
    existingValues.map((value) => value.trim().toLowerCase()),
  );
  const seenInFile = new Set<string>();
  const toCreate: string[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];

  values.forEach((rawValue) => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return;
    }

    const lower = trimmed.toLowerCase();

    if (trimmed.length > maxLength) {
      errors.push(
        `"${trimmed.slice(0, 40)}..." exceeds the maximum length of ${maxLength} characters.`,
      );
      return;
    }

    if (existingLower.has(lower) || seenInFile.has(lower)) {
      duplicates.push(trimmed);
      return;
    }

    seenInFile.add(lower);
    toCreate.push(trimmed);
  });

  return { toCreate, duplicates, errors };
}

/** Row shown in Import popup when duplicates or row-level errors are found. */
export interface IImportValidationRow {
  serialNo: number;
  recordName: string;
  validationError: string;
}

export const ImportValidationMessages = {
  duplicateLookupType: "Duplicate Lookup Type Name",
  duplicateLookupName: "Duplicate Lookup Name under this Type",
  duplicateNpdItemDetails: "Duplicate Item Details record",
} as const;

export function buildImportValidationRows(
  duplicates: string[],
  duplicateMessage: string,
  errors: string[] = [],
): IImportValidationRow[] {
  const rows: IImportValidationRow[] = duplicates.map((name, index) => ({
    serialNo: index + 1,
    recordName: name,
    validationError: duplicateMessage,
  }));

  errors.forEach((message) => {
    rows.push({
      serialNo: rows.length + 1,
      recordName: "—",
      validationError: message,
    });
  });

  return rows;
}
