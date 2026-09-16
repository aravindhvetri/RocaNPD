import * as React from "react";
import { Button, DataTable } from "../../common/controls";
import NpdFormSectionPanel from "./NpdFormSectionPanel";
import {
  createEmptyNpdItemDetailRow,
  getVisibleNpdItemDetailFields,
} from "./npdItemDetailsConfig";
import type {
  INpdItemDetailRow,
  NpdItemDetailFieldKey,
} from "./npdItemDetails.types";
import styles from "./NpdItemDetailsSection.module.scss";
import { useNpdItemDetailsColumns } from "./useNpdItemDetailsColumns";

export interface INpdItemDetailsSectionProps {
  brand: string | null;
  rows: INpdItemDetailRow[];
  onRowsChange: React.Dispatch<React.SetStateAction<INpdItemDetailRow[]>>;
}

const NpdItemDetailsSection: React.FC<INpdItemDetailsSectionProps> = ({
  brand,
  rows,
  onRowsChange,
}) => {
  const visibleFields = React.useMemo(
    () => getVisibleNpdItemDetailFields(brand),
    [brand],
  );
  const latestRowId = rows.length ? rows[rows.length - 1].id : null;

  const handleAddItem = React.useCallback(() => {
    onRowsChange((currentRows) => [...currentRows, createEmptyNpdItemDetailRow()]);
  }, [onRowsChange]);

  const handleFieldChange = React.useCallback(
    (rowId: string, field: NpdItemDetailFieldKey, value: string | string[]) => {
      onRowsChange((currentRows) =>
        currentRows.map((row) =>
          row.id === rowId ? { ...row, [field]: value } : row,
        ),
      );
    },
    [onRowsChange],
  );

  const handleDeleteRow = React.useCallback(
    (rowId: string) => {
      onRowsChange((currentRows) =>
        currentRows.filter((row) => row.id !== rowId),
      );
    },
    [onRowsChange],
  );

  const columns = useNpdItemDetailsColumns({
    visibleFields,
    latestRowId,
    onFieldChange: handleFieldChange,
    onAddLatestRow: handleAddItem,
    onDeleteRow: handleDeleteRow,
  });

  const headerActions = (
    <>
      <Button
        label="Add"
        icon="pi pi-plus"
        size="xs"
        className={styles.headerAddButton}
        onClick={handleAddItem}
      />
      <Button
        label="Import"
        icon="pi pi-download"
        size="xs"
        variant="secondary"
        className={styles.headerImportButton}
        disabled
        title="Import will be configured in a later phase"
      />
    </>
  );

  return (
    <NpdFormSectionPanel title="Item Details" actions={headerActions}>
      <DataTable<INpdItemDetailRow>
        value={rows}
        columns={columns}
        loading={false}
        dataKey="id"
        paginator={false}
        className={styles.itemDetailsTable}
        emptyMessage="Click Add to create your first item line."
      />

      <div className={styles.footer}>
        <span className={styles.footerCount}>Total Item Lines: {rows.length}</span>
        <button
          type="button"
          className={styles.addLineButton}
          onClick={handleAddItem}
        >
          <i className={`pi pi-plus ${styles.addLineIcon}`} aria-hidden="true" />
          <span>Add Another Item Line</span>
        </button>
      </div>
    </NpdFormSectionPanel>
  );
};

export default NpdItemDetailsSection;
