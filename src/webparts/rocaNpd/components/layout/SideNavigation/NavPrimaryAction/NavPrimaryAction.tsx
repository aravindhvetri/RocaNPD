import * as React from "react";
import { NavLink } from "react-router-dom";
import type { INavItemConfig } from "../../../../../../External/CommonServices/navigationConfig";
import styles from "./NavPrimaryAction.module.scss";

export interface INavPrimaryActionProps {
  item: INavItemConfig;
  onNavigate: (itemId: string) => void;
}

const NavPrimaryAction: React.FC<INavPrimaryActionProps> = ({ item, onNavigate }) => (
  <NavLink
    to={item.route}
    end
    className={() => styles.action}
    onClick={(e) => {
      (e.currentTarget as HTMLElement).blur();
      onNavigate(item.id);
    }}
  >
    <span className={styles.iconWrap}>
      <i className={`${item.icon} ${styles.icon}`} aria-hidden="true" />
    </span>
    <span className={styles.label}>{item.label}</span>
  </NavLink>
);



export default NavPrimaryAction;
