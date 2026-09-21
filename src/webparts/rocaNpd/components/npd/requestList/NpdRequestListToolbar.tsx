import * as React from "react";
import { FieldLabels } from "../../../../../External/CommonServices/Config";
import { Button, Dropdown } from "../../common/controls";
import type { IDropdownOption } from "../../common/controls";
import { MasterToolbarSearch } from "../../common/master/MasterToolbar";
import styles from "./NpdRequestList.module.scss";

export interface INpdRequestListToolbarProps {
  title?: string;
  searchId: string;
  searchValue: string;
  searchPlaceholder?: string;
  wideSearch?: boolean;
  statusValue: string;
  statusOptions: IDropdownOption[];
  brandValue: string;
  brandOptions: IDropdownOption[];
  filtersActive: boolean;
  showExport?: boolean;
  exportDisabled?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onResetFilters: () => void;
  onExport?: () => void;
  stacked?: boolean;
}

const NpdRequestListToolbar: React.FC<INpdRequestListToolbarProps> = ({
  title,
  searchId,
  searchValue,
  searchPlaceholder,
  wideSearch = false,
  statusValue,
  statusOptions,
  brandValue,
  brandOptions,
  filtersActive,
  showExport = false,
  exportDisabled = false,
  onSearchChange,
  onStatusChange,
  onBrandChange,
  onResetFilters,
  onExport,
  stacked = false,
}) => (
  <div className={stacked ? styles.toolbarStacked : styles.toolbar}>
    {title ? <h1 className={styles.toolbarTitle}>{title}</h1> : null}
    <div className={styles.toolbarActions}>
      <MasterToolbarSearch
        id={searchId}
        searchValue={searchValue}
        placeholder={searchPlaceholder}
        wide={wideSearch}
        filtersActive={filtersActive}
        onSearchChange={onSearchChange}
        onResetFilters={onResetFilters}
      />
      <Dropdown
        id={`${searchId}Status`}
        value={statusValue}
        options={statusOptions}
        placeholder={FieldLabels.AllStatuses}
        className={styles.filterDropdown}
        onChange={(value) => onStatusChange(String(value ?? "all"))}
      />
      <Dropdown
        id={`${searchId}Brand`}
        value={brandValue}
        options={brandOptions}
        placeholder={FieldLabels.AllBrands}
        className={styles.filterDropdown}
        onChange={(value) => onBrandChange(String(value ?? "all"))}
      />
      {showExport && onExport ? (
        <Button
          label={FieldLabels.Export}
          icon="pi pi-download"
          size="sm"
          className={styles.exportButton}
          disabled={exportDisabled}
          onClick={onExport}
        />
      ) : null}
    </div>
  </div>
);

export default NpdRequestListToolbar;
