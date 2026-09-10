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
    className={({ isActive }) =>
      `${styles.action} ${isActive ? styles.actionActive : ""}`
    }
    onClick={() => onNavigate(item.id)}
  >
    <i className={`${item.icon} ${styles.icon}`} aria-hidden="true" />
    <span>{item.label}</span>
  </NavLink>
);

export default NavPrimaryAction;
