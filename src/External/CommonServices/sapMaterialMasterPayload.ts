import type { INpdItemDetailRecord, INpdOtherDetails } from "./Interface";
import {
  SapMaterialMasterFieldLengths,
  fitSapChar,
  formatSapQuantity,
  type SapMaterialMasterFieldKey,
} from "./sapMaterialMasterFieldConfig";
import {
  SapItemDetailsLookupFieldHints,
  SapOtherDetailsLookupFieldHints,
  mapSapMaterialTypeCode,
} from "./sapMaterialMasterLookupFieldHints";
import type { ISapLookupCodeResolver } from "./sapMaterialMasterLookupResolver";

/** One TY_DATA object. Each API call sends `[row]` (array of one object). */
export interface ISapMaterialMasterRequestRow {
  material: string;
  matl_desc: string;
  matl_type: string;
  matl_group: string;
  base_uom: string;
  plant: string;
  stge_loc: string;
  old_mat_no: string;
  extmatlgrp: string;
  gross_wt: string;
  net_weight: string;
  basic_matl: string;
  klart: string;
  mat_extn_plant: string;
  taxclass_1: string;
  matl_grp_1: string;
  matl_grp_2: string;
  matl_grp_3: string;
  matl_grp_4: string;
  matl_grp_5: string;
  zzmvgr6: string;
  zzmvgr7: string;
  zzmvgr8: string;
  profit_ctr: string;
  ctrl_code: string;
  mrp_group: string;
  mrp_ctrler: string;
  val_class: string;
  comm_group: string;
  mwert: string;
}

export interface ISapMaterialMasterPayloadSource {
  item: INpdItemDetailRecord;
  /** General Information Material Type. */
  materialType: string;
  /** General Information Plant / Source. */
  plant: string;
  /** General Information Brand (MG1). */
  brand: string;
  otherDetails: INpdOtherDetails;
}

export interface ISapMaterialMasterPayloadContext {
  lookupResolver: ISapLookupCodeResolver;
}

function charField(key: SapMaterialMasterFieldKey, value: string): string {
  return fitSapChar(value, SapMaterialMasterFieldLengths[key]);
}

function firstValue(values: string[] | undefined): string {
  return (values ?? []).map((value) => String(value ?? "").trim()).filter(Boolean)[0] ?? "";
}

function lookupSapValue(
  resolver: ISapLookupCodeResolver,
  lookupTypeHints: readonly string[],
  values: string[] | undefined,
  sapField: SapMaterialMasterFieldKey,
): string {
  const display = firstValue(values);
  const code = resolver.codeForLookupField([...lookupTypeHints], display);
  return charField(sapField, code);
}

function commaSeparated(value: string): string {
  return value
    .split(/[;,\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(",");
}

/**
 * Plant (WERKS, 4) comes from General Information when that value already fits.
 * Traded Products store Imported/Domestic there; the SAP plant is the Other Details
 * plant code derived from General Information (CCWH).
 */
function resolveSapPlant(source: ISapMaterialMasterPayloadSource): string {
  const generalPlant = source.plant.trim();
  const sapPlant = source.otherDetails.plantCode.trim();
  if (
    generalPlant &&
    generalPlant.length <= SapMaterialMasterFieldLengths.plant
  ) {
    return generalPlant;
  }
  return sapPlant || generalPlant;
}

export function buildSapMaterialMasterRequestRow(
  source: ISapMaterialMasterPayloadSource,
  context: ISapMaterialMasterPayloadContext,
): ISapMaterialMasterRequestRow {
  const { item, otherDetails } = source;
  const { lookupResolver } = context;
  const weight = formatSapQuantity(
    item.weightKg,
    SapMaterialMasterFieldLengths.gross_wt,
  );

  return {
    material: charField("material", item.materialCode),
    matl_desc: charField("matl_desc", item.materialDescription),
    matl_type: charField("matl_type", mapSapMaterialTypeCode(source.materialType)),
    matl_group: lookupSapValue(
      lookupResolver,
      SapItemDetailsLookupFieldHints.materialGroup,
      item.materialGroup,
      "matl_group",
    ),
    base_uom: lookupSapValue(
      lookupResolver,
      SapItemDetailsLookupFieldHints.uom,
      item.uom,
      "base_uom",
    ),
    plant: charField("plant", resolveSapPlant(source)),
    stge_loc: charField("stge_loc", otherDetails.storageLocation),
    old_mat_no: "",
    extmatlgrp: lookupSapValue(
      lookupResolver,
      SapItemDetailsLookupFieldHints.extMaterialGroup,
      item.extMaterialGroup,
      "extmatlgrp",
    ),
    gross_wt: weight,
    net_weight: weight,
    basic_matl: "",
    klart: charField("klart", otherDetails.classType || "001"),
    mat_extn_plant: charField(
      "mat_extn_plant",
      commaSeparated(otherDetails.materialExtension),
    ),
    taxclass_1: lookupSapValue(
      lookupResolver,
      SapItemDetailsLookupFieldHints.taxClassification,
      item.taxClassification,
      "taxclass_1",
    ),
    matl_grp_1: charField("matl_grp_1", source.brand),
    matl_grp_2: lookupSapValue(
      lookupResolver,
      SapItemDetailsLookupFieldHints.productGroupMg2,
      item.productGroupMg2,
      "matl_grp_2",
    ),
    matl_grp_3: lookupSapValue(
      lookupResolver,
      SapItemDetailsLookupFieldHints.productCategoryMg3,
      item.productCategoryMg3,
      "matl_grp_3",
    ),
    matl_grp_4: lookupSapValue(
      lookupResolver,
      SapItemDetailsLookupFieldHints.productTypeMg4,
      item.productTypeMg4,
      "matl_grp_4",
    ),
    matl_grp_5: lookupSapValue(
      lookupResolver,
      SapItemDetailsLookupFieldHints.productSourceMg5,
      item.productSourceMg5,
      "matl_grp_5",
    ),
    zzmvgr6: lookupSapValue(
      lookupResolver,
      SapItemDetailsLookupFieldHints.colorMgp1a,
      item.colorMgp1a,
      "zzmvgr6",
    ),
    zzmvgr7: lookupSapValue(
      lookupResolver,
      SapItemDetailsLookupFieldHints.productRangeMgp2a,
      item.productRangeMgp2a,
      "zzmvgr7",
    ),
    zzmvgr8: lookupSapValue(
      lookupResolver,
      SapItemDetailsLookupFieldHints.productSubCategoryMgp3a,
      item.productSubCategoryMgp3a,
      "zzmvgr8",
    ),
    profit_ctr: charField(
      "profit_ctr",
      lookupResolver.codeForLookupField(
        [...SapOtherDetailsLookupFieldHints.profitCenter],
        otherDetails.profitCenter,
      ),
    ),
    ctrl_code: charField("ctrl_code", item.hsnCode),
    mrp_group: charField("mrp_group", otherDetails.mrpGroup),
    mrp_ctrler: charField("mrp_ctrler", otherDetails.mrpController),
    val_class: charField("val_class", otherDetails.valuationClass),
    comm_group: lookupSapValue(
      lookupResolver,
      SapItemDetailsLookupFieldHints.productSegment,
      item.productSegment,
      "comm_group",
    ),
    mwert: lookupSapValue(
      lookupResolver,
      SapItemDetailsLookupFieldHints.classNumberPcsName,
      item.classNumberPcsName,
      "mwert",
    ),
  };
}
