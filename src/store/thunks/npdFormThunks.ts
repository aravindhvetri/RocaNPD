import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
  INpdItemDetailRecord,
  INpdRequestGeneralInfo,
  ISelectOption,
  NpdWorkflowAction,
} from "../../External/CommonServices/Interface";
import * as lookupOptionUtils from "../../External/CommonServices/lookupOptionUtils";
import * as npdFormDataService from "../../External/CommonServices/npdFormDataService";
import * as npdItemDetailsService from "../../External/CommonServices/npdItemDetailsService";
import * as npdRequestGeneralInfoService from "../../External/CommonServices/npdRequestGeneralInfoService";
import { selectResolvedAccess } from "../slices/appSlice";
import type { RootState } from "../rootState";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}

function getHeaderPayload(state: RootState) {
  const { npdForm } = state;
  const { brand, materialType, plantSource } = npdForm.generalInfo;

  if (!brand || !materialType || !plantSource) {
    return null;
  }

  return {
    id: npdForm.requestId,
    brand,
    materialType,
    plantSource,
    existingStatus: npdForm.requestStatus,
    existingTitle: npdForm.requestTitle,
  };
}

export const fetchNpdInitiatorBrandOptions = createAsyncThunk<
  ISelectOption[],
  void,
  { rejectValue: string; state: RootState }
>(
  "npdForm/fetchInitiatorBrandOptions",
  async (_, { getState, rejectWithValue }) => {
    try {
      const app = getState().app;
      if (app.roleStatus === "succeeded") {
        return app.npdInitiatorBrands.map((title) => ({
          label: title,
          value: title,
        }));
      }

      const { siteUrl, userEmail, userLoginName } = app;
      if (!userEmail && !userLoginName) {
        return [];
      }

      return await npdFormDataService.fetchInitiatorBrandOptions(
        userEmail,
        siteUrl || undefined,
        userLoginName || undefined,
      );
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const { npdForm, app } = getState();
      if (npdForm.brandOptionsStatus === "loading") {
        return false;
      }

      return !(npdForm.brandOptions.length && app.roleStatus === "succeeded");
    },
  },
);

export const fetchNpdPlantSourceOptions = createAsyncThunk<
  ISelectOption[],
  string,
  { rejectValue: string; state: RootState }
>(
  "npdForm/fetchPlantSourceOptions",
  async (materialType, { getState, rejectWithValue }) => {
    try {
      const contextSiteUrl = getState().app.siteUrl || undefined;
      return await npdFormDataService.fetchPlantSourceOptionsForMaterialType(
        materialType,
        contextSiteUrl,
      );
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchNpdLookupOptions = createAsyncThunk<
  Record<string, ISelectOption[]>,
  void,
  { rejectValue: string; state: RootState }
>(
  "npdForm/fetchLookupOptions",
  async (_, { rejectWithValue }) => {
    try {
      return await lookupOptionUtils.fetchLookupOptionsByType();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const form = getState().npdForm;
      if (form.lookupOptionsStatus === "loading") {
        return false;
      }
      return Object.keys(form.lookupOptionsByType).length === 0;
    },
  },
);

export const saveNpdDraft = createAsyncThunk<
  INpdRequestGeneralInfo,
  INpdItemDetailRecord[],
  { rejectValue: string; state: RootState }
>("npdForm/saveDraft", async (items, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const payload = getHeaderPayload(state);
    if (!payload) {
      return rejectWithValue(
        "Brand (MG1), Material Type, and Plant / Source are required.",
      );
    }

    return await npdRequestGeneralInfoService.saveNpdGeneralInfoDraft(
      payload,
      items,
      state.app.userEmail || state.app.userLoginName,
      state.app.siteUrl || undefined,
    );
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const submitNpdRequest = createAsyncThunk<
  INpdRequestGeneralInfo,
  INpdItemDetailRecord[],
  { rejectValue: string; state: RootState }
>("npdForm/submitRequest", async (items, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const payload = getHeaderPayload(state);
    if (!payload) {
      return rejectWithValue(
        "Brand (MG1), Material Type, and Plant / Source are required.",
      );
    }

    return await npdRequestGeneralInfoService.submitNpdRequest(
      payload,
      items,
      state.app.userEmail || state.app.userLoginName,
      state.app.siteUrl || undefined,
    );
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const applyNpdWorkflowAction = createAsyncThunk<
  INpdRequestGeneralInfo,
  {
    action: NpdWorkflowAction;
    comments: string;
    actorRole: string;
    items?: INpdItemDetailRecord[];
  },
  { rejectValue: string; state: RootState }
>("npdForm/workflowAction", async (input, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    if (!state.npdForm.requestId) {
      return rejectWithValue("The request could not be found.");
    }

    return await npdRequestGeneralInfoService.applyNpdWorkflowAction({
      requestId: state.npdForm.requestId,
      action: input.action,
      comments: input.comments,
      actorEmail: state.app.userEmail || state.app.userLoginName,
      actorRole: input.actorRole,
      actorUserId: state.app.userId,
      access: selectResolvedAccess(state),
      items: input.items,
    });
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchNpdGeneralInfoById = createAsyncThunk<
  INpdRequestGeneralInfo,
  number,
  { rejectValue: string }
>("npdForm/fetchById", async (id, { rejectWithValue }) => {
  try {
    return await npdRequestGeneralInfoService.fetchNpdGeneralInfoById(id);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const hydrateNpdRequestForm = createAsyncThunk<
  { request: INpdRequestGeneralInfo; items: INpdItemDetailRecord[] },
  number,
  { rejectValue: string }
>("npdForm/hydrateById", async (id, { rejectWithValue }) => {
  try {
    const [request, items] = await Promise.all([
      npdRequestGeneralInfoService.fetchNpdGeneralInfoById(id),
      npdItemDetailsService.fetchNpdItemDetailsByRequestId(id),
    ]);
    return { request, items };
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchNpdItemDetailsByRequestId = createAsyncThunk<
  INpdItemDetailRecord[],
  number,
  { rejectValue: string }
>("npdForm/fetchItemsByRequestId", async (id, { rejectWithValue }) => {
  try {
    return await npdItemDetailsService.fetchNpdItemDetailsByRequestId(id);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
