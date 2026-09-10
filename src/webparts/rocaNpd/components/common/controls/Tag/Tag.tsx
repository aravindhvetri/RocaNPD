import * as React from "react";
import { Tag as PrimeTag } from "primereact/tag";
import type { ITagProps } from "./ITagProps";

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
    className={className}
  />
);

export default Tag;
