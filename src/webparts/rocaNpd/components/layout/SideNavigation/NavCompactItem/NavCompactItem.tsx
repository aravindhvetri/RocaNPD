import * as React from "react";
import { NavLink } from "react-router-dom";
import type { INavItemConfig, NavIconTone } from "../../../../../../External/CommonServices/navigationConfig";
import { getSelectedBarToneClass } from "../navSelectedBarTone";
import styles from "./NavCompactItem.module.scss";

export interface INavCompactItemProps {
  item: INavItemConfig;
  onNavigate: (itemId: string) => void;
}

const iconToneClass: Record<NavIconTone, string> = {
  default: styles.iconDefault,
  pending: styles.iconPending,
  approved: styles.iconApproved,
  draft: styles.iconDraft,
};

const NavCompactItem: React.FC<INavCompactItemProps> = ({ item, onNavigate }) => {
  const tone = item.iconTone ?? "default";

  return (
    <NavLink
      to={item.route}
      end
      title={item.label}
      aria-label={item.label}
      className={({ isActive }) =>
        `${styles.link} ${isActive ? styles.linkActive : ""} ${
          isActive ? getSelectedBarToneClass(item) : ""
        }`
      }
      onClick={() => onNavigate(item.id)}
    >
      <i
        className={`${item.icon} ${styles.icon} ${iconToneClass[tone]}`}
        aria-hidden="true"
      />
    </NavLink>
  );
};

export default NavCompactItem;
