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

/** SharePoint list item — NPD_Lookup */
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
