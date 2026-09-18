import * as React from "react";
import { Button, InputText } from "../../controls";
import styles from "./MasterToolbar.module.scss";

export interface IMasterToolbarSearchProps {
  id: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onResetFilters: () => void;
  filtersActive?: boolean;
  placeholder?: string;
  wide?: boolean;
}

const MasterToolbarSearch: React.FC<IMasterToolbarSearchProps> = ({
  id,
  searchValue,
  onSearchChange,
  onResetFilters,
  placeholder = "Search...",
  wide = false,
}) => {
  const handleResetFilters = (): void => {
    onResetFilters();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  return (
    <div className={wide ? styles.filterGroupWide : styles.filterGroup}>
      <div className={wide ? styles.searchWrapWide : styles.searchWrap}>
        <InputText
          id={id}
          value={searchValue}
          placeholder={placeholder}
          className={styles.searchInput}
          onChange={onSearchChange}
        />
        <i className={`pi pi-search ${styles.searchIcon}`} aria-hidden="true" />
      </div>
      <Button
        variant="primary"
        icon="pi pi-refresh"
        iconOnly
        className={`${styles.resetButton} roca-master-reset-button`}
        aria-label="Reset filters"
        title="Reset filters"
        onClick={handleResetFilters}
      />
    </div>
  );
};

export default MasterToolbarSearch;
