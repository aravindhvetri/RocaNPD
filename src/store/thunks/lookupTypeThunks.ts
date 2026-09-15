import { createAsyncThunk } from "@reduxjs/toolkit";
import type { IImportParseResult } from "../../External/CommonServices/Interface";
import * as lookupTypeService from "../../External/CommonServices/lookupTypeService";
import type { ILookupTypeState } from "../slices/adminState.types";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}

export const fetchLookupTypes = createAsyncThunk(
  "admin/fetchLookupTypes",
  async (_, { rejectWithValue }) => {
    try {
      return await lookupTypeService.fetchActiveLookupTypes();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createLookupType = createAsyncThunk(
  "admin/createLookupType",
  async (title: string, { dispatch, rejectWithValue }) => {
    try {
      await lookupTypeService.createLookupType(title);
      return await dispatch(fetchLookupTypes()).unwrap();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const updateLookupType = createAsyncThunk(
  "admin/updateLookupType",
  async (
    payload: { id: number; title: string },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await lookupTypeService.updateLookupType(payload.id, payload.title);
      return await dispatch(fetchLookupTypes()).unwrap();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const softDeleteLookupType = createAsyncThunk(
  "admin/softDeleteLookupType",
  async (
    payload: { id: number; title: string },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await lookupTypeService.softDeleteLookupType(payload.id, payload.title);
      return await dispatch(fetchLookupTypes()).unwrap();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const importLookupTypes = createAsyncThunk<
  IImportParseResult,
  File,
  {
    rejectValue: string;
    state: { admin: { lookupType: ILookupTypeState } };
  }
>(
  "admin/importLookupTypes",
  async (file, { dispatch, getState, rejectWithValue }) => {
    try {
      const existing = getState().admin.lookupType.items;
      const result = await lookupTypeService.importLookupTypesFromFile(
        file,
        existing,
      );

      if (result.toCreate.length) {
        await dispatch(fetchLookupTypes()).unwrap();
      }

      return result;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);
