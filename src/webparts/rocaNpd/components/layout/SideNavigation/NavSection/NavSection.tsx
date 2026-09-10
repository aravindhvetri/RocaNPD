import * as React from "react";
import type {
  INavSectionConfig,
  NavSectionIconTone,
} from "../../../../../../External/CommonServices/navigationConfig";
import NavItem from "../NavItem/NavItem";
import NavPrimaryAction from "../NavPrimaryAction/NavPrimaryAction";
import styles from "./NavSection.module.scss";

export interface INavSectionProps {
  section: INavSectionConfig;
  expanded: boolean;
  onToggle: (sectionId: string) => void;
  onNavigate: (itemId: string) => void;
}

const sectionIconClass: Record<NavSectionIconTone, string> = {
  default: styles.sectionIconDefault,
  accent: styles.sectionIconAccent,
  muted: styles.sectionIconMuted,
};

const NavSection: React.FC<INavSectionProps> = ({
  section,
  expanded,
  onToggle,
  onNavigate,
}) => {
  const tone = section.sectionIconTone ?? "default";
  const isMutedSection = tone === "muted";
  const primaryItems = section.items.filter((item) => item.isPrimaryAction);
  const listItems = section.items.filter((item) => !item.isPrimaryAction);

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.sectionHeader}
        onClick={() => onToggle(section.id)}
        aria-expanded={expanded}
      >
        <span className={styles.sectionTitleWrap}>
          <i
            className={`${section.icon} ${styles.sectionIcon} ${sectionIconClass[tone]}`}
            aria-hidden="true"
          />
          <span
            className={
              isMutedSection ? styles.sectionTitleMuted : styles.sectionTitle
            }
          >
            {section.label}
          </span>
        </span>
        <i
          className={`pi ${expanded ? "pi-chevron-up" : "pi-chevron-down"} ${styles.chevron}`}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <nav className={styles.items} aria-label={section.label}>
          {primaryItems.map((item) => (
            <NavPrimaryAction key={item.id} item={item} onNavigate={onNavigate} />
          ))}
          <div className={styles.listItems}>
            {listItems.map((item) => (
              <NavItem key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};

export default NavSection;
