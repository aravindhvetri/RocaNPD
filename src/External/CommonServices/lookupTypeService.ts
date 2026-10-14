import { Config, FieldLabels } from "./Config";
import { buildExportFileName, exportToExcel } from "./exportService";
import type {
  IImportParseResult,
  ILookupType,
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

/** Excel headers required for Lookup Type Import (must match FieldLabels). */
export const LOOKUP_TYPE_IMPORT_HEADERS = [
  FieldLabels.LookupTypeName,
] as const;

const SELECT_FIELDS = "Id,Title,IsDeleted,Modified";

function mapLookupType(item: Record<string, unknown>): ILookupType {
  return {
    Id: Number(item.Id),
    Title: String(item.Title ?? "").trim(),
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

async function assertLookupTypeNotDuplicate(
  title: string,
  editingId?: number,
): Promise<void> {
  const existing = await fetchActiveLookupTypes();
  const titleKey = title.trim().toLowerCase();
  const isDuplicate = existing.some(
    (item) =>
      item.Id !== editingId &&
      item.Title.trim().toLowerCase() === titleKey,
  );
  if (isDuplicate) {
    throw new Error(`Lookup Type Name already exists.`);
  }
}

export async function createLookupType(title: string): Promise<void> {
  await assertLookupTypeNotDuplicate(title);
  await SPServices.SPAddItem({
    Listname: LIST_NAME(),
    RequestJSON: {
      Title: title.trim(),
      ...getActiveRecordCreatePayload(),
    },
  });
}

export async function updateLookupType(id: number, title: string): Promise<void> {
  await assertLookupTypeNotDuplicate(title, id);
  await SPServices.SPUpdateItem({
    Listname: LIST_NAME(),
    ID: id,
    RequestJSON: { Title: title.trim() },
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

export async function bulkCreateLookupTypes(titles: string[]): Promise<void> {
  if (!titles.length) {
    return;
  }

  // Final SharePoint guard — do not trust Redux/list state from page load (multi-tab).
  const existing = await fetchActiveLookupTypes();
  const existingKeys = new Set(
    existing.map((item) => item.Title.trim().toLowerCase()),
  );
  const batchKeys = new Set<string>();

  for (const title of titles) {
    const titleKey = title.trim().toLowerCase();
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
    responseData: titles.map((title) => ({
      Title: title.trim(),
      ...getActiveRecordCreatePayload(),
    })),
  });
}

export async function parseLookupTypeImportFile(
  file: File,
  existingItems: ILookupType[],
): Promise<IImportParseResult> {
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

  const existingLower = new Set(
    existingItems.map((item) => item.Title.trim().toLowerCase()),
  );
  const seenInFile = new Set<string>();
  const toCreate: string[] = [];
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

    const lower = title.toLowerCase();
    if (existingLower.has(lower) || seenInFile.has(lower)) {
      duplicates.push(title);
      continue;
    }

    seenInFile.add(lower);
    toCreate.push(title);
  }

  if (!toCreate.length && !duplicates.length && !errors.length) {
    throw new Error("The uploaded file does not contain any lookup type names.");
  }

  return { toCreate, duplicates, errors };
}

export async function previewLookupTypeImportFile(
  file: File,
  existingItems: ILookupType[],
): Promise<IImportParseResult> {
  return parseLookupTypeImportFile(file, existingItems);
}

export async function commitLookupTypeImport(
  toCreate: string[],
): Promise<void> {
  if (toCreate.length) {
    await bulkCreateLookupTypes(toCreate);
  }
}

export async function importLookupTypesFromFile(
  file: File,
  existingItems: ILookupType[],
): Promise<IImportParseResult> {
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
