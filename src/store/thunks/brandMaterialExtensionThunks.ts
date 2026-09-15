import { createAsyncThunk } from "@reduxjs/toolkit";
import * as brandMaterialExtensionService from "../../External/CommonServices/brandMaterialExtensionService";
import * as rocaMasterDataService from "../../External/CommonServices/rocaMasterDataService";
import type { ISelectOption } from "../../External/CommonServices/Interface";
import type { RootState } from "../rootState";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}

export const fetchBrandMaterialExtensions = createAsyncThunk(
  "admin/fetchBrandMaterialExtensions",
  async (_, { rejectWithValue }) => {
    try {
      return await brandMaterialExtensionService.fetchActiveBrandMaterialExtensions();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchRocaBrandOptions = createAsyncThunk<
  ISelectOption[],
  void,
  { rejectValue: string; state: RootState }
>("admin/fetchRocaBrandOptions", async (_, { getState, rejectWithValue }) => {
  try {
    const contextSiteUrl = getState().app.siteUrl || undefined;
    return await rocaMasterDataService.fetchRocaBrandOptions(contextSiteUrl);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchRocaPlantOptions = createAsyncThunk<
  ISelectOption[],
  void,
  { rejectValue: string; state: RootState }
>("admin/fetchRocaPlantOptions", async (_, { getState, rejectWithValue }) => {
  try {
    const contextSiteUrl = getState().app.siteUrl || undefined;
    return await rocaMasterDataService.fetchRocaPlantOptions(contextSiteUrl);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const createBrandMaterialExtension = createAsyncThunk(
  "admin/createBrandMaterialExtension",
  async (
    payload: { brand: string; plants: string[] },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await brandMaterialExtensionService.createBrandMaterialExtension(
        payload.brand,
        payload.plants,
      );
      return await dispatch(fetchBrandMaterialExtensions()).unwrap();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const updateBrandMaterialExtension = createAsyncThunk(
  "admin/updateBrandMaterialExtension",
  async (
    payload: { id: number; brand: string; plants: string[] },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await brandMaterialExtensionService.updateBrandMaterialExtension(
        payload.id,
        payload.brand,
        payload.plants,
      );
      return await dispatch(fetchBrandMaterialExtensions()).unwrap();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const softDeleteBrandMaterialExtension = createAsyncThunk(
  "admin/softDeleteBrandMaterialExtension",
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      await brandMaterialExtensionService.softDeleteBrandMaterialExtension(id);
      return await dispatch(fetchBrandMaterialExtensions()).unwrap();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);
