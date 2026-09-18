import * as React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Toast as PrimeToast } from "primereact/toast";
import { Config, FieldLabels, RequestStatus } from "../../../../../External/CommonServices/Config";
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
  getDraftStatusOptions,
  matchesNpdBrandFilter,
  matchesNpdListSearch,
  matchesNpdStatusFilter,
  uniqueBrandOptions,
} from "../requestList/npdRequestListUtils";
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
  const [searchValue, setSearchValue] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState(ALL_STATUS_VALUE);
  const [brandFilter, setBrandFilter] = React.useState(ALL_BRAND_VALUE);
  const isPendingList = location.pathname === Config.Routes.NpdPending;
  const emailRequestId = parseEditId(searchParams.get("id"));
  const emailAction = parseNpdWorkflowAction(
    searchParams.get(Config.NpdEmail.QueryAction),
  );

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
    navigate(`${Config.Routes.NpdNew}?${query.toString()}`, { replace: true });
  }, [emailAction, emailRequestId, navigate]);

  const locationState = (location.state as {
    draftSaved?: boolean;
    requestSubmitted?: boolean;
    actionSaved?: boolean;
  } | null) ?? {};

  React.useEffect(() => {
    if (initialized) {
      void dispatch(isPendingList ? fetchNpdPendingList() : fetchNpdDraftReworkList());
    }
  }, [dispatch, initialized, isPendingList, userEmail]);

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

    navigate(location.pathname, { replace: true, state: {} });
  }, [
    location.pathname,
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
  const filteredRows = sourceRows.filter(
    (item) =>
      matchesNpdStatusFilter(item.Status, statusFilter) &&
      matchesNpdBrandFilter(item.Brand, brandFilter) &&
      matchesNpdListSearch(
        [
          item.Title,
          item.ProjectName,
          item.Brand,
          item.MaterialType,
          item.Plant,
          item.Status,
        ],
        searchValue,
      ),
  );

  return (
    <section className={styles.page}>
      <Toast ref={toastRef} />
      <LoaderOverlay visible={status === "loading"} label="Loading..." />
      <NpdDraftReworkToolbar
        title={isPendingList ? "Pending Approval" : "Draft / ReWork"}
        searchId={isPendingList ? "npdPendingSearch" : "npdDraftReworkSearch"}
        searchValue={searchValue}
        searchPlaceholder="Search here"
        statusValue={statusFilter}
        statusOptions={
          isPendingList
            ? [
                { label: FieldLabels.AllStatuses, value: ALL_STATUS_VALUE },
                { label: RequestStatus.Pending, value: RequestStatus.Pending },
              ]
            : getDraftStatusOptions()
        }
        brandValue={brandFilter}
        brandOptions={uniqueBrandOptions(sourceRows.map((item) => item.Brand))}
        filtersActive={Boolean(
          searchValue.trim() ||
            statusFilter !== ALL_STATUS_VALUE ||
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
              canEditNpdListRow(row, access, userEmail || userLoginName)
            }
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

export default NpdDraftRework;
