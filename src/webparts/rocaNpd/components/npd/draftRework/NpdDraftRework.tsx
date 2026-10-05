import * as React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Toast as PrimeToast } from "primereact/toast";
import { Config } from "../../../../../External/CommonServices/Config";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import { selectResolvedAccess } from "../../../../../store/slices/appSlice";
import { clearNpdRequestError } from "../../../../../store/slices/npdRequestSlice";
import {
  fetchNpdDraftReworkList,
  fetchNpdPendingList,
} from "../../../../../store/thunks/npdRequestThunks";
import {
  LoaderOverlay,
  MasterTablePanel,
  showErrorToast,
  showSuccessToast,
  Toast,
} from "../../common/controls";
import { useListPageFetch } from "../../common/hooks";
import NpdDraftReworkTable from "./NpdDraftReworkTable";
import NpdDraftReworkToolbar from "./NpdDraftReworkToolbar";
import {
  buildNpdRequestFormPath,
  canEditNpdListRow,
  parseEditId,
  parseNpdWorkflowAction,
} from "../newRequest/npdRequestFormHelpers";
import {
  ALL_BRAND_VALUE,
  ALL_STATUS_VALUE,
  buildNpdListSearchHaystack,
  buildStatusFilterOptionsFromData,
  matchesNpdBrandFilter,
  matchesNpdListSearch,
  matchesNpdStatusFilter,
  uniqueBrandOptions,
} from "../requestList/npdRequestListUtils";
import { fetchNpdRequestStatusChoices } from "../../../../../External/CommonServices/npdRequestStatusChoices";
import { parseViewAsRole } from "../../../../../External/CommonServices/permissionService";
import styles from "./NpdDraftRework.module.scss";

const NpdDraftRework: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toastRef = React.useRef<PrimeToast>(null);
  const initialized = useAppSelector((state) => state.app.initialized);
  const userEmail = useAppSelector((state) => state.app.userEmail);
  const userLoginName = useAppSelector((state) => state.app.userLoginName);
  const access = useAppSelector(selectResolvedAccess);
  const { draftItems, pendingItems, status, error } = useAppSelector(
    (state) => state.npdRequest,
  );
  const globalProcessing = useAppSelector((state) => state.ui.globalProcessing);
  const [searchValue, setSearchValue] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState(ALL_STATUS_VALUE);
  const [brandFilter, setBrandFilter] = React.useState(ALL_BRAND_VALUE);
  const [statusChoices, setStatusChoices] = React.useState<string[]>([]);
  const isPendingList = location.pathname === Config.Routes.NpdPending;
  const viewAs =
    parseViewAsRole(searchParams.get(Config.NpdFormQuery.ViewAs)) || undefined;
  const emailRequestId = parseEditId(searchParams.get("id"));
  const emailAction = parseNpdWorkflowAction(
    searchParams.get(Config.NpdEmail.QueryAction),
  );

  React.useEffect(() => {
    void fetchNpdRequestStatusChoices().then(setStatusChoices);
  }, []);

  React.useEffect(() => {
    if (!emailRequestId) {
      return;
    }

    const query = new URLSearchParams();
    query.set("id", String(emailRequestId));
    if (emailAction) {
      query.set(Config.NpdEmail.QueryAction, emailAction);
    }
    query.set(Config.NpdFormQuery.From, Config.NpdFormFrom.Pending);
    if (viewAs) {
      query.set(Config.NpdFormQuery.ViewAs, viewAs);
    }
    navigate(`${Config.Routes.NpdNew}?${query.toString()}`, { replace: true });
  }, [emailAction, emailRequestId, navigate, viewAs]);

  const locationState =
    (location.state as {
      draftSaved?: boolean;
      requestSubmitted?: boolean;
      actionSaved?: boolean;
    } | null) ?? {};

  const listFetchPending = useListPageFetch(
    () =>
      dispatch(
        isPendingList ? fetchNpdPendingList(viewAs) : fetchNpdDraftReworkList(viewAs),
      ),
    [dispatch, isPendingList, location.key, userEmail, viewAs],
    initialized && !globalProcessing,
  );

  React.useEffect(() => {
    setSearchValue("");
    setStatusFilter(ALL_STATUS_VALUE);
    setBrandFilter(ALL_BRAND_VALUE);
  }, [isPendingList]);

  React.useEffect(() => {
    if (locationState.draftSaved) {
      showSuccessToast(toastRef, "Draft saved successfully.");
    } else if (locationState.requestSubmitted) {
      showSuccessToast(toastRef, "Request submitted successfully.");
    } else if (locationState.actionSaved) {
      showSuccessToast(toastRef, "Request updated successfully.");
    } else {
      return;
    }

    // Keep `?as=` so multi-role users stay on the same role section (e.g. VH Pending).
    navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true, state: {} },
    );
  }, [
    location.pathname,
    location.search,
    locationState.actionSaved,
    locationState.draftSaved,
    locationState.requestSubmitted,
    navigate,
  ]);

  React.useEffect(() => {
    if (error) {
      showErrorToast(toastRef, error);
      dispatch(clearNpdRequestError());
    }
  }, [dispatch, error]);

  const sourceRows = isPendingList ? pendingItems : draftItems;
  const statusOptions = React.useMemo(
    () =>
      buildStatusFilterOptionsFromData(
        sourceRows.map((item) => item.Status),
        statusChoices,
      ),
    [sourceRows, statusChoices],
  );

  React.useEffect(() => {
    if (statusFilter === ALL_STATUS_VALUE) {
      return;
    }

    const stillValid = statusOptions.some(
      (option) =>
        String(option.value).toLowerCase() === statusFilter.toLowerCase(),
    );
    if (!stillValid) {
      setStatusFilter(ALL_STATUS_VALUE);
    }
  }, [statusFilter, statusOptions]);

  const filteredRows = sourceRows.filter(
    (item) =>
      matchesNpdStatusFilter(item.Status, statusFilter) &&
      matchesNpdBrandFilter(item.Brand, brandFilter) &&
      matchesNpdListSearch(buildNpdListSearchHaystack(item), searchValue),
  );

  return (
    <section className={styles.page}>
      <Toast ref={toastRef} />
      <LoaderOverlay
        visible={listFetchPending || status === "loading"}
        label="Processing"
      />
      <NpdDraftReworkToolbar
        title={isPendingList ? "Pending Approval" : "Draft / Rework"}
        searchId={isPendingList ? "npdPendingSearch" : "npdDraftReworkSearch"}
        searchValue={searchValue}
        searchPlaceholder="Search here"
        showStatusFilter={!isPendingList}
        statusValue={statusFilter}
        statusOptions={statusOptions}
        brandValue={brandFilter}
        brandOptions={uniqueBrandOptions(sourceRows.map((item) => item.Brand))}
        filtersActive={Boolean(
          searchValue.trim() ||
          (!isPendingList && statusFilter !== ALL_STATUS_VALUE) ||
          brandFilter !== ALL_BRAND_VALUE,
        )}
        onSearchChange={setSearchValue}
        onStatusChange={setStatusFilter}
        onBrandChange={setBrandFilter}
        onResetFilters={() => {
          setSearchValue("");
          setStatusFilter(ALL_STATUS_VALUE);
          setBrandFilter(ALL_BRAND_VALUE);
        }}
      />
      <div className={styles.tablePanel}>
        <MasterTablePanel>
          <NpdDraftReworkTable
            rows={filteredRows}
            loading={false}
            globalFilter=""
            canEditRow={(row) =>
              canEditNpdListRow(row, access, userEmail || userLoginName, viewAs)
            }
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

export default NpdDraftRework;
