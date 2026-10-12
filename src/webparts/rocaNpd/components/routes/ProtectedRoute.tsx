import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Config } from "../../../../External/CommonServices/Config";
import {
  canAccessRoute,
  getDefaultRoute,
} from "../../../../External/CommonServices/permissionService";
import { useAppSelector } from "../../../../store/hooks";
import { selectResolvedAccess } from "../../../../store/slices/appSlice";
import { LoaderOverlay } from "../common/controls";

export interface IProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<IProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const initialized = useAppSelector((state) => state.app.initialized);
  const roleStatus = useAppSelector((state) => state.app.roleStatus);
  const access = useAppSelector(selectResolvedAccess);

  if (!initialized || roleStatus === "loading") {
    return <LoaderOverlay visible label="Processing" />;
  }

  // Rework email links open /npd/new or /mg/new with id. Let the form load so
  // it can show the Initiator-access toast. Route role checks would otherwise
  // send a former Initiator to Unauthorized before that message appears.
  const emailFormId = new URLSearchParams(location.search).get("id");
  const isEmailFormDeepLink =
    Boolean(emailFormId) &&
    (location.pathname === Config.Routes.NpdNew ||
      location.pathname === Config.Routes.MgNew);

  if (!access.assignedRoles.length && !isEmailFormDeepLink) {
    if (location.pathname === Config.Routes.Unauthorized) {
      return children;
    }
    return <Navigate to={Config.Routes.Unauthorized} replace />;
  }

  if (location.pathname === Config.Routes.Home) {
    return <Navigate to={getDefaultRoute(access)} replace />;
  }

  if (!canAccessRoute(access, location.pathname) && !isEmailFormDeepLink) {
    return <Navigate to={Config.Routes.Unauthorized} replace />;
  }

  return children;
};

export default ProtectedRoute;
