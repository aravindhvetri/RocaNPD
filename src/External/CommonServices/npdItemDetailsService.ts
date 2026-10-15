import { Config, SharePointMutateBatchSize } from "./Config";
import type { INpdItemDetailRecord } from "./Interface";
import {
  buildNpdItemDetailsMatchKey,
  upsertNpdItemDetailsBackupAttachment,
} from "./npdItemDetailsBackupService";
import { isDeletedYesFlag } from "./lookupFieldUtils";
import { NETWORK_OFFLINE_MESSAGE } from "./networkConnectivity";
import {
  getActiveRecordCreatePayload,
  getActiveRecordFilters,
  getSoftDeletePayload,
  SOFT_DELETE_FIELD,
} from "./softDelete";
import SPServices from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.NpdItemDetails;
const FIELDS = Config.FieldNames.NpdItemDetails;
const SEPARATOR = Config.NpdItemImport.MultiValueSeparator;

const SELECT_FIELDS = [
  "Id",
  FIELDS.Title,
  FIELDS.RocaGlobalCode,
  FIELDS.MaterialCode,
  FIELDS.MaterialDescription,
  FIELDS.ProductGroupMG2,
  FIELDS.ProductCategoryMG3,
  FIELDS.ProductTypeMG4,
  FIELDS.ProductSourceMG5,
  FIELDS.ColorMGP1A,
  FIELDS.ProductRangeMGP2A,
  FIELDS.ProductSubCategoryMGP3A,
  FIELDS.MaterialGroup,
  FIELDS.ExtMaterialGroup,
  FIELDS.ProductSegment,
  FIELDS.TaxClassification,
  FIELDS.ClassNumberPcsName,
  FIELDS.HSNCode,
  FIELDS.Weight,
  FIELDS.UOM,
  FIELDS.MinQty,
  FIELDS.SAP,
  FIELDS.IsDeleted,
  FIELDS.RequestGeneralInfoId,
].join(",");

/** MIS-added rows first, then remaining rows by SharePoint Id ascending. */
export function sortNpdItemDetailsForDisplay(
  records: INpdItemDetailRecord[],
): INpdItemDetailRecord[] {
  return [...records].sort((left, right) => {
    const leftMis = left.isMisAdded ? 0 : 1;
    const rightMis = right.isMisAdded ? 0 : 1;
    if (leftMis !== rightMis) {
      return leftMis - rightMis;
    }
    return (left.sharePointId || 0) - (right.sharePointId || 0);
  });
}

function isBlankMultiToken(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return !normalized || normalized === "null" || normalized === "undefined";
}

/**
 * SharePoint may return multi/lookup fields as a string, string[], or
 * `{ results: [...] }` / `{ Title }`. Never coerce JS `null` to the label "null".
 */
function splitMultiValue(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => splitMultiValue(entry));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.results)) {
      return splitMultiValue(record.results);
    }
    const title = record.Title ?? record.LookupValue ?? record.Value;
    if (title !== undefined && title !== null) {
      return splitMultiValue(title);
    }
    return [];
  }

  // Split only on the configured separator ("; ") / newlines — never on commas.
  // Lookup names such as "Vitreous china WC, Basins, Ur" must stay one value.
  return String(value)
    .split(/;|\n/)
    .map((entry) => entry.trim())
    .filter((entry) => !isBlankMultiToken(entry));
}

function joinMultiValue(values: string[]): string {
  return values
    .map((value) => String(value ?? "").trim())
    .filter((value) => !isBlankMultiToken(value))
    .join(SEPARATOR);
}

function readText(item: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const raw = item[key];
    if (raw === undefined || raw === null) {
      continue;
    }
    // Arrays / lookup objects — do not String() them (String([null]) === "null").
    if (typeof raw === "object") {
      const parts = splitMultiValue(raw);
      if (parts.length) {
        return parts.join(SEPARATOR);
      }
      continue;
    }
    const text = String(raw).trim();
    if (text && !isBlankMultiToken(text)) {
      return text;
    }
  }
  return "";
}

function readMultiField(
  item: Record<string, unknown>,
  ...keys: string[]
): string[] {
  for (const key of keys) {
    if (item[key] === undefined || item[key] === null) {
      continue;
    }
    const parts = splitMultiValue(item[key]);
    if (parts.length) {
      return parts;
    }
  }
  return [];
}

function mapItem(item: Record<string, unknown>): INpdItemDetailRecord {
  const weightRaw = item[FIELDS.Weight];
  const weightNumber = Number(weightRaw);

  return {
    sharePointId: Number(item.Id) || 0,
    rocaGlobalCode: readText(item, FIELDS.RocaGlobalCode),
    materialCode: readText(item, FIELDS.MaterialCode),
    materialDescription: readText(item, FIELDS.MaterialDescription),
    productGroupMg2: splitMultiValue(item[FIELDS.ProductGroupMG2]),
    productCategoryMg3: splitMultiValue(item[FIELDS.ProductCategoryMG3]),
    productTypeMg4: splitMultiValue(item[FIELDS.ProductTypeMG4]),
    productSourceMg5: splitMultiValue(item[FIELDS.ProductSourceMG5]),
    colorMgp1a: splitMultiValue(item[FIELDS.ColorMGP1A]),
    productRangeMgp2a: splitMultiValue(item[FIELDS.ProductRangeMGP2A]),
    productSubCategoryMgp3a: splitMultiValue(
      item[FIELDS.ProductSubCategoryMGP3A],
    ),
    materialGroup: splitMultiValue(item[FIELDS.MaterialGroup]),
    extMaterialGroup: splitMultiValue(item[FIELDS.ExtMaterialGroup]),
    productSegment: splitMultiValue(item[FIELDS.ProductSegment]),
    taxClassification: splitMultiValue(item[FIELDS.TaxClassification]),
    classNumberPcsName: readMultiField(
      item,
      FIELDS.ClassNumberPcsName,
      "ClassNumberPCS Name",
      "ClassNumberPCSName",
      "ClassNumber_x0020_PCS_x0020_Name",
    ),
    hsnCode: readText(item, FIELDS.HSNCode),
    weightKg:
      weightRaw === null || weightRaw === undefined || weightRaw === ""
        ? null
        : Number.isFinite(weightNumber)
          ? weightNumber
          : null,
    uom: splitMultiValue(item[FIELDS.UOM]),
    minQtyBoxQty: readText(item, FIELDS.MinQty),
    isMisAdded: readText(item, FIELDS.Title) === "MIS_ADDED",
    sapPosted: readSapFlag(item[FIELDS.SAP]),
  };
}

function readSapFlag(value: unknown): boolean {
  if (value === true || value === 1) {
    return true;
  }
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  return text === "true" || text === "yes" || text === "1";
}

function toSharePointPayload(
  record: INpdItemDetailRecord,
  requestId: number,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    [FIELDS.Title]: record.isMisAdded ? "MIS_ADDED" : "",
    [FIELDS.RocaGlobalCode]: record.rocaGlobalCode.trim(),
    [FIELDS.MaterialCode]: record.materialCode.trim(),
    [FIELDS.MaterialDescription]: record.materialDescription.trim(),
    [FIELDS.ProductGroupMG2]: joinMultiValue(record.productGroupMg2),
    [FIELDS.ProductCategoryMG3]: joinMultiValue(record.productCategoryMg3),
    [FIELDS.ProductTypeMG4]: joinMultiValue(record.productTypeMg4),
    [FIELDS.ProductSourceMG5]: joinMultiValue(record.productSourceMg5),
    [FIELDS.ColorMGP1A]: joinMultiValue(record.colorMgp1a),
    [FIELDS.ProductRangeMGP2A]: joinMultiValue(record.productRangeMgp2a),
    [FIELDS.ProductSubCategoryMGP3A]: joinMultiValue(
      record.productSubCategoryMgp3a,
    ),
    [FIELDS.MaterialGroup]: joinMultiValue(record.materialGroup),
    [FIELDS.ExtMaterialGroup]: joinMultiValue(record.extMaterialGroup),
    [FIELDS.ProductSegment]: joinMultiValue(record.productSegment),
    [FIELDS.TaxClassification]: joinMultiValue(record.taxClassification),
    [FIELDS.ClassNumberPcsName]: joinMultiValue(record.classNumberPcsName),
    [FIELDS.HSNCode]: record.hsnCode.trim(),
    [FIELDS.UOM]: joinMultiValue(record.uom),
    [FIELDS.MinQty]: record.minQtyBoxQty.trim(),
    [FIELDS.RequestGeneralInfoId]: requestId,
  };

  // New lines start as not posted / not deleted. Updates must not clear SAP=true.
  if (!(record.sharePointId > 0)) {
    payload[FIELDS.SAP] = false;
    Object.assign(payload, getActiveRecordCreatePayload());
  }

  if (record.weightKg !== null && Number.isFinite(record.weightKg)) {
    payload[FIELDS.Weight] = record.weightKg;
  }

  return payload;
}

export async function fetchNpdItemDetailsByRequestId(
  requestId: number,
): Promise<INpdItemDetailRecord[]> {
  const rows = (await SPServices.SPReadItems({
    Listname: LIST_NAME(),
    Select: SELECT_FIELDS,
    Filter: [
      {
        FilterKey: FIELDS.RequestGeneralInfoId,
        Operator: "eq",
        FilterValue: String(requestId),
      },
      ...getActiveRecordFilters(),
    ],
    FilterCondition: "and",
    Orderby: "Id",
    Orderbydecorasc: true,
    Topcount: 5000,
  })) as Record<string, unknown>[];

  return sortNpdItemDetailsForDisplay(
    rows
      .filter(
        (row) => !isDeletedYesFlag(row[SOFT_DELETE_FIELD] ?? row.IsDeleted),
      )
      .map(mapItem),
  );
}

/**
 * Match keys for soft-deleted Item Details rows. Used when merging Draft/Rework
 * JSON backup so deleted Initiator lines are never resurrected in the form.
 */
export async function fetchNpdItemDetailsSoftDeletedMatchKeys(
  requestId: number,
): Promise<Set<string>> {
  const rows = (await SPServices.SPReadItems({
    Listname: LIST_NAME(),
    Select: [
      "Id",
      FIELDS.MaterialCode,
      FIELDS.MaterialDescription,
      FIELDS.RocaGlobalCode,
      FIELDS.IsDeleted,
    ].join(","),
    Filter: [
      {
        FilterKey: FIELDS.RequestGeneralInfoId,
        Operator: "eq",
        FilterValue: String(requestId),
      },
      {
        FilterKey: SOFT_DELETE_FIELD,
        Operator: "eq",
        FilterValue: "1",
      },
    ],
    FilterCondition: "and",
    Orderby: "Id",
    Orderbydecorasc: true,
    Topcount: 5000,
  })) as Record<string, unknown>[];

  const keys = new Set<string>();
  for (const row of rows) {
    if (!isDeletedYesFlag(row[SOFT_DELETE_FIELD] ?? row.IsDeleted)) {
      continue;
    }
    const key = buildNpdItemDetailsMatchKey({
      materialCode: String(row[FIELDS.MaterialCode] ?? ""),
      materialDescription: String(row[FIELDS.MaterialDescription] ?? ""),
      rocaGlobalCode: String(row[FIELDS.RocaGlobalCode] ?? ""),
    });
    if (key) {
      keys.add(key);
    }
  }
  return keys;
}

function isPersistableItem(record: INpdItemDetailRecord): boolean {
  return Boolean(
    record.materialCode.trim() || record.materialDescription.trim(),
  );
}

export interface ISaveNpdItemDetailsOptions {
  isNewRequest?: boolean;
  /**
   * When true, only insert/update the provided records and delete the explicit
   * IDs — skips fetching the full Item Details list (fast path for Rework/Draft).
   */
  partial?: boolean;
  deletedSharePointIds?: number[];
  /**
   * Checked before each insert batch. When it returns true, rows already
   * saved stay saved and the rest of this submit is not sent.
   */
  shouldAbort?: () => boolean;
  /**
   * When true, caller already wrote the NPD_Request backup attachment —
   * skip a second attachmentFiles round-trip.
   */
  skipBackup?: boolean;
  /**
   * When true, caller already wrote NPD_Request.ItemDetailsCount on the header
   * create/update — skip a separate items(id) PATCH.
   */
  skipItemDetailsCountSync?: boolean;
}

function attachItemDetailsPersistProgress(
  error: unknown,
  inserted: number,
  mutateCompleted: boolean,
): Error {
  const wrapped = error instanceof Error ? error : new Error(String(error));
  const extra = wrapped as Error & {
    npdInsertedItemCount?: number;
    npdItemMutateCompleted?: boolean;
  };
  extra.npdInsertedItemCount = inserted;
  extra.npdItemMutateCompleted = mutateCompleted;
  return wrapped;
}

export async function saveNpdItemDetailsBatch(
  requestId: number,
  records: INpdItemDetailRecord[],
  options: boolean | ISaveNpdItemDetailsOptions = false,
): Promise<number> {
  const normalized: ISaveNpdItemDetailsOptions =
    typeof options === "boolean" ? { isNewRequest: options } : options || {};
  const isNewRequest = Boolean(normalized.isNewRequest);
  const partial = Boolean(normalized.partial);

  const persistable = records.filter(isPersistableItem);
  const toUpdate = persistable
    .filter((record) => record.sharePointId > 0)
    .map((record) => ({
      ID: record.sharePointId,
      ...toSharePointPayload(record, requestId),
    }));
  const toInsert = persistable
    .filter((record) => !record.sharePointId)
    .map((record) => toSharePointPayload(record, requestId));

  let softDeleteIds: number[] = [];
  if (partial) {
    softDeleteIds = (normalized.deletedSharePointIds || []).filter(
      (id) => id > 0,
    );
  } else if (!isNewRequest) {
    const existing = await fetchNpdItemDetailsByRequestId(requestId);
    const keepIds = new Set(
      persistable.map((record) => record.sharePointId).filter((id) => id > 0),
    );
    softDeleteIds = existing
      .filter(
        (item) => item.sharePointId > 0 && !keepIds.has(item.sharePointId),
      )
      .map((item) => item.sharePointId);
  }

  const softDeleteUpdates = softDeleteIds.map((id) => ({
    ID: id,
    ...getSoftDeletePayload(),
  }));
  // Soft-delete first so a concurrent update of the same Id cannot revive it.
  const allUpdates = [...softDeleteUpdates, ...toUpdate];

  const syncItemDetailsCount = async (): Promise<void> => {
    if (normalized.skipItemDetailsCountSync) {
      return;
    }
    // Non-partial replace leaves exactly the persistable rows active.
    // Partial (soft-delete + insert) needs a recount of active lines.
    const count = partial
      ? (await fetchNpdItemDetailsByRequestId(requestId)).length
      : persistable.length;
    await syncNpdRequestItemDetailsCount(requestId, count);
  };

  if (!allUpdates.length && !toInsert.length) {
    if (!partial) {
      await syncItemDetailsCount();
    }
    return 0;
  }

  // Save Draft and other callers keep a single batch. Submit passes
  // shouldAbort so a dropped connection cannot flush the remaining rows
  // when the browser comes back online.

  if (!normalized.shouldAbort) {
    // Initiator Draft/Submit already wrote the backup before this batch.
    if (!normalized.skipBackup) {
      await upsertNpdItemDetailsBackupAttachment(requestId, records);
    }

    await SPServices.batchMutate({
      ListName: LIST_NAME(),
      remove: [],
      update: allUpdates,
      insert: toInsert,
    });
    await syncItemDetailsCount();
    return toInsert.length;
  }

  const abortIfRequested = (): void => {
    if (normalized.shouldAbort?.()) {
      throw new Error(NETWORK_OFFLINE_MESSAGE);
    }
  };

  const runAbortableMutate = async (params: {
    update: Record<string, unknown>[];
    insert: Record<string, unknown>[];
  }): Promise<void> => {
    abortIfRequested();
    let pollId = 0;
    try {
      await Promise.race([
        SPServices.batchMutate({
          ListName: LIST_NAME(),
          remove: [],
          update: params.update,
          insert: params.insert,
        }),
        new Promise<never>((_resolve, reject) => {
          pollId = window.setInterval(() => {
            if (normalized.shouldAbort?.()) {
              reject(new Error(NETWORK_OFFLINE_MESSAGE));
            }
          }, 100);
        }),
      ]);
    } finally {
      if (pollId) {
        window.clearInterval(pollId);
      }
    }
    abortIfRequested();
  };

  // Up to 100 Item Details per batch. 59 lines are one call.
  // The next batch starts only if this submit is still online.
  const insertChunkSize = SharePointMutateBatchSize;
  let insertedCompleted = 0;
  let mutateCompleted = false;
  try {
    if (!toInsert.length) {
      await runAbortableMutate({
        update: allUpdates,
        insert: [],
      });
      mutateCompleted = true;
      return 0;
    }

    for (let start = 0; start < toInsert.length; start += insertChunkSize) {
      const chunk = toInsert.slice(start, start + insertChunkSize);
      await runAbortableMutate({
        update: start === 0 ? allUpdates : [],
        insert: chunk,
      });
      mutateCompleted = true;
      insertedCompleted += chunk.length;
    }
    return insertedCompleted;
  } catch (error) {
    throw attachItemDetailsPersistProgress(
      error,
      insertedCompleted,
      mutateCompleted,
    );
  }
}

/** Writes NPD_Request.ItemDetailsCount for list Products column (best-effort). */
async function syncNpdRequestItemDetailsCount(
  requestId: number,
  count: number,
): Promise<void> {
  if (!requestId) {
    return;
  }
  try {
    await SPServices.SPUpdateItem({
      Listname: Config.ListNames.NpdRequest,
      ID: requestId,
      RequestJSON: {
        [Config.FieldNames.NpdRequest.ItemDetailsCount]: Math.max(
          0,
          Math.floor(count),
        ),
      },
    });
  } catch {
    // Older sites without the column must not fail Item Details saves.
  }
}

export async function markNpdItemDetailPostedToSap(
  sharePointId: number,
): Promise<void> {
  if (!sharePointId) {
    throw new Error(
      "The Item Details record could not be marked as posted to SAP.",
    );
  }

  await SPServices.SPUpdateItem({
    Listname: LIST_NAME(),
    ID: sharePointId,
    RequestJSON: {
      [FIELDS.SAP]: true,
    },
  });
}
