import { Config, RequestStatus } from "./Config";
import type {
  INpdRequestGeneralInfo,
  INpdRequestListItem,
  IResolvedUserAccess,
} from "./Interface";
import { isNpdRequestIdTitle } from "./npdRequestIdService";
import {
  fetchActiveNpdRequests,
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
  hasRole,
} from "./permissionService";
import SPServices from "./SPServices";

const ITEM_FIELDS = Config.FieldNames.NpdItemDetails;

interface IItemSummary {
  count: number;
  firstDescription: string;
}

function getLookupId(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nestedId = Number(record.Id ?? record.ID);
    if (Number.isFinite(nestedId) && nestedId > 0) {
      return nestedId;
    }
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

async function fetchItemSummaries(): Promise<Map<number, IItemSummary>> {
  const rows = (await SPServices.SPReadItems({
    Listname: Config.ListNames.NpdItemDetails,
    Select: ["Id", ITEM_FIELDS.MaterialDescription, ITEM_FIELDS.RequestGeneralInfoId].join(
      ",",
    ),
    Orderby: "Id",
    Orderbydecorasc: true,
    Topcount: 5000,
  })) as Record<string, unknown>[];

  const summaries = new Map<number, IItemSummary>();
  rows.forEach((row) => {
    const requestId = getLookupId(row[ITEM_FIELDS.RequestGeneralInfoId]);
    if (!requestId) {
      return;
    }

    const existing = summaries.get(requestId);
    const description = String(row[ITEM_FIELDS.MaterialDescription] ?? "").trim();
    if (!existing) {
      summaries.set(requestId, { count: 1, firstDescription: description });
      return;
    }

    existing.count += 1;
    if (!existing.firstDescription && description) {
      existing.firstDescription = description;
    }
  });

  return summaries;
}

function toListItem(
  item: INpdRequestGeneralInfo,
  summaries: Map<number, IItemSummary>,
): INpdRequestListItem {
  const summary = summaries.get(item.Id);
  const projectName =
    summary?.firstDescription ||
    (isNpdRequestIdTitle(item.Title) ? item.Brand : item.Title);

  return {
    ...item,
    ProjectName: projectName.trim(),
    ProductCount: summary?.count ?? 0,
  };
}

export async function fetchNpdDashboardItems(
  currentUserEmail: string,
  access: IResolvedUserAccess,
): Promise<INpdRequestListItem[]> {
  const [requests, summaries] = await Promise.all([
    fetchActiveNpdRequests(),
    fetchItemSummaries(),
  ]);

  return requests
    .filter((item) =>
      canViewRequest(
        access,
        {
          module: "npd",
          brand: item.Brand,
          createdByEmail: item.AuthorEmail,
        },
        currentUserEmail,
      ),
    )
    .map((item) => toListItem(item, summaries));
}

export async function fetchNpdPendingItems(
  currentUserEmail: string,
  access: IResolvedUserAccess,
): Promise<INpdRequestListItem[]> {
  const loginEmail = normalizeEmail(currentUserEmail);
  if (!loginEmail) {
    return [];
  }

  const [requests, summaries] = await Promise.all([
    fetchActiveNpdRequests(),
    fetchItemSummaries(),
  ]);

  return requests
    .filter((item) => {
      const status = item.Status.trim().toLowerCase();
      if (status !== RequestStatus.Pending.toLowerCase()) {
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

      if (canAct) {
        return true;
      }

      return (
        hasRole(access.assignedRoles, Config.Roles.Initiator) &&
        normalizeEmail(item.AuthorEmail) === loginEmail
      );
    })
    .map((item) => toListItem(item, summaries));
}

export async function fetchNpdDraftReworkItems(
  currentUserEmail: string,
): Promise<INpdRequestListItem[]> {
  const loginEmail = normalizeEmail(currentUserEmail);
  if (!loginEmail) {
    return [];
  }

  const [requests, summaries] = await Promise.all([
    fetchActiveNpdRequests(),
    fetchItemSummaries(),
  ]);

  return requests
    .filter((item) => isDraftOrReworkStatus(item.Status))
    .filter((item) => normalizeEmail(item.AuthorEmail) === loginEmail)
    .map((item) => toListItem(item, summaries));
}
