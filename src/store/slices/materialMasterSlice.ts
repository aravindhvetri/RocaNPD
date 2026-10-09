import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { IMaterialMasterRow } from "../../External/CommonServices/Interface";
import { fetchMaterialMasterCatalog } from "../../External/CommonServices/materialMasterService";

export type MaterialMasterStatus = "idle" | "loading" | "error";

export interface IMaterialMasterState {
  items: IMaterialMasterRow[];
  status: MaterialMasterStatus;
  error: string | null;
}

const initialState: IMaterialMasterState = {
  items: [],
  status: "idle",
  error: null,
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Failed to load Material Master records.";
}

/** One catalog load for Existing + New; tab/filter are client-side only. */
export const fetchMaterialMasterCatalogThunk = createAsyncThunk<
  IMaterialMasterRow[],
  void,
  { rejectValue: string }
>("materialMaster/fetchCatalog", async (_, { rejectWithValue }) => {
  try {
    return await fetchMaterialMasterCatalog();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

const materialMasterSlice = createSlice({
  name: "materialMaster",
  initialState,
  reducers: {
    clearMaterialMasterError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMaterialMasterCatalogThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
        // Keep prior rows until the new catalog arrives (no empty flash).
      })
      .addCase(fetchMaterialMasterCatalogThunk.fulfilled, (state, action) => {
        state.status = "idle";
        state.items = action.payload;
      })
      .addCase(fetchMaterialMasterCatalogThunk.rejected, (state, action) => {
        state.status = "error";
        state.error =
          action.payload || "Failed to load Material Master records.";
      });
  },
});

export const { clearMaterialMasterError } = materialMasterSlice.actions;
export default materialMasterSlice.reducer;
