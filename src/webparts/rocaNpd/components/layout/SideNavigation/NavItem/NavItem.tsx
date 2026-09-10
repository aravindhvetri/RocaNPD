import * as React from "react";
import { NavLink } from "react-router-dom";
import type { INavItemConfig, NavIconTone } from "../../../../../../External/CommonServices/navigationConfig";
import { getSelectedBarToneClass } from "../navSelectedBarTone";
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
  const tone = item.iconTone ?? "default";

  return (
    <NavLink
      to={item.route}
      end
      className={({ isActive }) =>
        `${styles.item} ${isActive ? styles.itemActive : ""} ${
          isActive ? getSelectedBarToneClass(item) : ""
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
