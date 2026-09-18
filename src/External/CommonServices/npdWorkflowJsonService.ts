import { Config } from "./Config";
import type {
  INpdWorkflowStepJson,
  IWorkflowConfigStep,
  NpdWorkflowAction,
} from "./Interface";
import {
  fetchNpdApproverAssignmentRows,
  getEmailsForNpdWorkflowRole,
} from "./npdApproverAssignmentService";
import { fetchActiveWorkflowSteps } from "./workflowConfigurationService";
import {
  isNpdRequestType,
  orderWorkflowSteps,
} from "./workflowConfigurationUtils";

export function getNpdApprovalRoleSequence(
  requestType: string = Config.WorkflowRequestTypes.NpdRequest,
  steps: IWorkflowConfigStep[] = [],
): string[] {
  const ordered = orderWorkflowSteps(steps, requestType);
  const roles: string[] = [Config.WorkflowDefaults.NpdStartRole];

  ordered.forEach((step) => {
    const nextRole = step.NextRole.trim();
    if (
      nextRole &&
      !roles.some((role) => role.toLowerCase() === nextRole.toLowerCase())
    ) {
      roles.push(nextRole);
    }
  });

  return roles;
}

export async function buildNpdDraftWorkflowJson(
  brand: string,
  initiatorEmail: string,
  contextSiteUrl?: string,
): Promise<INpdWorkflowStepJson[]> {
  const requestType = Config.WorkflowRequestTypes.NpdRequest;
  const allSteps = await fetchActiveWorkflowSteps();
  const npdSteps = allSteps.filter((step) => isNpdRequestType(step.RequestType));

  if (!npdSteps.length) {
    throw new Error(
      "NPD workflow is not configured. Configure the NPD Request approval chain before saving.",
    );
  }

  const roleSequence = getNpdApprovalRoleSequence(requestType, npdSteps);
  const { rows, userEmailById } =
    await fetchNpdApproverAssignmentRows(contextSiteUrl);
  const initiator = initiatorEmail.trim();
  const steps: INpdWorkflowStepJson[] = [];

  for (const role of roleSequence) {
    if (role.toLowerCase() === Config.Roles.Initiator.toLowerCase()) {
      if (!initiator.includes("@")) {
        throw new Error("The logged-in user email is required to save a draft.");
      }

      steps.push({
        Role: role,
        UserEmail: initiator,
        Status: "",
      });
      continue;
    }

    const emails = getEmailsForNpdWorkflowRole(
      rows,
      userEmailById,
      role,
      brand,
    );
    if (!emails.length) {
      if (role.toLowerCase() === Config.Roles.VerticalHead.toLowerCase()) {
        throw new Error(
          `No Vertical Head is assigned to brand "${brand}" in ApproversMaster.`,
        );
      }

      throw new Error(
        `No users are assigned to role "${role}" in ApproversMaster for this request.`,
      );
    }

    emails.forEach((email) => {
      steps.push({
        Role: role,
        UserEmail: email,
        Status: "",
      });
    });
  }

  return steps;
}

export function stringifyWorkflowJson(steps: INpdWorkflowStepJson[]): string {
  return JSON.stringify(steps);
}

export function parseWorkflowJson(value: unknown): INpdWorkflowStepJson[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(isWorkflowStep);
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isWorkflowStep) : [];
  } catch {
    return [];
  }
}

function isWorkflowStep(value: unknown): value is INpdWorkflowStepJson {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.Role === "string" &&
    typeof record.UserEmail === "string" &&
    typeof record.Status === "string"
  );
}

export function isInitiatorWorkflowRole(role: string): boolean {
  return role.trim().toLowerCase() === Config.Roles.Initiator.toLowerCase();
}

export function applySubmitWorkflowStatuses(
  steps: INpdWorkflowStepJson[],
): INpdWorkflowStepJson[] {
  const firstApproverRole = steps.find(
    (step) => !isInitiatorWorkflowRole(step.Role),
  )?.Role;

  return steps.map((step) => {
    if (isInitiatorWorkflowRole(step.Role)) {
      return { ...step, Status: "" };
    }

    if (
      firstApproverRole &&
      step.Role.trim().toLowerCase() === firstApproverRole.trim().toLowerCase()
    ) {
      return { ...step, Status: Config.WorkflowStepStatus.Pending };
    }

    return { ...step, Status: "" };
  });
}

function isPendingWorkflowStatus(status: string): boolean {
  return (
    status.trim().toLowerCase() ===
    Config.WorkflowStepStatus.Pending.toLowerCase()
  );
}

function findActorStepIndex(
  steps: INpdWorkflowStepJson[],
  actorEmail: string,
  actorRole: string,
): number {
  const normalizedEmail = actorEmail.trim().toLowerCase();
  const normalizedRole = actorRole.trim().toLowerCase();
  const exactIndex = steps.findIndex(
    (step) =>
      step.UserEmail.trim().toLowerCase() === normalizedEmail &&
      step.Role.trim().toLowerCase() === normalizedRole,
  );
  if (exactIndex >= 0) {
    return exactIndex;
  }

  return steps.findIndex(
    (step) =>
      !isInitiatorWorkflowRole(step.Role) &&
      step.Role.trim().toLowerCase() === normalizedRole &&
      isPendingWorkflowStatus(step.Status),
  );
}

export function applyApproverActionToWorkflow(
  steps: INpdWorkflowStepJson[],
  actorEmail: string,
  actorRole: string,
  actionStatus: string,
): INpdWorkflowStepJson[] {
  const normalizedRole = actorRole.trim().toLowerCase();
  const approved = actionStatus === Config.WorkflowStepStatus.Approved;
  const actorIndex = findActorStepIndex(steps, actorEmail, actorRole);
  const roleOrder: string[] = [];

  steps.forEach((step) => {
    const roleKey = step.Role.trim().toLowerCase();
    if (!roleOrder.some((role) => role === roleKey)) {
      roleOrder.push(roleKey);
    }
  });

  const actorRoleIndex = roleOrder.indexOf(normalizedRole);
  const nextRole =
    approved && actorRoleIndex >= 0 ? roleOrder[actorRoleIndex + 1] : undefined;

  return steps.map((step, index) => {
    if (isInitiatorWorkflowRole(step.Role)) {
      return { ...step, Status: "" };
    }

    if (index === actorIndex) {
      return {
        ...step,
        UserEmail: actorEmail.trim() || step.UserEmail,
        Status: actionStatus,
      };
    }

    if (
      approved &&
      nextRole &&
      step.Role.trim().toLowerCase() === nextRole &&
      !step.Status.trim()
    ) {
      return { ...step, Status: Config.WorkflowStepStatus.Pending };
    }

    const sameRole = step.Role.trim().toLowerCase() === normalizedRole;
    const isPending = isPendingWorkflowStatus(step.Status);

    if (sameRole && isPending) {
      return { ...step, Status: "" };
    }

    if (!approved && isPending) {
      return { ...step, Status: "" };
    }

    return step;
  });
}

export function resolveRequestStatusAfterAction(
  action: NpdWorkflowAction,
  steps: INpdWorkflowStepJson[],
): string {
  if (action === "Reject") {
    return Config.RequestStatus.Rejected;
  }

  if (action === "Rework") {
    return Config.RequestStatus.Rework;
  }

  const hasPendingApprover = steps.some(
    (step) =>
      !isInitiatorWorkflowRole(step.Role) &&
      step.Status.trim().toLowerCase() ===
        Config.WorkflowStepStatus.Pending.toLowerCase(),
  );

  return hasPendingApprover
    ? Config.RequestStatus.Pending
    : Config.RequestStatus.Approved;
}

export function isVerticalHeadWorkflowRole(role: string): boolean {
  return role.trim().toLowerCase() === Config.Roles.VerticalHead.toLowerCase();
}

export function isMisCoordinatorWorkflowRole(role: string): boolean {
  return role.trim().toLowerCase() === Config.Roles.MisCoordinator.toLowerCase();
}

export function getPendingApproverEmails(
  steps: INpdWorkflowStepJson[],
): string[] {
  return steps
    .filter(
      (step) =>
        !isInitiatorWorkflowRole(step.Role) &&
        step.Status.trim().toLowerCase() ===
          Config.WorkflowStepStatus.Pending.toLowerCase(),
    )
    .map((step) => step.UserEmail.trim())
    .filter(Boolean);
}

export function getFirstPendingApproverStep(
  steps: readonly INpdWorkflowStepJson[],
): INpdWorkflowStepJson | undefined {
  return steps.find(
    (step) =>
      !isInitiatorWorkflowRole(step.Role) &&
      step.Status.trim().toLowerCase() ===
        Config.WorkflowStepStatus.Pending.toLowerCase(),
  );
}

export function getFirstPendingApproverRole(
  steps: readonly INpdWorkflowStepJson[],
): string {
  return getFirstPendingApproverStep(steps)?.Role.trim() ?? "";
}

export function hasCompletedWorkflowStep(
  steps: INpdWorkflowStepJson[],
  userEmail: string,
): boolean {
  const normalizedEmail = userEmail.trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }

  return steps.some((step) => {
    if (step.UserEmail.trim().toLowerCase() !== normalizedEmail) {
      return false;
    }

    const status = step.Status.trim().toLowerCase();
    return (
      status === Config.WorkflowStepStatus.Approved.toLowerCase() ||
      status === Config.WorkflowStepStatus.Rejected.toLowerCase() ||
      status === Config.WorkflowStepStatus.Rework.toLowerCase()
    );
  });
}

export function hasPendingWorkflowStep(
  steps: INpdWorkflowStepJson[],
  userEmail: string,
): boolean {
  const normalizedEmail = userEmail.trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }

  return steps.some(
    (step) =>
      step.UserEmail.trim().toLowerCase() === normalizedEmail &&
      step.Status.trim().toLowerCase() ===
        Config.WorkflowStepStatus.Pending.toLowerCase(),
  );
}

export function getPendingWorkflowRole(
  steps: INpdWorkflowStepJson[],
  userEmail: string,
): string {
  const normalizedEmail = userEmail.trim().toLowerCase();
  const match = steps.find(
    (step) =>
      step.UserEmail.trim().toLowerCase() === normalizedEmail &&
      isPendingWorkflowStatus(step.Status),
  );

  return match?.Role.trim() ?? "";
}

function assignedRolesInclude(
  assignedRoles: readonly string[],
  role: string,
): boolean {
  const normalizedRole = role.trim().toLowerCase();
  return assignedRoles.some(
    (assigned) => assigned.trim().toLowerCase() === normalizedRole,
  );
}

export function userCanActOnPendingWorkflow(
  steps: INpdWorkflowStepJson[],
  userEmail: string,
  assignedRoles: readonly string[],
): boolean {
  if (hasPendingWorkflowStep(steps, userEmail)) {
    return true;
  }

  const pendingRole = getFirstPendingApproverRole(steps);
  return Boolean(pendingRole && assignedRolesInclude(assignedRoles, pendingRole));
}

export function resolveActorWorkflowRole(
  steps: INpdWorkflowStepJson[],
  userEmail: string,
  assignedRoles: readonly string[],
): string {
  const pendingRole = getFirstPendingApproverRole(steps);
  if (pendingRole && assignedRolesInclude(assignedRoles, pendingRole)) {
    return pendingRole;
  }

  return getPendingWorkflowRole(steps, userEmail);
}
