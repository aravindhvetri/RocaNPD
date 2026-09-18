import * as React from "react";
import { RequestStatus } from "../../../../../External/CommonServices/Config";
import type { INpdRequestListItemRow } from "../../../../../External/CommonServices/Interface";
import {
  ALL_BRAND_VALUE,
  ALL_STATUS_VALUE,
  getDashboardStatusOptions,
  matchesNpdBrandFilter,
  matchesNpdListSearch,
  matchesNpdStatusFilter,
  uniqueBrandOptions,
} from "./npdRequestListUtils";
import type { NpdRequestDashboardVariant } from "./npdRequestListUtils";

export function useNpdRequestListFilters(
  items: INpdRequestListItemRow[],
  variant: NpdRequestDashboardVariant,
) {
  const [searchValue, setSearchValue] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState(ALL_STATUS_VALUE);
  const [brandFilter, setBrandFilter] = React.useState(ALL_BRAND_VALUE);

  React.useEffect(() => {
    setSearchValue("");
    setStatusFilter(
      variant === "approved" ? RequestStatus.Approved : ALL_STATUS_VALUE,
    );
    setBrandFilter(ALL_BRAND_VALUE);
  }, [variant]);

  const filteredRows = items.filter(
    (item) =>
      matchesNpdStatusFilter(item.Status, statusFilter) &&
      matchesNpdBrandFilter(item.Brand, brandFilter) &&
      matchesNpdListSearch(
        [
          item.Title,
          item.ProjectName,
          item.Brand,
          item.MaterialType,
          item.Plant,
          item.Status,
        ],
        searchValue,
      ),
  );

  return {
    searchValue,
    setSearchValue,
    statusFilter,
    setStatusFilter,
    brandFilter,
    setBrandFilter,
    filteredRows,
    brandOptions: uniqueBrandOptions(items.map((item) => item.Brand)),
    statusOptions: getDashboardStatusOptions(),
    filtersActive: Boolean(
      searchValue.trim() ||
        (variant === "all" && statusFilter !== ALL_STATUS_VALUE) ||
        brandFilter !== ALL_BRAND_VALUE,
    ),
    resetFilters: () => {
      setSearchValue("");
      setStatusFilter(
        variant === "approved" ? RequestStatus.Approved : ALL_STATUS_VALUE,
      );
      setBrandFilter(ALL_BRAND_VALUE);
    },
  };
}
