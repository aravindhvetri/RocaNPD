import * as React from "react";
import { Config } from "../../../../../External/CommonServices/Config";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import {
  setActiveNavItem,
  toggleNavSection,
  toggleSidebar,
} from "../../../../../store/slices/uiSlice";
import NavSection from "./NavSection/NavSection";
import SidebarBrand from "./SidebarBrand/SidebarBrand";
import SideNavigationCompact from "./SideNavigationCompact/SideNavigationCompact";
import styles from "./SideNavigation.module.scss";

const SideNavigation: React.FC = () => {
  const dispatch = useAppDispatch();
  const { expandedSections, sidebarCollapsed } = useAppSelector((state) => state.ui);

  const handleToggleSection = (sectionId: string): void => {
    dispatch(toggleNavSection(sectionId));
  };

  const handleNavigate = (itemId: string): void => {
    dispatch(setActiveNavItem(itemId));
  };

  const handleToggleSidebar = (): void => {
    dispatch(toggleSidebar());
  };

  return (
    <aside
      className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}
      data-roca-npd-nav="true"
      aria-label="Application navigation"
    >
      <SidebarBrand
        collapsed={sidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
      />
      {sidebarCollapsed ? (
        <SideNavigationCompact onNavigate={handleNavigate} />
      ) : (
        <div className={styles.navScroll}>
          {Config.Navigation.map((section) => (
            <NavSection
              key={section.id}
              section={section}
              expanded={!!expandedSections[section.id]}
              onToggle={handleToggleSection}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      )}
    </aside>
  );
};

export default SideNavigation;
