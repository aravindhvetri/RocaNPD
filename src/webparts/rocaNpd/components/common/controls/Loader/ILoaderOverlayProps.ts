export interface ILoaderOverlayProps {
  /** When true, renders a full-page loader over the app root. */
  visible: boolean;
  /** Optional message below the spinner. Defaults to "Processing". */
  label?: string;
  progressCurrent?: number;
  progressTotal?: number;
  progressPercent?: number;
  /** Caption above the progress bar, e.g. `3 / 10`. */
  progressCaption?: string;
}
