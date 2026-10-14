import { Config } from "./Config";
import { isDeletedYesFlag } from "./lookupFieldUtils";
import { requireRocaMasterSiteUrl } from "./rocaSiteUrlResolver";
import { getActiveRecordFilters, SOFT_DELETE_FIELD } from "./softDelete";
import SPServices from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.NpdRequest;

/** Legacy Submit format kept for existing requests / resubmit detection. */
const LEGACY_NPD_REQUEST_ID_PATTERN = /^NPD-\d{4}-\d+$/i;

/**
 * BrandCode-Year-Month-Date-RunningNumber(5).
 * Example: ROCA-2026-10-11-00001
 */
const NPD_REQUEST_ID_PATTERN = /^[A-Za-z0-9]+-\d{4}-\d{2}-\d{2}-\d{5}$/;

export function isNpdRequestIdTitle(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) {
    return false;
  }
  return (
    NPD_REQUEST_ID_PATTERN.test(trimmed) ||
    LEGACY_NPD_REQUEST_ID_PATTERN.test(trimmed)
  );
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function getLocalDateParts(date: Date = new Date()): {
  year: string;
  month: string;
  day: string;
} {
  return {
    year: String(date.getFullYear()),
    month: pad2(date.getMonth() + 1),
    day: pad2(date.getDate()),
  };
}

/**
 * Resolves BrandMaster.BrandCode for the selected brand Title on the ROCA site.
 */
export async function resolveBrandCodeForNpdRequest(
  brand: string,
  contextSiteUrl?: string,
): Promise<string> {
  const brandTitle = brand.trim();
  if (!brandTitle) {
    throw new Error("Brand is required to generate the Request ID.");
  }

  const rocaSiteUrl = requireRocaMasterSiteUrl(contextSiteUrl);
  const brandCodeField = Config.NpdRequestIdFormat.BrandCodeField;

  const rows = (await SPServices.getAnotherSPReadItems({
    SiteUrl: rocaSiteUrl,
    Listname: Config.RocaMasterListNames.BrandMaster,
    Select: `Id,Title,${brandCodeField}`,
    Topcount: 5000,
  })) as Record<string, unknown>[];

  const brandKey = brandTitle.toLowerCase();
  const match = rows.find(
    (row) => String(row.Title ?? "").trim().toLowerCase() === brandKey,
  );

  const brandCode = String(match?.[brandCodeField] ?? "").trim();
  if (!brandCode) {
    throw new Error(
      `Brand Code was not found in BrandMaster for brand "${brandTitle}".`,
    );
  }

  if (!/^[A-Za-z0-9]+$/.test(brandCode)) {
    throw new Error(
      `Brand Code "${brandCode}" for brand "${brandTitle}" is invalid for Request ID generation.`,
    );
  }

  return brandCode;
}

/**
 * Generates the next NPD Request ID:
 * `{BrandCode}-{YYYY}-{MM}-{DD}-{#####}`
 *
 * Running number continues across all brands for the current year (same as the
 * previous NPD-YYYY-### sequence), 5 digits.
 */
export async function generateNextNpdRequestId(
  brand: string,
  contextSiteUrl?: string,
): Promise<string> {
  const brandCode = await resolveBrandCodeForNpdRequest(brand, contextSiteUrl);
  const { year, month, day } = getLocalDateParts();
  const dayPrefix = `${brandCode}-${year}-${month}-${day}-`;
  const padLength = Config.NpdRequestIdFormat.PadLength;

  const rows = (await SPServices.SPReadItems({
    Listname: LIST_NAME(),
    Select: `Id,Title,${SOFT_DELETE_FIELD}`,
    Filter: getActiveRecordFilters(),
    Topcount: 5000,
  })) as Record<string, unknown>[];

  let lastNumber = 0;

  rows.forEach((row) => {
    if (isDeletedYesFlag(row[SOFT_DELETE_FIELD])) {
      return;
    }

    const title = String(row.Title ?? "").trim();
    const match = title.match(/^([A-Za-z0-9]+)-(\d{4})-(\d{2})-(\d{2})-(\d{5})$/);
    if (!match) {
      return;
    }

    // Global sequence for the year — do not restart per brand (or per day).
    if (match[2] !== year) {
      return;
    }

    const sequence = Number(match[5]);
    if (!Number.isFinite(sequence)) {
      return;
    }

    if (sequence > lastNumber) {
      lastNumber = sequence;
    }
  });

  const nextNumber = lastNumber + 1;
  const paddedNumber = String(nextNumber).padStart(padLength, "0");
  return `${dayPrefix}${paddedNumber}`;
}
