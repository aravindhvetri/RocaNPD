import * as React from "react";
import { Toast as PrimeToast } from "primereact/toast";
import type { IToastMessage } from "./IToastProps";

const Toast = React.forwardRef<PrimeToast>((_, ref) => (
  <PrimeToast ref={ref} position="top-right" />
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
  });
};

export default Toast;
