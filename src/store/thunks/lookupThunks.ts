import { createAsyncThunk } from "@reduxjs/toolkit";
import type { ILookupImportParseResult } from "../../External/CommonServices/Interface";
import * as lookupService from "../../External/CommonServices/lookupService";
import * as lookupTypeService from "../../External/CommonServices/lookupTypeService";
import type { RootState } from "../rootState";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}

export const fetchLookups = createAsyncThunk(
  "admin/fetchLookups",
  async (_, { rejectWithValue }) => {
    try {
      return await lookupService.fetchActiveLookups();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createLookup = createAsyncThunk(
  "admin/createLookup",
  async (
    payload: { lookupTypeId: number; lookupName: string; lookupCode: string },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await lookupService.createLookup(
        payload.lookupTypeId,
        payload.lookupName,
        payload.lookupCode,
      );
      return await dispatch(fetchLookups()).unwrap();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const updateLookup = createAsyncThunk(
  "admin/updateLookup",
  async (
    payload: {
      id: number;
      lookupTypeId: number;
      lookupName: string;
      lookupCode: string;
    },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await lookupService.updateLookup(
        payload.id,
        payload.lookupTypeId,
        payload.lookupName,
        payload.lookupCode,
      );
      return await dispatch(fetchLookups()).unwrap();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const softDeleteLookup = createAsyncThunk(
  "admin/softDeleteLookup",
  async (
    payload: { id: number; lookupName: string },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await lookupService.softDeleteLookup(payload.id, payload.lookupName);
      return await dispatch(fetchLookups()).unwrap();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const previewImportLookups = createAsyncThunk<
  ILookupImportParseResult,
  File,
  { rejectValue: string; state: RootState }
>("admin/previewImportLookups", async (file, { getState, rejectWithValue }) => {
  try {
    const existing = getState().admin.lookup.items;
    let lookupTypes = getState().admin.lookupType.items;

    if (!lookupTypes.length) {
      lookupTypes = await lookupTypeService.fetchActiveLookupTypes();
    }

    return await lookupService.previewLookupImportFile(
      file,
      existing,
      lookupTypes,
    );
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const commitImportLookups = createAsyncThunk<
  number,
  ILookupImportParseResult["toCreate"],
  { rejectValue: string }
>("admin/commitImportLookups", async (toCreate, { dispatch, rejectWithValue }) => {
  try {
    await lookupService.commitLookupImport(toCreate);

    if (toCreate.length) {
      await dispatch(fetchLookups()).unwrap();
    }

    return toCreate.length;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const importLookups = createAsyncThunk<
  ILookupImportParseResult,
  File,
  { rejectValue: string; state: RootState }
>("admin/importLookups", async (file, { dispatch, getState, rejectWithValue }) => {
  try {
    const existing = getState().admin.lookup.items;
    let lookupTypes = getState().admin.lookupType.items;

    if (!lookupTypes.length) {
      lookupTypes = await lookupTypeService.fetchActiveLookupTypes();
    }
    const result = await lookupService.importLookupsFromFile(
      file,
      existing,
      lookupTypes,
    );

    if (result.toCreate.length) {
      await dispatch(fetchLookups()).unwrap();
    }

    return result;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
