import * as React from "react";
import { Toast as PrimeToast } from "primereact/toast";
import {
  buildExportFileName,
  exportToExcel,
} from "../../../../../External/CommonServices/exportService";
import type { IMaterialMasterRow } from "../../../../../External/CommonServices/Interface";
import {
  buildMaterialMasterInitiatorOptions,
  filterMaterialMasterByTab,
  filterMaterialMasterRows,
  formatMaterialMasterCreatedDate,
  getVisibleMaterialMasterColumns,
  type MaterialMasterTab,
} from "../../../../../External/CommonServices/materialMasterService";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import {
  clearMaterialMasterError,
  fetchMaterialMasterCatalogThunk,
} from "../../../../../store/slices/materialMasterSlice";
import {
  LoaderOverlay,
  MasterTablePanel,
  showErrorToast,
  Toast,
} from "../../common/controls";
import { useListPageFetch } from "../../common/hooks";
import MaterialMasterTable from "./MaterialMasterTable";
import MaterialMasterToolbar from "./MaterialMasterToolbar";
import styles from "./MaterialMaster.module.scss";

const MaterialMaster: React.FC = () => {
  const dispatch = useAppDispatch();
  const toastRef = React.useRef<PrimeToast>(null);
  const initialized = useAppSelector((state) => state.app.initialized);
  const { items, status, error } = useAppSelector(
    (state) => state.materialMaster,
  );

  const [tab, setTab] = React.useState<MaterialMasterTab>("existing");
  const [searchValue, setSearchValue] = React.useState("");
  const [createdFrom, setCreatedFrom] = React.useState<Date | null>(null);
  const [createdTo, setCreatedTo] = React.useState<Date | null>(null);
  const [initiatorFilter, setInitiatorFilter] = React.useState("all");
  const [isExporting, setIsExporting] = React.useState(false);

  // Load the full catalog once; Existing/New tabs and filters are local only.
  const listFetchPending = useListPageFetch(
    () => dispatch(fetchMaterialMasterCatalogThunk()),
    [dispatch],
    initialized,
  );

  React.useEffect(() => {
    if (error) {
      showErrorToast(toastRef, error);
      dispatch(clearMaterialMasterError());
    }
  }, [dispatch, error]);

  const tabRows = React.useMemo(
    () => filterMaterialMasterByTab(items, tab),
    [items, tab],
  );

  const initiatorOptions = React.useMemo(
    () => buildMaterialMasterInitiatorOptions(tabRows),
    [tabRows],
  );

  const visibleColumns = React.useMemo(
    () => getVisibleMaterialMasterColumns(tab, tabRows),
    [tab, tabRows],
  );

  const filteredRows = React.useMemo(
    () =>
      filterMaterialMasterRows({
        rows: items,
        tab,
        search: searchValue,
        createdFrom,
        createdTo,
        initiator: initiatorFilter,
      }),
    [createdFrom, createdTo, initiatorFilter, items, searchValue, tab],
  );

  React.useEffect(() => {
    // Keep Initiator filter valid when switching tabs.
    if (initiatorFilter === "all") {
      return;
    }
    const stillValid = initiatorOptions.some(
      (option) =>
        String(option.value).toLowerCase() === initiatorFilter.toLowerCase(),
    );
    if (!stillValid) {
      setInitiatorFilter("all");
    }
  }, [initiatorFilter, initiatorOptions]);

  const resetFilters = (): void => {
    setSearchValue("");
    setCreatedFrom(null);
    setCreatedTo(null);
    setInitiatorFilter("all");
  };

  const handleExport = (): void => {
    if (!filteredRows.length) {
      return;
    }

    setIsExporting(true);
    window.setTimeout(() => {
      try {
        exportToExcel({
          fileName: buildExportFileName(
            tab === "existing"
              ? "Material_Master_Existing"
              : "Material_Master_New",
          ),
          sheetName: tab === "existing" ? "Existing" : "New",
          columns: visibleColumns.map((column) => ({
            header: column.header,
            value: (row: IMaterialMasterRow) => {
              if (column.field === "Created") {
                return formatMaterialMasterCreatedDate(row.Created);
              }
              return String(row[column.field] ?? "");
            },
          })),
          rows: filteredRows,
        });
      } catch {
        showErrorToast(toastRef, "Failed to export Material Master records.");
      } finally {
        setIsExporting(false);
      }
    }, 0);
  };

  return (
    <section className={styles.page}>
      <Toast ref={toastRef} />
      <LoaderOverlay
        visible={
          listFetchPending || status === "loading" || isExporting
        }
        label="Processing"
      />

      <MaterialMasterToolbar
        searchValue={searchValue}
        createdFrom={createdFrom}
        createdTo={createdTo}
        initiatorValue={initiatorFilter}
        initiatorOptions={initiatorOptions}
        exportDisabled={!filteredRows.length || isExporting}
        onSearchChange={setSearchValue}
        onCreatedFromChange={setCreatedFrom}
        onCreatedToChange={setCreatedTo}
        onInitiatorChange={setInitiatorFilter}
        onResetFilters={resetFilters}
        onExport={handleExport}
      />

      <div className={styles.tabs} role="tablist" aria-label="Material Master tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "existing"}
          className={`${styles.tab} ${tab === "existing" ? styles.tabActive : ""}`}
          onClick={() => setTab("existing")}
        >
          Existing
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "new"}
          className={`${styles.tab} ${tab === "new" ? styles.tabActive : ""}`}
          onClick={() => setTab("new")}
        >
          New
        </button>
      </div>

      <div className={styles.tablePanel}>
        <MasterTablePanel>
          <MaterialMasterTable
            rows={filteredRows}
            columns={visibleColumns}
            loading={false}
          />
        </MasterTablePanel>
      </div>
    </section>
  );
};

export default MaterialMaster;
