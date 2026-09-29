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
  hasSystemRole,
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
import { selectResolvedAccess } from "../../../../../store/slices/appSlice";
import {
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
import {
  validateMisCoordinatorAction,
  validateNpdDraftForm,
  validateNpdItemDetailsRows,
  validateNpdRequestForm,
} from "./npdItemDetailsValidation";
import {
  canEditNpdItemDetails,
  firstValidationMessage,
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
  const [recordReady, setRecordReady] = React.useState(!editId);
  const [importVisible, setImportVisible] = React.useState(false);
  const [approverRemarks, setApproverRemarks] = React.useState("");
  const [auditLogs, setAuditLogs] = React.useState<INpdApproverCommentRow[]>(
    [],
  );

  const hasPlantSourceMaterialType = selectHasPlantSourceMaterialType(
    npdForm.generalInfo.materialType,
  );
  const actorEmail = userEmail || userLoginName;
  const pendingRole = resolveActorWorkflowRole(
    npdForm.workflowSteps,
    actorEmail,
    assignedRoles,
  );
  const footerMode = resolveNpdFooterMode({
    requestId: npdForm.requestId,
    requestStatus: npdForm.requestStatus,
    actorEmail,
    workflowSteps: npdForm.workflowSteps,
    canEditDraft: hasSystemRole(
      access,
      Config.Roles.Initiator,
      ApproverSystems.NewProductDevelopment,
    ),
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
    if (!editId) {
      dispatch(resetNpdFormState());
      setItemRows([createEmptyNpdItemDetailRow()]);
      setApproverRemarks("");
      setAuditLogs([]);
      setRecordReady(true);
    } else {
      setRecordReady(false);
    }
  }, [dispatch, editId]);

  React.useEffect(() => {
    // Load Item Details options as soon as the form mounts or navigation occurs.
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

  React.useEffect(() => {
    if (!initialized || !editId) {
      return;
    }

    void dispatch(hydrateNpdRequestForm(editId))
      .unwrap()
      .then((result) => {
        setItemRows(
          result.items.length
            ? result.items.map(toNpdItemDetailRow)
            : [createEmptyNpdItemDetailRow()],
        );
        setRecordReady(true);
      })
      .catch(() => {
        setRecordReady(true);
      });

    void fetchNpdApproverComments(editId)
      .then(setAuditLogs)
      .catch(() => setAuditLogs([]));
  }, [dispatch, editId, initialized]);

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

  const leaveFormForProcessing = React.useCallback(
    (
      route: string,
      totalUnits: number,
      options?: { showItemProgress?: boolean },
    ): void => {
      beginUiProcessing(dispatch, totalUnits, {
        showItemProgress: Boolean(options?.showItemProgress),
      });
      // Leave the form immediately; keep Redux form state until the thunk finishes.
      navigate(buildNavHref(route, viewAs));
    },
    [dispatch, navigate, viewAs],
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
      persistItems = true,
    ): void => {
      if (!pendingRole) {
        showErrorToast(
          toastRef,
          "You do not have a pending approval action on this request.",
        );
        return;
      }

      const items = persistItems
        ? toPersistableItemRecords(itemRows)
        : undefined;
      const includeOtherDetails = lockedFooterMode === "mis-pending";
      const actorRole = pendingRole;

      // Approver / MIS actions: Processing only — no item progress bar.
      void dispatch(
        applyNpdWorkflowAction({
          action,
          comments,
          actorRole,
          items,
          includeOtherDetails,
          actionVia: "System",
        }),
      )
        .unwrap()
        .then((saved) => {
          tabLock.notifySubmitted(saved.Id, saved.Title);
          dispatch(resetNpdFormState());
          navigate(buildNavHref(Config.Routes.NpdPending, viewAs), {
            replace: true,
            state: { actionSaved: true },
          });
        })
        .catch(() => {
          dispatch(
            setFlashMessage({
              severity: "error",
              detail: "Failed to update the request. Please try again.",
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
      dispatchWorkflowAction(action, comments, false),
  });

  const handleSaveDraft = (): void => {
    if (isTabLocked || tabLock.consumeIfRestricted()) {
      return;
    }
    const firstMessage = firstValidationMessage(
      validateNpdDraftForm(npdForm.generalInfo, itemRows),
    );
    if (firstMessage) {
      showErrorToast(toastRef, firstMessage, "Validation");
      return;
    }

    const persistableCount = itemRows.reduce(
      (count, row) => (isEmptyItemDetailRow(row) ? count : count + 1),
      0,
    );
    const items = toPersistableItemRecords(itemRows);

    flushSync(() => {
      leaveFormForProcessing(
        Config.Routes.NpdDraftRework,
        Math.max(persistableCount, 1),
        { showItemProgress: true },
      );
    });

    void dispatch(saveNpdDraft(items))
      .unwrap()
      .then((saved) => {
        tabLock.notifyDraftSaved(saved.Id, saved.Title);
        completeFormNavigation(Config.Routes.NpdDraftRework, {
          draftSaved: true,
        });
      })
      .catch(() => {
        finishUiProcessing(dispatch, false);
        dispatch(
          setFlashMessage({
            severity: "error",
            detail: "Failed to save draft. Please try again.",
          }),
        );
      });
  };

  const handleSubmit = (): void => {
    if (isTabLocked || tabLock.consumeIfRestricted()) {
      return;
    }
    const firstMessage = firstValidationMessage(
      validateNpdRequestForm(npdForm.generalInfo, itemRows),
    );
    if (firstMessage) {
      showErrorToast(toastRef, firstMessage, "Validation");
      return;
    }

    // Validation already required every grid row; persist all of them (do not
    // drop blank lines — those must fail validation above).
    const items = itemRows.map(toNpdItemDetailRecord);
    const comments = approverRemarks;

    flushSync(() => {
      leaveFormForProcessing(
        Config.Routes.NpdPending,
        Math.max(items.length, 1),
        { showItemProgress: true },
      );
    });

    void dispatch(submitNpdRequest({ items, comments }))
      .unwrap()
      .then((saved) => {
        tabLock.notifySubmitted(saved.Id, saved.Title);
        completeFormNavigation(Config.Routes.NpdPending, {
          requestSubmitted: true,
        });
      })
      .catch(() => {
        finishUiProcessing(dispatch, false);
        dispatch(
          setFlashMessage({
            severity: "error",
            detail: "Failed to submit request. Please try again.",
          }),
        );
      });
  };

  const requestAction = (action: NpdWorkflowAction): void => {
    if (isTabLocked || tabLock.consumeIfRestricted()) {
      return;
    }

    // MIS: Post to SAP / Rework / Reject — every Item Details row + Profit Center.
    if (lockedFooterMode === "mis-pending") {
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
    } else if (action === "Approve" && !itemDetailsReadOnly) {
      // Non-MIS editable Item Details (parity with Initiator Submit).
      const firstMessage = firstValidationMessage(
        validateNpdItemDetailsRows(npdForm.generalInfo.brand, itemRows),
      );
      if (firstMessage) {
        showErrorToast(toastRef, firstMessage, "Validation");
        return;
      }
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

    dispatchWorkflowAction(action, remarks);
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
