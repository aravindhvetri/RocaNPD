import * as React from "react";
import { RequestStatus } from "../../../../../External/CommonServices/Config";
import { fetchNpdRequestStatusChoices } from "../../../../../External/CommonServices/npdRequestStatusChoices";
import type { INpdRequestListItemRow } from "../../../../../External/CommonServices/Interface";
import {
  ALL_BRAND_VALUE,
  ALL_STATUS_VALUE,
  buildStatusFilterOptionsFromData,
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
  const [statusChoices, setStatusChoices] = React.useState<string[]>([]);

  React.useEffect(() => {
    void fetchNpdRequestStatusChoices().then(setStatusChoices);
  }, []);

  React.useEffect(() => {
    setSearchValue("");
    setStatusFilter(
      variant === "approved" ? RequestStatus.Approved : ALL_STATUS_VALUE,
    );
    setBrandFilter(ALL_BRAND_VALUE);
  }, [variant]);

  const statusOptions = React.useMemo(
    () =>
      buildStatusFilterOptionsFromData(
        items.map((item) => item.Status),
        statusChoices,
      ),
    [items, statusChoices],
  );

  React.useEffect(() => {
    if (statusFilter === ALL_STATUS_VALUE) {
      return;
    }

    const stillValid = statusOptions.some(
      (option) =>
        String(option.value).toLowerCase() === statusFilter.toLowerCase(),
    );
    if (!stillValid) {
      setStatusFilter(
        variant === "approved" ? RequestStatus.Approved : ALL_STATUS_VALUE,
      );
    }
  }, [statusFilter, statusOptions, variant]);

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
    statusOptions,
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
