import { createSlice } from "@reduxjs/toolkit";
import {
  fetchNpdDashboardList,
  fetchNpdDraftReworkList,
  fetchNpdPendingList,
  softDeleteNpdRequestItem,
} from "../thunks/npdRequestThunks";
import type { INpdRequestListState } from "./npdRequestState.types";

const initialState: INpdRequestListState = {
  draftItems: [],
  pendingItems: [],
  dashboardItems: [],
  status: "idle",
  error: null,
};

const npdRequestSlice = createSlice({
  name: "npdRequest",
  initialState,
  reducers: {
    clearNpdRequestError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNpdDraftReworkList.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchNpdDraftReworkList.fulfilled, (state, action) => {
        state.status = "idle";
        state.draftItems = action.payload.map((item) => ({ ...item }));
      })
      .addCase(fetchNpdDraftReworkList.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? "Failed to load draft requests.";
      })
      .addCase(fetchNpdPendingList.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchNpdPendingList.fulfilled, (state, action) => {
        state.status = "idle";
        state.pendingItems = action.payload.map((item) => ({ ...item }));
      })
      .addCase(fetchNpdPendingList.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? "Failed to load pending requests.";
      })
      .addCase(fetchNpdDashboardList.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchNpdDashboardList.fulfilled, (state, action) => {
        state.status = "idle";
        state.dashboardItems = action.payload.map((item) => ({ ...item }));
      })
      .addCase(fetchNpdDashboardList.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? "Failed to load NPD requests.";
      })
      .addCase(softDeleteNpdRequestItem.fulfilled, (state, action) => {
        state.dashboardItems = state.dashboardItems.filter(
          (item) => item.Id !== action.payload,
        );
        state.draftItems = state.draftItems.filter(
          (item) => item.Id !== action.payload,
        );
        state.pendingItems = state.pendingItems.filter(
          (item) => item.Id !== action.payload,
        );
      })
      .addCase(softDeleteNpdRequestItem.rejected, (state, action) => {
        state.error = action.payload ?? "Failed to delete the request.";
      });
  },
});

export const { clearNpdRequestError } = npdRequestSlice.actions;
export default npdRequestSlice.reducer;
