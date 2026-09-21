import * as React from "react";
import { Button } from "../../common/controls";
import { MasterToolbarSearch } from "../../common/master/MasterToolbar";
import styles from "../../common/master/MasterToolbar/MasterToolbar.module.scss";

export interface ILookupToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onResetFilters: () => void;
  filtersActive?: boolean;
  exportDisabled?: boolean;
  onImport: () => void;
  onExport: () => void;
  onAddNew: () => void;
}

const LookupToolbar: React.FC<ILookupToolbarProps> = ({
  searchValue,
  onSearchChange,
  onResetFilters,
  filtersActive = false,
  exportDisabled = false,
  onImport,
  onExport,
  onAddNew,
}) => (
  <div className={styles.toolbar}>
    <h1 className={styles.title}>Lookup</h1>

    <div className={styles.actions}>
      <MasterToolbarSearch
        id="lookupSearch"
        searchValue={searchValue}
        filtersActive={filtersActive}
        onSearchChange={onSearchChange}
        onResetFilters={onResetFilters}
      />

      <Button
        label="Import"
        icon="pi pi-upload"
        size="sm"
        className={styles.actionButton}
        onClick={onImport}
      />
      <Button
        label="Export"
        icon="pi pi-download"
        size="sm"
        className={styles.actionButton}
        disabled={exportDisabled}
        onClick={onExport}
      />
      <Button
        label="Add New"
        icon="pi pi-plus"
        size="sm"
        className={styles.addNewButton}
        onClick={onAddNew}
      />
    </div>
  </div>
);

export default LookupToolbar;
