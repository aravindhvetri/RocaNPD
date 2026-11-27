import { isOwnManufactureProductsMaterialType, NpdMaterialTypes } from "./Config";
import type { ISelectOption } from "./Interface";

/**
 * Profit Center derivation from Documents/Profit centre Logic.xlsx (Sheet1).
 * Type, COAr, and To Period are not used.
 * Sheet2 rows have no derivation logic and are not auto-selected.
 * Returned text is the Excel "Profit center text". The caller must map it
 * onto an existing Profit Center lookup option or leave the field empty.
 */

export interface IProfitCenterDerivationInput {
  brand: string | null | undefined;
  materialType: string | null | undefined;
  plantSource: string | null | undefined;
  /** Product Category (MG3) for every Item Details row, in grid order. */
  mg3ByRow: readonly (readonly string[])[];
}

/** Exact Product Category (MG3) labels. Similar names are not interchangeable. */
const MG3 = {
  sanware: "sanware",
  faucetsAndOthers: "faucets & faucets others",
  pipes: "pipes & fittings",
  fittings: "p&f - fittings",
  solvant: "p&f solvant",
  pfPipes: "p&f pipes",
} as const;

/** OTHERTAN: not Sanware, not Faucets & Faucets Others, not Pipes & Fittings. */
const ALLIED_EXCLUDED_MG3 = [MG3.sanware, MG3.faucetsAndOthers, MG3.pipes];

function compact(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "");
}

function sameText(left: string, right: string): boolean {
  const a = compact(left);
  const b = compact(right);
  return Boolean(a) && a === b;
}

function brandMatches(
  brand: string,
  aliases: readonly string[],
): boolean {
  const key = compact(brand);
  return aliases.some((alias) => compact(alias) === key);
}

const BRAND_PW = ["PW", "Parryware", "Paryware"];
const BRAND_JP = ["JP", "Johnson", "Johnson Pedder"];
const BRAND_PARRYWARE_OR_JP = [...BRAND_PW, ...BRAND_JP];
const BRAND_ROCA = ["ROCA", "Roca"];
const BRAND_ARMANI = ["Armani"];
const BRAND_LAUFEN = ["Laufen", "laufen"];

function isFert(materialType: string | null | undefined): boolean {
  return isOwnManufactureProductsMaterialType(materialType);
}

function isHawa(materialType: string | null | undefined): boolean {
  return (
    (materialType || "").trim().toLowerCase() ===
    NpdMaterialTypes.TradedProducts.toLowerCase()
  );
}

function isDomestic(plantSource: string): boolean {
  return compact(plantSource) === "domestic";
}

function isImport(plantSource: string): boolean {
  const key = compact(plantSource);
  return key === "import" || key === "imported";
}

function isPlant(plantSource: string, code: string): boolean {
  return compact(plantSource) === compact(code);
}

/** Case-insensitive exact MG3 text. Punctuation and "&" stay, so "Faucets" is not "Faucets & Faucets Others". */
function mg3Key(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function rowMg3Keys(values: readonly string[]): string[] {
  return values.map((value) => mg3Key(value)).filter(Boolean);
}

/** Every Item Details row has MG3, and every selected MG3 is one of the allowed values. */
function everyRowMg3Is(
  rows: readonly (readonly string[])[],
  allowed: readonly string[],
): boolean {
  if (!rows.length) {
    return false;
  }
  const allowedKeys = allowed.map((value) => mg3Key(value));
  return rows.every((values) => {
    const keys = rowMg3Keys(values);
    return (
      keys.length > 0 && keys.every((key) => allowedKeys.includes(key))
    );
  });
}

/** Every row has MG3, and none of those values is an excluded category. */
function everyRowMg3IsOtherThan(
  rows: readonly (readonly string[])[],
  excluded: readonly string[],
): boolean {
  if (!rows.length) {
    return false;
  }
  const excludedKeys = excluded.map((value) => mg3Key(value));
  return rows.every((values) => {
    const keys = rowMg3Keys(values);
    return (
      keys.length > 0 && keys.every((key) => !excludedKeys.includes(key))
    );
  });
}

interface IProfitCenterRule {
  /** Excel Profit center text. */
  text: string;
  matches: (input: {
    brand: string;
    plantSource: string;
    fert: boolean;
    hawa: boolean;
    mg3ByRow: readonly (readonly string[])[];
  }) => boolean;
}

/**
 * More specific MG3 rules are listed before broader brand/plant rules
 * so a matching MG3 condition wins over a brand-only rule.
 */
const PROFIT_CENTER_RULES: readonly IProfitCenterRule[] = [
  {
    text: "CTAP-IMPORTS TAPS 3R",
    matches: ({ brand, hawa, plantSource, mg3ByRow }) =>
      hawa &&
      isImport(plantSource) &&
      brandMatches(brand, BRAND_PARRYWARE_OR_JP) &&
      everyRowMg3Is(mg3ByRow, [MG3.faucetsAndOthers]),
  },
  {
    text: "CTAP-TAPS & FITTINGS",
    matches: ({ hawa, plantSource, mg3ByRow }) =>
      hawa &&
      isDomestic(plantSource) &&
      everyRowMg3Is(mg3ByRow, [MG3.faucetsAndOthers]),
  },
  {
    text: "CRAJ-PW TRADED RAJKO",
    matches: ({ brand, hawa, plantSource, mg3ByRow }) =>
      hawa &&
      isDomestic(plantSource) &&
      brandMatches(brand, BRAND_PW) &&
      everyRowMg3Is(mg3ByRow, [MG3.sanware]),
  },
  {
    text: "PIPES & FITTINGS DOM",
    matches: ({ brand, hawa, plantSource, mg3ByRow }) =>
      hawa &&
      isDomestic(plantSource) &&
      brandMatches(brand, BRAND_PW) &&
      everyRowMg3Is(mg3ByRow, [MG3.pipes]),
  },
  {
    text: "CTRG-ALLIED TRADED",
    matches: ({ brand, hawa, plantSource, mg3ByRow }) =>
      hawa &&
      isDomestic(plantSource) &&
      !brandMatches(brand, BRAND_ROCA) &&
      everyRowMg3IsOtherThan(mg3ByRow, ALLIED_EXCLUDED_MG3),
  },
  {
    text: "FITTINGS PERUNDURAI",
    matches: ({ fert, plantSource, mg3ByRow }) =>
      fert &&
      isPlant(plantSource, "FPND") &&
      everyRowMg3Is(mg3ByRow, [MG3.fittings, MG3.solvant]),
  },
  {
    text: "PIPES PERUNDURAI",
    matches: ({ fert, plantSource, mg3ByRow }) =>
      fert &&
      isPlant(plantSource, "FPND") &&
      everyRowMg3Is(mg3ByRow, [MG3.pfPipes]),
  },
  {
    text: "CIMP-PW TRADED IMPOR",
    matches: ({ brand, hawa, plantSource }) =>
      hawa &&
      isImport(plantSource) &&
      brandMatches(brand, BRAND_PARRYWARE_OR_JP),
  },
  {
    text: "CROC-ROCA IMPORTS 3R",
    matches: ({ brand, hawa, plantSource }) =>
      hawa && isImport(plantSource) && brandMatches(brand, BRAND_ROCA),
  },
  {
    text: "CARM-ARMANI TRADED I",
    matches: ({ brand, hawa, plantSource }) =>
      hawa && isImport(plantSource) && brandMatches(brand, BRAND_ARMANI),
  },
  {
    text: "CLAF-LAUFEN TRADED I",
    matches: ({ brand, hawa, plantSource }) =>
      hawa && isImport(plantSource) && brandMatches(brand, BRAND_LAUFEN),
  },
  {
    text: "CROC-ROCA DOMESTIC",
    matches: ({ brand, hawa, plantSource }) =>
      hawa && isDomestic(plantSource) && brandMatches(brand, BRAND_ROCA),
  },
  {
    text: "CALW-CERAMICS -ALWAR",
    matches: ({ fert, plantSource }) => fert && isPlant(plantSource, "CALW"),
  },
  {
    text: "CDEW-CERAMICS - DEWA",
    matches: ({ fert, plantSource }) => fert && isPlant(plantSource, "CDEW"),
  },
  {
    text: "CPND-CERAMICS - PERU",
    matches: ({ fert, plantSource }) => fert && isPlant(plantSource, "CPND"),
  },
  {
    text: "CRPT-CERAMICS-RANIPT",
    matches: ({ fert, plantSource }) => fert && isPlant(plantSource, "CRPT"),
  },
  {
    text: "FALW-PIPES-ALWAR",
    matches: ({ fert, plantSource }) => fert && isPlant(plantSource, "FALW"),
  },
  {
    text: "PVC FITTINGS SRIPERU",
    matches: ({ fert, plantSource }) => fert && isPlant(plantSource, "FSRI"),
  },
  {
    text: "PIRU-PLASTICS -IRRU",
    matches: ({ fert, plantSource }) => fert && isPlant(plantSource, "PIRU"),
  },
  {
    text: "PPTN-PLASTICS - PANT",
    matches: ({ fert, plantSource }) => fert && isPlant(plantSource, "PPTN"),
  },
  {
    text: "PSRI-PLASTICS -SRIPE",
    matches: ({ fert, plantSource }) => fert && isPlant(plantSource, "PSRI"),
  },
  {
    text: "TBIW-TAPS BHIWADI",
    matches: ({ fert, plantSource }) => fert && isPlant(plantSource, "TBIW"),
  },
];

/** Excel Profit center text when a rule matches; otherwise empty. */
export function deriveProfitCenterText(
  input: IProfitCenterDerivationInput,
): string {
  const brand = (input.brand || "").trim();
  const plantSource = (input.plantSource || "").trim();
  if (!brand || !plantSource) {
    return "";
  }

  const context = {
    brand,
    plantSource,
    fert: isFert(input.materialType),
    hawa: isHawa(input.materialType),
    mg3ByRow: input.mg3ByRow,
  };
  if (!context.fert && !context.hawa) {
    return "";
  }

  const rule = PROFIT_CENTER_RULES.find((candidate) =>
    candidate.matches(context),
  );
  return rule?.text || "";
}

/**
 * Existing Profit Center lookup option value for the derived text.
 * Empty when no rule matches or the lookup option is missing.
 */
export function resolveProfitCenterOptionValue(
  derivedText: string,
  options: readonly ISelectOption[],
): string {
  const target = derivedText.trim();
  if (!target || !options.length) {
    return "";
  }

  const exact = options.find((option) =>
    sameText(String(option.label || option.value || ""), target),
  );
  if (!exact) {
    return "";
  }
  return String(exact.value ?? exact.label ?? "").trim();
}
