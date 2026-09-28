import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Config } from "../../../../../External/CommonServices/Config";
import { buildNavHref } from "../../../../../External/CommonServices/navigationConfig";
import {
  getDefaultNavTarget,
  getDefaultRoute,
  parseViewAsRole,
} from "../../../../../External/CommonServices/permissionService";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
import { selectResolvedAccess } from "../../../../../store/slices/appSlice";
import { setActiveNavItem } from "../../../../../store/slices/uiSlice";
import {
  findAccessibleNavItem,
  findActiveNavItemId,
} from "../SideNavigation/navActiveHelper";
import { useFilteredNavigation } from "../SideNavigation/useFilteredNavigation";

/**
 * Keeps Redux active nav item in sync with the current route and query parameters.
 * Also corrects stale `?as=` values that don't match the user's visible role sections,
 * and lands on the first All Requests tab with that item selected.
 */
const NavRouteSync: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const activeNavItemId = useAppSelector((state) => state.ui.activeNavItemId);
  const initialized = useAppSelector((state) => state.app.initialized);
  const access = useAppSelector(selectResolvedAccess);
  const navigation = useFilteredNavigation();
  const accessibleItems = React.useMemo(
    () => navigation.flatMap((section) => section.items),
    [navigation],
  );

  // Sync active nav item with the current route and query on every path change.
  React.useEffect(() => {
    const matchedId = findActiveNavItemId(
      location.pathname,
      location.search,
      accessibleItems,
    );
    if (matchedId && matchedId !== activeNavItemId) {
      dispatch(setActiveNavItem(matchedId));
    }
  }, [
    accessibleItems,
    activeNavItemId,
    dispatch,
    location.pathname,
    location.search,
  ]);

  // Once roles are resolved: default landing + fix invalid/stale `?as=` so the
  // visible All Requests (or matching) nav item is selected.
  React.useEffect(() => {
    if (!initialized) {
      return;
    }

    const isHomeOrUnauthorized =
      location.pathname === Config.Routes.Home ||
      location.pathname === Config.Routes.Unauthorized ||
      location.pathname === "/";

    const accessibleItem = findAccessibleNavItem(
      location.pathname,
      location.search,
      accessibleItems,
    );
    const hasNoNavMatch = !accessibleItem;

    const viewAs = parseViewAsRole(
      new URLSearchParams(location.search).get(Config.NpdFormQuery.ViewAs),
    );
    const needsViewAs =
      (location.pathname.startsWith("/npd/") ||
        location.pathname.startsWith("/mg/")) &&
      location.pathname !== Config.Routes.Reports;
    // Only rewrite when `?as=` is present but wrong for the visible section.
    // Missing `?as=` must not invent the first section (Initiator) after toast clear.
    const staleViewAs =
      needsViewAs &&
      Boolean(viewAs) &&
      Boolean(accessibleItem) &&
      accessibleItem?.viewRole !== viewAs;

    if (isHomeOrUnauthorized || hasNoNavMatch) {
      const defaultTarget = getDefaultNavTarget(access);
      const defaultRoute = defaultTarget?.href ?? getDefaultRoute(access);
      if (defaultRoute && defaultRoute !== Config.Routes.Unauthorized) {
        navigate(defaultRoute, { replace: true });
        if (defaultTarget?.itemId) {
          dispatch(setActiveNavItem(defaultTarget.itemId));
        } else {
          const navItemId = findActiveNavItemId(
            defaultRoute,
            undefined,
            accessibleItems,
          );
          if (navItemId) {
            dispatch(setActiveNavItem(navItemId));
          }
        }
      }
      return;
    }

    if (staleViewAs && accessibleItem) {
      const corrected = buildNavHref(
        accessibleItem.route,
        accessibleItem.viewRole,
      );
      const currentHref = `${location.pathname}${location.search || ""}`;
      if (corrected !== currentHref) {
        navigate(corrected, { replace: true });
      }
      if (accessibleItem.id !== activeNavItemId) {
        dispatch(setActiveNavItem(accessibleItem.id));
      }
    }
  }, [
    access,
    accessibleItems,
    activeNavItemId,
    dispatch,
    initialized,
    location.pathname,
    location.search,
    navigate,
  ]);

  return null;
};

export default NavRouteSync;
