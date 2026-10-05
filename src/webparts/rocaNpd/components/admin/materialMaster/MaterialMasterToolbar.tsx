import * as React from "react";
import type { ISelectOption } from "../../../../../External/CommonServices/Interface";
import {
  Button,
  DatePicker,
  Dropdown,
  InputText,
} from "../../common/controls";
import styles from "./MaterialMaster.module.scss";
import masterStyles from "../../common/master/MasterToolbar/MasterToolbar.module.scss";

export interface IMaterialMasterToolbarProps {
  searchValue: string;
  createdFrom: Date | null;
  createdTo: Date | null;
  initiatorValue: string;
  initiatorOptions: ISelectOption[];
  exportDisabled: boolean;
  onSearchChange: (value: string) => void;
  onCreatedFromChange: (value: Date | null) => void;
  onCreatedToChange: (value: Date | null) => void;
  onInitiatorChange: (value: string) => void;
  onResetFilters: () => void;
  onExport: () => void;
}

const MaterialMasterToolbar: React.FC<IMaterialMasterToolbarProps> = ({
  searchValue,
  createdFrom,
  createdTo,
  initiatorValue,
  initiatorOptions,
  exportDisabled,
  onSearchChange,
  onCreatedFromChange,
  onCreatedToChange,
  onInitiatorChange,
  onResetFilters,
  onExport,
}) => {
  const handleReset = (): void => {
    onResetFilters();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  return (
    <div className={styles.toolbar}>
      <h1 className={styles.title}>Material Master</h1>

      <div className={styles.actions}>
        <div className={masterStyles.searchWrap}>
          <InputText
            id="materialMasterSearch"
            value={searchValue}
            placeholder="Search here"
            className={masterStyles.searchInput}
            onChange={onSearchChange}
          />
          <i
            className={`pi pi-search ${masterStyles.searchIcon}`}
            aria-hidden="true"
          />
        </div>

        <DatePicker
          id="materialMasterCreatedFrom"
          value={createdFrom}
          placeholder="Creation Date From"
          dateFormat="dd/mm/yy"
          className={styles.dateField}
          panelClassName="roca-mm-datepicker"
          onChange={onCreatedFromChange}
        />
        <DatePicker
          id="materialMasterCreatedTo"
          value={createdTo}
          placeholder="Creation Date To"
          dateFormat="dd/mm/yy"
          className={styles.dateField}
          panelClassName="roca-mm-datepicker"
          onChange={onCreatedToChange}
        />
        <Dropdown
          id="materialMasterInitiator"
          value={initiatorValue}
          options={initiatorOptions}
          placeholder="All Initiators"
          className={styles.initiatorField}
          onChange={(value) => onInitiatorChange(String(value ?? "all"))}
        />
        <Button
          label="Export"
          icon="pi pi-download"
          size="sm"
          className={styles.exportButton}
          disabled={exportDisabled}
          onClick={onExport}
        />
        <Button
          variant="primary"
          icon="pi pi-refresh"
          iconOnly
          className={`${styles.resetButton} roca-master-reset-button`}
          aria-label="Reset filters"
          title="Reset filters"
          onClick={handleReset}
        />
      </div>
    </div>
  );
};

export default MaterialMasterToolbar;
