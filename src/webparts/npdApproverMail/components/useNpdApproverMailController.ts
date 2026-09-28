import * as React from "react";
import type { WebPartContext } from "@microsoft/sp-webpart-base";
import { Config } from "../../../External/CommonServices/Config";
import type {
  INpdRequestGeneralInfo,
  INpdWorkflowStepJson,
  IResolvedUserAccess,
  NpdWorkflowAction,
} from "../../../External/CommonServices/Interface";
import { parseNpdApproverMailUrl } from "../../../External/CommonServices/npdAppUrl";
import {
  applyNpdWorkflowAction,
  fetchNpdGeneralInfoById,
} from "../../../External/CommonServices/npdRequestGeneralInfoService";
import {
  getFirstPendingApproverRole,
  resolveActorWorkflowRole,
  userCanActOnPendingWorkflow,
} from "../../../External/CommonServices/npdWorkflowJsonService";
import { canActOnPendingNpdStep } from "../../../External/CommonServices/permissionService";
import { normalizeEmail } from "../../../External/CommonServices/personFieldUtils";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { selectResolvedAccess } from "../../../store/slices/appSlice";
import { initializeApp } from "../../../store/thunks/appThunks";

export type NpdApproverMailViewState =
  | "loading"
  | "ready"
  | "submitting"
  | "success"
  | "alreadyCompleted"
  | "cancelled"
  | "error";

const MSG_SUBMITTED_SUCCESS =
  "Your response for this request has been submitted successfully.";
const MSG_ALREADY_SUBMITTED =
  "Your response for this request has already been submitted.";
const MSG_NO_ACTION_REQUIRED =
  "No action is required from you for this request at the moment.";
const MSG_NOT_IN_WORKFLOW = "You are not part of this request workflow.";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unable to process this approval action.";
}

function defaultComments(action: NpdWorkflowAction): string {
  if (action === "Approve") {
    return "Approved";
  }
  if (action === "Reject") {
    return "Rejected";
  }
  return "Rework requested";
}

function getVerticalHeadStep(
  steps: INpdWorkflowStepJson[],
): INpdWorkflowStepJson | undefined {
  return steps.find(
    (step) =>
      step.Role.trim().toLowerCase() ===
      Config.Roles.VerticalHead.toLowerCase(),
  );
}

function isTerminalRequestStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === Config.RequestStatus.Rework.toLowerCase() ||
    normalized === "in rework" ||
    normalized === Config.RequestStatus.Rejected.toLowerCase() ||
    normalized === Config.RequestStatus.Approved.toLowerCase() ||
    normalized === Config.RequestStatus.Completed.toLowerCase()
  );
}

function isTerminalWorkflowStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === Config.WorkflowStepStatus.Approved.toLowerCase() ||
    normalized === Config.WorkflowStepStatus.Rejected.toLowerCase() ||
    normalized === Config.WorkflowStepStatus.Rework.toLowerCase()
  );
}

function resolveWorkflowSteps(
  loaded: INpdRequestGeneralInfo,
): INpdWorkflowStepJson[] {
  if (Array.isArray(loaded.WorkflowSteps) && loaded.WorkflowSteps.length) {
    return loaded.WorkflowSteps;
  }

  try {
    const raw = (loaded.WorkFlowJSON || "").trim();
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => {
        const record = entry as Record<string, unknown>;
        return {
          Role: String(record.Role ?? record.role ?? "").trim(),
          UserEmail: String(
            record.UserEmail ?? record.uEmail ?? record.Email ?? "",
          ).trim(),
          Status: String(record.Status ?? record.status ?? "").trim(),
        } as INpdWorkflowStepJson;
      })
      .filter((step) => step.Role || step.UserEmail);
  } catch {
    return [];
  }
}

function isUserInWorkflow(
  steps: readonly INpdWorkflowStepJson[],
  userEmail: string,
): boolean {
  const email = normalizeEmail(userEmail);
  if (!email) {
    return false;
  }

  return steps.some(
    (step) => normalizeEmail(step.UserEmail || "") === email,
  );
}

function hasUserCompletedWorkflowStep(
  steps: readonly INpdWorkflowStepJson[],
  userEmail: string,
): boolean {
  const email = normalizeEmail(userEmail);
  if (!email) {
    return false;
  }

  return steps.some(
    (step) =>
      normalizeEmail(step.UserEmail || "") === email &&
      isTerminalWorkflowStatus(step.Status || ""),
  );
}

/**
 * Denied / info message when the logged-in user cannot act on the mail link.
 * Priority (CHK-G35b / CHK-G35e):
 * 1. Not in WorkFlowJSON → not part of workflow
 * 2. This user already actioned → already submitted
 * 3. Otherwise → no action required right now
 */
export function resolveNpdApproverMailDeniedMessage(params: {
  workflowSteps: readonly INpdWorkflowStepJson[];
  userEmail: string;
  userCompletedOwnStep: boolean;
  justSubmitted?: boolean;
}): string {
  if (params.justSubmitted) {
    return MSG_SUBMITTED_SUCCESS;
  }

  if (!isUserInWorkflow(params.workflowSteps, params.userEmail)) {
    return MSG_NOT_IN_WORKFLOW;
  }

  if (params.userCompletedOwnStep) {
    return MSG_ALREADY_SUBMITTED;
  }

  return MSG_NO_ACTION_REQUIRED;
}

/**
 * Email Approve/Rework/Reject is for Vertical Head. Once VH has acted (or the
 * request is terminal / past VH), the email action must not be offered again.
 * Based on live request Status + WorkFlowJSON — not on URL alone.
 */
export function isNpdEmailActionAlreadyCompleted(
  request: INpdRequestGeneralInfo,
): boolean {
  if (isTerminalRequestStatus(request.Status)) {
    return true;
  }

  const vhStep = getVerticalHeadStep(request.WorkflowSteps);
  if (vhStep && isTerminalWorkflowStatus(vhStep.Status)) {
    return true;
  }

  const pendingRole = getFirstPendingApproverRole(request.WorkflowSteps);
  if (!pendingRole) {
    return true;
  }

  return (
    pendingRole.toLowerCase() !== Config.Roles.VerticalHead.toLowerCase()
  );
}

export function getNpdApproverMailPageTitle(
  action: NpdWorkflowAction | null,
): string {
  if (action === "Approve") {
    return "Approve NPD Request";
  }
  if (action === "Reject") {
    return "Reject NPD Request";
  }
  if (action === "Rework") {
    return "Rework NPD Request";
  }
  return "NPD Approver Action";
}

export function getNpdApproverMailSubtitle(
  action: NpdWorkflowAction | null,
): string {
  if (action === "Approve") {
    return "Approving this NPD request. Comments are saved as Approved.";
  }
  if (action === "Reject" || action === "Rework") {
    return "Confirm the email action for this NPD request. Comments are required and saved to Approver Comments.";
  }
  return "Confirm the email action for this NPD request.";
}

export interface IUseNpdApproverMailControllerOptions {
  onSuccess?: (action: NpdWorkflowAction) => void;
  onValidationError?: (action: NpdWorkflowAction, message: string) => void;
  onError?: (error: string) => void;
}

export function useNpdApproverMailController(
  context: WebPartContext,
  options?: IUseNpdApproverMailControllerOptions,
): {
  viewState: NpdApproverMailViewState;
  request: INpdRequestGeneralInfo | null;
  action: NpdWorkflowAction | null;
  comments: string;
  commentsRequired: boolean;
  commentsError: string;
  resultTitle: string;
  resultMessage: string;
  setComments: (value: string) => void;
  handleConfirm: () => void;
  handleCancel: () => void;
} {
  const dispatch = useAppDispatch();
  const initialized = useAppSelector((state) => state.app.initialized);
  const roleStatus = useAppSelector((state) => state.app.roleStatus);
  const userEmail = useAppSelector((state) => state.app.userEmail);
  const userLoginName = useAppSelector((state) => state.app.userLoginName);
  const userId = useAppSelector((state) => state.app.userId);
  const assignedRoles = useAppSelector((state) => state.app.assignedRoles);
  const access = useAppSelector(selectResolvedAccess) as IResolvedUserAccess;

  const urlParams = React.useMemo(() => parseNpdApproverMailUrl(), []);
  const [viewState, setViewState] =
    React.useState<NpdApproverMailViewState>("loading");
  const [request, setRequest] = React.useState<INpdRequestGeneralInfo | null>(
    null,
  );
  const [comments, setComments] = React.useState("");
  const [commentsError, setCommentsError] = React.useState("");
  const [resultTitle, setResultTitle] = React.useState("");
  const [resultMessage, setResultMessage] = React.useState("");
  const loadStartedRef = React.useRef(false);
  const approveStartedRef = React.useRef(false);
  const isSubmittedRef = React.useRef(false);

  const action = urlParams.action;
  const commentsRequired = action === "Reject" || action === "Rework";

  const submitAction = React.useCallback(
    (
      loaded: INpdRequestGeneralInfo,
      nextAction: NpdWorkflowAction,
      commentText: string,
    ): void => {
      const actorEmail = userEmail || userLoginName;
      const actorRole =
        resolveActorWorkflowRole(
          loaded.WorkflowSteps,
          actorEmail,
          assignedRoles,
        ) || getFirstPendingApproverRole(loaded.WorkflowSteps);

      setViewState("submitting");
      void applyNpdWorkflowAction({
        requestId: loaded.Id,
        action: nextAction,
        comments: commentText.trim() || defaultComments(nextAction),
        actorEmail,
        actorRole,
        actorUserId: userId,
        access,
        siteUrl: context.pageContext.web.absoluteUrl,
        actionVia: "Mail",
      })
        .then((saved) => {
          isSubmittedRef.current = true;
          setRequest(saved);
          setViewState("success");
          setResultTitle("");
          setResultMessage(MSG_SUBMITTED_SUCCESS);
          options?.onSuccess?.(nextAction);
        })
        .catch((error) => {
          setViewState("error");
          setResultTitle("");
          const msg = getErrorMessage(error);
          setResultMessage(msg);
          options?.onError?.(msg);
        });
    },
    [
      access,
      assignedRoles,
      context.pageContext.web.absoluteUrl,
      options,
      userEmail,
      userId,
      userLoginName,
    ],
  );

  React.useEffect(() => {
    void dispatch(initializeApp(context));
  }, [context, dispatch]);

  React.useEffect(() => {
    if (!initialized || roleStatus === "loading" || loadStartedRef.current) {
      return;
    }

    loadStartedRef.current = true;

    if (!urlParams.requestId || !action) {
      setViewState("error");
      setResultTitle("");
      setResultMessage(
        "This approval URL is missing a valid RequestID or Action.",
      );
      return;
    }

    const actorEmail = userEmail || userLoginName;
    void (async () => {
      try {
        const loaded = await fetchNpdGeneralInfoById(urlParams.requestId);
        const workflowSteps = resolveWorkflowSteps(loaded);
        const requestWithSteps: INpdRequestGeneralInfo = {
          ...loaded,
          WorkflowSteps: workflowSteps.length
            ? workflowSteps
            : loaded.WorkflowSteps || [],
        };
        setRequest(requestWithSteps);

        const currentUserEmail = normalizeEmail(
          actorEmail ||
            context.pageContext.user?.email ||
            context.pageContext.user?.loginName ||
            "",
        );

        const alreadyCompleted =
          isNpdEmailActionAlreadyCompleted(requestWithSteps);
        const userCompleted = hasUserCompletedWorkflowStep(
          requestWithSteps.WorkflowSteps,
          currentUserEmail,
        );

        const pendingRole = getFirstPendingApproverRole(
          requestWithSteps.WorkflowSteps,
        );
        const actorRole =
          resolveActorWorkflowRole(
            requestWithSteps.WorkflowSteps,
            currentUserEmail,
            assignedRoles,
          ) || pendingRole;

        const canAct =
          !alreadyCompleted &&
          !userCompleted &&
          Boolean(pendingRole) &&
          userCanActOnPendingWorkflow(
            requestWithSteps.WorkflowSteps,
            currentUserEmail,
            assignedRoles,
          ) &&
          canActOnPendingNpdStep(access, requestWithSteps.Brand, actorRole);

        if (!canAct) {
          setViewState("alreadyCompleted");
          setResultTitle("");
          setResultMessage(
            resolveNpdApproverMailDeniedMessage({
              workflowSteps: requestWithSteps.WorkflowSteps,
              userEmail: currentUserEmail,
              userCompletedOwnStep: userCompleted,
              justSubmitted: isSubmittedRef.current,
            }),
          );
          return;
        }

        if (action === "Approve") {
          if (approveStartedRef.current) {
            return;
          }
          approveStartedRef.current = true;
          submitAction(requestWithSteps, "Approve", defaultComments("Approve"));
          return;
        }

        setViewState("ready");
      } catch (error) {
        setViewState("error");
        setResultTitle("");
        setResultMessage(getErrorMessage(error));
      }
    })();
  }, [
    access,
    action,
    assignedRoles,
    context.pageContext.user,
    initialized,
    roleStatus,
    submitAction,
    urlParams.requestId,
    userEmail,
    userLoginName,
  ]);

  const handleCancel = React.useCallback((): void => {
    setViewState("cancelled");
    setResultTitle("");
    setResultMessage("Action cancelled.");
  }, []);

  const handleConfirm = React.useCallback((): void => {
    if (!request || !action || viewState === "submitting") {
      return;
    }

    const trimmed = comments.trim();
    if (commentsRequired && !trimmed) {
      setCommentsError("Please enter comments before continuing.");
      options?.onValidationError?.(
        action,
        "Please enter comments before continuing.",
      );
      return;
    }
    setCommentsError("");
    submitAction(request, action, trimmed);
  }, [
    action,
    comments,
    commentsRequired,
    options,
    request,
    submitAction,
    viewState,
  ]);

  return {
    viewState,
    request,
    action,
    comments,
    commentsRequired,
    commentsError,
    resultTitle,
    resultMessage,
    setComments: (value: string) => {
      setComments(value);
      if (commentsError) {
        setCommentsError("");
      }
    },
    handleConfirm,
    handleCancel,
  };
}
