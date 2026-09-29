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
import { buildNavHref } from "../../../../../External/CommonServices/navigationConfig";
import {
  canActOnPendingNpdStep,
  hasPermission,
  hasSystemRole,
  parseViewAsRole,
} from "../../../../../External/CommonServices/permissionService";
import { normalizeEmail } from "../../../../../External/CommonServices/personFieldUtils";
import { getNpdRequestOwnerEmail } from "../../../../../External/CommonServices/npdRequestGeneralInfoService";
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
  viewAs?: string | null,
): string {
  const params = new URLSearchParams();
  params.set("id", String(requestId));
  params.set(Config.NpdFormQuery.Mode, mode);
  const from = toNpdFormFromKey(sourcePath);
  if (from) {
    params.set(Config.NpdFormQuery.From, from);
  }
  const role = (viewAs || "").trim();
  if (role) {
    params.set(Config.NpdFormQuery.ViewAs, role);
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

/** Draft-only: blank placeholder lines may be omitted. Submit must not use this. */
export function toPersistableItemRecords(
  rows: INpdItemDetailRow[],
): INpdItemDetailRecord[] {
  return rows.filter((row) => !isEmptyItemDetailRow(row)).map(toNpdItemDetailRecord);
}

export function canEditNpdListRow(
  row: Pick<
    INpdRequestListItemRow,
    "Status" | "Brand" | "AuthorEmail" | "WorkflowSteps"
  > & { InitiatorEmail?: string },
  access: IResolvedUserAccess,
  currentUserEmail: string,
  viewAs?: string | null,
): boolean {
  const viewRole = parseViewAsRole(viewAs);

  if (viewRole === Config.Roles.Admin) {
    return false;
  }

  if (isDraftOrReworkStatus(row.Status)) {
    if (viewRole && viewRole !== Config.Roles.Initiator) {
      return false;
    }
    return (
      hasSystemRole(
        access,
        Config.Roles.Initiator,
        ApproverSystems.NewProductDevelopment,
      ) &&
      normalizeEmail(getNpdRequestOwnerEmail(row)) ===
        normalizeEmail(currentUserEmail)
    );
  }

  if (row.Status.trim().toLowerCase() !== RequestStatus.Pending.toLowerCase()) {
    return false;
  }

  const pendingRole = getFirstPendingApproverRole(row.WorkflowSteps);
  const canAct =
    userCanActOnPendingWorkflow(
      row.WorkflowSteps,
      currentUserEmail,
      access.assignedRoles,
    ) && canActOnPendingNpdStep(access, row.Brand, pendingRole);

  if (!canAct) {
    return false;
  }

  if (viewRole === Config.Roles.Initiator) {
    return false;
  }

  if (viewRole === Config.Roles.VerticalHead) {
    return (
      pendingRole.trim().toLowerCase() ===
      Config.Roles.VerticalHead.toLowerCase()
    );
  }

  if (viewRole === Config.Roles.MisCoordinator) {
    return (
      pendingRole.trim().toLowerCase() ===
      Config.Roles.MisCoordinator.toLowerCase()
    );
  }

  return true;
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

/**
 * Other Details visibility:
 * - After Approved/Completed: all modules (Initiator, VH, MIS).
 * - Before that: only the MIS Coordinator module (`?as=MIS Coordinator`), never VH/Initiator.
 * Dual-role users must not see Other Details while browsing as Vertical Head.
 */
export function shouldShowNpdOtherDetails(params: {
  hasRequest: boolean;
  isRequestApproved: boolean;
  viewAs?: string | null;
  isMisCoordinator: boolean;
  isVerticalHead: boolean;
  hasReachedMis: boolean;
  footerMode: NpdRequestFooterMode;
}): boolean {
  if (!params.hasRequest) {
    return false;
  }

  if (params.isRequestApproved) {
    return true;
  }

  if (!params.hasReachedMis && params.footerMode !== "mis-pending") {
    return false;
  }

  const moduleRole = parseViewAsRole(params.viewAs);
  if (moduleRole) {
    return moduleRole === Config.Roles.MisCoordinator;
  }

  // No `?as=`: allow MIS-only users, or when the form is actively in MIS action mode.
  if (params.footerMode === "mis-pending") {
    return true;
  }

  return params.isMisCoordinator && !params.isVerticalHead;
}

export function resolveNpdFormCancelRoute(
  fromPath?: string | null,
  viewAs?: string | null,
): string {
  const base =
    resolveAllowedNpdReturnRoute(fromPath) ?? Config.Routes.NpdAll;
  return buildNavHref(base, viewAs);
}

export function firstValidationMessage(messages: string[]): string | null {
  const message = messages.find((entry) => Boolean(entry.trim()));
  return message ?? null;
}

export function formatNpdLineItemProgress(current: number, total: number): string {
  const safeTotal = Math.max(total, 1);
  const percent = Math.max(
    0,
    Math.min(100, Math.round((Math.max(current, 0) / safeTotal) * 100)),
  );
  return `${percent}%`;
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
  return action === "Rework" || action === "Reject" || action === "Approve";
}
