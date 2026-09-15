import type {
  IBrandMaterialExtension,
  ILookup,
  ILookupType,
  ISelectOption,
  IWorkflowConfigStep,
} from "../../External/CommonServices/Interface";

export type AdminRequestStatus = "idle" | "loading" | "saving" | "error";

export interface ILookupTypeState {
  items: ILookupType[];
  status: AdminRequestStatus;
  error: string | null;
}

export interface ILookupState {
  items: ILookup[];
  status: AdminRequestStatus;
  error: string | null;
}

export interface IRocaMasterOptionsState {
  brands: ISelectOption[];
  plants: ISelectOption[];
  brandsStatus: AdminRequestStatus;
  plantsStatus: AdminRequestStatus;
  error: string | null;
}

export interface IBrandMaterialExtensionState {
  items: IBrandMaterialExtension[];
  status: AdminRequestStatus;
  error: string | null;
  rocaOptions: IRocaMasterOptionsState;
}

export interface IWorkflowConfigState {
  steps: IWorkflowConfigStep[];
  status: AdminRequestStatus;
  error: string | null;
  npdRoles: ISelectOption[];
  npdRolesStatus: AdminRequestStatus;
}

export interface IAdminState {
  lookupType: ILookupTypeState;
  lookup: ILookupState;
  brandMaterialExtension: IBrandMaterialExtensionState;
  workflowConfig: IWorkflowConfigState;
}
