import * as React from "react";
import { Button, InputText } from "../../controls";
import styles from "./MasterToolbar.module.scss";

export interface IMasterToolbarSearchProps {
  id: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onResetFilters: () => void;
  filtersActive?: boolean;
}

const MasterToolbarSearch: React.FC<IMasterToolbarSearchProps> = ({
  id,
  searchValue,
  onSearchChange,
  onResetFilters,
  filtersActive = false,
}) => (
  <div className={styles.filterGroup}>
    <div className={styles.searchWrap}>
      <InputText
        id={id}
        value={searchValue}
        placeholder="Search..."
        className={styles.searchInput}
        onChange={onSearchChange}
      />
      <i className={`pi pi-search ${styles.searchIcon}`} aria-hidden="true" />
    </div>
    <Button
      variant="text"
      icon="pi pi-refresh"
      iconOnly
      className={styles.resetButton}
      disabled={!filtersActive}
      aria-label="Refresh"
      title="Refresh"
      onClick={onResetFilters}
    />
  </div>
);

export default MasterToolbarSearch;
