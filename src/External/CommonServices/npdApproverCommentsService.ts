import { Config } from "./Config";
import type {
  INpdApproverCommentPayload,
  INpdApproverCommentRow,
} from "./Interface";
import { extractPersonEmails } from "./personFieldUtils";
import SPServices from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.NpdApproverComments;
const FIELDS = Config.FieldNames.NpdApproverComments;

/**
 * Actual NPD_ApproverComments columns:
 * Title (empty) | Comments | User | Role | NPDRequest | ActionVia | Action
 */
type UserIdFormat = "array" | "results" | "number" | "omit";

interface ICachedWriteShape {
  userFormat: UserIdFormat;
}

/** Winning write shape — null until first successful POST, then reused. */
let cachedWriteShape: ICachedWriteShape | null = null;

function setCachedWriteShape(value: ICachedWriteShape | null): void {
  cachedWriteShape = value;
}

function resolveCommentText(action: string, comments: string): string {
  const trimmed = comments.trim();
  if (trimmed) {
    return trimmed;
  }

  const a = (action || "").toLowerCase();
  if (a === "approve" || a === "approved") {
    return "Approved";
  }
  if (a === "reject" || a === "rejected") {
    return "Rejected";
  }
  if (
    a === "initiated" ||
    a === "initiate" ||
    a === "submit" ||
    a === "submitted"
  ) {
    return "Request initiated";
  }
  if (a === "resubmit" || a === "resubmitted") {
    return "Request resubmitted";
  }
  return "Rework requested";
}

export function formatAuditAction(action: string): string {
  const a = (action || "").trim().toLowerCase();
  if (a === "approve" || a === "approved") {
    return "Approved";
  }
  if (a === "reject" || a === "rejected") {
    return "Rejected";
  }
  if (a === "rework" || a === "in rework") {
    return "Rework";
  }
  if (a === "resubmit" || a === "resubmitted") {
    return "Resubmit";
  }
  if (
    a === "initiated" ||
    a === "initiate" ||
    a === "submit" ||
    a === "submitted"
  ) {
    return "Initiated";
  }
  if (a === "completed" || a === "complete") {
    return "Completed";
  }
  return action || "";
}

function resolveActionFromTitleAndRole(
  title: string,
  comments: string = "",
  role: string = "",
): string {
  const combined = `${title} ${comments}`;
  if (/reject/i.test(combined)) {
    return Config.RequestStatus.Rejected;
  }
  if (/resubmit/i.test(combined)) {
    return "Resubmit";
  }
  if (/initiat/i.test(combined)) {
    return "Initiated";
  }
  if (/rework/i.test(combined)) {
    return Config.RequestStatus.Rework;
  }
  if (/approve/i.test(combined) || /complete/i.test(combined)) {
    return Config.RequestStatus.Approved;
  }
  if (role.toLowerCase() === "mis coordinator") {
    return Config.RequestStatus.Approved;
  }
  if (role.toLowerCase() === "initiator") {
    return /rework/i.test(comments) ? "Resubmit" : "Initiated";
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
  const userField = row[FIELDS.User] ?? row.User ?? row.Author;
  const user = userField as
    | { Title?: string; EMail?: string; Email?: string }
    | undefined;
  const emails = extractPersonEmails(userField);
  const email = emails[0] || String(user?.EMail || user?.Email || "").trim();
  const title = String(user?.Title || "").trim();

  // Prefer Action column when present; Title is the fallback label.
  const rawAction = String(
    row[FIELDS.Action] ?? row.Action ?? row[FIELDS.Title] ?? "",
  ).trim();

  let resolvedStatus = "";
  if (rawAction) {
    resolvedStatus = formatAuditAction(rawAction);
  }
  if (!resolvedStatus) {
    resolvedStatus = resolveActionFromTitleAndRole(
      String(row[FIELDS.Title] ?? ""),
      String(row[FIELDS.Comments] ?? ""),
      String(row[FIELDS.Role] ?? "").trim(),
    );
  }

  return {
    id: Number(row.Id ?? row.ID) || 0,
    status: resolvedStatus,
    actionedBy: toActionedByDisplayName(title, email),
    actionedByEmail: email || undefined,
    role: String(row[FIELDS.Role] ?? "").trim(),
    comments: String(row[FIELDS.Comments] ?? "").trim(),
    created: row.Created ? String(row.Created) : undefined,
    actionVia:
      String(
        row[FIELDS.ActionVia] ??
          row.ActionVia ??
          row.Action_x0020_Via ??
          row["Action_x0020_Via"] ??
          "",
      ).trim() ||
      (String(row[FIELDS.Role] ?? "")
        .trim()
        .toLowerCase() === "initiator" ||
      resolvedStatus.toLowerCase() === "initiated" ||
      resolvedStatus.toLowerCase() === "resubmit"
        ? "System"
        : ""),
  };
}

function formatUserId(userId: number, format: UserIdFormat): unknown {
  if (format === "omit") {
    return undefined;
  }
  // PnPjs multi-person: plain number[] (preferred).
  if (format === "array") {
    return [userId];
  }
  // Classic REST multi-value envelope.
  if (format === "results") {
    return { results: [userId] };
  }
  return userId;
}

/**
 * Builds a payload using the NPD_ApproverComments columns:
 * Title, Comments, User, Role, NPDRequest, ActionVia, Action.
 */
function buildPayload(
  payload: INpdApproverCommentPayload,
  userId: number,
  shape: ICachedWriteShape,
): Record<string, unknown> {
  const comments = resolveCommentText(payload.action, payload.comments);
  const targetAction =
    formatAuditAction(payload.action) || payload.action || "";
  const rawVia = String(payload.actionVia || "").trim();
  const targetVia = rawVia.toLowerCase() === "mail" ? "Mail" : "System";

  const requestJson: Record<string, unknown> = {
    // Title must remain empty (T-1003a / list standard).
    [FIELDS.Title]: "",
    [FIELDS.Comments]: comments,
    [FIELDS.Role]: payload.role,
    // Single lookup → scalar Id (NPDRequest).
    [FIELDS.NPDRequestId]: Number(payload.requestId),
    // Action column stores Approved / Rejected / Rework / etc.
    [FIELDS.Action]: targetAction,
    // ActionVia is System (app) or Mail (NPDApproverMail web part).
    [FIELDS.ActionVia]: targetVia,
  };

  if (userId > 0 && shape.userFormat !== "omit") {
    requestJson[FIELDS.UserId] = formatUserId(userId, shape.userFormat);
  }

  return requestJson;
}

async function tryAddWithShape(
  payload: INpdApproverCommentPayload,
  userId: number,
  shape: ICachedWriteShape,
): Promise<boolean> {
  try {
    await SPServices.SPAddItem({
      Listname: LIST_NAME(),
      RequestJSON: buildPayload(payload, userId, shape),
    });
    setCachedWriteShape(shape);
    return true;
  } catch {
    return false;
  }
}

/**
 * Short ordered probe against the real list columns only.
 * Prefer PnPjs multi-person `UserId: [id]`, then classic `{ results }`, then scalar.
 */
async function addCommentByProbing(
  payload: INpdApproverCommentPayload,
  userId: number,
): Promise<void> {
  const userFormats: UserIdFormat[] =
    userId > 0 ? ["array", "results", "number"] : ["omit"];

  const shapes: ICachedWriteShape[] = userFormats.map((userFormat) => ({
    userFormat,
  }));

  let lastError: unknown;
  for (const shape of shapes) {
    try {
      await SPServices.SPAddItem({
        Listname: LIST_NAME(),
        RequestJSON: buildPayload(payload, userId, shape),
      });
      setCachedWriteShape(shape);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  console.error("Failed to write NPD Approver Comments:", lastError);
  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to save approver comments.");
}

/**
 * Writes Approver / MIS Rework / Reject / Approve comments into NPD_ApproverComments.
 *
 * Columns: Title, Comments, User, Role, NPDRequest, ActionVia, Action.
 */
export async function addNpdApproverComment(
  payload: INpdApproverCommentPayload,
): Promise<void> {
  const requestId = Number(payload.requestId);
  if (!requestId || requestId <= 0) {
    throw new Error("NPD request ID is required for approver comments.");
  }

  let userId = payload.userIds.find((id) => Number.isFinite(id) && id > 0) || 0;

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

  const existingShape = cachedWriteShape;
  if (existingShape) {
    const ok = await tryAddWithShape(payload, userId, existingShape);
    if (ok) {
      return;
    }
    setCachedWriteShape(null);
  }

  await addCommentByProbing(payload, userId);
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
    FIELDS.Action,
    "Created",
    `${FIELDS.NPDRequestId}`,
    `${FIELDS.NPDRequest}/Id`,
    `${FIELDS.User}/Id`,
    `${FIELDS.User}/Title`,
    `${FIELDS.User}/EMail`,
    "Author/Id",
    "Author/Title",
    "Author/EMail",
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
      `${FIELDS.NPDRequest},${FIELDS.User},Author`,
      selectWithPeople,
    );
  } catch {
    try {
      return await tryFetch(FIELDS.NPDRequestId);
    } catch {
      return [];
    }
  }
}
