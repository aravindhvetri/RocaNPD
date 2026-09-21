import * as React from "react";
import {
  formatMultiValueCell,
  type IMultiValueCellFormatOptions,
} from "../../../../../../External/CommonServices/multiValueDisplayUtils";

export interface IMultiValueCellProps extends IMultiValueCellFormatOptions {
  value: string | null | undefined;
  className?: string;
}

/**
 * DataTable cell for comma-/delimiter-separated values.
 * Shows the first 8 values, then `...`, with full list in `title` on hover.
 */
const MultiValueCell: React.FC<IMultiValueCellProps> = ({
  value,
  className,
  splitPattern,
  joinWith,
  limit,
}) => {
  const { display, title, truncated } = formatMultiValueCell(value, {
    splitPattern,
    joinWith,
    limit,
  });

  if (!display) {
    return <span className={className}>{""}</span>;
  }

  return (
    <span className={className} title={truncated ? title : undefined}>
      {display}
    </span>
  );
};

export default MultiValueCell;
