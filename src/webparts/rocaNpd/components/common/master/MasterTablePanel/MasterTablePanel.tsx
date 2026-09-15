import * as React from "react";
import styles from "./MasterTablePanel.module.scss";

export interface IMasterTablePanelProps {
  children: React.ReactNode;
  className?: string;
}

/** Wrapper for master list table panels (border, radius, shadow applied by parent). */
const MasterTablePanel: React.FC<IMasterTablePanelProps> = ({
  children,
  className,
}) => (
  <div className={[styles.panel, className].filter(Boolean).join(" ")}>
    {children}
  </div>
);

export default MasterTablePanel;
