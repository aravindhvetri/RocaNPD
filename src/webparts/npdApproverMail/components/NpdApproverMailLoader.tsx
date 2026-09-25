import * as React from "react";
import styles from "./NpdApproverMail.module.scss";

export interface INpdApproverMailLoaderProps {
  label?: string;
  warning?: string;
}

const NpdApproverMailLoader: React.FC<INpdApproverMailLoaderProps> = ({
  label = "Loading request details...",
  warning = "Do not refresh, go back, or close this window.",
}) => {
  return (
    <div className={styles.loaderContainer} role="status" aria-live="polite">
      <div className={styles.spinner}>
        <div className={styles.outerRing} />
        <div className={styles.innerRing} />
      </div>
      <p className={styles.loadingText}>{label}</p>
      {warning ? <p className={styles.warningText}>{warning}</p> : null}
    </div>
  );
};

export default NpdApproverMailLoader;
