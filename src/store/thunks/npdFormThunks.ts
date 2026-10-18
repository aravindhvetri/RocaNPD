import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
  INpdItemDetailRecord,
  INpdOtherDetails,
  INpdRequestGeneralInfo,
  INpdWorkflowStepJson,
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
  stringifyWorkflowJson,
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

function stringifyWorkflowJsonFromState(
  steps: readonly INpdWorkflowStepJson[] | undefined,
): string {
  if (!steps?.length) {
    return "";
  }
  try {
    return stringifyWorkflowJson(steps as INpdWorkflowStepJson[]);
  } catch {
    return "";
  }
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

function roleListIncludes(roles: readonly string[], role: string): boolean {
  const target = role.trim().toLowerCase();
  return roles.some((item) => item.trim().toLowerCase() === target);
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
      const { siteUrl, userEmail, userLoginName, assignedRoles } = app;

      // Prefer login-resolved brands — avoids a second ApproversMaster round-trip.
      if (app.npdInitiatorBrands && app.npdInitiatorBrands.length > 0) {
        return app.npdInitiatorBrands.map((title) => ({
          label: title,
          value: title,
        }));
      }

      const isInitiator = roleListIncludes(
        assignedRoles,
        Config.Roles.Initiator,
      );
      const isAdmin = roleListIncludes(assignedRoles, Config.Roles.Admin);

      // VH / MIS / Consultant: empty initiator brands after login is expected.
      // Do not re-query ApproversMaster or BrandMaster on form open.
      if (app.roleStatus === "succeeded" && !isInitiator && !isAdmin) {
        return [];
      }

      // Initiator/Admin: query ApproversMaster only when login seed was empty.
      if ((userEmail || userLoginName) && (isInitiator || isAdmin)) {
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

      // Admin-only BrandMaster fallback (create form without Initiator mapping).
      if (isAdmin) {
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
      }

      return [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const { npdForm, app } = getState();
      if (npdForm.brandOptionsStatus === "loading") {
        return false;
      }
      // Login already hydrated brands — skip ApproversMaster / siteUsers again.
      if (npdForm.brandOptions.length > 0) {
        return false;
      }
      // After roles resolve, VH / MIS / Consultant never need Initiator brand fetch.
      if (app.roleStatus === "succeeded") {
        const roles = app.assignedRoles || [];
        const needsInitiatorBrandFetch =
          roleListIncludes(roles, Config.Roles.Initiator) ||
          roleListIncludes(roles, Config.Roles.Admin);
        if (!needsInitiatorBrandFetch) {
          return false;
        }
        // Initiator brands were seeded at login (possibly empty) — do not refetch.
        if (roleListIncludes(roles, Config.Roles.Initiator)) {
          return false;
        }
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
  {
    condition: (materialType, { getState }) => {
      const { npdForm } = getState();
      if (npdForm.plantSourceStatus === "loading") {
        return false;
      }
      // Reuse an already-loaded PlantMaster list for the same Finished Products session.
      if (
        materialType === Config.NpdMaterialTypes.FinishedProducts &&
        npdForm.plantSourceOptions.length > 0
      ) {
        return false;
      }
      return true;
    },
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
      /** General Information unchanged since hydrate — skip NPD_Request PATCH. */
      headerUnchanged?: boolean;
      /** ItemDetailsCount from last hydrate (Products column). */
      existingItemDetailsCount?: number;
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
    const headerUnchanged = Array.isArray(arg)
      ? undefined
      : arg.headerUnchanged;
    const existingItemDetailsCount = Array.isArray(arg)
      ? undefined
      : arg.existingItemDetailsCount;
    const existingWorkflowJson = stringifyWorkflowJsonFromState(
      state.npdForm.workflowSteps,
    );
    let retainedDraftId = 0;

    try {
      // Zero grace: reconnect must not resume remaining Item Details batches.
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
            headerUnchanged,
            existingItemDetailsCount,
            existingWorkflowJson,
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
        0,
      );
    } catch (error) {
      npdRequestGeneralInfoService.cancelInFlightNpdDraftPersist();
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
              typeof draftMeta?.npdDraftRequestTitle === "string"
                ? draftMeta.npdDraftRequestTitle
                : state.npdForm.requestTitle || undefined,
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
      /** Soft-deletes vs hydrate baseline — skips NPD_ItemDetails reconcile GET. */
      deletedSharePointIds?: number[];
      /** Full Item Details count from hydrate (caps remaining inserts). */
      intendedItemDetailsCount?: number;
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
    const deletedSharePointIds = Array.isArray(arg)
      ? undefined
      : arg.deletedSharePointIds;
    const intendedItemDetailsCount = Array.isArray(arg)
      ? undefined
      : arg.intendedItemDetailsCount;
    const existingRequestId = state.npdForm.requestId;
    let retainedDraftId = 0;

    try {
      // Zero grace: reconnect must not resume this Submit. Remaining Item
      // Details are inserted only on the next Send Request click.
      return await raceWithBrowserOffline(
        npdRequestGeneralInfoService.submitNpdRequest(
          payload,
          items,
          state.app.userEmail || state.app.userLoginName,
          state.app.siteUrl || undefined,
          comments,
          state.app.userId,
          {
            backupItems,
            intendedItemDetailsCount,
            deletedSharePointIds:
              existingRequestId && existingRequestId > 0
                ? deletedSharePointIds ?? []
                : deletedSharePointIds,
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
        0,
      );
    } catch (error) {
      npdRequestGeneralInfoService.cancelInFlightNpdSubmit();
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
              typeof draftMeta?.npdDraftRequestTitle === "string"
                ? draftMeta.npdDraftRequestTitle
                : state.npdForm.requestTitle || undefined,
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
    const existingRequest: INpdRequestGeneralInfo | undefined =
      requestId && state.npdForm.workflowSteps.length
        ? {
            Id: requestId,
            Title: state.npdForm.requestTitle || "",
            Brand: state.npdForm.generalInfo.brand || "",
            MaterialType: state.npdForm.generalInfo.materialType || "",
            Plant: state.npdForm.generalInfo.plantSource || "",
            Status: state.npdForm.requestStatus || "",
            IsDeleted: false,
            WorkFlowJSON: "",
            WorkflowSteps: state.npdForm.workflowSteps,
            AuthorEmail: "",
            AuthorTitle: "",
            InitiatorEmail: "",
            InitiatorId: 0,
            Created: "",
            Modified: "",
            PlantCode: state.npdForm.otherDetails.plantCode || "",
            StorageLocation: state.npdForm.otherDetails.storageLocation || "",
            ProfitCenter: state.npdForm.otherDetails.profitCenter || "",
            MRPGroup: state.npdForm.otherDetails.mrpGroup || "",
            MRPController: state.npdForm.otherDetails.mrpController || "",
            ValuationClass: state.npdForm.otherDetails.valuationClass || "",
            ClassType: state.npdForm.otherDetails.classType || "",
            MaterialExtension:
              state.npdForm.otherDetails.materialExtension || "",
          }
        : undefined;

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
          existingRequest,
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
    // Normal View/Edit: exactly NPD_Request + NPD_ItemDetails (once each).
    const [request, items] = await Promise.all([
      npdRequestGeneralInfoService.fetchNpdGeneralInfoById(id, {
        includeBackupMeta: true,
      }),
      npdItemDetailsService.fetchNpdItemDetailsByRequestId(id),
    ]);

    const status = (request.Status || "").trim().toLowerCase();
    const isDraftOrRework =
      status === Config.RequestStatus.Draft.toLowerCase() ||
      status === Config.RequestStatus.Rework.toLowerCase() ||
      status === "in rework";
    const expectedCount = Math.max(
      0,
      Math.floor(Number(request.ItemDetailsCount) || 0),
    );
    const backupUrl = String(request.ItemDetailsBackupUrl ?? "").trim();
    // Recover only when Draft/Rework is short of the full Item Details count
    // (or count is 0 but a backup file exists). A matching count must not
    // merge Attachments again — that duplicated rows in the grid.
    const maybeIncomplete =
      isDraftOrRework &&
      (expectedCount > items.length ||
        (expectedCount === 0 && Boolean(backupUrl)));
    if (!maybeIncomplete) {
      return { request, items };
    }

    const backup = await tryLoadNpdItemDetailsBackup(id, {
      serverRelativeUrl: backupUrl || undefined,
    }).catch(() => null);
    if (!backup?.length || backup.length <= items.length) {
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
