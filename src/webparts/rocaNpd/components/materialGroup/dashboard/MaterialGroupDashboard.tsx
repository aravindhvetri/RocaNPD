import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Toast as PrimeToast } from "primereact/toast";
import { Config } from "../../../../../External/CommonServices/Config";
import type { IMaterialGroupGroupedRequest } from "../../../../../External/CommonServices/Interface";
import {
  buildNavHref,
  createFormResetNavState,
} from "../../../../../External/CommonServices/navigationConfig";
import { parseViewAsRole } from "../../../../../External/CommonServices/permissionService";
import { matchesAnySearchField } from "../../../../../External/CommonServices/searchTextUtils";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import { fetchGroupedMaterialGroupRequestsThunk } from "../../../../../store/thunks/materialGroupThunks";
import {
  Button,
  LoaderOverlay,
  MasterTablePanel,
  MasterToolbarSearch,
  Toast,
} from "../../common/controls";
import { useListPageFetch } from "../../common/hooks";
import MaterialGroupTable from "./MaterialGroupTable";
import styles from "./MaterialGroupDashboard.module.scss";
import masterStyles from "../../common/master/MasterToolbar/MasterToolbar.module.scss";

export interface IMaterialGroupDashboardProps {
  variant?: "all" | "draft-rework" | "pending" | "completed";
}

const MaterialGroupDashboard: React.FC<IMaterialGroupDashboardProps> = ({
  variant = "all",
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toastRef = React.useRef<PrimeToast>(null);

  const [searchQuery, setSearchQuery] = React.useState("");

  const appState = useAppSelector((state) => state.app);
  const mgState = useAppSelector((state) => state.materialGroup);
  const viewAs =
    parseViewAsRole(searchParams.get(Config.NpdFormQuery.ViewAs)) ||
    undefined;

  const isConsultantView =
    (viewAs || "").toLowerCase() === Config.Roles.Consultant.toLowerCase() ||
    (!viewAs &&
      appState.assignedRoles.some(
        (r) => r.trim().toLowerCase() === Config.Roles.Consultant.toLowerCase(),
      ));
  const isAdminView =
    (viewAs || "").toLowerCase() === Config.Roles.Admin.toLowerCase() ||
    (!viewAs &&
      appState.assignedRoles.some(
        (r) => r.trim().toLowerCase() === Config.Roles.Admin.toLowerCase(),
      ) &&
      !isConsultantView);
  const isInitiatorView =
    (viewAs || "").toLowerCase() === Config.Roles.Initiator.toLowerCase() ||
    (!viewAs &&
      !isConsultantView &&
      !isAdminView &&
      appState.assignedRoles.some(
        (r) => r.trim().toLowerCase() === Config.Roles.Initiator.toLowerCase(),
      ));
  const showNewRequestButton = isInitiatorView && !isConsultantView && !isAdminView;

  const listFetchPending = useListPageFetch(
    () =>
      dispatch(
        fetchGroupedMaterialGroupRequestsThunk({ variant, viewRole: viewAs }),
      ),
    [dispatch, variant, viewAs],
    appState.initialized,
  );

  const title = React.useMemo(() => {
    switch (variant) {
      case "draft-rework":
        return "Draft & ReWork Requests";
      case "pending":
        return "Pending Requests";
      case "completed":
        return "Completed Requests";
      default:
        return "All Material Group Requests";
    }
  }, [variant]);

  const filteredRequests = React.useMemo(() => {
    return mgState.groupedRequests.filter((item) =>
      matchesAnySearchField(
        [
          item.requestId,
          item.initiatorName,
          item.currentApprover,
          item.status,
          ...item.configuredMasters,
        ],
        searchQuery,
      ),
    );
  }, [mgState.groupedRequests, searchQuery]);

  const appendViewAs = React.useCallback(
    (path: string): string => {
      if (!viewAs) {
        return path;
      }
      const [base, query = ""] = path.split("?");
      const params = new URLSearchParams(query);
      params.set(Config.NpdFormQuery.ViewAs, viewAs);
      return `${base}?${params.toString()}`;
    },
    [viewAs],
  );

  const handleView = React.useCallback(
    (request: IMaterialGroupGroupedRequest) => {
      navigate(
        appendViewAs(
          `${Config.Routes.MgNew}?id=${request.id}&mode=view&from=${variant}`,
        ),
      );
    },
    [appendViewAs, navigate, variant],
  );

  const handleEdit = React.useCallback(
    (request: IMaterialGroupGroupedRequest) => {
      if (
        isConsultantView &&
        request.status === Config.MaterialGroupStatus.Pending
      ) {
        navigate(
          appendViewAs(
            `${Config.Routes.MgNew}?id=${request.id}&mode=consultant-edit&from=${variant}`,
          ),
        );
      } else {
        navigate(
          appendViewAs(
            `${Config.Routes.MgNew}?id=${request.id}&mode=edit&from=${variant}`,
          ),
        );
      }
    },
    [appendViewAs, isConsultantView, navigate, variant],
  );

  const handleNewRequest = React.useCallback(() => {
    navigate(buildNavHref(Config.Routes.MgNew, viewAs), {
      state: createFormResetNavState(),
    });
  }, [navigate, viewAs]);

  return (
    <div className={styles.page}>
      <Toast ref={toastRef} />
      <LoaderOverlay
        visible={
          listFetchPending || mgState.groupedRequestsStatus === "loading"
        }
        label="Processing"
      />

      <div className={styles.toolbar}>
        <h1 className={styles.toolbarTitle}>{title}</h1>

        <div className={styles.toolbarActions}>
          <MasterToolbarSearch
            id="mgSearch"
            searchValue={searchQuery}
            placeholder="Search here"
            filtersActive={Boolean(searchQuery.trim())}
            onSearchChange={setSearchQuery}
            onResetFilters={() => setSearchQuery("")}
          />

          {showNewRequestButton && (
            <Button
              label="New Request"
              icon="pi pi-plus"
              size="sm"
              className={masterStyles.addNewButton}
              onClick={handleNewRequest}
            />
          )}
        </div>
      </div>

      <div className={styles.tablePanel}>
        <MasterTablePanel>
          <MaterialGroupTable
            requests={filteredRequests}
            loading={false}
            currentUserEmail={appState.userEmail || appState.userLoginName}
            assignedRoles={appState.assignedRoles}
            isConsultant={isConsultantView}
            isAdmin={isAdminView}
            onView={handleView}
            onEdit={handleEdit}
          />
        </MasterTablePanel>
      </div>
    </div>
  );
};

export default MaterialGroupDashboard;
