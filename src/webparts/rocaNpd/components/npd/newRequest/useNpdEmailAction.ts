import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Config } from "../../../../../External/CommonServices/Config";
import type { NpdWorkflowAction } from "../../../../../External/CommonServices/Interface";
import type { NpdRequestFooterMode } from "./NpdRequestFormFooter";
import { defaultEmailActionComments } from "./npdRequestFormHelpers";

export function useNpdEmailAction(params: {
  editId: number;
  emailAction: NpdWorkflowAction | null;
  footerMode: NpdRequestFooterMode;
  requestId: number | null;
  loadStatus: string;
  saveStatus: string;
  recordReady: boolean;
  onApply: (action: NpdWorkflowAction, comments: string) => void;
}): void {
  const navigate = useNavigate();
  const handledRef = React.useRef(false);
  const {
    editId,
    emailAction,
    footerMode,
    requestId,
    loadStatus,
    saveStatus,
    recordReady,
    onApply,
  } = params;

  React.useEffect(() => {
    if (handledRef.current || !emailAction || !editId || !requestId) {
      return;
    }

    if (loadStatus === "loading" || saveStatus !== "idle" || !recordReady) {
      return;
    }

    if (footerMode === "vertical-head-pending" || footerMode === "mis-pending") {
      handledRef.current = true;
      onApply(emailAction, defaultEmailActionComments(emailAction));
      return;
    }

    if (loadStatus === "idle") {
      handledRef.current = true;
      navigate(Config.Routes.NpdPending, { replace: true });
    }
  }, [
    editId,
    emailAction,
    footerMode,
    loadStatus,
    navigate,
    onApply,
    recordReady,
    requestId,
    saveStatus,
  ]);
}
