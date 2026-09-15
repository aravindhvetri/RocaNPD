import { Config } from "./Config";
import type { IDeleteDependencyRule } from "./Interface";
import { getActiveRecordFilters } from "./softDelete";
import SPServices from "./SPServices";

async function hasMatchingActiveRecord(
  listName: string,
  filterKey: string,
  filterValue: string | number,
): Promise<boolean> {
  try {
    const rows = (await SPServices.SPReadItems({
      Listname: listName,
      Select: "Id",
      Filter: [
        ...getActiveRecordFilters(),
        {
          FilterKey: filterKey,
          FilterValue: String(filterValue),
          Operator: "eq",
        },
      ],
      Topcount: 1,
    })) as unknown[];

    return rows.length > 0;
  } catch {
    return false;
  }
}

async function evaluateDependencyRule(
  rule: IDeleteDependencyRule,
  lookupName: string,
): Promise<boolean> {
  if (rule.matchLookupName) {
    return hasMatchingActiveRecord(rule.listName, rule.filterKey, lookupName);
  }

  return false;
}

/**
 * Returns a user-facing Toast message when deletion is blocked, otherwise null.
 */
export async function validateLookupTypeDeleteAllowed(
  lookupTypeId: number,
  lookupTypeName: string,
): Promise<string | null> {
  const hasLookups = await hasMatchingActiveRecord(
    Config.ListNames.Lookup,
    Config.FieldNames.Lookup.LookupTypeId,
    lookupTypeId,
  );

  if (hasLookups) {
    return `Cannot delete "${lookupTypeName}" because it is configured in one or more Lookup records.`;
  }

  return null;
}

/**
 * Returns a user-facing Toast message when deletion is blocked, otherwise null.
 */
export async function validateLookupDeleteAllowed(
  lookupName: string,
): Promise<string | null> {
  for (const rule of Config.DeleteDependencies.Lookup) {
    const isBlocked = await evaluateDependencyRule(rule, lookupName);

    if (isBlocked) {
      return `Cannot delete "${lookupName}" because it is configured in ${rule.blockedByLabel}.`;
    }
  }

  return null;
}
