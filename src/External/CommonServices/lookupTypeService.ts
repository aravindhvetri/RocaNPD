import { Config, FieldLabels } from "./Config";
import { exportToExcel } from "./exportService";
import type {
  IImportParseResult,
  ILookupType,
  ILookupTypeRow,
} from "./Interface";
import {
  extractColumnValues,
  findColumnIndex,
  partitionImportValues,
  readSpreadsheetRows,
} from "./importService";
import { validateLookupTypeDeleteAllowed } from "./dependencyValidationService";
import {
  getActiveRecordCreatePayload,
  getActiveRecordFilters,
  getSoftDeletePayload,
  isActiveRecord,
  SOFT_DELETE_FIELD,
} from "./softDelete";
import SPServices from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.LookupType;

const SELECT_FIELDS = "Id,Title,IsDeleted";

function mapLookupType(item: Record<string, unknown>): ILookupType {
  return {
    Id: Number(item.Id),
    Title: String(item.Title ?? ""),
    IsDeleted: Boolean(item[SOFT_DELETE_FIELD]),
  };
}

export async function fetchActiveLookupTypes(): Promise<ILookupType[]> {
  const rows = (await SPServices.SPReadItems({
    Listname: LIST_NAME(),
    Select: SELECT_FIELDS,
    Filter: getActiveRecordFilters(),
    Orderby: "Title",
    Orderbydecorasc: true,
  })) as Record<string, unknown>[];

  return rows.map(mapLookupType).filter(isActiveRecord);
}

export async function createLookupType(title: string): Promise<void> {
  await SPServices.SPAddItem({
    Listname: LIST_NAME(),
    RequestJSON: {
      Title: title.trim(),
      ...getActiveRecordCreatePayload(),
    },
  });
}

export async function updateLookupType(id: number, title: string): Promise<void> {
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

  const headerRowIndex = rows.findIndex((row) =>
    row.some((cell) => cell.trim().length > 0),
  );

  if (headerRowIndex < 0) {
    throw new Error("The uploaded file does not contain a header row.");
  }

  const headerRow = rows[headerRowIndex];
  const columnIndex = findColumnIndex(headerRow, FieldLabels.LookupTypeName);

  if (columnIndex < 0) {
    throw new Error(
      `The uploaded file must include a "${FieldLabels.LookupTypeName}" column.`,
    );
  }

  const values = extractColumnValues(rows, columnIndex, headerRowIndex);

  if (!values.length) {
    throw new Error("The uploaded file does not contain any lookup type names.");
  }

  const existingTitles = existingItems.map((item) => item.Title);
  const { toCreate, duplicates, errors } = partitionImportValues(
    values,
    existingTitles,
  );

  return { toCreate, duplicates, errors };
}

export async function importLookupTypesFromFile(
  file: File,
  existingItems: ILookupType[],
): Promise<IImportParseResult> {
  const result = await parseLookupTypeImportFile(file, existingItems);

  if (result.toCreate.length) {
    await bulkCreateLookupTypes(result.toCreate);
  }

  return result;
}

export function exportLookupTypesToExcel(rows: ILookupTypeRow[]): void {
  const dateStamp = new Date().toISOString().slice(0, 10);

  exportToExcel({
    fileName: `LookupType_Master_Export_${dateStamp}`,
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
