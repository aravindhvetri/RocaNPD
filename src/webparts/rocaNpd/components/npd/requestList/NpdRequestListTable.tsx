import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Config, FieldLabels, RequestStatus } from "../../../../../External/CommonServices/Config";
import type { INpdRequestListItemRow } from "../../../../../External/CommonServices/Interface";
import { isNpdRequestIdTitle } from "../../../../../External/CommonServices/npdRequestIdService";
import { npdTabDashboardRoute } from "../../../../../External/CommonServices/npdRequestTabSync";
import { renderSharePointUserPersona } from "../../../../../External/CommonServices/personFieldUtils";
import { Button, DataTable, MultiValueCell, Tag } from "../../common/controls";
import type { IDataTableColumn } from "../../common/controls/DataTable";
import tableStyles from "../../common/controls/DataTable/DataTable.module.scss";
import NpdEditingRestrictedDialog from "../tabLock/NpdEditingRestrictedDialog";
import { useNpdRequestTabGuard } from "../tabLock/useNpdRequestTabGuard";
import NpdWorkflowStatusDialog from "./NpdWorkflowStatusDialog";
import {
  formatNpdCreatedDate,
  formatNpdRequestListStatus,
  getNpdCurrentApprover,
  isDraftNpdStatus,
  isDraftOrReworkNpdStatus,
} from "./npdRequestListUtils";
import { useNpdWorkflowStatusDialog } from "./useNpdWorkflowStatusDialog";
import styles from "./NpdRequestList.module.scss";

export interface INpdRequestListTableProps {
  rows: INpdRequestListItemRow[];
  loading: boolean;
  emptyMessage?: string;
  canEditRow: (row: INpdRequestListItemRow) => boolean;
  onView: (row: INpdRequestListItemRow) => void;
  onEdit: (row: INpdRequestListItemRow) => void;
}

function getStatusClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === RequestStatus.Approved.toLowerCase()) {
    return styles.statusApproved;
  }
  if (normalized === RequestStatus.Pending.toLowerCase()) {
    return styles.statusPending;
  }
  if (isDraftOrReworkNpdStatus(status) && normalized !== RequestStatus.Draft.toLowerCase()) {
    return styles.statusRework;
  }
  if (normalized === RequestStatus.Rejected.toLowerCase()) {
    return styles.statusRejected;
  }
  return styles.statusDraft;
}

function getStatusIcon(status: string): string | undefined {
  const normalized = status.trim().toLowerCase();
  if (normalized === RequestStatus.Approved.toLowerCase()) {
    return "pi pi-check-circle";
  }
  if (normalized === RequestStatus.Pending.toLowerCase()) {
    return "pi pi-clock";
  }
  if (isDraftOrReworkNpdStatus(status) && normalized !== RequestStatus.Draft.toLowerCase()) {
    return "pi pi-exclamation-triangle";
  }
  return undefined;
}

function columnSize(
  minWidth: string,
  extra?: React.CSSProperties,
): Pick<IDataTableColumn<INpdRequestListItemRow>, "style" | "headerStyle"> {
  const style: React.CSSProperties = { minWidth, width: minWidth, ...extra };
  return { style, headerStyle: { ...style } };
}

const NpdRequestListTable: React.FC<INpdRequestListTableProps> = ({
  rows,
  loading,
  emptyMessage = FieldLabels.NoRequestsFound,
  canEditRow,
  onView,
  onEdit,
}) => {
  const navigate = useNavigate();
  const workflow = useNpdWorkflowStatusDialog();
  const {
    restriction,
    guardAction,
    goToDashboard,
    reload,
  } = useNpdRequestTabGuard();
  const handleView = React.useCallback(
    (row: INpdRequestListItemRow) => {
      guardAction(row.Id, row.Title, () => onView(row));
    },
    [guardAction, onView],
  );
  const handleEdit = React.useCallback(
    (row: INpdRequestListItemRow) => {
      guardAction(row.Id, row.Title, () => onEdit(row));
    },
    [guardAction, onEdit],
  );
  const columns = React.useMemo<IDataTableColumn<INpdRequestListItemRow>[]>(
    () => [
      {
        field: "Title",
        header: FieldLabels.RequestId,
        sortable: true,
        ...columnSize("8.25rem"),
        body: (row) =>
          isNpdRequestIdTitle(row.Title) ? (
            <button
              type="button"
              className={styles.requestId}
              onClick={() => handleView(row)}
            >
              {row.Title.trim()}
            </button>
          ) : (
            ""
          ),
      },
      {
        field: "Brand",
        header: FieldLabels.BrandMg1,
        sortable: true,
        ...columnSize("8.75rem"),
      },
      {
        field: "MaterialType",
        header: FieldLabels.MaterialType,
        sortable: true,
        ...columnSize("9.25rem"),
      },
      {
        field: "Plant",
        header: FieldLabels.Plant,
        sortable: true,
        ...columnSize("5.75rem"),
        body: (row) => <MultiValueCell value={row.Plant} />,
      },
      {
        field: "ProductCount",
        header: FieldLabels.Products,
        sortable: true,
        ...columnSize("7.5rem"),
        body: (row) => (
          <span className={styles.productBadge}>
            {row.ProductCount} {row.ProductCount === 1 ? "line" : "lines"}
          </span>
        ),
      },
      {
        field: "Status",
        header: FieldLabels.Status,
        sortable: true,
        ...columnSize("11rem"),
        body: (row) => (
          <Tag
            value={formatNpdRequestListStatus(row.Status, row.WorkflowSteps)}
            icon={getStatusIcon(row.Status)}
            rounded
            className={getStatusClass(row.Status)}
          />
        ),
      },
      {
        field: "AuthorTitle",
        header: FieldLabels.CurrentApprover,
        ...columnSize("12.25rem"),
        body: (row) => {
          const approver = getNpdCurrentApprover(row);
          if (!approver.email) {
            return approver.name;
          }

          return (
            <span className={styles.currentApprover}>
              {renderSharePointUserPersona(approver.email, approver.name)}
              <span className={styles.currentApproverName}>{approver.name}</span>
            </span>
          );
        },
      },
      {
        field: "Created",
        header: FieldLabels.CreatedDate,
        sortable: true,
        ...columnSize("9.75rem"),
        body: (row) => formatNpdCreatedDate(row.Created),
      },
      {
        field: "Id",
        header: FieldLabels.Workflow,
        ...columnSize("6.75rem", { textAlign: "center", maxWidth: "7rem" }),
        body: (row) =>
          isDraftNpdStatus(row.Status) ? null : (
            <div className={tableStyles.actionCell}>
              <Button
                variant="text"
                icon="pi pi-sitemap"
                iconOnly
                className={tableStyles.workflowAction}
                title={FieldLabels.Workflow}
                aria-label={FieldLabels.Workflow}
                onClick={() => {
                  void workflow.openWorkflow(row);
                }}
              />
            </div>
          ),
      },
      {
        field: "Id",
        header: FieldLabels.Actions,
        ...columnSize("6rem", { textAlign: "left", maxWidth: "6.5rem" }),
        body: (row) => (
          <div className={tableStyles.actionCell}>
            {canEditRow(row) ? (
              <Button
                variant="text"
                icon="pi pi-pencil"
                iconOnly
                className={tableStyles.editAction}
                title="Edit"
                aria-label="Edit"
                onClick={() => handleEdit(row)}
              />
            ) : null}
            <Button
              variant="text"
              icon="pi pi-eye"
              iconOnly
              className={tableStyles.viewAction}
              title="View"
              aria-label="View"
              onClick={() => handleView(row)}
            />
          </div>
        ),
      },
    ],
    [canEditRow, handleEdit, handleView, workflow.openWorkflow],
  );

  return (
    <>
      <DataTable
        value={rows}
        columns={columns}
        loading={loading}
        dataKey="Id"
        rows={10}
        paginator
        paginatorPosition="bottom"
        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
      />
      <NpdWorkflowStatusDialog
        visible={workflow.visible}
        rows={workflow.rows}
        onHide={workflow.hideWorkflow}
      />
      <NpdEditingRestrictedDialog
        restriction={restriction}
        onGoToDashboard={() => {
          goToDashboard();
          navigate(npdTabDashboardRoute());
        }}
        onReload={reload}
      />
    </>
  );
};

export default NpdRequestListTable;
