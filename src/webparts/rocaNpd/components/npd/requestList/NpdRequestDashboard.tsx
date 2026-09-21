import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Toast as PrimeToast } from "primereact/toast";
import { FieldLabels } from "../../../../../External/CommonServices/Config";
import {
  buildExportFileName,
  exportToExcel,
} from "../../../../../External/CommonServices/exportService";
import type { INpdRequestListItemRow } from "../../../../../External/CommonServices/Interface";
import { normalizeEmail } from "../../../../../External/CommonServices/personFieldUtils";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import { selectResolvedAccess } from "../../../../../store/slices/appSlice";
import { clearNpdRequestError } from "../../../../../store/slices/npdRequestSlice";
import { fetchNpdDashboardList } from "../../../../../store/thunks/npdRequestThunks";
import {
  LoaderOverlay,
  MasterTablePanel,
  showErrorToast,
  Toast,
} from "../../common/controls";
import { buildNpdRequestFormPath, canEditNpdListRow } from "../newRequest/npdRequestFormHelpers";
import NpdRequestListTable from "./NpdRequestListTable";
import NpdRequestListToolbar from "./NpdRequestListToolbar";
import NpdRequestSummaryCards from "./NpdRequestSummaryCards";
import type { NpdRequestDashboardVariant } from "./npdRequestListUtils";
import {
  formatNpdCreatedDate,
  formatNpdStatusLabel,
  isApprovedNpdStatus,
  isDraftOrReworkNpdStatus,
  isPendingNpdStatus,
} from "./npdRequestListUtils";
import { useNpdRequestListFilters } from "./useNpdRequestListFilters";
import styles from "./NpdRequestList.module.scss";

const NpdRequestDashboard: React.FC<{ variant: NpdRequestDashboardVariant }> = ({
  variant,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const toastRef = React.useRef<PrimeToast>(null);
  const initialized = useAppSelector((state) => state.app.initialized);
  const userEmail = useAppSelector((state) => state.app.userEmail);
  const userLoginName = useAppSelector((state) => state.app.userLoginName);
  const access = useAppSelector(selectResolvedAccess);
  const { dashboardItems, status, error } = useAppSelector((state) => state.npdRequest);
  const scopedItems = React.useMemo(
    () =>
      variant === "approved"
        ? dashboardItems.filter((item) => isApprovedNpdStatus(item.Status))
        : dashboardItems,
    [dashboardItems, variant],
  );
  const filters = useNpdRequestListFilters(scopedItems, variant);

  React.useEffect(() => {
    if (initialized) {
      void dispatch(fetchNpdDashboardList());
    }
  }, [dispatch, initialized, userEmail]);

  React.useEffect(() => {
    if (error) {
      showErrorToast(toastRef, error);
      dispatch(clearNpdRequestError());
    }
  }, [dispatch, error]);

  const currentEmail = normalizeEmail(userEmail || userLoginName);
  const canEditRow = (row: INpdRequestListItemRow): boolean =>
    variant !== "approved" && canEditNpdListRow(row, access, currentEmail);

  return (
    <section className={styles.page}>
      <Toast ref={toastRef} />
      <LoaderOverlay visible={status === "loading"} label="Loading..." />
      {variant === "all" ? (
        <NpdRequestSummaryCards
          counts={{
            total: scopedItems.length,
            pending: scopedItems.filter((item) => isPendingNpdStatus(item.Status)).length,
            reworkDraft: scopedItems.filter((item) =>
              isDraftOrReworkNpdStatus(item.Status),
            ).length,
            approved: scopedItems.filter((item) => isApprovedNpdStatus(item.Status)).length,
          }}
        />
      ) : null}
      <NpdRequestListToolbar
        title={variant === "approved" ? "Approved Requests" : undefined}
        stacked={variant === "approved"}
        searchId={variant === "approved" ? "npdApprovedSearch" : "npdAllSearch"}
        searchValue={filters.searchValue}
        searchPlaceholder="Search by Request ID, Plant, Brand, Code, or Material..."
        wideSearch
        statusValue={filters.statusFilter}
        statusOptions={filters.statusOptions}
        brandValue={filters.brandFilter}
        brandOptions={filters.brandOptions}
        filtersActive={filters.filtersActive}
        showExport
        exportDisabled={!filters.filteredRows.length}
        onSearchChange={filters.setSearchValue}
        onStatusChange={filters.setStatusFilter}
        onBrandChange={filters.setBrandFilter}
        onResetFilters={filters.resetFilters}
        onExport={() =>
          exportToExcel({
            fileName: buildExportFileName(
              variant === "approved" ? "NPD_Approved_Requests" : "NPD_All_Requests",
            ),
            sheetName: variant === "approved" ? "Approved" : "All Requests",
            columns: [
              { header: FieldLabels.RequestId, value: (row) => row.Title },
              { header: FieldLabels.BrandMg1, value: (row) => row.Brand },
              { header: FieldLabels.MaterialType, value: (row) => row.MaterialType },
              { header: FieldLabels.Plant, value: (row) => row.Plant },
              { header: FieldLabels.Products, value: (row) => String(row.ProductCount) },
              {
                header: FieldLabels.Status,
                value: (row) => formatNpdStatusLabel(row.Status),
              },
              {
                header: FieldLabels.CreatedDate,
                value: (row) => formatNpdCreatedDate(row.Created),
              },
            ],
            rows: filters.filteredRows,
          })
        }
      />
      <div className={styles.tablePanel}>
        <MasterTablePanel>
          <NpdRequestListTable
            rows={filters.filteredRows}
            loading={false}
            canEditRow={canEditRow}
            onView={(row) =>
              navigate(buildNpdRequestFormPath(row.Id, "view", location.pathname))
            }
            onEdit={(row) =>
              navigate(buildNpdRequestFormPath(row.Id, "edit", location.pathname))
            }
          />
        </MasterTablePanel>
      </div>
    </section>
  );
};

export default NpdRequestDashboard;
