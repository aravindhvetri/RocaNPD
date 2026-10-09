import { Config } from "./Config";
import type {
  IMaterialGroupAuditLogPayload,
  IMaterialGroupAuditLogRow,
} from "./Interface";
import { extractPersonEmails, normalizeEmail } from "./personFieldUtils";
import SPServices, { getSP } from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.MaterialGroupAuditLogs;
const FIELDS = Config.FieldNames.MaterialGroupAuditLogs;

interface IListFieldInfo {
  InternalName: string;
  Title: string;
  TypeAsString: string;
  Hidden?: boolean;
  ReadOnlyField?: boolean;
}

interface IAuditWriteSchema {
  actionField?: string;
  actionViaField?: string;
  formatConsultantId: (userId: number) => unknown;
  formatRequestId: (requestId: number) => unknown;
}

let cachedWriteSchema: IAuditWriteSchema | null = null;

function setCachedWriteSchema(value: IAuditWriteSchema | null): void {
  cachedWriteSchema = value;
}

export function formatAuditAction(action: string): string {
  const a = (action || "").trim().toLowerCase();
  if (a === "approve" || a === "approved") {
    return "Approved";
  }
  if (a === "reject" || a === "rejected") {
    return Config.MaterialGroupStatus.Rejected;
  }
  if (a === "rework" || a === "in rework") {
    return Config.MaterialGroupStatus.Rework;
  }
  if (a === "resubmit" || a === "resubmitted") {
    return "Resubmit";
  }
  if (a === "initiated" || a === "initiate" || a === "submit" || a === "submitted") {
    return "Initiated";
  }
  if (a === "complete" || a === "completed") {
    return Config.MaterialGroupStatus.Completed;
  }
  return action || "";
}

function resolveActionFromTitle(
  title: string,
  comments: string = "",
  role: string = "",
): string {
  const combined = `${title} ${comments}`;
  if (/reject/i.test(combined)) {
    return Config.MaterialGroupStatus.Rejected;
  }
  if (/resubmit/i.test(combined)) {
    return "Resubmit";
  }
  if (/initiat/i.test(combined)) {
    return "Initiated";
  }
  if (/rework/i.test(combined)) {
    return Config.MaterialGroupStatus.Rework;
  }
  if (/complete/i.test(combined) || /approve/i.test(combined)) {
    return Config.MaterialGroupStatus.Completed;
  }
  if (role.toLowerCase() === "initiator") {
    return /rework/i.test(comments) ? "Resubmit" : "Initiated";
  }
  if (role.toLowerCase() === "consultant") {
    return Config.MaterialGroupStatus.Completed;
  }
  return title || "—";
}

function mapAuditRow(row: Record<string, unknown>): IMaterialGroupAuditLogRow {
  const userField =
    row[FIELDS.Consultant] ??
    row.Consultant ??
    row.Initiator ??
    row.User ??
    row.Author;
  const person = userField as
    | { Title?: string; EMail?: string; Email?: string }
    | undefined;
  const emails = extractPersonEmails(userField);
  const actionedBy =
    String(person?.Title || "").trim() ||
    emails[0] ||
    "—";
  const actionedByEmail =
    emails[0] ||
    String(person?.EMail || person?.Email || "").trim();

  const rawAction = String(
    row.Action ??
    row.ApproverAction ??
    row.ActionTaken ??
    row[FIELDS.Title] ??
    ""
  ).trim();

  let resolvedStatus = "";
  if (rawAction) {
    resolvedStatus = formatAuditAction(rawAction);
  }
  if (!resolvedStatus) {
    resolvedStatus = resolveActionFromTitle(
      String(row[FIELDS.Title] ?? ""),
      String(row[FIELDS.Comments] ?? ""),
      String(row[FIELDS.Role] ?? row.Role ?? "").trim(),
    );
  }

  return {
    id: Number(row.Id ?? row.ID) || 0,
    status: resolvedStatus,
    actionedBy,
    actionedByEmail: actionedByEmail || undefined,
    role: String(row[FIELDS.Role] ?? row.Role ?? "").trim(),
    comments: String(row[FIELDS.Comments] ?? "").trim(),
    created: row.Created ? String(row.Created) : undefined,
    actionVia:
      String(
        row[FIELDS.ActionVia] ??
        row.ActionVia ??
        row.Action_x0020_Via ??
        row["Action_x0020_Via"] ??
        row.Action_x0020_via ??
        row["Action_x0020_via"] ??
        row.actionVia ??
        row.Actionvia ??
        row.Action_Via ??
        row.Via ??
        row.ActionSource ??
        ""
      ).trim() ||
      (String(row[FIELDS.Role] ?? row.Role ?? "").trim().toLowerCase() === "initiator" ||
      resolvedStatus.toLowerCase() === "initiated" ||
      resolvedStatus.toLowerCase() === "resubmit"
        ? "System"
        : ""),
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

function matchesFieldName(
  field: IListFieldInfo,
  candidates: string[],
): boolean {
  const internal = (field.InternalName || "").toLowerCase();
  const title = (field.Title || "").toLowerCase();
  return candidates.some((candidate) => {
    const key = candidate.toLowerCase();
    return internal === key || title === key;
  });
}

function formatIdForFieldType(fieldType: string, id: number): unknown {
  const type = (fieldType || "").toLowerCase();
  if (type === "usermulti" || type === "lookupmulti") {
    return { results: [id] };
  }
  return id;
}

async function resolveAuditWriteSchema(): Promise<IAuditWriteSchema> {
  const existing = cachedWriteSchema;
  if (existing) {
    return existing;
  }

  const rows = (await getSP()
    .web.lists.getByTitle(LIST_NAME())
    .fields.select(
      "InternalName",
      "Title",
      "TypeAsString",
      "Hidden",
      "ReadOnlyField",
    )()) as IListFieldInfo[];

  const fields = (rows || []).filter(
    (field) => !field.Hidden && !field.ReadOnlyField,
  );

  const consultantField = fields.find((field) =>
    matchesFieldName(field, [FIELDS.Consultant, "Consultant", "User"]),
  );
  const requestField = fields.find((field) =>
    matchesFieldName(field, [
      FIELDS.MaterialGroupRequests,
      "MaterialGroupRequests",
      "Material Group Requests",
    ]),
  );
  const actionField = fields.find((field) =>
    matchesFieldName(field, [
      FIELDS.Action,
      "Action",
      "ApproverAction",
      "ActionTaken",
    ]),
  );
  const actionViaField = fields.find((field) =>
    matchesFieldName(field, [
      FIELDS.ActionVia,
      "Action Via",
      "ActionVia",
      "Action_x0020_Via",
      "Via",
    ]),
  );

  const consultantType = consultantField?.TypeAsString || "User";
  const requestType = requestField?.TypeAsString || "Lookup";

  const schema: IAuditWriteSchema = {
    actionField: actionField?.InternalName || FIELDS.Action,
    actionViaField: actionViaField?.InternalName,
    formatConsultantId: (userId: number) =>
      formatIdForFieldType(consultantType, userId),
    formatRequestId: (requestId: number) =>
      formatIdForFieldType(requestType, requestId),
  };
  setCachedWriteSchema(schema);
  return schema;
}

/**
 * Writes Approver Rework / Reject / Complete comments into NPD_MaterialGroupAuditLogs.
 * Resolves real field internal names once (cached) to avoid 400 probe storms.
 */
export async function addMaterialGroupAuditLog(
  payload: IMaterialGroupAuditLogPayload,
): Promise<void> {
  const isInitiator =
    (payload.role || "").trim().toLowerCase() === "initiator" ||
    payload.action === "Initiated" ||
    payload.action === "Resubmit";
  const defaultComments =
    payload.action === "Resubmit"
      ? "Request resubmitted"
      : isInitiator
        ? "Request initiated"
        : "Completed";
  const comments = payload.comments ? payload.comments.trim() : defaultComments;

  const requestListItemId = Number(payload.requestListItemId);
  if (!requestListItemId || requestListItemId <= 0) {
    throw new Error("Material Group request ID is required for audit log.");
  }

  const consultantUserId = await resolveConsultantSiteUserId(
    Number(payload.consultantUserId) || 0,
    payload.consultantEmail,
  );

  const targetAction = formatAuditAction(payload.action);
  const rawVia = String(payload.actionVia || "").trim();
  const targetVia = rawVia.toLowerCase() === "mail" ? "Mail" : "System";

  const buildPayload = (schema: IAuditWriteSchema): Record<string, unknown> => {
    const requestJson: Record<string, unknown> = {
      // Title must remain empty (list standard).
      [FIELDS.Title]: "",
      [FIELDS.Comments]: comments,
      [FIELDS.MaterialGroupRequestsId]: schema.formatRequestId(requestListItemId),
      // Action column stores Approved / Rejected / Completed / etc.
      [FIELDS.Action]: targetAction,
    };
    if (payload.role) {
      requestJson[FIELDS.Role] = payload.role;
    }
    if (consultantUserId > 0) {
      requestJson[FIELDS.ConsultantId] = schema.formatConsultantId(
        consultantUserId,
      );
    }
    // Prefer discovered ActionVia field name; fall back to Config internal name.
    requestJson[schema.actionViaField || FIELDS.ActionVia] = targetVia;
    return requestJson;
  };

  try {
    const schema = await resolveAuditWriteSchema();
    await SPServices.SPAddItem({
      Listname: LIST_NAME(),
      RequestJSON: buildPayload(schema),
    });
    return;
  } catch (primaryError) {
    setCachedWriteSchema(null);
    console.warn(
      "MG audit log schema write failed; trying short probe:",
      primaryError,
    );
  }

  // Short fallback: always include Action; try Action Via variants.
  const viaKeys = [FIELDS.ActionVia, "Action_x0020_Via", undefined] as const;
  let lastError: unknown;

  for (const viaKey of viaKeys) {
    const requestJson: Record<string, unknown> = {
      [FIELDS.Title]: "",
      [FIELDS.Comments]: comments,
      [FIELDS.MaterialGroupRequestsId]: requestListItemId,
      [FIELDS.Action]: targetAction,
    };
    if (payload.role) {
      requestJson[FIELDS.Role] = payload.role;
    }
    if (consultantUserId > 0) {
      requestJson[FIELDS.ConsultantId] = consultantUserId;
    }
    if (viaKey) {
      requestJson[viaKey] = targetVia;
    }

    try {
      await SPServices.SPAddItem({
        Listname: LIST_NAME(),
        RequestJSON: requestJson,
      });
      setCachedWriteSchema({
        actionField: FIELDS.Action,
        actionViaField: viaKey,
        formatConsultantId: (id) => id,
        formatRequestId: (id) => id,
      });
      return;
    } catch (error) {
      lastError = error;
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

  const selectWithPeopleAndAction = [
    "Id",
    FIELDS.Title,
    FIELDS.Comments,
    FIELDS.Role,
    FIELDS.ActionVia,
    "Action",
    "Created",
    `${FIELDS.MaterialGroupRequestsId}`,
    `${FIELDS.MaterialGroupRequests}/Id`,
    `${FIELDS.Consultant}/Id`,
    `${FIELDS.Consultant}/Title`,
    `${FIELDS.Consultant}/EMail`,
    "Author/Id",
    "Author/Title",
    "Author/EMail",
  ].join(",");

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
    "Author/Id",
    "Author/Title",
    "Author/EMail",
  ].join(",");

  const tryFetch = async (
    filterKey: string,
    expand?: string,
    select?: string,
  ): Promise<IMaterialGroupAuditLogRow[]> => {
    const rows = (await SPServices.SPReadItems({
      Listname: LIST_NAME(),
      Select: select || selectWithPeopleAndAction,
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
      `${FIELDS.MaterialGroupRequests},${FIELDS.Consultant},Author`,
      selectWithPeopleAndAction,
    );
  } catch {
    try {
      return await tryFetch(
        `${FIELDS.MaterialGroupRequests}/Id`,
        `${FIELDS.MaterialGroupRequests},${FIELDS.Consultant},Author`,
        selectWithPeople,
      );
    } catch {
      try {
        return await tryFetch(
          FIELDS.MaterialGroupRequestsId,
          `${FIELDS.Consultant},Author`,
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
            "Author/Id",
            "Author/Title",
            "Author/EMail",
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
}

/**
 * Loads Consultant emails who Completed or Rejected each Material Group request.
 * Key = NPD_MaterialGroupRequests item Id. Used for historical list visibility
 * when ApproversMaster Consultant changes.
 */
export async function fetchMgTerminalConsultantEmailsByRequestId(): Promise<
  Map<number, string[]>
> {
  const result = new Map<number, string[]>();
  const completed = Config.MaterialGroupStatus.Completed.toLowerCase();
  const rejected = Config.MaterialGroupStatus.Rejected.toLowerCase();

  const tryLoad = async (
    select: string,
    expand: string | undefined,
  ): Promise<Record<string, unknown>[]> =>
    (await SPServices.SPReadItems({
      Listname: LIST_NAME(),
      Select: select,
      Expand: expand,
      Orderby: "Id",
      Orderbydecorasc: false,
      Topcount: 5000,
    })) as Record<string, unknown>[];

  let rows: Record<string, unknown>[] = [];
  try {
    rows = await tryLoad(
      [
        "Id",
        FIELDS.Title,
        FIELDS.Comments,
        FIELDS.Role,
        `${FIELDS.MaterialGroupRequests}/Id`,
        `${FIELDS.Consultant}/EMail`,
        `${FIELDS.Consultant}/Title`,
        "Author/EMail",
      ].join(","),
      `${FIELDS.MaterialGroupRequests},${FIELDS.Consultant},Author`,
    );
  } catch {
    try {
      rows = await tryLoad(
        [
          "Id",
          FIELDS.Title,
          FIELDS.Comments,
          FIELDS.Role,
          FIELDS.MaterialGroupRequestsId,
          `${FIELDS.Consultant}/EMail`,
          "Author/EMail",
        ].join(","),
        `${FIELDS.Consultant},Author`,
      );
    } catch (error) {
      console.warn(
        "Could not load MG audit logs for historical Consultant scope:",
        error,
      );
      return result;
    }
  }

  rows.forEach((row) => {
    const mapped = mapAuditRow(row);
    const status = (mapped.status || "").trim().toLowerCase();
    if (status !== completed && status !== rejected) {
      return;
    }

    const role = (mapped.role || "").trim().toLowerCase();
    if (role && role !== Config.Roles.Consultant.toLowerCase()) {
      // Prefer Consultant-role rows; still accept blank role with terminal action.
      if (role === Config.Roles.Initiator.toLowerCase()) {
        return;
      }
    }

    const requestRef =
      row[FIELDS.MaterialGroupRequests] ??
      row.MaterialGroupRequests ??
      row[FIELDS.MaterialGroupRequestsId] ??
      row.MaterialGroupRequestsId;
    let requestId = 0;
    if (typeof requestRef === "number") {
      requestId = requestRef;
    } else if (requestRef && typeof requestRef === "object") {
      requestId = Number(
        (requestRef as { Id?: number; ID?: number }).Id ??
          (requestRef as { Id?: number; ID?: number }).ID,
      );
    } else {
      requestId = Number(requestRef);
    }
    if (!Number.isFinite(requestId) || requestId <= 0) {
      return;
    }

    const email = normalizeEmail(mapped.actionedByEmail || "");
    if (!email) {
      return;
    }

    const existing = result.get(requestId) || [];
    if (!existing.includes(email)) {
      existing.push(email);
      result.set(requestId, existing);
    }
  });

  return result;
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
