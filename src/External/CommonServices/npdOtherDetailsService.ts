import {
  Config,
  NpdMaterialTypes,
  NpdMisClassTypeDefault,
  NpdMisLookupTypes,
  NpdMisPlantCodes,
  NpdTradedPlantSources,
  NpdValuationClasses,
} from "./Config";
import type {
  ILookup,
  INpdOtherDetails,
  IPlantMasterSapDetails,
  ISelectOption,
} from "./Interface";
import { fetchActiveBrandMaterialExtensions } from "./brandMaterialExtensionService";
import { fetchActiveLookups } from "./lookupService";
import {
  getLookupMatchKeys,
  lookupValuesMatch,
} from "./lookupOptionUtils";
import { requireRocaMasterSiteUrl } from "./rocaSiteUrlResolver";
import SPServices from "./SPServices";

function isActivePlantValue(value: unknown): boolean {
  if (value === true || value === 1) {
    return true;
  }
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return (
    normalized === "yes" ||
    normalized === "true" ||
    normalized === "1" ||
    normalized === "active"
  );
}

export function createEmptyNpdOtherDetails(): INpdOtherDetails {
  return {
    plantCode: "",
    storageLocation: "",
    profitCenter: "",
    mrpGroup: "",
    mrpController: "",
    valuationClass: "",
    classType: NpdMisClassTypeDefault,
    materialExtension: "",
  };
}

/**
 * Finished Products → Plant/Source code.
 * Traded Products → CCWH.
 */
export function resolveMisPlantCode(
  materialType: string | null | undefined,
  plantSource: string | null | undefined,
): string {
  const type = (materialType || "").trim();
  const plant = (plantSource || "").trim();

  if (type === NpdMaterialTypes.TradedProducts) {
    return NpdMisPlantCodes.TradedWarehouse;
  }

  if (type === NpdMaterialTypes.FinishedProducts) {
    return plant;
  }

  return plant;
}

/**
 * Valuation Class display string based on Material Type + Plant/Source.
 */
export function resolveMisValuationClass(
  materialType: string | null | undefined,
  plantSource: string | null | undefined,
): string {
  const type = (materialType || "").trim();
  const plant = (plantSource || "").trim().toLowerCase();

  if (type === NpdMaterialTypes.FinishedProducts) {
    return NpdValuationClasses.FinishedProduct;
  }

  if (type === NpdMaterialTypes.TradedProducts) {
    if (plant === NpdTradedPlantSources.Imported.toLowerCase()) {
      return NpdValuationClasses.TradedImported;
    }
    if (plant === NpdTradedPlantSources.Domestic.toLowerCase()) {
      return NpdValuationClasses.TradedDomestic;
    }
  }

  return "";
}

function readPlantField(
  row: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = String(row[key] ?? "").trim();
    if (value) {
      return value;
    }
  }
  return "";
}

/**
 * Loads Storage Location / MRP Group / MRP Controller for a Plant Code from ROCA PlantMaster.
 */
export async function fetchPlantMasterSapDetails(
  plantCode: string,
  contextSiteUrl?: string,
): Promise<IPlantMasterSapDetails | null> {
  const code = plantCode.trim();
  if (!code) {
    return null;
  }

  const rocaSiteUrl = requireRocaMasterSiteUrl(contextSiteUrl);
  const rows = (await SPServices.getAnotherSPReadItems({
    SiteUrl: rocaSiteUrl,
    Listname: Config.RocaMasterListNames.PlantMaster,
    Select:
      "Id,PlantCode,PlantType,IsActive,StorageLocation,MRPGroup,MRPController",
    Orderby: "PlantCode",
    Orderbydecorasc: true,
    Topcount: 5000,
  })) as Record<string, unknown>[];

  const normalized = code.toLowerCase();
  const match = rows.find((row) => {
    const rowCode = String(row.PlantCode ?? "").trim();
    if (rowCode.toLowerCase() !== normalized) {
      return false;
    }
    if (row.IsActive !== undefined && !isActivePlantValue(row.IsActive)) {
      return false;
    }
    return true;
  });

  if (!match) {
    return null;
  }

  return {
    plantCode: String(match.PlantCode ?? "").trim() || code,
    storageLocation: readPlantField(
      match,
      "StorageLocation",
      "Storage_x0020_Location",
      "Location",
    ),
    mrpGroup: readPlantField(match, "MRPGroup", "MRP_x0020_Group"),
    mrpController: readPlantField(
      match,
      "MRPController",
      "MRP_x0020_Controller",
    ),
  };
}

/**
 * Profit Center dropdown: Lookup Name only (same clean pattern as Lookup Type).
 * Falls back to Lookup Code when name is empty.
 */
export function buildProfitCenterOptions(
  lookups: readonly ILookup[],
): ISelectOption[] {
  const options: ISelectOption[] = [];
  const seen = new Set<string>();

  lookups.forEach((lookup) => {
    if (
      !lookupValuesMatch(
        lookup.LookupTypeTitle,
        NpdMisLookupTypes.ProfitCenter,
      )
    ) {
      return;
    }

    const code = (lookup.LookupCode || "").trim();
    const title = (lookup.LookupName || "").trim();
    const label = title || code;
    if (!label) {
      return;
    }

    const key = label.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    options.push({ label, value: label });
  });

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export async function fetchProfitCenterOptions(): Promise<ISelectOption[]> {
  const lookups = await fetchActiveLookups();
  return buildProfitCenterOptions(lookups);
}

/**
 * Material Extension from NPD_BrandMaterialExtensionMaster.Plant for the selected Brand.
 */
export async function fetchMaterialExtensionForBrand(
  brand: string | null | undefined,
): Promise<string> {
  const brandTitle = (brand || "").trim();
  if (!brandTitle) {
    return "";
  }

  const rows = await fetchActiveBrandMaterialExtensions();
  const match = rows.find(
    (row) => row.Brand.trim().toLowerCase() === brandTitle.toLowerCase(),
  );
  return match?.Plant?.trim() || "";
}

export interface IBuildMisOtherDetailsParams {
  materialType: string | null;
  plantSource: string | null;
  brand: string | null;
  plantDetails?: IPlantMasterSapDetails | null;
  materialExtension?: string;
  /** Preserve editable fields when re-deriving auto fields. */
  existing?: Partial<INpdOtherDetails> | null;
}

/**
 * Builds Other Details values: auto fields from rules + PlantMaster + Brand Extension.
 * Keeps existing Profit Center / Material Extension when already set by MIS.
 */
export function buildMisOtherDetails(
  params: IBuildMisOtherDetailsParams,
): INpdOtherDetails {
  const plantCode = resolveMisPlantCode(
    params.materialType,
    params.plantSource,
  );
  const valuationClass = resolveMisValuationClass(
    params.materialType,
    params.plantSource,
  );
  const plantDetails = params.plantDetails;
  const existing = params.existing;

  const materialExtension =
    (existing?.materialExtension || "").trim() ||
    (params.materialExtension || "").trim();

  return {
    plantCode,
    storageLocation: plantDetails?.storageLocation || "",
    profitCenter: (existing?.profitCenter || "").trim(),
    mrpGroup: plantDetails?.mrpGroup || "",
    mrpController: plantDetails?.mrpController || "",
    valuationClass,
    classType: NpdMisClassTypeDefault,
    materialExtension,
  };
}

export function mapOtherDetailsFromRequest(
  request: {
    PlantCode?: string;
    StorageLocation?: string;
    ProfitCenter?: string;
    MRPGroup?: string;
    MRPController?: string;
    ValuationClass?: string;
    ClassType?: string;
    MaterialExtension?: string;
  },
): INpdOtherDetails {
  return {
    plantCode: String(request.PlantCode ?? "").trim(),
    storageLocation: String(request.StorageLocation ?? "").trim(),
    profitCenter: String(request.ProfitCenter ?? "").trim(),
    mrpGroup: String(request.MRPGroup ?? "").trim(),
    mrpController: String(request.MRPController ?? "").trim(),
    valuationClass: String(request.ValuationClass ?? "").trim(),
    classType:
      String(request.ClassType ?? "").trim() || NpdMisClassTypeDefault,
    materialExtension: String(request.MaterialExtension ?? "").trim(),
  };
}

export function otherDetailsHaveSavedValues(
  details: INpdOtherDetails | null | undefined,
): boolean {
  if (!details) {
    return false;
  }
  return Boolean(
    details.plantCode ||
      details.storageLocation ||
      details.profitCenter ||
      details.mrpGroup ||
      details.mrpController ||
      details.valuationClass ||
      details.materialExtension,
  );
}

/** Ensures Profit Center options include at least the Lookup Type key aliases. */
export function getProfitCenterOptionsFromLookupMap(
  optionsByType: Record<string, ISelectOption[]>,
): ISelectOption[] {
  for (const key of getLookupMatchKeys(NpdMisLookupTypes.ProfitCenter)) {
    const options = optionsByType[key];
    if (options?.length) {
      return options;
    }
  }
  return [];
}
