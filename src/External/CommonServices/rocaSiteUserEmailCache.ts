/**
 * Process-wide cache for ROCA site `siteUsers` (Id → Email).
 * Login / ApproversMaster resolution and form brand lookups share this so
 * SharePoint is not hit repeatedly for the same map.
 */

const emailMapBySiteUrl = new Map<string, ReadonlyMap<number, string>>();
const inflightBySiteUrl = new Map<
  string,
  Promise<ReadonlyMap<number, string>>
>();

function normalizeSiteUrl(siteUrl: string): string {
  return (siteUrl || "").trim().replace(/\/+$/, "").toLowerCase();
}

export function getCachedRocaSiteUserEmailMap(
  siteUrl: string,
): ReadonlyMap<number, string> | null {
  const key = normalizeSiteUrl(siteUrl);
  if (!key) {
    return null;
  }
  return emailMapBySiteUrl.get(key) ?? null;
}

export function setCachedRocaSiteUserEmailMap(
  siteUrl: string,
  emailById: ReadonlyMap<number, string>,
): void {
  const key = normalizeSiteUrl(siteUrl);
  if (!key) {
    return;
  }
  emailMapBySiteUrl.set(key, emailById);
}

/**
 * Returns a cached map or loads via `loader` once per site URL (shared inflight).
 */
export async function ensureRocaSiteUserEmailMap(
  siteUrl: string,
  loader: () => Promise<Map<number, string>>,
): Promise<ReadonlyMap<number, string>> {
  const key = normalizeSiteUrl(siteUrl);
  if (!key) {
    return new Map();
  }

  const cached = emailMapBySiteUrl.get(key);
  if (cached) {
    return cached;
  }

  const inflight = inflightBySiteUrl.get(key);
  if (inflight) {
    return inflight;
  }

  const loadPromise = (async (): Promise<ReadonlyMap<number, string>> => {
    try {
      const loaded = await loader();
      const frozen: ReadonlyMap<number, string> = new Map(loaded);
      emailMapBySiteUrl.set(key, frozen);
      return frozen;
    } finally {
      inflightBySiteUrl.delete(key);
    }
  })();

  inflightBySiteUrl.set(key, loadPromise);
  return loadPromise;
}

/** Serializable copy for Redux (Id keys as strings). */
export function rocaSiteUserEmailMapToRecord(
  emailById: ReadonlyMap<number, string>,
): Record<string, string> {
  const record: Record<string, string> = {};
  emailById.forEach((email, id) => {
    if (id > 0 && email) {
      record[String(id)] = email;
    }
  });
  return record;
}

export function rocaSiteUserEmailRecordToMap(
  record: Record<string, string> | null | undefined,
): Map<number, string> {
  const map = new Map<number, string>();
  if (!record) {
    return map;
  }
  Object.keys(record).forEach((key) => {
    const id = Number(key);
    const email = String(record[key] ?? "")
      .trim()
      .toLowerCase();
    if (id > 0 && email) {
      map.set(id, email);
    }
  });
  return map;
}
