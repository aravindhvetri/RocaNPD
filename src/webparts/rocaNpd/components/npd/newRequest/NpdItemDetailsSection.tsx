import * as React from "react";
import type { ISelectOption } from "../../../../../External/CommonServices/Interface";
import { Config } from "../../../../../External/CommonServices/Config";
import { Button, DataTable } from "../../common/controls";
import NpdFormSectionPanel from "./NpdFormSectionPanel";
import {
  createEmptyNpdItemDetailRow,
  getVisibleNpdItemDetailFields,
} from "./npdItemDetailsConfig";
import type {
  INpdItemDetailRow,
  NpdItemDetailFieldKey,
  NpdItemDetailFieldValue,
} from "./npdItemDetails.types";
import styles from "./NpdItemDetailsSection.module.scss";
import { useNpdItemDetailsColumns } from "./useNpdItemDetailsColumns";

export interface INpdItemDetailsSectionProps {
  brand: string | null;
  rows: INpdItemDetailRow[];
  lookupOptionsByType: Record<string, ISelectOption[]>;
  readOnly?: boolean;
  isMisCoordinatorActing?: boolean;
  onRowsChange: React.Dispatch<React.SetStateAction<INpdItemDetailRow[]>>;
  onImportClick?: () => void;
}

const NpdItemDetailsSection: React.FC<INpdItemDetailsSectionProps> = ({
  brand,
  rows,
  lookupOptionsByType,
  readOnly = false,
  isMisCoordinatorActing = false,
  onRowsChange,
  onImportClick,
}) => {
  const visibleFields = React.useMemo(
    () => getVisibleNpdItemDetailFields(brand),
    [brand],
  );
  const latestRowId = rows.length ? rows[rows.length - 1].id : null;
  const pageSize = Config.NpdItemDetailsPageSize;
  const [first, setFirst] = React.useState(0);
  const showPaginator = rows.length > pageSize;

  React.useEffect(() => {
    const maxFirst =
      rows.length === 0
        ? 0
        : Math.floor((rows.length - 1) / pageSize) * pageSize;
    setFirst((current) => (current > maxFirst ? maxFirst : current));
  }, [pageSize, rows.length]);

  const handleAddItem = React.useCallback(() => {
    if (readOnly) {
      return;
    }
    onRowsChange((currentRows) => [
      ...currentRows,
      createEmptyNpdItemDetailRow(Boolean(isMisCoordinatorActing)),
    ]);
    setFirst(Math.floor(rows.length / pageSize) * pageSize);
  }, [isMisCoordinatorActing, onRowsChange, pageSize, readOnly, rows.length]);

  const handleFieldChange = React.useCallback(
    (
      rowId: string,
      field: NpdItemDetailFieldKey,
      value: NpdItemDetailFieldValue,
    ) => {
      if (readOnly) {
        return;
      }
      onRowsChange((currentRows) =>
        currentRows.map((row) =>
          row.id === rowId ? { ...row, [field]: value } : row,
        ),
      );
    },
    [onRowsChange, readOnly],
  );

  const handleDeleteRow = React.useCallback(
    (rowId: string) => {
      if (readOnly) {
        return;
      }
      onRowsChange((currentRows) =>
        currentRows.filter((row) => row.id !== rowId),
      );
    },
    [onRowsChange, readOnly],
  );

  const columns = useNpdItemDetailsColumns({
    visibleFields,
    latestRowId,
    first,
    lookupOptionsByType,
    readOnly,
    onFieldChange: handleFieldChange,
    onAddLatestRow: handleAddItem,
    onDeleteRow: handleDeleteRow,
  });

  const headerActions = readOnly ? null : (
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
        className={styles.headerImportButton}
        onClick={onImportClick}
      />
    </>
  );

  return (
    <NpdFormSectionPanel
      title="Item Details"
      actions={headerActions}
      className={styles.sectionPanel}
      bodyClassName={styles.sectionBody}
    >
      <DataTable<INpdItemDetailRow>
        value={rows}
        columns={columns}
        loading={false}
        dataKey="id"
        paginator={showPaginator}
        rows={pageSize}
        rowsPerPageOptions={[pageSize]}
        first={first}
        onPage={(event) => setFirst(event.first)}
        paginatorPosition="bottom"
        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
        className={styles.itemDetailsTable}
        rowClassName={(row) => (row.isMisAdded ? styles.misAddedRow : undefined)}
        emptyMessage={Config.FieldLabels.NoItemsFound}
      />

      <div className={styles.footer}>
        <span className={styles.footerCount}>
          Total Item Lines: {rows.length}
        </span>
      </div>
    </NpdFormSectionPanel>
  );
};

export default NpdItemDetailsSection;
