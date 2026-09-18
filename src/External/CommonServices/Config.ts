import { NAV_SECTIONS } from "./navigationConfig";

export const ListNames = {
  LookupType: "NPD_LookupType",
  Lookup: "NPD_Lookup",
  BrandMaterialExtension: "NPD_BrandMaterialExtensionMaster",
  WorkflowConfig: "NPD_WorkflowConfig",
  NpdRequest: "NPD_Request",
  NpdItemDetails: "NPD_ItemDetails",
  NpdApproverComments: "NPD_ApproverComments",
} as const;

export const RocaMasterListNames = {
  BrandMaster: "BrandMaster",
  PlantMaster: "PlantMaster",
  RoleMaster: "RoleMaster",
  ApproversMaster: "ApproversMaster",
} as const;

/** System lookup Title values on ROCA ApproversMaster. */
export const ApproverSystems = {
  NewProductDevelopment: "New Product Development",
  NewMaterialGroup: "New Material Group",
} as const;

/** System lookup Title on ROCA ApproversMaster for NPD initiator brand scope. */
export const NpdApproverSystems = {
  NewProductDevelopment: ApproverSystems.NewProductDevelopment,
} as const;

/** SharePoint groups on the NPD site used for permission resolution. */
export const SharePointGroups = {
  Admins: "Admins",
} as const;

/** NPD Request Material Type choices (General Information). */
export const NpdMaterialTypes = {
  FinishedProducts: "Finished Products",
  TradedProducts: "Traded Products",
} as const;

/** PlantMaster filters for Finished Products Plant / Source dropdown. */
export const NpdPlantSourceFilters = {
  FactoryPlantType: "Factory",
  ActiveYes: "Yes",
} as const;

/** Traded Products Plant / Source choices (from lookup master / BRD). */
export const NpdTradedPlantSources = {
  Imported: "Imported",
  Domestic: "Domestic",
} as const;

/** Brands that require Roca Global Code on Item Details rows. */
export const NpdRocaGlobalCodeBrands = ["Roca", "Laufen", "Armani"] as const;

export const WorkflowRequestTypes = {
  NpdRequest: "NPD Request",
  MgRequest: "MG Request",
} as const;

export const WorkflowSystems = {
  Npd: "NPD",
  Mg: "MG",
} as const;

export const WorkflowDefaults = {
  NpdStartRole: "Initiator",
  MgStartRole: "Initiator",
  MgNextRole: "Consultant",
} as const;

/** Roles excluded from NPD Request Next Role dropdown (e.g. MG-only roles). */
export const WorkflowNpdExcludedNextRoles = [
  WorkflowDefaults.MgNextRole,
] as const;

export const RequestStatus = {
  Draft: "Draft",
  Pending: "Pending",
  Approved: "Approved",
  Rework: "Rework",
  Rejected: "Rejected",
  Completed: "Completed",
} as const;

export const WorkflowStepStatus = {
  Pending: "Pending",
  Approved: "Approved",
  Rework: "Rework",
  Rejected: "Rejected",
} as const;

export const LibraryNames = {
  NPDTemplates: "NPD_Templates",
} as const;

export const TemplateTypes = {
  LookupType: "Lookup Type",
  Lookup: "Lookup",
  NpdItemDetails: "NPDItemDetails",
  NpdApprovalEmail: "NPD Approval Email",
} as const;

export const NpdRequestIdFormat = {
  Prefix: "NPD-",
  PadLength: 3,
} as const;

export const NpdItemImport = {
  MaxRows: 200,
  MultiValueSeparator: "; ",
} as const;

export const ThemeColors = {
  Primary: "#1d4e56",
} as const;

export const NpdEmail = {
  HeaderBackground: ThemeColors.Primary,
  HeaderColor: "#ffffff",
  LogoContentId: "rocaLogo",
  LabelBackground: "#f7f3c8",
  BorderColor: "#d0d0d0",
  ApproveBackground: "#1e7a32",
  ReworkBackground: "#d97706",
  RejectBackground: "#c0392b",
  ButtonColor: "#ffffff",
  QueryAction: "action",
} as const;

export const NpdFormQuery = {
  Mode: "mode",
  View: "view",
  Edit: "edit",
  From: "from",
} as const;

export const NpdFormFrom = {
  All: "all",
  Pending: "pending",
  Approved: "approved",
  DraftRework: "draft-rework",
} as const;

/** Item Details DataTable page size. Pagination shows only when there are more rows. */
export const NpdItemDetailsPageSize = 15;

export const FieldNames = {
  Lookup: {
    /** Lookup Name in the UI — there is no LookupName column. */
    Title: "Title",
    LookupTypeId: "LookupTypeId",
    /** Lookup to NPD_LookupType; read Title via Expand. */
    LookupType: "LookupType",
    LookupCode: "LookupCode",
  },
  BrandMaterialExtension: {
    Title: "Title",
    Plant: "Plant",
  },
  WorkflowConfig: {
    Title: "Title",
    CurrentRole: "CurrentRole",
    NextRole: "NextRole",
  },
  NpdRequest: {
    Title: "Title",
    Brand: "Brand",
    MaterialType: "MaterialType",
    Plant: "Plant",
    Status: "Status",
    WorkFlowJSON: "WorkFlowJSON",
  },
  NpdItemDetails: {
    Title: "Title",
    RocaGlobalCode: "RocaGlobalCode",
    MaterialCode: "MaterialCode",
    MaterialDescription: "MaterialDescription",
    ProductGroupMG2: "ProductGroupMG2",
    ProductCategoryMG3: "ProductCategoryMG3",
    ProductTypeMG4: "ProductTypeMG4",
    ProductSourceMG5: "ProductSourceMG5",
    ColorMGP1A: "ColorMGP1A",
    ProductRangeMGP2A: "ProductRangeMGP2A",
    ProductSubCategoryMGP3A: "ProductSubCategoryMGP3A",
    MaterialGroup: "MaterialGroup",
    ExtMaterialGroup: "ExtMaterialGroup",
    ProductSegment: "ProductSegment",
    TaxClassification: "TaxClassification",
    ClassNumberPcsName: "ClassNumberPCS_x0020_Name",
    HSNCode: "HSNCode",
    Weight: "Weight",
    UOM: "UOM",
    MinQty: "MinQty",
    RequestGeneralInfo: "RequestGeneralInfo",
    RequestGeneralInfoId: "RequestGeneralInfoId",
  },
  NpdApproverComments: {
    Title: "Title",
    Comments: "Comments",
    UserId: "UserId",
    Role: "Role",
    NPDRequest: "NPDRequest",
    NPDRequestId: "NPDRequestId",
  },
} as const;

export const FieldLabels = {
  LookupTypeName: "Lookup Type Name",
  LookupType: "Lookup Type",
  LookupName: "Lookup Name",
  LookupCode: "Lookup Code",
  Brand: "Brand",
  BrandMg1: "Brand (MG1)",
  MaterialType: "Material Type",
  Plant: "Plant",
  PlantSource: "Plant / Source",
  RequestType: "Request Type",
  CurrentRole: "Current Role",
  NextRole: "Next Role",
  ApprovalChain: "Approval Chain",
  WorkflowSteps: "Workflow Steps",
  Workflow: "Workflow",
  WorkflowStatus: "Workflow Status",
  WorkflowRole: "Workflow Role",
  WorkflowNotCreated: "Workflow has not been created for this request.",
  EditingRestricted: "Editing Restricted",
  DraftSaved: "Draft Saved",
  Editing: "Editing",
  Submitted: "Submitted",
  GoToDashboard: "Go to Dashboard",
  ReloadPage: "Reload Page",
  EditingRestrictedHelp:
    "To prevent data corruption, duplicate submissions, or stale overwrites, further actions on this tab have been locked.",
  Name: "Name",
  Role: "Role",
  Initiated: "Initiated",
  Approver: "Approver",
  CurrentApprover: "Current Approver",
  PendingWithVh: "Pending with VH",
  PendingWithMisCoordinator: "Pending with MIS Coordinator",
  PendingWithPrefix: "Pending with",
  NoRecordsFound: "No Records Found",
  NoRequestsFound: "No Requests Found",
  NoItemsFound: "No Items Found",
  Status: "Status",
  CreatedDate: "Submitted Date",
  RequestId: "Request ID",
  TitleProjectName: "Title / Project Name",
  Products: "Products",
  Actions: "Actions",
  AllStatuses: "All Statuses",
  AllBrands: "All Brands",
  InRework: "In ReWork",
  Export: "Export",
  RocaGlobalCode: "Roca Global Code",
  MaterialCode: "Material Code",
  LineItemsAdded: "Line Items Added",
  MaterialDescription: "Material Description",
  ProductGroupMg2: "Product Group (MG2)",
  ProductCategoryMg3: "Product Category (MG3)",
  ProductTypeMg4: "Product Type (MG4)",
  ProductSourceMg5: "Product Source (MG5)",
  ColorMgp1a: "Color (MGP1A)",
  ProductRangeMgp2a: "Product Range (MGP2A)",
  ProductSubCategoryMgp3a: "Product Sub Category (MGP3A)",
  MaterialGroup: "Material Group",
  ExtMaterialGroup: "Ext. Material Group",
  ProductSegment: "Product Segment",
  TaxClassification: "Tax Classification",
  ClassNumberPcsName: "Class number (PCS Name)",
  HsnCode: "HSN Code",
  WeightKg: "Weight (Kg)",
  Uom: "UOM",
  MinQtyBoxQty: "Min. Qty/Box Qty",
  Comments: "Comments",
} as const;

export const DeleteDependencies = {
  Lookup: [
    {
      listName: ListNames.BrandMaterialExtension,
      filterKey: FieldNames.BrandMaterialExtension.Title,
      matchLookupName: true,
      blockedByLabel: "Brand Material Extension",
    },
  ],
} as const;

export const ImportExport = {
  MaxFileSizeBytes: 10 * 1024 * 1024,
  AcceptedSpreadsheetExtensions: [".xlsx", ".xls"] as const,
  AcceptedSpreadsheetAccept:
    ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
  AcceptedFormatsLabel: "Accepted formats: xlsx, xls",
  MaxSizeLabel: "Max size: 10 MB",
} as const;

export const Config = {
  AppTitle: "NPD REQUESTS — New Product Development",
  HeaderTitle: "New Product Development",

  ListNames,
  RocaMasterListNames,
  LibraryNames,
  TemplateTypes,
  NpdRequestIdFormat,
  NpdItemImport,
  ThemeColors,
  NpdEmail,
  NpdFormQuery,
  NpdFormFrom,
  NpdItemDetailsPageSize,
  FieldNames,
  FieldLabels,
  DeleteDependencies,
  ImportExport,
  WorkflowRequestTypes,
  WorkflowSystems,
  WorkflowDefaults,
  WorkflowNpdExcludedNextRoles,
  RequestStatus,
  WorkflowStepStatus,
  ApproverSystems,
  NpdApproverSystems,
  SharePointGroups,
  NpdMaterialTypes,
  NpdPlantSourceFilters,
  NpdTradedPlantSources,
  NpdRocaGlobalCodeBrands,

  Roles: {
    Initiator: "Initiator",
    VerticalHead: "Vertical Head",
    MisCoordinator: "MIS Coordinator",
    Consultant: "Consultant",
    Admin: "Admin",
  } as const,

  Routes: {
    Home: "/",
    NpdNew: "/npd/new",
    NpdAll: "/npd/all",
    NpdPending: "/npd/pending",
    NpdApproved: "/npd/approved",
    NpdDraftRework: "/npd/draft-rework",
    MgNew: "/mg/new",
    MgAll: "/mg/all",
    MgPending: "/mg/pending",
    MgCompleted: "/mg/completed",
    MgDraftRework: "/mg/draft-rework",
    Reports: "/reports",
    Unauthorized: "/unauthorized",
    AdminMaterialMaster: "/admin/material-master",
    AdminLookupType: "/admin/lookup-type",
    AdminLookup: "/admin/lookup",
    AdminWorkflowConfig: "/admin/workflow-config",
    AdminBrandExtension: "/admin/brand-extension",
  },

  Navigation: NAV_SECTIONS,

  /** Display version shown in the app shell footer. */
  AppVersion: "V1.0",
};

export type UserRole = (typeof Config.Roles)[keyof typeof Config.Roles];
