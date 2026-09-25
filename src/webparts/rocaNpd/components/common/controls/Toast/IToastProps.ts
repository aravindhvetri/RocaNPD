export type ToastSeverity = "success" | "info" | "warn" | "error";

export interface IToastMessage {
  severity: ToastSeverity;
  summary: string;
  detail?: string;
  life?: number;
  className?: string;
}
