import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Config, type UserRole } from "../../External/CommonServices/Config";
import type {
  IResolvedUserAccess,
  IRoleBrandAssignment,
} from "../../External/CommonServices/Interface";
import { emptyUserAccess } from "../../External/CommonServices/roleService";

export type RoleResolutionStatus = "idle" | "loading" | "succeeded" | "failed";

export interface IAppState {
  userDisplayName: string;
  userEmail: string;
  userLoginName: string;
  userId: number;
  siteUrl: string;
  /** Display/primary role only — never used to hide another assigned role. */
  activeRole: UserRole | null;
  assignedRoles: string[];
  mappedBrands: string[];
  npdInitiatorBrands: string[];
  npdVerticalHeadBrands: string[];
  npdMisCoordinatorBrands: string[];
  mgInitiatorBrands: string[];
  mgConsultantBrands: string[];
  roleAssignments: IRoleBrandAssignment[];
  roleStatus: RoleResolutionStatus;
  roleError: string | null;
  initialized: boolean;
}

const initialAccess = emptyUserAccess();

const initialState: IAppState = {
  userDisplayName: "",
  userEmail: "",
  userLoginName: "",
  userId: 0,
  siteUrl: "",
  activeRole: null,
  assignedRoles: initialAccess.assignedRoles,
  mappedBrands: initialAccess.mappedBrands,
  npdInitiatorBrands: initialAccess.npdInitiatorBrands,
  npdVerticalHeadBrands: initialAccess.npdVerticalHeadBrands,
  npdMisCoordinatorBrands: initialAccess.npdMisCoordinatorBrands,
  mgInitiatorBrands: initialAccess.mgInitiatorBrands,
  mgConsultantBrands: initialAccess.mgConsultantBrands,
  roleAssignments: initialAccess.assignments,
  roleStatus: "idle",
  roleError: null,
  initialized: false,
};

function applyAccess(state: IAppState, access: IResolvedUserAccess): void {
  state.assignedRoles = access.assignedRoles;
  state.mappedBrands = access.mappedBrands;
  state.npdInitiatorBrands = access.npdInitiatorBrands;
  state.npdVerticalHeadBrands = access.npdVerticalHeadBrands;
  state.npdMisCoordinatorBrands = access.npdMisCoordinatorBrands;
  state.mgInitiatorBrands = access.mgInitiatorBrands;
  state.mgConsultantBrands = access.mgConsultantBrands;
  state.roleAssignments = access.assignments;
  state.activeRole = pickPrimaryRole(access.assignedRoles);
}

function pickPrimaryRole(assignedRoles: string[]): UserRole | null {
  const order: UserRole[] = [
    Config.Roles.Initiator,
    Config.Roles.VerticalHead,
    Config.Roles.MisCoordinator,
    Config.Roles.Consultant,
    Config.Roles.Admin,
  ];

  return order.find((role) => assignedRoles.includes(role)) ?? null;
}

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
    setRoleStatus(state, action: PayloadAction<RoleResolutionStatus>) {
      state.roleStatus = action.payload;
      if (action.payload === "loading") {
        state.roleError = null;
      }
    },
    setUserAccess(state, action: PayloadAction<IResolvedUserAccess>) {
      applyAccess(state, action.payload);
      state.roleStatus = "succeeded";
      state.roleError = null;
    },
    setRoleError(state, action: PayloadAction<string>) {
      applyAccess(state, emptyUserAccess());
      state.roleStatus = "failed";
      state.roleError = action.payload;
    },
    setInitialized(state, action: PayloadAction<boolean>) {
      state.initialized = action.payload;
    },
  },
});

export const {
  setUserContext,
  setRoleStatus,
  setUserAccess,
  setRoleError,
  setInitialized,
} = appSlice.actions;
export default appSlice.reducer;

export function selectResolvedAccess(state: {
  app: IAppState;
}): IResolvedUserAccess {
  const app = state.app;
  return {
    assignedRoles: app.assignedRoles,
    mappedBrands: app.mappedBrands,
    npdInitiatorBrands: app.npdInitiatorBrands,
    npdVerticalHeadBrands: app.npdVerticalHeadBrands,
    npdMisCoordinatorBrands: app.npdMisCoordinatorBrands,
    mgInitiatorBrands: app.mgInitiatorBrands,
    mgConsultantBrands: app.mgConsultantBrands,
    assignments: app.roleAssignments,
  };
}
