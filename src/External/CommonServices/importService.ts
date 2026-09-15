import * as XLSX from "xlsx";
import { Config } from "./Config";

export async function readSpreadsheetRows(file: File): Promise<string[][]> {
  validateSpreadsheetFile(file);

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  if (!workbook.SheetNames.length) {
    throw new Error("The uploaded file does not contain any worksheets.");
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    sheet,
    { header: 1, defval: "" },
  );

  return rawRows.map((row) =>
    row.map((cell) => String(cell ?? "").trim()),
  );
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
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findColumnIndex(
  headerRow: string[],
  expectedHeader: string,
): number {
  const normalizedExpected = normalizeHeaderValue(expectedHeader);
  return headerRow.findIndex(
    (cell) => normalizeHeaderValue(cell) === normalizedExpected,
  );
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
