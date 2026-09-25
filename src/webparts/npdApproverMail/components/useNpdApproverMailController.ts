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

function actionPastTense(action: NpdWorkflowAction): string {
  if (action === "Approve") {
    return "approved";
  }
  if (action === "Reject") {
    return "rejected";
  }
  return "sent for rework";
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
          setResultMessage(
            "Your response for this request has been submitted successfully.",
          );
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
        setRequest(loaded);

        let workflowSteps: any[] = [];
        try {
          if (
            typeof loaded.WorkFlowJSON === "string" &&
            loaded.WorkFlowJSON.trim()
          ) {
            const parsed = JSON.parse(loaded.WorkFlowJSON);
            if (Array.isArray(parsed)) {
              workflowSteps = parsed;
            }
          }
        } catch {
          workflowSteps = [];
        }
        if (!workflowSteps.length && Array.isArray(loaded.WorkflowSteps)) {
          workflowSteps = loaded.WorkflowSteps;
        }

        const currentUserEmail = (
          actorEmail ||
          context.pageContext.user?.email ||
          context.pageContext.user?.loginName ||
          ""
        )
          .toLowerCase()
          .trim();

        const getStepEmail = (w: any): string =>
          String(w?.uEmail || w?.UserEmail || "").toLowerCase().trim();
        const getStepStatus = (w: any): string =>
          String(w?.status || w?.Status || "").trim();

        const alreadyCompleted = isNpdEmailActionAlreadyCompleted(loaded);
        const userCompleted = workflowSteps.some(
          (w: any) =>
            getStepEmail(w) === currentUserEmail &&
            isTerminalWorkflowStatus(getStepStatus(w)),
        );

        const pendingRole = getFirstPendingApproverRole(loaded.WorkflowSteps);
        const actorRole =
          resolveActorWorkflowRole(
            loaded.WorkflowSteps,
            currentUserEmail,
            assignedRoles,
          ) || pendingRole;

        const canAct =
          !alreadyCompleted &&
          !userCompleted &&
          Boolean(pendingRole) &&
          userCanActOnPendingWorkflow(
            loaded.WorkflowSteps,
            currentUserEmail,
            assignedRoles,
          ) &&
          canActOnPendingNpdStep(access, loaded.Brand, actorRole);

        if (!canAct) {
          setViewState("alreadyCompleted");
          setResultTitle("");

          if (
            isSubmittedRef.current ||
            userCompleted ||
            alreadyCompleted
          ) {
            setResultMessage(
              isSubmittedRef.current
                ? "Your response for this request has been submitted successfully."
                : "Your response for this request has already been submitted.",
            );
          } else if (
            workflowSteps.some(
              (_w: any) =>
                getStepEmail(_w) === currentUserEmail &&
                getStepStatus(_w).toLowerCase() === "pending",
            )
          ) {
            setResultMessage(
              "No action is required from you for this request at the moment.",
            );
          } else if (
            !workflowSteps.some(
              (_w: any) => getStepEmail(_w) === currentUserEmail,
            )
          ) {
            setResultMessage("You are not part of this request workflow.");
          } else {
            setResultMessage(
              "No action is required from you for this request at the moment.",
            );
          }
          return;
        }

        if (action === "Approve") {
          if (approveStartedRef.current) {
            return;
          }
          approveStartedRef.current = true;
          submitAction(loaded, "Approve", defaultComments("Approve"));
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
