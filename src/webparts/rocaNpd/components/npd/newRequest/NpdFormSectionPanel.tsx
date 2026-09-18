import * as React from "react";
import styles from "./NpdFormSectionPanel.module.scss";

export interface INpdFormSectionPanelProps {
  title: string;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

const NpdFormSectionPanel: React.FC<INpdFormSectionPanelProps> = ({
  title,
  actions,
  className,
  bodyClassName,
  children,
}) => (
  <section className={`${styles.panel} ${className ?? ""}`}>
    <div className={styles.header}>
      <span>{title}</span>
      {actions ? <div className={styles.headerActions}>{actions}</div> : null}
    </div>
    <div className={`${styles.body} ${bodyClassName ?? ""}`}>{children}</div>
  </section>
);

export default NpdFormSectionPanel;
