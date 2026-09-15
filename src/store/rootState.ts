import type { IAdminState } from "./slices/adminState.types";
import type { IAppState } from "./slices/appSlice";
import type { IUiState } from "./slices/uiSlice";

export type RootState = {
  app: IAppState;
  ui: IUiState;
  admin: IAdminState;
};
