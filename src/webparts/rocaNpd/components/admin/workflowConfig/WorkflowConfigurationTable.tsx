import * as React from "react";
import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type { IWorkflowConfigTableRow } from "../../../../../External/CommonServices/Interface";
import { Button, DataTable } from "../../common/controls";
import type { IDataTableColumn } from "../../common/controls/DataTable";
import styles from "../../common/controls/DataTable/DataTable.module.scss";

export interface IWorkflowConfigurationTableProps {
  rows: IWorkflowConfigTableRow[];
  loading: boolean;
  globalFilter: string;
  onEdit: (row: IWorkflowConfigTableRow) => void;
  onDelete: (row: IWorkflowConfigTableRow) => void;
}

const WorkflowConfigurationTable: React.FC<IWorkflowConfigurationTableProps> = ({
  rows,
  loading,
  globalFilter,
  onEdit,
  onDelete,
}) => {
  const columns = React.useMemo<IDataTableColumn<IWorkflowConfigTableRow>[]>(
    () => [
      {
        field: "RequestType",
        header: FieldLabels.RequestType,
        sortable: true,
        style: { width: "10rem" },
      },
      {
        field: "ApprovalChain",
        header: FieldLabels.ApprovalChain,
        sortable: true,
      },
      {
        field: "RequestType",
        header: "Action",
        style: { width: "6rem", textAlign: "right" },
        headerStyle: { width: "6rem", textAlign: "right" },
        body: (row) => (
          <div className={styles.actionCell}>
            <Button
              variant="text"
              icon="pi pi-pencil"
              iconOnly
              className={styles.editAction}
              onClick={() => onEdit(row)}
            />
            <Button
              variant="text"
              icon="pi pi-trash"
              iconOnly
              className={styles.deleteAction}
              onClick={() => onDelete(row)}
            />
          </div>
        ),
      },
    ],
    [onDelete, onEdit],
  );

  return (
    <DataTable
      value={rows}
      columns={columns}
      loading={loading}
      dataKey="RequestType"
      rows={10}
      paginator
      paginatorPosition="bottom"
      paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
      globalFilter={globalFilter}
      globalFilterFields={["RequestType", "ApprovalChain"]}
    />
  );
};

export default WorkflowConfigurationTable;
