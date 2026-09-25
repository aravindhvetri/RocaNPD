import * as React from "react";
import { Config, FieldLabels } from "../../../../../External/CommonServices/Config";
import type { IMaterialGroupGroupedRequest } from "../../../../../External/CommonServices/Interface";
import { isMgRequestIdTitle } from "../../../../../External/CommonServices/materialGroupIdService";
import {
  normalizeEmail,
  renderSharePointUserPersona,
} from "../../../../../External/CommonServices/personFieldUtils";
import { Button, DataTable, Tag } from "../../common/controls";
import type { IDataTableColumn } from "../../common/controls/DataTable";
import tableStyles from "../../common/controls/DataTable/DataTable.module.scss";
import styles from "./MaterialGroupDashboard.module.scss";
import { formatNpdCreatedDate } from "../../npd/requestList/npdRequestListUtils";

export interface IMaterialGroupTableProps {
  requests: IMaterialGroupGroupedRequest[];
  loading?: boolean;
  currentUserEmail: string;
  assignedRoles: string[];
  isConsultant?: boolean;
  isAdmin?: boolean;
  onView: (request: IMaterialGroupGroupedRequest) => void;
  onEdit: (request: IMaterialGroupGroupedRequest) => void;
}

function getStatusClass(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "pending") {
    return styles.statusPending;
  }
  if (s === "completed" || s === "approved") {
    return styles.statusCompleted;
  }
  if (s === "rework") {
    return styles.statusRework;
  }
  if (s === "rejected") {
    return styles.statusRejected;
  }
  return styles.statusDraft;
}

export function canEditMaterialGroupRow(
  row: IMaterialGroupGroupedRequest,
  currentUserEmail: string,
  assignedRoles: string[],
): boolean {
  const status = (row.status || "").trim().toLowerCase();
  const isConsultant = assignedRoles.some(
    (r) => r.trim().toLowerCase() === Config.Roles.Consultant.toLowerCase(),
  );
  const isInitiator = assignedRoles.some(
    (r) => r.trim().toLowerCase() === Config.Roles.Initiator.toLowerCase(),
  );

  if (status === "pending") {
    // Only the Consultant can edit/act on a Pending request
    return isConsultant;
  }

  if (status === "draft" || status === "rework") {
    // Only the Initiator who created the draft/rework can edit it
    const isOwner =
      !row.initiatorEmail ||
      normalizeEmail(row.initiatorEmail) === normalizeEmail(currentUserEmail);
    return isInitiator && isOwner;
  }

  // Completed, Rejected, or any other status cannot be edited
  return false;
}

const MaterialGroupTable: React.FC<IMaterialGroupTableProps> = ({
  requests,
  loading = false,
  currentUserEmail,
  assignedRoles,
  isConsultant = false,
  isAdmin = false,
  onView,
  onEdit,
}) => {
  const canEditRow = React.useCallback(
    (row: IMaterialGroupGroupedRequest): boolean => {
      return canEditMaterialGroupRow(row, currentUserEmail, assignedRoles);
    },
    [currentUserEmail, assignedRoles],
  );

  const columns = React.useMemo<
    IDataTableColumn<IMaterialGroupGroupedRequest>[]
  >(
    () => {
      // Role-based persona column:
      // - Consultant/Admin see the Initiator column
      // - Initiator sees the Current Approver column
  // Remove fixed width from persona definitions so merged style below controls it
  const personaColumn: IDataTableColumn<IMaterialGroupGroupedRequest> =
        isConsultant
          ? {
            field: "initiatorName",
            header: FieldLabels?.Initiator,
            sortable: true,
            body: (row) => (
              <span className={styles.currentApprover}>
                {row.initiatorEmail
                  ? renderSharePointUserPersona(row.initiatorEmail, row.initiatorName)
                  : null}
                <span
                  className={styles.currentApproverName}
                  title={row.initiatorName}
                >
                  {row.initiatorName || "—"}
                </span>
              </span>
            ),
          }
          : {
            field: "currentApprover",
            header: FieldLabels?.CurrentApprover,
            body: (row) => {
              if (!row.currentApproverEmail) {
                return <span>{row.currentApprover || "—"}</span>;
              }
              return (
                <span className={styles.currentApprover}>
                  {renderSharePointUserPersona(
                    row.currentApproverEmail,
                    row.currentApprover,
                  )}
                  <span
                    className={styles.currentApproverName}
                    title={row.currentApprover}
                  >
                    {row.currentApprover}
                  </span>
                </span>
              );
            },
          };

      return [
        {
          field: "requestId",
          header: FieldLabels?.RequestId,
          sortable: true,
          style: { width: "7.5rem", minWidth: "7.5rem" },
          body: (row) =>
            isMgRequestIdTitle(row.requestId) ? (
              <button
                type="button"
                className={styles.requestIdBtn}
                onClick={() => onView(row)}
              >
                {row.requestId}
              </button>
            ) : (
              "-"
            ),
        },
        {
          field: "configuredMasters",
          header: FieldLabels?.ConfiguredMasters,
          style: { width: "26rem", minWidth: "20rem" },
          body: (row) => {
            const masters = row.configuredMasters || [];
            if (masters.length === 0) {
              return <span className={styles.draftRequestId}>None</span>;
            }

            const visible = masters.slice(0, 2);
            const remaining = masters.length - visible.length;
            const allMasters = masters.join(", ");

            return (
              <span className={styles.mastersCell} title={allMasters}>
                {visible.map((name) => (
                  <span key={name} className={styles.masterPill} title={name}>
                    {name}
                  </span>
                ))}
                {remaining > 0 ? (
                  <span className={styles.moreCount}>+{remaining} more</span>
                ) : null}
              </span>
            );
          },
        },
        {
          field: "entriesCount",
          header: FieldLabels?.EntriesCount,
          sortable: true,
          style: { width: "7rem", minWidth: "7rem" },
          body: (row) => (
            <span className={styles.entryCountBadge}>
              {row.entriesCount} {row.entriesCount === 1 ? "code" : "codes"}
            </span>
          ),
        },
        {
          ...personaColumn,
          style: { width: "7.5rem", minWidth: "6.5rem" },
        },
        {
          field: "createdDate",
          header: FieldLabels?.CreatedDate,
          sortable: true,
          style: { width: "7.5rem", minWidth: "7.5rem" },
          body: (row) => (
            <span className={styles.dateCell}>
              {formatNpdCreatedDate(row.createdDate)}
            </span>
          ),
        },
        {
          field: "status",
          header: FieldLabels?.Status,
          sortable: true,
          style: { width: "7rem", minWidth: "7rem" },
          body: (row) => (
            <Tag
              value={row.status || "Draft"}
              className={getStatusClass(row.status)}
            />
          ),
        },
        {
          field: "id",
          header: FieldLabels?.Actions,
          style: { width: "5rem", minWidth: "5rem", textAlign: "left" },
          body: (row) => {
            const editable = canEditRow(row);
            return (
              <div className={tableStyles.actionCell}>
                {editable ? (
                  <Button
                    variant="text"
                    icon="pi pi-pencil"
                    iconOnly
                    className={tableStyles.editAction}
                    title="Edit"
                    aria-label="Edit"
                    onClick={() => onEdit(row)}
                  />
                ) : null}
                <Button
                  variant="text"
                  icon="pi pi-eye"
                  iconOnly
                  className={tableStyles.viewAction}
                  title="View"
                  aria-label="View"
                  onClick={() => onView(row)}
                />
              </div>
            );
          },
        },
      ];
    },
    [canEditRow, isConsultant, isAdmin, onEdit, onView],
  );

  return (
    <DataTable
      value={requests}
      columns={columns}
      loading={loading}
      paginator={requests.length > 10}
      emptyMessage={Config.FieldLabels.NoItemsFound}
      paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
      paginatorPosition="bottom"
      rows={10}
    />
  );
};

export default MaterialGroupTable;
