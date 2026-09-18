import * as React from "react";
import { useAppSelector } from "../../../../../store/hooks";
import styles from "./RoleIndicator.module.scss";

const RoleIndicator: React.FC = () => {
  const assignedRoles = useAppSelector((state) => state.app.assignedRoles);
  const roleLabel = assignedRoles.length ? assignedRoles.join(", ") : "Unassigned";

  return (
    <div className={styles.roleBar} aria-label="Assigned roles">
      <span className={styles.label}>Assigned Roles</span>
      <span className={styles.badge}>{roleLabel}</span>
    </div>
  );
};

export default RoleIndicator;
