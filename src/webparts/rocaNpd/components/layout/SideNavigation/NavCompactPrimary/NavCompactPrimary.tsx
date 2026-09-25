import * as React from "react";
import { NavLink } from "react-router-dom";
import type { INavItemConfig } from "../../../../../../External/CommonServices/navigationConfig";
import styles from "./NavCompactPrimary.module.scss";

export interface INavCompactPrimaryProps {
  item: INavItemConfig;
  onNavigate: (itemId: string) => void;
}

const NavCompactPrimary: React.FC<INavCompactPrimaryProps> = ({ item, onNavigate }) => (
  <NavLink
    to={item.route}
    end
    title={item.label}
    aria-label={item.label}
    className={() => styles.link}
    onClick={(e) => {
      (e.currentTarget as HTMLElement).blur();
      onNavigate(item.id);
    }}
  >
    <span className={styles.iconWrap}>
      <i className={`${item.icon} ${styles.icon}`} aria-hidden="true" />
    </span>
  </NavLink>
);



export default NavCompactPrimary;
