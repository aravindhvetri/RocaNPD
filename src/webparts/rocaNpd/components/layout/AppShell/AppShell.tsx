import * as React from "react";
import { Config } from "../../../../../External/CommonServices/Config";
import { initNpdTabSync } from "../../../../../External/CommonServices/npdRequestTabSync";
import { useAppSelector } from "../../../../../store/hooks";
import Header from "../Header/Header";
import SideNavigation from "../SideNavigation/SideNavigation";
import NavRouteSync from "./NavRouteSync";
import styles from "./AppShell.module.scss";

if (typeof window !== "undefined") {
  initNpdTabSync();
}

export interface IAppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<IAppShellProps> = ({ children }) => {
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);

  React.useEffect(() => {
    initNpdTabSync();
  }, []);

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
        </div>
        <main className={styles.content}>{children}</main>
      </div>
      <span className={styles.versionLabel} aria-hidden="true">
        {Config.AppVersion}
      </span>
    </div>
  );
};

export default AppShell;
