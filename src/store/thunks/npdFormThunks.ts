import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
  INpdItemDetailRecord,
  INpdOtherDetails,
  INpdRequestGeneralInfo,
  ISelectOption,
  NpdWorkflowAction,
} from "../../External/CommonServices/Interface";
import { Config } from "../../External/CommonServices/Config";
import * as lookupOptionUtils from "../../External/CommonServices/lookupOptionUtils";
import * as npdFormDataService from "../../External/CommonServices/npdFormDataService";
import * as npdItemDetailsService from "../../External/CommonServices/npdItemDetailsService";
import * as npdOtherDetailsService from "../../External/CommonServices/npdOtherDetailsService";
import * as npdRequestGeneralInfoService from "../../External/CommonServices/npdRequestGeneralInfoService";
import { selectResolvedAccess } from "../slices/appSlice";
import type { RootState } from "../rootState";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}

function getHeaderPayload(state: RootState, isDraft = false) {
  const { npdForm } = state;
  const { brand, materialType, plantSource } = npdForm.generalInfo;

  if (isDraft) {
    if (!brand || !materialType) {
      return null;
    }
  } else {
    if (!brand || !materialType || !plantSource) {
      return null;
    }
  }

  return {
    id: npdForm.requestId,
    brand,
    materialType,
    plantSource: plantSource || "",
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
      const { siteUrl, userEmail, userLoginName } = app;

      // 1. Direct query from ApproversMaster matching current user
      if (userEmail || userLoginName) {
        try {
          const directOptions =
            await npdFormDataService.fetchInitiatorBrandOptions(
              userEmail,
              siteUrl || undefined,
              userLoginName || undefined,
            );
          if (directOptions && directOptions.length > 0) {
            return directOptions;
          }
        } catch (fetchErr) {
          console.warn("Direct fetchInitiatorBrandOptions failed:", fetchErr);
        }
      }

      // 2. Fall back to resolved app.npdInitiatorBrands
      if (app.npdInitiatorBrands && app.npdInitiatorBrands.length > 0) {
        return app.npdInitiatorBrands.map((title) => ({
          label: title,
          value: title,
        }));
      }

      // 3. Fall back to BrandMaster if available
      try {
        const fallbackBrands =
          await npdFormDataService.fetchActiveBrandMasterOptions(
            siteUrl || undefined,
          );
        if (fallbackBrands && fallbackBrands.length > 0) {
          return fallbackBrands;
        }
      } catch {
        // Ignore fallback error
      }

      return [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const { npdForm } = getState();
      if (npdForm.brandOptionsStatus === "loading") {
        return false;
      }

      return true;
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
      return true;
    },
  },
);

/**
 * Auto-populates MIS Other Details from PlantMaster / Brand Extension / valuation rules.
 */
export const populateNpdOtherDetails = createAsyncThunk<
  { otherDetails: INpdOtherDetails; profitCenterOptions: ISelectOption[] },
  void,
  { rejectValue: string; state: RootState }
>("npdForm/populateOtherDetails", async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const { brand, materialType, plantSource } = state.npdForm.generalInfo;
    const existing = state.npdForm.otherDetails;
    const siteUrl = state.app.siteUrl || undefined;

    const plantCode = npdOtherDetailsService.resolveMisPlantCode(
      materialType,
      plantSource,
    );

    const [plantDetails, materialExtension, profitCenterOptions] =
      await Promise.all([
        plantCode
          ? npdOtherDetailsService
              .fetchPlantMasterSapDetails(plantCode, siteUrl)
              .catch(() => null)
          : Promise.resolve(null),
        npdOtherDetailsService
          .fetchMaterialExtensionForBrand(brand)
          .catch(() => ""),
        npdOtherDetailsService.fetchProfitCenterOptions().catch(() => []),
      ]);

    const otherDetails = npdOtherDetailsService.buildMisOtherDetails({
      materialType,
      plantSource,
      brand,
      plantDetails,
      materialExtension,
      existing: {
        profitCenter: existing.profitCenter,
        materialExtension: existing.materialExtension || undefined,
      },
    });

    if (!otherDetails.materialExtension && existing.materialExtension) {
      otherDetails.materialExtension = existing.materialExtension;
    }

    return { otherDetails, profitCenterOptions };
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const saveNpdDraft = createAsyncThunk<
  INpdRequestGeneralInfo,
  INpdItemDetailRecord[],
  { rejectValue: string; state: RootState }
>("npdForm/saveDraft", async (items, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const payload = getHeaderPayload(state, true);
    if (!payload) {
      return rejectWithValue(
        "Brand (MG1) and Material Type are required.",
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
  INpdItemDetailRecord[] | { items: INpdItemDetailRecord[]; comments?: string },
  { rejectValue: string; state: RootState }
>("npdForm/submitRequest", async (arg, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const payload = getHeaderPayload(state);
    if (!payload) {
      return rejectWithValue(
        "Brand (MG1), Material Type, and Plant / Source are required.",
      );
    }

    const items = Array.isArray(arg) ? arg : arg.items;
    const comments = Array.isArray(arg) ? undefined : arg.comments;

    return await npdRequestGeneralInfoService.submitNpdRequest(
      payload,
      items,
      state.app.userEmail || state.app.userLoginName,
      state.app.siteUrl || undefined,
      comments,
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
    includeOtherDetails?: boolean;
    actionVia?: "System" | "Mail" | string;
  },
  { rejectValue: string; state: RootState }
>("npdForm/workflowAction", async (input, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    if (!state.npdForm.requestId) {
      return rejectWithValue("The request could not be found.");
    }

    const isMisActor =
      (input.actorRole || "").trim().toLowerCase() ===
        Config.Roles.MisCoordinator.toLowerCase() ||
      Boolean(input.includeOtherDetails);

    return await npdRequestGeneralInfoService.applyNpdWorkflowAction({
      requestId: state.npdForm.requestId,
      action: input.action,
      comments: input.comments,
      actorEmail: state.app.userEmail || state.app.userLoginName,
      actorRole: input.actorRole,
      actorUserId: state.app.userId,
      access: selectResolvedAccess(state),
      items: input.items,
      otherDetails: isMisActor ? state.npdForm.otherDetails : undefined,
      siteUrl: state.app.siteUrl || undefined,
      actionVia: input.actionVia || "System",
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
