/**
 * Resolves the current NPD app site URL used for ROCA master-site mapping.
 * Prefers the SPFx context value; falls back to the browser location when needed.
 */
export function resolveCurrentSiteUrl(contextSiteUrl?: string): string {
  const trimmed = (contextSiteUrl ?? "").trim();

  if (trimmed) {
    return trimmed;
  }

  if (typeof window === "undefined") {
    return "";
  }

  const { origin, pathname } = window.location;
  const sitesMatch = pathname.match(/^\/sites\/[^/]+/i);

  if (sitesMatch) {
    return `${origin}${sitesMatch[0]}`;
  }

  return origin;
}

/**
 * Resolves the ROCA master-data site URL for the current environment.
 * Used when fetching cross-site lists (BrandMaster, PlantMaster, ApproversMaster, etc.).
 *
 * Uses the SPFx context site URL and full page URL so localhost workbench loads
 * still map correctly when hosted against chandrudemo / rocasanitario tenants.
 */
export function resolveRocaMasterSiteUrl(currentSiteUrl?: string): string {
  const siteUrl = resolveCurrentSiteUrl(currentSiteUrl);
  const pageHref =
    typeof window !== "undefined" ? window.location.href : "";
  const mappingHaystack = `${siteUrl} ${pageHref}`.toLowerCase();

  if (mappingHaystack.includes("chandrudemo")) {
    return "https://chandrudemo.sharepoint.com/sites/ROCA";
  }

  if (mappingHaystack.includes("rinanpdev")) {
    return "https://rocasanitario.sharepoint.com/sites/RINMASTERDEV";
  }

  if (mappingHaystack.includes("rinanp")) {
    return "https://rocasanitario.sharepoint.com/sites/RBPPLWOW";
  }

  return "";
}

/** Returns the ROCA master site URL or throws a user-facing configuration error. */
export function requireRocaMasterSiteUrl(contextSiteUrl?: string): string {
  const rocaSiteUrl = resolveRocaMasterSiteUrl(contextSiteUrl);

  if (!rocaSiteUrl) {
    throw new Error(
      "Unable to resolve the ROCA master site URL for this environment.",
    );
  }

  return rocaSiteUrl;
}

/** @deprecated Use resolveRocaMasterSiteUrl — kept for legacy reference parity */
export const findEmployeeMasterUrl = resolveRocaMasterSiteUrl;
