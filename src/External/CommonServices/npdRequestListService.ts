import { ApproverSystems, Config, RequestStatus } from "./Config";
import type {
  INpdRequestGeneralInfo,
  INpdRequestListItem,
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
  viewRole?: string | NavViewRole | null,
): Promise<INpdRequestListItem[]> {
  const scopedRole = parseViewAsRole(viewRole ?? undefined);
  const [requests, summaries] = await Promise.all([
    fetchActiveNpdRequests(),
    fetchItemSummaries(),
  ]);

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

      return canViewRequest(
        access,
        {
          module: "npd",
          brand: item.Brand,
          createdByEmail: getNpdRequestOwnerEmail(item),
        },
        currentUserEmail,
        scopedRole,
      );
    })
    .map((item) => toListItem(item, summaries));
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

      if (
        !canViewRequest(
          access,
          {
            module: "npd",
            brand: item.Brand,
            createdByEmail: getNpdRequestOwnerEmail(item),
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
    .map((item) => toListItem(item, summaries));
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
  const [requests, summaries] = await Promise.all([
    fetchActiveNpdRequests(),
    fetchItemSummaries(),
  ]);

  return requests
    .filter((item) => isDraftOrReworkStatus(item.Status))
    .filter((item) =>
      canViewRequest(
        access,
        {
          module: "npd",
          brand: item.Brand,
          createdByEmail: getNpdRequestOwnerEmail(item),
        },
        currentUserEmail,
        role,
      ),
    )
    .map((item) => toListItem(item, summaries));
}
