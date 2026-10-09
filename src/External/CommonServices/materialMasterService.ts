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
/** SharePoint list-view page size for catalog continuation (not a total-row cap). */
const CATALOG_ROW_LIMIT = MaterialMasterUi.CatalogFetchRowLimit;

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

  // Created By / Author is not shown — do not select or $expand Author.
  const selectParts = new Set<string>(["Id", "Created", itemTypeInternal]);
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
    expand: "",
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
    CreatedBy: "",
    CreatedByEmail: "",
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

/**
 * OData select → CAML ViewFields.
 * `LookupFieldId` is not a real list field — map to `LookupField` so CAML
 * does not fail after New rows populate the NPDRequest lookup.
 */
function selectFieldsToCamlViewFieldNames(select: string): string[] {
  const names = new Set<string>(["ID", "Created"]);
  String(select || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const base = part.split("/")[0]?.trim();
      if (!base) {
        return;
      }
      if (base === "Id" || base === "ID") {
        names.add("ID");
        return;
      }
      // OData lookup id projection (e.g. NPDRequestId) → lookup column name.
      if (/Id$/i.test(base) && base.length > 2) {
        names.add(base.replace(/Id$/i, ""));
        return;
      }
      names.add(base);
    });
  return Array.from(names);
}

/**
 * Catalog CAML: filter only on indexed ID (threshold-safe).
 * Do not put IsDeleted in Where — that non-indexed filter throttles lists >5k
 * and previously broke page-2+ reloads after new rows were added.
 */
function buildMaterialMasterCamlViewXml(params: {
  viewFieldNames: string[];
  afterId?: number;
  rowLimit: number;
}): string {
  const whereXml =
    params.afterId && params.afterId > 0
      ? `<Where><Gt><FieldRef Name='ID' /><Value Type='Counter'>${params.afterId}</Value></Gt></Where>`
      : "";

  const viewFieldsXml = params.viewFieldNames
    .map((name) => `<FieldRef Name='${name}' />`)
    .join("");

  return [
    "<View>",
    `<Query>${whereXml}<OrderBy><FieldRef Name='ID' Ascending='TRUE' /></OrderBy></Query>`,
    `<ViewFields>${viewFieldsXml}</ViewFields>`,
    `<RowLimit Paged='FALSE'>${params.rowLimit}</RowLimit>`,
    "</View>",
  ].join("");
}

/**
 * Loads the full Material Master catalog with CAML (up to CatalogFetchRowLimit
 * per request). Continues by Id only when the list exceeds that limit — never
 * pages in UI-sized batches of 50. Soft-delete is applied client-side.
 */
async function loadMaterialMasterCatalogRaw(
  schema: IMaterialMasterSchema,
): Promise<Record<string, unknown>[]> {
  const viewFieldNames = selectFieldsToCamlViewFieldNames(schema.select);
  // Ensure IsDeleted is selected for client-side active filtering.
  if (
    schema.isDeletedInternal &&
    !viewFieldNames.some(
      (name) =>
        name.toLowerCase() === schema.isDeletedInternal.toLowerCase(),
    )
  ) {
    viewFieldNames.push(schema.isDeletedInternal);
  }
  const expandFields = String(schema.expand || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const all: Record<string, unknown>[] = [];
  const seenIds = new Set<number>();
  let afterId = 0;

  for (let guard = 0; guard < 50; guard += 1) {
    const ViewXml = buildMaterialMasterCamlViewXml({
      viewFieldNames,
      afterId: afterId > 0 ? afterId : undefined,
      rowLimit: CATALOG_ROW_LIMIT,
    });

    let page: Record<string, unknown>[] = [];
    let drainedViaRestFallback = false;
    try {
      page = await SPServices.SPReadItemsByCaml({
        Listname: LIST_NAME(),
        ViewXml,
        Expand: expandFields,
      });
    } catch {
      // Last resort: OData ID paging returns all remaining rows (threshold-safe).
      try {
        page = await SPServices.SPReadItemsPaged({
          Listname: LIST_NAME(),
          Select: schema.select,
          Orderby: "ID",
          Orderbydecorasc: true,
          PageSize: CATALOG_ROW_LIMIT,
          Filter:
            afterId > 0
              ? [
                  {
                    FilterKey: "Id",
                    FilterValue: String(afterId),
                    Operator: "gt",
                  },
                ]
              : [],
        });
        drainedViaRestFallback = true;
      } catch {
        throw new Error("Failed to load Material Master catalog.");
      }
    }

    if (!page.length) {
      break;
    }

    let maxId = afterId;
    page.forEach((row) => {
      const id = Number(row.Id ?? row.ID);
      if (!Number.isFinite(id) || id <= 0 || seenIds.has(id)) {
        return;
      }
      seenIds.add(id);
      all.push(row);
      if (id > maxId) {
        maxId = id;
      }
    });

    if (
      drainedViaRestFallback ||
      page.length < CATALOG_ROW_LIMIT ||
      maxId <= afterId
    ) {
      break;
    }
    afterId = maxId;
  }

  return all;
}

/**
 * Loads all Material Master rows once (Existing + New).
 * Tab switching and filters are applied client-side — no extra SharePoint reads.
 */
export async function fetchMaterialMasterCatalog(): Promise<IMaterialMasterRow[]> {
  // Avoid stale schema after list/column changes during local rebuilds.
  cachedSchema = null;
  const schema = await resolveMaterialMasterSchema();
  const rawRows = await loadMaterialMasterCatalogRaw(schema);

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
        Boolean(row.ItemType),
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

function invalidateMaterialMasterDuplicateIndexCache(): void {
  // Kept for insert/update call sites that cleared the old full-catalog cache.
}

/** Unique trimmed values preserving first casing. */
function uniqueTrimmedValues(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  values.forEach((raw) => {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) {
      return;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    unique.push(trimmed);
  });
  return unique;
}

/**
 * Threshold-safe Material Master candidate match.
 *
 * Filtering on MaterialCode / MaterialDescription (`In`/`Eq`) throws
 * SPQueryThrottledException once the list exceeds the view threshold and those
 * columns are not indexed. ID is always indexed, so we page by ID (same pattern
 * as the catalog load), match candidates client-side, and stop early when every
 * candidate code/description has already been found.
 */
async function fetchMaterialMasterMatchesByCaml(params: {
  codes: string[];
  descriptions: string[];
  codeField: string;
  descriptionField: string;
  npdRequestInternal?: string;
  /** When set, only rows linked to this NPD_Request Id. */
  npdRequestId?: number;
  /** Skip rows linked to this request (self during re-validate). */
  excludeRequestId?: number;
  isDeletedField?: string;
}): Promise<Record<string, unknown>[]> {
  const pendingCodes = new Set(
    uniqueTrimmedValues(params.codes).map(normalizeMaterialMasterCompareValue),
  );
  const pendingDescriptions = new Set(
    uniqueTrimmedValues(params.descriptions).map(
      normalizeMaterialMasterCompareValue,
    ),
  );
  if (!pendingCodes.size && !pendingDescriptions.size) {
    return [];
  }

  const viewFields = ["ID", params.codeField, params.descriptionField];
  if (params.npdRequestInternal) {
    viewFields.push(params.npdRequestInternal);
  }
  if (params.isDeletedField) {
    viewFields.push(params.isDeletedField);
  }
  const viewFieldsXml = viewFields
    .map((name) => `<FieldRef Name='${name}' />`)
    .join("");

  const matchedById = new Map<number, Record<string, unknown>>();
  const foundCodes = new Set<string>();
  const foundDescriptions = new Set<string>();
  let afterId = 0;
  const rowLimit = CATALOG_ROW_LIMIT;

  const allCandidatesFound = (): boolean =>
    foundCodes.size >= pendingCodes.size &&
    foundDescriptions.size >= pendingDescriptions.size;

  for (let guard = 0; guard < 50 && !allCandidatesFound(); guard += 1) {
    const whereXml =
      afterId > 0
        ? `<Where><Gt><FieldRef Name='ID' /><Value Type='Counter'>${afterId}</Value></Gt></Where>`
        : "";
    const ViewXml = [
      "<View>",
      `<Query>${whereXml}<OrderBy><FieldRef Name='ID' Ascending='TRUE' /></OrderBy></Query>`,
      `<ViewFields>${viewFieldsXml}</ViewFields>`,
      `<RowLimit Paged='FALSE'>${rowLimit}</RowLimit>`,
      "</View>",
    ].join("");

    const page = await SPServices.SPReadItemsByCaml({
      Listname: LIST_NAME(),
      ViewXml,
    });
    if (!page.length) {
      break;
    }

    let maxId = afterId;
    page.forEach((row) => {
      const id = Number(row.ID ?? row.Id);
      if (Number.isFinite(id) && id > maxId) {
        maxId = id;
      }

      if (params.isDeletedField && isDeletedYesFlag(row[params.isDeletedField])) {
        return;
      }

      if (params.npdRequestInternal) {
        const linkedId = getLookupId(
          row[params.npdRequestInternal],
          row[`${params.npdRequestInternal}Id`],
        );
        if (
          params.npdRequestId &&
          params.npdRequestId > 0 &&
          linkedId !== params.npdRequestId
        ) {
          return;
        }
        if (
          params.excludeRequestId &&
          params.excludeRequestId > 0 &&
          linkedId === params.excludeRequestId
        ) {
          return;
        }
      }

      const code = normalizeMaterialMasterCompareValue(
        textOf(row[params.codeField]),
      );
      const description = normalizeMaterialMasterCompareValue(
        textOf(row[params.descriptionField]),
      );
      const codeHit = Boolean(code && pendingCodes.has(code));
      const descriptionHit = Boolean(
        description && pendingDescriptions.has(description),
      );
      if (!codeHit && !descriptionHit) {
        return;
      }

      if (Number.isFinite(id) && id > 0) {
        matchedById.set(id, row);
      } else {
        matchedById.set(matchedById.size + 1, row);
      }
      if (codeHit) {
        foundCodes.add(code);
      }
      if (descriptionHit) {
        foundDescriptions.add(description);
      }
    });

    if (page.length < rowLimit || maxId <= afterId) {
      break;
    }
    afterId = maxId;
  }

  return Array.from(matchedById.values());
}

/**
 * Returns Material Master Code / Description keys that collide with the given
 * candidates (ID-paged CAML + client match — threshold-safe).
 */
export async function loadMaterialMasterDuplicateIndex(options?: {
  excludeRequestId?: number;
  /** When set, only these values are queried from SharePoint. */
  candidateCodes?: string[];
  candidateDescriptions?: string[];
}): Promise<{
  materialCodes: Set<string>;
  materialDescriptions: Set<string>;
}> {
  const excludeRequestId = Number(options?.excludeRequestId) || 0;
  const candidateCodes = uniqueTrimmedValues(options?.candidateCodes || []);
  const candidateDescriptions = uniqueTrimmedValues(
    options?.candidateDescriptions || [],
  );

  if (!candidateCodes.length && !candidateDescriptions.length) {
    return { materialCodes: new Set(), materialDescriptions: new Set() };
  }

  const schema = await resolveMaterialMasterSchema();
  const codeField =
    schema.internalByLogical.MaterialCode || MM_FIELDS.MaterialCode;
  const descriptionField =
    schema.internalByLogical.MaterialDescription ||
    MM_FIELDS.MaterialDescription;
  const npdRequestInternal = schema.npdRequestInternal || MM_FIELDS.NPDRequest;

  const rows = await fetchMaterialMasterMatchesByCaml({
    codes: candidateCodes,
    descriptions: candidateDescriptions,
    codeField,
    descriptionField,
    npdRequestInternal: npdRequestInternal || undefined,
    excludeRequestId: excludeRequestId > 0 ? excludeRequestId : undefined,
    isDeletedField: schema.isDeletedInternal || undefined,
  });

  const materialCodes = new Set<string>();
  const materialDescriptions = new Set<string>();

  rows.forEach((row) => {
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

  return { materialCodes, materialDescriptions };
}

/**
 * Returns validation messages when Item Details Material Code / Description
 * already exist in NPD_MaterialMaster (trim + lowercase compare).
 * Queries SharePoint only for the codes/descriptions on these items.
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
    await loadMaterialMasterDuplicateIndex({
      excludeRequestId: options?.excludeRequestId,
      candidateCodes: filled.map((item) => item.materialCode),
      candidateDescriptions: filled.map((item) => item.materialDescription),
    });
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
 * Targeted CAML: only pending codes/descriptions for this request Id (no full list pull).
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

  const existing = await fetchMaterialMasterMatchesByCaml({
    codes: items.map((item) => item.materialCode),
    descriptions: items.map((item) => item.materialDescription),
    codeField,
    descriptionField,
    npdRequestInternal: schema.npdRequestInternal,
    npdRequestId: requestId,
    isDeletedField: schema.isDeletedInternal || undefined,
  });

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

  // Duplicate check already ran for new/updated lines before Post to SAP.
  // Do not scan unchanged Item Details again here.

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
