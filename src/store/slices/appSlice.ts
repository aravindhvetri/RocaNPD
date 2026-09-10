import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Config, UserRole } from "../../External/CommonServices/Config";

export interface IAppState {
  userDisplayName: string;
  userEmail: string;
  activeRole: UserRole;
  initialized: boolean;
}

const initialState: IAppState = {
  userDisplayName: "",
  userEmail: "",
  activeRole: Config.Roles.Admin,
  initialized: false,
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setUserContext(
      state,
      action: PayloadAction<{ displayName: string; email: string }>,
    ) {
      state.userDisplayName = action.payload.displayName;
      state.userEmail = action.payload.email;
    },
    setActiveRole(state, action: PayloadAction<UserRole>) {
      state.activeRole = action.payload;
    },
    setInitialized(state, action: PayloadAction<boolean>) {
      state.initialized = action.payload;
    },
  },
});

export const { setUserContext, setActiveRole, setInitialized } = appSlice.actions;
export default appSlice.reducer;
