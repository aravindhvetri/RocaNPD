import * as React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Config } from "../../../../External/CommonServices/Config";
import BrandMaterialExtensionMaster from "../admin/brandMaterialExtension/BrandMaterialExtensionMaster";
import LookupMaster from "../admin/lookup/LookupMaster";
import LookupTypeMaster from "../admin/lookupType/LookupTypeMaster";
import WorkflowConfigurationMaster from "../admin/workflowConfig/WorkflowConfigurationMaster";
import NpdRequestForm from "../npd/newRequest/NpdRequestForm";
import RoutePlaceholder from "./RoutePlaceholder/RoutePlaceholder";
import { ROUTE_DEFINITIONS } from "./routeDefinitions";

const IMPLEMENTED_ROUTES: Record<string, React.ReactElement> = {
  "/npd/new": <NpdRequestForm />,
  "/admin/lookup-type": <LookupTypeMaster />,
  "/admin/lookup": <LookupMaster />,
  "/admin/brand-extension": <BrandMaterialExtensionMaster />,
  "/admin/workflow-config": <WorkflowConfigurationMaster />,
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route
      path={Config.Routes.Home}
      element={<Navigate to={Config.Routes.NpdAll} replace />}
    />
    {ROUTE_DEFINITIONS.map((route) => (
      <Route
        key={route.path}
        path={route.path}
        element={
          IMPLEMENTED_ROUTES[route.path] ?? (
            <RoutePlaceholder
              title={route.title}
              description={route.description}
            />
          )
        }
      />
    ))}
    <Route
      path="*"
      element={<Navigate to={Config.Routes.NpdAll} replace />}
    />
  </Routes>
);

export default AppRoutes;
