import * as React from "react";
import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type { ILookupRow } from "../../../../../External/CommonServices/Interface";
import { Button, DataTable } from "../../common/controls";
import type { IDataTableColumn } from "../../common/controls/DataTable";
import styles from "../../common/controls/DataTable/DataTable.module.scss";

export interface ILookupTableProps {
  rows: ILookupRow[];
  loading: boolean;
  globalFilter: string;
  onEdit: (row: ILookupRow) => void;
  onDelete: (row: ILookupRow) => void;
}

const LookupTable: React.FC<ILookupTableProps> = ({
  rows,
  loading,
  globalFilter,
  onEdit,
  onDelete,
}) => {
  const columns = React.useMemo<IDataTableColumn<ILookupRow>[]>(
    () => [
      {
        field: "LookupTypeTitle",
        header: FieldLabels.LookupType,
        sortable: true,
      },
      {
        field: "LookupName",
        header: FieldLabels.LookupName,
        sortable: true,
      },
      {
        field: "LookupCode",
        header: FieldLabels.LookupCode,
        sortable: true,
      },
      {
        field: "Id",
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
      dataKey="Id"
      rows={10}
      paginator
      paginatorPosition="bottom"
      paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
      globalFilter={globalFilter}
      globalFilterFields={["LookupName", "LookupCode", "LookupTypeTitle"]}
    />
  );
};

export default LookupTable;
