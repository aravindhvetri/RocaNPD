import { Config, NpdItemDetailsBackup } from "./Config";
import type { INpdItemDetailRecord } from "./Interface";
import { getSP } from "./SPServices";
import SPServices from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.NpdRequest;
const BACKUP_FILE_NAME = NpdItemDetailsBackup.FileName;

function normalizeMatchPart(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

type INpdItemDetailIdentity = Pick<
  INpdItemDetailRecord,
  "materialCode" | "materialDescription" | "rocaGlobalCode"
>;

/** Stable key for matching backup rows to rows already in NPD_ItemDetails. */
export function buildNpdItemDetailsMatchKey(
  item: INpdItemDetailIdentity,
): string {
  const code = normalizeMatchPart(item.materialCode);
  if (code) {
    return `code:${code}`;
  }
  const description = normalizeMatchPart(item.materialDescription);
  if (description) {
    return `desc:${description}`;
  }
  const roca = normalizeMatchPart(item.rocaGlobalCode);
  if (roca) {
    return `roca:${roca}`;
  }
  return "";
}

/**
 * Same Item Details line across SharePoint vs Attachments backup.
 * Prefer Material Code; fall back to Description / Roca Global Code when a
 * stored row did not round-trip its code (otherwise merge duplicates the row).
 */
export function npdItemDetailLinesMatch(
  left: INpdItemDetailIdentity,
  right: INpdItemDetailIdentity,
): boolean {
  const leftCode = normalizeMatchPart(left.materialCode);
  const rightCode = normalizeMatchPart(right.materialCode);
  if (leftCode && rightCode) {
    return leftCode === rightCode;
  }

  const leftDesc = normalizeMatchPart(left.materialDescription);
  const rightDesc = normalizeMatchPart(right.materialDescription);
  if (leftDesc && rightDesc && leftDesc === rightDesc) {
    if (leftCode && rightCode && leftCode !== rightCode) {
      return false;
    }
    return true;
  }

  if (leftCode || rightCode) {
    return false;
  }

  const leftRoca = normalizeMatchPart(left.rocaGlobalCode);
  const rightRoca = normalizeMatchPart(right.rocaGlobalCode);
  return Boolean(leftRoca && rightRoca && leftRoca === rightRoca);
}

/** Insert only rows that are not already represented in NPD_ItemDetails. */
export function npdItemDetailNeedsInsert(
  row: INpdItemDetailRecord,
  storedRows: readonly INpdItemDetailRecord[],
): boolean {
  if (row.sharePointId > 0) {
    return false;
  }
  return !storedRows.some(
    (stored) =>
      stored.sharePointId > 0 && npdItemDetailLinesMatch(row, stored),
  );
}

/**
 * After SharePoint is the source of truth, insert only lines that are still
 * missing. Cap at intendedCount so a stale form cannot add a second copy.
 */
export function remainingNpdItemDetailsAfterStored(
  candidates: readonly INpdItemDetailRecord[],
  storedRows: readonly INpdItemDetailRecord[],
  intendedCount: number,
): INpdItemDetailRecord[] {
  const storedActive = storedRows.filter((row) => row.sharePointId > 0);
  const updates = candidates.filter((row) => row.sharePointId > 0);
  const insertLimit = Math.max(0, intendedCount - storedActive.length);
  if (insertLimit <= 0) {
    return updates;
  }
  const inserts = dedupeNpdItemDetailsForInsert(
    candidates.filter(
      (row) =>
        !(row.sharePointId > 0) &&
        npdItemDetailNeedsInsert(row, storedActive),
    ),
  );
  return [...updates, ...inserts.slice(0, insertLimit)];
}

/** Drop duplicate insert copies of the same line (same submit must not add twice). */
export function dedupeNpdItemDetailsForInsert(
  rows: readonly INpdItemDetailRecord[],
): INpdItemDetailRecord[] {
  const seenKeys = new Set<string>();
  const unique: INpdItemDetailRecord[] = [];
  rows.forEach((row) => {
    if (row.sharePointId > 0) {
      unique.push(row);
      return;
    }
    const key = buildNpdItemDetailsMatchKey(row);
    if (key) {
      if (seenKeys.has(key)) {
        return;
      }
      seenKeys.add(key);
    }
    unique.push(row);
  });
  return unique;
}

function isPersistableBackupItem(item: INpdItemDetailRecord): boolean {
  return Boolean(
    String(item.materialCode ?? "").trim() ||
      String(item.materialDescription ?? "").trim(),
  );
}

export function serializeNpdItemDetailsBackup(
  items: INpdItemDetailRecord[],
): string {
  const payload = items.filter(isPersistableBackupItem).map((item) => ({
    rocaGlobalCode: String(item.rocaGlobalCode ?? ""),
    materialCode: String(item.materialCode ?? ""),
    materialDescription: String(item.materialDescription ?? ""),
    productGroupMg2: [...(item.productGroupMg2 || [])],
    productCategoryMg3: [...(item.productCategoryMg3 || [])],
    productTypeMg4: [...(item.productTypeMg4 || [])],
    productSourceMg5: [...(item.productSourceMg5 || [])],
    colorMgp1a: [...(item.colorMgp1a || [])],
    productRangeMgp2a: [...(item.productRangeMgp2a || [])],
    productSubCategoryMgp3a: [...(item.productSubCategoryMgp3a || [])],
    materialGroup: [...(item.materialGroup || [])],
    extMaterialGroup: [...(item.extMaterialGroup || [])],
    productSegment: [...(item.productSegment || [])],
    taxClassification: [...(item.taxClassification || [])],
    classNumberPcsName: [...(item.classNumberPcsName || [])],
    hsnCode: String(item.hsnCode ?? ""),
    weightKg:
      item.weightKg === null || item.weightKg === undefined
        ? null
        : Number(item.weightKg),
    uom: [...(item.uom || [])],
    minQtyBoxQty: String(item.minQtyBoxQty ?? ""),
    isMisAdded: Boolean(item.isMisAdded),
    sapPosted: Boolean(item.sapPosted),
  }));
  return JSON.stringify(payload);
}

function parseBackupJson(raw: string): INpdItemDetailRecord[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .map((entry): INpdItemDetailRecord | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as Record<string, unknown>;
      const asStringArray = (value: unknown): string[] =>
        Array.isArray(value)
          ? value
              .map((part) => String(part ?? "").trim())
              .filter((part) => {
                const key = part.toLowerCase();
                return Boolean(part) && key !== "null" && key !== "undefined";
              })
          : [];
      const weightRaw = row.weightKg;
      const weightNumber = Number(weightRaw);
      return {
        sharePointId: 0,
        rocaGlobalCode: String(row.rocaGlobalCode ?? ""),
        materialCode: String(row.materialCode ?? ""),
        materialDescription: String(row.materialDescription ?? ""),
        productGroupMg2: asStringArray(row.productGroupMg2),
        productCategoryMg3: asStringArray(row.productCategoryMg3),
        productTypeMg4: asStringArray(row.productTypeMg4),
        productSourceMg5: asStringArray(row.productSourceMg5),
        colorMgp1a: asStringArray(row.colorMgp1a),
        productRangeMgp2a: asStringArray(row.productRangeMgp2a),
        productSubCategoryMgp3a: asStringArray(row.productSubCategoryMgp3a),
        materialGroup: asStringArray(row.materialGroup),
        extMaterialGroup: asStringArray(row.extMaterialGroup),
        productSegment: asStringArray(row.productSegment),
        taxClassification: asStringArray(row.taxClassification),
        classNumberPcsName: asStringArray(row.classNumberPcsName),
        hsnCode: String(row.hsnCode ?? ""),
        weightKg:
          weightRaw === null || weightRaw === undefined || weightRaw === ""
            ? null
            : Number.isFinite(weightNumber)
              ? weightNumber
              : null,
        uom: asStringArray(row.uom),
        minQtyBoxQty: String(row.minQtyBoxQty ?? ""),
        isMisAdded: Boolean(row.isMisAdded),
        sapPosted: Boolean(row.sapPosted),
      };
    })
    .filter((item): item is INpdItemDetailRecord => Boolean(item))
    .filter(isPersistableBackupItem);
}

export type NpdItemDetailsBackupWriteMode = "add" | "replace" | "auto";

/**
 * Writes / replaces the Item Details JSON backup on the NPD_Request item.
 * Call immediately after the header exists and before Item Details batch writes.
 *
 * Modes:
 * - add: one attachmentFiles/add (new request — no existence list call)
 * - replace: one setContent (known existing file)
 * - auto: try setContent, fall back to add (no attachmentFiles list round-trip)
 */
export async function upsertNpdItemDetailsBackupAttachment(
  requestId: number,
  items: INpdItemDetailRecord[],
  options?: { mode?: NpdItemDetailsBackupWriteMode },
): Promise<void> {
  if (!(requestId > 0)) {
    return;
  }

  const content = serializeNpdItemDetailsBackup(items);
  const mode = options?.mode ?? "auto";

  const addBackup = (): Promise<unknown> =>
    SPServices.SPAddAttachments({
      ListName: LIST_NAME(),
      ListID: requestId,
      Attachments: [{ name: BACKUP_FILE_NAME, content }],
    });

  const replaceBackup = (): Promise<unknown> =>
    getSP()
      .web.lists.getByTitle(LIST_NAME())
      .items.getById(requestId)
      .attachmentFiles.getByName(BACKUP_FILE_NAME)
      .setContent(content);

  if (mode === "add") {
    await addBackup();
    return;
  }

  if (mode === "replace") {
    await replaceBackup();
    return;
  }

  try {
    await replaceBackup();
  } catch {
    await addBackup();
  }
}

/** Removes the backup after a successful Save Draft / Submit (normal path). */
export async function clearNpdItemDetailsBackupAttachment(
  requestId: number,
): Promise<void> {
  if (!(requestId > 0)) {
    return;
  }

  try {
    const attachments = (await SPServices.SPGetAttachments({
      Listname: LIST_NAME(),
      ID: requestId,
    })) as Array<{ FileName?: string; fileName?: string }>;
    const hasBackup = (attachments || []).some((file) => {
      const name = String(file.FileName ?? file.fileName ?? "").trim();
      return name.toLowerCase() === BACKUP_FILE_NAME.toLowerCase();
    });
    if (!hasBackup) {
      return;
    }
    await SPServices.SPDeleteAttachments({
      ListName: LIST_NAME(),
      ListID: requestId,
      AttachmentName: BACKUP_FILE_NAME,
    });
  } catch {
    // Best effort — missing attachment is fine.
  }
}

/**
 * Loads the JSON backup when present. Prefer {@link serverRelativeUrl} from the
 * already-fetched NPD_Request AttachmentFiles expand (no SPGetAttachments).
 * Falls back to listing attachments only when no URL is supplied.
 */
export async function tryLoadNpdItemDetailsBackup(
  requestId: number,
  options?: { serverRelativeUrl?: string },
): Promise<INpdItemDetailRecord[] | null> {
  if (!(requestId > 0)) {
    return null;
  }

  let serverRelativeUrl = String(options?.serverRelativeUrl ?? "").trim();

  if (!serverRelativeUrl) {
    const attachments = (await SPServices.SPGetAttachments({
      Listname: LIST_NAME(),
      ID: requestId,
    })) as Array<{
      FileName?: string;
      fileName?: string;
      ServerRelativeUrl?: string;
      serverRelativeUrl?: string;
    }>;

    const backup = (attachments || []).find((file) => {
      const name = String(file.FileName ?? file.fileName ?? "").trim();
      return name.toLowerCase() === BACKUP_FILE_NAME.toLowerCase();
    });
    if (!backup) {
      return null;
    }

    serverRelativeUrl = String(
      backup.ServerRelativeUrl ?? backup.serverRelativeUrl ?? "",
    ).trim();
  }

  let raw = "";
  if (serverRelativeUrl) {
    const blob = await SPServices.SPDownloadFileBlob(serverRelativeUrl);
    raw = await blob.text();
  } else {
    const blob = await getSP()
      .web.lists.getByTitle(LIST_NAME())
      .items.getById(requestId)
      .attachmentFiles.getByName(BACKUP_FILE_NAME)
      .getBlob();
    raw = await blob.text();
  }

  if (!String(raw || "").trim()) {
    return null;
  }

  try {
    const items = parseBackupJson(raw);
    return items.length ? items : null;
  } catch {
    return null;
  }
}

/**
 * Prefer backup order. Rows already in NPD_ItemDetails use stored field values
 * (SharePoint is source of truth after a successful Item Details save). Backup
 * content is used only for recovery rows not yet in the list.
 * Soft-deleted SharePoint keys are never resurrected from backup alone.
 */
export function mergeNpdItemDetailsWithBackup(
  storedItems: INpdItemDetailRecord[],
  backupItems: INpdItemDetailRecord[],
  softDeletedMatchKeys?: ReadonlySet<string>,
): INpdItemDetailRecord[] {
  if (!backupItems.length) {
    return storedItems;
  }

  const unusedStored = [...storedItems];

  const takeStoredMatch = (
    backupItem: INpdItemDetailRecord,
  ): INpdItemDetailRecord | undefined => {
    const byKeyIndex = unusedStored.findIndex((item) =>
      npdItemDetailLinesMatch(backupItem, item),
    );
    if (byKeyIndex >= 0) {
      return unusedStored.splice(byKeyIndex, 1)[0];
    }
    return undefined;
  };

  const merged: INpdItemDetailRecord[] = [];
  for (const backupItem of backupItems) {
    const key = buildNpdItemDetailsMatchKey(backupItem);
    const stored = takeStoredMatch(backupItem);
    if (!stored) {
      // IsDeleted=true in SharePoint — do not show from stale JSON backup.
      if (key && softDeletedMatchKeys?.has(key)) {
        continue;
      }
      merged.push({
        ...backupItem,
        sharePointId: 0,
        sapPosted: false,
      });
      continue;
    }
    merged.push({
      ...stored,
      isMisAdded: Boolean(stored.isMisAdded || backupItem.isMisAdded),
    });
  }

  // First successful insert batch is backup order. Pair leftover stored
  // rows (Id ascending) to unmatched backup rows so 50 saved + 100 backup
  // becomes 100 lines — never 150.
  const leftoverStored = unusedStored
    .filter((row) => row.sharePointId > 0)
    .sort((left, right) => left.sharePointId - right.sharePointId);
  leftoverStored.forEach((leftover) => {
    const mergeIndex = merged.findIndex(
      (row) =>
        !(row.sharePointId > 0) && npdItemDetailLinesMatch(row, leftover),
    );
    const fallbackIndex =
      mergeIndex >= 0
        ? mergeIndex
        : merged.findIndex((row) => !(row.sharePointId > 0));
    if (fallbackIndex >= 0) {
      merged[fallbackIndex] = {
        ...leftover,
        isMisAdded: Boolean(
          leftover.isMisAdded || merged[fallbackIndex].isMisAdded,
        ),
      };
    }
  });

  const combined = merged;
  // MIS-added rows first; then remaining by SharePoint Id.
  return combined.sort((left, right) => {
    const leftMis = left.isMisAdded ? 0 : 1;
    const rightMis = right.isMisAdded ? 0 : 1;
    if (leftMis !== rightMis) {
      return leftMis - rightMis;
    }
    return (left.sharePointId || 0) - (right.sharePointId || 0);
  });
}
