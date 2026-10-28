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
import { fetchNpdApproverComments } from "../../../../../External/CommonServices/npdApproverCommentsService";
import {
  canActOnPendingNpdStep,
  hasRole,
  hasSystemRole,
  INITIATOR_ACCESS_DENIED_MESSAGE,
  isNpdApproversMasterInitiatorForBrand,
  parseViewAsRole,
} from "../../../../../External/CommonServices/permissionService";
import { buildNavHref } from "../../../../../External/CommonServices/navigationConfig";
import { normalizeEmail } from "../../../../../External/CommonServices/personFieldUtils";
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
  cancelInFlightNpdDraftPersist,
  cancelInFlightNpdSubmit,
  resetNpdDraftPersistLatch,
  resetNpdSubmitOfflineLatch,
} from "../../../../../External/CommonServices/npdRequestGeneralInfoService";
import {
  validateMisCoordinatorAction,
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
    parseViewAsRole(searchParams.get(Config.NpdFormQuery.ViewAs)) || undefined;
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
  /** General Information + Products count at last hydrate (skip unchanged NPD_Request writes). */
  const headerBaselineRef = React.useRef<{
    brand: string;
    materialType: string;
    plantSource: string;
    title: string;
    status: string;
    itemDetailsCount: number;
  } | null>(null);
  const [recordReady, setRecordReady] = React.useState(!editId);
  const [initiatorAccessDenied, setInitiatorAccessDenied] =
    React.useState(false);
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
  const submitInFlightRef = React.useRef(false);
  /** Prevents repeat deny toast/navigation for the same deep-linked request. */
  const deniedInitiatorAccessIdRef = React.useRef(0);
  /** Request Initiator email from hydrate — used only for former-Initiator email gate. */
  const requestInitiatorEmailRef = React.useRef("");

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
    Boolean(npdForm.requestId) && isDraftOrReworkStatus(npdForm.requestStatus);
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
  const lockedFooterMode =
    initiatorAccessDenied || isTabLocked ? "read-only" : footerMode;

  const denyFormerInitiatorAccess = React.useCallback((): void => {
    if (!editId || deniedInitiatorAccessIdRef.current === editId) {
      return;
    }
    deniedInitiatorAccessIdRef.current = editId;
    setInitiatorAccessDenied(true);
    dispatch(
      setFlashMessage({
        severity: "error",
        detail: INITIATOR_ACCESS_DENIED_MESSAGE,
      }),
    );
    showErrorToast(toastRef, INITIATOR_ACCESS_DENIED_MESSAGE);
  }, [dispatch, editId, toastRef]);
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
    // Brands are seeded at login from ApproversMaster — do not re-fetch
    // ApproversMaster + siteUsers on every Form open.
    if (npdForm.brandOptions.length > 0) {
      return;
    }
    // VH / MIS / Consultant never need Initiator brand options for View/Approve.
    if (roleStatus === "succeeded") {
      const needsInitiatorBrandFetch =
        hasRole(assignedRoles, Config.Roles.Initiator) ||
        hasRole(assignedRoles, Config.Roles.Admin);
      if (!needsInitiatorBrandFetch) {
        return;
      }
      // Initiator brands already resolved at login (possibly empty).
      if (hasRole(assignedRoles, Config.Roles.Initiator)) {
        return;
      }
    }
    void dispatch(fetchNpdInitiatorBrandOptions());
  }, [
    assignedRoles,
    dispatch,
    initialized,
    npdForm.brandOptions.length,
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
      headerBaselineRef.current = null;
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
        const hydratedCount =
          typeof result.request.ItemDetailsCount === "number"
            ? Math.max(0, Math.floor(result.request.ItemDetailsCount))
            : result.items.filter(
                (item) =>
                  Boolean(
                    String(item.materialCode ?? "").trim() ||
                      String(item.materialDescription ?? "").trim(),
                  ),
              ).length;
        headerBaselineRef.current = {
          brand: String(result.request.Brand ?? "").trim(),
          materialType: String(result.request.MaterialType ?? "").trim(),
          plantSource: String(result.request.Plant ?? "").trim(),
          title: String(result.request.Title ?? "").trim(),
          status: String(result.request.Status ?? "").trim(),
          itemDetailsCount: hydratedCount,
        };
        setRecordReady(true);

        requestInitiatorEmailRef.current = normalizeEmail(
          result.request.InitiatorEmail || "",
        );
        const appNow = store.getState().app;
        const accessNow = selectResolvedAccess(store.getState());
        const loginEmail = normalizeEmail(
          appNow.userEmail || appNow.userLoginName || "",
        );
        // Only the request Initiator (Rework email recipient) is gated — not VH/MIS.
        if (
          appNow.roleStatus === "succeeded" &&
          isDraftOrReworkStatus(result.request.Status) &&
          loginEmail &&
          requestInitiatorEmailRef.current &&
          loginEmail === requestInitiatorEmailRef.current &&
          !hasRole(accessNow.assignedRoles, Config.Roles.Admin) &&
          !isNpdApproversMasterInitiatorForBrand(
            accessNow,
            result.request.Brand,
          )
        ) {
          denyFormerInitiatorAccess();
        }

        // Remarks are a separate list — load after Request + Item Details so
        // View/Edit opens with only those two SharePoint calls first.
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
      })
      .catch(() => {
        if (!cancelled) {
          setRecordReady(true);
          setAuditLogs([]);
        }
      });

    return () => {
      cancelled = true;
      hydrate.abort();
    };
    // Do not depend on `access` or `isViewMode` — that aborts hydrate.
  }, [denyFormerInitiatorAccess, dispatch, editId, formResetAt, initialized]);

  // Email / edit open: only the request's Initiator is gated (Rework email).
  // VH / MIS / other roles must not see this toast when opening the form.
  React.useEffect(() => {
    if (!editId) {
      deniedInitiatorAccessIdRef.current = 0;
      requestInitiatorEmailRef.current = "";
      setInitiatorAccessDenied(false);
      return;
    }
    if (
      !initialized ||
      roleStatus === "loading" ||
      npdForm.loadStatus === "loading" ||
      npdForm.requestId !== editId ||
      deniedInitiatorAccessIdRef.current === editId
    ) {
      return;
    }
    if (!isDraftOrReworkStatus(npdForm.requestStatus)) {
      return;
    }

    const loginEmail = normalizeEmail(userEmail || userLoginName || "");
    const requestInitiatorEmail = requestInitiatorEmailRef.current;
    if (
      !loginEmail ||
      !requestInitiatorEmail ||
      loginEmail !== requestInitiatorEmail
    ) {
      return;
    }

    const accessNow = selectResolvedAccess(store.getState());
    if (hasRole(accessNow.assignedRoles, Config.Roles.Admin)) {
      return;
    }
    if (
      isNpdApproversMasterInitiatorForBrand(
        accessNow,
        npdForm.generalInfo.brand ?? "",
      )
    ) {
      return;
    }

    denyFormerInitiatorAccess();
  }, [
    denyFormerInitiatorAccess,
    editId,
    initialized,
    npdForm.generalInfo.brand,
    npdForm.loadStatus,
    npdForm.requestId,
    npdForm.requestStatus,
    roleStatus,
    stillBrandInitiator,
    userEmail,
    userLoginName,
  ]);

  const generalInfoEditable = lockedFooterMode === "initiator-edit";

  React.useEffect(() => {
    if (
      !initialized ||
      !npdForm.generalInfo.materialType ||
      !hasPlantSourceMaterialType
    ) {
      return;
    }
    // View / approver edit: Plant is already on NPD_Request — reuse it
    // (General Info dropdown injects the saved value). Only New / Initiator
    // Draft needs the PlantMaster list for the picker.
    if (editId && !generalInfoEditable) {
      return;
    }
    void dispatch(fetchNpdPlantSourceOptions(npdForm.generalInfo.materialType));
  }, [
    dispatch,
    editId,
    generalInfoEditable,
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
      options?: { showItemProgress?: boolean; submitPace?: boolean },
    ): void => {
      // Keep the user on the form until the action outcome is known.
      // Success → list page; failure → remain on form for retry.
      beginUiProcessing(dispatch, totalUnits, {
        showItemProgress: Boolean(options?.showItemProgress),
        submitPace: Boolean(options?.submitPace),
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
        itemDetailsCount?: number;
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
        ? (options?.items ?? toPersistableItemRecords(itemRows))
        : undefined;
      // Other Details are saved only with Post to SAP — not Rework / Reject.
      const includeOtherDetails =
        lockedFooterMode === "mis-pending" && action === "Approve";
      const actorRole = pendingRole;
      const isMisPostToSap = action === "Approve" && includeOtherDetails;

      // Show Processing immediately — especially for VH, where the only SP call
      // is the Status update and any delay before the overlay feels like a hang.
      if (!isMisPostToSap) {
        flushSync(() => {
          beginUiProcessing(dispatch, 1, { showItemProgress: false });
        });
      }

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
          itemDetailsCount: options?.itemDetailsCount,
        }),
      )
        .unwrap()
        .then((saved) => {
          releaseOfflineWatch();
          if (!isMisPostToSap) {
            finishUiProcessing(dispatch, true);
          }
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
    if (initiatorAccessDenied) {
      showErrorToast(toastRef, INITIATOR_ACCESS_DENIED_MESSAGE);
      return;
    }
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
    // Include recovery rows (sharePointId 0 from Attachments backup) so Save
    // Draft inserts missing Item Details after an offline mid-Submit.
    const items = isExistingRequest ? diff!.changedRecords : backupItems;
    // Progress total = current grid size only (not inserts + soft-deletes).
    // After Import/Replace, 4 new rows replacing 4 old must show 1/4, not 1/8.
    const persistableCount = Math.max(backupItems.length, 1);
    const headerBaseline = headerBaselineRef.current;
    const normalizeHeaderPart = (value: string | null | undefined): string =>
      String(value ?? "").trim();
    const headerUnchanged = Boolean(
      isExistingRequest &&
        headerBaseline &&
        normalizeHeaderPart(npdForm.generalInfo.brand) ===
          headerBaseline.brand &&
        normalizeHeaderPart(npdForm.generalInfo.materialType) ===
          headerBaseline.materialType &&
        normalizeHeaderPart(npdForm.generalInfo.plantSource) ===
          headerBaseline.plantSource &&
        normalizeHeaderPart(npdForm.requestTitle) === headerBaseline.title,
    );

    const showItemProgress =
      !isExistingRequest ||
      items.length > 0 ||
      (diff?.deletedSharePointIds.length ?? 0) > 0;
    flushSync(() => {
      leaveFormForProcessing(Math.max(persistableCount, 1), {
        showItemProgress,
        // Same pace as Send Request — do not change Submit timing.
        submitPace: showItemProgress,
      });
    });

    resetNpdDraftPersistLatch();
    const onDraftOffline = (): void => {
      cancelInFlightNpdDraftPersist();
    };
    window.addEventListener("offline", onDraftOffline);
    const draftOfflinePollId = window.setInterval(() => {
      if (!isBrowserOnline()) {
        onDraftOffline();
      }
    }, 200);

    void dispatch(
      saveNpdDraft({
        items,
        backupItems,
        ...(isExistingRequest
          ? {
              partial: true,
              deletedSharePointIds: diff?.deletedSharePointIds,
              headerUnchanged,
              existingItemDetailsCount: headerBaseline?.itemDetailsCount,
            }
          : {}),
      }),
    )
      .unwrap()
      .then((saved) => {
        window.clearInterval(draftOfflinePollId);
        window.removeEventListener("offline", onDraftOffline);
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
        window.clearInterval(draftOfflinePollId);
        window.removeEventListener("offline", onDraftOffline);
        cancelInFlightNpdDraftPersist();
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
    if (submitInFlightRef.current) {
      return;
    }
    if (initiatorAccessDenied) {
      showErrorToast(toastRef, INITIATOR_ACCESS_DENIED_MESSAGE);
      return;
    }
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
    // those must fail validation above). Persist only rows not yet in
    // NPD_ItemDetails. JSON backup always keeps the full grid.
    const allItems = itemRows.map(toNpdItemDetailRecord);
    const comments = approverRemarks;
    const isResubmit = isNpdRequestIdTitle(npdForm.requestTitle || "");
    const existingForSubmit = Boolean(editId || npdForm.requestId);
    const itemDiff = existingForSubmit
      ? diffNpdItemDetailRows(itemRows, itemBaselineRef.current)
      : null;
    const remainingItems = allItems.filter((item) => !(item.sharePointId > 0));
    const changedExisting = itemDiff
      ? itemDiff.changedRecords.filter((record) => record.sharePointId > 0)
      : [];
    const items = [...changedExisting, ...remainingItems];
    const backupItems = allItems;
    const deletedSharePointIds = itemDiff?.deletedSharePointIds ?? [];
    // Full current grid size — not hydrate count + net length delta (that
    // under-counted when Initiator replaced MIS/soft-deleted lines).
    const intendedItemDetailsCount = allItems.filter((item) =>
      Boolean(
        String(item.materialCode ?? "").trim() ||
          String(item.materialDescription ?? "").trim(),
      ),
    ).length;
    const totalUnits = Math.max(remainingItems.length, 1);

    submitInFlightRef.current = true;
    const releaseSubmit = (): void => {
      submitInFlightRef.current = false;
    };

    resetNpdSubmitOfflineLatch();
    let leftForOfflineDraft = false;
    let stopOfflineWatch = (): void => undefined;
    const leaveForOfflineDraft = (): void => {
      if (leftForOfflineDraft) {
        return;
      }
      leftForOfflineDraft = true;
      stopOfflineWatch();
      releaseSubmit();
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
      // const materialMasterItems = isResubmit
      //   ? diffNpdItemDetailRows(itemRows, itemBaselineRef.current)
      //       .changedRecords
      //   : allItems;

      const materialMasterItems = allItems;

      // Processing only while Material Master duplicates are checked.
      // The item progress bar starts when rows are pushed to NPD_ItemDetails.
      flushSync(() => {
        leaveFormForProcessing(totalUnits, { showItemProgress: false });
      });

      if (materialMasterItems.length) {
        try {
          const materialMasterDuplicates =
            await validateItemsAgainstMaterialMaster(materialMasterItems, {
              // Exclude this request's own Material Master rows (Draft/Resubmit).
              excludeRequestId:
                npdForm.requestId && npdForm.requestId > 0
                  ? npdForm.requestId
                  : undefined,
            });
          const materialMasterMessage = firstValidationMessage(
            materialMasterDuplicates,
          );
          if (materialMasterMessage) {
            if (!leftForOfflineDraft) {
              stopOfflineWatch();
              releaseSubmit();
              finishUiProcessing(dispatch, false);
              showErrorToast(toastRef, materialMasterMessage, "Validation");
            }
            return;
          }
        } catch (error: unknown) {
          if (leftForOfflineDraft) {
            return;
          }
          stopOfflineWatch();
          releaseSubmit();
          finishUiProcessing(dispatch, false);
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

      if (!isBrowserOnline()) {
        leaveForOfflineDraft();
        return;
      }

      flushSync(() => {
        leaveFormForProcessing(totalUnits, {
          showItemProgress: remainingItems.length > 0,
          submitPace: true,
        });
      });

      void dispatch(
        submitNpdRequest({
          items,
          backupItems,
          comments,
          intendedItemDetailsCount,
          ...(existingForSubmit ? { deletedSharePointIds } : {}),
        }),
      )
        .unwrap()
        .then((saved) => {
          if (leftForOfflineDraft) {
            return;
          }
          stopOfflineWatch();
          releaseSubmit();
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
          releaseSubmit();
          finishUiProcessing(dispatch, false);
          const retainedDraftId = store.getState().npdForm.requestId;
          const networkFailure = isNetworkError(error) || !isBrowserOnline();

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
    const isMisPostToSap =
      lockedFooterMode === "mis-pending" && action === "Approve";
    const isVhApprove =
      lockedFooterMode === "vertical-head-pending" && action === "Approve";

    // Post to SAP / VH Approve validate comments after Item Details.
    if (
      !isMisPostToSap &&
      !isVhApprove &&
      workflowActionRequiresComments(action) &&
      !remarks
    ) {
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

    // VH-Marketing Manager: Item Details persist only on Approve (one batch).
    // Rework / Reject keep status + comments only — discard grid edits.
    if (lockedFooterMode === "vertical-head-pending") {
      if (action === "Reject" || action === "Rework") {
        dispatchWorkflowAction(action, remarks, { persistItems: false });
        return;
      }
      if (action === "Approve") {
        const firstMessage = firstValidationMessage(
          validateNpdItemDetailsRows(npdForm.generalInfo.brand, itemRows),
        );
        if (firstMessage) {
          showErrorToast(toastRef, firstMessage, "Validation");
          return;
        }
        if (workflowActionRequiresComments(action) && !remarks) {
          showActionValidationToast(
            toastRef,
            action,
            "Please enter approver remarks before approving.",
            "Validation",
          );
          return;
        }
        const itemDiff = diffNpdItemDetailRows(
          itemRows,
          itemBaselineRef.current,
        );
        const hasItemChanges =
          itemDiff.changedRecords.length > 0 ||
          itemDiff.deletedSharePointIds.length > 0;
        const persistableItems = toPersistableItemRecords(itemRows);

        // Same Material Master Material Code check as Initiator Submit Request.
        void (async () => {
          flushSync(() => {
            beginUiProcessing(dispatch, 1, { showItemProgress: false });
          });
          try {
            if (persistableItems.length) {
              const materialMasterDuplicates =
                await validateItemsAgainstMaterialMaster(persistableItems, {
                  excludeRequestId:
                    npdForm.requestId && npdForm.requestId > 0
                      ? npdForm.requestId
                      : undefined,
                });
              const materialMasterMessage = firstValidationMessage(
                materialMasterDuplicates,
              );
              if (materialMasterMessage) {
                finishUiProcessing(dispatch, false);
                showErrorToast(toastRef, materialMasterMessage, "Validation");
                return;
              }
            }
          } catch (error: unknown) {
            finishUiProcessing(dispatch, false);
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

          dispatchWorkflowAction(action, remarks, {
            persistItems: hasItemChanges,
            items: hasItemChanges ? itemDiff.changedRecords : undefined,
            itemSavePartial: hasItemChanges,
            deletedItemIds: hasItemChanges
              ? itemDiff.deletedSharePointIds
              : undefined,
            // Fold Products count into the Status PATCH (no separate sync call).
            itemDetailsCount: hasItemChanges
              ? persistableItems.length
              : undefined,
          });
        })();
        return;
      }
    }

    if (lockedFooterMode === "mis-pending") {
      // MIS Reject / Rework: comments + status only. Item Details edits,
      // deletes, and adds are discarded until Post to SAP.
      if (action === "Reject" || action === "Rework") {
        dispatchWorkflowAction(action, remarks, { persistItems: false });
        return;
      }

      // MIS Post to SAP: Item Details → Profit Center → Comments, then save.
      // MM duplicate check only for newly added / updated Item Details.
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
        if (workflowActionRequiresComments(action) && !remarks) {
          showActionValidationToast(
            toastRef,
            action,
            "Please enter approver remarks before approving.",
            "Validation",
          );
          return;
        }
        const mmDiff = diffNpdItemDetailRows(itemRows, itemBaselineRef.current);
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
    // Initiator: Export only on Edit/View of an existing request (not New).
    // VH / MIS keep Export whenever Item Details actions are available.
    showItemDetailsExport:
      lockedFooterMode !== "initiator-edit" ||
      Boolean(editId || npdForm.requestId),
    // Marks newly added Item Details rows (yellow) for VH or MIS pending edit.
    isMisCoordinatorActing:
      lockedFooterMode === "mis-pending" ||
      lockedFooterMode === "vertical-head-pending",
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
