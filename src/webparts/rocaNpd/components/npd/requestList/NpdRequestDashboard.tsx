import * as React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Toast as PrimeToast } from "primereact/toast";
import { Config, FieldLabels } from "../../../../../External/CommonServices/Config";
import {
  buildExportFileName,
  exportToExcel,
} from "../../../../../External/CommonServices/exportService";
import type { INpdRequestListItemRow } from "../../../../../External/CommonServices/Interface";
import { parseViewAsRole } from "../../../../../External/CommonServices/permissionService";
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
import { useListPageFetch } from "../../common/hooks";
import { buildNpdRequestFormPath, canEditNpdListRow } from "../newRequest/npdRequestFormHelpers";
import NpdRequestListTable from "./NpdRequestListTable";
import NpdRequestListToolbar from "./NpdRequestListToolbar";
import NpdRequestSummaryCards from "./NpdRequestSummaryCards";
import type { NpdRequestDashboardVariant } from "./npdRequestListUtils";
import {
  formatNpdCreatedDate,
  formatNpdStatusLabel,
  isApprovedNpdStatus,
  isDraftNpdStatus,
  isDraftOrReworkNpdStatus,
  isNpdApprovedListItem,
  isPendingNpdStatus,
  isReworkNpdStatus,
} from "./npdRequestListUtils";
import { useNpdRequestListFilters } from "./useNpdRequestListFilters";
import styles from "./NpdRequestList.module.scss";

const NpdRequestDashboard: React.FC<{ variant: NpdRequestDashboardVariant }> = ({
  variant,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toastRef = React.useRef<PrimeToast>(null);
  const initialized = useAppSelector((state) => state.app.initialized);
  const userEmail = useAppSelector((state) => state.app.userEmail);
  const userLoginName = useAppSelector((state) => state.app.userLoginName);
  const access = useAppSelector(selectResolvedAccess);
  const { dashboardItems, status, error } = useAppSelector((state) => state.npdRequest);
  const viewAs =
    parseViewAsRole(searchParams.get(Config.NpdFormQuery.ViewAs)) ||
    undefined;
  const isInitiatorModuleView =
    (viewAs || "").toLowerCase() === Config.Roles.Initiator.toLowerCase();
  const isAdminModuleView =
    (viewAs || "").toLowerCase() === Config.Roles.Admin.toLowerCase();
  const scopedItems = React.useMemo(() => {
    let items = dashboardItems;
    // Drafts stay on Initiator All Requests only — never Admin / VH / MIS All.
    if (variant === "all" && !isInitiatorModuleView) {
      items = items.filter((item) => !isDraftNpdStatus(item.Status));
    }
    if (variant === "approved") {
      // VH Approved includes Pending-with-MIS after VH Approve; others stay fully Approved only.
      items = items.filter((item) => isNpdApprovedListItem(item, viewAs));
    }
    return items;
  }, [dashboardItems, isInitiatorModuleView, variant, viewAs]);
  const filters = useNpdRequestListFilters(scopedItems, variant);
  const [isExporting, setIsExporting] = React.useState(false);

  const listFetchPending = useListPageFetch(
    () => dispatch(fetchNpdDashboardList(viewAs)),
    [dispatch, userEmail, viewAs],
    initialized,
  );

  React.useEffect(() => {
    if (error) {
      showErrorToast(toastRef, error);
      dispatch(clearNpdRequestError());
    }
  }, [dispatch, error]);

  const currentEmail = normalizeEmail(userEmail || userLoginName);
  const canEditRow = (row: INpdRequestListItemRow): boolean =>
    variant !== "approved" &&
    canEditNpdListRow(row, access, currentEmail, viewAs);

  const handleExport = (): void => {
    if (!filters.filteredRows.length) {
      return;
    }

    setIsExporting(true);
    window.setTimeout(() => {
      try {
        exportToExcel({
          fileName: buildExportFileName("NPD_All_Requests"),
          sheetName: "All Requests",
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
        });
      } catch {
        showErrorToast(toastRef, "Failed to export requests.");
      } finally {
        setIsExporting(false);
      }
    }, 0);
  };

  return (
    <section className={styles.page}>
      <Toast ref={toastRef} />
      <LoaderOverlay
        visible={listFetchPending || status === "loading" || isExporting}
        label="Processing"
      />
      {variant === "all" ? (
        <NpdRequestSummaryCards
          reworkCardLabel={isAdminModuleView ? "In Rework" : "In Rework / Drafts"}
          counts={{
            total: scopedItems.length,
            pending: scopedItems.filter((item) => isPendingNpdStatus(item.Status)).length,
            reworkDraft: scopedItems.filter((item) =>
              isAdminModuleView
                ? isReworkNpdStatus(item.Status)
                : isDraftOrReworkNpdStatus(item.Status),
            ).length,
            approved: scopedItems.filter((item) => isApprovedNpdStatus(item.Status)).length,
          }}
        />
      ) : null}
      <NpdRequestListToolbar
        title={variant === "approved" ? "Approved Requests" : undefined}
        stacked={false}
        searchId={variant === "approved" ? "npdApprovedSearch" : "npdAllSearch"}
        searchValue={filters.searchValue}
        searchPlaceholder={variant === "approved" ? "Search here" : "Search by Request ID, Plant, Brand, Code, or Material..."}
        wideSearch={variant === "all"}
        showStatusFilter={variant !== "approved"}
        statusValue={filters.statusFilter}
        statusOptions={filters.statusOptions}
        brandValue={filters.brandFilter}
        brandOptions={filters.brandOptions}
        filtersActive={filters.filtersActive}
        showExport={variant === "all"}
        exportDisabled={!filters.filteredRows.length || isExporting}
        onSearchChange={filters.setSearchValue}
        onStatusChange={filters.setStatusFilter}
        onBrandChange={filters.setBrandFilter}
        onResetFilters={filters.resetFilters}
        onExport={handleExport}
      />
      <div className={styles.tablePanel}>
        <MasterTablePanel>
          <NpdRequestListTable
            rows={filters.filteredRows}
            loading={false}
            canEditRow={canEditRow}
            onView={(row) =>
              navigate(
                buildNpdRequestFormPath(
                  row.Id,
                  "view",
                  location.pathname,
                  viewAs,
                ),
              )
            }
            onEdit={(row) =>
              navigate(
                buildNpdRequestFormPath(
                  row.Id,
                  "edit",
                  location.pathname,
                  viewAs,
                ),
              )
            }
          />
        </MasterTablePanel>
      </div>
    </section>
  );
};

export default NpdRequestDashboard;
