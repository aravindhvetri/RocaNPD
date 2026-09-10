import * as React from "react";
import { useLocation } from "react-router-dom";
import { NAV_SECTIONS } from "../../../../../External/CommonServices/navigationConfig";
import { useAppDispatch, useAppSelector } from "../../../../../store/hooks";
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

/** Keeps Redux active nav item in sync with the current route. */
const NavRouteSync: React.FC = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const activeNavItemId = useAppSelector((state) => state.ui.activeNavItemId);

  React.useEffect(() => {
    const matchedId = findNavItemIdByPath(location.pathname);
    if (matchedId && matchedId !== activeNavItemId) {
      dispatch(setActiveNavItem(matchedId));
    }
  }, [location.pathname, activeNavItemId, dispatch]);

  return null;
};

export default NavRouteSync;
