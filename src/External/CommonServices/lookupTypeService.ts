import { Config, FieldLabels, FieldNames } from "./Config";
import { buildExportFileName, exportToExcel } from "./exportService";
import type {
  ILookupType,
  ILookupTypeImportParseResult,
  ILookupTypeImportRecord,
  ILookupTypeRow,
} from "./Interface";
import {
  assertRequiredImportHeaders,
  findBestHeaderRowIndex,
  findColumnIndex,
  readSpreadsheetRows,
} from "./importService";
import { validateLookupTypeDeleteAllowed } from "./dependencyValidationService";
import { isDeletedYesFlag } from "./lookupFieldUtils";
import {
  getActiveRecordCreatePayload,
  getActiveRecordFilters,
  getSoftDeletePayload,
  isActiveRecord,
  SOFT_DELETE_FIELD,
} from "./softDelete";
import SPServices from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.LookupType;
const REQUIRED_FIELD = FieldNames.LookupType.Required;

/** Excel headers required for Lookup Type Import (must match FieldLabels). */
export const LOOKUP_TYPE_IMPORT_HEADERS = [
  FieldLabels.LookupTypeName,
  FieldLabels.Required,
] as const;

/**
 * Accepts Yes/No and true/false (any case). Empty → false.
 * Returns null when the cell value is not a recognized boolean.
 */
function parseLookupTypeRequiredCell(value: unknown): boolean | null {
  if (value === true || value === 1) {
    return true;
  }
  if (value === false || value === 0) {
    return false;
  }

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return false;
  }
  if (
    normalized === "yes" ||
    normalized === "true" ||
    normalized === "1"
  ) {
    return true;
  }
  if (
    normalized === "no" ||
    normalized === "false" ||
    normalized === "0"
  ) {
    return false;
  }

  return null;
}

const SELECT_FIELDS = `Id,Title,${REQUIRED_FIELD},IsDeleted,Modified`;

function mapLookupType(item: Record<string, unknown>): ILookupType {
  return {
    Id: Number(item.Id),
    Title: String(item.Title ?? "").trim(),
    Required: isDeletedYesFlag(item[REQUIRED_FIELD]),
    IsDeleted: isDeletedYesFlag(item[SOFT_DELETE_FIELD]),
  };
}

export async function fetchActiveLookupTypes(): Promise<ILookupType[]> {
  const rows = (await SPServices.SPReadItems({
    Listname: LIST_NAME(),
    Select: SELECT_FIELDS,
    Filter: getActiveRecordFilters(),
    Orderby: "Modified",
    Orderbydecorasc: false,
  })) as Record<string, unknown>[];

  return rows.map(mapLookupType).filter(isActiveRecord);
}

/** Lowercase and remove all whitespace for duplicate matching. */
function normalizeLookupTypeTitleKey(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

async function assertLookupTypeNotDuplicate(
  title: string,
  editingId?: number,
): Promise<void> {
  const existing = await fetchActiveLookupTypes();
  const titleKey = normalizeLookupTypeTitleKey(title);
  const isDuplicate = existing.some(
    (item) =>
      item.Id !== editingId &&
      normalizeLookupTypeTitleKey(item.Title) === titleKey,
  );
  if (isDuplicate) {
    throw new Error(`Lookup Type Name already exists.`);
  }
}

export async function createLookupType(
  title: string,
  required = false,
): Promise<void> {
  await assertLookupTypeNotDuplicate(title);
  await SPServices.SPAddItem({
    Listname: LIST_NAME(),
    RequestJSON: {
      Title: title.trim(),
      // SharePoint Yes/No column expects Edm.Boolean (true/false).
      [REQUIRED_FIELD]: required,
      ...getActiveRecordCreatePayload(),
    },
  });
}

export async function updateLookupType(
  id: number,
  title: string,
  required = false,
): Promise<void> {
  await assertLookupTypeNotDuplicate(title, id);
  await SPServices.SPUpdateItem({
    Listname: LIST_NAME(),
    ID: id,
    RequestJSON: {
      Title: title.trim(),
      // SharePoint Yes/No column expects Edm.Boolean (true/false).
      [REQUIRED_FIELD]: required,
    },
  });
}

export async function softDeleteLookupType(
  id: number,
  title: string,
): Promise<void> {
  const dependencyMessage = await validateLookupTypeDeleteAllowed(id, title);

  if (dependencyMessage) {
    throw new Error(dependencyMessage);
  }

  await SPServices.SPUpdateItem({
    Listname: LIST_NAME(),
    ID: id,
    RequestJSON: getSoftDeletePayload(),
  });
}

export async function bulkCreateLookupTypes(
  records: ILookupTypeImportRecord[],
): Promise<void> {
  if (!records.length) {
    return;
  }

  // Final SharePoint guard — do not trust Redux/list state from page load (multi-tab).
  const existing = await fetchActiveLookupTypes();
  const existingKeys = new Set(
    existing.map((item) => normalizeLookupTypeTitleKey(item.Title)),
  );
  const batchKeys = new Set<string>();

  for (const record of records) {
    const titleKey = normalizeLookupTypeTitleKey(record.title);
    if (!titleKey) {
      continue;
    }
    if (existingKeys.has(titleKey) || batchKeys.has(titleKey)) {
      throw new Error(`Lookup Type Name already exists.`);
    }
    batchKeys.add(titleKey);
  }

  await SPServices.batchInsert({
    ListName: LIST_NAME(),
    responseData: records.map((record) => ({
      Title: record.title.trim(),
      // SharePoint Yes/No column expects Edm.Boolean (true/false).
      [REQUIRED_FIELD]: record.required === true,
      ...getActiveRecordCreatePayload(),
    })),
  });
}

export async function parseLookupTypeImportFile(
  file: File,
  existingItems: ILookupType[],
): Promise<ILookupTypeImportParseResult> {
  const rows = await readSpreadsheetRows(file);

  if (!rows.length) {
    throw new Error("The uploaded file is empty.");
  }

  const headerRowIndex = findBestHeaderRowIndex(rows, [
    ...LOOKUP_TYPE_IMPORT_HEADERS,
  ]);

  if (headerRowIndex < 0) {
    throw new Error("The uploaded file does not contain a header row.");
  }

  const headerRow = rows[headerRowIndex];
  assertRequiredImportHeaders(headerRow, [...LOOKUP_TYPE_IMPORT_HEADERS]);
  const columnIndex = findColumnIndex(headerRow, FieldLabels.LookupTypeName);
  const requiredColumnIndex = findColumnIndex(headerRow, FieldLabels.Required);

  const existingLower = new Set(
    existingItems.map((item) => normalizeLookupTypeTitleKey(item.Title)),
  );
  const seenInFile = new Map<string, { title: string; rowNumber: number }>();
  const toCreate: ILookupTypeImportRecord[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];

  for (
    let rowIndex = headerRowIndex + 1;
    rowIndex < rows.length;
    rowIndex++
  ) {
    const row = rows[rowIndex];
    if (!row) {
      continue;
    }

    const title = String(row[columnIndex] ?? "").trim();
    if (!title) {
      continue;
    }

    const excelRowNumber = rowIndex + 1;
    // Lookup Type allows special characters — length / required only.
    if (title.length > 255) {
      errors.push(
        `Row ${excelRowNumber}: ${FieldLabels.LookupTypeName} must be 255 characters or less.`,
      );
      continue;
    }

    const requiredRaw =
      requiredColumnIndex >= 0 ? row[requiredColumnIndex] : "";
    const required = parseLookupTypeRequiredCell(requiredRaw);
    if (required === null) {
      errors.push(
        `Row ${excelRowNumber}: ${FieldLabels.Required} must be Yes, No, true, or false.`,
      );
      continue;
    }

    // Same key as Add/Edit: ignore spaces and case ("Number 01" === "Number01").
    const titleKey = normalizeLookupTypeTitleKey(title);
    if (!titleKey) {
      continue;
    }

    if (existingLower.has(titleKey)) {
      duplicates.push(
        `Row ${excelRowNumber}: "${title}" is a duplicate Lookup Type Name`,
      );
      continue;
    }

    const priorInFile = seenInFile.get(titleKey);
    if (priorInFile) {
      duplicates.push(
        `Row ${excelRowNumber}: "${title}" is a duplicate of "${priorInFile.title}" (Row ${priorInFile.rowNumber})`,
      );
      continue;
    }

    seenInFile.set(titleKey, { title, rowNumber: excelRowNumber });
    toCreate.push({ title, required });
  }

  if (!toCreate.length && !duplicates.length && !errors.length) {
    throw new Error("The uploaded file does not contain any lookup type names.");
  }

  return { toCreate, duplicates, errors };
}

export async function previewLookupTypeImportFile(
  file: File,
  existingItems: ILookupType[],
): Promise<ILookupTypeImportParseResult> {
  return parseLookupTypeImportFile(file, existingItems);
}

export async function commitLookupTypeImport(
  toCreate: ILookupTypeImportRecord[],
): Promise<void> {
  if (toCreate.length) {
    await bulkCreateLookupTypes(toCreate);
  }
}

export async function importLookupTypesFromFile(
  file: File,
  existingItems: ILookupType[],
): Promise<ILookupTypeImportParseResult> {
  const result = await previewLookupTypeImportFile(file, existingItems);
  await commitLookupTypeImport(result.toCreate);
  return result;
}

export function exportLookupTypesToExcel(rows: ILookupTypeRow[]): void {
  exportToExcel({
    fileName: buildExportFileName("LookupType"),
    sheetName: "LookupType",
    columns: [
      {
        header: FieldLabels.LookupTypeName,
        value: (row) => row.Title,
      },
    ],
    rows,
  });
}
