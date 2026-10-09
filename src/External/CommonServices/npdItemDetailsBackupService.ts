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

/** Stable key for matching backup rows to rows already in NPD_ItemDetails. */
export function buildNpdItemDetailsMatchKey(
  item: Pick<
    INpdItemDetailRecord,
    "materialCode" | "materialDescription" | "rocaGlobalCode"
  >,
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
          ? value.map((part) => String(part ?? "").trim()).filter(Boolean)
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

/**
 * Writes / replaces the Item Details JSON backup on the NPD_Request item.
 * Call immediately after the header exists and before Item Details batch writes.
 * Prefer overwrite (setContent) so a replace never leaves a gap with no file.
 */
export async function upsertNpdItemDetailsBackupAttachment(
  requestId: number,
  items: INpdItemDetailRecord[],
): Promise<void> {
  if (!(requestId > 0)) {
    return;
  }

  const content = serializeNpdItemDetailsBackup(items);
  let hasBackup = false;
  try {
    const attachments = (await SPServices.SPGetAttachments({
      Listname: LIST_NAME(),
      ID: requestId,
    })) as Array<{ FileName?: string; fileName?: string }>;
    hasBackup = (attachments || []).some((file) => {
      const name = String(file.FileName ?? file.fileName ?? "").trim();
      return name.toLowerCase() === BACKUP_FILE_NAME.toLowerCase();
    });
  } catch {
    hasBackup = false;
  }

  if (hasBackup) {
    await getSP()
      .web.lists.getByTitle(LIST_NAME())
      .items.getById(requestId)
      .attachmentFiles.getByName(BACKUP_FILE_NAME)
      .setContent(content);
    return;
  }

  await SPServices.SPAddAttachments({
    ListName: LIST_NAME(),
    ListID: requestId,
    Attachments: [{ name: BACKUP_FILE_NAME, content }],
  });
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
 * Loads the JSON backup when present. Returns null when no recovery file exists
 * (normal Draft/Rework with a completed save).
 */
export async function tryLoadNpdItemDetailsBackup(
  requestId: number,
): Promise<INpdItemDetailRecord[] | null> {
  if (!(requestId > 0)) {
    return null;
  }

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

  const serverRelativeUrl = String(
    backup.ServerRelativeUrl ?? backup.serverRelativeUrl ?? "",
  ).trim();

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
 * Prefer backup order/content; stamp sharePointId / SAP flags from rows already
 * stored in NPD_ItemDetails so resubmit inserts only the missing lines.
 */
export function mergeNpdItemDetailsWithBackup(
  storedItems: INpdItemDetailRecord[],
  backupItems: INpdItemDetailRecord[],
): INpdItemDetailRecord[] {
  if (!backupItems.length) {
    return storedItems;
  }

  const unusedStored = [...storedItems];

  const takeStoredMatch = (
    backupItem: INpdItemDetailRecord,
  ): INpdItemDetailRecord | undefined => {
    // Backup has no SharePointId — match on Item Details business keys only.
    const key = buildNpdItemDetailsMatchKey(backupItem);
    if (!key) {
      return undefined;
    }
    const byKeyIndex = unusedStored.findIndex(
      (item) => buildNpdItemDetailsMatchKey(item) === key,
    );
    if (byKeyIndex >= 0) {
      return unusedStored.splice(byKeyIndex, 1)[0];
    }
    return undefined;
  };

  const merged: INpdItemDetailRecord[] = backupItems.map((backupItem) => {
    const stored = takeStoredMatch(backupItem);
    if (!stored) {
      return {
        ...backupItem,
        sharePointId: 0,
        sapPosted: false,
      };
    }
    return {
      ...backupItem,
      sharePointId: stored.sharePointId,
      sapPosted: Boolean(stored.sapPosted),
      isMisAdded: Boolean(stored.isMisAdded || backupItem.isMisAdded),
    };
  });

  // Keep any stored rows that were not represented in the backup (should be rare).
  return [...merged, ...unusedStored];
}
