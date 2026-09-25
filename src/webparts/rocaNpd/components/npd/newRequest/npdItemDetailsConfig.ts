import { NpdRocaGlobalCodeBrands } from "../../../../../External/CommonServices/Config";
import type { INpdItemDetailRecord } from "../../../../../External/CommonServices/Interface";
import type {
  INpdItemDetailRow,
  NpdItemDetailFieldKey,
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
  conditional?: "rocaGlobalCode";
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
    minQtyBoxQty: "",
  };
}

export function toNpdItemDetailRow(
  record: INpdItemDetailRecord,
): INpdItemDetailRow {
  return {
    ...record,
    id: createNpdItemDetailRowId(),
    sharePointId: record.sharePointId || 0,
    isMisAdded: Boolean(record.isMisAdded),
  };
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
    minQtyBoxQty: row.minQtyBoxQty,
  };
}

export function isEmptyItemDetailRow(row: INpdItemDetailRow): boolean {
  return (
    !String(row.materialCode ?? "").trim() &&
    !String(row.materialDescription ?? "").trim()
  );
}

export function isRocaGlobalCodeBrand(brand: string | null): boolean {
  if (!brand) {
    return false;
  }

  const normalizedBrand = brand.trim().toLowerCase();
  return NpdRocaGlobalCodeBrands.some(
    (value) => value.toLowerCase() === normalizedBrand,
  );
}

export const NPD_ITEM_DETAILS_FIELDS: INpdItemDetailsFieldDef[] = [
  {
    field: "rocaGlobalCode",
    header: "Roca Global Code",
    required: true,
    placeholder: "Enter Roca Global Code",
    minWidth: "12rem",
    controlType: "text",
    conditional: "rocaGlobalCode",
  },
  {
    field: "materialCode",
    header: "Material Code",
    required: true,
    placeholder: "Max 18 Chars",
    minWidth: "10.5rem",
    controlType: "text",
    maxLength: 18,
  },
  {
    field: "materialDescription",
    header: "Material Description",
    required: true,
    placeholder: "Max 40 Chars",
    minWidth: "19.5rem",
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
    header: "Material Group",
    required: true,
    placeholder: "Select Material Group",
    minWidth: "11.5rem",
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
    placeholder: "Enter HSN Code",
    minWidth: "10rem",
    controlType: "text",
  },
  {
    field: "weightKg",
    header: "Weight (Kg)",
    required: true,
    placeholder: "Enter Weight",
    minWidth: "10rem",
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
  {
    field: "minQtyBoxQty",
    header: "Min. Qty/Box Qty",
    required: false,
    placeholder: "Enter Min. Qty/Box Qty",
    minWidth: "12.5rem",
    controlType: "text",
  },
];

export function getVisibleNpdItemDetailFields(
  brand: string | null,
): INpdItemDetailsFieldDef[] {
  const showRocaGlobalCode = isRocaGlobalCodeBrand(brand);

  return NPD_ITEM_DETAILS_FIELDS.filter((fieldDef) => {
    if (fieldDef.conditional === "rocaGlobalCode") {
      return showRocaGlobalCode;
    }

    return true;
  });
}
