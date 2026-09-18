import * as React from "react";
import { useAppSelector } from "../../../../../store/hooks";
import styles from "./Unauthorized.module.scss";

const Unauthorized: React.FC = () => {
  const roleError = useAppSelector((state) => state.app.roleError);
  const assignedRoles = useAppSelector((state) => state.app.assignedRoles);

  return (
    <section className={styles.page} aria-label="Access denied">
      <h2 className={styles.title}>Access denied</h2>
      <p className={styles.message}>
        {assignedRoles.length
          ? "You do not have permission to view this page."
          : "No application role is assigned to your account."}
      </p>
      <p className={styles.detail}>
        {roleError
          ? roleError
          : "Access is granted from the Admins SharePoint group and from roles mapped to you in ApproversMaster. Contact an administrator if you need access."}
      </p>
    </section>
  );
};

export default Unauthorized;
