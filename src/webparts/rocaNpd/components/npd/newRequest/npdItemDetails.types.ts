export type INpdItemDetailRow = {
  id: string;
  sharePointId: number;
  rocaGlobalCode: string;
  materialCode: string;
  materialDescription: string;
  productGroupMg2: string[];
  productCategoryMg3: string[];
  productTypeMg4: string[];
  productSourceMg5: string[];
  colorMgp1a: string[];
  productRangeMgp2a: string[];
  productSubCategoryMgp3a: string[];
  materialGroup: string[];
  extMaterialGroup: string[];
  productSegment: string[];
  taxClassification: string[];
  classNumberPcsName: string[];
  hsnCode: string;
  weightKg: number | null;
  uom: string[];
  isMisAdded?: boolean;
  /** NPD_ItemDetails.SAP — true after this line was accepted by SAP. */
  sapPosted?: boolean;
  /**
   * Field keys left blank/invalid after Excel import (text, number, or Lookup).
   * UI-only red-border attention; not persisted.
   */
  lookupImportAttentionFields?: NpdItemDetailFieldKey[];
} & Record<string, unknown>;

export type NpdItemDetailFieldKey = Exclude<
  keyof INpdItemDetailRow,
  | "id"
  | "sharePointId"
  | "isMisAdded"
  | "sapPosted"
  | "lookupImportAttentionFields"
>;

export type NpdItemDetailFieldValue = string | string[] | number | null;

export type NpdItemDetailsControlType = "multiselect" | "text" | "number";
