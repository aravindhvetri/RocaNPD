import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Config } from "../../External/CommonServices/Config";
import type { INpdGeneralInfo } from "../../External/CommonServices/Interface";
import {
  fetchNpdInitiatorBrandOptions,
  fetchNpdPlantSourceOptions,
} from "../thunks/npdFormThunks";
import type { INpdFormState } from "./npdFormState.types";

export type { INpdFormState, NpdFormRequestStatus } from "./npdFormState.types";

const initialGeneralInfo: INpdGeneralInfo = {
  brand: null,
  materialType: null,
  plantSource: null,
};

const initialState: INpdFormState = {
  generalInfo: initialGeneralInfo,
  brandOptions: [],
  plantSourceOptions: [],
  brandOptionsStatus: "idle",
  plantSourceStatus: "idle",
  error: null,
};

const npdFormSlice = createSlice({
  name: "npdForm",
  initialState,
  reducers: {
    clearNpdFormError(state) {
      state.error = null;
    },
    resetNpdFormState(state) {
      state.generalInfo = { ...initialGeneralInfo };
      state.plantSourceOptions = [];
      state.plantSourceStatus = "idle";
      state.error = null;
    },
    setNpdBrand(state, action: PayloadAction<string | null>) {
      state.generalInfo.brand = action.payload;
    },
    setNpdMaterialType(state, action: PayloadAction<string | null>) {
      state.generalInfo.materialType = action.payload;
      state.generalInfo.plantSource = null;
      state.plantSourceOptions = [];
      state.plantSourceStatus = "idle";
    },
    setNpdPlantSource(state, action: PayloadAction<string | null>) {
      state.generalInfo.plantSource = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNpdInitiatorBrandOptions.pending, (state) => {
        state.brandOptionsStatus = "loading";
        state.error = null;
      })
      .addCase(fetchNpdInitiatorBrandOptions.fulfilled, (state, action) => {
        state.brandOptionsStatus = "idle";
        state.brandOptions = action.payload;
      })
      .addCase(fetchNpdInitiatorBrandOptions.rejected, (state, action) => {
        state.brandOptionsStatus = "error";
        state.error = action.payload ?? "Failed to load brand options.";
      })
      .addCase(fetchNpdPlantSourceOptions.pending, (state) => {
        state.plantSourceStatus = "loading";
        state.error = null;
      })
      .addCase(fetchNpdPlantSourceOptions.fulfilled, (state, action) => {
        state.plantSourceStatus = "idle";
        state.plantSourceOptions = action.payload;
      })
      .addCase(fetchNpdPlantSourceOptions.rejected, (state, action) => {
        state.plantSourceStatus = "error";
        state.error = action.payload ?? "Failed to load Plant / Source options.";
      });
  },
});

export const {
  clearNpdFormError,
  resetNpdFormState,
  setNpdBrand,
  setNpdMaterialType,
  setNpdPlantSource,
} = npdFormSlice.actions;

export const selectIsFinishedProductsMaterialType = (
  materialType: string | null,
): boolean =>
  materialType === Config.NpdMaterialTypes.FinishedProducts;

export const selectIsTradedProductsMaterialType = (
  materialType: string | null,
): boolean => materialType === Config.NpdMaterialTypes.TradedProducts;

export const selectHasPlantSourceMaterialType = (
  materialType: string | null,
): boolean =>
  selectIsFinishedProductsMaterialType(materialType) ||
  selectIsTradedProductsMaterialType(materialType);

export default npdFormSlice.reducer;
