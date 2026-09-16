import { createAsyncThunk } from "@reduxjs/toolkit";
import type { ISelectOption } from "../../External/CommonServices/Interface";
import * as npdFormDataService from "../../External/CommonServices/npdFormDataService";
import type { RootState } from "../rootState";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}

export const fetchNpdInitiatorBrandOptions = createAsyncThunk<
  ISelectOption[],
  void,
  { rejectValue: string; state: RootState }
>("npdForm/fetchInitiatorBrandOptions", async (_, { getState, rejectWithValue }) => {
  try {
    const { siteUrl, userEmail, userLoginName } = getState().app;
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
});

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
