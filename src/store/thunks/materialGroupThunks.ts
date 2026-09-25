import { createAsyncThunk } from "@reduxjs/toolkit";
import { Config } from "../../External/CommonServices/Config";
import type {
  IMaterialGroupConfigOption,
  IMaterialGroupEntryRow,
  IMaterialGroupGroupedRequest,
  IMaterialGroupHydratePayload,
} from "../../External/CommonServices/Interface";
import * as materialGroupService from "../../External/CommonServices/materialGroupService";
import type { RootState } from "../rootState";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}

export const fetchMaterialGroupConfigsThunk = createAsyncThunk<
  IMaterialGroupConfigOption[],
  void,
  { rejectValue: string; state: RootState }
>(
  "materialGroup/fetchConfigs",
  async (_, { rejectWithValue }) => {
    try {
      return await materialGroupService.fetchMaterialGroupConfigs();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const mgState = getState().materialGroup;
      if (mgState && mgState.configsStatus === "loading") {
        return false;
      }
      return true;
    },
  },
);

export const saveMaterialGroupDraftThunk = createAsyncThunk<
  { id: number; guid: string },
  void,
  { rejectValue: string; state: RootState }
>("materialGroup/saveDraft", async (_, { getState, rejectWithValue }) => {
  try {
    const {
      selectedConfigIds,
      entriesByConfigId,
      configs,
      currentId,
      currentGuid,
    } = getState().materialGroup;
    const appState = getState().app;

    if (!selectedConfigIds.length) {
      return rejectWithValue(
        "Please select at least one master category to configure.",
      );
    }

    // Validate that Description is filled for every entry row
    for (const configId of selectedConfigIds) {
      const configItem = configs.find((c) => c.id === configId);
      const masterName = configItem ? configItem.title : `Master (${configId})`;
      const rows = entriesByConfigId[configId] || [];

      if (rows.length === 0) {
        return rejectWithValue(
          `Please add at least one entry for ${masterName}.`,
        );
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.description.trim()) {
          return rejectWithValue(
            `Description is required for ${masterName}${rows.length > 1 ? ` (Row ${i + 1})` : ""}.`,
          );
        }
      }
    }

    const targetId = currentId ?? (currentGuid ? Number(currentGuid) : undefined);

    return await materialGroupService.saveMaterialGroupDraft({
      id: targetId && targetId > 0 ? targetId : undefined,
      guid: currentGuid || undefined,
      selectedConfigIds,
      entriesByConfigId,
      actorEmail: appState.userEmail,
      actorName: appState.userDisplayName || appState.userLoginName,
      actorId: appState.userId,
    });
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const submitMaterialGroupRequestThunk = createAsyncThunk<
  { id: number; guid: string; requestId: string },
  void,
  { rejectValue: string; state: RootState }
>("materialGroup/submitRequest", async (_, { getState, rejectWithValue }) => {
  try {
    const {
      selectedConfigIds,
      entriesByConfigId,
      configs,
      currentId,
      currentGuid,
      currentRequestId,
    } = getState().materialGroup;
    const appState = getState().app;

    if (!selectedConfigIds.length) {
      return rejectWithValue(
        "Please select at least one master category to configure.",
      );
    }

    const masterTitles: Record<number, string> = {};
    for (const configId of selectedConfigIds) {
      const configItem = configs.find((c) => c.id === configId);
      const masterName = configItem ? configItem.title : `Master (${configId})`;
      masterTitles[configId] = masterName;
      const rows = entriesByConfigId[configId] || [];

      if (rows.length === 0) {
        return rejectWithValue(
          `Please add at least one entry for ${masterName}.`,
        );
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.description.trim()) {
          return rejectWithValue(
            `Description is required for ${masterName}${rows.length > 1 ? ` (Row ${i + 1})` : ""}.`,
          );
        }
      }
    }

    const targetId = currentId ?? (currentGuid ? Number(currentGuid) : undefined);

    return await materialGroupService.submitMaterialGroupRequest({
      id: targetId && targetId > 0 ? targetId : undefined,
      guid: currentGuid || undefined,
      selectedConfigIds,
      entriesByConfigId,
      actorEmail: appState.userEmail,
      actorName: appState.userDisplayName || appState.userLoginName,
      actorId: appState.userId,
      masterTitles,
      existingRequestId: currentRequestId || undefined,
    });
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchMaterialGroupRequestByIdThunk = createAsyncThunk<
  IMaterialGroupHydratePayload,
  string | number,
  { rejectValue: string; state: RootState }
>("materialGroup/fetchById", async (idOrGuid, { rejectWithValue }) => {
  try {
    return await materialGroupService.fetchMaterialGroupRequestById(idOrGuid);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

// Backward-compatible alias
export const fetchMaterialGroupRequestByGuidThunk =
  fetchMaterialGroupRequestByIdThunk;

export const fetchGroupedMaterialGroupRequestsThunk = createAsyncThunk<
  IMaterialGroupGroupedRequest[],
  { variant?: "all" | "draft-rework" | "pending" | "completed" } | undefined,
  { rejectValue: string; state: RootState }
>("materialGroup/fetchGrouped", async (params, { getState, rejectWithValue }) => {
  try {
    const appState = getState().app;
    return await materialGroupService.fetchGroupedMaterialGroupRequests({
      userEmail: appState.userEmail || appState.userLoginName,
      userId: appState.userId,
      userLoginName: appState.userLoginName,
      assignedRoles: appState.assignedRoles,
      variant: params?.variant ?? "all",
    });
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export interface IConsultantActionThunkParams {
  id?: number;
  guid?: string;
  action: "Completed" | "Rework" | "Rejected";
  comments: string;
  entriesByConfigId?: Record<number, IMaterialGroupEntryRow[]>;
  actorRole?: string;
}

export const consultantActionMaterialGroupThunk = createAsyncThunk<
  void,
  IConsultantActionThunkParams,
  { rejectValue: string; state: RootState }
>("materialGroup/consultantAction", async (params, { getState, rejectWithValue }) => {
  try {
    const mgState = getState().materialGroup;
    const configuredMasters = (params.entriesByConfigId
      ? Object.keys(params.entriesByConfigId)
      : mgState.selectedConfigIds.map(String)
    )
      .map((idStr) => {
        const cfg = mgState.configs.find((c) => c.id === Number(idStr));
        return cfg?.title || "";
      })
      .filter(Boolean);

    const assignedRoles = getState().app.assignedRoles || [];
    const rolePriority = [
      Config.Roles.Consultant,
      Config.Roles.VerticalHead,
      Config.Roles.MisCoordinator,
    ];
    const actorRole =
      params.actorRole ||
      rolePriority.find((role) =>
        assignedRoles.some(
          (r) => r.trim().toLowerCase() === role.toLowerCase(),
        ),
      ) ||
      Config.Roles.Consultant;

    await materialGroupService.updateConsultantMaterialGroupAction({
      ...params,
      requestId: mgState.currentRequestId || undefined,
      initiatorName: mgState.initiatorName || undefined,
      initiatorEmail: mgState.initiatorEmail || undefined,
      configuredMasters,
      actorUserId: getState().app.userId,
      actorEmail: getState().app.userEmail || getState().app.userLoginName,
      actorName: getState().app.userDisplayName,
      actorRole,
    });
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
