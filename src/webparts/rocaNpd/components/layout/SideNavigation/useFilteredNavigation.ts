import * as React from "react";
import { Config } from "../../../../../External/CommonServices/Config";
import type { INavSectionConfig } from "../../../../../External/CommonServices/navigationConfig";
import { filterNavigationByRoles } from "../../../../../External/CommonServices/permissionService";
import { useAppSelector } from "../../../../../store/hooks";
import { selectResolvedAccess } from "../../../../../store/slices/appSlice";

export function useFilteredNavigation(): INavSectionConfig[] {
  const access = useAppSelector(selectResolvedAccess);

  return React.useMemo(
    () => filterNavigationByRoles(Config.Navigation, access),
    [access],
  );
}
