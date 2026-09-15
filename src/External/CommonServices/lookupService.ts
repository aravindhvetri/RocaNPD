import { Config, FieldLabels } from "./Config";
import { validateLookupDeleteAllowed } from "./dependencyValidationService";
import { exportToExcel } from "./exportService";
import type {
  ILookup,
  ILookupImportParseResult,
  ILookupImportRecord,
  ILookupRow,
  ILookupType,
} from "./Interface";
import {
  findColumnIndex,
  readSpreadsheetRows,
} from "./importService";
import {
  getActiveRecordCreatePayload,
  getActiveRecordFilters,
  getSoftDeletePayload,
  isActiveRecord,
  SOFT_DELETE_FIELD,
} from "./softDelete";
import SPServices from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.Lookup;

const SELECT_FIELDS =
  "Id,Title,LookupCode,IsDeleted,LookupTypeId,LookupType/Title";

function mapLookup(item: Record<string, unknown>): ILookup {
  const lookupType = item[Config.FieldNames.Lookup.LookupType] as
    | Record<string, unknown>
    | undefined;

  return {
    Id: Number(item.Id),
    LookupName: String(item.Title ?? ""),
    LookupCode: String(item.LookupCode ?? ""),
    LookupTypeId: Number(item.LookupTypeId ?? 0),
    LookupTypeTitle: String(lookupType?.Title ?? ""),
    IsDeleted: Boolean(item[SOFT_DELETE_FIELD]),
  };
}

function buildDuplicateKey(lookupTypeId: number, lookupName: string): string {
  return `${lookupTypeId}::${lookupName.trim().toLowerCase()}`;
}

export async function fetchActiveLookups(): Promise<ILookup[]> {
  const rows = (await SPServices.SPReadItems({
    Listname: LIST_NAME(),
    Select: SELECT_FIELDS,
    Expand: Config.FieldNames.Lookup.LookupType,
    Filter: getActiveRecordFilters(),
    Orderby: "Title",
    Orderbydecorasc: true,
  })) as Record<string, unknown>[];

  return rows.map(mapLookup).filter(isActiveRecord);
}

export async function createLookup(
  lookupTypeId: number,
  lookupName: string,
  lookupCode: string,
): Promise<void> {
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

  await SPServices.batchInsert({
    ListName: LIST_NAME(),
    responseData: records.map((record) => ({
      Title: record.lookupName.trim(),
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

  const headerRowIndex = rows.findIndex((row) =>
    row.some((cell) => cell.trim().length > 0),
  );

  if (headerRowIndex < 0) {
    throw new Error("The uploaded file does not contain a header row.");
  }

  const headerRow = rows[headerRowIndex];
  const lookupTypeColumnIndex = findColumnIndex(
    headerRow,
    FieldLabels.LookupType,
  );
  const lookupNameColumnIndex = findColumnIndex(
    headerRow,
    FieldLabels.LookupName,
  );

  if (lookupTypeColumnIndex < 0 || lookupNameColumnIndex < 0) {
    throw new Error(
      `The uploaded file must include "${FieldLabels.LookupType}" and "${FieldLabels.LookupName}" columns.`,
    );
  }

  const lookupTypeByTitle = new Map<string, ILookupType>();
  lookupTypes.forEach((lookupType) => {
    lookupTypeByTitle.set(lookupType.Title.trim().toLowerCase(), lookupType);
  });

  const existingKeys = new Set(
    existingItems.map((item) =>
      buildDuplicateKey(item.LookupTypeId, item.LookupName),
    ),
  );
  const seenInFile = new Set<string>();
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

    if (!lookupTypeTitle && !lookupName) {
      continue;
    }

    if (!lookupTypeTitle) {
      errors.push(`Row ${rowIndex + 1}: ${FieldLabels.LookupType} is required.`);
      continue;
    }

    if (!lookupName) {
      errors.push(`Row ${rowIndex + 1}: ${FieldLabels.LookupName} is required.`);
      continue;
    }

    if (lookupName.length > 255) {
      errors.push(
        `Row ${rowIndex + 1}: ${FieldLabels.LookupName} must be 255 characters or less.`,
      );
      continue;
    }

    const lookupType = lookupTypeByTitle.get(lookupTypeTitle.toLowerCase());

    if (!lookupType) {
      errors.push(
        `Row ${rowIndex + 1}: ${FieldLabels.LookupType} "${lookupTypeTitle}" was not found.`,
      );
      continue;
    }

    const duplicateKey = buildDuplicateKey(lookupType.Id, lookupName);

    if (existingKeys.has(duplicateKey) || seenInFile.has(duplicateKey)) {
      duplicates.push(lookupName);
      continue;
    }

    seenInFile.add(duplicateKey);
    toCreate.push({
      lookupTypeId: lookupType.Id,
      lookupTypeTitle: lookupType.Title,
      lookupName,
    });
  }

  if (!toCreate.length && !duplicates.length && !errors.length) {
    throw new Error("The uploaded file does not contain any lookup records.");
  }

  return { toCreate, duplicates, errors };
}

export async function importLookupsFromFile(
  file: File,
  existingItems: ILookup[],
  lookupTypes: ILookupType[],
): Promise<ILookupImportParseResult> {
  const result = await parseLookupImportFile(file, existingItems, lookupTypes);

  if (result.toCreate.length) {
    await bulkCreateLookups(result.toCreate);
  }

  return result;
}

export function exportLookupsToExcel(rows: ILookupRow[]): void {
  const dateStamp = new Date().toISOString().slice(0, 10);

  exportToExcel({
    fileName: `Lookup_Master_Export_${dateStamp}`,
    sheetName: "Lookup",
    columns: [
      {
        header: FieldLabels.LookupType,
        value: (row) => row.LookupTypeTitle,
      },
      {
        header: FieldLabels.LookupName,
        value: (row) => row.LookupName,
      },
    ],
    rows,
  });
}
