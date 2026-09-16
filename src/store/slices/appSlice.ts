import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Config, UserRole } from "../../External/CommonServices/Config";

export interface IAppState {
  userDisplayName: string;
  userEmail: string;
  userLoginName: string;
  userId: number;
  siteUrl: string;
  activeRole: UserRole;
  initialized: boolean;
}

const initialState: IAppState = {
  userDisplayName: "",
  userEmail: "",
  userLoginName: "",
  userId: 0,
  siteUrl: "",
  activeRole: Config.Roles.Admin,
  initialized: false,
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setUserContext(
      state,
      action: PayloadAction<{
        displayName: string;
        email: string;
        loginName: string;
        userId?: number;
        siteUrl: string;
      }>,
    ) {
      state.userDisplayName = action.payload.displayName;
      state.userEmail = action.payload.email;
      state.userLoginName = action.payload.loginName;
      state.userId = action.payload.userId ?? 0;
      state.siteUrl = action.payload.siteUrl;
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
