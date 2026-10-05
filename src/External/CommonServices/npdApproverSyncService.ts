import { Config, RequestStatus } from "./Config";
import type { INpdWorkflowStepJson } from "./Interface";
import {
  fetchNpdApproverAssignmentRows,
  getEmailsForNpdApproverSync,
} from "./npdApproverAssignmentService";
import {
  parseWorkflowJson,
  stringifyWorkflowJson,
} from "./npdWorkflowJsonService";
import { normalizeEmail } from "./personFieldUtils";
import { getActiveRecordFilters } from "./softDelete";
import SPServices from "./SPServices";

/** Approver roles refreshed from ApproversMaster. Initiator is never rewritten. */
const SYNC_ROLES = [
  Config.Roles.VerticalHead,
  Config.Roles.MisCoordinator,
  Config.Roles.Consultant,
] as const;

const SYNC_STATUSES = [RequestStatus.Pending, RequestStatus.Rework] as const;

let syncInFlight: Promise<void> | null = null;

function sameEmailSet(left: string[], right: string[]): boolean {
  const normalize = (emails: string[]): string[] =>
    Array.from(
      new Set(
        emails
          .map((email) => normalizeEmail(email))
          .filter((email) => email.includes("@")),
      ),
    ).sort();

  const a = normalize(left);
  const b = normalize(right);
  return a.length === b.length && a.every((email, index) => email === b[index]);
}

function isPendingStepStatus(status: string): boolean {
  return status.trim().toLowerCase() === Config.WorkflowStepStatus.Pending.toLowerCase();
}

/**
 * Replace UserEmail on existing steps for one role. Status values stay.
 * Returns the original array when nothing should be written.
 */
export function replaceWorkflowRoleEmails(
  steps: readonly INpdWorkflowStepJson[],
  role: string,
  nextEmails: readonly string[],
): INpdWorkflowStepJson[] {
  const roleKey = role.trim().toLowerCase();
  const matches = steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.Role.trim().toLowerCase() === roleKey);

  const emails = nextEmails.map((email) => email.trim()).filter((email) => email.includes("@"));
  if (!matches.length || !emails.length) {
    return steps as INpdWorkflowStepJson[];
  }

  if (sameEmailSet(matches.map(({ step }) => step.UserEmail), emails)) {
    return steps as INpdWorkflowStepJson[];
  }

  const statuses = matches.map(({ step }) => step.Status);
  const pendingStatus = statuses.find((status) => isPendingStepStatus(status));
  const fallbackStatus = statuses[statuses.length - 1] ?? "";
  const roleLabel = matches[0].step.Role;

  const replacement: INpdWorkflowStepJson[] = emails.map((email, index) => ({
    Role: roleLabel,
    UserEmail: email,
    Status:
      emails.length === 1 && pendingStatus
        ? pendingStatus
        : (statuses[index] ?? fallbackStatus),
  }));

  const firstIndex = matches[0].index;
  const drop = new Set(matches.map(({ index }) => index));
  const rebuilt: INpdWorkflowStepJson[] = [];

  steps.forEach((step, index) => {
    if (index === firstIndex) {
      replacement.forEach((next) => rebuilt.push(next));
      return;
    }
    if (drop.has(index)) {
      return;
    }
    rebuilt.push(step);
  });

  return rebuilt;
}

/**
 * Align VH / MIS / Consultant emails with ApproversMaster.
 * Vertical Head uses the request Brand. MIS and Consultant do not.
 * Other roles, including Initiator, are left as stored.
 * Returns null when WorkFlowJSON does not need a write.
 */
export function syncWorkflowStepsFromApproverMaster(
  steps: readonly INpdWorkflowStepJson[],
  brand: string,
  resolveEmails: (role: string, requestBrand: string) => string[],
): INpdWorkflowStepJson[] | null {
  if (!steps.length) {
    return null;
  }

  let current = steps as INpdWorkflowStepJson[];
  let changed = false;

  SYNC_ROLES.forEach((role) => {
    const hasRole = current.some(
      (step) => step.Role.trim().toLowerCase() === role.toLowerCase(),
    );
    if (!hasRole) {
      return;
    }

    const nextEmails = resolveEmails(role, brand);
    const updated = replaceWorkflowRoleEmails(current, role, nextEmails);
    if (updated !== current) {
      current = updated;
      changed = true;
    }
  });

  return changed ? current : null;
}

function isSyncStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return SYNC_STATUSES.some((value) => value.toLowerCase() === normalized);
}

async function fetchRequestsByStatus(
  status: string,
): Promise<Record<string, unknown>[]> {
  const rows = (await SPServices.SPReadItems({
    Listname: Config.ListNames.NpdRequest,
    Select: "Id,Brand,Status,WorkFlowJSON",
    Filter: [
      ...getActiveRecordFilters(),
      { FilterKey: "Status", FilterValue: status, Operator: "eq" },
    ],
    FilterCondition: "and",
    Topcount: 5000,
  })) as Record<string, unknown>[];

  return rows.filter((row) => isSyncStatus(String(row.Status ?? "")));
}

async function updateWorkflowJson(id: number, steps: INpdWorkflowStepJson[]): Promise<void> {
  await SPServices.SPUpdateItem({
    Listname: Config.ListNames.NpdRequest,
    ID: id,
    RequestJSON: {
      [Config.FieldNames.NpdRequest.WorkFlowJSON]: stringifyWorkflowJson(steps),
    },
  });
}

async function runSync(contextSiteUrl?: string): Promise<void> {
  const { rows, userEmailById } =
    await fetchNpdApproverAssignmentRows(contextSiteUrl);

  const resolveEmails = (role: string, brand: string): string[] =>
    getEmailsForNpdApproverSync(rows, userEmailById, role, brand);

  const requests = (
    await Promise.all(SYNC_STATUSES.map((status) => fetchRequestsByStatus(status)))
  ).flat();

  for (const row of requests) {
    const id = Number(row.Id);
    const status = String(row.Status ?? "");
    if (!id || !isSyncStatus(status)) {
      continue;
    }

    const steps = parseWorkflowJson(row.WorkFlowJSON);
    const nextSteps = syncWorkflowStepsFromApproverMaster(
      steps,
      String(row.Brand ?? ""),
      resolveEmails,
    );
    if (!nextSteps) {
      continue;
    }

    await updateWorkflowJson(id, nextSteps);
  }
}

/**
 * On login, refresh approver emails in Pending and Rework NPD requests
 * from the current ROCA ApproversMaster (System = New Product Development).
 * Already-sent emails are not touched. Other statuses are not read or written.
 */
export function syncNpdPendingReworkApprovers(
  contextSiteUrl?: string,
): Promise<void> {
  if (!syncInFlight) {
    syncInFlight = runSync(contextSiteUrl)
      .catch((error) => {
        console.warn(
          "NPD approver sync from ApproversMaster did not complete:",
          error,
        );
      })
      .finally(() => {
        syncInFlight = null;
      });
  }

  return syncInFlight;
}
