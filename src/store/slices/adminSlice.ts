import { createSlice } from "@reduxjs/toolkit";
import type {
  IAdminState,
  IBrandMaterialExtensionState,
  ILookupState,
  ILookupTypeState,
  IRocaMasterOptionsState,
  IWorkflowConfigState,
} from "./adminState.types";
import {
  createBrandMaterialExtension,
  createLookup,
  createLookupType,
  fetchBrandMaterialExtensions,
  fetchLookups,
  fetchLookupTypes,
  fetchNpdRoleOptions,
  fetchRocaBrandOptions,
  fetchRocaPlantOptions,
  fetchWorkflowConfigurations,
  commitImportLookups,
  commitImportLookupTypes,
  importLookupTypes,
  importLookups,
  previewImportLookups,
  previewImportLookupTypes,
  saveWorkflowConfiguration,
  softDeleteBrandMaterialExtension,
  softDeleteLookup,
  softDeleteLookupType,
  softDeleteWorkflowConfiguration,
  updateBrandMaterialExtension,
  updateLookup,
  updateLookupType,
} from "../thunks";

export type {
  AdminRequestStatus,
  IAdminState,
  IBrandMaterialExtensionState,
  ILookupState,
  ILookupTypeState,
  IRocaMasterOptionsState,
  IWorkflowConfigState,
} from "./adminState.types";

const initialLookupTypeState: ILookupTypeState = {
  items: [],
  status: "idle",
  error: null,
};

const initialLookupState: ILookupState = {
  items: [],
  status: "idle",
  error: null,
};

const initialRocaMasterOptionsState: IRocaMasterOptionsState = {
  brands: [],
  plants: [],
  brandsStatus: "idle",
  plantsStatus: "idle",
  error: null,
};

const initialBrandMaterialExtensionState: IBrandMaterialExtensionState = {
  items: [],
  status: "idle",
  error: null,
  rocaOptions: initialRocaMasterOptionsState,
};

const initialWorkflowConfigState: IWorkflowConfigState = {
  steps: [],
  status: "idle",
  error: null,
  npdRoles: [],
  npdRolesStatus: "idle",
};

const initialState: IAdminState = {
  lookupType: initialLookupTypeState,
  lookup: initialLookupState,
  brandMaterialExtension: initialBrandMaterialExtensionState,
  workflowConfig: initialWorkflowConfigState,
};

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    clearLookupTypeError(state) {
      state.lookupType.error = null;
    },
    clearLookupError(state) {
      state.lookup.error = null;
    },
    clearBrandMaterialExtensionError(state) {
      state.brandMaterialExtension.error = null;
    },
    clearRocaMasterOptionsError(state) {
      state.brandMaterialExtension.rocaOptions.error = null;
    },
    clearWorkflowConfigError(state) {
      state.workflowConfig.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLookupTypes.pending, (state) => {
        state.lookupType.status = "loading";
        state.lookupType.error = null;
      })
      .addCase(fetchLookupTypes.fulfilled, (state, action) => {
        state.lookupType.status = "idle";
        state.lookupType.items = action.payload;
      })
      .addCase(fetchLookupTypes.rejected, (state, action) => {
        state.lookupType.status = "error";
        state.lookupType.error =
          (action.payload as string) ?? "Failed to load lookup types.";
      })
      .addCase(createLookupType.pending, (state) => {
        state.lookupType.status = "saving";
        state.lookupType.error = null;
      })
      .addCase(createLookupType.fulfilled, (state, action) => {
        state.lookupType.status = "idle";
        state.lookupType.items = action.payload;
      })
      .addCase(createLookupType.rejected, (state, action) => {
        state.lookupType.status = "error";
        state.lookupType.error =
          (action.payload as string) ?? "Failed to create lookup type.";
      })
      .addCase(updateLookupType.pending, (state) => {
        state.lookupType.status = "saving";
        state.lookupType.error = null;
      })
      .addCase(updateLookupType.fulfilled, (state, action) => {
        state.lookupType.status = "idle";
        state.lookupType.items = action.payload;
      })
      .addCase(updateLookupType.rejected, (state, action) => {
        state.lookupType.status = "error";
        state.lookupType.error =
          (action.payload as string) ?? "Failed to update lookup type.";
      })
      .addCase(softDeleteLookupType.pending, (state) => {
        state.lookupType.status = "saving";
        state.lookupType.error = null;
      })
      .addCase(softDeleteLookupType.fulfilled, (state, action) => {
        state.lookupType.status = "idle";
        state.lookupType.items = action.payload;
      })
      .addCase(softDeleteLookupType.rejected, (state, action) => {
        state.lookupType.status = "error";
        state.lookupType.error =
          (action.payload as string) ?? "Failed to delete lookup type.";
      })
      .addCase(previewImportLookupTypes.pending, (state) => {
        state.lookupType.status = "saving";
        state.lookupType.error = null;
      })
      .addCase(previewImportLookupTypes.fulfilled, (state) => {
        state.lookupType.status = "idle";
      })
      .addCase(previewImportLookupTypes.rejected, (state, action) => {
        state.lookupType.status = "error";
        state.lookupType.error =
          (action.payload as string) ?? "Failed to validate import file.";
      })
      .addCase(commitImportLookupTypes.pending, (state) => {
        state.lookupType.status = "saving";
        state.lookupType.error = null;
      })
      .addCase(commitImportLookupTypes.fulfilled, (state) => {
        state.lookupType.status = "idle";
      })
      .addCase(commitImportLookupTypes.rejected, (state, action) => {
        state.lookupType.status = "error";
        state.lookupType.error =
          (action.payload as string) ?? "Failed to import lookup types.";
      })
      .addCase(importLookupTypes.pending, (state) => {
        state.lookupType.status = "saving";
        state.lookupType.error = null;
      })
      .addCase(importLookupTypes.fulfilled, (state) => {
        state.lookupType.status = "idle";
      })
      .addCase(importLookupTypes.rejected, (state, action) => {
        state.lookupType.status = "error";
        state.lookupType.error =
          (action.payload as string) ?? "Failed to import lookup types.";
      })
      .addCase(fetchLookups.pending, (state) => {
        state.lookup.status = "loading";
        state.lookup.error = null;
      })
      .addCase(fetchLookups.fulfilled, (state, action) => {
        state.lookup.status = "idle";
        state.lookup.items = action.payload;
      })
      .addCase(fetchLookups.rejected, (state, action) => {
        state.lookup.status = "error";
        state.lookup.error =
          (action.payload as string) ?? "Failed to load lookups.";
      })
      .addCase(createLookup.pending, (state) => {
        state.lookup.status = "saving";
        state.lookup.error = null;
      })
      .addCase(createLookup.fulfilled, (state, action) => {
        state.lookup.status = "idle";
        state.lookup.items = action.payload;
      })
      .addCase(createLookup.rejected, (state, action) => {
        state.lookup.status = "error";
        state.lookup.error =
          (action.payload as string) ?? "Failed to create lookup.";
      })
      .addCase(updateLookup.pending, (state) => {
        state.lookup.status = "saving";
        state.lookup.error = null;
      })
      .addCase(updateLookup.fulfilled, (state, action) => {
        state.lookup.status = "idle";
        state.lookup.items = action.payload;
      })
      .addCase(updateLookup.rejected, (state, action) => {
        state.lookup.status = "error";
        state.lookup.error =
          (action.payload as string) ?? "Failed to update lookup.";
      })
      .addCase(softDeleteLookup.pending, (state) => {
        state.lookup.status = "saving";
        state.lookup.error = null;
      })
      .addCase(softDeleteLookup.fulfilled, (state, action) => {
        state.lookup.status = "idle";
        state.lookup.items = action.payload;
      })
      .addCase(softDeleteLookup.rejected, (state, action) => {
        state.lookup.status = "error";
        state.lookup.error =
          (action.payload as string) ?? "Failed to delete lookup.";
      })
      .addCase(previewImportLookups.pending, (state) => {
        state.lookup.status = "saving";
        state.lookup.error = null;
      })
      .addCase(previewImportLookups.fulfilled, (state) => {
        state.lookup.status = "idle";
      })
      .addCase(previewImportLookups.rejected, (state, action) => {
        state.lookup.status = "error";
        state.lookup.error =
          (action.payload as string) ?? "Failed to validate import file.";
      })
      .addCase(commitImportLookups.pending, (state) => {
        state.lookup.status = "saving";
        state.lookup.error = null;
      })
      .addCase(commitImportLookups.fulfilled, (state) => {
        state.lookup.status = "idle";
      })
      .addCase(commitImportLookups.rejected, (state, action) => {
        state.lookup.status = "error";
        state.lookup.error =
          (action.payload as string) ?? "Failed to import lookups.";
      })
      .addCase(importLookups.pending, (state) => {
        state.lookup.status = "saving";
        state.lookup.error = null;
      })
      .addCase(importLookups.fulfilled, (state) => {
        state.lookup.status = "idle";
      })
      .addCase(importLookups.rejected, (state, action) => {
        state.lookup.status = "error";
        state.lookup.error =
          (action.payload as string) ?? "Failed to import lookups.";
      })
      .addCase(fetchBrandMaterialExtensions.pending, (state) => {
        state.brandMaterialExtension.status = "loading";
        state.brandMaterialExtension.error = null;
      })
      .addCase(fetchBrandMaterialExtensions.fulfilled, (state, action) => {
        state.brandMaterialExtension.status = "idle";
        state.brandMaterialExtension.items = action.payload;
      })
      .addCase(fetchBrandMaterialExtensions.rejected, (state, action) => {
        state.brandMaterialExtension.status = "error";
        state.brandMaterialExtension.error =
          (action.payload as string) ??
          "Failed to load brand material extension records.";
      })
      .addCase(fetchRocaBrandOptions.pending, (state) => {
        state.brandMaterialExtension.rocaOptions.brandsStatus = "loading";
        state.brandMaterialExtension.rocaOptions.error = null;
      })
      .addCase(fetchRocaBrandOptions.fulfilled, (state, action) => {
        state.brandMaterialExtension.rocaOptions.brandsStatus = "idle";
        state.brandMaterialExtension.rocaOptions.brands = action.payload;
      })
      .addCase(fetchRocaBrandOptions.rejected, (state, action) => {
        state.brandMaterialExtension.rocaOptions.brandsStatus = "error";
        state.brandMaterialExtension.rocaOptions.error =
          (action.payload as string) ?? "Failed to load brand options.";
      })
      .addCase(fetchRocaPlantOptions.pending, (state) => {
        state.brandMaterialExtension.rocaOptions.plantsStatus = "loading";
        state.brandMaterialExtension.rocaOptions.error = null;
      })
      .addCase(fetchRocaPlantOptions.fulfilled, (state, action) => {
        state.brandMaterialExtension.rocaOptions.plantsStatus = "idle";
        state.brandMaterialExtension.rocaOptions.plants = action.payload;
      })
      .addCase(fetchRocaPlantOptions.rejected, (state, action) => {
        state.brandMaterialExtension.rocaOptions.plantsStatus = "error";
        state.brandMaterialExtension.rocaOptions.error =
          (action.payload as string) ?? "Failed to load plant options.";
      })
      .addCase(createBrandMaterialExtension.pending, (state) => {
        state.brandMaterialExtension.status = "saving";
        state.brandMaterialExtension.error = null;
      })
      .addCase(createBrandMaterialExtension.fulfilled, (state, action) => {
        state.brandMaterialExtension.status = "idle";
        state.brandMaterialExtension.items = action.payload;
      })
      .addCase(createBrandMaterialExtension.rejected, (state, action) => {
        state.brandMaterialExtension.status = "error";
        state.brandMaterialExtension.error =
          (action.payload as string) ??
          "Failed to create brand material extension.";
      })
      .addCase(updateBrandMaterialExtension.pending, (state) => {
        state.brandMaterialExtension.status = "saving";
        state.brandMaterialExtension.error = null;
      })
      .addCase(updateBrandMaterialExtension.fulfilled, (state, action) => {
        state.brandMaterialExtension.status = "idle";
        state.brandMaterialExtension.items = action.payload;
      })
      .addCase(updateBrandMaterialExtension.rejected, (state, action) => {
        state.brandMaterialExtension.status = "error";
        state.brandMaterialExtension.error =
          (action.payload as string) ??
          "Failed to update brand material extension.";
      })
      .addCase(softDeleteBrandMaterialExtension.pending, (state) => {
        state.brandMaterialExtension.status = "saving";
        state.brandMaterialExtension.error = null;
      })
      .addCase(softDeleteBrandMaterialExtension.fulfilled, (state, action) => {
        state.brandMaterialExtension.status = "idle";
        state.brandMaterialExtension.items = action.payload;
      })
      .addCase(softDeleteBrandMaterialExtension.rejected, (state, action) => {
        state.brandMaterialExtension.status = "error";
        state.brandMaterialExtension.error =
          (action.payload as string) ??
          "Failed to delete brand material extension.";
      })
      .addCase(fetchWorkflowConfigurations.pending, (state) => {
        state.workflowConfig.status = "loading";
        state.workflowConfig.error = null;
      })
      .addCase(fetchWorkflowConfigurations.fulfilled, (state, action) => {
        state.workflowConfig.status = "idle";
        state.workflowConfig.steps = action.payload;
      })
      .addCase(fetchWorkflowConfigurations.rejected, (state, action) => {
        state.workflowConfig.status = "error";
        state.workflowConfig.error =
          (action.payload as string) ?? "Failed to load workflow configuration.";
      })
      .addCase(fetchNpdRoleOptions.pending, (state) => {
        state.workflowConfig.npdRolesStatus = "loading";
        state.workflowConfig.error = null;
      })
      .addCase(fetchNpdRoleOptions.fulfilled, (state, action) => {
        state.workflowConfig.npdRolesStatus = "idle";
        state.workflowConfig.npdRoles = action.payload;
      })
      .addCase(fetchNpdRoleOptions.rejected, (state, action) => {
        state.workflowConfig.npdRolesStatus = "error";
        state.workflowConfig.error =
          (action.payload as string) ?? "Failed to load NPD role options.";
      })
      .addCase(saveWorkflowConfiguration.pending, (state) => {
        state.workflowConfig.status = "saving";
        state.workflowConfig.error = null;
      })
      .addCase(saveWorkflowConfiguration.fulfilled, (state, action) => {
        state.workflowConfig.status = "idle";
        state.workflowConfig.steps = action.payload;
      })
      .addCase(saveWorkflowConfiguration.rejected, (state, action) => {
        state.workflowConfig.status = "error";
        state.workflowConfig.error =
          (action.payload as string) ?? "Failed to save workflow configuration.";
      })
      .addCase(softDeleteWorkflowConfiguration.pending, (state) => {
        state.workflowConfig.status = "saving";
        state.workflowConfig.error = null;
      })
      .addCase(softDeleteWorkflowConfiguration.fulfilled, (state, action) => {
        state.workflowConfig.status = "idle";
        state.workflowConfig.steps = action.payload;
      })
      .addCase(softDeleteWorkflowConfiguration.rejected, (state, action) => {
        state.workflowConfig.status = "error";
        state.workflowConfig.error =
          (action.payload as string) ?? "Failed to delete workflow configuration.";
      });
  },
});

export const {
  clearLookupTypeError,
  clearLookupError,
  clearBrandMaterialExtensionError,
  clearRocaMasterOptionsError,
  clearWorkflowConfigError,
} = adminSlice.actions;
export default adminSlice.reducer;
