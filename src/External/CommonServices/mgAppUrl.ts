import { Config } from "./Config";
import {
  resolveNpdWebAbsoluteUrl,
} from "./npdAppUrl";

/**
 * Absolute URL of the current NPD web (site root).
 * Outlook email Login and hash deep links use this — never SitePages/RocaNPD.aspx.
 * Recipients may not have that page; checks run from the site URL + query params.
 */
export function getMgAppPageUrl(contextSiteUrl?: string): string {
  return resolveNpdWebAbsoluteUrl(contextSiteUrl).replace(/\/+$/, "");
}

/**
 * In-app hash URL (browser navigation). Not for Outlook — SafeLinks strip hashes.
 */
export function buildMgHashUrl(
  hashPathAndQuery: string,
  contextSiteUrl?: string,
): string {
  const pageUrl = getMgAppPageUrl(contextSiteUrl);
  const path = hashPathAndQuery.startsWith("/")
    ? hashPathAndQuery
    : `/${hashPathAndQuery}`;
  if (!pageUrl) {
    return `#${path}`;
  }
  return `${pageUrl}#${path}`;
}

/**
 * Outlook-safe deep link: encodes the hash route as `npdRoute` on the site URL
 * (not SitePages/RocaNPD.aspx). Recipients may not have that page during login;
 * after sign-in they return to the site URL and MainComponent restores the hash.
 */
export function buildMgEmailLoginUrl(
  hashPathAndQuery: string,
  contextSiteUrl?: string,
): string {
  const siteUrl = resolveNpdWebAbsoluteUrl(contextSiteUrl).replace(/\/+$/, "");
  if (!siteUrl) {
    return "";
  }
  const path = hashPathAndQuery.startsWith("/")
    ? hashPathAndQuery
    : `/${hashPathAndQuery}`;
  return `${siteUrl}?npdRoute=${encodeURIComponent(path)}`;
}

function buildMgFormHashRoute(
  requestListItemId: number,
  mode: "view" | "edit" | "consultant-edit",
  viewAs?: string,
): string {
  const query = new URLSearchParams();
  query.set("id", String(requestListItemId));
  query.set(Config.NpdFormQuery.Mode, mode);
  if (viewAs) {
    query.set(Config.NpdFormQuery.ViewAs, viewAs);
  }
  return `${Config.Routes.MgNew}?${query.toString()}`;
}

/** Deep link to open a Material Group request form (Consultant review / view). */
export function buildMgRequestFormUrl(
  requestListItemId: number,
  mode: "view" | "edit" | "consultant-edit" = "consultant-edit",
  contextSiteUrl?: string,
): string {
  const viewAs =
    mode === "consultant-edit" ? Config.Roles.Consultant : undefined;
  return buildMgEmailLoginUrl(
    buildMgFormHashRoute(requestListItemId, mode, viewAs),
    contextSiteUrl,
  );
}

/**
 * Consultant submit-notification Login URL — SafeLinks resilient.
 * Route is encoded as `npdRoute` on the site URL (not SitePages/RocaNPD.aspx).
 */
export function buildMgConsultantEmailLoginUrl(
  requestListItemId: number,
  contextSiteUrl?: string,
): string {
  return buildMgEmailLoginUrl(
    buildMgFormHashRoute(
      requestListItemId,
      "consultant-edit",
      Config.Roles.Consultant,
    ),
    contextSiteUrl,
  );
}

/** Deep link for Initiator Draft / Rework list. */
export function buildMgDraftReworkUrl(contextSiteUrl?: string): string {
  return buildMgEmailLoginUrl(Config.Routes.MgDraftRework, contextSiteUrl);
}

/** Deep link for Initiator to open a rework request in edit mode (email-safe). */
export function buildMgReworkEditUrl(
  requestListItemId: number,
  contextSiteUrl?: string,
): string {
  return buildMgEmailLoginUrl(
    buildMgFormHashRoute(requestListItemId, "edit"),
    contextSiteUrl,
  );
}

/** Deep link for Initiator to view a rejected request (email-safe). */
export function buildMgRejectedViewUrl(
  requestListItemId: number,
  contextSiteUrl?: string,
): string {
  return buildMgEmailLoginUrl(
    buildMgFormHashRoute(requestListItemId, "view"),
    contextSiteUrl,
  );
}
