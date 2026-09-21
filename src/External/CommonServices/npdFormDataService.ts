import {
  Config,
  NpdApproverSystems,
  NpdPlantSourceFilters,
  NpdTradedPlantSources,
} from "./Config";
import type { ISelectOption } from "./Interface";
import {
  getLookupTitles,
  isDeletedApproverRow,
  lookupTitlesInclude,
} from "./lookupFieldUtils";
import {
  personFieldMatchesEmail,
  resolveLoginEmail,
} from "./personFieldUtils";
import { requireRocaMasterSiteUrl } from "./rocaSiteUrlResolver";
import SPServices from "./SPServices";

const APPROVERS_SELECT =
  "Id,IsDelete,System/Title,Role/Title,Brand/Title,Users/Id,Users/Title,Users/EMail";
const APPROVERS_EXPAND = "System,Role,Brand,Users";

function getRowUsers(row: Record<string, unknown>): unknown {
  return row.Users ?? row.User;
}

function isActivePlantValue(value: unknown): boolean {
  if (value === true || value === 1) {
    return true;
  }

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return normalized === "yes" || normalized === "true" || normalized === "1";
}

/**
 * Brand options from ApproversMaster, in documented order:
 * 1. System Title = New Product Development
 * 2. Role Title = Initiator
 * 3. Users EMail = logged-in user email
 * 4. Brand Title values
 */
function mapDistinctBrandOptions(
  rows: Record<string, unknown>[],
  loginEmail: string,
): ISelectOption[] {
  const brandTitles = new Set<string>();

  rows.forEach((row) => {
    if (isDeletedApproverRow(row)) {
      return;
    }

    if (!lookupTitlesInclude(row.System, NpdApproverSystems.NewProductDevelopment)) {
      return;
    }

    if (!lookupTitlesInclude(row.Role, Config.Roles.Initiator)) {
      return;
    }

    if (!personFieldMatchesEmail(getRowUsers(row), loginEmail)) {
      return;
    }

    getLookupTitles(row.Brand).forEach((title) => brandTitles.add(title));
  });

  return Array.from(brandTitles)
    .sort((left, right) => left.localeCompare(right))
    .map((title) => ({ label: title, value: title }));
}

export async function fetchInitiatorBrandOptions(
  loginEmail: string,
  contextSiteUrl?: string,
  loginName?: string,
): Promise<ISelectOption[]> {
  const rocaSiteUrl = requireRocaMasterSiteUrl(contextSiteUrl);
  const resolvedEmail = resolveLoginEmail(loginEmail, loginName);

  if (!resolvedEmail) {
    return [];
  }

  const rows = (await SPServices.getAnotherSPReadItems({
    SiteUrl: rocaSiteUrl,
    Listname: Config.RocaMasterListNames.ApproversMaster,
    Select: APPROVERS_SELECT,
    Expand: APPROVERS_EXPAND,
    Topcount: 5000,
  })) as Record<string, unknown>[];

  return mapDistinctBrandOptions(rows, resolvedEmail);
}

export async function fetchFinishedProductPlantSourceOptions(
  contextSiteUrl?: string,
): Promise<ISelectOption[]> {
  const rocaSiteUrl = requireRocaMasterSiteUrl(contextSiteUrl);

  const rows = (await SPServices.getAnotherSPReadItems({
    SiteUrl: rocaSiteUrl,
    Listname: Config.RocaMasterListNames.PlantMaster,
    Select: "Id,PlantCode,PlantType,IsActive",
    Orderby: "PlantCode",
    Orderbydecorasc: true,
    Topcount: 5000,
  })) as Record<string, unknown>[];

  const plantCodes = new Set<string>();

  rows.forEach((row) => {
    const plantCode = String(row.PlantCode ?? "").trim();
    const plantType = String(row.PlantType ?? "").trim();

    if (
      plantCode &&
      plantType === NpdPlantSourceFilters.FactoryPlantType &&
      isActivePlantValue(row.IsActive)
    ) {
      plantCodes.add(plantCode);
    }
  });

  return Array.from(plantCodes)
    .sort((left, right) => left.localeCompare(right))
    .map((code) => ({ label: code, value: code }));
}

export function getTradedProductPlantSourceOptions(): ISelectOption[] {
  return [
    {
      label: NpdTradedPlantSources.Imported,
      value: NpdTradedPlantSources.Imported,
    },
    {
      label: NpdTradedPlantSources.Domestic,
      value: NpdTradedPlantSources.Domestic,
    },
  ];
}

export function getNpdMaterialTypeOptions(): ISelectOption[] {
  return [
    {
      label: Config.NpdMaterialTypes.FinishedProducts,
      value: Config.NpdMaterialTypes.FinishedProducts,
    },
    {
      label: Config.NpdMaterialTypes.TradedProducts,
      value: Config.NpdMaterialTypes.TradedProducts,
    },
  ];
}

export async function fetchPlantSourceOptionsForMaterialType(
  materialType: string,
  contextSiteUrl?: string,
): Promise<ISelectOption[]> {
  if (materialType === Config.NpdMaterialTypes.FinishedProducts) {
    return fetchFinishedProductPlantSourceOptions(contextSiteUrl);
  }

  if (materialType === Config.NpdMaterialTypes.TradedProducts) {
    return getTradedProductPlantSourceOptions();
  }

  return [];
}
