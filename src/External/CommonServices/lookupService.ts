import { Config, FieldLabels } from "./Config";
import { validateLookupDeleteAllowed } from "./dependencyValidationService";
import { buildExportFileName, exportToExcel } from "./exportService";
import type {
  ILookup,
  ILookupImportParseResult,
  ILookupImportRecord,
  ILookupRow,
  ILookupType,
} from "./Interface";
import {
  assertRequiredImportHeaders,
  findBestHeaderRowIndex,
  findColumnIndex,
  appendImportRowFieldErrors,
  readSpreadsheetRows,
} from "./importService";
import {
  getLookupTitles,
  isDeletedYesFlag,
} from "./lookupFieldUtils";
import { fetchActiveLookupTypes } from "./lookupTypeService";
import {
  getActiveRecordCreatePayload,
  getActiveRecordFilters,
  getSoftDeletePayload,
  isActiveRecord,
  SOFT_DELETE_FIELD,
} from "./softDelete";
import SPServices from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.Lookup;
const LOOKUP_FIELDS = Config.FieldNames.Lookup;

/** Excel headers required for Lookup Import (must match FieldLabels). */
export const LOOKUP_IMPORT_HEADERS = [
  FieldLabels.LookupType,
  FieldLabels.LookupCode,
  FieldLabels.LookupName,
] as const;

/** Title = Lookup Name. LookupType/Title requires Expand on LookupType. */
const SELECT_FIELDS =
  "Id,Title,LookupCode,IsDeleted,Modified,LookupTypeId,LookupType/Id,LookupType/Title";
const SELECT_FIELDS_WITHOUT_TYPE_ID_PATH =
  "Id,Title,LookupCode,IsDeleted,Modified,LookupTypeId,LookupType/Title";

function getIdFromLookupValue(value: unknown): number {
  if (typeof value === "number" && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const numeric = Number(value.trim());
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }

    const delimiter = value.indexOf(";#");
    if (delimiter > 0) {
      const leftId = Number(value.slice(0, delimiter).trim());
      if (Number.isFinite(leftId) && leftId > 0) {
        return leftId;
      }
    }
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const objectId = Number(record.Id ?? record.ID);
    if (Number.isFinite(objectId) && objectId > 0) {
      return objectId;
    }
  }

  return 0;
}

function getLookupTypeId(item: Record<string, unknown>): number {
  return (
    getIdFromLookupValue(item[LOOKUP_FIELDS.LookupTypeId]) ||
    getIdFromLookupValue(item[LOOKUP_FIELDS.LookupType])
  );
}

function mapLookup(item: Record<string, unknown>): ILookup {
  const lookupTypeTitles = [
    ...getLookupTitles(item[LOOKUP_FIELDS.LookupType]),
    ...getLookupTitles(item[LOOKUP_FIELDS.LookupTypeId]),
  ].filter((title) => title && !/^\d+$/.test(title));

  return {
    Id: Number(item.Id),
    LookupName: String(item[LOOKUP_FIELDS.Title] ?? "").trim(),
    LookupCode: String(item[LOOKUP_FIELDS.LookupCode] ?? "").trim(),
    LookupTypeId: getLookupTypeId(item),
    LookupTypeTitle: lookupTypeTitles[0] ?? "",
    IsDeleted: isDeletedYesFlag(item[SOFT_DELETE_FIELD]),
  };
}

async function resolveMissingLookupTypeTitles(
  lookups: ILookup[],
): Promise<ILookup[]> {
  const needsTypeTitle = lookups.some(
    (lookup) => lookup.LookupTypeId > 0 && !lookup.LookupTypeTitle,
  );
  if (!needsTypeTitle) {
    return lookups;
  }

  let lookupTypes: ILookupType[] = [];
  try {
    lookupTypes = await fetchActiveLookupTypes();
  } catch {
    lookupTypes = [];
  }
  const typeTitleById = new Map(
    lookupTypes.map((lookupType) => [lookupType.Id, lookupType.Title.trim()]),
  );

  return lookups.map((lookup) => {
    if (lookup.LookupTypeTitle || !lookup.LookupTypeId) {
      return lookup;
    }

    return {
      ...lookup,
      LookupTypeTitle: typeTitleById.get(lookup.LookupTypeId) ?? "",
    };
  });
}

async function readLookupItems(
  selectFields: string,
  filterActive: boolean,
): Promise<Record<string, unknown>[]> {
  return (await SPServices.SPReadItems({
    Listname: LIST_NAME(),
    Select: selectFields,
    Expand: LOOKUP_FIELDS.LookupType,
    Filter: filterActive ? getActiveRecordFilters() : [],
    Orderby: "Modified",
    Orderbydecorasc: false,
    Topcount: 5000,
  })) as Record<string, unknown>[];
}

async function readLookupItemsResilient(): Promise<Record<string, unknown>[]> {
  const attempts: Array<{ select: string; filterActive: boolean }> = [
    { select: SELECT_FIELDS, filterActive: true },
    { select: SELECT_FIELDS_WITHOUT_TYPE_ID_PATH, filterActive: true },
    { select: SELECT_FIELDS_WITHOUT_TYPE_ID_PATH, filterActive: false },
  ];

  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      const rows = await readLookupItems(attempt.select, attempt.filterActive);
      if (rows.length || !attempt.filterActive) {
        return rows;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}

export async function fetchActiveLookups(): Promise<ILookup[]> {
  const rows = await readLookupItemsResilient();
  const mapped = rows.map(mapLookup).filter(isActiveRecord);
  return resolveMissingLookupTypeTitles(mapped);
}

async function assertLookupNotDuplicate(
  lookupTypeId: number,
  lookupName: string,
  lookupCode: string,
  editingId?: number,
): Promise<void> {
  const existing = await fetchActiveLookups();
  const nameKey = lookupName.trim().toLowerCase();
  const codeKey = lookupCode.trim().toLowerCase();

  const duplicateName = existing.some(
    (item) =>
      item.Id !== editingId &&
      item.LookupTypeId === lookupTypeId &&
      item.LookupName.trim().toLowerCase() === nameKey,
  );
  if (duplicateName) {
    throw new Error(`"${lookupName.trim()}" already exists.`);
  }

  const duplicateCode = existing.some(
    (item) =>
      item.Id !== editingId &&
      item.LookupCode.trim().toLowerCase() === codeKey,
  );
  if (duplicateCode) {
    throw new Error(
      `"${lookupCode.trim()}" already exists as a Lookup Code.`,
    );
  }
}

export async function createLookup(
  lookupTypeId: number,
  lookupName: string,
  lookupCode: string,
): Promise<void> {
  await assertLookupNotDuplicate(lookupTypeId, lookupName, lookupCode);
  await SPServices.SPAddItem({
    Listname: LIST_NAME(),
    RequestJSON: {
      Title: lookupName.trim(),
      LookupCode: lookupCode.trim(),
      LookupTypeId: lookupTypeId,
      ...getActiveRecordCreatePayload(),
    },
  });
}

export async function updateLookup(
  id: number,
  lookupTypeId: number,
  lookupName: string,
  lookupCode: string,
): Promise<void> {
  await assertLookupNotDuplicate(lookupTypeId, lookupName, lookupCode, id);
  await SPServices.SPUpdateItem({
    Listname: LIST_NAME(),
    ID: id,
    RequestJSON: {
      Title: lookupName.trim(),
      LookupCode: lookupCode.trim(),
      LookupTypeId: lookupTypeId,
    },
  });
}

export async function softDeleteLookup(id: number, lookupName: string): Promise<void> {
  const dependencyMessage = await validateLookupDeleteAllowed(lookupName);

  if (dependencyMessage) {
    throw new Error(dependencyMessage);
  }

  await SPServices.SPUpdateItem({
    Listname: LIST_NAME(),
    ID: id,
    RequestJSON: getSoftDeletePayload(),
  });
}

export async function bulkCreateLookups(
  records: ILookupImportRecord[],
): Promise<void> {
  if (!records.length) {
    return;
  }

  // Used by Lookup Excel import and Material Group Complete — duplicates allowed.
  // Manual Lookup Add/Edit still uses assertLookupNotDuplicate via create/update.
  for (const record of records) {
    if (!(record.lookupCode ?? "").trim()) {
      throw new Error(`${FieldLabels.LookupCode} is required.`);
    }
  }

  await SPServices.batchInsert({
    ListName: LIST_NAME(),
    responseData: records.map((record) => ({
      Title: record.lookupName.trim(),
      LookupCode: (record.lookupCode ?? "").trim(),
      LookupTypeId: record.lookupTypeId,
      ...getActiveRecordCreatePayload(),
    })),
  });
}

export async function parseLookupImportFile(
  file: File,
  existingItems: ILookup[],
  lookupTypes: ILookupType[],
): Promise<ILookupImportParseResult> {
  const rows = await readSpreadsheetRows(file);

  if (!rows.length) {
    throw new Error("The uploaded file is empty.");
  }

  const headerRowIndex = findBestHeaderRowIndex(rows, [...LOOKUP_IMPORT_HEADERS]);

  if (headerRowIndex < 0) {
    throw new Error("The uploaded file does not contain a header row.");
  }

  const headerRow = rows[headerRowIndex];
  assertRequiredImportHeaders(headerRow, [...LOOKUP_IMPORT_HEADERS]);
  const lookupTypeColumnIndex = findColumnIndex(
    headerRow,
    FieldLabels.LookupType,
  );
  const lookupNameColumnIndex = findColumnIndex(
    headerRow,
    FieldLabels.LookupName,
  );
  const lookupCodeColumnIndex = findColumnIndex(
    headerRow,
    FieldLabels.LookupCode,
  );

  const lookupTypeByTitle = new Map<string, ILookupType>();
  lookupTypes.forEach((lookupType) => {
    lookupTypeByTitle.set(lookupType.Title.trim().toLowerCase(), lookupType);
  });

  const toCreate: ILookupImportRecord[] = [];
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

    const lookupTypeTitle = String(row[lookupTypeColumnIndex] ?? "").trim();
    const lookupName = String(row[lookupNameColumnIndex] ?? "").trim();
    const lookupCode = String(row[lookupCodeColumnIndex] ?? "").trim();
    const excelRowNumber = rowIndex + 1;

    if (!lookupTypeTitle && !lookupName && !lookupCode) {
      continue;
    }

    // Collect every field-level error for this row — do not stop at the first.
    let rowHasFieldErrors = false;

    // Lookup / Lookup Type allow special characters — do not block import on them.
    rowHasFieldErrors =
      appendImportRowFieldErrors(errors, [
        !lookupTypeTitle
          ? `Row ${excelRowNumber}: ${FieldLabels.LookupType} is required.`
          : null,
        !lookupCode
          ? `Row ${excelRowNumber}: ${FieldLabels.LookupCode} is required.`
          : null,
        !lookupName
          ? `Row ${excelRowNumber}: ${FieldLabels.LookupName} is required.`
          : null,
        lookupCode && lookupCode.length > 255
          ? `Row ${excelRowNumber}: ${FieldLabels.LookupCode} must be 255 characters or less.`
          : null,
        lookupName && lookupName.length > 255
          ? `Row ${excelRowNumber}: ${FieldLabels.LookupName} must be 255 characters or less.`
          : null,
      ]) || rowHasFieldErrors;

    if (rowHasFieldErrors) {
      continue;
    }

    const lookupType = lookupTypeByTitle.get(lookupTypeTitle.toLowerCase());

    if (!lookupType) {
      errors.push(
        `Row ${excelRowNumber}: ${FieldLabels.LookupType} "${lookupTypeTitle}" was not found.`,
      );
      continue;
    }

    // Excel import allows duplicate Name / Code (including values already in Lookup).
    toCreate.push({
      lookupTypeId: lookupType.Id,
      lookupTypeTitle: lookupType.Title,
      lookupName,
      lookupCode,
    });
  }

  if (!toCreate.length && !errors.length) {
    throw new Error("The uploaded file does not contain any lookup records.");
  }

  return { toCreate, duplicates, errors };
}

export async function previewLookupImportFile(
  file: File,
  existingItems: ILookup[],
  lookupTypes: ILookupType[],
): Promise<ILookupImportParseResult> {
  return parseLookupImportFile(file, existingItems, lookupTypes);
}

export async function commitLookupImport(
  toCreate: ILookupImportRecord[],
): Promise<void> {
  if (toCreate.length) {
    await bulkCreateLookups(toCreate);
  }
}

export async function importLookupsFromFile(
  file: File,
  existingItems: ILookup[],
  lookupTypes: ILookupType[],
): Promise<ILookupImportParseResult> {
  const result = await previewLookupImportFile(file, existingItems, lookupTypes);
  await commitLookupImport(result.toCreate);
  return result;
}

export function exportLookupsToExcel(rows: ILookupRow[]): void {
  exportToExcel({
    fileName: buildExportFileName("Lookup"),
    sheetName: "Lookup",
    columns: [
      {
        header: FieldLabels.LookupType,
        value: (row) => row.LookupTypeTitle,
      },
      {
        header: FieldLabels.LookupCode,
        value: (row) => row.LookupCode,
      },
      {
        header: FieldLabels.LookupName,
        value: (row) => row.LookupName,
      },
    ],
    rows,
  });
}
