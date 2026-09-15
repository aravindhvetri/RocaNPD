import { createAsyncThunk } from "@reduxjs/toolkit";
import type { IWorkflowConfigSavePayload } from "../../External/CommonServices/Interface";
import { fetchRocaNpdRoleOptions } from "../../External/CommonServices/rocaMasterDataService";
import * as workflowConfigurationService from "../../External/CommonServices/workflowConfigurationService";
import type { RootState } from "../rootState";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}

export const fetchWorkflowConfigurations = createAsyncThunk(
  "admin/fetchWorkflowConfigurations",
  async (_, { rejectWithValue }) => {
    try {
      return await workflowConfigurationService.fetchActiveWorkflowSteps();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchNpdRoleOptions = createAsyncThunk<
  Awaited<ReturnType<typeof fetchRocaNpdRoleOptions>>,
  void,
  { rejectValue: string; state: RootState }
>("admin/fetchNpdRoleOptions", async (_, { getState, rejectWithValue }) => {
  try {
    const contextSiteUrl = getState().app.siteUrl || undefined;
    return await fetchRocaNpdRoleOptions(contextSiteUrl);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const saveWorkflowConfiguration = createAsyncThunk(
  "admin/saveWorkflowConfiguration",
  async (payload: IWorkflowConfigSavePayload, { dispatch, rejectWithValue }) => {
    try {
      await workflowConfigurationService.saveWorkflowConfiguration(payload);
      return await dispatch(fetchWorkflowConfigurations()).unwrap();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const softDeleteWorkflowConfiguration = createAsyncThunk(
  "admin/softDeleteWorkflowConfiguration",
  async (stepIds: number[], { dispatch, rejectWithValue }) => {
    try {
      await workflowConfigurationService.softDeleteWorkflowByRequestType(stepIds);
      return await dispatch(fetchWorkflowConfigurations()).unwrap();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);
