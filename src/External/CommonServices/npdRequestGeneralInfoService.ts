import {
  Config,
  normalizeNpdMaterialTypeLabel,
  NpdItemDetailsBackup,
  RequestStatus,
} from "./Config";
import type {
  INpdDraftSavePayload,
  INpdItemDetailRecord,
  INpdOtherDetails,
  INpdRequestGeneralInfo,
  IResolvedUserAccess,
  NpdWorkflowAction,
} from "./Interface";
import {
  addNpdApproverComment,
  resolveApproverUserIds,
} from "./npdApproverCommentsService";
import {
  dedupeNpdItemDetailsForInsert,
  npdItemDetailNeedsInsert,
  remainingNpdItemDetailsAfterStored,
  upsertNpdItemDetailsBackupAttachment,
} from "./npdItemDetailsBackupService";
import {
  fetchNpdItemDetailsByRequestId,
  saveNpdItemDetailsBatch,
  waitForInFlightNpdItemDetailsMutate,
} from "./npdItemDetailsService";
import {
  generateNextNpdRequestId,
  isNpdRequestIdTitle,
} from "./npdRequestIdService";
import {
  sendNpdApprovalNotification,
  shouldIncludeNpdEmailActions,
} from "./npdNotificationService";
import { extractPersonEmails, normalizeEmail } from "./personFieldUtils";
import {
  applyApproverActionToWorkflow,
  applySubmitWorkflowStatuses,
  buildNpdDraftWorkflowJson,
  getFirstPendingApproverRole,
  getPendingApproverEmails,
  isMisCoordinatorWorkflowRole,
  isVerticalHeadWorkflowRole,
  parseWorkflowJson,
  resolveActorWorkflowRole,
  resolveRequestStatusAfterAction,
  stringifyWorkflowJson,
  userCanActOnPendingWorkflow,
} from "./npdWorkflowJsonService";
import { canActOnPendingNpdStep } from "./permissionService";
import { validateItemsAgainstMaterialMaster } from "./materialMasterService";
import {
  isBrowserOnline,
  NETWORK_OFFLINE_MESSAGE,
} from "./networkConnectivity";

/**
 * Set when Submit is abandoned because the browser went offline.
 * The in-flight SharePoint call may still be pending; this stops it from
 * promoting the request to Pending after connectivity returns.
 */
let activeNpdSubmitToken = 0;
let cancelledNpdSubmitToken = 0;
let npdSubmitOfflineLatch = false;

let npdDraftPersistCancelled = false;

/** Call at the start of a new Submit click so a previous offline cancel does not stick. */
export function resetNpdSubmitOfflineLatch(): void {
  npdSubmitOfflineLatch = false;
}

/** Call at the start of a new Save as Draft so a previous offline cancel does not stick. */
export function resetNpdDraftPersistLatch(): void {
  npdDraftPersistCancelled = false;
}

/** UI detected offline. Do not wait for the hung SharePoint call to settle. */
export function cancelInFlightNpdSubmit(): void {
  npdSubmitOfflineLatch = true;
  cancelledNpdSubmitToken = activeNpdSubmitToken;
  npdDraftPersistCancelled = true;
}

/** Stop remaining Save as Draft Item Details batches; reconnect must not resume them. */
export function cancelInFlightNpdDraftPersist(): void {
  npdDraftPersistCancelled = true;
}

function beginNpdSubmitToken(): number {
  if (npdSubmitOfflineLatch || !isBrowserOnline()) {
    throw new Error(NETWORK_OFFLINE_MESSAGE);
  }
  activeNpdSubmitToken += 1;
  return activeNpdSubmitToken;
}

function isNpdSubmitCancelled(token: number): boolean {
  return token > 0 && cancelledNpdSubmitToken === token;
}
import { isDeletedYesFlag } from "./lookupFieldUtils";
import { postNpdItemsToSap } from "./sapMaterialMasterService";
import {
  getActiveRecordCreatePayload,
  getActiveRecordFilters,
  getSoftDeletePayload,
  isActiveRecord,
  SOFT_DELETE_FIELD,
} from "./softDelete";
import SPServices from "./SPServices";
import { requireRocaMasterSiteUrl } from "./rocaSiteUrlResolver";

const LIST_NAME = (): string => Config.ListNames.NpdRequest;
const FIELDS = Config.FieldNames.NpdRequest;

const SELECT_FIELDS = [
  "Id",
  "Title",
  "Brand",
  "MaterialType",
  "Plant",
  "Status",
  "IsDeleted",
  "WorkFlowJSON",
  "ItemDetailsCount",
  "PlantCode",
  "StorageLocation",
  "ProfitCenter",
  "MRPGroup",
  "MRPController",
  "ValuationClass",
  "ClassType",
  "MaterialExtension",
  "Created",
  "Modified",
  "Author/Id",
  "Author/Title",
  "Author/EMail",
  "Initiator/Id",
  "Initiator/Title",
  "Initiator/EMail",
].join(",");
const EXPAND_FIELDS = "Author,Initiator";

/** Form hydrate by id — includes AttachmentFiles so backup URL needs no extra list call. */
const SELECT_FIELDS_BY_ID = `${SELECT_FIELDS},AttachmentFiles/FileName,AttachmentFiles/ServerRelativeUrl`;
const EXPAND_FIELDS_BY_ID = `${EXPAND_FIELDS},AttachmentFiles`;

/** Minimal select when Other Details columns are not yet provisioned. */
const SELECT_FIELDS_CORE =
  "Id,Title,Brand,MaterialType,Plant,Status,IsDeleted,WorkFlowJSON,ItemDetailsCount,Created,Modified,Author/Id,Author/Title,Author/EMail,Initiator/Id,Initiator/Title,Initiator/EMail";
const SELECT_FIELDS_CORE_BY_ID = `${SELECT_FIELDS_CORE},AttachmentFiles/FileName,AttachmentFiles/ServerRelativeUrl`;
const EXPAND_FIELDS_CORE_BY_ID = "Author,Initiator,AttachmentFiles";

function getNumericId(value: unknown): number {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

function getAddedItemId(result: unknown): number {
  if (!result || typeof result !== "object") {
    return 0;
  }

  const record = result as Record<string, unknown>;
  const nestedData =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : undefined;

  return (
    getNumericId(record.Id) ||
    getNumericId(record.ID) ||
    getNumericId(nestedData?.Id) ||
    getNumericId(nestedData?.ID)
  );
}

function getAuthorEmail(item: Record<string, unknown>): string {
  const emails = extractPersonEmails(item.Author);
  return emails[0] ?? "";
}

function getInitiatorEmail(item: Record<string, unknown>): string {
  const emails = extractPersonEmails(item.Initiator);
  return emails[0] ?? "";
}

function getInitiatorId(item: Record<string, unknown>): number {
  const direct = Number(item.InitiatorId);
  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  const person = item.Initiator;
  if (person && typeof person === "object") {
    const id = Number((person as Record<string, unknown>).Id);
    if (Number.isFinite(id) && id > 0) {
      return id;
    }
  }

  return 0;
}

/** Initiator person when stored; otherwise the SharePoint Author (older rows). */
export function getNpdRequestOwnerEmail(item: {
  InitiatorEmail?: string;
  AuthorEmail?: string;
}): string {
  return (item.InitiatorEmail || item.AuthorEmail || "").trim();
}

function getAuthorTitle(item: Record<string, unknown>): string {
  const author = item.Author;
  if (!author || typeof author !== "object") {
    return "";
  }

  return String((author as Record<string, unknown>).Title ?? "").trim();
}

function extractItemDetailsBackupUrl(item: Record<string, unknown>): string {
  const raw = item.AttachmentFiles;
  const files: Array<Record<string, unknown>> = Array.isArray(raw)
    ? (raw as Array<Record<string, unknown>>)
    : raw &&
        typeof raw === "object" &&
        Array.isArray((raw as { results?: unknown }).results)
      ? ((raw as { results: Array<Record<string, unknown>> }).results)
      : [];
  const backupName = NpdItemDetailsBackup.FileName.toLowerCase();
  const backup = files.find((file) => {
    const name = String(file.FileName ?? file.fileName ?? "")
      .trim()
      .toLowerCase();
    return name === backupName;
  });
  return String(
    backup?.ServerRelativeUrl ?? backup?.serverRelativeUrl ?? "",
  ).trim();
}

function mapGeneralInfo(item: Record<string, unknown>): INpdRequestGeneralInfo {
  const workflowJson = String(item[FIELDS.WorkFlowJSON] ?? "");

  return {
    Id: Number(item.Id),
    Title: String(item[FIELDS.Title] ?? ""),
    Brand: String(item[FIELDS.Brand] ?? ""),
    MaterialType: normalizeNpdMaterialTypeLabel(
      String(item[FIELDS.MaterialType] ?? ""),
    ),
    Plant: String(item[FIELDS.Plant] ?? ""),
    Status: String(item[FIELDS.Status] ?? ""),
    IsDeleted: isDeletedYesFlag(item[SOFT_DELETE_FIELD]),
    WorkFlowJSON: workflowJson,
    WorkflowSteps: parseWorkflowJson(item[FIELDS.WorkFlowJSON] ?? workflowJson),
    AuthorEmail: getAuthorEmail(item),
    AuthorTitle: getAuthorTitle(item),
    InitiatorEmail: getInitiatorEmail(item),
    InitiatorId: getInitiatorId(item),
    Created: String(item.Created ?? ""),
    Modified: String(item.Modified ?? item.Created ?? ""),
    ItemDetailsCount: Math.max(
      0,
      Math.floor(Number(item[FIELDS.ItemDetailsCount] ?? 0) || 0),
    ),
    ItemDetailsBackupUrl: extractItemDetailsBackupUrl(item) || undefined,
    PlantCode: String(item[FIELDS.PlantCode] ?? "").trim(),
    StorageLocation: String(item[FIELDS.StorageLocation] ?? "").trim(),
    ProfitCenter: String(item[FIELDS.ProfitCenter] ?? "").trim(),
    MRPGroup: String(item[FIELDS.MRPGroup] ?? "").trim(),
    MRPController: String(item[FIELDS.MRPController] ?? "").trim(),
    ValuationClass: String(item[FIELDS.ValuationClass] ?? "").trim(),
    ClassType: String(item[FIELDS.ClassType] ?? "").trim(),
    MaterialExtension: String(item[FIELDS.MaterialExtension] ?? "").trim(),
  };
}

function buildOtherDetailsUpdatePayload(
  otherDetails: INpdOtherDetails,
): Record<string, unknown> {
  return {
    [FIELDS.PlantCode]: otherDetails.plantCode.trim(),
    [FIELDS.StorageLocation]: otherDetails.storageLocation.trim(),
    [FIELDS.ProfitCenter]: otherDetails.profitCenter.trim(),
    [FIELDS.MRPGroup]: otherDetails.mrpGroup.trim(),
    [FIELDS.MRPController]: otherDetails.mrpController.trim(),
    [FIELDS.ValuationClass]: otherDetails.valuationClass.trim(),
    [FIELDS.ClassType]: otherDetails.classType.trim() || "001",
    [FIELDS.MaterialExtension]: otherDetails.materialExtension.trim(),
  };
}

export function isDraftOrReworkStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === RequestStatus.Draft.toLowerCase() ||
    normalized === RequestStatus.Rework.toLowerCase() ||
    normalized === "in rework"
  );
}

function resolveDraftSaveStatus(): string {
  // Save Draft always stores Draft — including after VH/MIS Rework — so the
  // request stays with the Initiator until they click Resubmit / Submit.
  return RequestStatus.Draft;
}

function buildItemPayload(
  payload: INpdDraftSavePayload,
  workflowJson: string,
  status: string,
  title: string,
  itemDetailsCount?: number,
): Record<string, unknown> {
  const requestJson: Record<string, unknown> = {
    [FIELDS.Title]: title,
    [FIELDS.Brand]: payload.brand.trim(),
    [FIELDS.MaterialType]: payload.materialType.trim(),
    [FIELDS.Plant]: (payload.plantSource || "").trim(),
    [FIELDS.Status]: status,
    [FIELDS.WorkFlowJSON]: workflowJson,
  };
  // Fold Products count into the same create/update as the header fields.
  if (
    typeof itemDetailsCount === "number" &&
    Number.isFinite(itemDetailsCount)
  ) {
    requestJson[FIELDS.ItemDetailsCount] = Math.max(
      0,
      Math.floor(itemDetailsCount),
    );
  }
  return requestJson;
}

function countPersistableItemDetails(
  items: readonly INpdItemDetailRecord[],
): number {
  return items.filter((item) =>
    Boolean(
      String(item.materialCode ?? "").trim() ||
      String(item.materialDescription ?? "").trim(),
    ),
  ).length;
}

async function resolveInitiatorSiteUserId(
  email: string,
  userId?: number,
): Promise<number> {
  if (userId && userId > 0) {
    return userId;
  }

  const trimmed = email.trim();
  if (!trimmed) {
    return 0;
  }

  try {
    return (await SPServices.ensureSiteUserId(trimmed)) || 0;
  } catch {
    return 0;
  }
}

export interface INpdPersistItemSaveOptions {
  partial?: boolean;
  deletedSharePointIds?: number[];
  /**
   * Full Item Details grid for JSON backup (all rows). Defaults to `items`
   * when omitted (new Draft saves already send the full set).
   */
  backupItems?: INpdItemDetailRecord[];
  onDraftRetained?: (draft: {
    requestId: number;
    requestTitle: string;
  }) => void;
  /**
   * When true, Brand / Material Type / Plant / Title / Status already match
   * what is stored — skip NPD_Request field PATCH.
   */
  headerUnchanged?: boolean;
  /** ItemDetailsCount last known on NPD_Request (from hydrate). */
  existingItemDetailsCount?: number;
  /** WorkFlowJSON already in memory — skip NPD_Request GET. */
  existingWorkflowJson?: string;
}

async function persistHeaderAndItems(
  payload: INpdDraftSavePayload,
  workflowJson: string,
  status: string,
  title: string,
  items: INpdItemDetailRecord[],
  initiatorEmail: string,
  initiatorUserId?: number,
  itemSave?: INpdPersistItemSaveOptions,
): Promise<INpdRequestGeneralInfo> {
  const isNewRequest = !(payload.id && payload.id > 0);
  const backupItems = itemSave?.backupItems ?? items;
  const itemDetailsCount = countPersistableItemDetails(backupItems);
  const deletedIds = (itemSave?.deletedSharePointIds || []).filter(
    (id) => id > 0,
  );
  const itemsChanged = items.length > 0 || deletedIds.length > 0;
  const existingCount =
    typeof itemSave?.existingItemDetailsCount === "number"
      ? itemSave.existingItemDetailsCount
      : undefined;
  const countChanged =
    typeof existingCount === "number" &&
    Number.isFinite(existingCount) &&
    existingCount !== itemDetailsCount;
  // Rework → Draft on Save Draft always needs a header Status write.
  const existingStatusLower = (payload.existingStatus || "")
    .trim()
    .toLowerCase();
  const statusChangingToDraft =
    !isNewRequest &&
    existingStatusLower !== RequestStatus.Draft.toLowerCase() &&
    status.trim().toLowerCase() === RequestStatus.Draft.toLowerCase();
  const headerNeedsUpdate =
    isNewRequest ||
    !itemSave?.headerUnchanged ||
    countChanged ||
    statusChangingToDraft;

  let requestId = payload.id && payload.id > 0 ? payload.id : 0;
  if (headerNeedsUpdate) {
    requestId = await upsertNpdRequestHeader(
      payload,
      workflowJson,
      status,
      title,
      initiatorEmail,
      initiatorUserId,
      itemDetailsCount,
    );
  }

  const requestTitle =
    (title || "").trim() ||
    (payload.existingTitle || "").trim() ||
    String(requestId);
  itemSave?.onDraftRetained?.({ requestId, requestTitle });

  // Full grid in Attachments before Item Details writes so a mid-batch
  // disconnect still has every imported row for the next Save / Submit.
  if (isNewRequest || itemsChanged) {
    await upsertNpdItemDetailsBackupAttachment(requestId, backupItems, {
      mode: isNewRequest ? "add" : "auto",
    });
  }

  if (itemsChanged) {
    const storedRows = backupItems.filter((row) => row.sharePointId > 0);
    const itemsToPersist = dedupeNpdItemDetailsForInsert(
      items.filter(
        (row) =>
          row.sharePointId > 0 || npdItemDetailNeedsInsert(row, storedRows),
      ),
    );

    try {
      await saveNpdItemDetailsBatch(requestId, itemsToPersist, {
        isNewRequest,
        partial: Boolean(itemSave?.partial),
        deletedSharePointIds: itemSave?.deletedSharePointIds,
        skipBackup: true,
        skipItemDetailsCountSync: true,
        shouldAbort: () =>
          npdDraftPersistCancelled || !isBrowserOnline(),
      });
    } catch (error) {
      const wrapped = error instanceof Error ? error : new Error(String(error));
      const draftMeta = wrapped as Error & {
        npdDraftRequestId?: number;
        npdDraftRequestTitle?: string;
      };
      draftMeta.npdDraftRequestId = requestId;
      draftMeta.npdDraftRequestTitle = requestTitle;
      throw wrapped;
    }
  }

  // No re-GET of NPD_Request — Id/Status/Title/workflow are already known.
  return {
    Id: requestId,
    Title: requestTitle,
    Brand: payload.brand.trim(),
    MaterialType: payload.materialType.trim(),
    Plant: (payload.plantSource || "").trim(),
    Status: status,
    IsDeleted: false,
    WorkFlowJSON: workflowJson,
    WorkflowSteps: parseWorkflowJson(workflowJson),
    AuthorEmail: initiatorEmail,
    AuthorTitle: "",
    InitiatorEmail: initiatorEmail,
    InitiatorId: initiatorUserId || 0,
    Created: new Date().toISOString(),
    Modified: new Date().toISOString(),
    ItemDetailsCount: itemDetailsCount,
  };
}

async function upsertNpdRequestHeader(
  payload: INpdDraftSavePayload,
  workflowJson: string,
  status: string,
  title: string,
  initiatorEmail: string,
  initiatorUserId?: number,
  itemDetailsCount?: number,
): Promise<number> {
  const requestJson = buildItemPayload(
    payload,
    workflowJson,
    status,
    title,
    itemDetailsCount,
  );
  const initiatorId = await resolveInitiatorSiteUserId(
    initiatorEmail,
    initiatorUserId,
  );
  if (initiatorId > 0) {
    requestJson[FIELDS.InitiatorId] = initiatorId;
  }

  let requestId = payload.id && payload.id > 0 ? payload.id : 0;

  if (requestId) {
    await SPServices.SPUpdateItem({
      Listname: LIST_NAME(),
      ID: requestId,
      RequestJSON: requestJson,
    });
    return requestId;
  }

  const created = await SPServices.SPAddItem({
    Listname: LIST_NAME(),
    RequestJSON: {
      ...requestJson,
      ...getActiveRecordCreatePayload(),
    },
  });
  requestId = getAddedItemId(created);
  if (!requestId) {
    throw new Error(
      "The request was saved but its SharePoint ID could not be read.",
    );
  }
  return requestId;
}

export async function saveNpdGeneralInfoDraft(
  payload: INpdDraftSavePayload,
  items: INpdItemDetailRecord[],
  initiatorEmail: string,
  contextSiteUrl?: string,
  initiatorUserId?: number,
  itemSave?: INpdPersistItemSaveOptions,
): Promise<INpdRequestGeneralInfo> {
  const isExisting = Boolean(payload.id && payload.id > 0);
  let workflowJson = (itemSave?.existingWorkflowJson || "").trim();

  // Existing Draft/Rework: keep WorkFlowJSON — skip ApproversMaster rebuild.
  // Prefer in-memory JSON from hydrate; only GET NPD_Request when missing.
  if (!workflowJson && isExisting && payload.id) {
    try {
      const existing = await fetchNpdGeneralInfoById(payload.id);
      workflowJson = (existing.WorkFlowJSON || "").trim();
      if (!workflowJson && existing.WorkflowSteps?.length) {
        workflowJson = stringifyWorkflowJson(existing.WorkflowSteps);
      }
    } catch {
      workflowJson = "";
    }
  }

  if (!workflowJson) {
    const workflowSteps = await buildNpdDraftWorkflowJson(
      payload.brand.trim(),
      initiatorEmail,
      contextSiteUrl,
      { enforceApprovers: false },
    );
    workflowJson = stringifyWorkflowJson(workflowSteps);
  }

  const status = resolveDraftSaveStatus();
  const title =
    payload.existingTitle && isNpdRequestIdTitle(payload.existingTitle)
      ? payload.existingTitle.trim()
      : "";

  return persistHeaderAndItems(
    payload,
    workflowJson,
    status,
    title,
    items,
    initiatorEmail,
    initiatorUserId,
    {
      partial: isExisting ? itemSave?.partial !== false : undefined,
      deletedSharePointIds: isExisting
        ? itemSave?.deletedSharePointIds
        : undefined,
      backupItems: itemSave?.backupItems ?? items,
      onDraftRetained: itemSave?.onDraftRetained,
      headerUnchanged: itemSave?.headerUnchanged,
      existingItemDetailsCount: itemSave?.existingItemDetailsCount,
      existingWorkflowJson: workflowJson,
    },
  );
}

export interface INpdSubmitOptions {
  /** Full Item Details grid for JSON backup (all rows, including already-saved). */
  backupItems?: INpdItemDetailRecord[];
  /**
   * Soft-delete Ids already computed by the form vs hydrate baseline.
   * When provided (including []), skip the NPD_ItemDetails list reconcile GET.
   */
  deletedSharePointIds?: number[];
  /** Full Item Details count from hydrate (Products). Caps remaining inserts. */
  intendedItemDetailsCount?: number;
  onDraftRetained?: (draft: {
    requestId: number;
    requestTitle: string;
  }) => void;
}

export async function submitNpdRequest(
  payload: INpdDraftSavePayload,
  items: INpdItemDetailRecord[],
  initiatorEmail: string,
  contextSiteUrl?: string,
  initiatorComments?: string,
  initiatorUserId?: number,
  onDraftRetainedOrOptions?:
    | ((draft: { requestId: number; requestTitle: string }) => void)
    | INpdSubmitOptions,
  /** @deprecated Prefer options.backupItems */
  backupItemsArg?: INpdItemDetailRecord[],
): Promise<INpdRequestGeneralInfo> {
  const submitOptions: INpdSubmitOptions =
    typeof onDraftRetainedOrOptions === "function"
      ? {
          onDraftRetained: onDraftRetainedOrOptions,
          backupItems: backupItemsArg,
        }
      : onDraftRetainedOrOptions || { backupItems: backupItemsArg };
  const onDraftRetained = submitOptions.onDraftRetained;
  const backupItems = submitOptions.backupItems;
  const clientDeletedIds = submitOptions.deletedSharePointIds;
  const clientReconciled = Array.isArray(clientDeletedIds);
  const intendedItemDetailsCount = submitOptions.intendedItemDetailsCount;

  const submitToken = beginNpdSubmitToken();
  const stopIfOffline = (): void => {
    if (isNpdSubmitCancelled(submitToken) || !isBrowserOnline()) {
      throw new Error(NETWORK_OFFLINE_MESSAGE);
    }
  };

  // --- Validation only (no NPD_Request / Item Details writes) ---
  // Vertical Head must be validated before any request insert / Pending update.
  const workflowSteps = applySubmitWorkflowStatuses(
    await buildNpdDraftWorkflowJson(
      payload.brand.trim(),
      initiatorEmail,
      contextSiteUrl,
      { enforceApprovers: true },
    ),
  );
  stopIfOffline();
  const hasVerticalHead = workflowSteps.some(
    (step) =>
      isVerticalHeadWorkflowRole(step.Role) &&
      Boolean((step.UserEmail || "").trim()),
  );
  if (!hasVerticalHead) {
    throw new Error(
      `${Config.Roles.VerticalHead} is not configured for this brand.`,
    );
  }

  const isResubmit = isNpdRequestIdTitle(payload.existingTitle || "");
  // Material Master duplicate check runs once in the Initiator UI before Submit.
  // Do not repeat the SharePoint lookup here.

  const workflowJson = stringifyWorkflowJson(workflowSteps);
  const requestIdTitle =
    payload.existingTitle && isNpdRequestIdTitle(payload.existingTitle)
      ? payload.existingTitle.trim()
      : await generateNextNpdRequestId(payload.brand.trim(), contextSiteUrl);

  // Hold as Draft/Rework while Item Details save. Never Pending until items finish.
  // Prefer in-memory status from the form — avoid an extra NPD_Request GET.
  let holdingStatus: string = RequestStatus.Draft;
  if (payload.id && payload.id > 0) {
    const currentLower = (payload.existingStatus || "").trim().toLowerCase();
    if (
      currentLower === RequestStatus.Rework.toLowerCase() ||
      currentLower === "in rework"
    ) {
      holdingStatus = RequestStatus.Rework;
    } else if (currentLower === RequestStatus.Draft.toLowerCase()) {
      holdingStatus = RequestStatus.Draft;
    } else if (currentLower) {
      // Unexpected status — confirm from list once.
      try {
        const existing = await fetchNpdGeneralInfoById(payload.id);
        const existingLower = (existing.Status || "").trim().toLowerCase();
        if (
          existingLower === RequestStatus.Rework.toLowerCase() ||
          existingLower === "in rework"
        ) {
          holdingStatus = RequestStatus.Rework;
        }
      } catch {
        holdingStatus = RequestStatus.Draft;
      }
    }
  }

  // Keep Title empty while holding as Draft. Request ID is written only when
  // Status becomes Pending (Phase 3). Resubmit already has a Request ID.
  const holdingTitle = isResubmit ? requestIdTitle : "";
  const existingRequestId = payload.id && payload.id > 0 ? payload.id : 0;
  let requestId = 0;

  try {
    const formBackup = backupItems && backupItems.length ? backupItems : items;

    // Phase 2 prep: which Item Details still need writes?
    let softDeleteIds: number[] = [];
    let remainingToPersist: INpdItemDetailRecord[] = items;

    if (clientReconciled) {
      // Form already diffed vs hydrate baseline — do not re-GET NPD_ItemDetails.
      // Insert only backup/new rows that are not already in NPD_ItemDetails.
      softDeleteIds = (clientDeletedIds || []).filter((id) => id > 0);
      const storedRows = formBackup.filter((row) => row.sharePointId > 0);
      remainingToPersist = dedupeNpdItemDetailsForInsert(
        items.filter(
          (row) =>
            row.sharePointId > 0 || npdItemDetailNeedsInsert(row, storedRows),
        ),
      );
    } else if (existingRequestId > 0) {
      const formKeepIds = new Set(
        formBackup.map((row) => row.sharePointId).filter((id) => id > 0),
      );
      const storedItems =
        await fetchNpdItemDetailsByRequestId(existingRequestId);
      stopIfOffline();
      softDeleteIds = storedItems
        .map((row) => row.sharePointId)
        .filter((id) => id > 0 && !formKeepIds.has(id));
      const softDeleteIdSet = new Set(softDeleteIds);
      const activeStored = storedItems.filter(
        (row) => !softDeleteIdSet.has(row.sharePointId),
      );
      remainingToPersist = dedupeNpdItemDetailsForInsert(
        items.filter((row) => {
          if (row.sharePointId > 0) {
            return !softDeleteIdSet.has(row.sharePointId);
          }
          return npdItemDetailNeedsInsert(row, activeStored);
        }),
      );
    }

    const itemsNeedWrite =
      remainingToPersist.length > 0 || softDeleteIds.length > 0;

    if (existingRequestId > 0) {
      // Retry after disconnect: header already exists. Attachments JSON is
      // rewritten below when Item Details still need writes (keeps field edits).
      requestId = existingRequestId;
      onDraftRetained?.({
        requestId,
        requestTitle: holdingTitle,
      });
    } else {
      // Phase 1: create header as Draft while items persist.
      requestId = await upsertNpdRequestHeader(
        payload,
        workflowJson,
        holdingStatus,
        holdingTitle,
        initiatorEmail,
        initiatorUserId,
        countPersistableItemDetails(formBackup),
      );
      onDraftRetained?.({
        requestId,
        requestTitle: holdingTitle,
      });
    }
    stopIfOffline();

    const shouldAbortSubmit = (): boolean =>
      isNpdSubmitCancelled(submitToken) || !isBrowserOnline();

    if (itemsNeedWrite) {
      if (!existingRequestId) {
        await upsertNpdItemDetailsBackupAttachment(requestId, formBackup, {
          mode: "add",
        });
        stopIfOffline();
      } else {
        // Offline recovery left a stale Attachments JSON. Rewrite it with the
        // current form grid so field edits after hydrate are not lost on the
        // next Draft open / attachment+list merge.
        await upsertNpdItemDetailsBackupAttachment(requestId, formBackup, {
          mode: "auto",
        });
        stopIfOffline();

        if (remainingToPersist.some((row) => !(row.sharePointId > 0))) {
          // First $batch may still be completing after an offline abort.
          // Wait, then insert only rows that are still missing.
          await waitForInFlightNpdItemDetailsMutate();
          stopIfOffline();
          const storedNow = await fetchNpdItemDetailsByRequestId(requestId);
          stopIfOffline();
          // Rows in softDeleteIds are removed in the same batch — do not count
          // them against the insert cap (delete-MIS + add-N was inserting 0).
          const pendingDeleteIds = new Set(softDeleteIds);
          const storedSurviving = storedNow.filter(
            (row) =>
              row.sharePointId > 0 && !pendingDeleteIds.has(row.sharePointId),
          );
          const formPersistableCount = countPersistableItemDetails(formBackup);
          remainingToPersist = remainingNpdItemDetailsAfterStored(
            remainingToPersist,
            storedSurviving,
            Math.max(
              formPersistableCount,
              typeof intendedItemDetailsCount === "number" &&
                intendedItemDetailsCount > 0
                ? intendedItemDetailsCount
                : 0,
              storedSurviving.length,
            ),
          );
        }
      }

      if (remainingToPersist.length > 0 || softDeleteIds.length > 0) {
        await saveNpdItemDetailsBatch(requestId, remainingToPersist, {
          partial: true,
          deletedSharePointIds: softDeleteIds,
          shouldAbort: shouldAbortSubmit,
          skipBackup: true,
          skipItemDetailsCountSync: true,
        });
      }
    }
    stopIfOffline();

    // Promote to Pending only while still online. A dropped connection keeps
    // Draft/Rework and must not notify the Vertical Head.
    if (!isBrowserOnline() || isNpdSubmitCancelled(submitToken)) {
      throw new Error(NETWORK_OFFLINE_MESSAGE);
    }

    // Phase 3: promote to Pending only after full item persist.
    const activeItemCount = formBackup.filter((row) =>
      Boolean(
        String(row.materialCode ?? "").trim() ||
        String(row.materialDescription ?? "").trim(),
      ),
    ).length;
    await SPServices.SPUpdateItem({
      Listname: LIST_NAME(),
      ID: requestId,
      RequestJSON: {
        [FIELDS.Status]: RequestStatus.Pending,
        [FIELDS.Title]: requestIdTitle,
        [FIELDS.Brand]: payload.brand.trim(),
        [FIELDS.MaterialType]: payload.materialType.trim(),
        [FIELDS.Plant]: (payload.plantSource || "").trim(),
        [FIELDS.WorkFlowJSON]: workflowJson,
        [FIELDS.ItemDetailsCount]: activeItemCount,
      },
    });

    if (!isBrowserOnline()) {
      throw new Error(NETWORK_OFFLINE_MESSAGE);
    }
  } catch (error) {
    if (requestId > 0) {
      const offlineNow =
        !isBrowserOnline() || isNpdSubmitCancelled(submitToken);
      // While offline this update cannot finish and would keep Submit on
      // Processing until the network returns. Header is already Draft/Rework
      // unless phase 3 wrote Pending — fire the revert without awaiting it.
      const revertStatus = SPServices.SPUpdateItem({
        Listname: LIST_NAME(),
        ID: requestId,
        RequestJSON: {
          [FIELDS.Status]: holdingStatus,
          // Keep Products at the full initial Item Details count.
          [FIELDS.ItemDetailsCount]: countPersistableItemDetails(
            backupItems && backupItems.length ? backupItems : items,
          ),
          // Clear any Request ID written before Pending for first-time submit.
          ...(!isResubmit ? { [FIELDS.Title]: "" } : {}),
        },
      }).catch(() => undefined);
      if (!offlineNow) {
        try {
          await revertStatus;
        } catch {
          // Best effort — keep original error for the user.
        }
      }
      onDraftRetained?.({
        requestId,
        requestTitle: holdingTitle,
      });
      const wrapped = error instanceof Error ? error : new Error(String(error));
      const draftMeta = wrapped as Error & {
        npdDraftRequestId?: number;
        npdDraftRequestTitle?: string;
      };
      draftMeta.npdDraftRequestId = requestId;
      draftMeta.npdDraftRequestTitle = holdingTitle;
      throw wrapped;
    }
    throw error;
  }

  // Build the committed snapshot without a re-GET of NPD_Request.
  // Approval email uses Created as Submitted Date — prefer draft Created when known.
  const submittedAt = new Date().toISOString();
  const saved: INpdRequestGeneralInfo = {
    Id: requestId,
    Title: requestIdTitle,
    Brand: payload.brand.trim(),
    MaterialType: payload.materialType.trim(),
    Plant: (payload.plantSource || "").trim(),
    Status: RequestStatus.Pending,
    IsDeleted: false,
    WorkFlowJSON: workflowJson,
    WorkflowSteps: workflowSteps,
    AuthorEmail: initiatorEmail,
    AuthorTitle: "",
    InitiatorEmail: initiatorEmail,
    InitiatorId: initiatorUserId || 0,
    Created: submittedAt,
    Modified: submittedAt,
    ItemDetailsCount: countPersistableItemDetails(
      backupItems && backupItems.length ? backupItems : items,
    ),
    PlantCode: "",
    StorageLocation: "",
    ProfitCenter: "",
    MRPGroup: "",
    MRPController: "",
    ValuationClass: "",
    ClassType: "",
    MaterialExtension: "",
  };

  const auditAction = isResubmit ? "Resubmit" : "Initiated";
  const auditComments =
    (initiatorComments || "").trim() ||
    (isResubmit ? "Request resubmitted" : "Request initiated");

  try {
    const userIds = await resolveApproverUserIds(
      initiatorUserId || 0,
      initiatorEmail,
    );
    await addNpdApproverComment({
      requestId: saved.Id,
      requestTitle: saved.Title,
      comments: auditComments,
      role: Config.Roles.Initiator,
      userIds,
      action: auditAction,
      actorEmail: initiatorEmail,
      actionVia: "System",
    });
  } catch (auditError) {
    console.warn("Initiator audit log write failed on submit:", auditError);
  }

  const pendingEmails = getPendingApproverEmails(saved.WorkflowSteps);
  const pendingRole = getFirstPendingApproverRole(saved.WorkflowSteps);

  try {
    await sendNpdApprovalNotification({
      request: saved,
      action: isResubmit ? "Resubmitted" : "Submitted",
      to: pendingEmails,
      includeActionButtons: shouldIncludeNpdEmailActions(pendingRole),
      role: pendingRole,
      siteUrl: contextSiteUrl,
    });
  } catch {
    // Persist succeeded; notification failure must not roll back the request.
  }

  return saved;
}

export async function fetchActiveNpdRequests(): Promise<
  INpdRequestGeneralInfo[]
> {
  let rows: Record<string, unknown>[] = [];
  try {
    rows = (await SPServices.SPReadItems({
      Listname: LIST_NAME(),
      Select: SELECT_FIELDS,
      Expand: EXPAND_FIELDS,
      Filter: getActiveRecordFilters(),
      Orderby: "Modified",
      Orderbydecorasc: false,
      Topcount: 5000,
    })) as Record<string, unknown>[];
  } catch {
    rows = (await SPServices.SPReadItems({
      Listname: LIST_NAME(),
      Select: SELECT_FIELDS_CORE,
      Expand: "Author",
      Filter: getActiveRecordFilters(),
      Orderby: "Modified",
      Orderbydecorasc: false,
      Topcount: 5000,
    })) as Record<string, unknown>[];
  }

  return rows.map(mapGeneralInfo).filter(isActiveRecord);
}

export async function applyNpdWorkflowAction(params: {
  requestId: number;
  action: NpdWorkflowAction;
  comments: string;
  actorEmail: string;
  actorRole: string;
  actorUserId: number;
  access: IResolvedUserAccess;
  items?: INpdItemDetailRecord[];
  /** MIS Coordinator Other Details — persisted only on Post to SAP (Approve). */
  otherDetails?: INpdOtherDetails;
  /** Current NPD web absolute URL for ApproverMail email links. */
  siteUrl?: string;
  actionVia?: "System" | "Mail" | string;
  /** When true with items, only mutate those rows (+ deletedItemIds). */
  itemSavePartial?: boolean;
  /** SharePoint Item Details Ids removed from the grid (partial save). */
  deletedItemIds?: number[];
  /**
   * MIS Post to SAP: Material Master duplicate check only for these rows
   * (newly added / updated). Empty array skips the check. When omitted,
   * falls back to `items` for callers that do not pass a diff.
   */
  materialMasterCheckItems?: INpdItemDetailRecord[];
  /**
   * In-memory request already loaded on the form. When provided (and Id matches),
   * skips the blocking NPD_Request re-read before the status update.
   */
  existingRequest?: INpdRequestGeneralInfo;
  /**
   * Intended active Item Details count after this action (from the form grid).
   * VH Approve folds this into the Status/WorkFlowJSON update so a separate
   * ItemDetailsCount PATCH + recount fetch are not needed.
   */
  itemDetailsCount?: number;
  /**
   * MIS Post to SAP progress: report after each successful SAP API call
   * (including 0/total at loop start); finish when the SAP batch ends.
   */
  sapProgress?: {
    onProgress?: (
      posted: number,
      total: number,
      postedSharePointId?: number,
    ) => void;
    onFinish?: (success: boolean) => void;
  };
}): Promise<INpdRequestGeneralInfo> {
  const request =
    params.existingRequest &&
    params.existingRequest.Id === params.requestId &&
    (params.existingRequest.WorkflowSteps?.length ||
      (params.existingRequest.WorkFlowJSON || "").trim())
      ? params.existingRequest
      : await fetchNpdGeneralInfoById(params.requestId);
  const actorRole =
    resolveActorWorkflowRole(
      request.WorkflowSteps,
      params.actorEmail,
      params.access.assignedRoles,
    ) || params.actorRole;

  const pendingRole = getFirstPendingApproverRole(request.WorkflowSteps);
  if (!pendingRole) {
    throw new Error("This request has no pending approval action.");
  }

  if (pendingRole.trim().toLowerCase() !== actorRole.trim().toLowerCase()) {
    throw new Error(
      "You do not have a pending approval action on this request.",
    );
  }

  const canAct =
    userCanActOnPendingWorkflow(
      request.WorkflowSteps,
      params.actorEmail,
      params.access.assignedRoles,
    ) && canActOnPendingNpdStep(params.access, request.Brand, actorRole);

  if (!canAct) {
    throw new Error(
      "You do not have a pending approval action on this request.",
    );
  }

  const isMisPostToSap =
    params.action === "Approve" && isMisCoordinatorWorkflowRole(actorRole);
  const isVerticalHeadActor = isVerticalHeadWorkflowRole(actorRole);
  const isVerticalHeadApprove =
    params.action === "Approve" && isVerticalHeadActor;
  const isMisReject =
    params.action === "Reject" && isMisCoordinatorWorkflowRole(actorRole);
  const isMisRework =
    params.action === "Rework" && isMisCoordinatorWorkflowRole(actorRole);

  // MIS Reject / Rework and VH Reject / Rework: status/workflow only — never
  // touch Item Details. VH Approve and MIS Post to SAP persist Item Details.
  const itemsToPersist =
    isMisReject || isMisRework || (isVerticalHeadActor && !isVerticalHeadApprove)
      ? undefined
      : params.items;
  const itemSavePartial = Boolean(params.itemSavePartial) || isMisRework;

  const actionStatus =
    params.action === "Approve"
      ? RequestStatus.Approved
      : params.action === "Reject"
        ? RequestStatus.Rejected
        : RequestStatus.Rework;

  const updatedSteps = applyApproverActionToWorkflow(
    request.WorkflowSteps,
    params.actorEmail,
    actorRole,
    actionStatus,
  );
  const headerStatus = resolveRequestStatusAfterAction(
    params.action,
    updatedSteps,
  );
  const willBeFinalApproval =
    params.action === "Approve" && !getFirstPendingApproverRole(updatedSteps);

  // Block Post to SAP before any status / Material Master write when duplicates exist.
  // Only newly added / updated Item Details are checked (targeted CAML) — not every line.
  if (isMisPostToSap) {
    if (!params.items?.length) {
      throw new Error("Item Details are required before posting to SAP.");
    }
    const itemsForCheck =
      params.materialMasterCheckItems !== undefined
        ? params.materialMasterCheckItems
        : params.items;
    if (itemsForCheck.length) {
      const materialMasterDuplicates = await validateItemsAgainstMaterialMaster(
        itemsForCheck,
        { excludeRequestId: params.requestId },
      );
      if (materialMasterDuplicates.length) {
        throw new Error(materialMasterDuplicates[0]);
      }
    }
  }

  // VH Approve: persist Item Details in one batch before status/workflow write.
  // Rework / Reject never reach here with items (itemsToPersist cleared above).
  // skipItemDetailsCountSync — count is written with Status below (one PATCH).
  let itemsAlreadySaved = false;
  if (
    isVerticalHeadApprove &&
    ((params.items && params.items.length > 0) ||
      (params.deletedItemIds && params.deletedItemIds.length > 0))
  ) {
    await saveNpdItemDetailsBatch(params.requestId, params.items || [], {
      partial: Boolean(params.itemSavePartial),
      deletedSharePointIds: params.deletedItemIds,
      skipBackup: Boolean(params.itemSavePartial),
      skipItemDetailsCountSync: true,
    });
    itemsAlreadySaved = true;
  }

  // Final MIS Post to SAP: save items, post each SAP=false line, set SAP=true
  // per success, then one Material Master write when every line is SAP=true.
  if (isMisPostToSap && willBeFinalApproval) {
    if (!params.items?.length) {
      throw new Error("Item Details are required before posting to SAP.");
    }
    await saveNpdItemDetailsBatch(params.requestId, params.items);
    itemsAlreadySaved = true;
    const storedItems = await fetchNpdItemDetailsByRequestId(params.requestId);
    const otherDetails = params.otherDetails ?? {
      plantCode: String(request.PlantCode ?? "").trim(),
      storageLocation: String(request.StorageLocation ?? "").trim(),
      profitCenter: String(request.ProfitCenter ?? "").trim(),
      mrpGroup: String(request.MRPGroup ?? "").trim(),
      mrpController: String(request.MRPController ?? "").trim(),
      valuationClass: String(request.ValuationClass ?? "").trim(),
      classType: String(request.ClassType ?? "").trim() || "001",
      materialExtension: String(request.MaterialExtension ?? "").trim(),
    };
    const sapTargets = storedItems.filter(
      (item) =>
        Boolean(item.materialCode.trim() || item.materialDescription.trim()) &&
        !item.sapPosted,
    );
    let sapBatchSucceeded = false;
    try {
      // fetch brand code
      const rocaSiteUrl = requireRocaMasterSiteUrl(params.siteUrl);
      let _brandCode: any = await SPServices.getAnotherSPReadItems({
        SiteUrl: rocaSiteUrl,
        Listname: Config.RocaMasterListNames.BrandMaster,
        Select: "Id,Title,BrandCode",
        Filter: [
          {
            FilterKey: "Title",
            FilterValue: request.Brand,
            Operator: "eq",
          },
        ],
        FilterCondition: "eq",
        Topcount: 1,
      });

      _brandCode = _brandCode ? _brandCode[0].BrandCode : "";

      await postNpdItemsToSap({
        requestId: params.requestId,
        // SAP payload continues to receive BrandMaster.BrandCode.
        brand: _brandCode,
        // Material Master Brand column stores the selected Brand title.
        brandTitle: request.Brand,
        materialType: request.MaterialType,
        plant: request.Plant,
        otherDetails,
        items: storedItems,
        siteUrl: params.siteUrl,
        onProgress:
          sapTargets.length > 0 ? params.sapProgress?.onProgress : undefined,
      });
      sapBatchSucceeded = true;
    } finally {
      if (sapTargets.length > 0) {
        params.sapProgress?.onFinish?.(sapBatchSucceeded);
      }
    }
  }

  const updatePayload: Record<string, unknown> = {
    [FIELDS.Status]: headerStatus,
    [FIELDS.WorkFlowJSON]: stringifyWorkflowJson(updatedSteps),
  };

  // VH Approve with Item Details changes: write ItemDetailsCount on the same
  // request PATCH (avoids recount fetch + second items(id) update).
  if (
    isVerticalHeadApprove &&
    itemsAlreadySaved &&
    typeof params.itemDetailsCount === "number" &&
    Number.isFinite(params.itemDetailsCount)
  ) {
    updatePayload[FIELDS.ItemDetailsCount] = Math.max(
      0,
      Math.floor(params.itemDetailsCount),
    );
  }

  // Other Details columns on NPD_Request are written only with Post to SAP.
  // MIS Rework / Reject (and VH) must not update Plant Code, Profit Center, etc.
  if (isMisPostToSap && params.otherDetails) {
    Object.assign(
      updatePayload,
      buildOtherDetailsUpdatePayload(params.otherDetails),
    );
  }

  try {
    await SPServices.SPUpdateItem({
      Listname: LIST_NAME(),
      ID: params.requestId,
      RequestJSON: updatePayload,
    });
  } catch (updateError) {
    // Status / workflow must still persist even if Other Details columns fail.
    if (isMisPostToSap && params.otherDetails) {
      await SPServices.SPUpdateItem({
        Listname: LIST_NAME(),
        ID: params.requestId,
        RequestJSON: {
          [FIELDS.Status]: headerStatus,
          [FIELDS.WorkFlowJSON]: stringifyWorkflowJson(updatedSteps),
        },
      });
      console.warn(
        "NPD Request updated without Other Details fields:",
        updateError,
      );
    } else {
      throw updateError;
    }
  }

  // Status / workflow are committed. Return promptly so a later network drop
  // cannot keep the user on the form after a successful action.
  const committedFallback: INpdRequestGeneralInfo = {
    ...request,
    Status: headerStatus,
    WorkFlowJSON: stringifyWorkflowJson(updatedSteps),
    WorkflowSteps: updatedSteps,
  };

  if (itemsToPersist && !itemsAlreadySaved) {
    try {
      await saveNpdItemDetailsBatch(params.requestId, itemsToPersist, {
        partial: itemSavePartial,
        deletedSharePointIds: params.deletedItemIds,
        // Partial MIS Rework/Post must not overwrite Attachments JSON with only
        // changedRecords — that corrupted offline recovery / Draft merge.
        skipBackup: itemSavePartial,
      });
    } catch (itemsError) {
      console.warn(
        "NPD Item Details save failed after workflow status update:",
        itemsError,
      );
    }
  }

  // VH and MIS Reject/Rework: the Status/WorkFlowJSON update above is the
  // only awaited call. Do not re-read NPD_Request.
  let saved = committedFallback;
  if (!isVerticalHeadActor && !isMisReject && !isMisRework) {
    try {
      saved = await fetchNpdGeneralInfoById(params.requestId);
    } catch (fetchError) {
      console.warn(
        "NPD Request updated but reload after workflow action failed:",
        fetchError,
      );
    }
  }

  // Comments / email must not block navigation after a successful commit.
  void (async () => {
    try {
      const userIds = await resolveApproverUserIds(
        params.actorUserId,
        params.actorEmail,
      );
      await addNpdApproverComment({
        requestId: params.requestId,
        requestTitle: request.Title,
        comments: params.comments,
        role: actorRole,
        userIds,
        action: params.action,
        actorEmail: params.actorEmail,
        actionVia: params.actionVia || "System",
      });
    } catch (commentError) {
      console.error(
        "NPD Request status updated but Approver Comments write failed:",
        commentError,
      );
    }

    let requestForNotify = saved;
    const nextPendingRole = getFirstPendingApproverRole(
      requestForNotify.WorkflowSteps,
    );
    const isFinalApproval = params.action === "Approve" && !nextPendingRole;

    // Owner email is only needed for Initiator notifications (Reject / Rework /
    // final Approve). VH Approve → next MIS must not re-read NPD_Request.
    const needsOwnerEmailForNotify =
      params.action !== "Approve" || isFinalApproval;
    if (
      needsOwnerEmailForNotify &&
      (isVerticalHeadActor || isMisReject || isMisRework) &&
      !getNpdRequestOwnerEmail(requestForNotify).trim()
    ) {
      try {
        requestForNotify = await fetchNpdGeneralInfoById(params.requestId);
      } catch {
        // Notification best-effort only.
      }
    }

    let recipients: string[];
    let recipientRole: string;
    let notificationAction: string = params.action;
    let includeActionButtons = false;

    if (params.action === "Approve") {
      if (isFinalApproval) {
        recipients = [getNpdRequestOwnerEmail(requestForNotify)];
        recipientRole = Config.Roles.Initiator;
        notificationAction = "Approved";
        includeActionButtons = false;
      } else {
        recipients = getPendingApproverEmails(requestForNotify.WorkflowSteps);
        recipientRole = nextPendingRole;
        includeActionButtons = shouldIncludeNpdEmailActions(nextPendingRole);
      }
    } else {
      recipients = [getNpdRequestOwnerEmail(requestForNotify)];
      recipientRole = Config.Roles.Initiator;
    }

    try {
      await sendNpdApprovalNotification({
        request: requestForNotify,
        action: notificationAction,
        comments: params.comments,
        role: recipientRole,
        to: recipients,
        includeActionButtons,
        siteUrl: params.siteUrl,
      });
    } catch {
      // Action already persisted.
    }
  })();

  return saved;
}

export async function fetchNpdGeneralInfoById(
  id: number,
  options?: { includeBackupMeta?: boolean },
): Promise<INpdRequestGeneralInfo> {
  let item: unknown;
  const includeBackupMeta = Boolean(options?.includeBackupMeta);
  try {
    item = await SPServices.SPReadItemUsingId({
      Listname: LIST_NAME(),
      SelectedId: id,
      Select: includeBackupMeta ? SELECT_FIELDS_BY_ID : SELECT_FIELDS,
      Expand: includeBackupMeta ? EXPAND_FIELDS_BY_ID : EXPAND_FIELDS,
    });
  } catch {
    try {
      item = await SPServices.SPReadItemUsingId({
        Listname: LIST_NAME(),
        SelectedId: id,
        Select: includeBackupMeta
          ? SELECT_FIELDS_CORE_BY_ID
          : SELECT_FIELDS_CORE,
        Expand: includeBackupMeta
          ? EXPAND_FIELDS_CORE_BY_ID
          : "Author,Initiator",
      });
    } catch {
      item = await SPServices.SPReadItemUsingId({
        Listname: LIST_NAME(),
        SelectedId: id,
        Select: SELECT_FIELDS_CORE,
        Expand: "Author,Initiator",
      });
    }
  }

  const record = Array.isArray(item)
    ? (item[0] as Record<string, unknown> | undefined)
    : (item as Record<string, unknown> | undefined);

  if (!record) {
    throw new Error("The NPD request could not be found.");
  }

  const mapped = mapGeneralInfo(record);
  if (!isActiveRecord(mapped)) {
    throw new Error("The NPD request is no longer available.");
  }

  return mapped;
}

export async function fetchNpdDraftReworkItems(
  currentUserEmail: string,
): Promise<INpdRequestGeneralInfo[]> {
  const loginEmail = normalizeEmail(currentUserEmail);
  if (!loginEmail) {
    return [];
  }

  return (await fetchActiveNpdRequests())
    .filter((item) => isDraftOrReworkStatus(item.Status))
    .filter(
      (item) => normalizeEmail(getNpdRequestOwnerEmail(item)) === loginEmail,
    );
}

export async function softDeleteNpdRequest(id: number): Promise<void> {
  await SPServices.SPUpdateItem({
    Listname: LIST_NAME(),
    ID: id,
    RequestJSON: getSoftDeletePayload(),
  });
}
