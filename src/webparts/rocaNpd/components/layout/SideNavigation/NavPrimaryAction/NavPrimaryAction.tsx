import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import type { INavItemConfig } from "../../../../../../External/CommonServices/navigationConfig";
import {
  buildNavHref,
  createFormResetNavState,
  isCreateFormRoute,
} from "../../../../../../External/CommonServices/navigationConfig";
import styles from "./NavPrimaryAction.module.scss";

export interface INavPrimaryActionProps {
  item: INavItemConfig;
  onNavigate: (itemId: string) => void;
}

const NavPrimaryAction: React.FC<INavPrimaryActionProps> = ({
  item,
  onNavigate,
}) => {
  const navigate = useNavigate();
  const href = buildNavHref(item.route, item.viewRole);

  return (
    <NavLink
      to={href}
      end
      className={() => styles.action}
      onClick={(e) => {
        (e.currentTarget as HTMLElement).blur();
        // Always open a blank create form — even when already on /npd/new or /mg/new
        // with a previously viewed request still in Redux.
        if (isCreateFormRoute(item.route)) {
          e.preventDefault();
          navigate(href, { state: createFormResetNavState() });
        }
        onNavigate(item.id);
      }}
    >
      <span className={styles.iconWrap}>
        <i className={`${item.icon} ${styles.icon}`} aria-hidden="true" />
      </span>
      <span className={styles.label}>{item.label}</span>
    </NavLink>
  );
};

export default NavPrimaryAction;
