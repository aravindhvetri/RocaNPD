import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Config } from "../../../../../External/CommonServices/Config";
import { NAV_SECTIONS } from "../../../../../External/CommonServices/navigationConfig";
import {
  getDefaultRoute,
} from "../../../../../External/CommonServices/permissionService";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import { selectResolvedAccess } from "../../../../../store/slices/appSlice";
import { setActiveNavItem } from "../../../../../store/slices/uiSlice";

const findNavItemIdByPath = (pathname: string): string | undefined => {
  for (const section of NAV_SECTIONS) {
    const match = section.items.find((item) => item.route === pathname);
    if (match) {
      return match.id;
    }
  }
  return undefined;
};

/**
 * Keeps Redux active nav item in sync with the current route.
 *
 * On every location change, it maps the pathname to a nav item ID and
 * dispatches setActiveNavItem so the sidebar highlights the correct item.
 *
 * On initial load (once roles are resolved), if the user is sitting on "/" or
 * "/unauthorized" (e.g. because no previous route was loaded yet), it
 * navigates them to the correct default route based on their access — ensuring
 * they never see "Access denied" simply because of the initial page load.
 */
const NavRouteSync: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const activeNavItemId = useAppSelector((state) => state.ui.activeNavItemId);
  const initialized = useAppSelector((state) => state.app.initialized);
  const access = useAppSelector(selectResolvedAccess);

  // Sync active nav item with the current route on every path change.
  React.useEffect(() => {
    const matchedId = findNavItemIdByPath(location.pathname);
    if (matchedId && matchedId !== activeNavItemId) {
      dispatch(setActiveNavItem(matchedId));
    }
  }, [location.pathname, activeNavItemId, dispatch]);

  // Once roles are fully resolved, if the user is on the home or unauthorized
  // page without a valid nav-item match, redirect to their correct default route.
  // This covers the case where the user opens the app fresh (no hash/path) or
  // was redirected to /unauthorized before roles finished loading.
  React.useEffect(() => {
    if (!initialized) {
      return;
    }

    const isHomeOrUnauthorized =
      location.pathname === Config.Routes.Home ||
      location.pathname === Config.Routes.Unauthorized ||
      location.pathname === "/";

    const hasNoNavMatch = !findNavItemIdByPath(location.pathname);

    if (isHomeOrUnauthorized || hasNoNavMatch) {
      const defaultRoute = getDefaultRoute(access);
      if (defaultRoute && defaultRoute !== Config.Routes.Unauthorized) {
        const navItemId = findNavItemIdByPath(defaultRoute);
        navigate(defaultRoute, { replace: true });
        if (navItemId) {
          dispatch(setActiveNavItem(navItemId));
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, access]);

  return null;
};

export default NavRouteSync;
