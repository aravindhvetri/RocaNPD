import * as React from "react";
import { flushSync } from "react-dom";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Toast as PrimeToast } from "primereact/toast";
import {
  ApproverSystems,
  Config,
} from "../../../../../External/CommonServices/Config";
import type {
  INpdApproverCommentRow,
  NpdWorkflowAction,
} from "../../../../../External/CommonServices/Interface";
import { buildNpdItemDetailsMatchKey } from "../../../../../External/CommonServices/npdItemDetailsBackupService";
import { fetchNpdApproverComments } from "../../../../../External/CommonServices/npdApproverCommentsService";
import {
  canActOnPendingNpdStep,
  getDefaultRoute,
  hasRole,
  hasSystemRole,
  isNpdApproversMasterInitiatorForBrand,
  parseViewAsRole,
} from "../../../../../External/CommonServices/permissionService";
import { buildNavHref } from "../../../../../External/CommonServices/navigationConfig";
import {
  getFirstPendingApproverRole,
  isMisCoordinatorWorkflowRole,
  isVerticalHeadWorkflowRole,
  resolveActorWorkflowRole,
} from "../../../../../External/CommonServices/npdWorkflowJsonService";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import { store } from "../../../../../store";
import { selectResolvedAccess } from "../../../../../store/slices/appSlice";
import {
  clearNpdFormBusyState,
  clearNpdFormError,
  resetNpdFormState,
  selectHasPlantSourceMaterialType,
} from "../../../../../store/slices/npdFormSlice";
import { setFlashMessage } from "../../../../../store/slices/uiSlice";
import {
  applyNpdWorkflowAction,
  fetchNpdInitiatorBrandOptions,
  fetchNpdLookupOptions,
  fetchNpdPlantSourceOptions,
  hydrateNpdRequestForm,
  populateNpdOtherDetails,
  saveNpdDraft,
  submitNpdRequest,
} from "../../../../../store/thunks/npdFormThunks";
import {
  beginUiProcessing,
  finishUiProcessing,
} from "../../../../../store/uiProcessing";
import {
  showActionValidationToast,
  showErrorToast,
  showWarningToast,
} from "../../common/controls";
import {
  createEmptyNpdItemDetailRow,
  isEmptyItemDetailRow,
  toNpdItemDetailRecord,
  toNpdItemDetailRow,
} from "./npdItemDetailsConfig";
import type { INpdItemDetailRow } from "./npdItemDetails.types";
import { validateItemsAgainstMaterialMaster } from "../../../../../External/CommonServices/materialMasterService";
import {
  assertBrowserOnline,
  isBrowserOnline,
  isNetworkError,
  NETWORK_OFFLINE_MESSAGE,
  toUserActionErrorMessage,
} from "../../../../../External/CommonServices/networkConnectivity";
import {
  cancelInFlightNpdSubmit,
  resetNpdSubmitOfflineLatch,
} from "../../../../../External/CommonServices/npdRequestGeneralInfoService";
import {
  validateMisCoordinatorAction,
  validateMisCoordinatorReject,
  validateMisCoordinatorRework,
  validateNpdDraftForm,
  validateNpdItemDetailsRows,
  validateNpdRequestForm,
} from "./npdItemDetailsValidation";
import {
  canEditNpdItemDetails,
  diffNpdItemDetailRows,
  fingerprintNpdItemDetailRow,
  firstValidationMessage,
  isDraftOrReworkStatus,
  isNpdFormViewMode,
  parseEditId,
  parseNpdWorkflowAction,
  resolveNpdFooterMode,
  resolveNpdFormCancelRoute,
  shouldShowNpdOtherDetails,
  toPersistableItemRecords,
  workflowActionRequiresComments,
} from "./npdRequestFormHelpers";
import { useNpdEmailAction } from "./useNpdEmailAction";
import { useNpdRequestTabLock } from "../tabLock/useNpdRequestTabLock";
import { isNpdRequestIdTitle } from "../../../../../External/CommonServices/npdRequestIdService";

export function useNpdRequestFormController(
  toastRef: React.RefObject<PrimeToast>,
) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const editId = parseEditId(searchParams.get("id"));
  const emailAction = parseNpdWorkflowAction(
    searchParams.get(Config.NpdEmail.QueryAction),
  );
  const isViewMode = isNpdFormViewMode(
    searchParams.get(Config.NpdFormQuery.Mode),
    emailAction,
    Boolean(editId),
  );
  const viewAs =
    parseViewAsRole(searchParams.get(Config.NpdFormQuery.ViewAs)) ||
    undefined;
  const initialized = useAppSelector((state) => state.app.initialized);
  const roleStatus = useAppSelector((state) => state.app.roleStatus);
  const userEmail = useAppSelector((state) => state.app.userEmail);
  const userLoginName = useAppSelector((state) => state.app.userLoginName);
  const assignedRoles = useAppSelector((state) => state.app.assignedRoles);
  const access = useAppSelector(selectResolvedAccess);
  const npdForm = useAppSelector((state) => state.npdForm);
  const [itemRows, setItemRows] = React.useState<INpdItemDetailRow[]>(() => [
    createEmptyNpdItemDetailRow(),
  ]);
  /** Snapshot after hydrate — used to persist only added/edited Item Details. */
  const itemBaselineRef = React.useRef<INpdItemDetailRow[]>([]);
  const [recordReady, setRecordReady] = React.useState(!editId);
  const [importVisible, setImportVisible] = React.useState(false);
  const [approverRemarks, setApproverRemarks] = React.useState("");
  const [auditLogs, setAuditLogs] = React.useState<INpdApproverCommentRow[]>(
    [],
  );
  /**
   * When Submit fails offline before Draft id is bound, wait for
   * bindNpdFormDraftRequest then navigate to Draft / Rework.
   */
  const pendingOfflineDraftNavigationRef = React.useRef(false);
  /** Prevents repeat deny toast/navigation for the same deep-linked request. */
  const deniedInitiatorAccessIdRef = React.useRef(0);

  const hasPlantSourceMaterialType = selectHasPlantSourceMaterialType(
    npdForm.generalInfo.materialType,
  );
  const actorEmail = userEmail || userLoginName;
  const pendingRole = resolveActorWorkflowRole(
    npdForm.workflowSteps,
    actorEmail,
    assignedRoles,
  );
  const draftOrReworkOpen =
    Boolean(npdForm.requestId) &&
    isDraftOrReworkStatus(npdForm.requestStatus);
  const stillBrandInitiator = isNpdApproversMasterInitiatorForBrand(
    access,
    npdForm.generalInfo.brand ?? "",
  );
  const footerMode = resolveNpdFooterMode({
    requestId: npdForm.requestId,
    requestStatus: npdForm.requestStatus,
    actorEmail,
    workflowSteps: npdForm.workflowSteps,
    canEditDraft:
      hasSystemRole(
        access,
        Config.Roles.Initiator,
        ApproverSystems.NewProductDevelopment,
      ) &&
      (!draftOrReworkOpen || stillBrandInitiator),
    assignedRoles,
    canActOnPendingStep: canActOnPendingNpdStep(
      access,
      npdForm.generalInfo.brand ?? "",
      pendingRole,
    ),
    pendingRole,
    isViewMode,
  });
  const itemDetailsReadOnly = !canEditNpdItemDetails({
    footerMode,
    pendingRole,
    assignedRoles,
  });
  const tabLock = useNpdRequestTabLock({
    requestId: npdForm.requestId ?? editId,
    requestTitle: npdForm.requestTitle ?? "",
    isOpen: Boolean(editId || npdForm.requestId),
  });
  const isTabLocked = Boolean(tabLock.restriction);
  const lockedFooterMode = isTabLocked ? "read-only" : footerMode;
  const isVerticalHead = hasSystemRole(
    access,
    Config.Roles.VerticalHead,
    ApproverSystems.NewProductDevelopment,
  );
  const isMisCoordinator = hasSystemRole(
    access,
    Config.Roles.MisCoordinator,
    ApproverSystems.NewProductDevelopment,
  );

  const pendingApproverRole = getFirstPendingApproverRole(
    npdForm.workflowSteps,
  );

  const vhStep = npdForm.workflowSteps.find((s) =>
    isVerticalHeadWorkflowRole(s.Role),
  );
  const isApprovedByVh = Boolean(
    vhStep &&
    vhStep.Status.trim().toLowerCase() ===
      Config.WorkflowStepStatus.Approved.toLowerCase(),
  );

  const hasReachedMis =
    isMisCoordinatorWorkflowRole(pendingApproverRole) ||
    lockedFooterMode === "mis-pending" ||
    isApprovedByVh ||
    Boolean(
      npdForm.workflowSteps.find(
        (s) =>
          isMisCoordinatorWorkflowRole(s.Role) &&
          (s.Status.trim().toLowerCase() ===
            Config.WorkflowStepStatus.Pending.toLowerCase() ||
            s.Status.trim().toLowerCase() ===
              Config.WorkflowStepStatus.Approved.toLowerCase()),
      ),
    );

  const isRequestApproved = Boolean(
    npdForm.requestStatus &&
    (npdForm.requestStatus.trim().toLowerCase() ===
      Config.RequestStatus.Approved.toLowerCase() ||
      npdForm.requestStatus.trim().toLowerCase() ===
        Config.RequestStatus.Completed.toLowerCase()),
  );

  // Before Approved: MIS Coordinator module only (`?as=`). After Approved: all modules.
  const showOtherDetails = shouldShowNpdOtherDetails({
    hasRequest: Boolean(editId || npdForm.requestId),
    isRequestApproved,
    viewAs,
    isMisCoordinator,
    isVerticalHead,
    hasReachedMis,
    footerMode: lockedFooterMode,
  });
  const otherDetailsReadOnly = lockedFooterMode !== "mis-pending";
  const showApproverRemarks =
    lockedFooterMode === "vertical-head-pending" ||
    lockedFooterMode === "mis-pending";
  const showAuditLog = Boolean(editId || npdForm.requestId);

  React.useEffect(() => {
    if (!showOtherDetails || !recordReady || npdForm.loadStatus === "loading") {
      return;
    }
    if (!npdForm.generalInfo.materialType || !npdForm.generalInfo.plantSource) {
      return;
    }
    void dispatch(populateNpdOtherDetails());
  }, [
    dispatch,
    showOtherDetails,
    recordReady,
    npdForm.loadStatus,
    npdForm.generalInfo.brand,
    npdForm.generalInfo.materialType,
    npdForm.generalInfo.plantSource,
  ]);

  React.useEffect(() => {
    // Wait for app init so this does not race login sync and get stuck behind
    // a blocked/empty first fetch (MultiSelect options then stay blank).
    if (!initialized) {
      return;
    }
    void dispatch(fetchNpdLookupOptions());
  }, [dispatch, initialized, location.key, location.pathname]);

  React.useEffect(() => {
    if (!initialized || (!userEmail && !userLoginName)) {
      return;
    }
    void dispatch(fetchNpdInitiatorBrandOptions());
  }, [
    dispatch,
    initialized,
    roleStatus,
    userEmail,
    userLoginName,
    location.key,
    location.pathname,
  ]);

  // Create = blank form. Opening New after View must not keep the prior request.
  const formResetAt = (location.state as { formResetAt?: number } | null)
    ?.formResetAt;

  React.useEffect(() => {
    if (!initialized) {
      return;
    }

    if (!editId) {
      dispatch(resetNpdFormState());
      setItemRows([createEmptyNpdItemDetailRow()]);
      itemBaselineRef.current = [];
      setApproverRemarks("");
      setAuditLogs([]);
      setRecordReady(true);
      return;
    }

    let cancelled = false;
    setRecordReady(false);
    const hydrate = dispatch(hydrateNpdRequestForm(editId));
    void hydrate
      .unwrap()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setItemRows(
          result.items.length
            ? result.items.map(toNpdItemDetailRow)
            : [createEmptyNpdItemDetailRow()],
        );
        itemBaselineRef.current = result.items.length
          ? result.items.map(toNpdItemDetailRow)
          : [];
        setRecordReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setRecordReady(true);
        }
      });

    void fetchNpdApproverComments(editId)
      .then((rows) => {
        if (!cancelled) {
          setAuditLogs(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuditLogs([]);
        }
      });

    return () => {
      cancelled = true;
      hydrate.abort();
    };
    // Do not depend on `access` or `isViewMode`. Access settling or the email
    // hash applying `mode=edit` was aborting hydrate, so the denial never ran
    // and the Rework form stayed open.
  }, [dispatch, editId, formResetAt, initialized]);

  // Email deep link: once the request is in memory, compare the logged-in user
  // with the ApproversMaster Initiator for this Brand. No extra SharePoint call.
  React.useEffect(() => {
    if (!editId) {
      deniedInitiatorAccessIdRef.current = 0;
      return;
    }
    if (
      !initialized ||
      roleStatus !== "succeeded" ||
      npdForm.loadStatus !== "idle" ||
      npdForm.requestId !== editId ||
      deniedInitiatorAccessIdRef.current === editId
    ) {
      return;
    }
    if (!isDraftOrReworkStatus(npdForm.requestStatus)) {
      return;
    }

    const brand = (npdForm.generalInfo.brand ?? "").trim();
    if (!brand) {
      return;
    }

    const accessNow = selectResolvedAccess(store.getState());
    if (hasRole(accessNow.assignedRoles, Config.Roles.Admin)) {
      return;
    }
    if (isNpdApproversMasterInitiatorForBrand(accessNow, brand)) {
      return;
    }

    deniedInitiatorAccessIdRef.current = editId;
    dispatch(
      setFlashMessage({
        severity: "error",
        detail:
          "You are no longer the Initiator for this request, so you do not have access to this record.",
      }),
    );
    dispatch(resetNpdFormState());
    navigate(getDefaultRoute(accessNow), { replace: true });
  }, [
    dispatch,
    editId,
    initialized,
    navigate,
    npdForm.generalInfo.brand,
    npdForm.loadStatus,
    npdForm.requestId,
    npdForm.requestStatus,
    roleStatus,
    stillBrandInitiator,
  ]);

  React.useEffect(() => {
    if (
      !initialized ||
      !npdForm.generalInfo.materialType ||
      !hasPlantSourceMaterialType
    ) {
      return;
    }
    void dispatch(fetchNpdPlantSourceOptions(npdForm.generalInfo.materialType));
  }, [
    dispatch,
    hasPlantSourceMaterialType,
    initialized,
    npdForm.generalInfo.materialType,
  ]);

  React.useEffect(() => {
    if (npdForm.error) {
      showErrorToast(toastRef, npdForm.error);
      dispatch(clearNpdFormError());
    }
  }, [dispatch, npdForm.error, toastRef]);

  // Offline Submit: Draft id may bind after the catch runs — navigate then.
  React.useEffect(() => {
    if (!pendingOfflineDraftNavigationRef.current) {
      return;
    }
    const draftId = npdForm.requestId;
    if (!(typeof draftId === "number" && draftId > 0)) {
      return;
    }
    pendingOfflineDraftNavigationRef.current = false;
    finishUiProcessing(dispatch, false);
    dispatch(resetNpdFormState());
    navigate(buildNavHref(Config.Routes.NpdDraftRework, viewAs), {
      replace: true,
    });
  }, [dispatch, navigate, npdForm.requestId, viewAs]);

  const leaveFormForProcessing = React.useCallback(
    (
      totalUnits: number,
      options?: { showItemProgress?: boolean },
    ): void => {
      // Keep the user on the form until the action outcome is known.
      // Success → list page; failure → remain on form for retry.
      beginUiProcessing(dispatch, totalUnits, {
        showItemProgress: Boolean(options?.showItemProgress),
      });
    },
    [dispatch],
  );

  const completeFormNavigation = React.useCallback(
    (route: string, state: Record<string, boolean>): void => {
      finishUiProcessing(dispatch, true);
      dispatch(resetNpdFormState());
      navigate(buildNavHref(route, viewAs), { replace: true, state });
    },
    [dispatch, navigate, viewAs],
  );

  const dispatchWorkflowAction = React.useCallback(
    (
      action: NpdWorkflowAction,
      comments: string,
      options?: {
        persistItems?: boolean;
        items?: ReturnType<typeof toPersistableItemRecords>;
        itemSavePartial?: boolean;
        deletedItemIds?: number[];
        materialMasterCheckItems?: ReturnType<typeof toPersistableItemRecords>;
      },
    ): void => {
      if (!pendingRole) {
        showErrorToast(
          toastRef,
          "You do not have a pending approval action on this request.",
        );
        return;
      }

      const persistItems = options?.persistItems !== false;
      const items = persistItems
        ? options?.items ?? toPersistableItemRecords(itemRows)
        : undefined;
      const includeOtherDetails = lockedFooterMode === "mis-pending";
      const actorRole = pendingRole;
      const isMisPostToSap = action === "Approve" && includeOtherDetails;

      // Post to SAP: drop the loader as soon as the browser is offline and stay
      // on this form. The SAP loop will not start another line after that.
      let releaseOfflineWatch = (): void => undefined;
      if (isMisPostToSap) {
        let stopped = false;
        const stopLoader = (): void => {
          if (stopped) {
            return;
          }
          stopped = true;
          finishUiProcessing(dispatch, false);
          dispatch(clearNpdFormBusyState());
        };
        const onOffline = (): void => {
          stopLoader();
        };
        window.addEventListener("offline", onOffline);
        let topWindow: Window | null = null;
        try {
          if (window.top && window.top !== window) {
            topWindow = window.top;
            topWindow.addEventListener("offline", onOffline);
          }
        } catch {
          topWindow = null;
        }
        const pollId = window.setInterval(() => {
          if (!isBrowserOnline()) {
            stopLoader();
          }
        }, 200);
        releaseOfflineWatch = (): void => {
          window.clearInterval(pollId);
          window.removeEventListener("offline", onOffline);
          if (topWindow) {
            topWindow.removeEventListener("offline", onOffline);
          }
        };
      }

      // Approver / MIS actions: Processing only — no item progress bar.
      void dispatch(
        applyNpdWorkflowAction({
          action,
          comments,
          actorRole,
          items,
          includeOtherDetails,
          actionVia: "System",
          itemSavePartial: options?.itemSavePartial,
          deletedItemIds: options?.deletedItemIds,
          materialMasterCheckItems: options?.materialMasterCheckItems,
        }),
      )
        .unwrap()
        .then((saved) => {
          releaseOfflineWatch();
          tabLock.notifySubmitted(saved.Id, saved.Title);
          dispatch(
            setFlashMessage({
              severity: "success",
              detail: "Request updated successfully.",
            }),
          );
          dispatch(resetNpdFormState());
          navigate(buildNavHref(Config.Routes.NpdAll, viewAs), {
            replace: true,
          });
        })
        .catch((error: unknown) => {
          releaseOfflineWatch();
          finishUiProcessing(dispatch, false);
          dispatch(
            setFlashMessage({
              severity: "error",
              detail: toUserActionErrorMessage(
                error,
                "Failed to update the request. Please try again.",
              ),
            }),
          );
        });
    },
    [
      dispatch,
      itemRows,
      lockedFooterMode,
      navigate,
      pendingRole,
      tabLock,
      toastRef,
      viewAs,
    ],
  );

  useNpdEmailAction({
    editId,
    emailAction,
    footerMode,
    requestId: npdForm.requestId,
    loadStatus: npdForm.loadStatus,
    saveStatus: npdForm.saveStatus,
    recordReady,
    onApply: (action, comments) =>
      dispatchWorkflowAction(action, comments, { persistItems: false }),
  });

  const handleSaveDraft = (): void => {
    if (isTabLocked || tabLock.consumeIfRestricted()) {
      return;
    }
    try {
      assertBrowserOnline();
    } catch (error: unknown) {
      showErrorToast(toastRef, toUserActionErrorMessage(error));
      return;
    }
    const firstMessage = firstValidationMessage(
      validateNpdDraftForm(npdForm.generalInfo, itemRows),
    );
    if (firstMessage) {
      showErrorToast(toastRef, firstMessage, "Validation");
      return;
    }

    const existingRequestId = editId || npdForm.requestId || 0;
    const isExistingRequest = existingRequestId > 0;
    const diff = isExistingRequest
      ? diffNpdItemDetailRows(itemRows, itemBaselineRef.current)
      : null;
    const backupItems = toPersistableItemRecords(itemRows);
    // Rows shown from the JSON backup have no SharePoint id yet. Save Draft
    // must not insert them; Resubmit is the only action that does.
    const recoveryKeys = new Set(
      itemBaselineRef.current
        .filter((row) => !(row.sharePointId > 0) && !isEmptyItemDetailRow(row))
        .map((row) => buildNpdItemDetailsMatchKey(toNpdItemDetailRecord(row)))
        .filter(Boolean),
    );
    const items = isExistingRequest
      ? diff!.changedRecords.filter((record) => {
          if (record.sharePointId > 0) {
            return true;
          }
          const key = buildNpdItemDetailsMatchKey(record);
          return !key || !recoveryKeys.has(key);
        })
      : backupItems;
    const persistableCount = isExistingRequest
      ? Math.max(items.length + (diff?.deletedSharePointIds.length || 0), 1)
      : itemRows.reduce(
          (count, row) => (isEmptyItemDetailRow(row) ? count : count + 1),
          0,
        );

    flushSync(() => {
      leaveFormForProcessing(Math.max(persistableCount, 1), {
        showItemProgress: !isExistingRequest,
      });
    });

    void dispatch(
      saveNpdDraft({
        items,
        backupItems,
        ...(isExistingRequest
          ? {
              partial: true,
              deletedSharePointIds: diff?.deletedSharePointIds,
            }
          : {}),
      }),
    )
      .unwrap()
      .then((saved) => {
        tabLock.notifyDraftSaved(saved.Id, saved.Title);
        dispatch(
          setFlashMessage({
            severity: "success",
            detail: "Draft saved successfully.",
          }),
        );
        completeFormNavigation(Config.Routes.NpdAll, {});
      })
      .catch((error: unknown) => {
        finishUiProcessing(dispatch, false);
        dispatch(
          setFlashMessage({
            severity: "error",
            detail: toUserActionErrorMessage(
              error,
              "Failed to save draft. Please try again.",
            ),
          }),
        );

        // Offline mid-save after Draft header retained: leave form → Draft list.
        const retainedDraftId = store.getState().npdForm.requestId;
        if (
          isNetworkError(error) &&
          typeof retainedDraftId === "number" &&
          retainedDraftId > 0
        ) {
          dispatch(resetNpdFormState());
          navigate(buildNavHref(Config.Routes.NpdDraftRework, viewAs), {
            replace: true,
          });
        }
      });
  };

  const handleSubmit = (): void => {
    if (isTabLocked || tabLock.consumeIfRestricted()) {
      return;
    }
    try {
      assertBrowserOnline();
    } catch (error: unknown) {
      showErrorToast(toastRef, toUserActionErrorMessage(error));
      return;
    }
    const firstMessage = firstValidationMessage(
      validateNpdRequestForm(npdForm.generalInfo, itemRows),
    );
    if (firstMessage) {
      showErrorToast(toastRef, firstMessage, "Validation");
      return;
    }

    // Validation already required every grid row (do not drop blank lines —
    // those must fail validation above). First Submit persists all rows.
    // Resubmit after Rework: only newly added rows (no SharePoint Id yet).
    const allItems = itemRows.map(toNpdItemDetailRecord);
    const comments = approverRemarks;
    const isResubmit = isNpdRequestIdTitle(npdForm.requestTitle || "");
    // Persist only new lines on resubmit; JSON backup always keeps the full grid.
    const items = isResubmit
      ? allItems.filter((item) => !(item.sharePointId > 0))
      : allItems;
    const backupItems = allItems;
    const totalUnits = Math.max(items.length, 1);

    resetNpdSubmitOfflineLatch();
    let leftForOfflineDraft = false;
    let stopOfflineWatch = (): void => undefined;
    const leaveForOfflineDraft = (): void => {
      if (leftForOfflineDraft) {
        return;
      }
      leftForOfflineDraft = true;
      stopOfflineWatch();
      cancelInFlightNpdSubmit();
      pendingOfflineDraftNavigationRef.current = false;
      finishUiProcessing(dispatch, false);
      dispatch(clearNpdFormBusyState());
      dispatch(
        setFlashMessage({
          severity: "error",
          detail: NETWORK_OFFLINE_MESSAGE,
        }),
      );
      dispatch(resetNpdFormState());
      navigate(buildNavHref(Config.Routes.NpdDraftRework, viewAs), {
        replace: true,
      });
    };
    const onBrowserOffline = (): void => {
      leaveForOfflineDraft();
    };
    window.addEventListener("offline", onBrowserOffline);
    let topWindow: Window | null = null;
    try {
      if (window.top && window.top !== window) {
        topWindow = window.top;
        topWindow.addEventListener("offline", onBrowserOffline);
      }
    } catch {
      topWindow = null;
    }
    const offlinePollId = window.setInterval(() => {
      if (!isBrowserOnline()) {
        leaveForOfflineDraft();
      }
    }, 200);
    stopOfflineWatch = (): void => {
      window.clearInterval(offlinePollId);
      window.removeEventListener("offline", onBrowserOffline);
      if (topWindow) {
        topWindow.removeEventListener("offline", onBrowserOffline);
      }
    };

    void (async () => {
      // First Submit: every Item Detail. Resubmit: only new/updated lines.
      // Unchanged lines were already checked and are not scanned again.
      const materialMasterItems = isResubmit
        ? diffNpdItemDetailRows(itemRows, itemBaselineRef.current)
            .changedRecords
        : items;
      if (materialMasterItems.length) {
        if (!isResubmit) {
          beginUiProcessing(dispatch, totalUnits);
        }
        try {
          const materialMasterDuplicates =
            await validateItemsAgainstMaterialMaster(materialMasterItems, {
              excludeRequestId:
                isResubmit && npdForm.requestId
                  ? npdForm.requestId
                  : undefined,
            });
          const materialMasterMessage = firstValidationMessage(
            materialMasterDuplicates,
          );
          if (materialMasterMessage) {
            if (!leftForOfflineDraft) {
              stopOfflineWatch();
              if (!isResubmit) {
                finishUiProcessing(dispatch, false);
              }
              showErrorToast(toastRef, materialMasterMessage, "Validation");
            }
            return;
          }
        } catch (error: unknown) {
          if (leftForOfflineDraft) {
            return;
          }
          stopOfflineWatch();
          if (!isResubmit) {
            finishUiProcessing(dispatch, false);
          }
          showErrorToast(
            toastRef,
            toUserActionErrorMessage(
              error,
              "Unable to validate Item Details against Material Master. Please try again.",
            ),
            "Validation",
          );
          return;
        }
      }

      if (leftForOfflineDraft) {
        return;
      }

      flushSync(() => {
        // Resubmit: progress only for newly added rows (none → Processing only).
        leaveFormForProcessing(totalUnits, {
          showItemProgress: !isResubmit || items.length > 0,
        });
      });

      if (!isBrowserOnline()) {
        leaveForOfflineDraft();
        return;
      }

      void dispatch(submitNpdRequest({ items, backupItems, comments }))
        .unwrap()
        .then((saved) => {
          if (leftForOfflineDraft) {
            return;
          }
          stopOfflineWatch();
          tabLock.notifySubmitted(saved.Id, saved.Title);
          dispatch(
            setFlashMessage({
              severity: "success",
              detail: "Request submitted successfully.",
            }),
          );
          completeFormNavigation(Config.Routes.NpdAll, {});
        })
        .catch((error: unknown) => {
          if (leftForOfflineDraft) {
            return;
          }
          stopOfflineWatch();
          finishUiProcessing(dispatch, false);
          const retainedDraftId = store.getState().npdForm.requestId;
          const networkFailure =
            isNetworkError(error) || !isBrowserOnline();

          if (networkFailure) {
            leaveForOfflineDraft();
            return;
          }

          dispatch(
            setFlashMessage({
              severity: "error",
              detail: toUserActionErrorMessage(
                error,
                "Failed to submit request. Please try again.",
              ),
            }),
          );

          pendingOfflineDraftNavigationRef.current = false;
          if (typeof retainedDraftId === "number" && retainedDraftId > 0) {
            return;
          }
        })
        .finally(() => {
          stopOfflineWatch();
        });
    })();
  };

  const requestAction = (action: NpdWorkflowAction): void => {
    if (isTabLocked || tabLock.consumeIfRestricted()) {
      return;
    }

    try {
      assertBrowserOnline();
    } catch (error: unknown) {
      showErrorToast(toastRef, toUserActionErrorMessage(error));
      return;
    }

    const remarks = approverRemarks.trim();
    if (workflowActionRequiresComments(action) && !remarks) {
      const actionText =
        action === "Rework"
          ? "sending back for rework"
          : action === "Reject"
            ? "rejecting"
            : "approving";
      showActionValidationToast(
        toastRef,
        action,
        `Please enter approver remarks before ${actionText}.`,
        "Validation",
      );
      return;
    }

    // Vertical Head: status/workflow only — never re-save Item Details.
    if (lockedFooterMode === "vertical-head-pending") {
      dispatchWorkflowAction(action, remarks, { persistItems: false });
      return;
    }

    if (lockedFooterMode === "mis-pending") {
      // MIS Reject: Profit Center + status only.
      if (action === "Reject") {
        const firstMessage = firstValidationMessage(
          validateMisCoordinatorReject(npdForm.otherDetails.profitCenter),
        );
        if (firstMessage) {
          showErrorToast(toastRef, firstMessage, "Validation");
          return;
        }
        dispatchWorkflowAction(action, remarks, { persistItems: false });
        return;
      }

      // MIS Rework: only added/updated Item Details (+ deletes).
      if (action === "Rework") {
        const diff = diffNpdItemDetailRows(itemRows, itemBaselineRef.current);
        const baselineBySpId = new Map(
          itemBaselineRef.current
            .filter((row) => row.sharePointId > 0)
            .map((row) => [row.sharePointId, fingerprintNpdItemDetailRow(row)]),
        );
        const changedRows = itemRows.filter((row) => {
          if (isEmptyItemDetailRow(row)) {
            return false;
          }
          if (row.sharePointId > 0) {
            const prior = baselineBySpId.get(row.sharePointId);
            return (
              prior === undefined ||
              prior !== fingerprintNpdItemDetailRow(row)
            );
          }
          return true;
        });
        const firstMessage = firstValidationMessage(
          validateMisCoordinatorRework(
            npdForm.generalInfo.brand,
            changedRows,
            npdForm.otherDetails.profitCenter,
          ),
        );
        if (firstMessage) {
          showErrorToast(toastRef, firstMessage, "Validation");
          return;
        }
        dispatchWorkflowAction(action, remarks, {
          persistItems: true,
          items: diff.changedRecords,
          itemSavePartial: true,
          deletedItemIds: diff.deletedSharePointIds,
        });
        return;
      }

      // MIS Post to SAP: form validation for all rows; MM duplicate check only
      // for newly added / updated Item Details (not unchanged lines).
      if (action === "Approve") {
        const firstMessage = firstValidationMessage(
          validateMisCoordinatorAction(
            npdForm.generalInfo.brand,
            itemRows,
            npdForm.otherDetails.profitCenter,
          ),
        );
        if (firstMessage) {
          showErrorToast(toastRef, firstMessage, "Validation");
          return;
        }
        const mmDiff = diffNpdItemDetailRows(
          itemRows,
          itemBaselineRef.current,
        );
        dispatchWorkflowAction(action, remarks, {
          persistItems: true,
          items: toPersistableItemRecords(itemRows),
          materialMasterCheckItems: mmDiff.changedRecords,
        });
        return;
      }
    } else if (action === "Approve" && !itemDetailsReadOnly) {
      const firstMessage = firstValidationMessage(
        validateNpdItemDetailsRows(npdForm.generalInfo.brand, itemRows),
      );
      if (firstMessage) {
        showErrorToast(toastRef, firstMessage, "Validation");
        return;
      }
    }

    dispatchWorkflowAction(action, remarks, { persistItems: true });
  };

  return {
    editId,
    itemRows,
    setItemRows,
    npdForm,
    importVisible,
    setImportVisible,
    approverRemarks,
    setApproverRemarks,
    auditLogs,
    showApproverRemarks,
    showAuditLog,
    isRecordLoading:
      npdForm.loadStatus === "loading" || (Boolean(editId) && !recordReady),
    footerMode: lockedFooterMode,
    formTitle: !editId
      ? "New NPD Request"
      : isViewMode ||
          isTabLocked ||
          (npdForm.requestStatus || "").trim().toLowerCase() === "completed" ||
          (npdForm.requestStatus || "").trim().toLowerCase() === "approved"
        ? "View NPD Request"
        : "View NPD Request",
    generalInfoReadOnly: lockedFooterMode !== "initiator-edit",
    itemDetailsReadOnly: isTabLocked || itemDetailsReadOnly,
    isMisCoordinatorActing: lockedFooterMode === "mis-pending",
    showOtherDetails,
    otherDetailsReadOnly,
    tabRestriction: tabLock.restriction,
    handleCancel: () =>
      navigate(
        resolveNpdFormCancelRoute(
          searchParams.get(Config.NpdFormQuery.From),
          viewAs,
        ),
      ),
    handleTabLockDashboard: () =>
      navigate(buildNavHref(Config.Routes.NpdAll, viewAs)),
    handleTabLockReload: () => {
      window.location.reload();
    },
    handleSaveDraft,
    handleSubmit,
    requestAction,
  };
}
