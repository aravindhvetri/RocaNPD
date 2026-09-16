export type INpdItemDetailRow = {
  id: string;
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
  weightKg: string[];
  uom: string[];
  minQtyBoxQty: string;
} & Record<string, unknown>;

export type NpdItemDetailFieldKey = Exclude<keyof INpdItemDetailRow, "id">;

export type NpdItemDetailsControlType = "multiselect" | "text";
