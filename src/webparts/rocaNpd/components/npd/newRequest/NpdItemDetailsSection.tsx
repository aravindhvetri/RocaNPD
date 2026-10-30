import * as React from "react";
import type { ISelectOption } from "../../../../../External/CommonServices/Interface";
import { Config } from "../../../../../External/CommonServices/Config";
import { Button, DataTable } from "../../common/controls";
import NpdFormSectionPanel from "./NpdFormSectionPanel";
import {
  NpdItemDetailsActionsContext,
} from "./NpdItemDetailsActionCell";
import {
  clearLookupImportAttention,
  createEmptyNpdItemDetailRow,
  getVisibleNpdItemDetailFields,
  isEmptyItemDetailRow,
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
  onExportClick?: () => void;
  /** When false, Export is hidden (e.g. Initiator New Request). Default true. */
  showExport?: boolean;
  /** Same visibility as Other Details. */
  showSapStatus?: boolean;
}

const NpdItemDetailsSection: React.FC<INpdItemDetailsSectionProps> = ({
  brand,
  rows,
  lookupOptionsByType,
  readOnly = false,
  isMisCoordinatorActing = false,
  onRowsChange,
  onImportClick,
  onExportClick,
  showExport = true,
  showSapStatus = false,
}) => {
  const visibleFields = React.useMemo(
    () => getVisibleNpdItemDetailFields(brand),
    [brand],
  );
  const pageSize = Config.NpdItemDetailsPageSize;
  const [first, setFirst] = React.useState(0);
  const showPaginator = rows.length > pageSize;
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const allowDeleteRows = rows.length > 1;

  React.useEffect(() => {
    const maxFirst =
      rows.length === 0
        ? 0
        : Math.floor((rows.length - 1) / pageSize) * pageSize;
    setFirst((current) => (current > maxFirst ? maxFirst : current));
  }, [pageSize, rows.length]);

  /**
   * Tabbing into off-screen Item Details cells makes the browser scroll overflow:hidden
   * ancestors horizontally, which clips the form layout. Keep sideways scroll only inside
   * the DataTable wrapper and reset every other ancestor.
   */
  React.useEffect(() => {
    const root = sectionRef.current;
    if (!root) {
      return undefined;
    }

    const resetAncestorHorizontalScroll = (wrapper: HTMLElement): void => {
      let node: HTMLElement | null = wrapper.parentElement;
      while (node) {
        if (node.scrollLeft !== 0) {
          node.scrollLeft = 0;
        }
        node = node.parentElement;
      }
      if (document.documentElement.scrollLeft) {
        document.documentElement.scrollLeft = 0;
      }
      if (document.body.scrollLeft) {
        document.body.scrollLeft = 0;
      }
    };

    const scrollFocusedCellIntoWrapper = (
      wrapper: HTMLElement,
      target: HTMLElement,
    ): void => {
      const focusEl =
        (target.closest("td") as HTMLElement | null) ?? target;
      const focusRect = focusEl.getBoundingClientRect();
      const wrapRect = wrapper.getBoundingClientRect();
      const pad = 12;

      if (focusRect.right > wrapRect.right - pad) {
        wrapper.scrollLeft += focusRect.right - wrapRect.right + pad;
      } else if (focusRect.left < wrapRect.left + pad) {
        wrapper.scrollLeft -= wrapRect.left - focusRect.left + pad;
      }
    };

    const handleFocusIn = (event: FocusEvent): void => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !root.contains(target)) {
        return;
      }

      const wrapper = root.querySelector(
        ".p-datatable-wrapper",
      ) as HTMLElement | null;
      if (!wrapper || !wrapper.contains(target)) {
        return;
      }

      resetAncestorHorizontalScroll(wrapper);
      requestAnimationFrame(() => {
        resetAncestorHorizontalScroll(wrapper);
        scrollFocusedCellIntoWrapper(wrapper, target);
      });
    };

    root.addEventListener("focusin", handleFocusIn);
    return () => root.removeEventListener("focusin", handleFocusIn);
  }, []);

  const handleAddItem = React.useCallback(
    (afterRowId?: string) => {
      if (readOnly) {
        return;
      }
      const misActing = Boolean(isMisCoordinatorActing);
      onRowsChange((currentRows) => {
        const newRow = createEmptyNpdItemDetailRow(misActing);
        // MIS Coordinator lines always appear at the top of the grid.
        if (misActing) {
          return [newRow, ...currentRows];
        }
        if (!afterRowId) {
          return [...currentRows, newRow];
        }
        const index = currentRows.findIndex((r) => r.id === afterRowId);
        if (index === -1) {
          return [...currentRows, newRow];
        }
        const updated = [...currentRows];
        updated.splice(index + 1, 0, newRow);
        return updated;
      });
      setFirst(misActing ? 0 : Math.floor(rows.length / pageSize) * pageSize);
    },
    [isMisCoordinatorActing, onRowsChange, pageSize, readOnly, rows.length],
  );

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
        currentRows.map((row) => {
          if (row.id !== rowId) {
            return row;
          }
          return clearLookupImportAttention(
            { ...row, [field]: value },
            field,
            value,
          );
        }),
      );
    },
    [onRowsChange, readOnly],
  );

  const handleDeleteRow = React.useCallback(
    (rowId: string) => {
      if (readOnly) {
        return;
      }
      onRowsChange((currentRows) => {
        const filtered = currentRows.filter((row) => row.id !== rowId);
        return filtered.length > 0
          ? filtered
          : [createEmptyNpdItemDetailRow(Boolean(isMisCoordinatorActing))];
      });
    },
    [isMisCoordinatorActing, onRowsChange, readOnly],
  );

  const handleBulkDeleteRows = React.useCallback(() => {
    if (readOnly) {
      return;
    }
    onRowsChange([createEmptyNpdItemDetailRow(Boolean(isMisCoordinatorActing))]);
    setFirst(0);
  }, [isMisCoordinatorActing, onRowsChange, readOnly]);

  const handleAddRowFromActions = React.useCallback(
    (rowId: string) => {
      handleAddItem(rowId);
    },
    [handleAddItem],
  );

  const actionsContextValue = React.useMemo(
    () => ({
      allowDeleteRows,
      onAddRow: handleAddRowFromActions,
      onDeleteRow: handleDeleteRow,
    }),
    [allowDeleteRows, handleAddRowFromActions, handleDeleteRow],
  );

  const columns = useNpdItemDetailsColumns({
    visibleFields,
    allowDeleteRows,
    lookupOptionsByType,
    readOnly,
    showSapStatus,
    onFieldChange: handleFieldChange,
  });

  const hasExportableRows = rows.some((row) => !isEmptyItemDetailRow(row));

  const exportButton = showExport ? (
    <Button
      label={Config.Export}
      icon="pi pi-download"
      size="xs"
      className={styles.headerExportButton}
      disabled={!hasExportableRows}
      onClick={onExportClick}
    />
  ) : null;

  // View mode: Export only (no Add / Import / Delete). Edit: full actions.
  const headerActions = readOnly ? (
    exportButton
  ) : (
    <>
      <Button
        label={Config.Add}
        icon="pi pi-plus"
        size="xs"
        className={styles.headerAddButton}
        onClick={() => handleAddItem()}
      />
      <Button
        label={Config.Import}
        icon="pi pi-download"
        size="xs"
        className={styles.headerImportButton}
        onClick={onImportClick}
      />
      {exportButton}
      <Button
        label={Config.Delete}
        icon="pi pi-trash"
        size="xs"
        title="Delete all item lines"
        aria-label="Delete all item lines"
        className={styles.headerDeleteButton}
        onClick={handleBulkDeleteRows}
      />
    </>
  );

  return (
    <div ref={sectionRef} className={styles.sectionHost}>
      <NpdFormSectionPanel
        title="Item Details"
        actions={headerActions}
        className={styles.sectionPanel}
        bodyClassName={styles.sectionBody}
      >
        <NpdItemDetailsActionsContext.Provider value={actionsContextValue}>
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
            rowClassName={(row) =>
              row.isMisAdded ? styles.misAddedRow : undefined
            }
            emptyMessage={Config.FieldLabels.NoItemsFound}
          />
        </NpdItemDetailsActionsContext.Provider>

        <div className={styles.footer}>
          <span className={styles.footerCount}>
            Total Item Lines: {rows.length}
          </span>
        </div>
      </NpdFormSectionPanel>
    </div>
  );
};

export default NpdItemDetailsSection;
