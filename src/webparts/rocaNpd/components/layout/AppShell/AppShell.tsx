import * as React from "react";
import { useAppSelector } from "../../../../../store/hooks";
import Header from "../Header/Header";
import RoleIndicator from "../RoleIndicator/RoleIndicator";
import SideNavigation from "../SideNavigation/SideNavigation";
import NavRouteSync from "./NavRouteSync";
import styles from "./AppShell.module.scss";

export interface IAppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<IAppShellProps> = ({ children }) => {
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);

  return (
    <div
      className={`${styles.appShell} ${
        sidebarCollapsed ? styles.shellCollapsed : styles.shellExpanded
      }`}
    >
      <NavRouteSync />
      <Header />
      <div className={styles.body}>
        <div className={styles.sidebarColumn}>
          <SideNavigation />
          {!sidebarCollapsed && <RoleIndicator />}
        </div>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
