import { NAV_SECTIONS } from "./navigationConfig";

export const ListNames = {
  LookupType: "NPD_LookupType",
  Lookup: "NPD_Lookup",
  BrandMaterialExtension: "NPD_BrandMaterialExtensionMaster",
  WorkflowConfig: "NPD_WorkflowConfig",
} as const;

export const RocaMasterListNames = {
  BrandMaster: "BrandMaster",
  PlantMaster: "PlantMaster",
  RoleMaster: "RoleMaster",
} as const;

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

export const LibraryNames = {
  NPDTemplates: "NPD_Templates",
} as const;

export const TemplateTypes = {
  LookupType: "Lookup Type",
  Lookup: "Lookup",
} as const;

export const FieldNames = {
  Lookup: {
    Title: "Title",
    LookupTypeId: "LookupTypeId",
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
} as const;

export const FieldLabels = {
  LookupTypeName: "Lookup Type Name",
  LookupType: "Lookup Type",
  LookupName: "Lookup Name",
  LookupCode: "Lookup Code",
  Brand: "Brand",
  Plant: "Plant",
  RequestType: "Request Type",
  CurrentRole: "Current Role",
  NextRole: "Next Role",
  ApprovalChain: "Approval Chain",
  WorkflowSteps: "Workflow Steps",
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
  HeaderTitle: "ADVERTISEMENT & PROMOTION",

  ListNames,
  RocaMasterListNames,
  LibraryNames,
  TemplateTypes,
  FieldNames,
  FieldLabels,
  DeleteDependencies,
  ImportExport,
  WorkflowRequestTypes,
  WorkflowSystems,
  WorkflowDefaults,
  WorkflowNpdExcludedNextRoles,

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
  },

  Navigation: NAV_SECTIONS,

  /** Display version shown in the app shell footer. */
  AppVersion: "V1.0",
};

export type UserRole = (typeof Config.Roles)[keyof typeof Config.Roles];
