import { ApproverSystems, Config, RequestStatus } from "./Config";
import type {
  INpdRequestGeneralInfo,
  INpdRequestListItem,
  INpdWorkflowStepJson,
  IResolvedUserAccess,
} from "./Interface";
import { isNpdRequestIdTitle } from "./npdRequestIdService";
import {
  fetchActiveNpdRequests,
  getNpdRequestOwnerEmail,
  isDraftOrReworkStatus,
} from "./npdRequestGeneralInfoService";
import {
  getFirstPendingApproverRole,
  resolveActorWorkflowRole,
  userCanActOnPendingWorkflow,
} from "./npdWorkflowJsonService";
import { normalizeEmail } from "./personFieldUtils";
import {
  canActOnPendingNpdStep,
  canViewRequest,
  hasSystemRole,
  parseViewAsRole,
} from "./permissionService";
import type { NavViewRole } from "./navigationConfig";

function toListItem(item: INpdRequestGeneralInfo): INpdRequestListItem {
  const projectName = isNpdRequestIdTitle(item.Title)
    ? item.Brand
    : item.Title;

  return {
    ...item,
    ProjectName: projectName.trim(),
    // Products column uses NPD_Request.ItemDetailsCount (no Item Details list fetch).
    ProductCount: Math.max(0, Math.floor(Number(item.ItemDetailsCount) || 0)),
  };
}

/**
 * VH / MIS All Requests must not show Initiator-owned Draft / Rework rows.
 * Also treats workflow-indicated Rework (and blank Status) as Initiator-only so
 * a missing/cleared Status field cannot leave the row visible after Rework.
 */
export function isNpdHiddenFromApproverAllRequests(
  status: string,
  workflowSteps: readonly INpdWorkflowStepJson[] = [],
): boolean {
  const statusLower = (status || "").trim().toLowerCase();
  if (!statusLower) {
    return true;
  }
  if (statusLower === RequestStatus.Draft.toLowerCase()) {
    return true;
  }
  if (
    statusLower === RequestStatus.Rework.toLowerCase() ||
    statusLower === "in rework"
  ) {
    return true;
  }

  const hasReworkStep = workflowSteps.some(
    (step) =>
      (step.Status || "").trim().toLowerCase() ===
      Config.WorkflowStepStatus.Rework.toLowerCase(),
  );
  if (!hasReworkStep) {
    return false;
  }

  return !getFirstPendingApproverRole(workflowSteps).trim();
}

export async function fetchNpdDashboardItems(
  currentUserEmail: string,
  access: IResolvedUserAccess,
  viewRole?: string | NavViewRole | null,
): Promise<INpdRequestListItem[]> {
  const scopedRole = parseViewAsRole(viewRole ?? undefined);
  const requests = await fetchActiveNpdRequests();

  return requests
    .filter((item) => {
      const role = scopedRole;
      // Drafts belong only on Initiator lists (All / Draft-Rework), never Admin / VH / MIS.
      if (
        role &&
        role !== Config.Roles.Initiator &&
        item.Status.trim().toLowerCase() === RequestStatus.Draft.toLowerCase()
      ) {
        return false;
      }
      // Rework (and blank Status / workflow Rework) — Initiator-only for VH / MIS.
      if (
        (role === Config.Roles.VerticalHead ||
          role === Config.Roles.MisCoordinator) &&
        isNpdHiddenFromApproverAllRequests(item.Status, item.WorkflowSteps)
      ) {
        return false;
      }

      return canViewRequest(
        access,
        {
          module: "npd",
          brand: item.Brand,
          createdByEmail: getNpdRequestOwnerEmail(item),
          status: item.Status,
          workflowSteps: item.WorkflowSteps,
        },
        currentUserEmail,
        scopedRole,
      );
    })
    .map(toListItem);
}

export async function fetchNpdPendingItems(
  currentUserEmail: string,
  access: IResolvedUserAccess,
  viewRole?: string | NavViewRole | null,
): Promise<INpdRequestListItem[]> {
  const loginEmail = normalizeEmail(currentUserEmail);
  if (!loginEmail) {
    return [];
  }

  const role = parseViewAsRole(viewRole ?? undefined);
  const requests = await fetchActiveNpdRequests();

  return requests
    .filter((item) => {
      const status = item.Status.trim().toLowerCase();
      if (status !== RequestStatus.Pending.toLowerCase()) {
        return false;
      }

      if (
        !canViewRequest(
          access,
          {
            module: "npd",
            brand: item.Brand,
            createdByEmail: getNpdRequestOwnerEmail(item),
            status: item.Status,
            workflowSteps: item.WorkflowSteps,
          },
          currentUserEmail,
          role,
        )
      ) {
        return false;
      }

      const pendingRole =
        resolveActorWorkflowRole(
          item.WorkflowSteps,
          loginEmail,
          access.assignedRoles,
        ) || getFirstPendingApproverRole(item.WorkflowSteps);
      const canAct =
        userCanActOnPendingWorkflow(
          item.WorkflowSteps,
          loginEmail,
          access.assignedRoles,
        ) && canActOnPendingNpdStep(access, item.Brand, pendingRole);

      if (role === Config.Roles.Initiator) {
        return true;
      }

      if (role === Config.Roles.VerticalHead) {
        return (
          canAct &&
          pendingRole.trim().toLowerCase() ===
            Config.Roles.VerticalHead.toLowerCase()
        );
      }

      if (role === Config.Roles.MisCoordinator) {
        return (
          canAct &&
          pendingRole.trim().toLowerCase() ===
            Config.Roles.MisCoordinator.toLowerCase()
        );
      }

      if (canAct) {
        return true;
      }

      return (
        hasSystemRole(
          access,
          Config.Roles.Initiator,
          ApproverSystems.NewProductDevelopment,
        ) &&
        normalizeEmail(getNpdRequestOwnerEmail(item)) === loginEmail
      );
    })
    .map(toListItem);
}

export async function fetchNpdDraftReworkItems(
  currentUserEmail: string,
  access: IResolvedUserAccess,
  viewRole?: string | NavViewRole | null,
): Promise<INpdRequestListItem[]> {
  const loginEmail = normalizeEmail(currentUserEmail);
  if (!loginEmail) {
    return [];
  }

  const role = parseViewAsRole(viewRole ?? undefined) ?? Config.Roles.Initiator;
  const requests = await fetchActiveNpdRequests();

  return requests
    .filter((item) => isDraftOrReworkStatus(item.Status))
    .filter((item) =>
      canViewRequest(
        access,
        {
          module: "npd",
          brand: item.Brand,
          createdByEmail: getNpdRequestOwnerEmail(item),
          status: item.Status,
          workflowSteps: item.WorkflowSteps,
        },
        currentUserEmail,
        role,
      ),
    )
    .map(toListItem);
}
