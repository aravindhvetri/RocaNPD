import type {
  INpdGeneralInfo,
  ISelectOption,
} from "../../External/CommonServices/Interface";

export type NpdFormRequestStatus = "idle" | "loading" | "error";

export interface INpdFormState {
  generalInfo: INpdGeneralInfo;
  brandOptions: ISelectOption[];
  plantSourceOptions: ISelectOption[];
  brandOptionsStatus: NpdFormRequestStatus;
  plantSourceStatus: NpdFormRequestStatus;
  error: string | null;
}
