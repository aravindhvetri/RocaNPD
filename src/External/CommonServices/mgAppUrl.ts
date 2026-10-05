import { Config } from "./Config";
import {
  resolveNpdWebAbsoluteUrl,
} from "./npdAppUrl";

/**
 * Absolute URL of SitePages/RocaNPD.aspx on the current NPD web.
 * Same host page as NPD email Login links (Outlook SafeLinks–safe).
 */
export function getMgAppPageUrl(contextSiteUrl?: string): string {
  const siteUrl = resolveNpdWebAbsoluteUrl(contextSiteUrl).replace(/\/+$/, "");
  if (!siteUrl) {
    return "";
  }
  return `${siteUrl}/${Config.NpdApproverMail.SitePagesFolder}/RocaNPD.aspx`;
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
 * Outlook-safe deep link: encodes the hash route as `npdRoute` (same as NPD Login).
 * MainComponent restores it to the hash before HashRouter mounts.
 */
export function buildMgEmailLoginUrl(
  hashPathAndQuery: string,
  contextSiteUrl?: string,
): string {
  const pageUrl = getMgAppPageUrl(contextSiteUrl);
  if (!pageUrl) {
    return "";
  }
  const path = hashPathAndQuery.startsWith("/")
    ? hashPathAndQuery
    : `/${hashPathAndQuery}`;
  return `${pageUrl}?npdRoute=${encodeURIComponent(path)}`;
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
  return buildMgHashUrl(
    buildMgFormHashRoute(requestListItemId, mode, viewAs),
    contextSiteUrl,
  );
}

/**
 * Consultant submit-notification Login URL — SafeLinks resilient.
 * Do not put `id` / `mode` on the server query string (SharePoint SitePages error).
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
