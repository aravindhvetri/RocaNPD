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
import {
  wasNpdWorkflowActionApplied,
} from "../../External/CommonServices/npdWorkflowJsonService";
import {
  mergeNpdItemDetailsWithBackup,
  tryLoadNpdItemDetailsBackup,
} from "../../External/CommonServices/npdItemDetailsBackupService";
import {
  assertBrowserOnline,
  isBrowserOnline,
  isNetworkError,
  raceWithBrowserOffline,
  toUserActionErrorMessage,
} from "../../External/CommonServices/networkConnectivity";
import { selectResolvedAccess } from "../slices/appSlice";
import { bindNpdFormDraftRequest } from "../slices/npdFormSlice";
import type { RootState } from "../rootState";
import {
  beginSapUiProcessing,
  finishUiProcessing,
  reportSapUiProcessing,
} from "../uiProcessing";

function getErrorMessage(error: unknown): string {
  return toUserActionErrorMessage(error);
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
      // One in-flight request only.
      if (form.lookupOptionsStatus === "loading") {
        return false;
      }
      // Keep a successful cache; allow retry when empty or after an error.
      if (
        form.lookupOptionsStatus === "idle" &&
        Object.keys(form.lookupOptionsByType).length > 0
      ) {
        return false;
      }
      return true;
    },
  },
);

/**
 * Loads Other Details for the open request.
 * Once values exist on NPD_Request (after MIS Rework / Reject / Post),
 * list fields are the source of truth — including intentionally blank
 * Material Extension. Brand / PlantMaster auto-fill only runs the first time.
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
    const hasSavedOtherDetails =
      npdOtherDetailsService.otherDetailsHaveSavedValues(existing);

    // Already persisted on NPD_Request — do not overwrite with Brand / PlantMaster defaults.
    if (hasSavedOtherDetails) {
      const profitCenterOptions = await npdOtherDetailsService
        .fetchProfitCenterOptions()
        .catch(() => []);
      return {
        otherDetails: { ...existing },
        profitCenterOptions,
      };
    }

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
        materialExtension: existing.materialExtension,
      },
      preserveEditableFields: false,
    });

    return { otherDetails, profitCenterOptions };
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const saveNpdDraft = createAsyncThunk<
  INpdRequestGeneralInfo,
  | INpdItemDetailRecord[]
  | {
      items: INpdItemDetailRecord[];
      partial?: boolean;
      deletedSharePointIds?: number[];
      /** Full Item Details grid for JSON backup (all form rows). */
      backupItems?: INpdItemDetailRecord[];
    },
  { rejectValue: string; state: RootState }
>("npdForm/saveDraft", async (arg, { getState, dispatch, rejectWithValue }) => {
  try {
    assertBrowserOnline();
    const state = getState();
    const payload = getHeaderPayload(state, true);
    if (!payload) {
      return rejectWithValue(
        "Brand (MG1) and Material Type are required.",
      );
    }

    const items = Array.isArray(arg) ? arg : arg.items;
    const partial = Array.isArray(arg) ? undefined : arg.partial;
    const deletedSharePointIds = Array.isArray(arg)
      ? undefined
      : arg.deletedSharePointIds;
    const backupItems = Array.isArray(arg) ? items : arg.backupItems ?? items;
    let retainedDraftId = 0;

    try {
      return await raceWithBrowserOffline(
        npdRequestGeneralInfoService.saveNpdGeneralInfoDraft(
          payload,
          items,
          state.app.userEmail || state.app.userLoginName,
          state.app.siteUrl || undefined,
          state.app.userId,
          {
            partial: Array.isArray(arg) ? undefined : partial !== false,
            deletedSharePointIds: Array.isArray(arg)
              ? undefined
              : deletedSharePointIds,
            backupItems,
            onDraftRetained: (draft) => {
              retainedDraftId = draft.requestId;
              dispatch(
                bindNpdFormDraftRequest({
                  requestId: draft.requestId,
                  requestTitle: draft.requestTitle,
                }),
              );
            },
          },
        ),
      );
    } catch (error) {
      const draftMeta = error as {
        npdDraftRequestId?: number;
        npdDraftRequestTitle?: string;
      } | null;
      const draftRequestId =
        (typeof draftMeta?.npdDraftRequestId === "number" &&
        draftMeta.npdDraftRequestId > 0
          ? draftMeta.npdDraftRequestId
          : retainedDraftId) || 0;
      if (draftRequestId > 0) {
        dispatch(
          bindNpdFormDraftRequest({
            requestId: draftRequestId,
            requestTitle:
              draftMeta?.npdDraftRequestTitle ||
              state.npdForm.requestTitle ||
              undefined,
          }),
        );
      }
      throw error;
    }
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const submitNpdRequest = createAsyncThunk<
  INpdRequestGeneralInfo,
  | INpdItemDetailRecord[]
  | {
      items: INpdItemDetailRecord[];
      comments?: string;
      /** Full Item Details grid for JSON backup (all form rows). */
      backupItems?: INpdItemDetailRecord[];
    },
  { rejectValue: string; state: RootState }
>("npdForm/submitRequest", async (arg, { getState, dispatch, rejectWithValue }) => {
  try {
    assertBrowserOnline();
    const state = getState();
    const payload = getHeaderPayload(state);
    if (!payload) {
      return rejectWithValue(
        "Brand (MG1), Material Type, and Plant / Source are required.",
      );
    }

    const items = Array.isArray(arg) ? arg : arg.items;
    const comments = Array.isArray(arg) ? undefined : arg.comments;
    const backupItems = Array.isArray(arg) ? items : arg.backupItems ?? items;
    const existingRequestId = state.npdForm.requestId;
    let retainedDraftId = 0;

    try {
      return await raceWithBrowserOffline(
        npdRequestGeneralInfoService.submitNpdRequest(
          payload,
          items,
          state.app.userEmail || state.app.userLoginName,
          state.app.siteUrl || undefined,
          comments,
          state.app.userId,
          (draft) => {
            retainedDraftId = draft.requestId;
            dispatch(
              bindNpdFormDraftRequest({
                requestId: draft.requestId,
                requestTitle: draft.requestTitle,
              }),
            );
          },
          backupItems,
        ),
      );
    } catch (error) {
      const draftMeta = error as {
        npdDraftRequestId?: number;
        npdDraftRequestTitle?: string;
      } | null;
      const draftRequestId =
        (typeof draftMeta?.npdDraftRequestId === "number" &&
        draftMeta.npdDraftRequestId > 0
          ? draftMeta.npdDraftRequestId
          : retainedDraftId) || 0;
      const checkId =
        draftRequestId || existingRequestId || retainedDraftId || 0;
      if (checkId > 0) {
        dispatch(
          bindNpdFormDraftRequest({
            requestId: checkId,
            requestTitle:
              draftMeta?.npdDraftRequestTitle ||
              state.npdForm.requestTitle ||
              undefined,
          }),
        );
      }

      // Never re-fetch status on network failure — the call can hang and block
      // Draft-page navigation while the request is already Draft in SharePoint.
      throw error;
    }
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
    itemSavePartial?: boolean;
    deletedItemIds?: number[];
    /** MIS Post to SAP: only these rows are checked against Material Master. */
    materialMasterCheckItems?: INpdItemDetailRecord[];
  },
  { rejectValue: string; state: RootState }
>("npdForm/workflowAction", async (input, { getState, dispatch, rejectWithValue }) => {
  try {
    assertBrowserOnline();
    const state = getState();
    if (!state.npdForm.requestId) {
      return rejectWithValue("The request could not be found.");
    }

    const isMisActor =
      (input.actorRole || "").trim().toLowerCase() ===
        Config.Roles.MisCoordinator.toLowerCase() ||
      Boolean(input.includeOtherDetails);

    if (isMisActor && input.action === "Approve") {
      const profitCenter = (state.npdForm.otherDetails.profitCenter || "").trim();
      if (!profitCenter) {
        return rejectWithValue("Profit Center is required.");
      }
    }

    const requestId = state.npdForm.requestId;
    const actorRole = input.actorRole;

    try {
      return await raceWithBrowserOffline(
        npdRequestGeneralInfoService.applyNpdWorkflowAction({
          requestId,
          action: input.action,
          comments: input.comments,
          actorEmail: state.app.userEmail || state.app.userLoginName,
          actorRole,
          actorUserId: state.app.userId,
          access: selectResolvedAccess(state),
          items: input.items,
          otherDetails: isMisActor ? state.npdForm.otherDetails : undefined,
          siteUrl: state.app.siteUrl || undefined,
          actionVia: input.actionVia || "System",
          itemSavePartial: input.itemSavePartial,
          deletedItemIds: input.deletedItemIds,
          materialMasterCheckItems: input.materialMasterCheckItems,
          sapProgress:
            isMisActor && input.action === "Approve"
              ? {
                  onProgress: (posted, total) => {
                    if (total <= 0) {
                      return;
                    }
                    if (posted === 0) {
                      beginSapUiProcessing(dispatch, total);
                      return;
                    }
                    reportSapUiProcessing(dispatch, posted, total);
                  },
                  onFinish: (success) => finishUiProcessing(dispatch, success),
                }
              : undefined,
        }),
      );
    } catch (error) {
      // Offline race can reject after the SharePoint status write already succeeded.
      // Do not refetch while offline — that call waits until the network returns
      // and keeps Post to SAP on Processing.
      if (isNetworkError(error) && isBrowserOnline()) {
        try {
          const latest =
            await npdRequestGeneralInfoService.fetchNpdGeneralInfoById(
              requestId,
            );
          if (
            wasNpdWorkflowActionApplied(latest, input.action, actorRole)
          ) {
            finishUiProcessing(dispatch, true);
            return latest;
          }
        } catch {
          // Still treat as failure below.
        }
      }
      throw error;
    }
  } catch (error) {
    // Ensure SAP / global progress never stays stuck after a network failure.
    finishUiProcessing(dispatch, false);
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

    const status = (request.Status || "").trim().toLowerCase();
    const showBackupRows =
      status === Config.RequestStatus.Draft.toLowerCase() ||
      status === Config.RequestStatus.Rework.toLowerCase() ||
      status === "in rework";
    if (!showBackupRows) {
      return { request, items };
    }

    // Draft / Rework: show saved rows plus backup rows not yet in the list.
    // This read does not insert. Resubmit inserts the missing rows.
    const backup = await tryLoadNpdItemDetailsBackup(id).catch(() => null);
    if (!backup?.length) {
      return { request, items };
    }
    return {
      request,
      items: mergeNpdItemDetailsWithBackup(items, backup),
    };
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
