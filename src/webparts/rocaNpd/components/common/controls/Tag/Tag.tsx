import * as React from "react";
import { Tag as PrimeTag } from "primereact/tag";
import type { ITagProps } from "./ITagProps";
import styles from "./Tag.module.scss";

const Tag: React.FC<ITagProps> = ({
  value,
  severity,
  rounded,
  icon,
  className,
}) => (
  <PrimeTag
    value={value}
    severity={severity ?? undefined}
    rounded={rounded}
    icon={icon}
    className={`${styles.tag} ${className ?? ""}`}
  />
);

export default Tag;
