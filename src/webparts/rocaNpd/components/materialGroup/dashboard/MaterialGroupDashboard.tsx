import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Toast as PrimeToast } from "primereact/toast";
import { Config } from "../../../../../External/CommonServices/Config";
import type { IMaterialGroupGroupedRequest } from "../../../../../External/CommonServices/Interface";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import { fetchGroupedMaterialGroupRequestsThunk } from "../../../../../store/thunks/materialGroupThunks";
import {
  Button,
  LoaderOverlay,
  MasterTablePanel,
  MasterToolbarSearch,
  Toast,
} from "../../common/controls";
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
  const toastRef = React.useRef<PrimeToast>(null);

  const [searchQuery, setSearchQuery] = React.useState("");

  const appState = useAppSelector((state) => state.app);
  const mgState = useAppSelector((state) => state.materialGroup);

  const isConsultant = appState.assignedRoles.some(
    (r) => r.trim().toLowerCase() === Config.Roles.Consultant.toLowerCase(),
  );
  const isAdmin = appState.assignedRoles.some(
    (r) => r.trim().toLowerCase() === Config.Roles.Admin.toLowerCase(),
  );
  const isInitiator = appState.assignedRoles.some(
    (r) => r.trim().toLowerCase() === Config.Roles.Initiator.toLowerCase(),
  );
  const showNewRequestButton = isInitiator && !isConsultant;

  React.useEffect(() => {
    if (appState.initialized) {
      void dispatch(fetchGroupedMaterialGroupRequestsThunk({ variant }));
    }
  }, [appState.initialized, dispatch, variant]);

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
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return mgState.groupedRequests;
    }

    return mgState.groupedRequests.filter((item) => {
      const matchId = (item.requestId || "").toLowerCase().includes(q);
      const matchInitiator = (item.initiatorName || "").toLowerCase().includes(q);
      const matchStatus = (item.status || "").toLowerCase().includes(q);
      const matchMasters = item.configuredMasters.some((m) =>
        m.toLowerCase().includes(q),
      );
      return matchId || matchInitiator || matchStatus || matchMasters;
    });
  }, [mgState.groupedRequests, searchQuery]);

  const handleView = React.useCallback(
    (request: IMaterialGroupGroupedRequest) => {
      navigate(`${Config.Routes.MgNew}?id=${request.id}&mode=view`);
    },
    [navigate],
  );

  const handleEdit = React.useCallback(
    (request: IMaterialGroupGroupedRequest) => {
      if (isConsultant && request.status === Config.MaterialGroupStatus.Pending) {
        navigate(
          `${Config.Routes.MgNew}?id=${request.id}&mode=consultant-edit`,
        );
      } else {
        navigate(`${Config.Routes.MgNew}?id=${request.id}&mode=edit`);
      }
    },
    [isConsultant, navigate],
  );

  const handleNewRequest = React.useCallback(() => {
    navigate(Config.Routes.MgNew);
  }, [navigate]);

  return (
    <div className={styles.page}>
      <Toast ref={toastRef} />
      <LoaderOverlay
        visible={mgState.groupedRequestsStatus === "loading"}
        label="Loading requests..."
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
            isConsultant={isConsultant}
            isAdmin={isAdmin}
            onView={handleView}
            onEdit={handleEdit}
          />
        </MasterTablePanel>
      </div>
    </div>
  );
};

export default MaterialGroupDashboard;
