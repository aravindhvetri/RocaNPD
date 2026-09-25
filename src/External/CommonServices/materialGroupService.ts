import { Config } from "./Config";
import type {
  IMaterialGroupConfigOption,
  IMaterialGroupEntryRow,
  IMaterialGroupGroupedRequest,
  IMaterialGroupHydratePayload,
  IMaterialGroupRequestJsonEntry,
} from "./Interface";
import { getLookupTitles } from "./lookupFieldUtils";
import { createLookup } from "./lookupService";
import { fetchActiveLookupTypes } from "./lookupTypeService";
import {
  addMaterialGroupAuditLog,
  fetchLatestMaterialGroupAuditComment,
  fetchMaterialGroupAuditLogs,
} from "./materialGroupAuditLogService";
import {
  generateNextMgRequestId,
  isMgRequestIdTitle,
} from "./materialGroupIdService";
import {
  fetchConsultantApproverInfo,
  sendMaterialGroupInitiatorNotification,
  sendMaterialGroupSubmitNotification,
} from "./materialGroupNotificationService";
import { extractPersonEmails, normalizeEmail } from "./personFieldUtils";
import SPServices from "./SPServices";

const CONFIG_LIST = (): string => Config.ListNames.MaterialGroupConfig;
const REQUESTS_LIST = (): string => Config.ListNames.MaterialGroupRequests;

/** Normalize master names for fuzzy match (e.g. "Color(MGP1A)" vs "Color (MGP1A)"). */
function normalizeMasterKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()]/g, "")
    .trim();
}

/** Read one RequestsJSON row — supports PascalCase / camelCase keys. */
function normalizeRequestsJsonEntry(
  raw: Record<string, unknown>,
): IMaterialGroupRequestJsonEntry {
  return {
    LookupId: String(raw.LookupId ?? raw.lookupId ?? "").trim(),
    LookupName: String(raw.LookupName ?? raw.lookupName ?? "").trim(),
    Code: String(raw.Code ?? raw.code ?? "").trim(),
    Description: String(raw.Description ?? raw.description ?? "").trim(),
  };
}

/**
 * Parse RequestsJSON from SharePoint. Handles string JSON and already-parsed arrays
 * (String(array) would become "[object Object]" and break JSON.parse).
 */
function parseRequestsJson(raw: unknown): IMaterialGroupRequestJsonEntry[] {
  if (raw == null || raw === "") {
    return [];
  }

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object",
    )
    .map(normalizeRequestsJsonEntry);
}

/**
 * Map a RequestsJSON entry to an NPD_MaterialGroupConfig checkbox option.
 * Uses LookupId → RelatedFields / LookupName → Title only (not request MaterialGroupConfig ids).
 */
function resolveConfigForJsonEntry(
  entry: IMaterialGroupRequestJsonEntry,
  configs: IMaterialGroupConfigOption[],
): IMaterialGroupConfigOption | undefined {
  const lookupId = Number(entry.LookupId);
  const nameKey = normalizeMasterKey(entry.LookupName || "");

  if (lookupId > 0) {
    const byRelatedId = configs.find((c) => c.relatedFieldId === lookupId);
    if (byRelatedId) {
      return byRelatedId;
    }
  }

  if (nameKey) {
    const byName = configs.find(
      (c) =>
        normalizeMasterKey(c.title) === nameKey ||
        normalizeMasterKey(c.relatedFieldTitle || "") === nameKey,
    );
    if (byName) {
      return byName;
    }
  }

  return undefined;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

/**
 * Loads dynamic checkbox options from NPD_MaterialGroupConfig list.
 * Expands RelatedFields to read ID and Title from the lookup column.
 */
export async function fetchMaterialGroupConfigs(): Promise<
  IMaterialGroupConfigOption[]
> {
  try {
    const rawItems = (await SPServices.SPReadItems({
      Listname: CONFIG_LIST(),
      Select: "Id,Title,RelatedFieldsId,RelatedFields/Id,RelatedFields/Title",
      Expand: "RelatedFields",
      Orderby: "Id",
      Orderbydecorasc: true,
      Topcount: 5000,
    })) as Record<string, unknown>[];

    const results: IMaterialGroupConfigOption[] = [];

    for (const item of rawItems) {
      const id = Number(item.Id ?? item.ID);
      if (!id) {
        continue;
      }

      // Check soft delete if field exists
      if (item.IsDeleted === true || item.IsDeleted === "Yes") {
        continue;
      }

      // RelatedFields → Lookup Type ID used as RequestsJSON.LookupId
      let relatedFieldId = Number(item.RelatedFieldsId) || 0;
      let relatedFieldTitle = String(item.Title ?? "").trim();

      const rf = item.RelatedFields as any;
      if (rf) {
        if (Array.isArray(rf) && rf.length > 0) {
          relatedFieldId = Number(rf[0].Id ?? rf[0].ID ?? relatedFieldId);
          relatedFieldTitle = String(
            rf[0].Title ?? relatedFieldTitle,
          ).trim();
        } else if (Array.isArray(rf.results) && rf.results.length > 0) {
          relatedFieldId = Number(
            rf.results[0].Id ?? rf.results[0].ID ?? relatedFieldId,
          );
          relatedFieldTitle = String(
            rf.results[0].Title ?? relatedFieldTitle,
          ).trim();
        } else if (
          typeof rf === "object" &&
          (rf.Id !== undefined || rf.ID !== undefined)
        ) {
          relatedFieldId = Number(rf.Id ?? rf.ID ?? relatedFieldId);
          relatedFieldTitle = String(rf.Title ?? relatedFieldTitle).trim();
        }
      }

      const lookupTitles = getLookupTitles(item.RelatedFields);
      const relatedTitle =
        lookupTitles.length > 0 && lookupTitles[0]
          ? lookupTitles[0].trim()
          : relatedFieldTitle;
      const title = String(item.Title ?? "").trim() || relatedTitle;

      if (title || relatedTitle) {
        results.push({
          id,
          title: title || relatedTitle,
          relatedFieldId: relatedFieldId || id,
          relatedFieldTitle: relatedTitle || title,
        });
      }
    }

    return results;
  } catch (error) {
    throw error;
  }
}

/**
 * Helper to build the RequestsJSON array and collect MaterialGroupConfig multi-lookup IDs.
 * - MaterialGroupConfigId stores NPD_MaterialGroupConfig item IDs (config.id).
 * - RequestsJSON.LookupId stores RelatedFields ID (Lookup Type ID used on Complete).
 */
function buildRequestsJsonAndLookupIds(
  selectedConfigIds: number[],
  entriesByConfigId: Record<number, IMaterialGroupEntryRow[]>,
  configs: IMaterialGroupConfigOption[],
): {
  requestsJson: string;
  /** NPD_MaterialGroupConfig list item IDs for the multi-lookup column. */
  configLookupIds: number[];
  rawEntries: IMaterialGroupRequestJsonEntry[];
} {
  const configMap = new Map<number, IMaterialGroupConfigOption>(
    configs.map((c) => [c.id, c]),
  );

  const rawEntries: IMaterialGroupRequestJsonEntry[] = [];
  const configIdSet = new Set<number>();

  for (const configId of selectedConfigIds) {
    const cfg = configMap.get(configId);
    const relatedLookupTypeId =
      cfg?.relatedFieldId && cfg.relatedFieldId > 0
        ? cfg.relatedFieldId
        : configId;
    const lookupIdStr = String(relatedLookupTypeId);
    const lookupName =
      cfg?.relatedFieldTitle || cfg?.title || `Master (${configId})`;

    const rows = entriesByConfigId[configId] || [];
    let hasEntryForConfig = false;

    for (const row of rows) {
      const code = (row.code || "").trim();
      const description = (row.description || "").trim();

      if (code || description) {
        hasEntryForConfig = true;
        rawEntries.push({
          LookupId: lookupIdStr,
          LookupName: lookupName,
          Code: code,
          Description: description,
        });
      }
    }

    if (hasEntryForConfig) {
      // Multi-lookup on NPD_MaterialGroupRequests → NPD_MaterialGroupConfig items
      configIdSet.add(configId);
    }
  }

  return {
    requestsJson: JSON.stringify(rawEntries),
    configLookupIds: Array.from(configIdSet),
    rawEntries,
  };
}

/**
 * Saves or updates a single record in NPD_MaterialGroupRequests,
 * setting the MaterialGroupConfig multi-lookup column.
 */
async function saveOrUpdateMaterialGroupRecord(
  id: number | undefined,
  fields: Record<string, unknown>,
  configLookupIds: number[],
): Promise<number> {
  // PnPjs expects a plain number[] for multi-lookup Id fields (not { results: [] }).
  const withArray = {
    ...fields,
    MaterialGroupConfigId: configLookupIds,
  };
  const withResults = {
    ...fields,
    MaterialGroupConfigId: { results: configLookupIds },
  };

  const tryWrite = async (payload: Record<string, unknown>): Promise<number> => {
    if (id && id > 0) {
      await SPServices.SPUpdateItem({
        Listname: REQUESTS_LIST(),
        ID: id,
        RequestJSON: payload,
      });
      return id;
    }

    const created = await SPServices.SPAddItem({
      Listname: REQUESTS_LIST(),
      RequestJSON: payload,
    });
    const newId = Number(
      created?.data?.Id ??
        created?.data?.ID ??
        created?.Id ??
        created?.ID,
    );
    if (!newId) {
      throw new Error("Item was created but ID could not be read.");
    }
    return newId;
  };

  try {
    return await tryWrite(withArray);
  } catch {
    return await tryWrite(withResults);
  }
}

export interface ISaveMaterialGroupDraftParams {
  id?: number;
  guid?: string;
  selectedConfigIds: number[];
  entriesByConfigId: Record<number, IMaterialGroupEntryRow[]>;
  actorEmail?: string;
  actorId?: number;
  actorName?: string;
}

/**
 * Saves Material Group request into NPD_MaterialGroupRequests as Draft.
 * Single list record using RequestsJSON.
 * Saves Title as empty string "" (never saves '-' in list).
 */
export async function saveMaterialGroupDraft(
  params: ISaveMaterialGroupDraftParams,
): Promise<{ id: number; guid: string }> {
  const { id, selectedConfigIds, entriesByConfigId, actorEmail, actorId } = params;

  let initiatorId = actorId;
  if (actorEmail && !initiatorId) {
    try {
      const resolvedId = await SPServices.ensureSiteUserId(actorEmail);
      if (resolvedId) {
        initiatorId = resolvedId;
      }
    } catch {
      // Keep actorId if ensure fails
    }
  }

  const configs = await fetchMaterialGroupConfigs().catch(() => []);
  const { requestsJson, configLookupIds, rawEntries } = buildRequestsJsonAndLookupIds(
    selectedConfigIds,
    entriesByConfigId,
    configs,
  );

  if (!rawEntries.length) {
    throw new Error("Please add at least one entry before saving draft.");
  }

  const targetId = id && id > 0 ? id : Number(params.guid) || undefined;

  const savedId = await saveOrUpdateMaterialGroupRecord(
    targetId,
    {
      Title: "", // Empty string when adding data as Draft
      Status: Config.MaterialGroupStatus.Draft,
      RequestsJSON: requestsJson,
      ...(initiatorId ? { InitiatorId: initiatorId } : {}),
    },
    configLookupIds,
  );

  return { id: savedId, guid: String(savedId) };
}

export interface ISubmitMaterialGroupRequestParams {
  id?: number;
  guid?: string;
  selectedConfigIds: number[];
  entriesByConfigId: Record<number, IMaterialGroupEntryRow[]>;
  actorEmail?: string;
  actorId?: number;
  actorName?: string;
  masterTitles?: Record<number, string>;
  existingRequestId?: string;
}

/**
 * Submits Material Group request for Consultant review.
 * Generates sequential MG-YYYY-### ID, sets Title = requestId, Status = "Pending",
 * and dispatches Consultant email notification.
 */
export async function submitMaterialGroupRequest(
  params: ISubmitMaterialGroupRequestParams,
): Promise<{ id: number; guid: string; requestId: string }> {
  const {
    id,
    selectedConfigIds,
    entriesByConfigId,
    actorEmail,
    actorId,
    actorName,
    masterTitles,
    existingRequestId,
  } = params;

  let initiatorId = actorId;
  if (actorEmail && !initiatorId) {
    try {
      const resolvedId = await SPServices.ensureSiteUserId(actorEmail);
      if (resolvedId) {
        initiatorId = resolvedId;
      }
    } catch {
      // Keep actorId if ensure fails
    }
  }

  const configs = await fetchMaterialGroupConfigs().catch(() => []);
  const { requestsJson, configLookupIds, rawEntries } = buildRequestsJsonAndLookupIds(
    selectedConfigIds,
    entriesByConfigId,
    configs,
  );

  if (!rawEntries.length) {
    throw new Error("Please add at least one entry before submitting.");
  }

  const requestId =
    existingRequestId && isMgRequestIdTitle(existingRequestId)
      ? existingRequestId
      : await generateNextMgRequestId();

  const targetId = id && id > 0 ? id : Number(params.guid) || undefined;

  const savedId = await saveOrUpdateMaterialGroupRecord(
    targetId,
    {
      Title: requestId,
      Status: Config.MaterialGroupStatus.Pending,
      RequestsJSON: requestsJson,
      ...(initiatorId ? { InitiatorId: initiatorId } : {}),
    },
    configLookupIds,
  );

  // Dispatch email notification to Consultant asynchronously
  void sendMaterialGroupSubmitNotification({
    requestId,
    requestListItemId: savedId,
    initiatorName: actorName || actorEmail || "Initiator",
    initiatorEmail: actorEmail || "",
    configuredMasters: selectedConfigIds.map(
      (cfgId) => masterTitles?.[cfgId] || `Master (${cfgId})`,
    ),
    entriesCount: rawEntries.length,
  }).catch((err) => {
    console.warn("Failed to send Consultant submission email:", err);
  });

  return { id: savedId, guid: String(savedId), requestId };
}

export interface IFetchGroupedRequestsParams {
  userEmail: string;
  userId?: number;
  userLoginName?: string;
  assignedRoles: string[];
  variant?: "all" | "draft-rework" | "pending" | "completed";
}

function statusEquals(actual: string, expected: string): boolean {
  return actual.trim().toLowerCase() === expected.trim().toLowerCase();
}

function resolveItemOwnerEmail(
  item: Record<string, unknown>,
): { name: string; email: string; userId: number } {
  const initiatorEmails = extractPersonEmails(item.Initiator);
  const authorEmails = extractPersonEmails(item.Author);
  const initiator = item.Initiator as
    | { Id?: number; Title?: string; EMail?: string; Email?: string }
    | undefined;
  const author = item.Author as
    | { Id?: number; Title?: string; EMail?: string; Email?: string }
    | undefined;

  const email =
    initiatorEmails[0] ||
    authorEmails[0] ||
    String(initiator?.EMail || initiator?.Email || "").trim() ||
    String(author?.EMail || author?.Email || "").trim();

  const name =
    String(initiator?.Title || "").trim() ||
    String(author?.Title || "").trim() ||
    "Initiator";

  const userId =
    Number(initiator?.Id) ||
    Number(author?.Id) ||
    Number(item.InitiatorId) ||
    Number(item.AuthorId) ||
    0;

  return { name, email, userId };
}

function isOwnedByCurrentUser(
  owner: { email: string; userId: number },
  userEmail: string,
  userId?: number,
  userLoginName?: string,
): boolean {
  const normalizedUserEmail = normalizeEmail(userEmail || "");
  const ownerEmail = normalizeEmail(owner.email || "");

  if (ownerEmail && normalizedUserEmail && ownerEmail === normalizedUserEmail) {
    return true;
  }

  if (userId && owner.userId && userId === owner.userId) {
    return true;
  }

  // Claims loginName tail (e.g. i:0#.f|membership|user@domain)
  if (userLoginName && ownerEmail) {
    const claimsTail = userLoginName.split("|").pop() || "";
    if (normalizeEmail(claimsTail) === ownerEmail) {
      return true;
    }
  }

  // If we cannot resolve owner identity, do not hide the row for the list owner
  // (avoids empty Draft/ReWork when Initiator/EMail expand is missing).
  if (!ownerEmail && (!owner.userId || owner.userId <= 0)) {
    return true;
  }

  return false;
}

/**
 * Fetches Material Group requests from NPD_MaterialGroupRequests.
 * List display is driven by Status + RequestsJSON (Configured Masters / entries).
 */
export async function fetchGroupedMaterialGroupRequests(
  params: IFetchGroupedRequestsParams,
): Promise<IMaterialGroupGroupedRequest[]> {
  const {
    userEmail,
    userId,
    userLoginName,
    assignedRoles,
    variant = "all",
  } = params;
  const normalizedUserEmail = normalizeEmail(userEmail || "");

  const isConsultant = assignedRoles.some(
    (role) =>
      role.trim().toLowerCase() === Config.Roles.Consultant.toLowerCase(),
  );
  const isAdmin = assignedRoles.some(
    (role) => role.trim().toLowerCase() === Config.Roles.Admin.toLowerCase(),
  );

  // RequestsJSON + Status only for row content — do not Expand MaterialGroupConfig here
  const selectFields = [
    "Id",
    "Title",
    "RequestsJSON",
    "Status",
    "Created",
    "Modified",
    "InitiatorId",
    "Initiator/Id",
    "Initiator/Title",
    "Initiator/EMail",
    "AuthorId",
    "Author/Id",
    "Author/Title",
    "Author/EMail",
  ];

  let rawItems: Record<string, unknown>[] = [];
  try {
    rawItems = (await SPServices.SPReadItems({
      Listname: REQUESTS_LIST(),
      Select: selectFields.join(","),
      Expand: "Initiator,Author",
      Orderby: "Modified",
      Orderbydecorasc: false,
      Topcount: 5000,
    })) as Record<string, unknown>[];
  } catch (error) {
    // Fallback without person Expand if site schema differs
    console.warn("MG list fetch with Expand failed, retrying minimal select:", error);
    rawItems = (await SPServices.SPReadItems({
      Listname: REQUESTS_LIST(),
      Select: "Id,Title,RequestsJSON,Status,Created,Modified,AuthorId,InitiatorId",
      Orderby: "Modified",
      Orderbydecorasc: false,
      Topcount: 5000,
    })) as Record<string, unknown>[];
  }

  const consultantInfo = await fetchConsultantApproverInfo().catch(() => null);
  const parsedRequests: IMaterialGroupGroupedRequest[] = [];

  for (const item of rawItems) {
    const id = Number(item.Id ?? item.ID);
    if (!id) {
      continue;
    }

    const rawTitle = String(item.Title ?? "").trim();
    const requestId = isMgRequestIdTitle(rawTitle) ? rawTitle : "-";
    const owner = resolveItemOwnerEmail(item);
    const status = String(
      item.Status ?? Config.MaterialGroupStatus.Draft,
    ).trim();

    const entries = parseRequestsJson(item.RequestsJSON);
    const masterTitleSet = new Set<string>();
    const masterIdSet = new Set<number>();

    for (const entry of entries) {
      if (entry.LookupName) {
        masterTitleSet.add(entry.LookupName.trim());
      }
      const num = Number(entry.LookupId);
      if (num > 0) {
        masterIdSet.add(num);
      }
    }

    // Role filtering — Initiator sees own; Consultant sees non-draft + own drafts
    if (!isAdmin) {
      const isOwner = isOwnedByCurrentUser(
        owner,
        normalizedUserEmail,
        userId,
        userLoginName,
      );

      if (isConsultant) {
        if (statusEquals(status, Config.MaterialGroupStatus.Draft) && !isOwner) {
          continue;
        }
      } else if (!isOwner) {
        continue;
      }
    }

    // Variant filtering (case-insensitive Status)
    if (variant === "draft-rework") {
      if (
        !statusEquals(status, Config.MaterialGroupStatus.Draft) &&
        !statusEquals(status, Config.MaterialGroupStatus.Rework)
      ) {
        continue;
      }
    } else if (variant === "pending") {
      if (!statusEquals(status, Config.MaterialGroupStatus.Pending)) {
        continue;
      }
    } else if (variant === "completed") {
      if (!statusEquals(status, Config.MaterialGroupStatus.Completed)) {
        continue;
      }
    }

    let currentApprover = "—";
    let currentApproverEmail = "";
    if (statusEquals(status, Config.MaterialGroupStatus.Pending)) {
      if (consultantInfo) {
        currentApprover = consultantInfo.name;
        currentApproverEmail = consultantInfo.email;
      } else {
        currentApprover = Config.Roles.Consultant;
      }
    }

    parsedRequests.push({
      id,
      guid: String(id),
      requestId,
      configuredMasters: Array.from(masterTitleSet),
      configuredMasterIds: Array.from(masterIdSet),
      entriesCount: entries.length,
      initiatorName: owner.name,
      initiatorEmail: owner.email,
      createdDate: item.Created ? String(item.Created) : "",
      status,
      currentApprover,
      currentApproverEmail,
      requestsJson: entries,
    });
  }

  return parsedRequests.sort((a, b) => {
    const dateA = new Date(a.createdDate).getTime();
    const dateB = new Date(b.createdDate).getTime();
    return dateB - dateA;
  });
}

/**
 * Loads a Material Group request by list item ID and hydrates the form from RequestsJSON.
 */
export async function fetchMaterialGroupRequestById(
  idOrGuid: number | string,
): Promise<IMaterialGroupHydratePayload> {
  const numericId = Number(idOrGuid);

  const selectWithPeople = [
    "Id",
    "Title",
    "RequestsJSON",
    "Status",
    "Created",
    "Modified",
    "Initiator/Id",
    "Initiator/Title",
    "Initiator/EMail",
    "Author/Id",
    "Author/Title",
    "Author/EMail",
  ].join(",");
  const selectMinimal = "Id,Title,RequestsJSON,Status,Created,Modified";

  let rawItem: Record<string, unknown> | null = null;

  const normalizeItem = (
    byIdRaw: unknown,
  ): Record<string, unknown> | null => {
    const byId = Array.isArray(byIdRaw)
      ? (byIdRaw[0] as Record<string, unknown> | undefined)
      : (byIdRaw as Record<string, unknown> | undefined);
    if (byId && (byId.Id != null || byId.ID != null)) {
      return byId;
    }
    return null;
  };

  const readById = async (id: number): Promise<Record<string, unknown> | null> => {
    // Prefer people Expand so Initiator email is available for Rework notifications
    try {
      const item = normalizeItem(
        await SPServices.SPReadItemUsingId({
          Listname: REQUESTS_LIST(),
          SelectedId: id,
          Select: selectWithPeople,
          Expand: "Initiator,Author",
        }),
      );
      if (item) {
        return item;
      }
    } catch (error) {
      console.warn("MG getById with people Expand failed:", error);
    }

    try {
      const item = normalizeItem(
        await SPServices.SPReadItemUsingId({
          Listname: REQUESTS_LIST(),
          SelectedId: id,
          Select: selectMinimal,
        }),
      );
      if (item) {
        return item;
      }
    } catch (error) {
      console.warn("MG getById minimal failed:", error);
    }

    return null;
  };

  const readByFilter = async (
    id: number,
  ): Promise<Record<string, unknown> | null> => {
    const attempts: Array<{
      Select: string;
      Expand?: string;
      FilterKey: string;
    }> = [
      { Select: selectMinimal, FilterKey: "Id" },
      { Select: selectMinimal, FilterKey: "ID" },
      {
        Select: selectWithPeople,
        Expand: "Initiator,Author",
        FilterKey: "Id",
      },
    ];

    for (const attempt of attempts) {
      try {
        const items = (await SPServices.SPReadItems({
          Listname: REQUESTS_LIST(),
          Select: attempt.Select,
          Expand: attempt.Expand,
          Filter: [
            {
              FilterKey: attempt.FilterKey,
              Operator: "eq",
              FilterValue: String(id),
            },
          ],
          Topcount: 1,
        })) as Record<string, unknown>[];
        if (items.length > 0) {
          return items[0];
        }
      } catch (error) {
        console.warn(
          `MG filter by ${attempt.FilterKey} failed:`,
          error,
        );
      }
    }

    return null;
  };

  if (Number.isFinite(numericId) && numericId > 0) {
    rawItem = await readById(numericId);
    if (!rawItem) {
      rawItem = await readByFilter(numericId);
    }
  } else if (typeof idOrGuid === "string" && idOrGuid.trim()) {
    try {
      const items = (await SPServices.SPReadItems({
        Listname: REQUESTS_LIST(),
        Select: selectWithPeople,
        Expand: "Initiator,Author",
        Filter: [
          { FilterKey: "Title", Operator: "eq", FilterValue: idOrGuid.trim() },
        ],
        Topcount: 1,
      })) as Record<string, unknown>[];
      if (items.length > 0) {
        rawItem = items[0];
      }
    } catch {
      // try minimal title filter
      try {
        const items = (await SPServices.SPReadItems({
          Listname: REQUESTS_LIST(),
          Select: selectMinimal,
          Filter: [
            {
              FilterKey: "Title",
              Operator: "eq",
              FilterValue: idOrGuid.trim(),
            },
          ],
          Topcount: 1,
        })) as Record<string, unknown>[];
        if (items.length > 0) {
          rawItem = items[0];
        }
      } catch {
        // not found
      }
    }
  }

  if (!rawItem) {
    throw new Error(`Material Group request with ID ${idOrGuid} not found.`);
  }

  const itemId = Number(rawItem.Id ?? rawItem.ID);
  const rawTitle = String(rawItem.Title ?? "").trim();
  const requestId = isMgRequestIdTitle(rawTitle) ? rawTitle : "-";
  const status = String(
    rawItem.Status ?? Config.MaterialGroupStatus.Draft,
  ).trim();

  const ownerEmails = extractPersonEmails(rawItem.Initiator).concat(
    extractPersonEmails(rawItem.Author),
  );
  const initiator = rawItem.Initiator as
    | { Title?: string; EMail?: string; Email?: string }
    | undefined;
  const author = rawItem.Author as
    | { Title?: string; EMail?: string; Email?: string }
    | undefined;
  const initiatorName =
    String(initiator?.Title || author?.Title || "").trim();
  const initiatorEmail =
    ownerEmails[0] ||
    String(
      initiator?.EMail ||
        initiator?.Email ||
        author?.EMail ||
        author?.Email ||
        "",
    ).trim();

  const configs = await fetchMaterialGroupConfigs().catch(
    () => [] as IMaterialGroupConfigOption[],
  );

  // Form population: Status + RequestsJSON only
  const entries = parseRequestsJson(rawItem.RequestsJSON);
  const selectedConfigIdSet = new Set<number>();
  const entriesByConfigId: Record<number, IMaterialGroupEntryRow[]> = {};

  entries.forEach((entry, idx) => {
    const matchedConfig = resolveConfigForJsonEntry(entry, configs);
    if (!matchedConfig) {
      console.warn(
        `MG hydrate: could not map RequestsJSON LookupId=${entry.LookupId} LookupName="${entry.LookupName}"`,
      );
      return;
    }

    const targetConfigId = matchedConfig.id;
    selectedConfigIdSet.add(targetConfigId);
    if (!entriesByConfigId[targetConfigId]) {
      entriesByConfigId[targetConfigId] = [];
    }
    entriesByConfigId[targetConfigId].push({
      tempId: `row_${itemId}_${idx}`,
      sharePointId: itemId,
      code: entry.Code,
      description: entry.Description,
    });
  });

  const auditLogs = await withTimeout(
    fetchMaterialGroupAuditLogs(itemId),
    5000,
    [] as Awaited<ReturnType<typeof fetchMaterialGroupAuditLogs>>,
  );
  const auditComment = auditLogs[0]
    ? {
        comments: auditLogs[0].comments,
        action: auditLogs[0].status,
      }
    : await withTimeout(
        fetchLatestMaterialGroupAuditComment(itemId),
        2000,
        null,
      );

  return {
    id: itemId,
    guid: String(itemId),
    requestId,
    status,
    selectedConfigIds: Array.from(selectedConfigIdSet),
    entriesByConfigId,
    initiatorName,
    initiatorEmail,
    auditLogs,
    latestComments: auditComment?.comments,
    latestCommentAction: auditComment?.action,
  };
}

/** Backward-compatible alias */
export const fetchMaterialGroupRequestByGuid = fetchMaterialGroupRequestById;

export interface IConsultantActionParams {
  id?: number;
  guid?: string;
  action: "Completed" | "Rework" | "Rejected";
  comments?: string;
  entriesByConfigId?: Record<number, IMaterialGroupEntryRow[]>;
  requestId?: string;
  initiatorName?: string;
  initiatorEmail?: string;
  configuredMasters?: string[];
  /** Acting Consultant (Person/Group on audit log). */
  actorUserId?: number;
  actorEmail?: string;
  actorName?: string;
  actorRole?: string;
}

/**
 * Creates / updates NPD_Lookup rows from completed RequestsJSON entries.
 * LookupId → LookupTypeId (or resolve by LookupName); Code → LookupCode; Description → Title.
 */
async function syncLookupMasterFromRequestsJson(
  entries: IMaterialGroupRequestJsonEntry[],
): Promise<void> {
  if (!entries.length) {
    return;
  }

  const lookupTypes = await fetchActiveLookupTypes().catch(() => []);
  const typeById = new Map(lookupTypes.map((t) => [t.Id, t]));
  const typeByTitle = new Map(
    lookupTypes.map((t) => [t.Title.trim().toLowerCase(), t]),
  );

  for (const entry of entries) {
    const code = (entry.Code || "").trim();
    const description = (entry.Description || "").trim();
    if (!code && !description) {
      continue;
    }

    let lookupTypeId = Number(entry.LookupId);
    const lookupName = (entry.LookupName || "").trim();

    if (!lookupTypeId || lookupTypeId <= 0 || !typeById.has(lookupTypeId)) {
      const byName = lookupName
        ? typeByTitle.get(lookupName.toLowerCase())
        : undefined;
      lookupTypeId = byName?.Id || 0;
    }

    if (!lookupTypeId) {
      console.warn(
        `Skipping Lookup sync — could not resolve LookupType for "${lookupName}" / LookupId ${entry.LookupId}.`,
      );
      continue;
    }

    await createLookup(lookupTypeId, description || code, code);
  }
}

/**
 * Updates Material Group request with Consultant action (Completed / Rework / Rejected),
 * writes audit comments, notifies Initiator on Rework/Reject, and syncs Lookup Master on Complete.
 */
export async function updateConsultantMaterialGroupAction(
  params: IConsultantActionParams,
): Promise<void> {
  const targetId = Number(params.id || params.guid);
  if (!targetId) {
    throw new Error("Invalid request ID for consultant action.");
  }

  const configs = await fetchMaterialGroupConfigs().catch(() => []);
  const configMap = new Map<number, IMaterialGroupConfigOption>(
    configs.map((c) => [c.id, c]),
  );

  // Build updated RequestsJSON with SAP codes entered by consultant
  const rawEntries: IMaterialGroupRequestJsonEntry[] = [];
  const configLookupIds: number[] = [];
  if (params.entriesByConfigId) {
    for (const [configIdStr, rows] of Object.entries(params.entriesByConfigId)) {
      const configId = Number(configIdStr);
      const cfg = configMap.get(configId);
      const relatedLookupTypeId =
        cfg?.relatedFieldId && cfg.relatedFieldId > 0
          ? cfg.relatedFieldId
          : configId;
      const lookupName =
        cfg?.relatedFieldTitle || cfg?.title || `Master (${configId})`;

      let hasRow = false;
      for (const row of rows) {
        const code = (row.code || "").trim();
        const description = (row.description || "").trim();
        if (!code && !description) {
          continue;
        }
        hasRow = true;
        rawEntries.push({
          LookupId: String(relatedLookupTypeId),
          LookupName: lookupName,
          Code: code,
          Description: description,
        });
      }
      if (hasRow) {
        configLookupIds.push(configId);
      }
    }
  }

  const status =
    params.action === "Completed"
      ? Config.MaterialGroupStatus.Completed
      : params.action === "Rework"
        ? Config.MaterialGroupStatus.Rework
        : Config.MaterialGroupStatus.Rejected;

  // Status (+ RequestsJSON) first — never block Rework/Reject on multi-lookup format
  const statusPayload: Record<string, unknown> = {
    Status: status,
  };
  if (rawEntries.length > 0) {
    statusPayload.RequestsJSON = JSON.stringify(rawEntries);
  }

  await SPServices.SPUpdateItem({
    Listname: REQUESTS_LIST(),
    ID: targetId,
    RequestJSON: statusPayload,
  });

  // Optional MaterialGroupConfig multi-lookup sync (PnP expects number[])
  if (configLookupIds.length > 0) {
    try {
      await SPServices.SPUpdateItem({
        Listname: REQUESTS_LIST(),
        ID: targetId,
        RequestJSON: { MaterialGroupConfigId: configLookupIds },
      });
    } catch {
      try {
        await SPServices.SPUpdateItem({
          Listname: REQUESTS_LIST(),
          ID: targetId,
          RequestJSON: {
            MaterialGroupConfigId: { results: configLookupIds },
          },
        });
      } catch (configError) {
        console.warn(
          "MG consultant action: MaterialGroupConfig update skipped:",
          configError,
        );
      }
    }
  }

  const requestTitle =
    (params.requestId && isMgRequestIdTitle(params.requestId)
      ? params.requestId
      : "") || `MG-${targetId}`;
  const configuredMasters =
    params.configuredMasters ||
    rawEntries
      .map((e) => e.LookupName)
      .filter((name, index, arr) => name && arr.indexOf(name) === index);

  const comments = (params.comments || "").trim();

  // Always resolve Initiator from the list item so Rework/Reject emails are not skipped
  // when hydrate used a minimal select without person Expand.
  let initiatorEmail = (params.initiatorEmail || "").trim();
  let initiatorName = (params.initiatorName || "").trim();
  if (!initiatorEmail) {
    try {
      const rawOwner = (await SPServices.SPReadItemUsingId({
        Listname: REQUESTS_LIST(),
        SelectedId: targetId,
        Select:
          "Id,Initiator/Id,Initiator/Title,Initiator/EMail,Author/Id,Author/Title,Author/EMail,AuthorId,InitiatorId",
        Expand: "Initiator,Author",
      })) as unknown;
      const ownerItem = Array.isArray(rawOwner)
        ? (rawOwner[0] as Record<string, unknown> | undefined)
        : (rawOwner as Record<string, unknown> | undefined);
      if (ownerItem) {
        const owner = resolveItemOwnerEmail(ownerItem);
        initiatorEmail = owner.email || initiatorEmail;
        initiatorName = owner.name || initiatorName;
      }
    } catch (error) {
      console.warn("MG consultant action: could not resolve Initiator:", error);
    }
  }

  const auditActor = {
    consultantUserId: Number(params.actorUserId) || 0,
    consultantEmail: (params.actorEmail || "").trim(),
  };

  const auditRole = (params.actorRole || "").trim() || Config.Roles.Consultant;

  if (params.action === "Rework" || params.action === "Rejected") {
    if (!comments) {
      throw new Error("Comments are required for Rework / Reject.");
    }

    await addMaterialGroupAuditLog({
      requestListItemId: targetId,
      requestTitle,
      action: params.action,
      comments,
      consultantUserId: auditActor.consultantUserId,
      consultantEmail: auditActor.consultantEmail,
      role: auditRole,
      actionVia: "System",
    });

    if (!initiatorEmail) {
      console.warn(
        `No Initiator email for MG ${params.action} on ${requestTitle} (item ${targetId}).`,
      );
    } else {
      try {
        await sendMaterialGroupInitiatorNotification({
          requestId: requestTitle,
          requestListItemId: targetId,
          initiatorName: initiatorName || "",
          initiatorEmail,
          configuredMasters,
          entriesCount: rawEntries.length,
          action: params.action,
          comments,
        });
      } catch (err) {
        console.warn(`Failed to send Initiator ${params.action} email:`, err);
      }
    }
  } else if (params.action === "Completed") {
    if (comments) {
      await addMaterialGroupAuditLog({
        requestListItemId: targetId,
        requestTitle,
        action: "Completed",
        comments,
        consultantUserId: auditActor.consultantUserId,
        consultantEmail: auditActor.consultantEmail,
        role: auditRole,
        actionVia: "System",
      }).catch((err) => {
        console.warn("MG Complete remarks audit log skipped:", err);
      });
    } else {
      // Still record who completed, even without remarks text
      await addMaterialGroupAuditLog({
        requestListItemId: targetId,
        requestTitle,
        action: "Completed",
        comments: "Completed",
        consultantUserId: auditActor.consultantUserId,
        consultantEmail: auditActor.consultantEmail,
        role: auditRole,
        actionVia: "System",
      }).catch((err) => {
        console.warn("MG Complete audit log skipped:", err);
      });
    }
  }

  if (params.action === "Completed" && rawEntries.length > 0) {
    await syncLookupMasterFromRequestsJson(rawEntries);
  }
}
