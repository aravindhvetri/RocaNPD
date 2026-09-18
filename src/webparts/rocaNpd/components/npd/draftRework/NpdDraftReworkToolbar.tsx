import * as React from "react";
import type { IDropdownOption } from "../../common/controls";
import NpdRequestListToolbar from "../requestList/NpdRequestListToolbar";

export interface INpdDraftReworkToolbarProps {
  title: string;
  searchId: string;
  searchValue: string;
  searchPlaceholder?: string;
  statusValue: string;
  statusOptions: IDropdownOption[];
  brandValue: string;
  brandOptions: IDropdownOption[];
  filtersActive?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onResetFilters: () => void;
}

const NpdDraftReworkToolbar: React.FC<INpdDraftReworkToolbarProps> = (props) => (
  <NpdRequestListToolbar
    title={props.title}
    searchId={props.searchId}
    searchValue={props.searchValue}
    searchPlaceholder={props.searchPlaceholder ?? "Search here"}
    statusValue={props.statusValue}
    statusOptions={props.statusOptions}
    brandValue={props.brandValue}
    brandOptions={props.brandOptions}
    filtersActive={Boolean(props.filtersActive)}
    onSearchChange={props.onSearchChange}
    onStatusChange={props.onStatusChange}
    onBrandChange={props.onBrandChange}
    onResetFilters={props.onResetFilters}
  />
);

export default NpdDraftReworkToolbar;
