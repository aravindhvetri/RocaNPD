import * as React from "react";
import styles from "./NpdFormSectionPanel.module.scss";

export interface INpdFormSectionPanelProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const NpdFormSectionPanel: React.FC<INpdFormSectionPanelProps> = ({
  title,
  actions,
  children,
}) => (
  <section className={styles.panel}>
    <div className={styles.header}>
      <span>{title}</span>
      {actions ? <div className={styles.headerActions}>{actions}</div> : null}
    </div>
    <div className={styles.body}>{children}</div>
  </section>
);

export default NpdFormSectionPanel;
