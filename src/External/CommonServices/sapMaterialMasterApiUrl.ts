import { Config, SapMaterialMasterApi } from "./Config";
import { resolveCurrentSiteUrl } from "./rocaSiteUrlResolver";

function environmentHaystack(contextSiteUrl?: string): string {
  const siteUrl = resolveCurrentSiteUrl(contextSiteUrl);
  const pageHref = typeof window !== "undefined" ? window.location.href : "";
  return `${siteUrl} ${pageHref}`.toLowerCase();
}

/**
 * Production is the RINPD / RBPPLWOW site. `rinnpddev` is development and must be checked first.
 */
export function isSapMaterialMasterProductionSite(contextSiteUrl?: string): boolean {
  const haystack = environmentHaystack(contextSiteUrl);
  if (haystack.includes("rinnpddev") || haystack.includes("chandrudemo")) {
    return false;
  }
  return haystack.includes("rinpd");
}

/**
 * Development uses {@link SapMaterialMasterApi.DevelopmentUrl}.
 * Production uses {@link SapMaterialMasterApi.ProductionUrl} and fails until the client supplies it.
 */
export function resolveSapMaterialMasterApiUrl(contextSiteUrl?: string): string {
  if (isSapMaterialMasterProductionSite(contextSiteUrl)) {
    const productionUrl = SapMaterialMasterApi.ProductionUrl.trim();
    if (!productionUrl) {
      throw new Error(
        "The Production SAP Material Master API URL is not configured yet.",
      );
    }
    return productionUrl;
  }

  const developmentUrl = (
    SapMaterialMasterApi.DevelopmentUrl ||
    Config.SapMaterialMasterApi.DevelopmentUrl
  ).trim();
  if (!developmentUrl) {
    throw new Error("The Development SAP Material Master API URL is not configured.");
  }
  return developmentUrl;
}
