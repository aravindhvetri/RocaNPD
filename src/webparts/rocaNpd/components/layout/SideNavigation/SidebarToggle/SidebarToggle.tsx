import * as React from "react";
import styles from "./SidebarToggle.module.scss";

export interface ISidebarToggleProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

const SidebarToggle: React.FC<ISidebarToggleProps> = ({
  collapsed,
  onToggle,
  className,
}) => {
  // Hover toggles like click; skip the following click so enter+click is not a double toggle.
  const skipClickAfterHoverRef = React.useRef(false);
  const lastHoverToggleAtRef = React.useRef(0);

  const handleMouseEnter = (): void => {
    const now = Date.now();
    // Ignore re-entry from the expand/collapse layout shift under the pointer.
    if (now - lastHoverToggleAtRef.current < 300) {
      return;
    }
    lastHoverToggleAtRef.current = now;
    skipClickAfterHoverRef.current = true;
    onToggle();
  };

  const handleMouseLeave = (): void => {
    skipClickAfterHoverRef.current = false;
  };

  const handleClick = (): void => {
    if (skipClickAfterHoverRef.current) {
      skipClickAfterHoverRef.current = false;
      return;
    }
    onToggle();
  };

  return (
    <button
      type="button"
      className={`${styles.toggle} ${className ?? ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
    >
      <i
        className={`pi ${collapsed ? "pi-chevron-right" : "pi-chevron-left"} ${styles.icon}`}
        aria-hidden="true"
      />
    </button>
  );
};

export default SidebarToggle;
