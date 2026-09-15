import * as React from "react";
import styles from "./Loader.module.scss";

export interface ILoaderProps {
  /** Text to display below the spinner. */
  label?: string;
  /** Whether to show the loader as a full-screen overlay. Defaults to true. */
  fullScreen?: boolean;
}

/**
 * Reusable loading indicator with a premium feel.
 * Use via common `LoaderOverlay` for portal-based full-page loading in feature screens.
 */
const Loader: React.FC<ILoaderProps> = ({
  label = "Loading...",
  fullScreen = true,
}) => (
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
    </div>
  </div>
);

export default Loader;
