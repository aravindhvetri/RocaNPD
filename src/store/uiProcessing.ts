import type { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import {
  clearGlobalProcessing,
  setGlobalProcessing,
  updateGlobalProcessing,
} from "./slices/uiSlice";

/** Compatible with both `AppDispatch` and async-thunk `dispatch`. */
type UiProcessingDispatch = Dispatch<UnknownAction>;

let progressTimerId = 0;

function clearProgressTimer(): void {
  if (progressTimerId) {
    window.clearInterval(progressTimerId);
    progressTimerId = 0;
  }
}

export interface IBeginUiProcessingOptions {
  /**
   * When true, animate item counts for Initiator draft/submit.
   * Other actions should leave this false (Processing label only).
   */
  showItemProgress?: boolean;
  /**
   * Slower, even animation for Initiator Send Request / Resubmit only.
   * Does not change how many rows are saved.
   */
  submitPace?: boolean;
}

/**
 * Starts a global "Processing" overlay that survives route changes.
 * Item progress animates only when {@link IBeginUiProcessingOptions.showItemProgress} is set.
 */
export function beginUiProcessing(
  dispatch: UiProcessingDispatch,
  total = 1,
  options?: IBeginUiProcessingOptions,
): void {
  clearProgressTimer();
  const showItemProgress = Boolean(options?.showItemProgress);
  const safeTotal = Math.max(total, 1);

  dispatch(
    setGlobalProcessing({
      current: showItemProgress ? 1 : 0,
      total: safeTotal,
      percent: showItemProgress ? 3 : 0,
      showItemProgress,
    }),
  );

  if (!showItemProgress) {
    return;
  }

  const startedAt = Date.now();
  const submitPace = Boolean(options?.submitPace);
  // Submit: longer, linear pace so the bar does not race to the last few
  // lines and then sit. Other item progress keeps the existing timing.
  const durationMs = submitPace
    ? Math.min(50000, Math.max(9000, 6000 + safeTotal * 95))
    : Math.min(10000, Math.max(4000, 2500 + safeTotal * 25));
  // Hold the last line until the save actually finishes.
  const holdAt = submitPace
    ? Math.max(1, safeTotal - 1)
    : safeTotal <= 5
      ? Math.max(1, safeTotal - 1)
      : safeTotal - 5;
  progressTimerId = window.setInterval(() => {
    const elapsed = Date.now() - startedAt;
    const ratio = Math.min(submitPace ? 1 : 0.9, elapsed / durationMs);
    const eased = submitPace ? ratio : 1 - (1 - ratio) * (1 - ratio);
    const percent = Math.max(3, Math.round(eased * (submitPace ? 96 : 90)));
    const rawCurrent = Math.max(1, Math.round(eased * safeTotal));
    const current = Math.min(holdAt, rawCurrent);
    dispatch(
      updateGlobalProcessing({ current, total: safeTotal, percent }),
    );
  }, 80);
}

/**
 * Starts SAP Post progress at `SAP Datas: 0/{total}` with no fake animation.
 * Updates only via {@link reportSapUiProcessing} after each successful SAP call.
 */
export function beginSapUiProcessing(
  dispatch: UiProcessingDispatch,
  total: number,
): void {
  clearProgressTimer();
  const safeTotal = Math.max(0, total);
  dispatch(
    setGlobalProcessing({
      current: 0,
      total: safeTotal,
      percent: 0,
      showItemProgress: true,
      progressLabel: "SAP Datas",
    }),
  );
}

/** Updates SAP progress after a successful createZMatMast call. */
export function reportSapUiProcessing(
  dispatch: UiProcessingDispatch,
  current: number,
  total: number,
): void {
  const safeTotal = Math.max(0, total);
  const safeCurrent = Math.max(0, Math.min(current, safeTotal || current));
  const percent =
    safeTotal > 0
      ? Math.min(100, Math.round((safeCurrent / safeTotal) * 100))
      : 0;
  dispatch(
    updateGlobalProcessing({
      current: safeCurrent,
      total: safeTotal,
      percent,
      showItemProgress: true,
      progressLabel: "SAP Datas",
    }),
  );
}

export function finishUiProcessing(
  dispatch: UiProcessingDispatch,
  success: boolean,
): void {
  clearProgressTimer();
  if (success) {
    dispatch(updateGlobalProcessing({ percent: 100 }));
    window.setTimeout(() => {
      dispatch(clearGlobalProcessing());
    }, 180);
    return;
  }
  dispatch(clearGlobalProcessing());
}
