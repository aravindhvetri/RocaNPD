import {
  Config,
  FieldLabels,
  MaterialMasterItemTypes,
  MaterialMasterUi,
} from "./Config";
import type { IMaterialMasterRow, INpdItemDetailRecord, ISelectOption } from "./Interface";
import { fetchActiveLookups } from "./lookupService";
import { matchesAnySearchField } from "./searchTextUtils";
import { isActiveRecord } from "./softDelete";
import { isDeletedYesFlag } from "./lookupFieldUtils";
import {
  SapBrandLookupFieldHints,
  SapItemDetailsLookupFieldHints,
} from "./sapMaterialMasterLookupFieldHints";
import {
  createSapLookupCodeResolver,
  type ISapLookupCodeResolver,
} from "./sapMaterialMasterLookupResolver";
import SPServices, { getSP } from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.MaterialMaster;
const REQUEST_FIELDS = Config.FieldNames.NpdRequest;
const PAGE_SIZE = MaterialMasterUi.FetchPageSize;

/** Known internal names from NPD_MaterialMaster list settings (screenshot). */
const MM_FIELDS = {
  ItemType: "ItemType",
  MaterialCode: "MaterialCode",
  MaterialType: "MaterialType",
  MaterialDescription: "MaterialDescription",
  BrandCode: "BrandCode",
  Brand: "Brand",
  ProductGroupMG2Code: "ProductGroupMG2Code",
  ProductGroupMG2: "ProductGroupMG2",
  ProductCategoryMG3Code: "ProductCategoryMG3Code",
  ProductCategoryMG3: "ProductCategoryMG3",
  ProductTypeMG4Code: "ProductTypeMG4Code",
  ProductTypeMG4: "ProductTypeMG4",
  ProductSourceMG5Code: "ProductSourceMG5Code",
  ProductSourceMG5: "ProductSourceMG5",
  ColorMG1ACode: "ColorMGP1ACode",
  ColorMG1A: "ColorMGP1A",
  ProductRangeMGP2ACode: "ProductRangeMGP2ACode",
  ProductRangeMGP2A: "ProductRangeMGP2A",
  ProductSubCategoryMGP3ACode: "ProductSubCategoryMGP3ACode",
  ProductSubCategoryMGP3A: "ProductSubCategoryMGP3A",
  MaterialGroupCode: "MaterialGroupCode",
  MaterialGroup: "MaterialGroup",
  ExtMaterialGroupCode: "ExtMaterialGroupCode",
  ExtMaterialGroup: "ExtMaterialGroup",
  ProductSegmentCode: "ProductSegmentCode",
  ProductSegment: "ProductSegment",
  TaxClassificationCode: "TaxClassificationCode",
  TaxClassification: "TaxClassification",
  ClassPCSCode: "ClassPCSCode",
  ClassPCS: "ClassPCS",
  HSNCode: "HSNCode",
  Weight: "Weight",
  UOMCode: "UOMCode",
  UOM: "UOM",
  MinQty: "MinQty",
  NPDRequest: "NPDRequest",
  IsDeleted: "IsDeleted",
} as const;

export type MaterialMasterTab = "existing" | "new";

export interface IMaterialMasterColumnDef {
  field: keyof IMaterialMasterRow & string;
  header: string;
  minWidth?: string;
}

export const MATERIAL_MASTER_CATALOG_COLUMNS: IMaterialMasterColumnDef[] = [
  { field: "MaterialCode", header: FieldLabels.MaterialCode, minWidth: "8rem" },
  { field: "MaterialType", header: FieldLabels.MaterialType, minWidth: "8rem" },
  {
    field: "MaterialDescription",
    header: FieldLabels.MaterialDescription,
    minWidth: "12rem",
  },
  { field: "BrandCode", header: "Brand Code", minWidth: "7rem" },
  { field: "Brand", header: FieldLabels.Brand, minWidth: "7rem" },
  { field: "ProductGroupMG2Code", header: "Product Group (MG2) Code", minWidth: "8rem" },
  { field: "ProductGroupMG2", header: "Product Group (MG2)", minWidth: "9rem" },
  { field: "ProductCategoryMG3Code", header: "Product Category (MG3) Code", minWidth: "8rem" },
  { field: "ProductCategoryMG3", header: "Product Category (MG3)", minWidth: "9rem" },
  { field: "ProductTypeMG4Code", header: "Product Type (MG4) Code", minWidth: "8rem" },
  { field: "ProductTypeMG4", header: "Product Type (MG4)", minWidth: "9rem" },
  { field: "ProductSourceMG5Code", header: "Product Source (MG5) Code", minWidth: "8rem" },
  { field: "ProductSourceMG5", header: "Product Source (MG5)", minWidth: "9rem" },
  { field: "ColorMG1ACode", header: "Color (MG1A) Code", minWidth: "8rem" },
  { field: "ColorMG1A", header: "Color (MG1A)", minWidth: "8rem" },
  { field: "ProductRangeMGP2ACode", header: "Product Range (MGP2A) Code", minWidth: "8rem" },
  { field: "ProductRangeMGP2A", header: "Product Range (MGP2A)", minWidth: "9rem" },
  {
    field: "ProductSubCategoryMGP3ACode",
    header: "Product Sub Category (MGP3A) Code",
    minWidth: "9rem",
  },
  {
    field: "ProductSubCategoryMGP3A",
    header: "Product Sub Category (MGP3A)",
    minWidth: "10rem",
  },
  { field: "MaterialGroupCode", header: "Material Group Code", minWidth: "8rem" },
  { field: "MaterialGroup", header: "Material Group", minWidth: "9rem" },
  { field: "ExtMaterialGroupCode", header: "Ext. Material Group Code", minWidth: "8rem" },
  { field: "ExtMaterialGroup", header: "Ext. Material Group", minWidth: "9rem" },
  { field: "ProductSegmentCode", header: "Product Segment Code", minWidth: "8rem" },
  { field: "ProductSegment", header: "Product Segment", minWidth: "9rem" },
  { field: "TaxClassificationCode", header: "Tax Classification Code", minWidth: "8rem" },
  { field: "TaxClassification", header: "Tax Classification", minWidth: "9rem" },
  { field: "ClassPCSCode", header: "Class (PCS) Code", minWidth: "8rem" },
  { field: "ClassPCS", header: "Class (PCS)", minWidth: "9rem" },
  { field: "HSNCode", header: "HSN Code", minWidth: "7rem" },
  { field: "Weight", header: "Weight", minWidth: "6rem" },
  { field: "UOMCode", header: "UOM Code", minWidth: "6rem" },
  { field: "UOM", header: "UOM", minWidth: "6rem" },
  { field: "MinQty", header: "Min Qty", minWidth: "6rem" },
];

export const MATERIAL_MASTER_META_COLUMNS: IMaterialMasterColumnDef[] = [
  { field: "Created", header: "Created Date", minWidth: "8rem" },
  { field: "CreatedBy", header: "Created By", minWidth: "9rem" },
  { field: "Initiator", header: "Initiator", minWidth: "9rem" },
];

interface IMaterialMasterSchema {
  internalByLogical: Record<string, string>;
  itemTypeInternal: string;
  npdRequestInternal: string;
  isDeletedInternal: string;
  select: string;
  expand: string;
}

let cachedSchema: IMaterialMasterSchema | null = null;

function normalizeFieldKey(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function textOf(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => textOf(entry))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.results)) {
      return textOf(record.results);
    }
    return String(
      record.Title ?? record.EMail ?? record.LookupValue ?? record.Value ?? "",
    ).trim();
  }
  return String(value).trim();
}

function getLookupId(value: unknown, fallbackId?: unknown): number {
  const fromFallback = Number(fallbackId);
  if (Number.isFinite(fromFallback) && fromFallback > 0) {
    return fromFallback;
  }
  if (!value || typeof value !== "object") {
    const direct = Number(value);
    return Number.isFinite(direct) && direct > 0 ? direct : 0;
  }
  const record = value as Record<string, unknown>;
  const id = Number(record.Id ?? record.ID);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

function getAuthorTitle(item: Record<string, unknown>): string {
  const author = item.Author;
  if (!author || typeof author !== "object") {
    return "";
  }
  return String((author as Record<string, unknown>).Title ?? "").trim();
}

function getAuthorEmail(item: Record<string, unknown>): string {
  const author = item.Author;
  if (!author || typeof author !== "object") {
    return "";
  }
  const record = author as Record<string, unknown>;
  return String(record.EMail ?? record.Email ?? "").trim();
}

function findInternalName(
  fieldsByKey: Map<string, string>,
  candidates: string[],
): string {
  for (const candidate of candidates) {
    const match = fieldsByKey.get(normalizeFieldKey(candidate));
    if (match) {
      return match;
    }
  }
  return "";
}

/**
 * Resolve real InternalNames from NPD_MaterialMaster.
 * Prefer the known screenshot names; fall back to Title match.
 */
async function resolveMaterialMasterSchema(): Promise<IMaterialMasterSchema> {
  if (cachedSchema) {
    return cachedSchema;
  }

  const fields = (await getSP()
    .web.lists.getByTitle(LIST_NAME())
    .fields.select("InternalName", "Title", "EntityPropertyName", "Hidden")()) as Array<{
    InternalName?: string;
    Title?: string;
    EntityPropertyName?: string;
    Hidden?: boolean;
  }>;

  const fieldsByKey = new Map<string, string>();
  const existingInternals = new Set<string>();
  fields.forEach((field) => {
    const internal = String(
      field.InternalName || field.EntityPropertyName || "",
    ).trim();
    if (!internal || internal.startsWith("_")) {
      return;
    }
    existingInternals.add(internal);
    [field.InternalName, field.Title, field.EntityPropertyName]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .forEach((label) => {
        fieldsByKey.set(normalizeFieldKey(label), internal);
      });
  });

  const resolve = (logical: keyof typeof MM_FIELDS, extra: string[] = []): string => {
    const preferred = MM_FIELDS[logical];
    if (existingInternals.has(preferred)) {
      return preferred;
    }
    return findInternalName(fieldsByKey, [preferred, ...extra, logical]);
  };

  const internalByLogical: Record<string, string> = {};
  (Object.keys(MM_FIELDS) as Array<keyof typeof MM_FIELDS>).forEach((logical) => {
    const internal = resolve(logical, [
      logical === "ColorMG1ACode" ? "ColorMG1ACode" : "",
      logical === "ColorMG1A" ? "ColorMG1A" : "",
      logical === "MaterialGroupCode" ? "Material GroupCode" : "",
      logical === "MaterialGroup" ? "Material Group" : "",
    ].filter(Boolean));
    if (internal) {
      internalByLogical[logical] = internal;
    }
  });

  const itemTypeInternal = internalByLogical.ItemType || MM_FIELDS.ItemType;
  if (!existingInternals.has(itemTypeInternal) && !internalByLogical.ItemType) {
    throw new Error(
      "Material Master ItemType column was not found on NPD_MaterialMaster.",
    );
  }
  internalByLogical.ItemType = itemTypeInternal;

  const npdRequestInternal = internalByLogical.NPDRequest || "";
  const isDeletedInternal = internalByLogical.IsDeleted || "";

  // Author/Title + Author/EMail are required for Created By persona photos.
  const selectParts = new Set<string>([
    "Id",
    "Created",
    "Author/Id",
    "Author/Title",
    "Author/EMail",
    itemTypeInternal,
  ]);
  if (isDeletedInternal) {
    selectParts.add(isDeletedInternal);
  }
  if (npdRequestInternal) {
    selectParts.add(`${npdRequestInternal}Id`);
  }

  Object.keys(MM_FIELDS).forEach((logical) => {
    if (
      logical === "ItemType" ||
      logical === "NPDRequest" ||
      logical === "IsDeleted"
    ) {
      return;
    }
    const internal = internalByLogical[logical];
    if (internal && existingInternals.has(internal)) {
      selectParts.add(internal);
    }
  });

  const resolvedSchema: IMaterialMasterSchema = {
    internalByLogical,
    itemTypeInternal,
    npdRequestInternal,
    isDeletedInternal,
    select: Array.from(selectParts).join(","),
    expand: "Author",
  };
  // Module cache write after await — last writer wins; schema is immutable once resolved.
  // eslint-disable-next-line require-atomic-updates -- intentional shared schema cache
  cachedSchema = resolvedSchema;
  return resolvedSchema;
}

function readField(
  item: Record<string, unknown>,
  schema: IMaterialMasterSchema,
  logical: string,
): string {
  const internal = schema.internalByLogical[logical];
  if (!internal) {
    return "";
  }
  if (Object.prototype.hasOwnProperty.call(item, internal)) {
    return textOf(item[internal]);
  }
  // Case-insensitive fallback for OData property casing differences.
  const target = normalizeFieldKey(internal);
  for (const [key, value] of Object.entries(item)) {
    if (normalizeFieldKey(key) === target) {
      return textOf(value);
    }
  }
  return "";
}

function readItemType(
  item: Record<string, unknown>,
  schema: IMaterialMasterSchema,
): string {
  const direct = readField(item, schema, "ItemType");
  if (direct) {
    return direct;
  }
  for (const [key, value] of Object.entries(item)) {
    if (normalizeFieldKey(key) === "itemtype") {
      const text = textOf(value);
      if (text) {
        return text;
      }
    }
  }
  return "";
}

function mapCatalogRow(
  item: Record<string, unknown>,
  schema: IMaterialMasterSchema,
): IMaterialMasterRow {
  const npdRequestIdField = schema.npdRequestInternal
    ? item[`${schema.npdRequestInternal}Id`]
    : undefined;
  const npdRequest = schema.npdRequestInternal
    ? item[schema.npdRequestInternal]
    : undefined;

  return {
    Id: Number(item.Id ?? item.ID) || 0,
    ItemType: readItemType(item, schema),
    MaterialCode: readField(item, schema, "MaterialCode"),
    MaterialType: readField(item, schema, "MaterialType"),
    MaterialDescription: readField(item, schema, "MaterialDescription"),
    BrandCode: readField(item, schema, "BrandCode"),
    Brand: readField(item, schema, "Brand"),
    ProductGroupMG2Code: readField(item, schema, "ProductGroupMG2Code"),
    ProductGroupMG2: readField(item, schema, "ProductGroupMG2"),
    ProductCategoryMG3Code: readField(item, schema, "ProductCategoryMG3Code"),
    ProductCategoryMG3: readField(item, schema, "ProductCategoryMG3"),
    ProductTypeMG4Code: readField(item, schema, "ProductTypeMG4Code"),
    ProductTypeMG4: readField(item, schema, "ProductTypeMG4"),
    ProductSourceMG5Code: readField(item, schema, "ProductSourceMG5Code"),
    ProductSourceMG5: readField(item, schema, "ProductSourceMG5"),
    ColorMG1ACode: readField(item, schema, "ColorMG1ACode"),
    ColorMG1A: readField(item, schema, "ColorMG1A"),
    ProductRangeMGP2ACode: readField(item, schema, "ProductRangeMGP2ACode"),
    ProductRangeMGP2A: readField(item, schema, "ProductRangeMGP2A"),
    ProductSubCategoryMGP3ACode: readField(
      item,
      schema,
      "ProductSubCategoryMGP3ACode",
    ),
    ProductSubCategoryMGP3A: readField(item, schema, "ProductSubCategoryMGP3A"),
    MaterialGroupCode: readField(item, schema, "MaterialGroupCode"),
    MaterialGroup: readField(item, schema, "MaterialGroup"),
    ExtMaterialGroupCode: readField(item, schema, "ExtMaterialGroupCode"),
    ExtMaterialGroup: readField(item, schema, "ExtMaterialGroup"),
    ProductSegmentCode: readField(item, schema, "ProductSegmentCode"),
    ProductSegment: readField(item, schema, "ProductSegment"),
    TaxClassificationCode: readField(item, schema, "TaxClassificationCode"),
    TaxClassification: readField(item, schema, "TaxClassification"),
    ClassPCSCode: readField(item, schema, "ClassPCSCode"),
    ClassPCS: readField(item, schema, "ClassPCS"),
    HSNCode: readField(item, schema, "HSNCode"),
    Weight: readField(item, schema, "Weight"),
    UOMCode: readField(item, schema, "UOMCode"),
    UOM: readField(item, schema, "UOM"),
    MinQty: readField(item, schema, "MinQty"),
    NpdRequestId: getLookupId(npdRequest, npdRequestIdField),
    Initiator: "",
    InitiatorEmail: "",
    Created: String(item.Created ?? ""),
    CreatedBy: getAuthorTitle(item),
    CreatedByEmail: getAuthorEmail(item),
    IsDeleted: schema.isDeletedInternal
      ? isDeletedYesFlag(item[schema.isDeletedInternal])
      : false,
  };
}

function normalizeItemType(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (normalized === "old") {
    return MaterialMasterItemTypes.Existing;
  }
  if (normalized === "new") {
    return MaterialMasterItemTypes.New;
  }
  return "";
}

async function fetchInitiatorByRequestId(
  requestIds: number[],
): Promise<Map<number, { name: string; email: string }>> {
  const map = new Map<number, { name: string; email: string }>();
  const uniqueIds = Array.from(new Set(requestIds.filter((id) => id > 0)));
  if (!uniqueIds.length) {
    return map;
  }

  const chunkSize = 30;
  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    const chunk = uniqueIds.slice(index, index + chunkSize);
    const filter = chunk.map((id) => ({
      FilterKey: "Id",
      FilterValue: String(id),
      Operator: "eq",
    }));
    const rows = (await SPServices.SPReadItems({
      Listname: Config.ListNames.NpdRequest,
      Select: [
        "Id",
        `${REQUEST_FIELDS.Initiator}/Id`,
        `${REQUEST_FIELDS.Initiator}/Title`,
        `${REQUEST_FIELDS.Initiator}/EMail`,
        "Author/Id",
        "Author/Title",
        "Author/EMail",
      ].join(","),
      Expand: `${REQUEST_FIELDS.Initiator},Author`,
      Filter: filter,
      FilterCondition: "or",
      Topcount: chunk.length,
      Orderby: "ID",
      Orderbydecorasc: true,
    })) as Record<string, unknown>[];

    rows.forEach((row) => {
      const id = Number(row.Id);
      if (!Number.isFinite(id) || id <= 0) {
        return;
      }
      const initiator = row[REQUEST_FIELDS.Initiator];
      const author = row.Author;
      const initiatorRecord =
        initiator && typeof initiator === "object"
          ? (initiator as Record<string, unknown>)
          : null;
      const authorRecord =
        author && typeof author === "object"
          ? (author as Record<string, unknown>)
          : null;
      map.set(id, {
        name: String(
          initiatorRecord?.Title ?? authorRecord?.Title ?? "",
        ).trim(),
        email: String(
          initiatorRecord?.EMail ?? authorRecord?.EMail ?? "",
        ).trim(),
      });
    });
  }

  return map;
}

async function loadMaterialMasterPages(
  schema: IMaterialMasterSchema,
  itemTypeValue?: string,
): Promise<Record<string, unknown>[]> {
  return SPServices.SPReadItemsPaged({
    Listname: LIST_NAME(),
    Select: schema.select,
    Expand: schema.expand,
    Filter: itemTypeValue
      ? [
          {
            FilterKey: schema.itemTypeInternal,
            FilterValue: itemTypeValue,
            Operator: "eq",
          },
        ]
      : [],
    FilterCondition: "and",
    PageSize: PAGE_SIZE,
    Orderby: "ID",
    // Ascending Id paging is reliable on SharePoint; UI still pages at 50.
    Orderbydecorasc: true,
  });
}

/**
 * Loads Material Master rows for one tab from NPD_MaterialMaster (50/page).
 * Existing => ItemType Old. New => ItemType New.
 */
export async function fetchMaterialMasterCatalog(
  tab: MaterialMasterTab,
): Promise<IMaterialMasterRow[]> {
  // Avoid stale schema after list/column changes during local rebuilds.
  cachedSchema = null;
  const schema = await resolveMaterialMasterSchema();
  const itemTypeValue = getMaterialMasterTabItemType(tab);

  let rawRows: Record<string, unknown>[] = [];
  try {
    rawRows = await loadMaterialMasterPages(schema, itemTypeValue);
  } catch {
    // Filtered query can fail if ItemType is not indexed; load all and filter client-side.
    rawRows = [];
  }

  // Fallback when the ItemType filter returns nothing or errors.
  if (!rawRows.length) {
    rawRows = await loadMaterialMasterPages(schema);
  }

  const mapped = rawRows
    .map((row) => mapCatalogRow(row, schema))
    .map((row) => {
      const normalized = normalizeItemType(row.ItemType);
      return {
        ...row,
        ItemType: normalized,
      };
    })
    .filter(
      (row) =>
        row.Id > 0 &&
        isActiveRecord(row) &&
        row.ItemType.toLowerCase() === itemTypeValue.toLowerCase(),
    );

  const initiatorMap = await fetchInitiatorByRequestId(
    mapped.map((row) => row.NpdRequestId),
  );

  return mapped.map((row) => {
    const fromRequest = initiatorMap.get(row.NpdRequestId);
    return {
      ...row,
      Initiator: fromRequest?.name || "",
      InitiatorEmail: fromRequest?.email || "",
    };
  });
}

/** Trim + lowercase for Material Master duplicate comparisons. */
export function normalizeMaterialMasterCompareValue(value: string): string {
  return value.trim().toLowerCase();
}

function joinMaterialMasterMultiValue(values: string[]): string {
  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(Config.NpdItemImport.MultiValueSeparator);
}

/** Short TTL so Initiator UI pre-check + submit service re-check share one catalog load. */
const DUPLICATE_INDEX_CACHE_TTL_MS = 60_000;
let duplicateIndexCache: {
  excludeRequestId: number;
  loadedAt: number;
  materialCodes: Set<string>;
  materialDescriptions: Set<string>;
} | null = null;

function invalidateMaterialMasterDuplicateIndexCache(): void {
  duplicateIndexCache = null;
}

/**
 * Loads MaterialCode / MaterialDescription keys from NPD_MaterialMaster (paged).
 * Used for Initiator Submit and MIS Post to SAP duplicate checks.
 * When excludeRequestId is set, rows already linked to that NPD_Request are ignored
 * (supports safe retries after a partial Post to SAP).
 */
export async function loadMaterialMasterDuplicateIndex(options?: {
  excludeRequestId?: number;
}): Promise<{
  materialCodes: Set<string>;
  materialDescriptions: Set<string>;
}> {
  const excludeRequestId = Number(options?.excludeRequestId) || 0;
  const now = Date.now();
  if (
    duplicateIndexCache &&
    duplicateIndexCache.excludeRequestId === excludeRequestId &&
    now - duplicateIndexCache.loadedAt < DUPLICATE_INDEX_CACHE_TTL_MS
  ) {
    return {
      materialCodes: duplicateIndexCache.materialCodes,
      materialDescriptions: duplicateIndexCache.materialDescriptions,
    };
  }

  const schema = await resolveMaterialMasterSchema();
  const codeField =
    schema.internalByLogical.MaterialCode || MM_FIELDS.MaterialCode;
  const descriptionField =
    schema.internalByLogical.MaterialDescription ||
    MM_FIELDS.MaterialDescription;
  const npdRequestInternal = schema.npdRequestInternal || MM_FIELDS.NPDRequest;

  const selectParts = ["Id", codeField, descriptionField];
  if (npdRequestInternal) {
    selectParts.push(`${npdRequestInternal}Id`);
  }

  const rows = await SPServices.SPReadItemsPaged({
    Listname: LIST_NAME(),
    Select: selectParts.join(","),
    Expand: "",
    Filter: [],
    PageSize: PAGE_SIZE,
    Orderby: "ID",
    Orderbydecorasc: true,
  });

  const materialCodes = new Set<string>();
  const materialDescriptions = new Set<string>();

  rows.forEach((row) => {
    if (excludeRequestId > 0 && npdRequestInternal) {
      const linkedId = getLookupId(
        row[npdRequestInternal],
        row[`${npdRequestInternal}Id`],
      );
      if (linkedId === excludeRequestId) {
        return;
      }
    }

    const code = normalizeMaterialMasterCompareValue(textOf(row[codeField]));
    const description = normalizeMaterialMasterCompareValue(
      textOf(row[descriptionField]),
    );
    if (code) {
      materialCodes.add(code);
    }
    if (description) {
      materialDescriptions.add(description);
    }
  });

  const resolvedIndex = {
    excludeRequestId,
    loadedAt: now,
    materialCodes,
    materialDescriptions,
  };
  // Module cache write after await — short TTL; concurrent refresh is acceptable.
  // eslint-disable-next-line require-atomic-updates -- intentional shared duplicate-index cache
  duplicateIndexCache = resolvedIndex;

  return { materialCodes, materialDescriptions };
}

/**
 * Returns validation messages when Item Details Material Code / Description
 * already exist in NPD_MaterialMaster (trim + lowercase compare).
 */
export async function validateItemsAgainstMaterialMaster(
  items: Array<{
    materialCode?: string;
    materialDescription?: string;
  }>,
  options?: { excludeRequestId?: number },
): Promise<string[]> {
  const filled = items
    .map((item, index) => ({
      line: index + 1,
      materialCode: String(item.materialCode ?? ""),
      materialDescription: String(item.materialDescription ?? ""),
    }))
    .filter(
      (item) =>
        normalizeMaterialMasterCompareValue(item.materialCode) ||
        normalizeMaterialMasterCompareValue(item.materialDescription),
    );

  if (!filled.length) {
    return [];
  }

  const { materialCodes, materialDescriptions } =
    await loadMaterialMasterDuplicateIndex(options);
  const messages: string[] = [];

  filled.forEach((item) => {
    const codeKey = normalizeMaterialMasterCompareValue(item.materialCode);
    const descriptionKey = normalizeMaterialMasterCompareValue(
      item.materialDescription,
    );

    if (codeKey && materialCodes.has(codeKey)) {
      messages.push(
        `Item line ${item.line}: Material Code "${item.materialCode.trim()}" already exists in Material Master.`,
      );
    }
    if (descriptionKey && materialDescriptions.has(descriptionKey)) {
      messages.push(
        `Item line ${item.line}: Material Description "${item.materialDescription.trim()}" already exists in Material Master.`,
      );
    }
  });

  return messages;
}

function joinMaterialMasterLookupCodes(
  resolver: ISapLookupCodeResolver,
  lookupTypeHints: readonly string[],
  values: string[] | undefined,
): string {
  return (values ?? [])
    .map((value) =>
      resolver.matchedLookupCode([...lookupTypeHints], String(value ?? "")),
    )
    .map((code) => code.trim())
    .filter(Boolean)
    .join(Config.NpdItemImport.MultiValueSeparator);
}

function buildMaterialMasterInsertPayload(
  item: INpdItemDetailRecord,
  params: {
    requestId: number;
    brand: string;
    materialType: string;
    schema: IMaterialMasterSchema;
    lookupResolver: ISapLookupCodeResolver;
  },
): Record<string, unknown> {
  const { schema, lookupResolver } = params;
  const payload: Record<string, unknown> = {
    Title: item.materialCode.trim() || item.materialDescription.trim() || "Material",
  };

  const field = (logical: string, value: string): void => {
    const internal = schema.internalByLogical[logical];
    if (internal) {
      payload[internal] = value;
    }
  };

  const lookupValueAndCode = (
    valueLogical: string,
    codeLogical: string,
    lookupTypeHints: readonly string[],
    values: string[] | undefined,
  ): void => {
    field(valueLogical, joinMaterialMasterMultiValue(values ?? []));
    field(
      codeLogical,
      joinMaterialMasterLookupCodes(lookupResolver, lookupTypeHints, values),
    );
  };

  field("MaterialCode", item.materialCode.trim());
  field("MaterialType", params.materialType.trim());
  field("MaterialDescription", item.materialDescription.trim());
  field("Brand", params.brand.trim());
  field(
    "BrandCode",
    lookupResolver.matchedLookupCode(
      [...SapBrandLookupFieldHints],
      params.brand.trim(),
    ),
  );
  lookupValueAndCode(
    "ProductGroupMG2",
    "ProductGroupMG2Code",
    SapItemDetailsLookupFieldHints.productGroupMg2,
    item.productGroupMg2,
  );
  lookupValueAndCode(
    "ProductCategoryMG3",
    "ProductCategoryMG3Code",
    SapItemDetailsLookupFieldHints.productCategoryMg3,
    item.productCategoryMg3,
  );
  lookupValueAndCode(
    "ProductTypeMG4",
    "ProductTypeMG4Code",
    SapItemDetailsLookupFieldHints.productTypeMg4,
    item.productTypeMg4,
  );
  lookupValueAndCode(
    "ProductSourceMG5",
    "ProductSourceMG5Code",
    SapItemDetailsLookupFieldHints.productSourceMg5,
    item.productSourceMg5,
  );
  lookupValueAndCode(
    "ColorMG1A",
    "ColorMG1ACode",
    SapItemDetailsLookupFieldHints.colorMgp1a,
    item.colorMgp1a,
  );
  lookupValueAndCode(
    "ProductRangeMGP2A",
    "ProductRangeMGP2ACode",
    SapItemDetailsLookupFieldHints.productRangeMgp2a,
    item.productRangeMgp2a,
  );
  lookupValueAndCode(
    "ProductSubCategoryMGP3A",
    "ProductSubCategoryMGP3ACode",
    SapItemDetailsLookupFieldHints.productSubCategoryMgp3a,
    item.productSubCategoryMgp3a,
  );
  lookupValueAndCode(
    "MaterialGroup",
    "MaterialGroupCode",
    SapItemDetailsLookupFieldHints.materialGroup,
    item.materialGroup,
  );
  lookupValueAndCode(
    "ExtMaterialGroup",
    "ExtMaterialGroupCode",
    SapItemDetailsLookupFieldHints.extMaterialGroup,
    item.extMaterialGroup,
  );
  lookupValueAndCode(
    "ProductSegment",
    "ProductSegmentCode",
    SapItemDetailsLookupFieldHints.productSegment,
    item.productSegment,
  );
  lookupValueAndCode(
    "TaxClassification",
    "TaxClassificationCode",
    SapItemDetailsLookupFieldHints.taxClassification,
    item.taxClassification,
  );
  lookupValueAndCode(
    "ClassPCS",
    "ClassPCSCode",
    SapItemDetailsLookupFieldHints.classNumberPcsName,
    item.classNumberPcsName,
  );
  field("HSNCode", item.hsnCode.trim());
  field(
    "Weight",
    item.weightKg === null || item.weightKg === undefined
      ? ""
      : String(item.weightKg),
  );
  lookupValueAndCode(
    "UOM",
    "UOMCode",
    SapItemDetailsLookupFieldHints.uom,
    item.uom,
  );
  field("MinQty", item.minQtyBoxQty.trim());
  field("ItemType", MaterialMasterItemTypes.New);

  if (schema.isDeletedInternal) {
    payload[schema.isDeletedInternal] = false;
  }
  if (schema.npdRequestInternal) {
    payload[`${schema.npdRequestInternal}Id`] = params.requestId;
  }

  return payload;
}

function materialMasterItemKey(code: string, description: string): string {
  const normalizedCode = normalizeMaterialMasterCompareValue(code);
  if (normalizedCode) {
    return `code:${normalizedCode}`;
  }
  const normalizedDescription = normalizeMaterialMasterCompareValue(description);
  return normalizedDescription ? `desc:${normalizedDescription}` : "";
}

/**
 * Skips lines this NPD request already wrote to Material Master so a Post to SAP
 * retry does not insert the successful lines again.
 */
async function excludeMaterialMasterRowsAlreadyStored(
  requestId: number,
  items: INpdItemDetailRecord[],
  schema: IMaterialMasterSchema,
): Promise<INpdItemDetailRecord[]> {
  if (!schema.npdRequestInternal || requestId <= 0) {
    return items;
  }

  const codeField =
    schema.internalByLogical.MaterialCode || MM_FIELDS.MaterialCode;
  const descriptionField =
    schema.internalByLogical.MaterialDescription ||
    MM_FIELDS.MaterialDescription;
  const existing = (await getSP()
    .web.lists.getByTitle(LIST_NAME())
    .items.select("Id", codeField, descriptionField)
    .filter(`${schema.npdRequestInternal}Id eq ${requestId}`)
    .top(5000)()) as Record<string, unknown>[];

  const storedKeys = new Set<string>();
  existing.forEach((row) => {
    const key = materialMasterItemKey(
      textOf(row[codeField]),
      textOf(row[descriptionField]),
    );
    if (key) {
      storedKeys.add(key);
    }
  });

  return items.filter((item) => {
    const key = materialMasterItemKey(item.materialCode, item.materialDescription);
    return !key || !storedKeys.has(key);
  });
}

/**
 * Inserts approved NPD Item Details into NPD_MaterialMaster as ItemType=New,
 * with NPDRequest lookup set to the NPD_Request item Id.
 */
export async function insertMaterialMasterFromNpdItems(params: {
  requestId: number;
  brand: string;
  materialType: string;
  items: INpdItemDetailRecord[];
}): Promise<void> {
  const items = params.items.filter(
    (item) =>
      normalizeMaterialMasterCompareValue(item.materialCode) ||
      normalizeMaterialMasterCompareValue(item.materialDescription),
  );
  if (!items.length || params.requestId <= 0) {
    return;
  }

  const schema = await resolveMaterialMasterSchema();
  const pendingItems = await excludeMaterialMasterRowsAlreadyStored(
    params.requestId,
    items,
    schema,
  );
  if (!pendingItems.length) {
    return;
  }

  // Re-check duplicates immediately before insert to avoid races.
  const duplicateMessages = await validateItemsAgainstMaterialMaster(pendingItems, {
    excludeRequestId: params.requestId,
  });
  if (duplicateMessages.length) {
    throw new Error(duplicateMessages[0]);
  }

  const lookups = await fetchActiveLookups();
  const lookupResolver = createSapLookupCodeResolver(lookups);

  const payloads = pendingItems.map((item) =>
    buildMaterialMasterInsertPayload(item, {
      requestId: params.requestId,
      brand: params.brand,
      materialType: params.materialType,
      schema,
      lookupResolver,
    }),
  );

  // SharePoint batch has practical size limits — insert in chunks.
  const chunkSize = 50;
  for (let index = 0; index < payloads.length; index += chunkSize) {
    const chunk = payloads.slice(index, index + chunkSize);
    await SPServices.batchMutate({
      ListName: LIST_NAME(),
      insert: chunk,
    });
  }

  invalidateMaterialMasterDuplicateIndexCache();
}

export function getMaterialMasterTabItemType(tab: MaterialMasterTab): string {
  return tab === "existing"
    ? MaterialMasterItemTypes.Existing
    : MaterialMasterItemTypes.New;
}

export function filterMaterialMasterByTab(
  rows: readonly IMaterialMasterRow[],
  tab: MaterialMasterTab,
): IMaterialMasterRow[] {
  const itemType = getMaterialMasterTabItemType(tab).toLowerCase();
  return rows.filter(
    (row) => normalizeItemType(row.ItemType).toLowerCase() === itemType,
  );
}

/** Existing: only columns with data on Old rows. New: every configured column. */
export function getVisibleMaterialMasterColumns(
  tab: MaterialMasterTab,
  tabRows: readonly IMaterialMasterRow[],
): IMaterialMasterColumnDef[] {
  const allColumns = [
    ...MATERIAL_MASTER_CATALOG_COLUMNS,
    ...MATERIAL_MASTER_META_COLUMNS,
  ];
  if (tab === "new") {
    return allColumns;
  }

  return allColumns.filter((column) =>
    tabRows.some((row) => textOf(row[column.field]).length > 0),
  );
}

export function buildMaterialMasterInitiatorOptions(
  rows: readonly IMaterialMasterRow[],
): ISelectOption[] {
  const seen = new Set<string>();
  const options: ISelectOption[] = [];

  rows.forEach((row) => {
    const name = row.Initiator.trim();
    if (!name) {
      return;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    options.push({ label: name, value: name });
  });

  options.sort((left, right) => left.label.localeCompare(right.label));
  return [
    {
      label: `All Initiators (${options.length})`,
      value: "all",
    },
    ...options,
  ];
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function filterMaterialMasterRows(params: {
  rows: readonly IMaterialMasterRow[];
  tab: MaterialMasterTab;
  search: string;
  createdFrom: Date | null;
  createdTo: Date | null;
  initiator: string;
}): IMaterialMasterRow[] {
  const tabRows = filterMaterialMasterByTab(params.rows, params.tab);
  const initiatorFilter = (params.initiator || "all").trim().toLowerCase();
  const from = params.createdFrom
    ? startOfDay(params.createdFrom).getTime()
    : null;
  const to = params.createdTo ? endOfDay(params.createdTo).getTime() : null;
  const visibleColumns = getVisibleMaterialMasterColumns(params.tab, tabRows);

  return tabRows.filter((row) => {
    if (initiatorFilter && initiatorFilter !== "all") {
      if (row.Initiator.trim().toLowerCase() !== initiatorFilter) {
        return false;
      }
    }

    if (from !== null || to !== null) {
      const createdMs = Date.parse(row.Created);
      if (!Number.isFinite(createdMs)) {
        return false;
      }
      if (from !== null && createdMs < from) {
        return false;
      }
      if (to !== null && createdMs > to) {
        return false;
      }
    }

    const searchFields = visibleColumns.map((column) => row[column.field]);
    return matchesAnySearchField(searchFields, params.search);
  });
}

export function formatMaterialMasterCreatedDate(value: string): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}
