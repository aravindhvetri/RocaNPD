export interface ILoaderOverlayProps {
  /** When true, renders a full-page loader over the app root. */
  visible: boolean;
  /** Optional message below the spinner. */
  label?: string;
  progressCurrent?: number;
  progressTotal?: number;
  progressPercent?: number;
  progressCaption?: string;
}
