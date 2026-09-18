import * as React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Config } from "../../../../External/CommonServices/Config";
import { getDefaultRoute } from "../../../../External/CommonServices/permissionService";
import { useAppSelector } from "../../../../store/hooks";
import { selectResolvedAccess } from "../../../../store/slices/appSlice";
import BrandMaterialExtensionMaster from "../admin/brandMaterialExtension/BrandMaterialExtensionMaster";
import LookupMaster from "../admin/lookup/LookupMaster";
import LookupTypeMaster from "../admin/lookupType/LookupTypeMaster";
import WorkflowConfigurationMaster from "../admin/workflowConfig/WorkflowConfigurationMaster";
import NpdDraftRework from "../npd/draftRework/NpdDraftRework";
import NpdRequestForm from "../npd/newRequest/NpdRequestForm";
import NpdRequestDashboard from "../npd/requestList/NpdRequestDashboard";
import ProtectedRoute from "./ProtectedRoute";
import RoutePlaceholder from "./RoutePlaceholder/RoutePlaceholder";
import Unauthorized from "./Unauthorized/Unauthorized";
import { ROUTE_DEFINITIONS } from "./routeDefinitions";

const IMPLEMENTED_ROUTES: Record<string, React.ReactElement> = {
  "/npd/new": <NpdRequestForm />,
  "/npd/draft-rework": <NpdDraftRework />,
  "/npd/pending": <NpdDraftRework />,
  "/npd/all": <NpdRequestDashboard variant="all" />,
  "/npd/approved": <NpdRequestDashboard variant="approved" />,
  "/admin/lookup-type": <LookupTypeMaster />,
  "/admin/lookup": <LookupMaster />,
  "/admin/brand-extension": <BrandMaterialExtensionMaster />,
  "/admin/workflow-config": <WorkflowConfigurationMaster />,
};

const AppRoutes: React.FC = () => {
  const access = useAppSelector(selectResolvedAccess);
  const homeRoute = getDefaultRoute(access);

  return (
    <Routes>
      <Route
        path={Config.Routes.Home}
        element={
          <ProtectedRoute>
            <Navigate to={homeRoute} replace />
          </ProtectedRoute>
        }
      />
      <Route path={Config.Routes.Unauthorized} element={<Unauthorized />} />
      {ROUTE_DEFINITIONS.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <ProtectedRoute>
              {IMPLEMENTED_ROUTES[route.path] ?? (
                <RoutePlaceholder
                  title={route.title}
                  description={route.description}
                />
              )}
            </ProtectedRoute>
          }
        />
      ))}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Navigate to={homeRoute} replace />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
