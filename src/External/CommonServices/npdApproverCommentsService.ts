import { Config } from "./Config";
import type {
  INpdApproverCommentPayload,
  INpdApproverCommentRow,
} from "./Interface";
import { extractPersonEmails } from "./personFieldUtils";
import SPServices from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.NpdApproverComments;
const FIELDS = Config.FieldNames.NpdApproverComments;

function resolveCommentText(action: string, comments: string): string {
  const trimmed = comments.trim();
  if (trimmed) {
    return trimmed;
  }

  if (action === "Approve") {
    return "Approved";
  }
  if (action === "Reject") {
    return "Rejected";
  }
  return "Rework requested";
}

function resolveActionFromTitle(title: string, comments: string = ""): string {
  const combined = `${title} ${comments}`;
  if (/reject/i.test(combined)) {
    return Config.RequestStatus.Rejected;
  }
  if (/rework/i.test(combined)) {
    return Config.RequestStatus.Rework;
  }
  if (/approve/i.test(combined)) {
    return Config.RequestStatus.Approved;
  }
  return title || "—";
}

/** Prefer display name; never surface a raw email as the Actioned By label. */
function toActionedByDisplayName(title: string, email: string): string {
  const name = (title || "").trim();
  if (name && !name.includes("@")) {
    return name;
  }

  const source = (name.includes("@") ? name : email || "").trim();
  if (!source.includes("@")) {
    return name || "—";
  }

  const local = source.split("@")[0] || "";
  const pretty = local
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
  return pretty || "—";
}

function mapCommentRow(row: Record<string, unknown>): INpdApproverCommentRow {
  const userField = row[FIELDS.User] ?? row.User;
  const user = userField as
    | { Title?: string; EMail?: string; Email?: string }
    | undefined;
  const emails = extractPersonEmails(userField);
  const email =
    emails[0] || String(user?.EMail || user?.Email || "").trim();
  const title = String(user?.Title || "").trim();

  return {
    id: Number(row.Id ?? row.ID) || 0,
    status: resolveActionFromTitle(
      String(row[FIELDS.Title] ?? ""),
      String(row[FIELDS.Comments] ?? ""),
    ),
    actionedBy: toActionedByDisplayName(title, email),
    actionedByEmail: email || undefined,
    role: String(row[FIELDS.Role] ?? "").trim(),
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

function buildUserIdVariants(userId: number): unknown[] {
  return [userId, [userId], { results: [userId] }];
}

/**
 * Writes Approver / MIS Rework / Reject / Approve comments into NPD_ApproverComments.
 * Person column internal name is `User` (REST write key `UserId`).
 * Lookup column is `NPDRequest` (REST write key `NPDRequestId`).
 */
export async function addNpdApproverComment(
  payload: INpdApproverCommentPayload,
): Promise<void> {
  const comments = resolveCommentText(payload.action, payload.comments);
  const requestId = Number(payload.requestId);
  if (!requestId || requestId <= 0) {
    throw new Error("NPD request ID is required for approver comments.");
  }

  let userId =
    payload.userIds.find((id) => Number.isFinite(id) && id > 0) || 0;

  // Always ensure the acting user exists on the site so Person field resolves.
  if (payload.actorEmail) {
    try {
      const ensured = await SPServices.ensureSiteUserId(payload.actorEmail);
      if (ensured > 0) {
        userId = ensured;
      }
    } catch (error) {
      console.warn("Could not ensure Approver Comments site user:", error);
    }
  }

  const title = "";
  const lookupAttempts: unknown[] = [
    requestId,
    [requestId],
    { results: [requestId] },
  ];
  const userAttempts = userId > 0 ? buildUserIdVariants(userId) : [undefined];

  const rawVia = String(payload.actionVia || "").trim();
  const targetVia = rawVia.toLowerCase() === "mail" ? "Mail" : "System";

  // Support both "ActionVia" and "Action_x0020_Via" in case SharePoint column was created with a space.
  const viaFieldCandidates = Array.from(
    new Set([FIELDS.ActionVia, "Action_x0020_Via", "Action_x0020_via", "ActionVia"]),
  );

  let lastError: unknown;
  for (const lookupValue of lookupAttempts) {
    for (const userValue of userAttempts) {
      for (const viaField of viaFieldCandidates) {
        const requestJson: Record<string, unknown> = {
          [FIELDS.Title]: title,
          [FIELDS.Comments]: comments,
          [FIELDS.Role]: payload.role,
          [FIELDS.NPDRequestId]: lookupValue,
          [viaField]: targetVia,
        };
        if (userValue !== undefined) {
          requestJson[FIELDS.UserId] = userValue;
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
          [FIELDS.Role]: payload.role,
          [FIELDS.NPDRequestId]: lookupValue,
        };
        if (userValue !== undefined) {
          fallbackJson[FIELDS.UserId] = userValue;
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
  }

  console.error("Failed to write NPD Approver Comments:", lastError);
  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to save approver comments.");
}

export async function resolveApproverUserIds(
  actorUserId: number,
  actorEmail: string,
): Promise<number[]> {
  const email = (actorEmail || "").trim();
  if (email) {
    try {
      const ensured = await SPServices.ensureSiteUserId(email);
      if (ensured > 0) {
        return [ensured];
      }
    } catch (error) {
      console.warn("ensureSiteUserId failed for Approver Comments:", error);
    }
  }

  if (actorUserId > 0) {
    return [actorUserId];
  }

  return [];
}

/**
 * Loads Approver Comments for an NPD request (newest first) for the Audit Log table.
 */
export async function fetchNpdApproverComments(
  requestId: number,
): Promise<INpdApproverCommentRow[]> {
  if (!requestId || requestId <= 0) {
    return [];
  }

  const selectWithPeople = [
    "Id",
    FIELDS.Title,
    FIELDS.Comments,
    FIELDS.Role,
    FIELDS.ActionVia,
    "Created",
    `${FIELDS.NPDRequestId}`,
    `${FIELDS.NPDRequest}/Id`,
    `${FIELDS.User}/Id`,
    `${FIELDS.User}/Title`,
    `${FIELDS.User}/EMail`,
  ].join(",");

  const tryFetch = async (
    filterKey: string,
    expand?: string,
    select?: string,
  ): Promise<INpdApproverCommentRow[]> => {
    const rows = (await SPServices.SPReadItems({
      Listname: LIST_NAME(),
      Select: select || selectWithPeople,
      Expand: expand,
      Filter: [
        {
          FilterKey: filterKey,
          Operator: "eq",
          FilterValue: String(requestId),
        },
      ],
      Orderby: "Created",
      Orderbydecorasc: false,
      Topcount: 500,
    })) as Record<string, unknown>[];

    return rows
      .map(mapCommentRow)
      .filter((row) => Boolean(row.comments) || Boolean(row.status));
  };

  try {
    return await tryFetch(
      `${FIELDS.NPDRequest}/Id`,
      `${FIELDS.NPDRequest},${FIELDS.User}`,
      selectWithPeople,
    );
  } catch {
    try {
      return await tryFetch(
        FIELDS.NPDRequestId,
        FIELDS.User,
        [
          "Id",
          FIELDS.Title,
          FIELDS.Comments,
          FIELDS.Role,
          FIELDS.ActionVia,
          "Created",
          `${FIELDS.User}/Id`,
          `${FIELDS.User}/Title`,
          `${FIELDS.User}/EMail`,
        ].join(","),
      );
    } catch {
      try {
        return await tryFetch(FIELDS.NPDRequestId, undefined, [
          "Id",
          FIELDS.Title,
          FIELDS.Comments,
          FIELDS.Role,
          FIELDS.ActionVia,
          "Created",
        ].join(","));
      } catch (error) {
        console.warn("Could not load NPD Approver Comments:", error);
        return [];
      }
    }
  }
}
