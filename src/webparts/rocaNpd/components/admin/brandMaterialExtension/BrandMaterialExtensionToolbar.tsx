import * as React from "react";
import { FieldLabels } from "../../../../../External/CommonServices/Config";
import { Button } from "../../common/controls";
import { MasterToolbarSearch } from "../../common/master/MasterToolbar";
import styles from "../../common/master/MasterToolbar/MasterToolbar.module.scss";

export interface IBrandMaterialExtensionToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onResetFilters: () => void;
  filtersActive?: boolean;
  exportDisabled?: boolean;
  onExport: () => void;
  onAddNew: () => void;
}

const BrandMaterialExtensionToolbar: React.FC<
  IBrandMaterialExtensionToolbarProps
> = ({
  searchValue,
  onSearchChange,
  onResetFilters,
  filtersActive = false,
  exportDisabled = false,
  onExport,
  onAddNew,
}) => (
  <div className={styles.toolbar}>
    <h1 className={styles.title}>Brand Material Extension</h1>

    <div className={styles.actions}>
      <MasterToolbarSearch
        id="brandMaterialExtensionSearch"
        searchValue={searchValue}
        filtersActive={filtersActive}
        onSearchChange={onSearchChange}
        onResetFilters={onResetFilters}
      />

      <Button
        label={FieldLabels.Export}
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

export default BrandMaterialExtensionToolbar;
