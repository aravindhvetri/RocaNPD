import { Config } from "./Config";
import type {
  IMaterialGroupAuditLogPayload,
  IMaterialGroupAuditLogRow,
} from "./Interface";
import { extractPersonEmails } from "./personFieldUtils";
import SPServices from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.MaterialGroupAuditLogs;
const FIELDS = Config.FieldNames.MaterialGroupAuditLogs;

function resolveActionFromTitle(title: string, comments: string = ""): string {
  const combined = `${title} ${comments}`;
  if (/rework/i.test(combined)) {
    return Config.MaterialGroupStatus.Rework;
  }
  if (/reject/i.test(combined)) {
    return Config.MaterialGroupStatus.Rejected;
  }
  if (/complete/i.test(combined)) {
    return Config.MaterialGroupStatus.Completed;
  }
  return title || "—";
}

function mapAuditRow(row: Record<string, unknown>): IMaterialGroupAuditLogRow {
  const consultant = row[FIELDS.Consultant] as
    | { Title?: string; EMail?: string; Email?: string }
    | undefined;
  const emails = extractPersonEmails(row[FIELDS.Consultant]);
  const actionedBy =
    String(consultant?.Title || "").trim() ||
    emails[0] ||
    "—";
  const actionedByEmail =
    emails[0] ||
    String(consultant?.EMail || consultant?.Email || "").trim();

  return {
    id: Number(row.Id ?? row.ID) || 0,
    status: resolveActionFromTitle(
      String(row[FIELDS.Title] ?? ""),
      String(row[FIELDS.Comments] ?? ""),
    ),
    actionedBy,
    actionedByEmail: actionedByEmail || undefined,
    role: String(row[FIELDS.Role] ?? row.Role ?? "").trim(),
    comments: String(row[FIELDS.Comments] ?? "").trim(),
    created: row.Created ? String(row.Created) : undefined,
    actionVia: String(
      row[FIELDS.ActionVia] ??
      row.ActionVia ??
      row.Action_x0020_Via ??
      row["Action_x0020_Via"] ??
      row.Action_x0020_via ??
      row["Action_x0020_via"] ??
      ""
    ).trim(),
  };
}

async function resolveConsultantSiteUserId(
  providedUserId: number,
  consultantEmail?: string,
): Promise<number> {
  if (providedUserId > 0) {
    return providedUserId;
  }

  const email = (consultantEmail || "").trim();
  if (!email) {
    return 0;
  }

  try {
    return (await SPServices.ensureSiteUserId(email)) || 0;
  } catch (error) {
    console.warn("Could not resolve Consultant site user Id:", error);
    return 0;
  }
}

/**
 * Writes Approver Rework / Reject / Complete comments into NPD_MaterialGroupAuditLogs,
 * linked to the NPD_MaterialGroupRequests item via MaterialGroupRequests lookup.
 * Stores the acting Consultant in the Consultant Person/Group column.
 */
export async function addMaterialGroupAuditLog(
  payload: IMaterialGroupAuditLogPayload,
): Promise<void> {
  const comments = payload.comments.trim();
  if (!comments) {
    return;
  }

  const requestListItemId = Number(payload.requestListItemId);
  if (!requestListItemId || requestListItemId <= 0) {
    throw new Error("Material Group request ID is required for audit log.");
  }

  const consultantUserId = await resolveConsultantSiteUserId(
    Number(payload.consultantUserId) || 0,
    payload.consultantEmail,
  );

  const title = "";
  const rawVia = String(payload.actionVia || "").trim();
  const targetVia = rawVia.toLowerCase() === "mail" ? "Mail" : "System";

  const viaFieldCandidates = Array.from(
    new Set([FIELDS.ActionVia, "Action_x0020_Via", "Action_x0020_via", "ActionVia"]),
  );

  const lookupAttempts: unknown[] = [
    requestListItemId,
    [requestListItemId],
    { results: [requestListItemId] },
  ];

  let lastError: unknown;
  for (const lookupValue of lookupAttempts) {
    for (const viaField of viaFieldCandidates) {
      const requestJson: Record<string, unknown> = {
        [FIELDS.Title]: title,
        [FIELDS.Comments]: comments,
        [FIELDS.MaterialGroupRequestsId]: lookupValue,
        [viaField]: targetVia,
      };
      if (payload.role) {
        requestJson[FIELDS.Role] = payload.role;
      }
      if (consultantUserId > 0) {
        requestJson[FIELDS.ConsultantId] = consultantUserId;
      }

      try {
        await SPServices.SPAddItem({
          Listname: LIST_NAME(),
          RequestJSON: requestJson,
        });
        return;
      } catch (error) {
        lastError = error;
      }
    }

    // Fallback without ActionVia if the column is missing completely on the list
    try {
      const fallbackJson: Record<string, unknown> = {
        [FIELDS.Title]: title,
        [FIELDS.Comments]: comments,
        [FIELDS.MaterialGroupRequestsId]: lookupValue,
      };
      if (payload.role) {
        fallbackJson[FIELDS.Role] = payload.role;
      }
      if (consultantUserId > 0) {
        fallbackJson[FIELDS.ConsultantId] = consultantUserId;
      }
      await SPServices.SPAddItem({
        Listname: LIST_NAME(),
        RequestJSON: fallbackJson,
      });
      return;
    } catch (fallbackError) {
      lastError = fallbackError;
    }
  }

  console.error("Failed to write Material Group audit log:", lastError);
  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to save Material Group audit log.");
}

export interface IMaterialGroupAuditComment {
  comments: string;
  action: string;
  created?: string;
}

/**
 * Loads all audit-log rows for a Material Group request (newest first).
 */
export async function fetchMaterialGroupAuditLogs(
  requestListItemId: number,
): Promise<IMaterialGroupAuditLogRow[]> {
  if (!requestListItemId || requestListItemId <= 0) {
    return [];
  }

  const selectWithPeople = [
    "Id",
    FIELDS.Title,
    FIELDS.Comments,
    FIELDS.Role,
    FIELDS.ActionVia,
    "Created",
    `${FIELDS.MaterialGroupRequestsId}`,
    `${FIELDS.MaterialGroupRequests}/Id`,
    `${FIELDS.Consultant}/Id`,
    `${FIELDS.Consultant}/Title`,
    `${FIELDS.Consultant}/EMail`,
  ].join(",");

  const tryFetch = async (
    filterKey: string,
    expand?: string,
    select?: string,
  ): Promise<IMaterialGroupAuditLogRow[]> => {
    const rows = (await SPServices.SPReadItems({
      Listname: LIST_NAME(),
      Select: select || selectWithPeople,
      Expand: expand,
      Filter: [
        {
          FilterKey: filterKey,
          Operator: "eq",
          FilterValue: String(requestListItemId),
        },
      ],
      Orderby: "Created",
      Orderbydecorasc: false,
      Topcount: 500,
    })) as Record<string, unknown>[];

    return rows
      .map(mapAuditRow)
      .filter((row) => Boolean(row.comments) || Boolean(row.status));
  };

  try {
    return await tryFetch(
      `${FIELDS.MaterialGroupRequests}/Id`,
      `${FIELDS.MaterialGroupRequests},${FIELDS.Consultant}`,
      selectWithPeople,
    );
  } catch {
    try {
      return await tryFetch(
        FIELDS.MaterialGroupRequestsId,
        FIELDS.Consultant,
        [
          "Id",
          FIELDS.Title,
          FIELDS.Comments,
          FIELDS.Role,
          FIELDS.ActionVia,
          "Created",
          `${FIELDS.Consultant}/Id`,
          `${FIELDS.Consultant}/Title`,
          `${FIELDS.Consultant}/EMail`,
        ].join(","),
      );
    } catch {
      try {
        return await tryFetch(FIELDS.MaterialGroupRequestsId, undefined, [
          "Id",
          FIELDS.Title,
          FIELDS.Comments,
          FIELDS.Role,
          FIELDS.ActionVia,
          "Created",
        ].join(","));
      } catch (error) {
        console.warn("Could not load Material Group audit logs:", error);
        return [];
      }
    }
  }
}

/**
 * Loads the latest audit-log comment for a Material Group request (newest first).
 */
export async function fetchLatestMaterialGroupAuditComment(
  requestListItemId: number,
): Promise<IMaterialGroupAuditComment | null> {
  const rows = await fetchMaterialGroupAuditLogs(requestListItemId);
  const matched = rows.find((row) => Boolean(row.comments.trim()));
  if (!matched) {
    return null;
  }
  return {
    comments: matched.comments,
    action: matched.status,
    created: matched.created,
  };
}
