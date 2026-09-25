import * as React from "react";
import type { WebPartContext } from "@microsoft/sp-webpart-base";
import type { Toast as PrimeToast } from "primereact/toast";
import {
  Toast,
  showApproveToast,
  showReworkToast,
  showRejectToast,
  showErrorToast,
} from "../../rocaNpd/components/common/controls";
import NpdApproverMailActionPanel from "./NpdApproverMailActionPanel";
import NpdApproverMailLoader from "./NpdApproverMailLoader";
import NpdApproverMailResult from "./NpdApproverMailResult";
import styles from "./NpdApproverMail.module.scss";
import {
  type IUseNpdApproverMailControllerOptions,
  useNpdApproverMailController,
} from "./useNpdApproverMailController";

export interface INpdApproverMailAppProps {
  context: WebPartContext;
}

const NpdApproverMailApp: React.FC<INpdApproverMailAppProps> = ({
  context,
}) => {
  const toastRef = React.useRef<PrimeToast>(null);

  const controllerOptions = React.useMemo<IUseNpdApproverMailControllerOptions>(
    () => ({
      onSuccess: () => {
        showApproveToast(
          toastRef,
          "Your response for this request has been submitted successfully.",
          "Success",
        );
      },
      onValidationError: (actingOn, message) => {
        if (actingOn === "Rework") {
          showReworkToast(toastRef, message, "Validation");
        } else if (actingOn === "Reject") {
          showRejectToast(toastRef, message, "Validation");
        } else {
          showApproveToast(toastRef, message, "Validation");
        }
      },
      onError: (errorMessage) => {
        showErrorToast(toastRef, errorMessage, "Error");
      },
    }),
    [],
  );

  const {
    viewState,
    request,
    action,
    comments,
    commentsRequired,
    commentsError,
    resultTitle,
    resultMessage,
    setComments,
    handleConfirm,
    handleCancel,
  } = useNpdApproverMailController(context, controllerOptions);

  const isBusy = viewState === "loading" || viewState === "submitting";
  const showResult =
    viewState === "success" ||
    viewState === "error" ||
    viewState === "cancelled" ||
    viewState === "alreadyCompleted";

  const resultKind =
    viewState === "success"
      ? "success"
      : viewState === "cancelled" || viewState === "alreadyCompleted"
        ? "info"
        : "error";

  return (
    <div className={styles.page} data-roca-npd-root>
      <Toast ref={toastRef} />

      {isBusy ? (
        <NpdApproverMailLoader
          label="Loading request details..."
          warning="Do not refresh, go back, or close this window."
        />
      ) : showResult ? (
        <NpdApproverMailResult
          kind={resultKind}
          title={resultTitle}
          message={resultMessage}
        />
      ) : viewState === "ready" && action !== null && action !== "Approve" ? (
        <NpdApproverMailActionPanel
          requestTitle={request?.Title || ""}
          action={action}
          comments={comments}
          commentsRequired={commentsRequired}
          commentsError={commentsError}
          submitting={false}
          onCommentsChange={setComments}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ) : null}
    </div>
  );
};

export default NpdApproverMailApp;
