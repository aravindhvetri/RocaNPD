import type { ILookupType } from "../../../../../External/CommonServices/Interface";
import { FieldLabels } from "../../../../../External/CommonServices/Config";
import { lookupValuesMatch } from "../../../../../External/CommonServices/lookupOptionUtils";
import type { NpdItemDetailFieldKey } from "./npdItemDetails.types";

interface INpdItemDetailRequiredFieldRef {
  field: NpdItemDetailFieldKey;
  header: string;
  required: boolean;
}

/** Always mandatory in Item Details, regardless of NPD_LookupType.Required. */
export const ALWAYS_REQUIRED_ITEM_DETAIL_FIELDS: ReadonlySet<NpdItemDetailFieldKey> =
  new Set([
    "materialCode",
    "materialDescription",
    "rocaGlobalCode",
    "hsnCode",
    "weightKg",
  ]);

function getItemDetailLookupMatchLabels(
  fieldDef: INpdItemDetailRequiredFieldRef,
): string[] {
  const labels = [fieldDef.header, String(fieldDef.field)];

  if (fieldDef.field === "materialGroup") {
    labels.push(
      "Material Group",
      "Material / Business Group",
      "Material / Business group",
      FieldLabels.MaterialGroup,
    );
  }

  if (fieldDef.field === "weightKg") {
    labels.push("Weight", FieldLabels.WeightKg, "Weight Kg");
  }

  if (fieldDef.field === "rocaGlobalCode") {
    labels.push(
      FieldLabels.RocaGlobalCode,
      "CMA / Global Code",
      "CMA / Global code",
    );
  }

  return labels.filter(
    (label, index, all) => Boolean(label) && all.indexOf(label) === index,
  );
}

/**
 * True when the Item Details column must be mandatory:
 * always-required fields, or a Lookup Type Title match with Required = Yes.
 */
export function isNpdItemDetailFieldRequired(
  fieldDef: INpdItemDetailRequiredFieldRef,
  lookupTypes: readonly ILookupType[],
): boolean {
  if (ALWAYS_REQUIRED_ITEM_DETAIL_FIELDS.has(fieldDef.field)) {
    return true;
  }

  const matchLabels = getItemDetailLookupMatchLabels(fieldDef);
  return lookupTypes.some(
    (lookupType) =>
      lookupType.Required === true &&
      matchLabels.some((label) => lookupValuesMatch(lookupType.Title, label)),
  );
}

/** Applies dynamic Required flags from NPD_LookupType onto field defs. */
export function withNpdItemDetailsRequiredFlags<
  T extends INpdItemDetailRequiredFieldRef,
>(fields: readonly T[], lookupTypes: readonly ILookupType[]): T[] {
  return fields.map((fieldDef) => ({
    ...fieldDef,
    required: isNpdItemDetailFieldRequired(fieldDef, lookupTypes),
  }));
}
