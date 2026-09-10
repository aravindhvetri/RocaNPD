import * as React from "react";
import type { NavSectionIconTone } from "../../../../../../External/CommonServices/navigationConfig";
import styles from "./NavCompactSectionIcon.module.scss";

export interface INavCompactSectionIconProps {
  icon: string;
  label: string;
  tone?: NavSectionIconTone;
  showDividerBefore?: boolean;
}

const toneClass: Record<NavSectionIconTone, string> = {
  default: styles.iconDefault,
  accent: styles.iconAccent,
  muted: styles.iconMuted,
};

const NavCompactSectionIcon: React.FC<INavCompactSectionIconProps> = ({
  icon,
  label,
  tone = "default",
  showDividerBefore,
}) => (
  <>
    {showDividerBefore && <div className={styles.divider} role="separator" />}
    <div className={styles.sectionBtn} title={label} aria-label={label}>
      <i className={`${icon} ${toneClass[tone]}`} aria-hidden="true" />
    </div>
  </>
);

export default NavCompactSectionIcon;
