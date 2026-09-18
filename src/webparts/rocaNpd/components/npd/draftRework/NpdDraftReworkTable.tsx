import * as React from "react";
import type { INpdRequestListItemRow } from "../../../../../External/CommonServices/Interface";
import NpdRequestListTable from "../requestList/NpdRequestListTable";

export interface INpdDraftReworkTableProps {
  rows: INpdRequestListItemRow[];
  loading: boolean;
  globalFilter?: string;
  emptyMessage?: string;
  canEditRow: (row: INpdRequestListItemRow) => boolean;
  onView: (row: INpdRequestListItemRow) => void;
  onEdit: (row: INpdRequestListItemRow) => void;
}

const NpdDraftReworkTable: React.FC<INpdDraftReworkTableProps> = ({
  rows,
  loading,
  emptyMessage,
  canEditRow,
  onView,
  onEdit,
}) => (
  <NpdRequestListTable
    rows={rows}
    loading={loading}
    emptyMessage={emptyMessage}
    canEditRow={canEditRow}
    onView={onView}
    onEdit={onEdit}
  />
);

export default NpdDraftReworkTable;
