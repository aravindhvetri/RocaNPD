import * as React from "react";
import { Button } from "../../common/controls";
import { MasterToolbarSearch } from "../../common/master/MasterToolbar";
import styles from "../../common/master/MasterToolbar/MasterToolbar.module.scss";

export interface IWorkflowConfigurationToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onResetFilters: () => void;
  filtersActive?: boolean;
  onAddNew: () => void;
}

const WorkflowConfigurationToolbar: React.FC<IWorkflowConfigurationToolbarProps> = ({
  searchValue,
  onSearchChange,
  onResetFilters,
  filtersActive = false,
  onAddNew,
}) => (
  <div className={styles.toolbar}>
    <h1 className={styles.title}>Workflow Configuration</h1>

    <div className={styles.actions}>
      <MasterToolbarSearch
        id="workflowConfigSearch"
        searchValue={searchValue}
        filtersActive={filtersActive}
        onSearchChange={onSearchChange}
        onResetFilters={onResetFilters}
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

export default WorkflowConfigurationToolbar;
