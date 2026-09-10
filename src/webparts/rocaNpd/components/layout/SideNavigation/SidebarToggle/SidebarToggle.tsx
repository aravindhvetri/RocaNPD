import * as React from "react";
import styles from "./SidebarToggle.module.scss";

export interface ISidebarToggleProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

const SidebarToggle: React.FC<ISidebarToggleProps> = ({
  collapsed,
  onToggle,
  className,
}) => (
  <button
    type="button"
    className={`${styles.toggle} ${className ?? ""}`}
    onClick={onToggle}
    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    aria-expanded={!collapsed}
  >
    <i
      className={`pi ${collapsed ? "pi-chevron-right" : "pi-chevron-left"} ${styles.icon}`}
      aria-hidden="true"
    />
  </button>
);

export default SidebarToggle;
