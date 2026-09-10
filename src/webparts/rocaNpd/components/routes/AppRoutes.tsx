import * as React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Config } from "../../../../External/CommonServices/Config";
import RoutePlaceholder from "./RoutePlaceholder/RoutePlaceholder";
import { ROUTE_DEFINITIONS } from "./routeDefinitions";

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
          <RoutePlaceholder
            title={route.title}
            description={route.description}
          />
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
