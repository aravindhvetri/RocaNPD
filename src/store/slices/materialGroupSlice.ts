import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
  IMaterialGroupAuditLogRow,
  IMaterialGroupConfigOption,
  IMaterialGroupEntryRow,
  IMaterialGroupGroupedRequest,
  IMaterialGroupHydratePayload,
} from "../../External/CommonServices/Interface";
import {
  consultantActionMaterialGroupThunk,
  fetchGroupedMaterialGroupRequestsThunk,
  fetchMaterialGroupConfigsThunk,
  fetchMaterialGroupRequestByIdThunk,
  fetchMaterialGroupRequestByGuidThunk,
  saveMaterialGroupDraftThunk,
  submitMaterialGroupRequestThunk,
} from "../thunks/materialGroupThunks";

function createEmptyRow(isNew = false): IMaterialGroupEntryRow {
  return {
    tempId: `row_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    code: "",
    description: "",
    isNew,
  };
}

export interface IMaterialGroupState {
  configs: IMaterialGroupConfigOption[];
  configsStatus: "idle" | "loading" | "succeeded" | "failed";

  currentId: number | null;
  currentGuid: string | null;
  currentRequestId: string | null;
  currentStatus: string | null;
  initiatorName: string | null;
  initiatorEmail: string | null;
  auditLogs: IMaterialGroupAuditLogRow[];
  latestComments: string | null;
  latestCommentAction: string | null;

  selectedConfigIds: number[];
  entriesByConfigId: Record<number, IMaterialGroupEntryRow[]>;

  saveStatus: "idle" | "saving" | "succeeded" | "failed";
  submitStatus: "idle" | "submitting" | "succeeded" | "failed";
  hydrateStatus: "idle" | "loading" | "succeeded" | "failed";
  consultantActionStatus: "idle" | "saving" | "succeeded" | "failed";

  groupedRequests: IMaterialGroupGroupedRequest[];
  groupedRequestsStatus: "idle" | "loading" | "succeeded" | "failed";

  error: string | null;
}

const initialState: IMaterialGroupState = {
  configs: [],
  configsStatus: "idle",

  currentId: null,
  currentGuid: null,
  currentRequestId: null,
  currentStatus: null,
  initiatorName: null,
  initiatorEmail: null,
  auditLogs: [],
  latestComments: null,
  latestCommentAction: null,

  selectedConfigIds: [],
  entriesByConfigId: {},

  saveStatus: "idle",
  submitStatus: "idle",
  hydrateStatus: "idle",
  consultantActionStatus: "idle",

  groupedRequests: [],
  groupedRequestsStatus: "idle",

  error: null,
};

export const materialGroupSlice = createSlice({
  name: "materialGroup",
  initialState,
  reducers: {
    toggleConfigId: (state, action: PayloadAction<number>) => {
      const configId = action.payload;
      const index = state.selectedConfigIds.indexOf(configId);
      if (index >= 0) {
        state.selectedConfigIds.splice(index, 1);
      } else {
        state.selectedConfigIds.push(configId);
        if (
          !state.entriesByConfigId[configId] ||
          state.entriesByConfigId[configId].length === 0
        ) {
          state.entriesByConfigId[configId] = [createEmptyRow()];
        }
      }
    },
    selectAllConfigs: (state) => {
      state.selectedConfigIds = state.configs.map((c) => c.id);
      for (const config of state.configs) {
        if (
          !state.entriesByConfigId[config.id] ||
          state.entriesByConfigId[config.id].length === 0
        ) {
          state.entriesByConfigId[config.id] = [createEmptyRow()];
        }
      }
    },
    clearAllConfigs: (state) => {
      state.selectedConfigIds = [];
    },
    addRow: (state, action: PayloadAction<number>) => {
      const configId = action.payload;
      if (!state.entriesByConfigId[configId]) {
        state.entriesByConfigId[configId] = [];
      }
      state.entriesByConfigId[configId].push(createEmptyRow(false));
    },
    removeRow: (
      state,
      action: PayloadAction<{ configId: number; tempId: string }>,
    ) => {
      const { configId, tempId } = action.payload;
      const rows = state.entriesByConfigId[configId];
      if (!rows) {
        return;
      }
      state.entriesByConfigId[configId] = rows.filter((r) => r.tempId !== tempId);
    },
    updateRowField: (
      state,
      action: PayloadAction<{
        configId: number;
        tempId: string;
        field: "code" | "description";
        value: string;
      }>,
    ) => {
      const { configId, tempId, field, value } = action.payload;
      const rows = state.entriesByConfigId[configId];
      if (!rows) {
        return;
      }
      const row = rows.find((r) => r.tempId === tempId);
      if (row) {
        row[field] = value;
      }
    },
    setHydratedForm: (
      state,
      action: PayloadAction<IMaterialGroupHydratePayload>,
    ) => {
      const payload = action.payload;
      state.currentId =
        payload.id ?? (payload.guid ? Number(payload.guid) : null);
      state.currentGuid =
        payload.guid ?? (payload.id ? String(payload.id) : null);
      state.currentRequestId = payload.requestId;
      state.currentStatus = payload.status;
      state.selectedConfigIds = payload.selectedConfigIds;
      state.entriesByConfigId = payload.entriesByConfigId;
      state.initiatorName = payload.initiatorName ?? null;
      state.initiatorEmail = payload.initiatorEmail ?? null;
      state.auditLogs = payload.auditLogs ?? [];
      state.latestComments = payload.latestComments ?? null;
      state.latestCommentAction = payload.latestCommentAction ?? null;
    },
    resetMaterialGroupForm: (state) => {
      state.currentId = null;
      state.currentGuid = null;
      state.currentRequestId = null;
      state.currentStatus = null;
      state.initiatorName = null;
      state.initiatorEmail = null;
      state.auditLogs = [];
      state.latestComments = null;
      state.latestCommentAction = null;
      state.selectedConfigIds = [];
      state.entriesByConfigId = {};
      state.saveStatus = "idle";
      state.submitStatus = "idle";
      state.hydrateStatus = "idle";
      state.consultantActionStatus = "idle";
      state.error = null;
    },
    clearMaterialGroupError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch configs
      .addCase(fetchMaterialGroupConfigsThunk.pending, (state) => {
        state.configsStatus = "loading";
        state.error = null;
      })
      .addCase(fetchMaterialGroupConfigsThunk.fulfilled, (state, action) => {
        state.configsStatus = "succeeded";
        state.configs = action.payload;
      })
      .addCase(fetchMaterialGroupConfigsThunk.rejected, (state, action) => {
        state.configsStatus = "failed";
        state.error = action.payload || "Failed to load master configurations.";
      })

      // Save draft
      .addCase(saveMaterialGroupDraftThunk.pending, (state) => {
        state.saveStatus = "saving";
        state.error = null;
      })
      .addCase(saveMaterialGroupDraftThunk.fulfilled, (state, action) => {
        state.saveStatus = "succeeded";
        state.currentId = action.payload.id;
        state.currentGuid = action.payload.guid;
      })
      .addCase(saveMaterialGroupDraftThunk.rejected, (state, action) => {
        state.saveStatus = "failed";
        state.error = action.payload || "Failed to save draft.";
      })

      // Submit request
      .addCase(submitMaterialGroupRequestThunk.pending, (state) => {
        state.submitStatus = "submitting";
        state.error = null;
      })
      .addCase(submitMaterialGroupRequestThunk.fulfilled, (state, action) => {
        state.submitStatus = "succeeded";
        state.currentId = action.payload.id;
        state.currentGuid = action.payload.guid;
        state.currentRequestId = action.payload.requestId;
        state.currentStatus = "Pending";
      })
      .addCase(submitMaterialGroupRequestThunk.rejected, (state, action) => {
        state.submitStatus = "failed";
        state.error = action.payload || "Failed to submit request.";
      })

      // Fetch by ID / GUID (hydration)
      .addCase(fetchMaterialGroupRequestByGuidThunk.pending, (state, action) => {
        state.hydrateStatus = "loading";
        state.error = null;
        const requestedId = String(action.meta.arg);
        const current =
          state.currentId != null
            ? String(state.currentId)
            : state.currentGuid;
        if (current !== requestedId) {
          state.selectedConfigIds = [];
          state.entriesByConfigId = {};
          state.currentRequestId = null;
          state.currentStatus = null;
          state.auditLogs = [];
          state.latestComments = null;
          state.latestCommentAction = null;
        }
      })
      .addCase(
        fetchMaterialGroupRequestByGuidThunk.fulfilled,
        (state, action) => {
          state.hydrateStatus = "succeeded";
          const payload = action.payload;
          state.currentId =
            payload.id ?? (payload.guid ? Number(payload.guid) : null);
          state.currentGuid =
            payload.guid ?? (payload.id ? String(payload.id) : null);
          state.currentRequestId = payload.requestId;
          state.currentStatus = payload.status;
          state.selectedConfigIds = payload.selectedConfigIds;
          state.entriesByConfigId = payload.entriesByConfigId;
          state.initiatorName = payload.initiatorName ?? null;
          state.initiatorEmail = payload.initiatorEmail ?? null;
          state.auditLogs = payload.auditLogs ?? [];
          state.latestComments = payload.latestComments ?? null;
          state.latestCommentAction = payload.latestCommentAction ?? null;
        },
      )
      .addCase(fetchMaterialGroupRequestByGuidThunk.rejected, (state, action) => {
        state.hydrateStatus = "failed";
        state.error = action.payload || "Failed to load request.";
      })

      // Fetch grouped requests
      .addCase(fetchGroupedMaterialGroupRequestsThunk.pending, (state) => {
        state.groupedRequestsStatus = "loading";
        state.error = null;
      })
      .addCase(
        fetchGroupedMaterialGroupRequestsThunk.fulfilled,
        (state, action) => {
          state.groupedRequestsStatus = "succeeded";
          state.groupedRequests = action.payload;
        },
      )
      .addCase(
        fetchGroupedMaterialGroupRequestsThunk.rejected,
        (state, action) => {
          state.groupedRequestsStatus = "failed";
          state.error =
            action.payload || "Failed to load material group requests.";
        },
      )

      // Consultant action
      .addCase(consultantActionMaterialGroupThunk.pending, (state) => {
        state.consultantActionStatus = "saving";
        state.error = null;
      })
      .addCase(consultantActionMaterialGroupThunk.fulfilled, (state) => {
        state.consultantActionStatus = "succeeded";
      })
      .addCase(
        consultantActionMaterialGroupThunk.rejected,
        (state, action) => {
          state.consultantActionStatus = "failed";
          state.error = action.payload || "Failed to complete action.";
        },
      );
  },
});

export const {
  toggleConfigId,
  selectAllConfigs,
  clearAllConfigs,
  addRow,
  removeRow,
  updateRowField,
  setHydratedForm,
  resetMaterialGroupForm,
  clearMaterialGroupError,
} = materialGroupSlice.actions;

export default materialGroupSlice.reducer;
