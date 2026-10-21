/**
 * Process-wide cache for ROCA ApproversMaster rows.
 * Login sync + role resolution + form brand lookups share one fetch per site.
 */

const rowsBySiteUrl = new Map<string, readonly Record<string, unknown>[]>();
const inflightBySiteUrl = new Map<
  string,
  Promise<readonly Record<string, unknown>[]>
>();

function normalizeSiteUrl(siteUrl: string): string {
  return (siteUrl || "").trim().replace(/\/+$/, "").toLowerCase();
}

export function getCachedApproversMasterRows(
  siteUrl: string,
): readonly Record<string, unknown>[] | null {
  const key = normalizeSiteUrl(siteUrl);
  if (!key) {
    return null;
  }
  return rowsBySiteUrl.get(key) ?? null;
}

export function setCachedApproversMasterRows(
  siteUrl: string,
  rows: readonly Record<string, unknown>[],
): void {
  const key = normalizeSiteUrl(siteUrl);
  if (!key) {
    return;
  }
  rowsBySiteUrl.set(key, rows);
}

export async function ensureApproversMasterRows(
  siteUrl: string,
  loader: () => Promise<Record<string, unknown>[]>,
): Promise<readonly Record<string, unknown>[]> {
  const key = normalizeSiteUrl(siteUrl);
  if (!key) {
    return [];
  }

  const cached = rowsBySiteUrl.get(key);
  if (cached) {
    return cached;
  }

  const inflight = inflightBySiteUrl.get(key);
  if (inflight) {
    return inflight;
  }

  const loadPromise = (async (): Promise<readonly Record<string, unknown>[]> => {
    try {
      const loaded = await loader();
      const frozen = loaded.slice();
      rowsBySiteUrl.set(key, frozen);
      return frozen;
    } finally {
      inflightBySiteUrl.delete(key);
    }
  })();

  inflightBySiteUrl.set(key, loadPromise);
  return loadPromise;
}
