import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
  INpdRequestGeneralInfo,
  INpdRequestGeneralInfoRow,
  INpdRequestListItem,
  INpdRequestListItemRow,
} from "../../External/CommonServices/Interface";
import * as npdRequestGeneralInfoService from "../../External/CommonServices/npdRequestGeneralInfoService";
import * as npdRequestListService from "../../External/CommonServices/npdRequestListService";
import { selectResolvedAccess } from "../slices/appSlice";
import type { RootState } from "../rootState";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}

function toRequestRow(item: INpdRequestGeneralInfo): INpdRequestGeneralInfoRow {
  return { ...item } as INpdRequestGeneralInfoRow;
}

function toDashboardRow(item: INpdRequestListItem): INpdRequestListItemRow {
  return { ...item } as INpdRequestListItemRow;
}

function sortByModified<T extends { Modified?: string; Created?: string }>(
  items: T[],
): T[] {
  return [...items].sort((left, right) => {
    const rightTime = new Date(right.Modified || right.Created || 0).getTime();
    const leftTime = new Date(left.Modified || left.Created || 0).getTime();
    return rightTime - leftTime;
  });
}

export const fetchNpdDraftReworkList = createAsyncThunk<
  INpdRequestListItemRow[],
  void,
  { rejectValue: string; state: RootState }
>("npdRequest/fetchDraftRework", async (_, { getState, rejectWithValue }) => {
  try {
    const email = getState().app.userEmail || getState().app.userLoginName;
    return sortByModified(
      (await npdRequestListService.fetchNpdDraftReworkItems(email)).map(
        toDashboardRow,
      ),
    );
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchNpdPendingList = createAsyncThunk<
  INpdRequestListItemRow[],
  void,
  { rejectValue: string; state: RootState }
>("npdRequest/fetchPending", async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const email = state.app.userEmail || state.app.userLoginName;
    return sortByModified(
      (
        await npdRequestListService.fetchNpdPendingItems(
          email,
          selectResolvedAccess(state),
        )
      ).map(toDashboardRow),
    );
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchNpdDashboardList = createAsyncThunk<
  INpdRequestListItemRow[],
  void,
  { rejectValue: string; state: RootState }
>("npdRequest/fetchDashboard", async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const email = state.app.userEmail || state.app.userLoginName;
    return sortByModified(
      (
        await npdRequestListService.fetchNpdDashboardItems(
          email,
          selectResolvedAccess(state),
        )
      ).map(toDashboardRow),
    );
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const softDeleteNpdRequestItem = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>("npdRequest/softDelete", async (id, { rejectWithValue }) => {
  try {
    await npdRequestGeneralInfoService.softDeleteNpdRequest(id);
    return id;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
