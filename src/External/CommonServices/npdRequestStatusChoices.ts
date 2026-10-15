import { RequestStatus } from "./Config";

/**
 * Status values for list filter ordering — derived from Config (no SharePoint
 * field metadata call). Dropdown options still come from Status values already
 * present on the loaded NPD_Request rows.
 */
export function getNpdRequestStatusChoiceCatalog(): string[] {
  return [
    RequestStatus.Draft,
    RequestStatus.Pending,
    RequestStatus.Rework,
    RequestStatus.Approved,
    RequestStatus.Rejected,
    RequestStatus.Completed,
  ];
}

/**
 * @deprecated Use {@link getNpdRequestStatusChoiceCatalog} — avoids
 * GetByInternalNameOrTitle('Status') on every list page load.
 */
export async function fetchNpdRequestStatusChoices(): Promise<string[]> {
  return getNpdRequestStatusChoiceCatalog();
}
