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
  parseWorkflowJson,
  resolveActorWorkflowRole,
  resolveRequestStatusAfterAction,
  stringifyWorkflowJson,
  userCanActOnPendingWorkflow,
} from "./npdWorkflowJsonService";
import { canActOnPendingNpdStep } from "./permissionService";
import { validateItemsAgainstMaterialMaster } from "./materialMasterService";
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

async function persistHeaderAndItems(
  payload: INpdDraftSavePayload,
  workflowJson: string,
  status: string,
  title: string,
  items: INpdItemDetailRecord[],
  initiatorEmail: string,
  initiatorUserId?: number,
): Promise<INpdRequestGeneralInfo> {
  const requestJson = buildItemPayload(payload, workflowJson, status, title);
  const initiatorId = await resolveInitiatorSiteUserId(
    initiatorEmail,
    initiatorUserId,
  );
  if (initiatorId > 0) {
    requestJson[FIELDS.InitiatorId] = initiatorId;
  }

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
  initiatorUserId?: number,
): Promise<INpdRequestGeneralInfo> {
  const workflowSteps = await buildNpdDraftWorkflowJson(
    payload.brand.trim(),
    initiatorEmail,
    contextSiteUrl,
    { enforceApprovers: false },
  );
  const workflowJson = stringifyWorkflowJson(workflowSteps);
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
  );
}

export async function submitNpdRequest(
  payload: INpdDraftSavePayload,
  items: INpdItemDetailRecord[],
  initiatorEmail: string,
  contextSiteUrl?: string,
  initiatorComments?: string,
  initiatorUserId?: number,
): Promise<INpdRequestGeneralInfo> {
  const materialMasterDuplicates = await validateItemsAgainstMaterialMaster(items);
  if (materialMasterDuplicates.length) {
    throw new Error(materialMasterDuplicates[0]);
  }

  const workflowSteps = applySubmitWorkflowStatuses(
    await buildNpdDraftWorkflowJson(
      payload.brand.trim(),
      initiatorEmail,
      contextSiteUrl,
      { enforceApprovers: true },
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
    initiatorEmail,
    initiatorUserId,
  );

  // Resubmit when the request already has an NPD Request ID (Rework or Draft-after-Rework).
  const isResubmit = isNpdRequestIdTitle(payload.existingTitle || "");
  const auditAction = isResubmit ? "Resubmit" : "Initiated";
  const auditComments =
    (initiatorComments || "").trim() ||
    (isResubmit ? "Request resubmitted" : "Request initiated");

  try {
    const userIds = await resolveApproverUserIds(
      0,
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
  if (isMisPostToSap) {
    const itemsForCheck =
      params.items && params.items.length ? params.items : [];
    if (!itemsForCheck.length) {
      throw new Error("Item Details are required before posting to SAP.");
    }
    const materialMasterDuplicates = await validateItemsAgainstMaterialMaster(
      itemsForCheck,
      { excludeRequestId: params.requestId },
    );
    if (materialMasterDuplicates.length) {
      throw new Error(materialMasterDuplicates[0]);
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
    await postNpdItemsToSap({
      requestId: params.requestId,
      brand: request.Brand,
      materialType: request.MaterialType,
      plant: request.Plant,
      otherDetails,
      items: storedItems,
      siteUrl: params.siteUrl,
    });
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

  if (params.items && !itemsAlreadySaved) {
    try {
      await saveNpdItemDetailsBatch(params.requestId, params.items);
    } catch (itemsError) {
      console.warn(
        "NPD Item Details save failed after workflow status update:",
        itemsError,
      );
    }
  }

  const userIds = await resolveApproverUserIds(
    params.actorUserId,
    params.actorEmail,
  );

  try {
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

  const saved = await fetchNpdGeneralInfoById(params.requestId);
  const nextPendingRole = getFirstPendingApproverRole(saved.WorkflowSteps);
  const isFinalApproval =
    params.action === "Approve" && !nextPendingRole;

  let recipients: string[];
  let recipientRole: string;
  let notificationAction: string = params.action;
  let includeActionButtons = false;

  if (params.action === "Approve") {
    if (isFinalApproval) {
      // Last approver in WorkflowConfiguration chain completed the request.
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
