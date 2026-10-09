import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Config } from "../../External/CommonServices/Config";
import type {
  INpdGeneralInfo,
  INpdOtherDetails,
  ISelectOption,
} from "../../External/CommonServices/Interface";
import {
  createEmptyNpdOtherDetails,
  mapOtherDetailsFromRequest,
} from "../../External/CommonServices/npdOtherDetailsService";
import {
  fetchNpdGeneralInfoById,
  fetchNpdItemDetailsByRequestId,
  fetchNpdInitiatorBrandOptions,
  fetchNpdLookupOptions,
  fetchNpdPlantSourceOptions,
  hydrateNpdRequestForm,
  populateNpdOtherDetails,
  saveNpdDraft,
  submitNpdRequest,
  applyNpdWorkflowAction,
} from "../thunks/npdFormThunks";
import type { INpdFormState } from "./npdFormState.types";

export type { INpdFormState, NpdFormRequestStatus, NpdFormSaveStatus } from "./npdFormState.types";

const initialGeneralInfo: INpdGeneralInfo = {
  brand: null,
  materialType: null,
  plantSource: null,
};

const initialState: INpdFormState = {
  requestId: null,
  requestStatus: null,
  requestTitle: null,
  workflowSteps: [],
  generalInfo: initialGeneralInfo,
  otherDetails: createEmptyNpdOtherDetails(),
  otherDetailsStatus: "idle",
  profitCenterOptions: [],
  brandOptions: [],
  plantSourceOptions: [],
  lookupOptionsByType: {},
  brandOptionsStatus: "idle",
  plantSourceStatus: "idle",
  lookupOptionsStatus: "idle",
  loadStatus: "idle",
  saveStatus: "idle",
  error: null,
};

const npdFormSlice = createSlice({
  name: "npdForm",
  initialState,
  reducers: {
    clearNpdFormError(state) {
      state.error = null;
    },
    /** Clears stuck save/submit loaders after a network drop (no auto-retry). */
    clearNpdFormBusyState(state) {
      state.saveStatus = "idle";
    },
    /**
     * Bind SharePoint request id after a failed Submit that still created a Draft
     * so retry updates the same record instead of inserting another.
     */
    bindNpdFormDraftRequest(
      state,
      action: PayloadAction<{ requestId: number; requestTitle?: string }>,
    ) {
      if (action.payload.requestId > 0) {
        state.requestId = action.payload.requestId;
      }
      if (action.payload.requestTitle) {
        state.requestTitle = action.payload.requestTitle;
      }
      state.requestStatus = "Draft";
    },
    resetNpdFormState(state) {
      state.requestId = null;
      state.requestStatus = null;
      state.requestTitle = null;
      state.workflowSteps = [];
      state.generalInfo = { ...initialGeneralInfo };
      state.otherDetails = createEmptyNpdOtherDetails();
      state.otherDetailsStatus = "idle";
      state.profitCenterOptions = [];
      state.plantSourceOptions = [];
      state.plantSourceStatus = "idle";
      state.loadStatus = "idle";
      state.saveStatus = "idle";
      state.error = null;
    },
    /** Seed Brand options from resolved ApproversMaster access (immediate, no wait). */
    setNpdBrandOptions(
      state,
      action: PayloadAction<ISelectOption[]>,
    ) {
      state.brandOptions = action.payload;
      state.brandOptionsStatus = "idle";
    },
    setNpdBrand(state, action: PayloadAction<string | null>) {
      state.generalInfo.brand = action.payload;
    },
    setNpdMaterialType(state, action: PayloadAction<string | null>) {
      state.generalInfo.materialType = action.payload;
      state.generalInfo.plantSource = null;
      state.plantSourceOptions = [];
      state.plantSourceStatus = "idle";
    },
    setNpdPlantSource(state, action: PayloadAction<string | null>) {
      state.generalInfo.plantSource = action.payload;
    },
    setNpdOtherDetailsProfitCenter(state, action: PayloadAction<string>) {
      state.otherDetails.profitCenter = action.payload;
    },
    setNpdOtherDetailsMaterialExtension(state, action: PayloadAction<string>) {
      state.otherDetails.materialExtension = action.payload;
    },
    setNpdOtherDetails(state, action: PayloadAction<INpdOtherDetails>) {
      state.otherDetails = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNpdInitiatorBrandOptions.pending, (state) => {
        state.brandOptionsStatus = "loading";
        state.error = null;
      })
      .addCase(fetchNpdInitiatorBrandOptions.fulfilled, (state, action) => {
        state.brandOptionsStatus = "idle";
        state.brandOptions = action.payload;
      })
      .addCase(fetchNpdInitiatorBrandOptions.rejected, (state, action) => {
        state.brandOptionsStatus = "error";
        state.error = action.payload ?? "Failed to load brand options.";
      })
      .addCase(fetchNpdPlantSourceOptions.pending, (state) => {
        state.plantSourceStatus = "loading";
        state.error = null;
      })
      .addCase(fetchNpdPlantSourceOptions.fulfilled, (state, action) => {
        state.plantSourceStatus = "idle";
        state.plantSourceOptions = action.payload;
      })
      .addCase(fetchNpdPlantSourceOptions.rejected, (state, action) => {
        state.plantSourceStatus = "error";
        state.error = action.payload ?? "Failed to load Plant / Source options.";
      })
      .addCase(fetchNpdLookupOptions.pending, (state) => {
        state.lookupOptionsStatus = "loading";
        state.error = null;
      })
      .addCase(fetchNpdLookupOptions.fulfilled, (state, action) => {
        state.lookupOptionsStatus = "idle";
        state.lookupOptionsByType = { ...action.payload };
      })
      .addCase(fetchNpdLookupOptions.rejected, (state, action) => {
        state.lookupOptionsStatus = "error";
        state.error = action.payload ?? "Failed to load lookup options.";
      })
      .addCase(populateNpdOtherDetails.pending, (state) => {
        state.otherDetailsStatus = "loading";
      })
      .addCase(populateNpdOtherDetails.fulfilled, (state, action) => {
        state.otherDetailsStatus = "idle";
        state.otherDetails = action.payload.otherDetails;
        state.profitCenterOptions = action.payload.profitCenterOptions;
      })
      .addCase(populateNpdOtherDetails.rejected, (state, action) => {
        state.otherDetailsStatus = "error";
        state.error =
          action.payload ?? "Failed to load MIS Other Details.";
      })
      .addCase(saveNpdDraft.pending, (state) => {
        state.saveStatus = "saving";
        state.error = null;
      })
      .addCase(saveNpdDraft.fulfilled, (state, action) => {
        state.saveStatus = "idle";
        state.requestId = action.payload.Id;
        state.requestStatus = action.payload.Status;
        state.requestTitle = action.payload.Title;
        state.workflowSteps = action.payload.WorkflowSteps ?? [];
      })
      .addCase(saveNpdDraft.rejected, (state, action) => {
        state.saveStatus = "idle";
        state.error = action.payload ?? "Failed to save draft.";
      })
      .addCase(submitNpdRequest.pending, (state) => {
        state.saveStatus = "submitting";
        state.error = null;
      })
      .addCase(submitNpdRequest.fulfilled, (state, action) => {
        state.saveStatus = "idle";
        state.requestId = action.payload.Id;
        state.requestStatus = action.payload.Status;
        state.requestTitle = action.payload.Title;
        state.workflowSteps = action.payload.WorkflowSteps ?? [];
      })
      .addCase(submitNpdRequest.rejected, (state, action) => {
        state.saveStatus = "idle";
        state.error = action.payload ?? "Failed to submit the request.";
      })
      .addCase(applyNpdWorkflowAction.pending, (state) => {
        state.saveStatus = "saving";
        state.error = null;
      })
      .addCase(applyNpdWorkflowAction.fulfilled, (state, action) => {
        state.saveStatus = "idle";
        state.requestId = action.payload.Id;
        state.requestStatus = action.payload.Status;
        state.requestTitle = action.payload.Title;
        state.workflowSteps = action.payload.WorkflowSteps ?? [];
        state.otherDetails = mapOtherDetailsFromRequest(action.payload);
      })
      .addCase(applyNpdWorkflowAction.rejected, (state, action) => {
        state.saveStatus = "idle";
        state.error = action.payload ?? "Failed to update the request.";
      })
      .addCase(fetchNpdGeneralInfoById.pending, (state, action) => {
        state.loadStatus = "loading";
        state.error = null;
        if (state.requestId !== action.meta.arg) {
          state.generalInfo = { ...initialGeneralInfo };
          state.otherDetails = createEmptyNpdOtherDetails();
          state.requestStatus = null;
          state.requestTitle = null;
          state.workflowSteps = [];
        }
      })
      .addCase(fetchNpdGeneralInfoById.fulfilled, (state, action) => {
        state.loadStatus = "idle";
        state.requestId = action.payload.Id;
        state.requestStatus = action.payload.Status;
        state.requestTitle = action.payload.Title;
        state.workflowSteps = action.payload.WorkflowSteps ?? [];
        const fetchedBrand = action.payload.Brand || null;
        state.generalInfo = {
          brand: fetchedBrand,
          materialType: action.payload.MaterialType || null,
          plantSource: action.payload.Plant || null,
        };
        if (
          fetchedBrand &&
          !state.brandOptions.some(
            (opt) =>
              String(opt.value ?? "").toLowerCase() ===
              fetchedBrand.toLowerCase(),
          )
        ) {
          state.brandOptions = [
            ...state.brandOptions,
            { label: fetchedBrand, value: fetchedBrand },
          ];
        }
        state.otherDetails = mapOtherDetailsFromRequest(action.payload);
      })
      .addCase(fetchNpdGeneralInfoById.rejected, (state, action) => {
        state.loadStatus = "error";
        state.error = action.payload ?? "Failed to load the NPD request.";
      })
      .addCase(hydrateNpdRequestForm.pending, (state, action) => {
        state.loadStatus = "loading";
        state.error = null;
        if (state.requestId !== action.meta.arg) {
          state.generalInfo = { ...initialGeneralInfo };
          state.otherDetails = createEmptyNpdOtherDetails();
          state.requestStatus = null;
          state.requestTitle = null;
          state.workflowSteps = [];
          state.plantSourceOptions = [];
          state.plantSourceStatus = "idle";
        }
      })
      .addCase(hydrateNpdRequestForm.fulfilled, (state, action) => {
        // Stale hydrate after New/create reset must not repopulate the form.
        if (state.loadStatus !== "loading") {
          return;
        }
        const request = action.payload.request;
        state.loadStatus = "idle";
        state.requestId = request.Id;
        state.requestStatus = request.Status;
        state.requestTitle = request.Title;
        state.workflowSteps = request.WorkflowSteps ?? [];
        const hydratedBrand = request.Brand || null;
        state.generalInfo = {
          brand: hydratedBrand,
          materialType: request.MaterialType || null,
          plantSource: request.Plant || null,
        };
        if (
          hydratedBrand &&
          !state.brandOptions.some(
            (opt) =>
              String(opt.value ?? "").toLowerCase() ===
              hydratedBrand.toLowerCase(),
          )
        ) {
          state.brandOptions = [
            ...state.brandOptions,
            { label: hydratedBrand, value: hydratedBrand },
          ];
        }
        state.otherDetails = mapOtherDetailsFromRequest(request);
      })
      .addCase(hydrateNpdRequestForm.rejected, (state, action) => {
        // A replaced email-route load aborts the previous hydrate. That abort
        // must not flip a successful load to error, or the Initiator check never runs.
        if (action.meta.aborted) {
          return;
        }
        state.loadStatus = "error";
        state.error = action.payload ?? "Failed to load the NPD request.";
      })
      .addCase(fetchNpdItemDetailsByRequestId.fulfilled, () => undefined)
      .addCase(fetchNpdItemDetailsByRequestId.rejected, (state, action) => {
        state.error = action.payload ?? "Failed to load item details.";
      });
  },
});

export const {
  clearNpdFormError,
  clearNpdFormBusyState,
  bindNpdFormDraftRequest,
  resetNpdFormState,
  setNpdBrandOptions,
  setNpdBrand,
  setNpdMaterialType,
  setNpdPlantSource,
  setNpdOtherDetailsProfitCenter,
  setNpdOtherDetailsMaterialExtension,
  setNpdOtherDetails,
} = npdFormSlice.actions;

export const selectIsFinishedProductsMaterialType = (
  materialType: string | null,
): boolean =>
  materialType === Config.NpdMaterialTypes.FinishedProducts;

export const selectIsTradedProductsMaterialType = (
  materialType: string | null,
): boolean => materialType === Config.NpdMaterialTypes.TradedProducts;

export const selectHasPlantSourceMaterialType = (
  materialType: string | null,
): boolean =>
  selectIsFinishedProductsMaterialType(materialType) ||
  selectIsTradedProductsMaterialType(materialType);

export default npdFormSlice.reducer;
