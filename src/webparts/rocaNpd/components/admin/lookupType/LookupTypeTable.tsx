import * as React from "react";
import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type { ILookupTypeRow } from "../../../../../External/CommonServices/Interface";
import { Button, DataTable } from "../../common/controls";
import type { IDataTableColumn } from "../../common/controls/DataTable";
import styles from "../../common/controls/DataTable/DataTable.module.scss";

export interface ILookupTypeTableProps {
  rows: ILookupTypeRow[];
  loading: boolean;
  globalFilter: string;
  onEdit: (row: ILookupTypeRow) => void;
  onDelete: (row: ILookupTypeRow) => void;
}

const LookupTypeTable: React.FC<ILookupTypeTableProps> = ({
  rows,
  loading,
  globalFilter,
  onEdit,
  onDelete,
}) => {
  const columns = React.useMemo<IDataTableColumn<ILookupTypeRow>[]>(
    () => [
      {
        field: "Title",
        header: FieldLabels.LookupTypeName,
        sortable: true,
        style: { width: "100%" },
      },
      {
        field: "Id",
        header: "Action",
        style: {
          width: "5.5rem",
          minWidth: "5.5rem",
          maxWidth: "6rem",
          textAlign: "left",
        },
        headerStyle: {
          width: "5.5rem",
          minWidth: "5.5rem",
          maxWidth: "6rem",
          textAlign: "left",
        },
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
      dataKey="Id"
      rows={10}
      paginator
      paginatorPosition="bottom"
      paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
      globalFilter={globalFilter}
      globalFilterFields={["Title"]}
    />
  );
};

export default LookupTypeTable;
