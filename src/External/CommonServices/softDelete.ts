import type { IFilter } from "./ISPServicesProps";

/** Internal SharePoint field name used for soft-delete across master lists. */
export const SOFT_DELETE_FIELD = "IsDeleted";

/** OData filters that return only active (non-deleted) list items. */
export function getActiveRecordFilters(): IFilter[] {
  return [{ FilterKey: SOFT_DELETE_FIELD, FilterValue: "0", Operator: "eq" }];
}

/** Payload applied when soft-deleting a SharePoint list item. */
export function getSoftDeletePayload(): Record<string, boolean> {
  return { [SOFT_DELETE_FIELD]: true };
}

/** Payload applied when creating a new master list item. */
export function getActiveRecordCreatePayload(): Record<string, boolean> {
  return { [SOFT_DELETE_FIELD]: false };
}

/** Client-side guard — excludes items marked as deleted. */
export function isActiveRecord<T extends { IsDeleted?: boolean }>(
  item: T,
): boolean {
  return item.IsDeleted !== true;
}
