import { Config, FieldLabels, FieldNames } from "./Config";
import type {
  INpdItemDetailRecord,
  INpdItemDetailsImportParseResult,
  ISelectOption,
} from "./Interface";
import {
  findBestHeaderRowIndex,
  findColumnIndex,
  importDigitsOnlyError,
  parseImportNumericValue,
  readSpreadsheetWorkbook,
  validateRequiredImportHeaders,
} from "./importService";
import {
  getLookupOptionsByFieldName,
  normalizeLookupCompareValue,
} from "./lookupOptionUtils";

const ITEM_FIELDS = FieldNames.NpdItemDetails;

interface IImportColumn {
  header: string;
  aliases?: string[];
  field: keyof INpdItemDetailRecord;
  controlType: "text" | "number" | "multiselect";
  required: boolean;
  maxLength?: number;
  conditional?: "rocaGlobalCode";
  /** Digits-only text columns (still stored as Single Line of Text). */
  textFilter?: "digits";
}

const IMPORT_COLUMNS: IImportColumn[] = [
  {
    header: FieldLabels.RocaGlobalCode,
    field: "rocaGlobalCode",
    controlType: "text",
    required: true,
    conditional: "rocaGlobalCode",
  },
  {
    header: FieldLabels.MaterialCode,
    field: "materialCode",
    controlType: "text",
    required: true,
    maxLength: 18,
  },
  {
    header: FieldLabels.MaterialDescription,
    field: "materialDescription",
    controlType: "text",
    required: true,
    maxLength: 40,
  },
  {
    header: FieldLabels.ProductGroupMg2,
    field: "productGroupMg2",
    controlType: "multiselect",
    required: true,
  },
  {
    header: FieldLabels.ProductCategoryMg3,
    field: "productCategoryMg3",
    controlType: "multiselect",
    required: true,
  },
  {
    header: FieldLabels.ProductTypeMg4,
    field: "productTypeMg4",
    controlType: "multiselect",
    required: true,
  },
  {
    header: FieldLabels.ProductSourceMg5,
    field: "productSourceMg5",
    controlType: "multiselect",
    required: true,
  },
  {
    header: FieldLabels.ColorMgp1a,
    field: "colorMgp1a",
    controlType: "multiselect",
    required: true,
  },
  {
    header: FieldLabels.ProductRangeMgp2a,
    field: "productRangeMgp2a",
    controlType: "multiselect",
    required: true,
  },
  {
    header: FieldLabels.ProductSubCategoryMgp3a,
    field: "productSubCategoryMgp3a",
    controlType: "multiselect",
    required: true,
  },
  {
    header: FieldLabels.MaterialGroup,
    field: "materialGroup",
    controlType: "multiselect",
    required: true,
  },
  {
    header: FieldLabels.ExtMaterialGroup,
    field: "extMaterialGroup",
    controlType: "multiselect",
    required: true,
  },
  {
    header: FieldLabels.ProductSegment,
    field: "productSegment",
    controlType: "multiselect",
    required: true,
  },
  {
    header: FieldLabels.TaxClassification,
    field: "taxClassification",
    controlType: "multiselect",
    required: true,
  },
  {
    header: FieldLabels.ClassNumberPcsName,
    field: "classNumberPcsName",
    controlType: "multiselect",
    required: true,
  },
  {
    header: FieldLabels.HsnCode,
    field: "hsnCode",
    controlType: "text",
    required: true,
  },
  {
    header: FieldLabels.WeightKg,
    field: "weightKg",
    controlType: "number",
    required: true,
  },
  {
    header: FieldLabels.Uom,
    field: "uom",
    controlType: "multiselect",
    required: true,
  },
  {
    header: FieldLabels.MinQtyBoxQty,
    field: "minQtyBoxQty",
    controlType: "text",
    required: false,
    textFilter: "digits",
  },
];

const SP_HEADER_ALIASES: Partial<Record<keyof INpdItemDetailRecord, string[]>> = {
  rocaGlobalCode: [ITEM_FIELDS.RocaGlobalCode, "rocaGlobalCode"],
  materialCode: [ITEM_FIELDS.MaterialCode, "materialCode"],
  materialDescription: [ITEM_FIELDS.MaterialDescription, "materialDescription"],
  productGroupMg2: [ITEM_FIELDS.ProductGroupMG2, "Product Group MG2", "productGroupMg2"],
  productCategoryMg3: [
    ITEM_FIELDS.ProductCategoryMG3,
    "Product Category MG3",
    "productCategoryMg3",
  ],
  productTypeMg4: [ITEM_FIELDS.ProductTypeMG4, "Product Type MG4", "productTypeMg4"],
  productSourceMg5: [
    ITEM_FIELDS.ProductSourceMG5,
    "Product Source MG5",
    "productSourceMg5",
  ],
  colorMgp1a: [ITEM_FIELDS.ColorMGP1A, "Color MGP1A", "colorMgp1a"],
  productRangeMgp2a: [
    ITEM_FIELDS.ProductRangeMGP2A,
    "Product Range MGP2A",
    "productRangeMgp2a",
  ],
  productSubCategoryMgp3a: [
    ITEM_FIELDS.ProductSubCategoryMGP3A,
    "Product Sub Category MGP3A",
    "productSubCategoryMgp3a",
  ],
  materialGroup: [ITEM_FIELDS.MaterialGroup, "materialGroup"],
  extMaterialGroup: [
    ITEM_FIELDS.ExtMaterialGroup,
    "Ext Material Group",
    "extMaterialGroup",
  ],
  productSegment: [ITEM_FIELDS.ProductSegment, "productSegment"],
  taxClassification: [ITEM_FIELDS.TaxClassification, "taxClassification"],
  classNumberPcsName: [
    ITEM_FIELDS.ClassNumberPcsName,
    "ClassNumberPCS Name",
    "Class Number (PCS Name)",
    "Class Number PCS Name",
    "classNumberPcsName",
  ],
  hsnCode: [ITEM_FIELDS.HSNCode, "hsnCode"],
  weightKg: [ITEM_FIELDS.Weight, "Weight", "Weight Kg", "weightKg"],
  uom: [ITEM_FIELDS.UOM, "uom"],
  minQtyBoxQty: [ITEM_FIELDS.MinQty, "MinQty", "Min Qty/Box Qty", "minQtyBoxQty"],
};

function requiresRocaGlobalCode(brand: string | null): boolean {
  return Config.NpdRocaGlobalCodeBrands.some(
    (value) => value.toLowerCase() === (brand ?? "").trim().toLowerCase(),
  );
}

/** FieldLabels headers required for Item Details Import (brand may add Roca Global Code). */
export function getNpdItemDetailsRequiredHeaders(brand: string | null): string[] {
  const requireRocaGlobalCode = requiresRocaGlobalCode(brand);
  return IMPORT_COLUMNS.filter(
    (column) =>
      column.required &&
      (column.conditional !== "rocaGlobalCode" || requireRocaGlobalCode),
  ).map((column) => column.header);
}

/** Early ImportDialog gate — required FieldLabels must be present before preview/import. */
export async function validateNpdItemDetailsImportHeaders(
  file: File,
  brand: string | null,
): Promise<void> {
  await validateRequiredImportHeaders(
    file,
    getNpdItemDetailsRequiredHeaders(brand),
  );
}

function getColumnMatchLabels(column: IImportColumn): string[] {
  return [
    column.header,
    String(column.field),
    ...(column.aliases ?? []),
    ...(SP_HEADER_ALIASES[column.field] ?? []),
  ].filter((label, index, labels) => labels.indexOf(label) === index);
}

function resolveColumnIndex(headerRow: string[], column: IImportColumn): number {
  for (const label of getColumnMatchLabels(column)) {
    const index = findColumnIndex(headerRow, label);
    if (index >= 0) {
      return index;
    }
  }

  return -1;
}

function splitCellValues(value: string): string[] {
  // Match Item Details persist separator ("; ") — do not split on commas inside
  // Lookup names such as "Vitreous china WC, Basins, Ur".
  return value
    .split(/;|\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Exact Lookup Name match only (trim + case-insensitive).
 * Do not fuzzy-match option.value — MultiSelect values are id+title and
 * loose keys (e.g. parenthetical "Old") incorrectly mapped other names.
 * Returns the Lookup Name for Item Details persist (not the unique option value).
 */
function matchLookupOption(
  rawValue: string,
  options: ISelectOption[],
): string | null {
  const rawKey = normalizeLookupCompareValue(rawValue);
  if (!rawKey) {
    return null;
  }

  const match = options.find(
    (option) =>
      normalizeLookupCompareValue(String(option.label ?? "")) === rawKey,
  );
  return match ? String(match.label).trim() : null;
}

/**
 * Lookup-configured Excel cells: invalid or blank values do not fail import.
 * The MultiSelect is left empty and flagged for a red-border prompt instead.
 */
function resolveImportedLookupField(
  raw: string,
  options: ISelectOption[],
): { values: string[]; needsAttention: boolean } {
  const tokens = splitCellValues(raw);
  if (!tokens.length) {
    return { values: [], needsAttention: true };
  }

  const canonical: string[] = [];
  let hasInvalid = false;
  tokens.forEach((token) => {
    const matched = matchLookupOption(token, options);
    if (!matched) {
      hasInvalid = true;
      return;
    }
    canonical.push(matched);
  });

  if (hasInvalid || !canonical.length) {
    return { values: [], needsAttention: true };
  }

  return { values: canonical, needsAttention: false };
}

function createEmptyRecord(): INpdItemDetailRecord {
  return {
    sharePointId: 0,
    rocaGlobalCode: "",
    materialCode: "",
    materialDescription: "",
    productGroupMg2: [],
    productCategoryMg3: [],
    productTypeMg4: [],
    productSourceMg5: [],
    colorMgp1a: [],
    productRangeMgp2a: [],
    productSubCategoryMgp3a: [],
    materialGroup: [],
    extMaterialGroup: [],
    productSegment: [],
    taxClassification: [],
    classNumberPcsName: [],
    hsnCode: "",
    weightKg: null,
    uom: [],
    minQtyBoxQty: "",
  };
}

function isEmptyRecord(record: INpdItemDetailRecord): boolean {
  return !record.materialCode.trim() && !record.materialDescription.trim();
}

function normalizeUniqueText(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Collect Already exists messages for Material Code only.
 * Roca Global Code and Material Description duplicates are allowed.
 */
function collectUniqueFieldDuplicates(
  record: INpdItemDetailRecord,
  excelRowNumber: number,
  seenMaterialCodes: Set<string>,
): string[] {
  const key = normalizeUniqueText(record.materialCode);
  if (!key) {
    return [];
  }
  if (seenMaterialCodes.has(key)) {
    return [`Row ${excelRowNumber} — Material Code already exists`];
  }
  seenMaterialCodes.add(key);
  return [];
}

export async function parseNpdItemDetailsImportFile(
  file: File,
  existingRecords: INpdItemDetailRecord[],
  lookupOptionsByType: Record<string, ISelectOption[]>,
  brand: string | null,
): Promise<INpdItemDetailsImportParseResult> {
  const sheets = await readSpreadsheetWorkbook(file);
  if (!sheets.some((sheet) => sheet.rows.length)) {
    throw new Error("The uploaded file is empty.");
  }

  const requireRocaGlobalCode = requiresRocaGlobalCode(brand);
  const expectedColumns = IMPORT_COLUMNS.filter(
    (column) =>
      column.conditional !== "rocaGlobalCode" || requireRocaGlobalCode,
  );
  const expectedHeaders = expectedColumns.flatMap(getColumnMatchLabels);

  let headerRow: string[] = [];
  let headerRowIndex = -1;
  let dataRows: string[][] = [];
  let bestScore = 0;

  sheets.forEach((sheet) => {
    const candidateIndex = findBestHeaderRowIndex(sheet.rows, expectedHeaders);
    if (candidateIndex < 0) {
      return;
    }

    const candidateRow = sheet.rows[candidateIndex];
    const score = expectedColumns.reduce(
      (count, column) =>
        count + (resolveColumnIndex(candidateRow, column) >= 0 ? 1 : 0),
      0,
    );

    if (score > bestScore) {
      bestScore = score;
      headerRow = candidateRow;
      headerRowIndex = candidateIndex;
      dataRows = sheet.rows;
    }
  });

  if (headerRowIndex < 0) {
    throw new Error("The uploaded file does not contain a header row.");
  }

  const columnIndexes = IMPORT_COLUMNS.map((column) => ({
    column,
    index: resolveColumnIndex(headerRow, column),
  }));

  const toCreate: INpdItemDetailRecord[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];
  const existingFilled = existingRecords.filter((record) => !isEmptyRecord(record));
  const seenMaterialCodes = new Set(
    existingFilled
      .map((record) => normalizeUniqueText(record.materialCode))
      .filter(Boolean),
  );

  for (let rowIndex = headerRowIndex + 1; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];
    if (!row || !row.some((cell) => cell.trim())) {
      continue;
    }

    const record = createEmptyRecord();
    const excelRowNumber = rowIndex + 1;
    const importAttentionFields: Array<keyof INpdItemDetailRecord> = [];
    let rowBlocked = false;

    columnIndexes.forEach(({ column, index }) => {
      if (index < 0) {
        return;
      }
      if (column.conditional === "rocaGlobalCode" && !requireRocaGlobalCode) {
        return;
      }

      const raw = String(row[index] ?? "").trim();

      // Material Code duplicates are validated separately. Blank / unmatched
      // required fields keep the red-border flag. Min. Qty/Box Qty is optional.
      if (column.controlType === "text") {
        if (column.textFilter === "digits") {
          // Optional: blank is allowed with no red border.
          if (!raw) {
            (record[column.field] as string) = "";
            return;
          }
          const formatError = importDigitsOnlyError(
            raw,
            column.header,
            excelRowNumber,
          );
          if (formatError) {
            errors.push(formatError);
            rowBlocked = true;
            return;
          }
          (record[column.field] as string) = raw;
          return;
        }

        (record[column.field] as string) = raw;
        if (!raw) {
          importAttentionFields.push(column.field);
        }
        return;
      }

      if (column.controlType === "number") {
        if (!raw) {
          record.weightKg = null;
          importAttentionFields.push(column.field);
          return;
        }
        const weight = parseImportNumericValue(raw);
        if (Number.isFinite(weight)) {
          record.weightKg = weight;
        } else {
          record.weightKg = null;
          importAttentionFields.push(column.field);
        }
        return;
      }

      if (column.controlType !== "multiselect") {
        return;
      }

      const options = getLookupOptionsByFieldName(
        lookupOptionsByType,
        column.header,
        String(column.field),
      );
      const resolved = resolveImportedLookupField(raw, options);
      (record[column.field] as string[]) = resolved.values;
      if (resolved.needsAttention) {
        importAttentionFields.push(column.field);
      }
    });

    if (rowBlocked) {
      continue;
    }

    if (importAttentionFields.length) {
      Object.assign(record, {
        lookupImportAttentionFields: importAttentionFields,
      });
    }

    const fieldDuplicates = collectUniqueFieldDuplicates(
      record,
      excelRowNumber,
      seenMaterialCodes,
    );
    if (fieldDuplicates.length) {
      duplicates.push(...fieldDuplicates);
      continue;
    }

    toCreate.push(record);
  }

  if (!toCreate.length && !duplicates.length && !errors.length) {
    throw new Error("The uploaded file does not contain any Item Details records.");
  }

  return { toCreate, duplicates, errors };
}
