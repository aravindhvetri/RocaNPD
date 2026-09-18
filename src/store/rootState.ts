import type { IAdminState } from "./slices/adminState.types";
import type { IAppState } from "./slices/appSlice";
import type { INpdFormState } from "./slices/npdFormState.types";
import type { INpdRequestListState } from "./slices/npdRequestState.types";
import type { IUiState } from "./slices/uiSlice";

export type RootState = {
  app: IAppState;
  ui: IUiState;
  admin: IAdminState;
  npdForm: INpdFormState;
  npdRequest: INpdRequestListState;
};
