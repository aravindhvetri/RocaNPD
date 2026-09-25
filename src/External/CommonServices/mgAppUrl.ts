import { Config } from "./Config";

export function getMgPageBaseUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

export function buildMgHashUrl(hashPathAndQuery: string): string {
  const path = hashPathAndQuery.startsWith("/")
    ? hashPathAndQuery
    : `/${hashPathAndQuery}`;
  return `${getMgPageBaseUrl()}#${path}`;
}

/** Deep link to open a Material Group request form (Consultant review / view). */
export function buildMgRequestFormUrl(
  requestListItemId: number,
  mode: "view" | "edit" | "consultant-edit" = "consultant-edit",
): string {
  const query = new URLSearchParams();
  query.set("id", String(requestListItemId));
  query.set(Config.NpdFormQuery.Mode, mode);
  return buildMgHashUrl(`${Config.Routes.MgNew}?${query.toString()}`);
}

/** Deep link for Initiator Draft / Rework list. */
export function buildMgDraftReworkUrl(): string {
  return buildMgHashUrl(Config.Routes.MgDraftRework);
}

/** Deep link for Initiator to open a rework request in edit mode. */
export function buildMgReworkEditUrl(requestListItemId: number): string {
  return buildMgRequestFormUrl(requestListItemId, "edit");
}

/** Deep link for Initiator to view a rejected request. */
export function buildMgRejectedViewUrl(requestListItemId: number): string {
  return buildMgRequestFormUrl(requestListItemId, "view");
}
