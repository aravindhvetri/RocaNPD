import * as React from "react";
import type { IMaterialMasterRow } from "../../../../../External/CommonServices/Interface";
import {
  formatMaterialMasterCreatedDate,
  type IMaterialMasterColumnDef,
} from "../../../../../External/CommonServices/materialMasterService";
import { renderSharePointUserPersona } from "../../../../../External/CommonServices/personFieldUtils";
import {
  DataTable,
  EmptyDash,
  type IDataTableColumn,
} from "../../common/controls";
import { MaterialMasterUi } from "../../../../../External/CommonServices/Config";
import styles from "./MaterialMaster.module.scss";

export interface IMaterialMasterTableProps {
  rows: IMaterialMasterRow[];
  columns: IMaterialMasterColumnDef[];
  loading?: boolean;
}

function renderUserCell(name: string, email: string): React.ReactNode {
  const displayName = name.trim();
  if (!displayName && !email.trim()) {
    return <EmptyDash />;
  }

  return (
    <span className={styles.userCell}>
      {email.trim()
        ? renderSharePointUserPersona(email.trim(), displayName || email.trim())
        : null}
      <span className={styles.userName} title={displayName || undefined}>
        {displayName || "—"}
      </span>
    </span>
  );
}

const MaterialMasterTable: React.FC<IMaterialMasterTableProps> = ({
  rows,
  columns,
  loading = false,
}) => {
  const tableColumns = React.useMemo<IDataTableColumn<IMaterialMasterRow>[]>(
    () =>
      columns.map((column) => ({
        field: column.field,
        header: column.header,
        sortable: column.field === "Created" || column.field === "MaterialCode",
        style: {
          minWidth: column.minWidth || "8rem",
          width: column.minWidth || "8rem",
        },
        headerStyle: {
          minWidth: column.minWidth || "8rem",
          width: column.minWidth || "8rem",
        },
        body: (row) => {
          if (column.field === "Created") {
            const formatted = formatMaterialMasterCreatedDate(
              String(row.Created ?? ""),
            );
            return formatted ? formatted : <EmptyDash />;
          }
          if (column.field === "Initiator") {
            return renderUserCell(row.Initiator, row.InitiatorEmail);
          }
          const text = String(row[column.field] ?? "").trim();
          return text ? text : <EmptyDash />;
        },
      })),
    [columns],
  );

  return (
    <DataTable
      value={rows}
      columns={tableColumns}
      loading={loading}
      dataKey="Id"
      rows={MaterialMasterUi.PageSize}
      rowsPerPageOptions={[MaterialMasterUi.PageSize]}
      emptyMessage="No Records Found"
    />
  );
};

export default MaterialMasterTable;
