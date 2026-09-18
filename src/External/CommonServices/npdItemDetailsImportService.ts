import { Config, FieldLabels, FieldNames } from "./Config";
import type {
  INpdItemDetailRecord,
  INpdItemDetailsImportParseResult,
  ISelectOption,
} from "./Interface";
import {
  findBestHeaderRowIndex,
  findColumnIndex,
  readSpreadsheetWorkbook,
} from "./importService";
import { getLookupOptionsByFieldName, lookupValuesMatch } from "./lookupOptionUtils";

const MAX_ROWS = Config.NpdItemImport.MaxRows;
const ITEM_FIELDS = FieldNames.NpdItemDetails;

interface IImportColumn {
  header: string;
  aliases?: string[];
  field: keyof INpdItemDetailRecord;
  controlType: "text" | "number" | "multiselect";
  required: boolean;
  maxLength?: number;
  conditional?: "rocaGlobalCode";
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
  return value
    .split(/[;,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function canonicalizeLookupValues(
  rawValues: string[],
  options: ISelectOption[],
  header: string,
  rowNumber: number,
  errors: string[],
): string[] {
  const canonical: string[] = [];

  rawValues.forEach((rawValue) => {
    const match = options.find(
      (option) =>
        lookupValuesMatch(String(option.value), rawValue) ||
        lookupValuesMatch(option.label, rawValue),
    );

    if (!match) {
      errors.push(
        `Row ${rowNumber}: "${rawValue}" is not a valid ${header} option.`,
      );
      return;
    }

    canonical.push(String(match.value));
  });

  return canonical;
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

function duplicateKey(record: INpdItemDetailRecord): string {
  return [
    record.materialCode,
    record.materialDescription,
    record.productGroupMg2.join("|"),
    record.uom.join("|"),
  ]
    .join("::")
    .trim()
    .toLowerCase();
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

  const requireRocaGlobalCode = Config.NpdRocaGlobalCodeBrands.some(
    (value) => value.toLowerCase() === (brand ?? "").trim().toLowerCase(),
  );
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

  const missingHeaders = columnIndexes
    .filter(({ column, index }) => {
      if (index >= 0) {
        return false;
      }
      if (column.conditional === "rocaGlobalCode" && !requireRocaGlobalCode) {
        return false;
      }
      return column.required;
    })
    .map(({ column }) => column.header);

  if (missingHeaders.length) {
    throw new Error(
      `The uploaded file must include: ${missingHeaders.join(", ")}.`,
    );
  }

  const toCreate: INpdItemDetailRecord[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];
  const seen = new Set(
    existingRecords
      .filter((record) => !isEmptyRecord(record))
      .map((record) => duplicateKey(record)),
  );

  let dataRowCount = 0;

  for (let rowIndex = headerRowIndex + 1; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];
    if (!row || !row.some((cell) => cell.trim())) {
      continue;
    }

    dataRowCount += 1;
    if (dataRowCount > MAX_ROWS) {
      errors.push(
        `Import is limited to ${MAX_ROWS} Item Details records at once.`,
      );
      break;
    }

    const record = createEmptyRecord();
    const excelRowNumber = rowIndex + 1;
    const errorCountBefore = errors.length;

    columnIndexes.forEach(({ column, index }) => {
      if (index < 0) {
        return;
      }

      const raw = String(row[index] ?? "").trim();
      const required =
        column.required &&
        (column.conditional !== "rocaGlobalCode" || requireRocaGlobalCode);

      if (column.controlType === "text") {
        if (required && !raw) {
          errors.push(`Row ${excelRowNumber}: ${column.header} is required.`);
          return;
        }
        if (column.maxLength && raw.length > column.maxLength) {
          errors.push(
            `Row ${excelRowNumber}: ${column.header} must be ${column.maxLength} characters or fewer.`,
          );
          return;
        }
        (record[column.field] as string) = raw;
        return;
      }

      if (column.controlType === "number") {
        if (required && !raw) {
          errors.push(`Row ${excelRowNumber}: ${column.header} is required.`);
          return;
        }
        if (!raw) {
          record.weightKg = null;
          return;
        }
        const numeric = Number(String(raw).replace(/,/g, ""));
        if (!Number.isFinite(numeric) || numeric < 0) {
          errors.push(`Row ${excelRowNumber}: ${column.header} must be a valid number.`);
          return;
        }
        record.weightKg = numeric;
        return;
      }

      const tokens = splitCellValues(raw);
      if (required && !tokens.length) {
        errors.push(`Row ${excelRowNumber}: ${column.header} is required.`);
        return;
      }

      const options = getLookupOptionsByFieldName(
        lookupOptionsByType,
        column.header,
        String(column.field),
      );
      if (!options.length && tokens.length) {
        errors.push(
          `Row ${excelRowNumber}: ${column.header} options are not configured.`,
        );
        return;
      }
      const canonical = canonicalizeLookupValues(
        tokens,
        options,
        column.header,
        excelRowNumber,
        errors,
      );
      (record[column.field] as string[]) = canonical;
    });

    if (isEmptyRecord(record) || errors.length > errorCountBefore) {
      continue;
    }

    const key = duplicateKey(record);
    if (seen.has(key)) {
      duplicates.push(record.materialCode || `Row ${excelRowNumber}`);
      continue;
    }

    seen.add(key);
    toCreate.push(record);
  }

  if (!toCreate.length && !duplicates.length && !errors.length) {
    throw new Error("The uploaded file does not contain any Item Details records.");
  }

  return { toCreate, duplicates, errors };
}
