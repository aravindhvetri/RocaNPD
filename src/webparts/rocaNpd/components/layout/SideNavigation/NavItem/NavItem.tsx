import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import type {
  INavItemConfig,
  NavIconTone,
} from "../../../../../../External/CommonServices/navigationConfig";
import { buildNavHref } from "../../../../../../External/CommonServices/navigationConfig";
import { useAppSelector } from "../../../../../../store/hooks";
import { findActiveNavItemId } from "../navActiveHelper";
import { getSelectedBarToneClass } from "../navSelectedBarTone";
import { useFilteredNavigation } from "../useFilteredNavigation";
import styles from "./NavItem.module.scss";

export interface INavItemProps {
  item: INavItemConfig;
  onNavigate: (itemId: string) => void;
}

const iconToneClass: Record<NavIconTone, string> = {
  default: styles.iconDefault,
  pending: styles.iconPending,
  approved: styles.iconApproved,
  draft: styles.iconDraft,
};

const NavItem: React.FC<INavItemProps> = ({ item, onNavigate }) => {
  const location = useLocation();
  const activeNavItemId = useAppSelector((state) => state.ui.activeNavItemId);
  const navigation = useFilteredNavigation();
  const accessibleItems = React.useMemo(
    () => navigation.flatMap((section) => section.items),
    [navigation],
  );
  const tone = item.iconTone ?? "default";
  const href = buildNavHref(item.route, item.viewRole);

  const resolvedActiveId =
    findActiveNavItemId(
      location.pathname,
      location.search,
      accessibleItems,
    ) || activeNavItemId;
  const isSelected = resolvedActiveId
    ? resolvedActiveId === item.id
    : location.pathname === item.route;

  return (
    <NavLink
      to={href}
      end
      className={() =>
        `${styles.item} ${isSelected ? styles.itemActive : ""} ${
          isSelected ? getSelectedBarToneClass(item) : ""
        }`
      }
      onClick={() => onNavigate(item.id)}
    >
      <i
        className={`${item.icon} ${styles.icon} ${iconToneClass[tone]}`}
        aria-hidden="true"
      />
      <span className={styles.label}>{item.label}</span>
    </NavLink>
  );
};

export default NavItem;
