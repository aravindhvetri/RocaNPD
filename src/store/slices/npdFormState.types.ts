import type {
  INpdGeneralInfo,
  INpdWorkflowStepJson,
  ISelectOption,
} from "../../External/CommonServices/Interface";

export type NpdFormRequestStatus = "idle" | "loading" | "error";
export type NpdFormSaveStatus = "idle" | "saving" | "submitting";

export interface INpdFormState {
  requestId: number | null;
  requestStatus: string | null;
  requestTitle: string | null;
  workflowSteps: INpdWorkflowStepJson[];
  generalInfo: INpdGeneralInfo;
  brandOptions: ISelectOption[];
  plantSourceOptions: ISelectOption[];
  lookupOptionsByType: Record<string, ISelectOption[]>;
  brandOptionsStatus: NpdFormRequestStatus;
  plantSourceStatus: NpdFormRequestStatus;
  lookupOptionsStatus: NpdFormRequestStatus;
  loadStatus: NpdFormRequestStatus;
  saveStatus: NpdFormSaveStatus;
  error: string | null;
}
