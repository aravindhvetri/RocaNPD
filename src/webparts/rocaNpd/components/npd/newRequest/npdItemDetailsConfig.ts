import type { INpdItemDetailRecord } from "../../../../../External/CommonServices/Interface";
import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type {
  INpdItemDetailRow,
  NpdItemDetailFieldKey,
  NpdItemDetailFieldValue,
  NpdItemDetailsControlType,
} from "./npdItemDetails.types";

export interface INpdItemDetailsFieldDef {
  field: NpdItemDetailFieldKey;
  header: string;
  required: boolean;
  placeholder: string;
  minWidth: string;
  controlType: NpdItemDetailsControlType;
  maxLength?: number;
  /** For `text` controls: alphanumeric sanitize when set. */
  textFilter?: "alphanumeric";
}

let nextRowId = 1;

export function createNpdItemDetailRowId(): string {
  nextRowId += 1;
  return `npd-item-${nextRowId}`;
}

export function createEmptyNpdItemDetailRow(
  isMisAdded = false,
): INpdItemDetailRow {
  return {
    id: createNpdItemDetailRowId(),
    sharePointId: 0,
    isMisAdded,
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
  };
}

export function toNpdItemDetailRow(
  record: INpdItemDetailRecord,
): INpdItemDetailRow {
  const attention = (
    record as INpdItemDetailRecord & {
      lookupImportAttentionFields?: NpdItemDetailFieldKey[];
    }
  ).lookupImportAttentionFields;

  return {
    ...record,
    id: createNpdItemDetailRowId(),
    sharePointId: record.sharePointId || 0,
    isMisAdded: Boolean(record.isMisAdded),
    sapPosted: Boolean(record.sapPosted),
    ...(Array.isArray(attention) && attention.length
      ? { lookupImportAttentionFields: attention }
      : {}),
  };
}

export function hasLookupImportAttention(
  row: INpdItemDetailRow,
  field: NpdItemDetailFieldKey,
): boolean {
  const fields = row.lookupImportAttentionFields;
  return Array.isArray(fields) && fields.includes(field);
}

export function clearLookupImportAttention(
  row: INpdItemDetailRow,
  field: NpdItemDetailFieldKey,
  value: NpdItemDetailFieldValue,
): INpdItemDetailRow {
  if (!hasLookupImportAttention(row, field)) {
    return row;
  }

  const selected = Array.isArray(value)
    ? value.some((entry) => String(entry ?? "").trim())
    : typeof value === "number"
      ? Number.isFinite(value)
      : Boolean(String(value ?? "").trim());
  if (!selected) {
    return row;
  }

  const remaining = (row.lookupImportAttentionFields || []).filter(
    (key) => key !== field,
  );
  if (!remaining.length) {
    const { lookupImportAttentionFields: _removed, ...rest } = row;
    return rest as INpdItemDetailRow;
  }

  return { ...row, lookupImportAttentionFields: remaining };
}

export function toNpdItemDetailRecord(
  row: INpdItemDetailRow,
): INpdItemDetailRecord {
  return {
    sharePointId: row.sharePointId || 0,
    isMisAdded: Boolean(row.isMisAdded),
    rocaGlobalCode: row.rocaGlobalCode,
    materialCode: row.materialCode,
    materialDescription: row.materialDescription,
    productGroupMg2: row.productGroupMg2,
    productCategoryMg3: row.productCategoryMg3,
    productTypeMg4: row.productTypeMg4,
    productSourceMg5: row.productSourceMg5,
    colorMgp1a: row.colorMgp1a,
    productRangeMgp2a: row.productRangeMgp2a,
    productSubCategoryMgp3a: row.productSubCategoryMgp3a,
    materialGroup: row.materialGroup,
    extMaterialGroup: row.extMaterialGroup,
    productSegment: row.productSegment,
    taxClassification: row.taxClassification,
    classNumberPcsName: row.classNumberPcsName,
    hsnCode: row.hsnCode,
    weightKg: row.weightKg,
    uom: row.uom,
  };
}

export function isEmptyItemDetailRow(row: INpdItemDetailRow): boolean {
  return (
    !String(row.materialCode ?? "").trim() &&
    !String(row.materialDescription ?? "").trim()
  );
}

export const NPD_ITEM_DETAILS_FIELDS: INpdItemDetailsFieldDef[] = [
  {
    field: "rocaGlobalCode",
    header: FieldLabels.RocaGlobalCode,
    required: true,
    placeholder: "Enter the Code",
    minWidth: "14rem",
    controlType: "text",
  },
  {
    field: "materialCode",
    header: "Material Code",
    required: true,
    placeholder: "Max 18 Chars",
    minWidth: "12rem",
    controlType: "text",
    maxLength: 18,
  },
  {
    field: "materialDescription",
    header: "Material Description",
    required: true,
    placeholder: "Max 40 Chars",
    minWidth: "22rem",
    controlType: "text",
    maxLength: 40,
  },
  {
    field: "productGroupMg2",
    header: "Product Group (MG2)",
    required: true,
    placeholder: "Select Group",
    minWidth: "12.5rem",
    controlType: "multiselect",
  },
  {
    field: "productCategoryMg3",
    header: "Product Category (MG3)",
    required: true,
    placeholder: "Select Category",
    minWidth: "13.5rem",
    controlType: "multiselect",
  },
  {
    field: "productTypeMg4",
    header: "Product Type (MG4)",
    required: true,
    placeholder: "Select Type",
    minWidth: "12.5rem",
    controlType: "multiselect",
  },
  {
    field: "productSourceMg5",
    header: "Product Source (MG5)",
    required: true,
    placeholder: "Select Source",
    minWidth: "12.5rem",
    controlType: "multiselect",
  },
  {
    field: "colorMgp1a",
    header: "Color (MGP1A)",
    required: true,
    placeholder: "Select Color",
    minWidth: "11.5rem",
    controlType: "multiselect",
  },
  {
    field: "productRangeMgp2a",
    header: "Product Range (MGP2A)",
    required: true,
    placeholder: "Select Range",
    minWidth: "12.5rem",
    controlType: "multiselect",
  },
  {
    field: "productSubCategoryMgp3a",
    header: "Product Sub Category (MGP3A)",
    required: true,
    placeholder: "Select Sub Category",
    minWidth: "16rem",
    controlType: "multiselect",
  },
  {
    field: "materialGroup",
    header: FieldLabels.MaterialGroup,
    required: true,
    placeholder: "Select Material Group",
    minWidth: "14.5rem",
    controlType: "multiselect",
  },
  {
    field: "extMaterialGroup",
    header: "Ext. Material Group",
    required: true,
    placeholder: "Select Ext. Material Group",
    minWidth: "13.5rem",
    controlType: "multiselect",
  },
  {
    field: "productSegment",
    header: "Product Segment",
    required: true,
    placeholder: "Select Segment",
    minWidth: "12.5rem",
    controlType: "multiselect",
  },
  {
    field: "taxClassification",
    header: "Tax Classification",
    required: true,
    placeholder: "Select Tax Classification",
    minWidth: "13.5rem",
    controlType: "multiselect",
  },
  {
    field: "classNumberPcsName",
    header: "Class number (PCS Name)",
    required: true,
    placeholder: "Select Class Number",
    minWidth: "14.5rem",
    controlType: "multiselect",
  },
  {
    field: "hsnCode",
    header: "HSN Code",
    required: true,
    placeholder: "Enter Code",
    minWidth: "7rem",
    controlType: "text",
    maxLength: 8,
  },
  {
    field: "weightKg",
    header: "Weight (Kg)",
    required: true,
    placeholder: "Enter Weight",
    minWidth: "8rem",
    controlType: "number",
  },
  {
    field: "uom",
    header: "UOM",
    required: true,
    placeholder: "Select UOM",
    minWidth: "9rem",
    controlType: "multiselect",
  },
];

/** All Item Details columns — CMA - ROCA Global Code is visible for every brand. */
export function getVisibleNpdItemDetailFields(
  _brand: string | null,
): INpdItemDetailsFieldDef[] {
  return NPD_ITEM_DETAILS_FIELDS;
}
