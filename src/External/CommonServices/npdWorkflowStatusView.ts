import { Config, RequestStatus, WorkflowStepStatus } from "./Config";
import type { INpdWorkflowStepJson } from "./Interface";
import {
  getFirstPendingApproverRole,
  isInitiatorWorkflowRole,
} from "./npdWorkflowJsonService";
import { normalizeEmail } from "./personFieldUtils";
import SPServices from "./SPServices";

const EMPTY_TITLE_BY_EMAIL: ReadonlyMap<string, string> = new Map();

export interface INpdWorkflowStatusViewRow {
  key: string;
  role: string;
  name: string;
  workflowRole: string;
  statusLabel: string;
  isHighlighted: boolean;
}

export async function fetchUserTitlesByEmail(): Promise<Map<string, string>> {
  const titles = new Map<string, string>();

  try {
    const users = (await SPServices.getAllUsers()) as Record<string, unknown>[];
    users.forEach((user) => {
      const email = normalizeEmail(String(user.Email ?? user.EMail ?? ""));
      const title = String(user.Title ?? "").trim();
      if (email.includes("@") && title) {
        titles.set(email, title);
      }
    });
  } catch {
    return titles;
  }

  return titles;
}

export function buildNpdWorkflowStatusViewRows(params: {
  steps: INpdWorkflowStepJson[];
  requestStatus: string;
  authorEmail: string;
  authorTitle: string;
  titleByEmail: ReadonlyMap<string, string>;
}): INpdWorkflowStatusViewRow[] {
  const authorEmail = normalizeEmail(params.authorEmail);
  const authorTitle = params.authorTitle.trim();
  const requestStatus = params.requestStatus.trim().toLowerCase();
  const isDraft = requestStatus === RequestStatus.Draft.toLowerCase();
  const isRework =
    requestStatus === RequestStatus.Rework.toLowerCase() ||
    requestStatus === "in rework";
  const pendingRole = getFirstPendingApproverRole(params.steps);

  return params.steps.map((step, index) => {
    const email = normalizeEmail(step.UserEmail);
    const isInitiator = isInitiatorWorkflowRole(step.Role);

    return {
      key: `${index}-${step.Role}-${email}`,
      role: step.Role.trim() || "—",
      name: resolveNpdWorkflowDisplayName(
        email,
        authorEmail,
        authorTitle,
        params.titleByEmail,
      ),
      workflowRole: isInitiator
        ? Config.Roles.Initiator
        : Config.FieldLabels.Approver,
      statusLabel: resolveWorkflowStatusLabel(step, isInitiator, isDraft),
      isHighlighted: isCurrentPendingWorkflowRow({
        isInitiator,
        isDraft,
        isRework,
        pendingRole,
        step,
      }),
    };
  });
}

export function isCurrentPendingWorkflowRow(params: {
  isInitiator: boolean;
  isDraft: boolean;
  isRework: boolean;
  pendingRole: string;
  step: INpdWorkflowStepJson;
}): boolean {
  if (params.isDraft) {
    return false;
  }

  if (params.isRework) {
    return params.isInitiator;
  }

  if (params.isInitiator || !params.pendingRole) {
    return false;
  }

  return (
    params.step.Role.trim().toLowerCase() === params.pendingRole.toLowerCase() &&
    params.step.Status.trim().toLowerCase() ===
      WorkflowStepStatus.Pending.toLowerCase()
  );
}

export function resolveNpdWorkflowDisplayName(
  email: string,
  authorEmail: string,
  authorTitle: string,
  titleByEmail: ReadonlyMap<string, string> = EMPTY_TITLE_BY_EMAIL,
): string {
  if (email && email === authorEmail && authorTitle) {
    return authorTitle;
  }

  const mapped = email ? titleByEmail.get(email) : "";
  if (mapped) {
    return mapped;
  }

  return formatEmailLocalName(email);
}

function resolveWorkflowStatusLabel(
  step: INpdWorkflowStepJson,
  isInitiator: boolean,
  isDraft: boolean,
): string {
  if (isInitiator) {
    return isDraft ? RequestStatus.Draft : Config.FieldLabels.Initiated;
  }

  const status = step.Status.trim();
  if (!status) {
    return WorkflowStepStatus.Pending;
  }

  if (status.toLowerCase() === WorkflowStepStatus.Pending.toLowerCase()) {
    return WorkflowStepStatus.Pending;
  }

  if (status.toLowerCase() === WorkflowStepStatus.Approved.toLowerCase()) {
    return WorkflowStepStatus.Approved;
  }

  if (status.toLowerCase() === WorkflowStepStatus.Rejected.toLowerCase()) {
    return WorkflowStepStatus.Rejected;
  }

  if (status.toLowerCase() === WorkflowStepStatus.Rework.toLowerCase()) {
    return RequestStatus.Rework;
  }

  return status;
}

function formatEmailLocalName(email: string): string {
  const local = (email.split("@")[0] ?? "").replace(/[._-]+/g, " ").trim();
  if (!local) {
    return email || "—";
  }

  return local.replace(/\b\w/g, (character) => character.toUpperCase());
}
