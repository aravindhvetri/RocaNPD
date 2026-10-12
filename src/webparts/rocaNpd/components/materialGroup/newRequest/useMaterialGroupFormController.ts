import * as React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Toast as PrimeToast } from "primereact/toast";
import { ApproverSystems, Config } from "../../../../../External/CommonServices/Config";
import { buildNavHref } from "../../../../../External/CommonServices/navigationConfig";
import {
  hasRole,
  INITIATOR_ACCESS_DENIED_MESSAGE,
  isApproversMasterInitiatorForBrand,
} from "../../../../../External/CommonServices/permissionService";
import { normalizeEmail } from "../../../../../External/CommonServices/personFieldUtils";
import { selectResolvedAccess } from "../../../../../store/slices/appSlice";
import {
  assertBrowserOnline,
  toUserActionErrorMessage,
} from "../../../../../External/CommonServices/networkConnectivity";
import { assertMaterialGroupCodesUniqueInLookupTypes } from "../../../../../External/CommonServices/materialGroupService";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import {
  addRow,
  clearAllConfigs,
  clearMaterialGroupError,
  removeRow,
  resetMaterialGroupForm,
  selectAllConfigs,
  toggleConfigId,
  updateRowField,
} from "../../../../../store/slices/materialGroupSlice";
import { setFlashMessage } from "../../../../../store/slices/uiSlice";
import {
  consultantActionMaterialGroupThunk,
  fetchMaterialGroupConfigsThunk,
  fetchMaterialGroupRequestByIdThunk,
  saveMaterialGroupDraftThunk,
  submitMaterialGroupRequestThunk,
} from "../../../../../store/thunks/materialGroupThunks";
import {
  showActionValidationToast,
  showErrorToast,
  showWarningToast,
} from "../../common/controls";
import type {
  MaterialGroupConsultantActionType,
  MaterialGroupFormMode,
} from "./materialGroupTypes";

/** Approver role used for dynamic remarks label (NPD-style). */
function resolveActiveApproverRole(assignedRoles: string[]): string {
  const rolePriority = [
    Config.Roles.Consultant,
    Config.Roles.VerticalHead,
    Config.Roles.MisCoordinator,
  ];

  for (const role of rolePriority) {
    const matched = assignedRoles.some(
      (r) => r.trim().toLowerCase() === role.toLowerCase(),
    );
    if (matched) {
      return role;
    }
  }

  return Config.Roles.Consultant;
}

export function getApproverRemarksLabel(assignedRoles: string[]): string {
  const role = resolveActiveApproverRole(assignedRoles);
  if (role === Config.Roles.Consultant) {
    return "Consultant Remarks / SAP Configuration Note";
  }
  return `${role} Remarks`;
}

export function useMaterialGroupFormController(
  toastRef: React.RefObject<PrimeToast>,
) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const mgState = useAppSelector((state) => state.materialGroup);
  const appState = useAppSelector((state) => state.app);
  const access = useAppSelector(selectResolvedAccess);

  const urlId = searchParams.get("id") || searchParams.get("guid");
  const urlMode = searchParams.get("mode") as MaterialGroupFormMode | null;

  const isConsultant = appState.assignedRoles.some(
    (r) => r.trim().toLowerCase() === Config.Roles.Consultant.toLowerCase(),
  );

  const isApprover = appState.assignedRoles.some((r) => {
    const role = r.trim().toLowerCase();
    return (
      role === Config.Roles.Consultant.toLowerCase() ||
      role === Config.Roles.VerticalHead.toLowerCase() ||
      role === Config.Roles.MisCoordinator.toLowerCase()
    );
  });

  const isRework =
    (mgState.currentStatus || "").trim().toLowerCase() === "rework" ||
    (mgState.currentStatus || "").trim().toLowerCase() === "in rework";
  const isDraftOrRework =
    isRework ||
    (mgState.currentStatus || "").trim().toLowerCase() ===
      Config.MaterialGroupStatus.Draft.toLowerCase();
  const [initiatorAccessDenied, setInitiatorAccessDenied] =
    React.useState(false);
  const deniedInitiatorAccessIdRef = React.useRef("");

  // Compute active mode
  const mode: MaterialGroupFormMode = React.useMemo(() => {
    if (initiatorAccessDenied) {
      return "view";
    }
    if (urlMode === "view") {
      return "view";
    }
    const status = (mgState.currentStatus || "").trim().toLowerCase();
    // When request is Completed, any approver who opens it sees it in view mode
    if (status === Config.MaterialGroupStatus.Completed.toLowerCase()) {
      return "view";
    }
    if (urlId) {
      if (
        isConsultant &&
        status === Config.MaterialGroupStatus.Pending.toLowerCase()
      ) {
        return "consultant-edit";
      }
      return urlMode || "edit";
    }
    return "create";
  }, [initiatorAccessDenied, urlMode, urlId, isConsultant, mgState.currentStatus]);

  const approverRemarksLabel = React.useMemo(
    () => getApproverRemarksLabel(appState.assignedRoles),
    [appState.assignedRoles],
  );

  const showApproverRemarks =
    mode === "consultant-edit" && isApprover;

  const [approverRemarks, setApproverRemarks] = React.useState("");
  /** Blocks double-clicks before Redux pending (e.g. during uniqueness check). */
  const actionInFlightRef = React.useRef(false);
  const [localActionBusy, setLocalActionBusy] = React.useState<
    "idle" | "saving" | "submitting" | "consultant"
  >("idle");

  const tryBeginActionBusy = React.useCallback(
    (kind: "saving" | "submitting" | "consultant"): boolean => {
      if (actionInFlightRef.current) {
        return false;
      }
      actionInFlightRef.current = true;
      setLocalActionBusy(kind);
      return true;
    },
    [],
  );

  const endActionBusy = React.useCallback(() => {
    actionInFlightRef.current = false;
    setLocalActionBusy("idle");
  }, []);

  // Create = blank form. Opening New after View must not keep the prior request.
  const formResetAt = (location.state as { formResetAt?: number } | null)
    ?.formResetAt;

  React.useEffect(() => {
    setApproverRemarks("");
  }, [formResetAt, urlId]);

  // Load configs on mount or navigation
  React.useEffect(() => {
    void dispatch(fetchMaterialGroupConfigsThunk());
  }, [dispatch, location.key, location.pathname]);

  React.useEffect(() => {
    if (urlId) {
      const load = dispatch(fetchMaterialGroupRequestByIdThunk(urlId));
      return () => {
        load.abort();
      };
    }

    dispatch(resetMaterialGroupForm());
    return undefined;
  }, [dispatch, formResetAt, urlId]);

  React.useEffect(() => {
    if (!urlId) {
      deniedInitiatorAccessIdRef.current = "";
      setInitiatorAccessDenied(false);
      return;
    }
    if (
      appState.roleStatus === "loading" ||
      mgState.hydrateStatus === "loading" ||
      !isDraftOrRework ||
      deniedInitiatorAccessIdRef.current === urlId
    ) {
      return;
    }
    if (mgState.hydrateStatus !== "succeeded") {
      return;
    }

    // Consultant / Admin / other approvers opening a record must never get this
    // toast. Only the request's Initiator (Rework email / edit link) is checked.
    if (hasRole(access.assignedRoles, Config.Roles.Admin)) {
      return;
    }
    if (isConsultant || urlMode === "view" || urlMode === "consultant-edit") {
      return;
    }

    const loginEmail = normalizeEmail(
      appState.userEmail || appState.userLoginName || "",
    );
    const requestInitiatorEmail = normalizeEmail(
      mgState.initiatorEmail || "",
    );
    if (
      !loginEmail ||
      !requestInitiatorEmail ||
      loginEmail !== requestInitiatorEmail
    ) {
      return;
    }

    const stillAssignedInitiator =
      isApproversMasterInitiatorForBrand(
        access,
        undefined,
        ApproverSystems.NewProductDevelopment,
      ) ||
      isApproversMasterInitiatorForBrand(
        access,
        undefined,
        ApproverSystems.NewMaterialGroup,
      );
    if (stillAssignedInitiator) {
      return;
    }

    deniedInitiatorAccessIdRef.current = urlId;
    setInitiatorAccessDenied(true);
    dispatch(
      setFlashMessage({
        severity: "error",
        detail: INITIATOR_ACCESS_DENIED_MESSAGE,
      }),
    );
    showErrorToast(toastRef, INITIATOR_ACCESS_DENIED_MESSAGE);
  }, [
    appState.assignedRoles,
    appState.roleAssignments,
    appState.roleStatus,
    appState.userEmail,
    appState.userLoginName,
    dispatch,
    isConsultant,
    isDraftOrRework,
    mgState.hydrateStatus,
    mgState.initiatorEmail,
    toastRef,
    urlId,
    urlMode,
  ]);

  // Handle global errors
  React.useEffect(() => {
    if (mgState.error) {
      showErrorToast(toastRef, mgState.error);
      dispatch(clearMaterialGroupError());
    }
  }, [dispatch, mgState.error, toastRef]);

  const handleToggleConfig = React.useCallback(
    (configId: number) => {
      if (mode === "view") {
        return;
      }
      dispatch(toggleConfigId(configId));
    },
    [dispatch, mode],
  );

  const handleSelectAll = React.useCallback(() => {
    if (mode === "view") {
      return;
    }
    dispatch(selectAllConfigs());
  }, [dispatch, mode]);

  const handleClearAll = React.useCallback(() => {
    if (mode === "view") {
      return;
    }
    dispatch(clearAllConfigs());
  }, [dispatch, mode]);

  const handleAddRow = React.useCallback(
    (configId: number) => {
      if (mode === "view") {
        return;
      }
      dispatch(addRow(configId));
    },
    [dispatch, mode],
  );

  const handleRemoveRow = React.useCallback(
    (configId: number, tempId: string) => {
      if (mode === "view") {
        return;
      }
      dispatch(removeRow({ configId, tempId }));
    },
    [dispatch, mode],
  );

  const handleUpdateRow = React.useCallback(
    (
      configId: number,
      tempId: string,
      field: "code" | "description",
      value: string,
    ) => {
      if (mode === "view") {
        return;
      }
      dispatch(updateRowField({ configId, tempId, field, value }));
    },
    [dispatch, mode],
  );

  const handleCancel = React.useCallback(() => {
    dispatch(resetMaterialGroupForm());
    const from = (searchParams.get("from") ?? "").trim().toLowerCase();
    const viewAs = searchParams.get(Config.NpdFormQuery.ViewAs);
    let route = Config.Routes.MgAll;
    if (from === "draft-rework" || from === "draft") {
      route = Config.Routes.MgDraftRework;
    } else if (from === "pending") {
      route = Config.Routes.MgPending;
    } else if (from === "completed") {
      route = Config.Routes.MgCompleted;
    }
    navigate(buildNavHref(route, viewAs));
  }, [dispatch, navigate, searchParams]);

  /** Collect filled codes keyed by Lookup Type (RelatedFields) for uniqueness checks. */
  const collectCodeUniquenessEntries = React.useCallback(() => {
    const entries: Array<{
      lookupTypeId: number;
      lookupTypeTitle: string;
      code: string;
    }> = [];

    for (const configId of mgState.selectedConfigIds) {
      const configItem = mgState.configs.find((c) => c.id === configId);
      const lookupTypeId =
        configItem?.relatedFieldId && configItem.relatedFieldId > 0
          ? configItem.relatedFieldId
          : configId;
      const lookupTypeTitle =
        configItem?.relatedFieldTitle ||
        configItem?.title ||
        `Master (${configId})`;
      const rows = mgState.entriesByConfigId[configId] || [];

      for (const row of rows) {
        const code = row.code.trim();
        if (!code) {
          continue;
        }
        entries.push({ lookupTypeId, lookupTypeTitle, code });
      }
    }

    return entries;
  }, [
    mgState.configs,
    mgState.entriesByConfigId,
    mgState.selectedConfigIds,
  ]);

  const validateEntries = React.useCallback(
    (isSubmitting: boolean = false): boolean => {
      if (mgState.selectedConfigIds.length === 0) {
        showWarningToast(
          toastRef,
          "Please select at least one master category to configure.",
          "Validation",
        );
        return false;
      }

      // For Save Draft, selecting at least one option in Select Masters to Configure is sufficient
      if (!isSubmitting) {
        return true;
      }

      for (const configId of mgState.selectedConfigIds) {
        const configItem = mgState.configs.find((c) => c.id === configId);
        const masterTitle = configItem
          ? configItem.title
          : `Master (${configId})`;
        const rows = mgState.entriesByConfigId[configId] || [];

        if (rows.length === 0) {
          showWarningToast(
            toastRef,
            `Please add at least one entry for ${masterTitle}.`,
            "Validation",
          );
          return false;
        }

        const seenCodesInMaster = new Set<string>();

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row.description.trim()) {
            showWarningToast(
              toastRef,
              `Description is required for ${masterTitle}${rows.length > 1 ? ` (Row ${i + 1})` : ""}.`,
              "Validation",
            );
            return false;
          }

          // Initiator: Code optional. Consultant: Code mandatory on every action.
          if (mode === "consultant-edit" && !row.code.trim()) {
            showWarningToast(
              toastRef,
              `Code is required for ${masterTitle}${rows.length > 1 ? ` (Row ${i + 1})` : ""}.`,
              "Validation",
            );
            return false;
          }

          const codeKey = row.code.trim().toLowerCase();
          if (codeKey) {
            if (seenCodesInMaster.has(codeKey)) {
              showWarningToast(
                toastRef,
                `Code "${row.code.trim()}" is duplicated under ${masterTitle}.`,
                "Validation",
              );
              return false;
            }
            seenCodesInMaster.add(codeKey);
          }
        }
      }

      // Also block the same Code under masters that share one Lookup Type.
      const seenByLookupType = new Set<string>();
      for (const entry of collectCodeUniquenessEntries()) {
        const key = `${entry.lookupTypeId}::${entry.code.toLowerCase()}`;
        if (seenByLookupType.has(key)) {
          showWarningToast(
            toastRef,
            `Code "${entry.code}" is duplicated under ${entry.lookupTypeTitle}.`,
            "Validation",
          );
          return false;
        }
        seenByLookupType.add(key);
      }

      return true;
    },
    [
      collectCodeUniquenessEntries,
      mgState.configs,
      mgState.entriesByConfigId,
      mgState.selectedConfigIds,
      mode,
      toastRef,
    ],
  );

  const assertCodesUniqueAgainstLookup = React.useCallback(async (): Promise<boolean> => {
    try {
      await assertMaterialGroupCodesUniqueInLookupTypes(
        collectCodeUniquenessEntries(),
      );
      return true;
    } catch (error: unknown) {
      showWarningToast(
        toastRef,
        toUserActionErrorMessage(error) ||
          "A Lookup Code already exists under this Lookup Type.",
        "Validation",
      );
      return false;
    }
  }, [collectCodeUniquenessEntries, toastRef]);

  const handleSaveDraft = React.useCallback(() => {
    if (initiatorAccessDenied) {
      showErrorToast(toastRef, INITIATOR_ACCESS_DENIED_MESSAGE);
      return;
    }
    if (!validateEntries(false)) {
      return;
    }
    try {
      assertBrowserOnline();
    } catch (error: unknown) {
      showErrorToast(toastRef, toUserActionErrorMessage(error));
      return;
    }
    if (!tryBeginActionBusy("saving")) {
      return;
    }

    void dispatch(saveMaterialGroupDraftThunk())
      .unwrap()
      .then(() => {
        // Flash via MainComponent Toast — form Toast unmounts on navigate.
        dispatch(
          setFlashMessage({
            severity: "success",
            detail: "Draft saved successfully.",
          }),
        );
        dispatch(resetMaterialGroupForm());
        navigate(
          buildNavHref(
            Config.Routes.MgDraftRework,
            searchParams.get(Config.NpdFormQuery.ViewAs),
          ),
        );
      })
      .catch(() => {
        // Error toast is shown once via the mgState.error effect.
      })
      .finally(() => {
        endActionBusy();
      });
  }, [
    dispatch,
    endActionBusy,
    initiatorAccessDenied,
    navigate,
    searchParams,
    toastRef,
    tryBeginActionBusy,
    validateEntries,
  ]);

  const handleSubmit = React.useCallback(() => {
    if (initiatorAccessDenied) {
      showErrorToast(toastRef, INITIATOR_ACCESS_DENIED_MESSAGE);
      return;
    }
    if (!validateEntries(true)) {
      return;
    }
    try {
      assertBrowserOnline();
    } catch (error: unknown) {
      showErrorToast(toastRef, toUserActionErrorMessage(error));
      return;
    }
    // Lock + loader immediately so rapid clicks cannot create duplicates
    // while uniqueness validation / thunk pending have not fired yet.
    if (!tryBeginActionBusy("submitting")) {
      return;
    }

    void (async () => {
      try {
        if (!(await assertCodesUniqueAgainstLookup())) {
          return;
        }

        try {
          const result = await dispatch(
            submitMaterialGroupRequestThunk({ comments: approverRemarks }),
          ).unwrap();
          // Flash via MainComponent Toast — form Toast unmounts on navigate.
          dispatch(
            setFlashMessage({
              severity: "success",
              detail: `Request ${result.requestId} submitted to Consultant successfully.`,
            }),
          );
          dispatch(resetMaterialGroupForm());
          navigate(
            buildNavHref(
              Config.Routes.MgAll,
              searchParams.get(Config.NpdFormQuery.ViewAs),
            ),
          );
        } catch {
          // Error toast is shown once via the mgState.error effect.
        }
      } finally {
        endActionBusy();
      }
    })();
  }, [
    approverRemarks,
    assertCodesUniqueAgainstLookup,
    dispatch,
    endActionBusy,
    initiatorAccessDenied,
    navigate,
    searchParams,
    toastRef,
    tryBeginActionBusy,
    validateEntries,
  ]);

  const handleConsultantAction = React.useCallback(
    (action: MaterialGroupConsultantActionType) => {
      if (actionInFlightRef.current) {
        return;
      }

      const remarks = approverRemarks.trim();

      // Complete / Rework / Reject: Code and Description required; Code unique per Lookup Type.
      if (!validateEntries(true)) {
        return;
      }

      try {
        assertBrowserOnline();
      } catch (error: unknown) {
        showErrorToast(toastRef, toUserActionErrorMessage(error));
        return;
      }

      if (action === "Completed" && !remarks) {
        showActionValidationToast(
          toastRef,
          "Completed",
          `Please enter ${approverRemarksLabel.toLowerCase()} before completing.`,
          "Validation",
        );
        return;
      }

      if ((action === "Rework" || action === "Rejected") && !remarks) {
        showActionValidationToast(
          toastRef,
          action,
          `Please enter ${approverRemarksLabel.toLowerCase()} before ${action === "Rework" ? "sending back for rework" : "rejecting"}.`,
          "Validation",
        );
        return;
      }

      const targetId =
        mgState.currentId ??
        (mgState.currentGuid ? Number(mgState.currentGuid) : undefined);
      if (!targetId && !mgState.currentGuid) {
        showErrorToast(toastRef, "Request ID is missing.");
        return;
      }

      if (!tryBeginActionBusy("consultant")) {
        return;
      }

      void (async () => {
        try {
          if (!(await assertCodesUniqueAgainstLookup())) {
            return;
          }

          try {
            await dispatch(
              consultantActionMaterialGroupThunk({
                id: targetId,
                guid: mgState.currentGuid || (targetId ? String(targetId) : ""),
                action,
                comments: remarks,
                entriesByConfigId: mgState.entriesByConfigId,
              }),
            ).unwrap();
            const successLabel =
              action === "Rework"
                ? "sent back for Rework"
                : action === "Rejected"
                  ? "Rejected"
                  : "Completed";
            // Flash via MainComponent Toast — form Toast unmounts on navigate.
            dispatch(
              setFlashMessage({
                severity: "success",
                detail: `Request ${mgState.currentRequestId || ""} ${successLabel} successfully.`,
              }),
            );
            dispatch(resetMaterialGroupForm());
            const viewAs = searchParams.get(Config.NpdFormQuery.ViewAs);
            if (action === "Completed") {
              navigate(buildNavHref(Config.Routes.MgCompleted, viewAs));
            } else {
              // Rework / Reject → All Requests (Consultant cannot open Initiator Draft/Rework)
              navigate(buildNavHref(Config.Routes.MgAll, viewAs));
            }
          } catch {
            // Error toast is shown once via the mgState.error effect.
          }
        } finally {
          endActionBusy();
        }
      })();
    },
    [
      approverRemarks,
      approverRemarksLabel,
      assertCodesUniqueAgainstLookup,
      dispatch,
      endActionBusy,
      mgState.configs,
      mgState.currentGuid,
      mgState.currentId,
      mgState.currentRequestId,
      mgState.entriesByConfigId,
      mgState.selectedConfigIds,
      navigate,
      searchParams,
      toastRef,
      tryBeginActionBusy,
      validateEntries,
    ],
  );

  const recordReady = Boolean(
    urlId &&
    ((mgState.currentId && String(mgState.currentId) === urlId) ||
      (mgState.currentGuid && mgState.currentGuid === urlId)),
  );

  return {
    mode,
    configs: mgState.configs,
    configsLoading: mgState.configsStatus === "loading",
    isLoadingRecord:
      Boolean(urlId) &&
      (mgState.hydrateStatus === "loading" ||
        (mgState.hydrateStatus !== "failed" && !recordReady)),
    selectedConfigIds: mgState.selectedConfigIds,
    entriesByConfigId: mgState.entriesByConfigId,
    currentRequestId: mgState.currentRequestId,
    currentStatus: mgState.currentStatus,
    initiatorName: mgState.initiatorName,
    latestComments: mgState.latestComments,
    latestCommentAction: mgState.latestCommentAction,
    auditLogs: mgState.auditLogs,
    isSaving:
      localActionBusy !== "idle" ||
      mgState.saveStatus === "saving" ||
      mgState.submitStatus === "submitting" ||
      mgState.consultantActionStatus === "saving",
    isSubmitting:
      localActionBusy === "submitting" ||
      mgState.submitStatus === "submitting",
    showApproverRemarks,
    approverRemarks,
    approverRemarksLabel,
    setApproverRemarks,
    handleToggleConfig,
    handleSelectAll,
    handleClearAll,
    handleAddRow,
    handleRemoveRow,
    handleUpdateRow,
    handleCancel,
    handleSaveDraft,
    handleSubmit,
    handleConsultantAction,
  };
}
