import {
  ApproverSystems,
  Config,
  NpdFormFrom,
  RequestStatus,
} from "../../../../../External/CommonServices/Config";
import type {
  INpdItemDetailRecord,
  INpdRequestListItemRow,
  INpdWorkflowStepJson,
  IResolvedUserAccess,
  NpdWorkflowAction,
} from "../../../../../External/CommonServices/Interface";
import {
  canActOnPendingNpdStep,
  hasPermission,
  hasSystemRole,
} from "../../../../../External/CommonServices/permissionService";
import { normalizeEmail } from "../../../../../External/CommonServices/personFieldUtils";
import {
  getFirstPendingApproverRole,
  isMisCoordinatorWorkflowRole,
  isVerticalHeadWorkflowRole,
  userCanActOnPendingWorkflow,
} from "../../../../../External/CommonServices/npdWorkflowJsonService";
import {
  isEmptyItemDetailRow,
  toNpdItemDetailRecord,
} from "./npdItemDetailsConfig";
import type { INpdItemDetailRow } from "./npdItemDetails.types";
import type { NpdRequestFooterMode } from "./NpdRequestFormFooter";

export function parseEditId(value: string | null): number {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

export function parseNpdWorkflowAction(
  value: string | null,
): NpdWorkflowAction | null {
  if (value === "Approve" || value === "Reject" || value === "Rework") {
    return value;
  }
  return null;
}

export function isNpdFormViewMode(
  mode: string | null,
  emailAction: NpdWorkflowAction | null,
  hasRequestId: boolean,
): boolean {
  if (!hasRequestId || emailAction) {
    return false;
  }

  return (mode ?? "").trim().toLowerCase() !== Config.NpdFormQuery.Edit;
}

export function buildNpdRequestFormPath(
  requestId: number,
  mode: "view" | "edit",
  sourcePath?: string,
): string {
  const params = new URLSearchParams();
  params.set("id", String(requestId));
  params.set(Config.NpdFormQuery.Mode, mode);
  const from = toNpdFormFromKey(sourcePath);
  if (from) {
    params.set(Config.NpdFormQuery.From, from);
  }
  return `${Config.Routes.NpdNew}?${params.toString()}`;
}

const NPD_FORM_ROUTE_BY_FROM: Record<string, string> = {
  [NpdFormFrom.All]: Config.Routes.NpdAll,
  [NpdFormFrom.Pending]: Config.Routes.NpdPending,
  [NpdFormFrom.Approved]: Config.Routes.NpdApproved,
  [NpdFormFrom.DraftRework]: Config.Routes.NpdDraftRework,
};

const NPD_FORM_FROM_BY_ROUTE: Record<string, string> = {
  [Config.Routes.NpdAll]: NpdFormFrom.All,
  [Config.Routes.NpdPending]: NpdFormFrom.Pending,
  [Config.Routes.NpdApproved]: NpdFormFrom.Approved,
  [Config.Routes.NpdDraftRework]: NpdFormFrom.DraftRework,
};

function toNpdFormFromKey(path?: string | null): string | null {
  const normalized = (path ?? "").trim();
  if (NPD_FORM_ROUTE_BY_FROM[normalized]) {
    return normalized;
  }
  return NPD_FORM_FROM_BY_ROUTE[normalized] ?? null;
}

function resolveAllowedNpdReturnRoute(path?: string | null): string | null {
  const fromKey = toNpdFormFromKey(path);
  return fromKey ? NPD_FORM_ROUTE_BY_FROM[fromKey] ?? null : null;
}

export function isDraftOrReworkStatus(status: string | null): boolean {
  const normalized = (status ?? "").trim().toLowerCase();
  return (
    normalized === RequestStatus.Draft.toLowerCase() ||
    normalized === RequestStatus.Rework.toLowerCase() ||
    normalized === "in rework"
  );
}

export function toPersistableItemRecords(
  rows: INpdItemDetailRow[],
): INpdItemDetailRecord[] {
  return rows.filter((row) => !isEmptyItemDetailRow(row)).map(toNpdItemDetailRecord);
}

export function canEditNpdListRow(
  row: Pick<INpdRequestListItemRow, "Status" | "Brand" | "AuthorEmail" | "WorkflowSteps">,
  access: IResolvedUserAccess,
  currentUserEmail: string,
): boolean {
  if (isDraftOrReworkStatus(row.Status)) {
    return (
      hasSystemRole(
        access,
        Config.Roles.Initiator,
        ApproverSystems.NewProductDevelopment,
      ) &&
      normalizeEmail(row.AuthorEmail) === normalizeEmail(currentUserEmail)
    );
  }

  if (row.Status.trim().toLowerCase() !== RequestStatus.Pending.toLowerCase()) {
    return false;
  }

  const pendingRole = getFirstPendingApproverRole(row.WorkflowSteps);
  return (
    userCanActOnPendingWorkflow(
      row.WorkflowSteps,
      currentUserEmail,
      access.assignedRoles,
    ) && canActOnPendingNpdStep(access, row.Brand, pendingRole)
  );
}

export function resolveNpdFooterMode(params: {
  requestId: number | null;
  requestStatus: string | null;
  actorEmail: string;
  workflowSteps: INpdWorkflowStepJson[];
  canEditDraft: boolean;
  assignedRoles: readonly string[];
  canActOnPendingStep: boolean;
  pendingRole: string;
  isViewMode: boolean;
}): NpdRequestFooterMode {
  if (params.requestId && params.isViewMode) {
    return "read-only";
  }

  if (
    params.canEditDraft &&
    (!params.requestStatus || isDraftOrReworkStatus(params.requestStatus))
  ) {
    return "initiator-edit";
  }

  const canAct =
    Boolean(params.requestId) &&
    params.canActOnPendingStep &&
    userCanActOnPendingWorkflow(
      params.workflowSteps,
      params.actorEmail,
      params.assignedRoles,
    );

  if (!canAct) {
    return "read-only";
  }

  if (isVerticalHeadWorkflowRole(params.pendingRole)) {
    return "vertical-head-pending";
  }

  if (isMisCoordinatorWorkflowRole(params.pendingRole)) {
    return "mis-pending";
  }

  return "read-only";
}

export function canEditNpdItemDetails(params: {
  footerMode: NpdRequestFooterMode;
  pendingRole: string;
  assignedRoles: string[];
}): boolean {
  if (params.footerMode === "initiator-edit") {
    return true;
  }

  if (params.footerMode !== "mis-pending") {
    return false;
  }

  return (
    isMisCoordinatorWorkflowRole(params.pendingRole) ||
    hasPermission(params.assignedRoles, "npd.editItemDetailsPending")
  );
}

export function resolveNpdFormCancelRoute(fromPath?: string | null): string {
  return resolveAllowedNpdReturnRoute(fromPath) ?? Config.Routes.NpdAll;
}

export function firstValidationMessage(messages: string[]): string | null {
  const message = messages.find((entry) => Boolean(entry.trim()));
  return message ?? null;
}

export function formatNpdLineItemProgress(current: number, total: number): string {
  return `${current} / ${total} ${Config.FieldLabels.LineItemsAdded}`;
}

export interface INpdSubmitProgress {
  current: number;
  total: number;
  percent: number;
}

export function defaultEmailActionComments(action: NpdWorkflowAction): string {
  if (action === "Approve") {
    return "Approved";
  }
  if (action === "Reject") {
    return "Rejected from email";
  }
  return "Rework requested from email";
}

export function workflowActionRequiresComments(
  action: NpdWorkflowAction,
): boolean {
  return action === "Rework" || action === "Reject";
}
