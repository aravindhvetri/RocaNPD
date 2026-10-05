import { Config, NpdMisLookupTypes } from "./Config";

/**
 * Lookup type hints for Item Details MultiSelect columns (field header + field key).
 * Must stay aligned with `NPD_ITEM_DETAILS_FIELDS` lookup headers.
 */
export const SapItemDetailsLookupFieldHints = {
  productGroupMg2: ["Product Group (MG2)", "productGroupMg2"],
  productCategoryMg3: ["Product Category (MG3)", "productCategoryMg3"],
  productTypeMg4: ["Product Type (MG4)", "productTypeMg4"],
  productSourceMg5: ["Product Source (MG5)", "productSourceMg5"],
  colorMgp1a: ["Color (MGP1A)", "colorMgp1a"],
  productRangeMgp2a: ["Product Range (MGP2A)", "productRangeMgp2a"],
  productSubCategoryMgp3a: [
    "Product Sub Category (MGP3A)",
    "productSubCategoryMgp3a",
  ],
  materialGroup: ["Material Group", "materialGroup"],
  extMaterialGroup: ["Ext. Material Group", "extMaterialGroup"],
  productSegment: ["Product Segment", "productSegment"],
  taxClassification: ["Tax Classification", "taxClassification"],
  classNumberPcsName: ["Class number (PCS Name)", "classNumberPcsName"],
  uom: ["UOM", "uom"],
} as const;

export const SapOtherDetailsLookupFieldHints = {
  profitCenter: [NpdMisLookupTypes.ProfitCenter, "Profit Center", "profitCenter"],
} as const;

/** Brand (MG1) may exist as an NPD_Lookup type for Material Master BrandCode. */
export const SapBrandLookupFieldHints = ["Brand", "Brand (MG1)", "brand"] as const;

/** Maps UI Material Type labels to SAP MTART codes. */
export function mapSapMaterialTypeCode(materialType: string): string {
  const normalized = materialType.trim().toLowerCase();

  if (
    normalized === Config.NpdMaterialTypes.FinishedProducts.toLowerCase() ||
    normalized === "finished product"
  ) {
    return "FERT";
  }

  if (
    normalized === Config.NpdMaterialTypes.TradedProducts.toLowerCase() ||
    normalized === "traded" ||
    normalized === "traded product" ||
    normalized === "traded products"
  ) {
    return "HAWA";
  }

  return materialType.trim();
}
