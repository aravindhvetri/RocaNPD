import { Config } from "./Config";
import type { NpdWorkflowAction } from "./Interface";
import { resolveCurrentSiteUrl } from "./rocaSiteUrlResolver";

/**
 * Normalizes any absolute SharePoint URL down to the web root
 * (origin + /sites/{siteName}). Never hardcodes tenant or site name.
 *
 * Rejects malformed values like `…/sites/SitePages` (SitePages is a library,
 * not a site).
 */
export function normalizeNpdWebAbsoluteUrl(raw?: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    let pathname = url.pathname || "/";

    const sitePagesIdx = pathname.toLowerCase().indexOf("/sitepages");
    if (sitePagesIdx >= 0) {
      pathname = pathname.slice(0, sitePagesIdx) || "/";
    }

    const sitesMatch = pathname.match(/^(\/sites\/[^/]+)/i);
    if (sitesMatch) {
      const sitePath = sitesMatch[1];
      if (/^\/sites\/sitepages$/i.test(sitePath)) {
        return "";
      }
      return `${url.origin}${sitePath}`;
    }

    return `${url.origin}${pathname === "/" ? "" : pathname}`.replace(
      /\/+$/,
      "",
    );
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

/**
 * Absolute URL of the current NPD web — always from live context.
 * Never hardcodes tenant or site name.
 */
export function resolveNpdWebAbsoluteUrl(contextSiteUrl?: string): string {
  const fromArg = normalizeNpdWebAbsoluteUrl(contextSiteUrl);
  if (fromArg) {
    return fromArg;
  }

  return normalizeNpdWebAbsoluteUrl(resolveCurrentSiteUrl());
}

/**
 * Absolute URL of the Site Pages folder for the current NPD web
 * (e.g. https://{tenant}.sharepoint.com/sites/{site}/SitePages/).
 */
export function getNpdSitePagesFolderUrl(contextSiteUrl?: string): string {
  const siteUrl = resolveNpdWebAbsoluteUrl(contextSiteUrl);
  if (!siteUrl) {
    return "";
  }

  return `${siteUrl}/${Config.NpdApproverMail.SitePagesFolder}/`;
}

/**
 * Absolute URL of NPDApproverMail.aspx on the current web, e.g.
 * https://{tenant}.sharepoint.com/sites/{site}/SitePages/NPDApproverMail.aspx
 */
export function getNpdApproverMailPageUrl(contextSiteUrl?: string): string {
  return `${getNpdSitePagesFolderUrl(contextSiteUrl)}${Config.NpdApproverMail.PageFileName}`;
}

export function getNpdPageBaseUrl(contextSiteUrl?: string): string {
  const base = resolveNpdWebAbsoluteUrl(contextSiteUrl);
  return base.replace(/\/+$/, "");
}

export function buildNpdHashUrl(
  hashPathAndQuery: string,
  contextSiteUrl?: string,
): string {
  const base = getNpdPageBaseUrl(contextSiteUrl);
  const path = hashPathAndQuery.startsWith("/")
    ? hashPathAndQuery
    : `/${hashPathAndQuery}`;
  return `${base}#${path}`;
}

export function buildNpdRequestFormUrl(
  requestId: number,
  mode: "view" | "edit" = "edit",
  contextSiteUrl?: string,
): string {
  const base = getNpdPageBaseUrl(contextSiteUrl);
  return `${base}#${Config.Routes.NpdNew}?id=${requestId}&mode=${mode}&from=all`;
}

/**
 * Builds a Login URL for Outlook email notifications that is resilient to SafeLinks
 * stripping hash fragments. Encodes the entire hash route as a single `npdRoute`
 * query parameter on the site URL (not SitePages/RocaNPD.aspx).
 *
 * Recipients may not have `RocaNPD.aspx` during login. After they sign in, they
 * return to the site URL with `npdRoute`, and MainComponent restores the hash.
 * In-app navigation and ApproverMail action buttons are unchanged.
 */
export function buildNpdEmailLoginUrl(
  requestId: number,
  mode: "view" | "edit" = "edit",
  contextSiteUrl?: string,
  viewAs?: string,
): string {
  const siteUrl = resolveNpdWebAbsoluteUrl(contextSiteUrl).replace(/\/+$/, "");
  if (!siteUrl) {
    return "";
  }
  const query = new URLSearchParams();
  query.set("id", String(requestId));
  query.set("mode", mode);
  query.set("from", "all");
  if (viewAs) {
    query.set(Config.NpdFormQuery.ViewAs, viewAs);
  }
  const hashRoute = `${Config.Routes.NpdNew}?${query.toString()}`;
  return `${siteUrl}?npdRoute=${encodeURIComponent(hashRoute)}`;
}

/**
 * Email action button URL → NPDApproverMail on the **current** tenant/site web.
 * Used exclusively for the Approve, Re-work, and Reject action buttons.
 */
export function buildNpdEmailActionUrl(
  requestId: number,
  action: NpdWorkflowAction,
  contextSiteUrl?: string,
): string {
  const query = new URLSearchParams();
  query.set(Config.NpdApproverMail.QueryRequestId, String(requestId));
  query.set(Config.NpdApproverMail.QueryAction, action);
  return `${getNpdApproverMailPageUrl(contextSiteUrl)}?${query.toString()}`;
}

function buildNpdEmailRouteUrl(
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

export function buildNpdPendingUrl(
  contextSiteUrl?: string,
  viewAs?: string,
): string {
  const path = viewAs
    ? `${Config.Routes.NpdPending}?${Config.NpdFormQuery.ViewAs}=${encodeURIComponent(viewAs)}`
    : Config.Routes.NpdPending;
  return buildNpdEmailRouteUrl(path, contextSiteUrl);
}

export function buildNpdDraftReworkUrl(contextSiteUrl?: string): string {
  return buildNpdEmailRouteUrl(Config.Routes.NpdDraftRework, contextSiteUrl);
}

export function parseNpdApproverMailAction(
  value: string | null,
): NpdWorkflowAction | null {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "approve") {
    return "Approve";
  }
  if (normalized === "reject") {
    return "Reject";
  }
  if (normalized === "rework" || normalized === "re-work") {
    return "Rework";
  }
  return null;
}

export function parseNpdApproverMailUrl(search?: string): {
  requestId: number;
  action: NpdWorkflowAction | null;
} {
  const params = new URLSearchParams(
    search ??
    (typeof window !== "undefined" ? window.location.search : ""),
  );
  const rawId =
    params.get(Config.NpdApproverMail.QueryRequestId) ||
    params.get("RequestId") ||
    params.get("id") ||
    params.get("r_id");
  const requestId = Number(rawId);
  const action = parseNpdApproverMailAction(
    params.get(Config.NpdApproverMail.QueryAction) ||
    params.get("action") ||
    params.get("w_action"),
  );

  return {
    requestId: Number.isFinite(requestId) && requestId > 0 ? requestId : 0,
    action,
  };
}
