import * as React from "react";
import styles from "./Loader.module.scss";

export interface ILoaderProps {
  /** Text to display below the spinner. Defaults to "Processing". */
  label?: string;
  /** Whether to show the loader as a full-screen overlay. Defaults to true. */
  fullScreen?: boolean;
  /** Completed units for the optional progress bar. */
  progressCurrent?: number;
  /** Total units for the optional progress bar. */
  progressTotal?: number;
  /** Optional 0-100 fill. */
  progressPercent?: number;
  /** Caption above the progress bar (e.g. `3 / 10`). */
  progressCaption?: string;
}

/**
 * Reusable loading indicator with a premium feel.
 * Use via common `LoaderOverlay` for portal-based full-page loading in feature screens.
 */
const Loader: React.FC<ILoaderProps> = ({
  label = "Processing",
  fullScreen = true,
  progressCurrent,
  progressTotal,
  progressPercent,
  progressCaption,
}) => {
  const hasProgress =
    typeof progressTotal === "number" &&
    progressTotal > 0 &&
    (typeof progressPercent === "number" || typeof progressCurrent === "number");
  const percent = hasProgress
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            typeof progressPercent === "number"
              ? progressPercent
              : ((progressCurrent ?? 0) / (progressTotal ?? 1)) * 100,
          ),
        ),
      )
    : 0;

  const caption =
    progressCaption ||
    (hasProgress &&
    typeof progressCurrent === "number" &&
    typeof progressTotal === "number"
      ? `${progressCurrent} / ${progressTotal}`
      : undefined);

  return (
    <div
      className={`${styles.loaderContainer} ${fullScreen ? styles.fullScreen : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={styles.loaderWrapper}>
        <div className={styles.spinner}>
          <div className={styles.circle} />
          <div className={styles.circle} />
          <div className={styles.circle} />
          <div className={styles.circle} />
        </div>
        {label ? <p className={styles.loaderLabel}>{label}</p> : null}
        {hasProgress ? (
          <div className={styles.progressBlock}>
            {caption ? (
              <p className={styles.progressCaption}>{caption}</p>
            ) : null}
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={progressTotal}
              aria-valuenow={progressCurrent}
              aria-label={caption || "Processing progress"}
            >
              <div className={styles.progressFill} style={{ width: `${percent}%` }} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Loader;
