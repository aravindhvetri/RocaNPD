/** SharePoint list item — NPD_LookupType */
export interface ILookupType {
  Id: number;
  Title: string;
  IsDeleted: boolean;
}

/** Row shape for DataTable (requires index signature). */
export interface ILookupTypeRow extends ILookupType, Record<string, unknown> {}

export interface ILookupTypeFormValues {
  title: string;
}

/**
 * Domain row for NPD_Lookup.
 * LookupName is the list Title column (there is no LookupName field).
 * LookupTypeTitle is LookupType/Title after Expand.
 */
export interface ILookup {
  Id: number;
  LookupName: string;
  LookupCode: string;
  LookupTypeId: number;
  LookupTypeTitle: string;
  IsDeleted: boolean;
}

/** Row shape for DataTable (requires index signature). */
export interface ILookupRow extends ILookup, Record<string, unknown> {}

export interface ILookupFormValues {
  lookupTypeId: number | null;
  lookupName: string;
  lookupCode: string;
}

export interface ILookupImportRecord {
  lookupTypeId: number;
  lookupTypeTitle: string;
  lookupName: string;
  lookupCode: string;
}

/** Result of parsing a Lookup import spreadsheet before persistence */
export interface ILookupImportParseResult {
  toCreate: ILookupImportRecord[];
  duplicates: string[];
  errors: string[];
}

/** Config-driven rule for delete dependency checks */
export interface IDeleteDependencyRule {
  listName: string;
  filterKey: string;
  matchLookupName: boolean;
  blockedByLabel: string;
}

/** SharePoint document library item — NPD_Templates */
export interface ITemplateDocument {
  Id: number;
  FileName: string;
  ServerRelativeUrl: string;
  TemplateType: string;
}

/** Result of parsing an import spreadsheet before persistence */
export interface IImportParseResult {
  /** Values that passed validation and are not duplicates */
  toCreate: string[];
  /** Names that already exist in SharePoint or repeat within the file */
  duplicates: string[];
  /** Non-fatal row-level issues (empty rows are ignored, not listed here) */
  errors: string[];
}

export interface IExportColumn<T extends Record<string, unknown>> {
  header: string;
  value: (row: T) => string | number;
}

export interface ISelectOption {
  label: string;
  value: string | number;
}

/** SharePoint list item — NPD_BrandMaterialExtensionMaster */
export interface IBrandMaterialExtension {
  Id: number;
  Brand: string;
  Plant: string;
  Plants: string[];
  IsDeleted: boolean;
}

/** Row shape for DataTable (requires index signature). */
export interface IBrandMaterialExtensionRow
  extends IBrandMaterialExtension,
    Record<string, unknown> {}

export interface IRocaMasterOptions {
  brands: ISelectOption[];
  plants: ISelectOption[];
}

/** SharePoint list item — NPD_WorkflowConfig (one record per approval step). */
export interface IWorkflowConfigStep {
  Id: number;
  RequestType: string;
  CurrentRole: string;
  NextRole: string;
  IsDeleted: boolean;
}

/** Grouped dashboard row — one per Request Type with full approval chain. */
export interface IWorkflowConfigRow {
  RequestType: string;
  ApprovalChain: string;
  StepIds: number[];
  Steps: IWorkflowConfigStep[];
}

/** Row shape for DataTable (requires index signature). */
export interface IWorkflowConfigTableRow
  extends IWorkflowConfigRow,
    Record<string, unknown> {}

/** In-memory step while configuring a workflow in the form dialog. */
export interface IWorkflowFormStep {
  currentRole: string;
  nextRole: string;
}

export interface IWorkflowConfigSavePayload {
  requestType: string;
  steps: IWorkflowFormStep[];
  existingStepIds?: number[];
}

/** NPD Request form — General Information (header) fields. */
export interface INpdGeneralInfo {
  brand: string | null;
  materialType: string | null;
  plantSource: string | null;
}

/** MIS Coordinator Other Details (saved on NPD_Request). */
export interface INpdOtherDetails {
  plantCode: string;
  storageLocation: string;
  profitCenter: string;
  mrpGroup: string;
  mrpController: string;
  valuationClass: string;
  classType: string;
  materialExtension: string;
}

/** PlantMaster row fields used for MIS Other Details auto-populate. */
export interface IPlantMasterSapDetails {
  plantCode: string;
  storageLocation: string;
  mrpGroup: string;
  mrpController: string;
}

/** One step stored in NPD_Request.WorkFlowJSON. */
export interface INpdWorkflowStepJson {
  Role: string;
  UserEmail: string;
  Status: string;
}

/** SharePoint list item — NPD_Request (General Information) */
export interface INpdRequestGeneralInfo {
  Id: number;
  Title: string;
  Brand: string;
  MaterialType: string;
  Plant: string;
  Status: string;
  IsDeleted: boolean;
  WorkFlowJSON: string;
  WorkflowSteps: INpdWorkflowStepJson[];
  AuthorEmail: string;
  AuthorTitle: string;
  Created: string;
  Modified: string;
  PlantCode?: string;
  StorageLocation?: string;
  ProfitCenter?: string;
  MRPGroup?: string;
  MRPController?: string;
  ValuationClass?: string;
  ClassType?: string;
  MaterialExtension?: string;
}

export interface INpdRequestGeneralInfoRow
  extends INpdRequestGeneralInfo,
    Record<string, unknown> {}

/** All / Approved dashboard row with item-line summary. */
export interface INpdRequestListItem extends INpdRequestGeneralInfo {
  ProjectName: string;
  ProductCount: number;
}

export interface INpdRequestListItemRow
  extends INpdRequestListItem,
    Record<string, unknown> {}

export interface INpdDraftSavePayload {
  id?: number | null;
  brand: string;
  materialType: string;
  plantSource: string;
  existingStatus?: string | null;
  existingTitle?: string | null;
}

export interface INpdItemDetailRecord {
  sharePointId: number;
  rocaGlobalCode: string;
  materialCode: string;
  materialDescription: string;
  productGroupMg2: string[];
  productCategoryMg3: string[];
  productTypeMg4: string[];
  productSourceMg5: string[];
  colorMgp1a: string[];
  productRangeMgp2a: string[];
  productSubCategoryMgp3a: string[];
  materialGroup: string[];
  extMaterialGroup: string[];
  productSegment: string[];
  taxClassification: string[];
  classNumberPcsName: string[];
  hsnCode: string;
  weightKg: number | null;
  uom: string[];
  minQtyBoxQty: string;
  /** True when the line item was added by the MIS Coordinator, highlighted in Item Details table. */
  isMisAdded?: boolean;
}

export interface INpdItemDetailsImportParseResult {
  toCreate: INpdItemDetailRecord[];
  duplicates: string[];
  errors: string[];
}

export interface INpdApproverCommentPayload {
  requestId: number;
  requestTitle: string;
  comments: string;
  role: string;
  userIds: number[];
  action: string;
  /** Used to ensure the Person field resolves to the logged-in site user. */
  actorEmail?: string;
  actionVia?: string;
}

/** Display row for NPD Approver Comments / Audit Log DataTable. */
export interface INpdApproverCommentRow extends Record<string, unknown> {
  id: number;
  status: string;
  actionedBy: string;
  actionedByEmail?: string;
  role: string;
  comments: string;
  created?: string;
  actionVia?: string;
}

export type NpdWorkflowAction = "Approve" | "Reject" | "Rework";

/** ROCA ApproversMaster row (subset used for initiator brand resolution). */
export interface IApproversMasterRecord {
  Id: number;
  BrandTitle: string;
  RoleTitle: string;
  SystemTitle: string;
  UserEmails: string[];
}

/** One ApproversMaster assignment that matches the logged-in user. */
export interface IRoleBrandAssignment {
  role: string;
  system: string;
  brands: string[];
}

/**
 * Session access context. A user can hold multiple roles at once
 * (e.g. Admin + Initiator + Vertical Head). Permissions are a union.
 */
export interface IResolvedUserAccess {
  assignedRoles: string[];
  mappedBrands: string[];
  npdInitiatorBrands: string[];
  npdVerticalHeadBrands: string[];
  npdMisCoordinatorBrands: string[];
  mgInitiatorBrands: string[];
  mgConsultantBrands: string[];
  assignments: IRoleBrandAssignment[];
}

/** Brand/ownership scope used by list queries and request-level checks. */
export interface IRequestViewScope {
  includeOwn: boolean;
  /** `null` = no brand restriction (Admin or MIS Coordinator). */
  brandFilter: string[] | null;
}

export interface IRequestAccessInput {
  createdByEmail?: string;
  brand?: string;
  module: "npd" | "mg";
}

/** Dynamic JSON entry stored in NPD_MaterialGroupRequests.RequestsJSON */
export interface IMaterialGroupRequestJsonEntry {
  LookupId: string;
  LookupName: string;
  Code: string;
  Description: string;
}

/** Configuration option loaded from NPD_MaterialGroupConfig. */
export interface IMaterialGroupConfigOption {
  id: number;
  title: string;
  relatedFieldId?: number;
  relatedFieldTitle?: string;
}

/** Form entry row for a specific material group master. */
export interface IMaterialGroupEntryRow {
  tempId: string;
  sharePointId?: number;
  code: string;
  description: string;
  /** True when the row was added by the user after the form loaded (not hydrated from SharePoint). Used for highlighting. */
  isNew?: boolean;
}

/** Payload for saving an item into NPD_MaterialGroupRequests. */
export interface IMaterialGroupRequestPayload {
  Title?: string;
  Code?: string;
  Description?: string;
  MaterialGroupConfigId?: number | number[];
  RequestsJSON?: string;
  Status: string;
  InitiatorId?: number;
}

/** SharePoint list item — NPD_MaterialGroupRequests */
export interface IMaterialGroupItem {
  Id: number;
  Title?: string;
  Code?: string;
  Description?: string;
  RequestsJSON?: string;
  MaterialGroupConfigId?: number | number[];
  MaterialGroupConfig?:
    | {
        Id: number;
        Title: string;
      }
    | Array<{
        Id: number;
        Title: string;
      }>;
  GUID?: string;
  Status: string;
  Initiator?: {
    Id: number;
    Title: string;
    EMail: string;
  };
  InitiatorId?: number;
  Created?: string;
  Modified?: string;
  Author?: {
    Id: number;
    Title: string;
    EMail: string;
  };
}

/** Request row for Material Group requests table. */
export interface IMaterialGroupGroupedRequest extends Record<string, unknown> {
  id: number;
  guid?: string;
  requestId: string;
  configuredMasters: string[];
  configuredMasterIds: number[];
  entriesCount: number;
  initiatorName: string;
  initiatorEmail: string;
  createdDate: string;
  status: string;
  currentApprover: string;
  currentApproverEmail?: string;
  requestsJson?: IMaterialGroupRequestJsonEntry[];
  items?: IMaterialGroupItem[];
}

/** Payload for hydrating Material Group Form from SharePoint by ID or GUID */
export interface IMaterialGroupHydratePayload {
  id?: number;
  guid?: string;
  requestId: string;
  status: string;
  selectedConfigIds: number[];
  entriesByConfigId: Record<number, IMaterialGroupEntryRow[]>;
  initiatorName?: string;
  initiatorEmail?: string;
  /** Audit log rows from NPD_MaterialGroupAuditLogs (newest first). */
  auditLogs?: IMaterialGroupAuditLogRow[];
  /** @deprecated Prefer auditLogs DataTable. */
  latestComments?: string;
  latestCommentAction?: string;
}

/** Audit log row written on Consultant Rework / Reject / Complete. */
export interface IMaterialGroupAuditLogPayload {
  requestListItemId: number;
  requestTitle: string;
  action: "Rework" | "Rejected" | "Completed";
  comments: string;
  /** Site user Id for the Consultant Person/Group column. */
  consultantUserId?: number;
  consultantEmail?: string;
  role?: string;
  actionVia?: string;
}

/** Display row for Initiator audit-log DataTable. */
export interface IMaterialGroupAuditLogRow extends Record<string, unknown> {
  id: number;
  status: string;
  actionedBy: string;
  actionedByEmail?: string;
  role?: string;
  comments: string;
  created?: string;
  actionVia?: string;
}

