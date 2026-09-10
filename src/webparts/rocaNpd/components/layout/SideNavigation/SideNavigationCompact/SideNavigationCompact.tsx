import * as React from "react";
import { Config } from "../../../../../../External/CommonServices/Config";
import type {
  INavItemConfig,
  INavSectionConfig,
} from "../../../../../../External/CommonServices/navigationConfig";
import NavCompactItem from "../NavCompactItem/NavCompactItem";
import NavCompactPrimary from "../NavCompactPrimary/NavCompactPrimary";
import NavCompactSectionIcon from "../NavCompactSectionIcon/NavCompactSectionIcon";
import styles from "./SideNavigationCompact.module.scss";

export interface ISideNavigationCompactProps {
  onNavigate: (itemId: string) => void;
}

const SideNavigationCompact: React.FC<ISideNavigationCompactProps> = ({
  onNavigate,
}) => (
  <nav className={styles.compactNav} aria-label="Compact application navigation">
    <div className={styles.topDivider} role="separator" />
    {Config.Navigation.map((section: INavSectionConfig, sectionIndex: number) => {
      const primaryItems = section.items.filter(
        (item: INavItemConfig) => item.isPrimaryAction,
      );
      const listItems = section.items.filter(
        (item: INavItemConfig) => !item.isPrimaryAction,
      );

      return (
        <div key={section.id} className={styles.sectionGroup}>
          {sectionIndex > 0 && (
            <NavCompactSectionIcon
              icon={section.icon}
              label={section.label}
              tone={section.sectionIconTone}
              showDividerBefore
            />
          )}
          {primaryItems.map((item: INavItemConfig) => (
            <NavCompactPrimary key={item.id} item={item} onNavigate={onNavigate} />
          ))}
          {listItems.map((item: INavItemConfig) => (
            <NavCompactItem key={item.id} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      );
    })}
  </nav>
);

export default SideNavigationCompact;
