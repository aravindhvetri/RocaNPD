import type {
  ILookupType,
  INpdGeneralInfo,
  INpdOtherDetails,
  INpdWorkflowStepJson,
  ISelectOption,
} from "../../External/CommonServices/Interface";
import { createEmptyNpdOtherDetails } from "../../External/CommonServices/npdOtherDetailsService";

export type NpdFormRequestStatus = "idle" | "loading" | "error";
export type NpdFormSaveStatus = "idle" | "saving" | "submitting";

export interface INpdFormState {
  requestId: number | null;
  requestStatus: string | null;
  requestTitle: string | null;
  workflowSteps: INpdWorkflowStepJson[];
  generalInfo: INpdGeneralInfo;
  otherDetails: INpdOtherDetails;
  otherDetailsStatus: NpdFormRequestStatus;
  /** Latest populateNpdOtherDetails request id — ignore stale fulfilled results. */
  otherDetailsRequestId: string | null;
  profitCenterOptions: ISelectOption[];
  brandOptions: ISelectOption[];
  plantSourceOptions: ISelectOption[];
  lookupOptionsByType: Record<string, ISelectOption[]>;
  /** Active NPD_LookupType rows — drives Item Details Required flags. */
  lookupTypes: ILookupType[];
  brandOptionsStatus: NpdFormRequestStatus;
  plantSourceStatus: NpdFormRequestStatus;
  lookupOptionsStatus: NpdFormRequestStatus;
  loadStatus: NpdFormRequestStatus;
  saveStatus: NpdFormSaveStatus;
  error: string | null;
}

export { createEmptyNpdOtherDetails };
