import { Config, RequestStatus } from "./Config";
import type {
  INpdDraftSavePayload,
  INpdItemDetailRecord,
  INpdRequestGeneralInfo,
  IResolvedUserAccess,
  NpdWorkflowAction,
} from "./Interface";
import { addNpdApproverComment, resolveApproverUserIds } from "./npdApproverCommentsService";
import { saveNpdItemDetailsBatch } from "./npdItemDetailsService";
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
  hasCompletedWorkflowStep,
  parseWorkflowJson,
  resolveActorWorkflowRole,
  resolveRequestStatusAfterAction,
  stringifyWorkflowJson,
  userCanActOnPendingWorkflow,
} from "./npdWorkflowJsonService";
import { canActOnPendingNpdStep } from "./permissionService";
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

const SELECT_FIELDS =
  "Id,Title,Brand,MaterialType,Plant,Status,IsDeleted,WorkFlowJSON,Created,Modified,Author/Id,Author/Title,Author/EMail";
const EXPAND_FIELDS = "Author";

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
    Created: String(item.Created ?? ""),
    Modified: String(item.Modified ?? item.Created ?? ""),
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

function resolveSavedStatus(existingStatus?: string | null): string {
  if (existingStatus && isDraftOrReworkStatus(existingStatus)) {
    return existingStatus.trim();
  }

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
    [FIELDS.Plant]: payload.plantSource.trim(),
    [FIELDS.Status]: status,
    [FIELDS.WorkFlowJSON]: workflowJson,
  };
}

async function persistHeaderAndItems(
  payload: INpdDraftSavePayload,
  workflowJson: string,
  status: string,
  title: string,
  items: INpdItemDetailRecord[],
): Promise<INpdRequestGeneralInfo> {
  const requestJson = buildItemPayload(payload, workflowJson, status, title);
  const isNewRequest = !(payload.id && payload.id > 0);
  let requestId = payload.id && payload.id > 0 ? payload.id : 0;

  if (requestId) {
    await SPServices.SPUpdateItem({
      Listname: LIST_NAME(),
      ID: requestId,
      RequestJSON: requestJson,
    });
  } else {
    const created = await SPServices.SPAddItem({
      Listname: LIST_NAME(),
      RequestJSON: {
        ...requestJson,
        ...getActiveRecordCreatePayload(),
      },
    });
    requestId = getAddedItemId(created);
    if (!requestId) {
      throw new Error("The request was saved but its SharePoint ID could not be read.");
    }
  }

  await saveNpdItemDetailsBatch(requestId, items, isNewRequest);
  return fetchNpdGeneralInfoById(requestId);
}

export async function saveNpdGeneralInfoDraft(
  payload: INpdDraftSavePayload,
  items: INpdItemDetailRecord[],
  initiatorEmail: string,
  contextSiteUrl?: string,
): Promise<INpdRequestGeneralInfo> {
  const workflowSteps = await buildNpdDraftWorkflowJson(
    payload.brand.trim(),
    initiatorEmail,
    contextSiteUrl,
  );
  const workflowJson = stringifyWorkflowJson(workflowSteps);
  const status = resolveSavedStatus(payload.existingStatus);
  const title =
    payload.existingTitle && isNpdRequestIdTitle(payload.existingTitle)
      ? payload.existingTitle.trim()
      : payload.brand.trim();

  return persistHeaderAndItems(payload, workflowJson, status, title, items);
}

export async function submitNpdRequest(
  payload: INpdDraftSavePayload,
  items: INpdItemDetailRecord[],
  initiatorEmail: string,
  contextSiteUrl?: string,
): Promise<INpdRequestGeneralInfo> {
  const workflowSteps = applySubmitWorkflowStatuses(
    await buildNpdDraftWorkflowJson(
      payload.brand.trim(),
      initiatorEmail,
      contextSiteUrl,
    ),
  );
  const workflowJson = stringifyWorkflowJson(workflowSteps);
  const requestIdTitle =
    payload.existingTitle && isNpdRequestIdTitle(payload.existingTitle)
      ? payload.existingTitle.trim()
      : await generateNextNpdRequestId();

  const saved = await persistHeaderAndItems(
    payload,
    workflowJson,
    RequestStatus.Pending,
    requestIdTitle,
    items,
  );

  const pendingEmails = getPendingApproverEmails(saved.WorkflowSteps);
  const pendingRole = getFirstPendingApproverRole(saved.WorkflowSteps);

  try {
    await sendNpdApprovalNotification({
      request: saved,
      action: "Submitted",
      to: pendingEmails,
      includeActionButtons: shouldIncludeNpdEmailActions(pendingRole),
    });
  } catch {
    // Persist succeeded; notification failure must not roll back the request.
  }

  return saved;
}

export async function fetchActiveNpdRequests(): Promise<INpdRequestGeneralInfo[]> {
  const rows = (await SPServices.SPReadItems({
    Listname: LIST_NAME(),
    Select: SELECT_FIELDS,
    Expand: EXPAND_FIELDS,
    Filter: getActiveRecordFilters(),
    Orderby: "Modified",
    Orderbydecorasc: false,
    Topcount: 5000,
  })) as Record<string, unknown>[];

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
}): Promise<INpdRequestGeneralInfo> {
  const request = await fetchNpdGeneralInfoById(params.requestId);
  const actorRole =
    resolveActorWorkflowRole(
      request.WorkflowSteps,
      params.actorEmail,
      params.access.assignedRoles,
    ) || params.actorRole;

  if (hasCompletedWorkflowStep(request.WorkflowSteps, params.actorEmail)) {
    return request;
  }

  const canAct =
    userCanActOnPendingWorkflow(
      request.WorkflowSteps,
      params.actorEmail,
      params.access.assignedRoles,
    ) && canActOnPendingNpdStep(params.access, request.Brand, actorRole);

  if (!canAct) {
    if (!getFirstPendingApproverRole(request.WorkflowSteps)) {
      return request;
    }

    throw new Error("You do not have a pending approval action on this request.");
  }

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

  await SPServices.SPUpdateItem({
    Listname: LIST_NAME(),
    ID: params.requestId,
    RequestJSON: {
      [FIELDS.Status]: headerStatus,
      [FIELDS.WorkFlowJSON]: stringifyWorkflowJson(updatedSteps),
    },
  });

  if (params.items) {
    await saveNpdItemDetailsBatch(params.requestId, params.items);
  }

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
  });

  const saved = await fetchNpdGeneralInfoById(params.requestId);
  const nextPendingRole = getFirstPendingApproverRole(saved.WorkflowSteps);
  const recipients =
    params.action === "Approve"
      ? getPendingApproverEmails(saved.WorkflowSteps)
      : [saved.AuthorEmail];

  try {
    await sendNpdApprovalNotification({
      request: saved,
      action: params.action,
      comments: params.comments,
      role: actorRole,
      to: recipients,
      includeActionButtons:
        params.action === "Approve" &&
        shouldIncludeNpdEmailActions(nextPendingRole),
    });
  } catch {
    // Action already persisted.
  }

  return saved;
}

export async function fetchNpdGeneralInfoById(
  id: number,
): Promise<INpdRequestGeneralInfo> {
  const item = (await SPServices.SPReadItemUsingId({
    Listname: LIST_NAME(),
    SelectedId: id,
    Select: SELECT_FIELDS,
    Expand: EXPAND_FIELDS,
  })) as unknown;

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
    .filter((item) => normalizeEmail(item.AuthorEmail) === loginEmail);
}

export async function softDeleteNpdRequest(id: number): Promise<void> {
  await SPServices.SPUpdateItem({
    Listname: LIST_NAME(),
    ID: id,
    RequestJSON: getSoftDeletePayload(),
  });
}
