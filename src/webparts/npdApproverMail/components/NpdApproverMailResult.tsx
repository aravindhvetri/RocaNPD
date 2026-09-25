import * as React from "react";
import styles from "./NpdApproverMail.module.scss";

export type NpdApproverMailResultKind = "success" | "error" | "info";

export interface INpdApproverMailResultProps {
  kind?: NpdApproverMailResultKind;
  title?: string;
  message: string;
}

const NpdApproverMailResult: React.FC<INpdApproverMailResultProps> = ({
  message,
}) => {
  return (
    <div className={styles.resultCard} role="status">
      <p className={styles.resultMessage}>{message}</p>
    </div>
  );
};

export default NpdApproverMailResult;
