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
 * Used when fetching cross-site lists (Brandmaster, PlantMaster, etc.).
 */
export function resolveRocaMasterSiteUrl(currentSiteUrl?: string): string {
  const siteUrl = resolveCurrentSiteUrl(currentSiteUrl);
  const mappingHaystack = `${siteUrl} ${
    typeof window !== "undefined" ? window.location.href : ""
  }`.toLowerCase();

  if (window.location.origin === "https://chandrudemo.sharepoint.com") {
    return "https://chandrudemo.sharepoint.com/sites/ROCA";
  }

  if (window.location.origin === "https://rocasanitario.sharepoint.com") {
    if (mappingHaystack.includes("rinanpdev")) {
      return "https://rocasanitario.sharepoint.com/sites/RINMASTERDEV";
    }

    if (mappingHaystack.includes("rinanp")) {
      return "https://rocasanitario.sharepoint.com/sites/RBPPLWOW";
    }
  }

  return "";
}

/** @deprecated Use resolveRocaMasterSiteUrl — kept for legacy reference parity */
export const findEmployeeMasterUrl = resolveRocaMasterSiteUrl;
