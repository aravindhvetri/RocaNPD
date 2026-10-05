/**
 * TY_DATA field lengths from Material Master Creation REST API, Point 4.
 * `null` means the technical document marks the length as TBC (do not invent one).
 */
export const SapMaterialMasterFieldLengths = {
  material: 18,
  matl_desc: 40,
  matl_type: 4,
  matl_group: 9,
  base_uom: 3,
  plant: 4,
  stge_loc: 4,
  old_mat_no: 18,
  extmatlgrp: 18,
  gross_wt: 13,
  net_weight: 13,
  basic_matl: 48,
  klart: 3,
  mat_extn_plant: 100,
  taxclass_1: 1,
  matl_grp_1: 3,
  matl_grp_2: 3,
  matl_grp_3: 3,
  matl_grp_4: 3,
  matl_grp_5: 3,
  zzmvgr6: null,
  zzmvgr7: null,
  zzmvgr8: null,
  profit_ctr: 10,
  ctrl_code: 8,
  mrp_group: 4,
  mrp_ctrler: 3,
  val_class: 4,
  comm_group: 2,
  mwert: 30,
} as const;

export type SapMaterialMasterFieldKey = keyof typeof SapMaterialMasterFieldLengths;

/** QUAN fields: 3 decimal places, total length includes the decimal point. */
export const SapMaterialMasterQuantityDecimals = 3;

export const SapMaterialMasterQuantityFields = ["gross_wt", "net_weight"] as const;

/**
 * Trims a value to the documented CHAR length.
 * When the stored label is longer than the SAP code (for example
 * "Finished Product - 6000"), the trailing code is used if it fits.
 */
export function fitSapChar(
  value: string,
  maxLength: number | null,
): string {
  const trimmed = String(value ?? "").trim();
  if (maxLength === null || trimmed.length <= maxLength) {
    return trimmed;
  }

  const trailing = trimmed.match(/([A-Za-z0-9]+)\s*$/)?.[1] ?? "";
  if (trailing && trailing.length <= maxLength && trailing.length < trimmed.length) {
    return trailing;
  }

  return trimmed.slice(0, maxLength);
}

export function formatSapQuantity(
  value: number | null | undefined,
  maxLength: number,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }

  const text = value.toFixed(SapMaterialMasterQuantityDecimals);
  return text.length <= maxLength ? text : text.slice(0, maxLength);
}
