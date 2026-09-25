import * as React from "react";
import { flushSync } from "react-dom";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Toast as PrimeToast } from "primereact/toast";
import { ApproverSystems, Config } from "../../../../../External/CommonServices/Config";
import type {
  INpdApproverCommentRow,
  NpdWorkflowAction,
} from "../../../../../External/CommonServices/Interface";
import { fetchNpdApproverComments } from "../../../../../External/CommonServices/npdApproverCommentsService";
import {
  canActOnPendingNpdStep,
  hasSystemRole,
} from "../../../../../External/CommonServices/permissionService";
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
  showActionValidationToast,
  showErrorToast,
  showWarningToast,
} from "../../common/controls";
import {
  createEmptyNpdItemDetailRow,
  isEmptyItemDetailRow,
  toNpdItemDetailRow,
} from "./npdItemDetailsConfig";
import type { INpdItemDetailRow } from "./npdItemDetails.types";
import {
  validateNpdGeneralInfo,
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
  toPersistableItemRecords,
  workflowActionRequiresComments,
} from "./npdRequestFormHelpers";
import type { INpdSubmitProgress } from "./npdRequestFormHelpers";
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
  const [successMessage, setSuccessMessage] = React.useState("");
  const [submitProgress, setSubmitProgress] =
    React.useState<INpdSubmitProgress | null>(null);
  const submitProgressTimerRef = React.useRef<number>(0);

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

  const pendingApproverRole = getFirstPendingApproverRole(npdForm.workflowSteps);
  const isPendingWithVh =
    isVerticalHeadWorkflowRole(pendingApproverRole) ||
    lockedFooterMode === "vertical-head-pending";

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

  // Dynamic Other Details visibility:
  // Before Approved / Post to SAP: Only MIS Coordinator can see Other Details.
  // After Approved / Post to SAP: Initiator, Vertical Head, and MIS Coordinator can all see Other Details.
  const showOtherDetails =
    Boolean(editId || npdForm.requestId) &&
    (isRequestApproved ||
      (isMisCoordinator && !isPendingWithVh && hasReachedMis));
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
    if (!initialized || roleStatus === "loading" || (!userEmail && !userLoginName)) {
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
    if (!initialized || !npdForm.generalInfo.materialType || !hasPlantSourceMaterialType) {
      return;
    }
    void dispatch(fetchNpdPlantSourceOptions(npdForm.generalInfo.materialType));
  }, [dispatch, hasPlantSourceMaterialType, initialized, npdForm.generalInfo.materialType]);

  React.useEffect(() => {
    if (npdForm.error) {
      showErrorToast(toastRef, npdForm.error);
      dispatch(clearNpdFormError());
    }
  }, [dispatch, npdForm.error, toastRef]);

  const stopSubmitProgress = React.useCallback((): void => {
    if (submitProgressTimerRef.current) {
      window.clearInterval(submitProgressTimerRef.current);
      submitProgressTimerRef.current = 0;
    }
  }, []);

  React.useEffect(() => () => stopSubmitProgress(), [stopSubmitProgress]);

  const startSubmitProgress = React.useCallback(
    (total: number): void => {
      stopSubmitProgress();
      const safeTotal = Math.max(total, 1);
      setSubmitProgress({ current: 1, total: safeTotal, percent: 3 });
      const startedAt = Date.now();
      const durationMs = Math.min(10000, Math.max(4000, 2500 + safeTotal * 25));
      submitProgressTimerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const ratio = Math.min(0.9, elapsed / durationMs);
        const eased = 1 - (1 - ratio) * (1 - ratio);
        const percent = Math.max(3, Math.round(eased * 90));
        const rawCurrent = Math.max(1, Math.round(eased * safeTotal));
        const holdAt = Math.max(1, safeTotal - 5);
        const current = Math.min(holdAt, rawCurrent);
        setSubmitProgress({ current, total: safeTotal, percent });
      }, 80);
    },
    [stopSubmitProgress],
  );

  const finishWithSuccess = React.useCallback(
    (
      route: string,
      state?: Record<string, boolean>,
      options?: { keepSubmitProgress?: boolean; successMessage?: string },
    ): void => {
      const keepSubmitProgress = Boolean(options?.keepSubmitProgress);
      stopSubmitProgress();
      if (keepSubmitProgress) {
        setSubmitProgress((current) =>
          current
            ? { current: current.total, total: current.total, percent: 100 }
            : current,
        );
      } else if (options?.successMessage) {
        setSuccessMessage(options.successMessage);
      }
      window.setTimeout(() => {
        dispatch(resetNpdFormState());
        setItemRows([createEmptyNpdItemDetailRow()]);
        setApproverRemarks("");
        setAuditLogs([]);
        setSuccessMessage("");
        setSubmitProgress(null);
        navigate(route, { state });
      }, keepSubmitProgress || options?.successMessage ? 750 : 200);
    },
    [dispatch, navigate, stopSubmitProgress],
  );

  const dispatchWorkflowAction = React.useCallback(
    (action: NpdWorkflowAction, comments: string, persistItems = true): void => {
      if (!pendingRole) {
        showErrorToast(
          toastRef,
          "You do not have a pending approval action on this request.",
        );
        return;
      }

      void dispatch(
        applyNpdWorkflowAction({
          action,
          comments,
          actorRole: pendingRole,
          items: persistItems
            ? toPersistableItemRecords(itemRows)
            : undefined,
          includeOtherDetails: lockedFooterMode === "mis-pending",
          actionVia: "System",
        }),
      )
        .unwrap()
        .then((saved) => {
          tabLock.notifySubmitted(saved.Id, saved.Title);
          // No "Item added successfully" overlay — that message is Item Details only.
          finishWithSuccess(Config.Routes.NpdPending, { actionSaved: true });
        })
        .catch(() => undefined);
    },
    [
      dispatch,
      finishWithSuccess,
      itemRows,
      lockedFooterMode,
      pendingRole,
      tabLock,
      toastRef,
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
      validateNpdGeneralInfo(npdForm.generalInfo),
    );
    if (firstMessage) {
      showErrorToast(toastRef, firstMessage, "Validation");
      return;
    }

    const persistableCount = itemRows.reduce(
      (count, row) => (isEmptyItemDetailRow(row) ? count : count + 1),
      0,
    );
    flushSync(() => {
      startSubmitProgress(persistableCount);
    });

    window.setTimeout(() => {
      const items = toPersistableItemRecords(itemRows);
      void dispatch(saveNpdDraft(items))
        .unwrap()
        .then((saved) => {
          tabLock.notifyDraftSaved(saved.Id, saved.Title);
          finishWithSuccess(Config.Routes.NpdDraftRework, { draftSaved: true }, {
            keepSubmitProgress: true,
          });
        })
        .catch(() => {
          stopSubmitProgress();
          setSubmitProgress(null);
        });
    }, 0);
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

    const persistableCount = itemRows.reduce(
      (count, row) => (isEmptyItemDetailRow(row) ? count : count + 1),
      0,
    );
    flushSync(() => {
      startSubmitProgress(persistableCount);
    });

    window.setTimeout(() => {
      const items = toPersistableItemRecords(itemRows);
      void dispatch(submitNpdRequest(items))
        .unwrap()
        .then((saved) => {
          tabLock.notifySubmitted(saved.Id, saved.Title);
          finishWithSuccess(Config.Routes.NpdPending, { requestSubmitted: true }, {
            keepSubmitProgress: true,
          });
        })
        .catch(() => {
          stopSubmitProgress();
          setSubmitProgress(null);
        });
    }, 0);
  };

  const requestAction = (action: NpdWorkflowAction): void => {
    if (isTabLocked || tabLock.consumeIfRestricted()) {
      return;
    }
    if (!itemDetailsReadOnly && action === "Approve") {
      const firstMessage = firstValidationMessage(
        validateNpdRequestForm(npdForm.generalInfo, itemRows),
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

    dispatchWorkflowAction(
      action,
      remarks,
    );
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
    successMessage,
    submitProgress,
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
        : "Edit NPD Request",
    generalInfoReadOnly: lockedFooterMode !== "initiator-edit",
    itemDetailsReadOnly: isTabLocked || itemDetailsReadOnly,
    isMisCoordinatorActing: lockedFooterMode === "mis-pending",
    showOtherDetails,
    otherDetailsReadOnly,
    tabRestriction: tabLock.restriction,
    handleCancel: () =>
      navigate(
        resolveNpdFormCancelRoute(searchParams.get(Config.NpdFormQuery.From)),
      ),
    handleTabLockDashboard: () => navigate(Config.Routes.NpdAll),
    handleTabLockReload: () => {
      window.location.reload();
    },
    handleSaveDraft,
    handleSubmit,
    requestAction,
  };
}
