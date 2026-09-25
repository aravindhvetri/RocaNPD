import * as React from "react";
import { Toast as PrimeToast } from "primereact/toast";
import { getAppRootElement } from "../../appRootTarget";
import type { IToastMessage } from "./IToastProps";
import styles from "./Toast.module.scss";

const Toast = React.forwardRef<PrimeToast>((_, ref) => (
  <PrimeToast
    ref={ref}
    position="top-right"
    appendTo={getAppRootElement()}
    className={styles.rocaToast}
  />
));

Toast.displayName = "Toast";

export const showToast = (
  toastRef: React.RefObject<PrimeToast>,
  message: IToastMessage,
): void => {
  toastRef.current?.show({
    severity: message.severity,
    summary: message.summary,
    detail: message.detail,
    life: message.life ?? 4000,
    className: message.className,
  });
};

export const showWarningToast = (
  toastRef: React.RefObject<PrimeToast>,
  detail: string,
  summary = "Warning",
): void => {
  showToast(toastRef, { severity: "warn", summary, detail });
};

export const showSuccessToast = (
  toastRef: React.RefObject<PrimeToast>,
  detail: string,
  summary = "Success",
): void => {
  showToast(toastRef, { severity: "success", summary, detail });
};

export const showErrorToast = (
  toastRef: React.RefObject<PrimeToast>,
  detail: string,
  summary = "Error",
): void => {
  showToast(toastRef, { severity: "error", summary, detail });
};

export const showReworkToast = (
  toastRef: React.RefObject<PrimeToast>,
  detail: string,
  summary = "Validation",
): void => {
  showToast(toastRef, {
    severity: "warn",
    summary,
    detail,
    className: "toastActionRework",
  });
};

export const showRejectToast = (
  toastRef: React.RefObject<PrimeToast>,
  detail: string,
  summary = "Validation",
): void => {
  showToast(toastRef, {
    severity: "error",
    summary,
    detail,
    className: "toastActionReject",
  });
};

export const showApproveToast = (
  toastRef: React.RefObject<PrimeToast>,
  detail: string,
  summary = "Validation",
): void => {
  showToast(toastRef, {
    severity: "success",
    summary,
    detail,
    className: "toastActionApprove",
  });
};

export const showCompleteToast = (
  toastRef: React.RefObject<PrimeToast>,
  detail: string,
  summary = "Validation",
): void => {
  showToast(toastRef, {
    severity: "success",
    summary,
    detail,
    className: "toastActionComplete",
  });
};

export const showActionValidationToast = (
  toastRef: React.RefObject<PrimeToast>,
  action: string,
  detail: string,
  summary = "Validation",
): void => {
  const norm = (action || "").trim().toLowerCase();
  if (norm === "rework") {
    showReworkToast(toastRef, detail, summary);
  } else if (norm === "reject" || norm === "rejected") {
    showRejectToast(toastRef, detail, summary);
  } else if (norm === "approve" || norm === "approved") {
    showApproveToast(toastRef, detail, summary);
  } else if (norm === "complete" || norm === "completed") {
    showCompleteToast(toastRef, detail, summary);
  } else {
    showWarningToast(toastRef, detail, summary);
  }
};

export default Toast;
