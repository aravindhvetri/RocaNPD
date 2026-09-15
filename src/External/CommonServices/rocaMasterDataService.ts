import { Config, WorkflowSystems } from "./Config";
import type { ISelectOption } from "./Interface";
import {
  resolveCurrentSiteUrl,
  resolveRocaMasterSiteUrl,
} from "./rocaSiteUrlResolver";
import { getActiveRecordFilters } from "./softDelete";
import SPServices from "./SPServices";

function mapBrandOption(item: Record<string, unknown>): ISelectOption | null {
  const label = String(item.Title ?? "").trim();

  if (!label) {
    return null;
  }

  return { label, value: label };
}

function mapRoleOption(item: Record<string, unknown>): ISelectOption | null {
  const roleName = String(item.Title ?? item.RoleName ?? "").trim();

  if (!roleName) {
    return null;
  }

  return { label: roleName, value: roleName };
}

function mapPlantOption(item: Record<string, unknown>): ISelectOption | null {
  const plantCode = String(item.PlantCode ?? "").trim();

  if (!plantCode) {
    return null;
  }

  return { label: plantCode, value: plantCode };
}

function getRocaSiteUrl(contextSiteUrl?: string): string {
  const currentSiteUrl = resolveCurrentSiteUrl(contextSiteUrl);
  const rocaSiteUrl = resolveRocaMasterSiteUrl(currentSiteUrl);

  if (!rocaSiteUrl) {
    throw new Error(
      "Unable to resolve the ROCA master site URL for this environment.",
    );
  }

  return rocaSiteUrl;
}

export async function fetchRocaBrandOptions(
  contextSiteUrl?: string,
): Promise<ISelectOption[]> {
  const rocaSiteUrl = getRocaSiteUrl(contextSiteUrl);

  const rows = (await SPServices.getAnotherSPReadItems({
    SiteUrl: rocaSiteUrl,
    Listname: Config.RocaMasterListNames.BrandMaster,
    Select: "Id,Title",
    Topcount: 5000,
  })) as Record<string, unknown>[];

  return rows
    .map(mapBrandOption)
    .filter((option): option is ISelectOption => option !== null)
    .sort((left, right) => left.label.localeCompare(right.label));
}

export async function fetchRocaNpdRoleOptions(
  contextSiteUrl?: string,
): Promise<ISelectOption[]> {
  const rocaSiteUrl = getRocaSiteUrl(contextSiteUrl);

  const rows = (await SPServices.getAnotherSPReadItems({
    SiteUrl: rocaSiteUrl,
    Listname: Config.RocaMasterListNames.RoleMaster,
    Select: "Id,Title,System/Title",
    Expand: "System",
    Filter: [
      {
        FilterKey: "System/Title",
        FilterValue: WorkflowSystems.Npd,
        Operator: "eq",
      },
    ],
    Topcount: 5000,
  })) as Record<string, unknown>[];

  const excludedRoles = new Set(
    [
      Config.Roles.Initiator,
      ...Config.WorkflowNpdExcludedNextRoles,
    ].map((role) => role.trim().toLowerCase()),
  );

  return rows
    .map(mapRoleOption)
    .filter((option): option is ISelectOption => option !== null)
    .filter(
      (option) =>
        !excludedRoles.has(String(option.value).trim().toLowerCase()),
    )
    .sort((left, right) => left.label.localeCompare(right.label));
}

export async function fetchRocaPlantOptions(
  contextSiteUrl?: string,
): Promise<ISelectOption[]> {
  const rocaSiteUrl = getRocaSiteUrl(contextSiteUrl);

  const rows = (await SPServices.getAnotherSPReadItems({
    SiteUrl: rocaSiteUrl,
    Listname: Config.RocaMasterListNames.PlantMaster,
    Select: "Id,PlantCode,IsDeleted",
    Filter: getActiveRecordFilters(),
    Orderby: "PlantCode",
    Orderbydecorasc: true,
  })) as Record<string, unknown>[];

  return rows
    .map(mapPlantOption)
    .filter((option): option is ISelectOption => option !== null);
}
