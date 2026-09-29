import * as React from "react";
import { Button } from "../../common/controls";
import styles from "./NpdItemDetailsSection.module.scss";

export interface INpdItemDetailsActionsContextValue {
  allowDeleteRows: boolean;
  onAddRow: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
}

export const NpdItemDetailsActionsContext =
  React.createContext<INpdItemDetailsActionsContextValue>({
    allowDeleteRows: false,
    onAddRow: () => undefined,
    onDeleteRow: () => undefined,
  });

export interface INpdItemDetailsActionCellProps {
  rowId: string;
}

/**
 * Reads live allowDeleteRows from context so Delete icons update immediately
 * when row count crosses 1 ↔ 2+, even if PrimeReact does not re-run column bodies.
 */
const NpdItemDetailsActionCell: React.FC<INpdItemDetailsActionCellProps> = ({
  rowId,
}) => {
  const { allowDeleteRows, onAddRow, onDeleteRow } = React.useContext(
    NpdItemDetailsActionsContext,
  );

  return (
    <div
      className={
        allowDeleteRows
          ? styles.actionCell
          : `${styles.actionCell} ${styles.actionCellAddOnly}`
      }
    >
      <Button
        variant="text"
        icon="pi pi-plus"
        iconOnly
        size="xs"
        title="Add item line"
        aria-label="Add item line"
        className={styles.addRowAction}
        onClick={() => onAddRow(rowId)}
      />
      {allowDeleteRows ? (
        <Button
          variant="text"
          icon="pi pi-trash"
          iconOnly
          size="xs"
          title="Delete row"
          aria-label="Delete row"
          className={styles.deleteRowAction}
          onClick={() => onDeleteRow(rowId)}
        />
      ) : null}
    </div>
  );
};

export default NpdItemDetailsActionCell;
