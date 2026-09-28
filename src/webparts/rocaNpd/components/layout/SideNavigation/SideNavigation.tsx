import * as React from "react";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import {
  setActiveNavItem,
  toggleNavSection,
  toggleSidebar,
} from "../../../../../store/slices/uiSlice";
import NavSection from "./NavSection/NavSection";
import SidebarBrand from "./SidebarBrand/SidebarBrand";
import SideNavigationCompact from "./SideNavigationCompact/SideNavigationCompact";
import { useFilteredNavigation } from "./useFilteredNavigation";
import styles from "./SideNavigation.module.scss";

const SideNavigation: React.FC = () => {
  const dispatch = useAppDispatch();
  const { expandedSections, sidebarCollapsed } = useAppSelector((state) => state.ui);
  const navigation = useFilteredNavigation();

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
          {navigation.map((section, index) => {
            const previous = navigation[index - 1];
            const showRoleGroup =
              section.roleGroup !== "Analytics" &&
              (!previous || previous.roleGroup !== section.roleGroup);

            return (
              <React.Fragment key={section.id}>
                {showRoleGroup ? (
                  <div className={styles.roleGroup} role="presentation">
                    {section.roleGroup}
                  </div>
                ) : null}
                <NavSection
                  section={section}
                  expanded={!!expandedSections[section.id]}
                  onToggle={handleToggleSection}
                  onNavigate={handleNavigate}
                />
              </React.Fragment>
            );
          })}
        </div>
      )}
    </aside>
  );
};

export default SideNavigation;
