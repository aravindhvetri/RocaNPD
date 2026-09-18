import * as React from "react";
import styles from "./Loader.module.scss";

export interface ILoaderProps {
  /** Text to display below the spinner. */
  label?: string;
  /** Whether to show the loader as a full-screen overlay. Defaults to true. */
  fullScreen?: boolean;
  /** Completed units for the optional progress bar. */
  progressCurrent?: number;
  /** Total units for the optional progress bar. */
  progressTotal?: number;
  /** Optional 0-100 fill that is independent of the item caption. */
  progressPercent?: number;
  /** Caption shown above the progress bar (for example `5 / 10 Line Items Added`). */
  progressCaption?: string;
}

/**
 * Reusable loading indicator with a premium feel.
 * Use via common `LoaderOverlay` for portal-based full-page loading in feature screens.
 */
const Loader: React.FC<ILoaderProps> = ({
  label = "Loading...",
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
        {hasProgress ? (
          <div className={styles.progressBlock}>
            {progressCaption ? (
              <p className={styles.progressCaption}>{progressCaption}</p>
            ) : null}
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={progressTotal}
              aria-valuenow={progressCurrent}
              aria-label={progressCaption}
            >
              <div className={styles.progressFill} style={{ width: `${percent}%` }} />
            </div>
          </div>
        ) : label ? (
          <p className={styles.loaderLabel}>{label}</p>
        ) : null}
      </div>
    </div>
  );
};

export default Loader;
