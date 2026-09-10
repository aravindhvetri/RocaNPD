import * as React from "react";
import { useAppSelector } from "../../../../../store/hooks";
import styles from "./RoleIndicator.module.scss";

const RoleIndicator: React.FC = () => {
  const activeRole = useAppSelector((state) => state.app.activeRole);

  return (
    <div className={styles.roleBar} aria-label="Active login role">
      <span className={styles.label}>Active Login Role</span>
      <span className={styles.badge}>{activeRole}</span>
    </div>
  );
};

export default RoleIndicator;
