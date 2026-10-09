import { Config, RequestStatus } from "./Config";
import type {
  INpdDraftSavePayload,
  INpdItemDetailRecord,
  INpdOtherDetails,
  INpdRequestGeneralInfo,
  IResolvedUserAccess,
  NpdWorkflowAction,
} from "./Interface";
import { addNpdApproverComment, resolveApproverUserIds } from "./npdApproverCommentsService";
import {
  buildNpdItemDetailsMatchKey,
  mergeNpdItemDetailsWithBackup,
  tryLoadNpdItemDetailsBackup,
  upsertNpdItemDetailsBackupAttachment,
} from "./npdItemDetailsBackupService";
import {
  fetchNpdItemDetailsByRequestId,
  saveNpdItemDetailsBatch,
} from "./npdItemDetailsService";
import { generateNextNpdRequestId, isNpdRequestIdTitle } from "./npdRequestIdService";
import {
  sendNpdApprovalNotification,
  shouldIncludeNpdEmailActions,
} from "./npdNotificationService";
import {
  extractPersonEmails,
  normalizeEmail,
} from "./personFieldUtils";
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

/** Call at the start of a new Submit click so a previous offline cancel does not stick. */
export function resetNpdSubmitOfflineLatch(): void {
  npdSubmitOfflineLatch = false;
}

/** UI detected offline. Do not wait for the hung SharePoint call to settle. */
export function cancelInFlightNpdSubmit(): void {
  npdSubmitOfflineLatch = true;
  cancelledNpdSubmitToken = activeNpdSubmitToken;
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
import { postNpdItemsToSap } from "./sapMaterialMasterService";
import {
  getActiveRecordCreatePayload,
  getActiveRecordFilters,
  getSoftDeletePayload,
  isActiveRecord,
  SOFT_DELETE_FIELD,
} from "./softDelete";
import SPServices from "./SPServices";

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

/** Minimal select when Other Details columns are not yet provisioned. */
const SELECT_FIELDS_CORE =
  "Id,Title,Brand,MaterialType,Plant,Status,IsDeleted,WorkFlowJSON,Created,Modified,Author/Id,Author/Title,Author/EMail";

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

function mapGeneralInfo(item: Record<string, unknown>): INpdRequestGeneralInfo {
  const workflowJson = String(item[FIELDS.WorkFlowJSON] ?? "");

  return {
    Id: Number(item.Id),
    Title: String(item[FIELDS.Title] ?? ""),
    Brand: String(item[FIELDS.Brand] ?? ""),
    MaterialType: String(item[FIELDS.MaterialType] ?? ""),
    Plant: String(item[FIELDS.Plant] ?? ""),
    Status: String(item[FIELDS.Status] ?? ""),
    IsDeleted: Boolean(item[SOFT_DELETE_FIELD]),
    WorkFlowJSON: workflowJson,
    WorkflowSteps: parseWorkflowJson(item[FIELDS.WorkFlowJSON] ?? workflowJson),
    AuthorEmail: getAuthorEmail(item),
    AuthorTitle: getAuthorTitle(item),
    InitiatorEmail: getInitiatorEmail(item),
    InitiatorId: getInitiatorId(item),
    Created: String(item.Created ?? ""),
    Modified: String(item.Modified ?? item.Created ?? ""),
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
): Record<string, unknown> {
  return {
    [FIELDS.Title]: title,
    [FIELDS.Brand]: payload.brand.trim(),
    [FIELDS.MaterialType]: payload.materialType.trim(),
    [FIELDS.Plant]: (payload.plantSource || "").trim(),
    [FIELDS.Status]: status,
    [FIELDS.WorkFlowJSON]: workflowJson,
  };
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

/**
 * Writes the Item Details JSON backup unless a larger recovery file is already
 * attached. A partial Draft (only the rows saved before a network drop) must
 * not replace that file.
 */
async function writeItemDetailsBackupIfNotSmaller(
  requestId: number,
  formItems: INpdItemDetailRecord[],
): Promise<void> {
  if (!(requestId > 0)) {
    return;
  }

  const existing = await tryLoadNpdItemDetailsBackup(requestId).catch(
    () => null,
  );
  if (existing && existing.length > formItems.length) {
    return;
  }

  await upsertNpdItemDetailsBackupAttachment(requestId, formItems);
}

async function persistHeaderAndItems(
  payload: INpdDraftSavePayload,
  workflowJson: string,
  status: string,
  title: string,
  items: INpdItemDetailRecord[],
  initiatorEmail: string,
  initiatorUserId?: number,
  itemSave?: {
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
  },
): Promise<INpdRequestGeneralInfo> {
  const isNewRequest = !(payload.id && payload.id > 0);
  const requestId = await upsertNpdRequestHeader(
    payload,
    workflowJson,
    status,
    title,
    initiatorEmail,
    initiatorUserId,
  );

  const requestTitle =
    (title || "").trim() ||
    (payload.existingTitle || "").trim() ||
    String(requestId);
  itemSave?.onDraftRetained?.({ requestId, requestTitle });

  const backupItems = itemSave?.backupItems ?? items;
  // Backup before Item Details writes. Do not replace a larger recovery file
  // with the shorter set currently shown on a partial Draft.
  await writeItemDetailsBackupIfNotSmaller(requestId, backupItems);

  try {
    await saveNpdItemDetailsBatch(requestId, items, {
      isNewRequest,
      partial: Boolean(itemSave?.partial),
      deletedSharePointIds: itemSave?.deletedSharePointIds,
    });
  } catch (error) {
    const wrapped =
      error instanceof Error ? error : new Error(String(error));
    const draftMeta = wrapped as Error & {
      npdDraftRequestId?: number;
      npdDraftRequestTitle?: string;
    };
    draftMeta.npdDraftRequestId = requestId;
    draftMeta.npdDraftRequestTitle = requestTitle;
    throw wrapped;
  }

  return fetchNpdGeneralInfoById(requestId);
}

async function upsertNpdRequestHeader(
  payload: INpdDraftSavePayload,
  workflowJson: string,
  status: string,
  title: string,
  initiatorEmail: string,
  initiatorUserId?: number,
): Promise<number> {
  const requestJson = buildItemPayload(payload, workflowJson, status, title);
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
  itemSave?: {
    partial?: boolean;
    deletedSharePointIds?: number[];
    backupItems?: INpdItemDetailRecord[];
    onDraftRetained?: (draft: {
      requestId: number;
      requestTitle: string;
    }) => void;
  },
): Promise<INpdRequestGeneralInfo> {
  const isExisting = Boolean(payload.id && payload.id > 0);
  let workflowJson = "";

  // Existing Draft/Rework: keep WorkFlowJSON — skip ApproversMaster rebuild.
  if (isExisting && payload.id) {
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
    },
  );
}

export async function submitNpdRequest(
  payload: INpdDraftSavePayload,
  items: INpdItemDetailRecord[],
  initiatorEmail: string,
  contextSiteUrl?: string,
  initiatorComments?: string,
  initiatorUserId?: number,
  onDraftRetained?: (draft: { requestId: number; requestTitle: string }) => void,
  /** Full Item Details grid for JSON backup (all rows, including already-saved). */
  backupItems?: INpdItemDetailRecord[],
): Promise<INpdRequestGeneralInfo> {
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
    throw new Error("Vertical Head is not configured for this brand.");
  }

  const isResubmit = isNpdRequestIdTitle(payload.existingTitle || "");
  // Material Master duplicate check runs once in the Initiator UI before Submit.
  // Do not repeat the SharePoint lookup here.

  const workflowJson = stringifyWorkflowJson(workflowSteps);
  const requestIdTitle =
    payload.existingTitle && isNpdRequestIdTitle(payload.existingTitle)
      ? payload.existingTitle.trim()
      : await generateNextNpdRequestId();

  // Hold as Draft/Rework while Item Details save. Never Pending until items finish.
  let holdingStatus: string = RequestStatus.Draft;
  if (payload.id && payload.id > 0) {
    if (isResubmit) {
      // Resubmit: use in-memory status — skip an extra NPD_Request read.
      const currentLower = (payload.existingStatus || "").trim().toLowerCase();
      if (
        currentLower === RequestStatus.Rework.toLowerCase() ||
        currentLower === "in rework"
      ) {
        holdingStatus = RequestStatus.Rework;
      } else {
        holdingStatus = RequestStatus.Draft;
      }
    } else {
      try {
        const existing = await fetchNpdGeneralInfoById(payload.id);
        const current = (existing.Status || "").trim();
        const currentLower = current.toLowerCase();
        if (
          currentLower === RequestStatus.Rework.toLowerCase() ||
          currentLower === "in rework"
        ) {
          holdingStatus = RequestStatus.Rework;
        } else if (currentLower === RequestStatus.Draft.toLowerCase()) {
          holdingStatus = RequestStatus.Draft;
        }
      } catch {
        holdingStatus = RequestStatus.Draft;
      }
    }
  }

  const isNewRequest = !(payload.id && payload.id > 0);
  let requestId = 0;

  try {
    // Phase 1: header as Draft/Rework (not Pending).
    requestId = await upsertNpdRequestHeader(
      payload,
      workflowJson,
      holdingStatus,
      requestIdTitle,
      initiatorEmail,
      initiatorUserId,
    );
    // Bind immediately so an offline race still knows which Draft to reopen.
    onDraftRetained?.({
      requestId,
      requestTitle: requestIdTitle,
    });

    const formBackup =
      backupItems && backupItems.length ? backupItems : items;
    let rowsToInsert = items;

    if (isResubmit) {
      // Resubmit is the only time missing JSON rows are inserted.
      // The open form shows only rows already in NPD_ItemDetails.
      const existingBackup = await tryLoadNpdItemDetailsBackup(requestId);
      if (existingBackup?.length) {
        const savedOnForm = formBackup.filter((row) => row.sharePointId > 0);
        const seen = new Set(
          items
            .map((row) => buildNpdItemDetailsMatchKey(row))
            .filter(Boolean),
        );
        const missing = mergeNpdItemDetailsWithBackup(
          savedOnForm,
          existingBackup,
        ).filter((row) => {
          if (row.sharePointId > 0) {
            return false;
          }
          const key = buildNpdItemDetailsMatchKey(row);
          if (key && seen.has(key)) {
            return false;
          }
          if (key) {
            seen.add(key);
          }
          return true;
        });
        rowsToInsert = [...items, ...missing];
      } else {
        await upsertNpdItemDetailsBackupAttachment(requestId, formBackup);
      }
    } else {
      // First Submit: attach the full grid before row inserts.
      await upsertNpdItemDetailsBackupAttachment(requestId, formBackup);
    }
    stopIfOffline();

    // Phase 2: Item Details before Pending.
    // Resubmit: insert newly added rows plus JSON rows not yet stored.
    const shouldAbortSubmit = (): boolean =>
      isNpdSubmitCancelled(submitToken) || !isBrowserOnline();

    if (isResubmit) {
      await saveNpdItemDetailsBatch(requestId, rowsToInsert, {
        partial: true,
        shouldAbort: shouldAbortSubmit,
      });
    } else {
      await saveNpdItemDetailsBatch(requestId, rowsToInsert, {
        isNewRequest,
        shouldAbort: shouldAbortSubmit,
      });
    }
    stopIfOffline();

    // Promote to Pending only while still online. A dropped connection keeps
    // Draft/Rework and must not notify the Vertical Head.
    if (!isBrowserOnline() || isNpdSubmitCancelled(submitToken)) {
      throw new Error(NETWORK_OFFLINE_MESSAGE);
    }

    // Phase 3: promote to Pending only after full item persist.
    await SPServices.SPUpdateItem({
      Listname: LIST_NAME(),
      ID: requestId,
      RequestJSON: {
        [FIELDS.Status]: RequestStatus.Pending,
        [FIELDS.Title]: requestIdTitle,
        [FIELDS.WorkFlowJSON]: workflowJson,
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
        requestTitle: requestIdTitle,
      });
      const wrapped =
        error instanceof Error ? error : new Error(String(error));
      const draftMeta = wrapped as Error & {
        npdDraftRequestId?: number;
        npdDraftRequestTitle?: string;
      };
      draftMeta.npdDraftRequestId = requestId;
      draftMeta.npdDraftRequestTitle = requestIdTitle;
      throw wrapped;
    }
    throw error;
  }

  // Prefer a fresh header read so approval email gets Submitted Date (Created).
  // Resubmit still avoids depending on in-memory blanks when the read fails.
  let saved: INpdRequestGeneralInfo;
  try {
    saved = await fetchNpdGeneralInfoById(requestId);
  } catch {
    if (!isResubmit) {
      throw new Error("The request was submitted but could not be reloaded.");
    }
    saved = {
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
      Created: new Date().toISOString(),
      Modified: new Date().toISOString(),
      PlantCode: "",
      StorageLocation: "",
      ProfitCenter: "",
      MRPGroup: "",
      MRPController: "",
      ValuationClass: "",
      ClassType: "",
      MaterialExtension: "",
    };
  }

  const auditAction = isResubmit ? "Resubmit" : "Initiated";
  const auditComments =
    (initiatorComments || "").trim() ||
    (isResubmit ? "Request resubmitted" : "Request initiated");

  try {
    const userIds = await resolveApproverUserIds(0, initiatorEmail);
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
      siteUrl: contextSiteUrl,
    });
  } catch {
    // Persist succeeded; notification failure must not roll back the request.
  }

  return saved;
}

export async function fetchActiveNpdRequests(): Promise<INpdRequestGeneralInfo[]> {
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
  /** MIS Coordinator Other Details — persisted on Approve / Rework / Reject. */
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
   * MIS Post to SAP progress: report after each successful SAP API call
   * (including 0/total at loop start); finish when the SAP batch ends.
   */
  sapProgress?: {
    onProgress?: (posted: number, total: number) => void;
    onFinish?: (success: boolean) => void;
  };
}): Promise<INpdRequestGeneralInfo> {
  const request = await fetchNpdGeneralInfoById(params.requestId);
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
    throw new Error("You do not have a pending approval action on this request.");
  }

  const canAct =
    userCanActOnPendingWorkflow(
      request.WorkflowSteps,
      params.actorEmail,
      params.access.assignedRoles,
    ) && canActOnPendingNpdStep(params.access, request.Brand, actorRole);

  if (!canAct) {
    throw new Error("You do not have a pending approval action on this request.");
  }

  const isMisPostToSap =
    params.action === "Approve" && isMisCoordinatorWorkflowRole(actorRole);
  const isVerticalHeadActor = isVerticalHeadWorkflowRole(actorRole);
  const isMisReject =
    params.action === "Reject" && isMisCoordinatorWorkflowRole(actorRole);
  const isMisRework =
    params.action === "Rework" && isMisCoordinatorWorkflowRole(actorRole);

  // VH (any action) and MIS Reject: status/workflow only — never touch Item Details.
  const itemsToPersist =
    isVerticalHeadActor || isMisReject ? undefined : params.items;
  const itemSavePartial =
    Boolean(params.itemSavePartial) || isMisRework;

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

  // Final MIS Post to SAP: save items, send each unposted line to SAP,
  // then add only the successful lines to Material Master. Approve only if every line succeeds.
  let itemsAlreadySaved = false;
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
      await postNpdItemsToSap({
        requestId: params.requestId,
        brand: request.Brand,
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

  if (params.otherDetails) {
    Object.assign(updatePayload, buildOtherDetailsUpdatePayload(params.otherDetails));
  }

  try {
    await SPServices.SPUpdateItem({
      Listname: LIST_NAME(),
      ID: params.requestId,
      RequestJSON: updatePayload,
    });
  } catch (updateError) {
    // Status / workflow must still persist even if Other Details columns fail.
    if (params.otherDetails) {
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
    WorkflowSteps: updatedSteps,
  };

  if (itemsToPersist && !itemsAlreadySaved) {
    try {
      await saveNpdItemDetailsBatch(params.requestId, itemsToPersist, {
        partial: itemSavePartial,
        deletedSharePointIds: params.deletedItemIds,
      });
    } catch (itemsError) {
      console.warn(
        "NPD Item Details save failed after workflow status update:",
        itemsError,
      );
    }
  }

  let saved = committedFallback;
  try {
    saved = await fetchNpdGeneralInfoById(params.requestId);
  } catch (fetchError) {
    console.warn(
      "NPD Request updated but reload after workflow action failed:",
      fetchError,
    );
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

    const nextPendingRole = getFirstPendingApproverRole(saved.WorkflowSteps);
    const isFinalApproval =
      params.action === "Approve" && !nextPendingRole;

    let recipients: string[];
    let recipientRole: string;
    let notificationAction: string = params.action;
    let includeActionButtons = false;

    if (params.action === "Approve") {
      if (isFinalApproval) {
        recipients = [getNpdRequestOwnerEmail(saved)];
        recipientRole = Config.Roles.Initiator;
        notificationAction = "Approved";
        includeActionButtons = false;
      } else {
        recipients = getPendingApproverEmails(saved.WorkflowSteps);
        recipientRole = nextPendingRole;
        includeActionButtons = shouldIncludeNpdEmailActions(nextPendingRole);
      }
    } else {
      recipients = [getNpdRequestOwnerEmail(saved)];
      recipientRole = Config.Roles.Initiator;
    }

    try {
      await sendNpdApprovalNotification({
        request: saved,
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
): Promise<INpdRequestGeneralInfo> {
  let item: unknown;
  try {
    item = await SPServices.SPReadItemUsingId({
      Listname: LIST_NAME(),
      SelectedId: id,
      Select: SELECT_FIELDS,
      Expand: EXPAND_FIELDS,
    });
  } catch {
    item = await SPServices.SPReadItemUsingId({
      Listname: LIST_NAME(),
      SelectedId: id,
      Select: SELECT_FIELDS_CORE,
      Expand: "Author",
    });
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
