import * as React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Toast as PrimeToast } from "primereact/toast";
import { Config } from "../../../../../External/CommonServices/Config";
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
  showSuccessToast,
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

  const approverRemarksLabel = React.useMemo(
    () => getApproverRemarksLabel(appState.assignedRoles),
    [appState.assignedRoles],
  );

  // Compute active mode
  const mode: MaterialGroupFormMode = React.useMemo(() => {
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
  }, [urlMode, urlId, isConsultant, mgState.currentStatus]);

  const showApproverRemarks = mode === "consultant-edit" && isApprover;

  const [approverRemarks, setApproverRemarks] = React.useState("");

  React.useEffect(() => {
    setApproverRemarks("");
  }, [urlId]);

  // Load configs on mount or navigation
  React.useEffect(() => {
    void dispatch(fetchMaterialGroupConfigsThunk());
  }, [dispatch, location.key, location.pathname]);

  // Hydrate form from RequestsJSON whenever ?id= changes
  React.useEffect(() => {
    if (!urlId) {
      return;
    }
    void dispatch(fetchMaterialGroupRequestByIdThunk(urlId));
  }, [dispatch, urlId]);

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
    navigate(Config.Routes.MgAll);
  }, [dispatch, navigate]);

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

          if (isSubmitting && mode === "consultant-edit" && !row.code.trim()) {
            showWarningToast(
              toastRef,
              `Code is required for ${masterTitle}${rows.length > 1 ? ` (Row ${i + 1})` : ""}.`,
              "Validation",
            );
            return false;
          }
        }
      }

      return true;
    },
    [
      mgState.configs,
      mgState.entriesByConfigId,
      mgState.selectedConfigIds,
      mode,
      toastRef,
    ],
  );

  const handleSaveDraft = React.useCallback(() => {
    if (!validateEntries(false)) {
      return;
    }

    void dispatch(saveMaterialGroupDraftThunk())
      .unwrap()
      .then(() => {
        showSuccessToast(toastRef, "Draft saved successfully.");
        dispatch(resetMaterialGroupForm());
        navigate(Config.Routes.MgDraftRework, { state: { draftSaved: true } });
      })
      .catch((err) => {
        showErrorToast(toastRef, err || "Failed to save draft.");
      });
  }, [dispatch, navigate, toastRef, validateEntries]);

  const handleSubmit = React.useCallback(() => {
    if (!validateEntries(true)) {
      return;
    }

    void dispatch(submitMaterialGroupRequestThunk())
      .unwrap()
      .then((result) => {
        showSuccessToast(
          toastRef,
          `Request ${result.requestId} submitted to Consultant successfully.`,
        );
        dispatch(resetMaterialGroupForm());
        navigate(Config.Routes.MgAll, { state: { submitted: true } });
      })
      .catch((err) => {
        showErrorToast(toastRef, err || "Failed to submit request.");
      });
  }, [dispatch, navigate, toastRef, validateEntries]);

  const handleConsultantAction = React.useCallback(
    (action: MaterialGroupConsultantActionType) => {
      const remarks = approverRemarks.trim();

      if (action === "Completed") {
        for (const configId of mgState.selectedConfigIds) {
          const configItem = mgState.configs.find((c) => c.id === configId);
          const masterTitle = configItem
            ? configItem.title
            : `Master (${configId})`;
          const rows = mgState.entriesByConfigId[configId] || [];

          for (let i = 0; i < rows.length; i++) {
            if (!rows[i].code.trim()) {
              showWarningToast(
                toastRef,
                `NPD Code is mandatory for ${masterTitle}${rows.length > 1 ? ` (Row ${i + 1})` : ""} before completing.`,
                "Validation",
              );
              return;
            }
          }
        }

        if (!remarks) {
          showActionValidationToast(
            toastRef,
            "Completed",
            `Please enter ${approverRemarksLabel.toLowerCase()} before completing.`,
            "Validation",
          );
          return;
        }
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

      void dispatch(
        consultantActionMaterialGroupThunk({
          id: targetId,
          guid: mgState.currentGuid || (targetId ? String(targetId) : ""),
          action,
          comments: remarks,
          entriesByConfigId: mgState.entriesByConfigId,
        }),
      )
        .unwrap()
        .then(() => {
          const successLabel =
            action === "Rework"
              ? "sent back for Rework"
              : action === "Rejected"
                ? "Rejected"
                : "Completed";
          showSuccessToast(
            toastRef,
            `Request ${mgState.currentRequestId || ""} ${successLabel} successfully.`,
          );
          dispatch(resetMaterialGroupForm());
          // Navigate immediately once loading finishes (no artificial delay)
          if (action === "Completed") {
            navigate(Config.Routes.MgCompleted);
          } else {
            // Rework / Reject → All Requests (Consultant cannot open Initiator Draft/Rework)
            navigate(Config.Routes.MgAll);
          }
        })
        .catch((err) => {
          showErrorToast(toastRef, err || "Failed to update request.");
        });
    },
    [
      approverRemarks,
      approverRemarksLabel,
      dispatch,
      mgState.configs,
      mgState.currentGuid,
      mgState.currentId,
      mgState.currentRequestId,
      mgState.entriesByConfigId,
      mgState.selectedConfigIds,
      navigate,
      toastRef,
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
      mgState.saveStatus === "saving" ||
      mgState.submitStatus === "submitting" ||
      mgState.consultantActionStatus === "saving",
    isSubmitting: mgState.submitStatus === "submitting",
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
