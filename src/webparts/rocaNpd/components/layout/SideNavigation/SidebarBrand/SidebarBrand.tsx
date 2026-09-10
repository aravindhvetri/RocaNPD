import * as React from "react";
import { Config } from "../../../../../../External/CommonServices/Config";
import SidebarToggle from "../SidebarToggle/SidebarToggle";
import styles from "./SidebarBrand.module.scss";

export interface ISidebarBrandProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

const SidebarBrand: React.FC<ISidebarBrandProps> = ({
  collapsed,
  onToggleSidebar,
}) => (
  <div className={`${styles.brand} ${collapsed ? styles.brandCollapsed : ""}`}>
    {!collapsed && (
      <>
        <div className={styles.iconBox} aria-hidden="true">
          <i className="pi pi-cog" />
        </div>
        <div className={styles.titles}>
          <span className={styles.title}>NPD REQUESTS</span>
          <span className={styles.subtitle}>
            {Config.AppTitle.split("—")[1]?.trim() ?? "New Product Development"}
          </span>
        </div>
      </>
    )}
    <SidebarToggle
      collapsed={collapsed}
      onToggle={onToggleSidebar}
      className={styles.toggle}
    />
  </div>
);

export default SidebarBrand;
