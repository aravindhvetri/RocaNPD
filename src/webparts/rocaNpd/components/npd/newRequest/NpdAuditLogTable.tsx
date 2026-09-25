import * as React from "react";
import {
  Config,
  FieldLabels,
  RequestStatus,
} from "../../../../../External/CommonServices/Config";
import type {
  INpdApproverCommentRow,
  INpdWorkflowStepJson,
} from "../../../../../External/CommonServices/Interface";
import {
  getFirstPendingApproverStep,
} from "../../../../../External/CommonServices/npdWorkflowJsonService";
import { resolveNpdWorkflowDisplayName } from "../../../../../External/CommonServices/npdWorkflowStatusView";
import { renderSharePointUserPersona } from "../../../../../External/CommonServices/personFieldUtils";
import { DataTable, Tag } from "../../common/controls";
import type { IDataTableColumn } from "../../common/controls/DataTable";
import {
  formatAuditActionDateTime,
  formatNpdPendingWithRole,
} from "../requestList/npdRequestListUtils";
import styles from "./NpdAuditLogTable.module.scss";

export interface INpdAuditLogTableProps {
  rows: INpdApproverCommentRow[];
  requestStatus?: string | null;
  workflowSteps?: INpdWorkflowStepJson[];
}

function getStatusClass(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "rework" || s === "in rework") {
    return styles.statusRework;
  }
  if (s === "rejected") {
    return styles.statusRejected;
  }
  if (s === "approved" || s === "completed") {
    return styles.statusApproved;
  }
  if (s.startsWith("pending")) {
    return styles.statusPending;
  }
  return styles.statusDefault;
}

function getAuditActionRank(actionOrStatus?: string): number {
  const s = (actionOrStatus || "").trim().toLowerCase();
  if (s === "completed" || s === "approved") {
    return 1;
  }
  if (s === "rejected" || s === "reject") {
    return 2;
  }
  if (s === "rework" || s === "reworked" || s === "in rework") {
    return 3;
  }
  if (s.startsWith("pending")) {
    return 4;
  }
  return 5;
}

function buildPendingAuditRow(
  workflowSteps: INpdWorkflowStepJson[],
): INpdApproverCommentRow | null {
  const step = getFirstPendingApproverStep(workflowSteps);
  if (!step) {
    return null;
  }

  const email = (step.UserEmail || "").trim();
  const role = (step.Role || "").trim();
  const actionedBy = resolveNpdWorkflowDisplayName(email, "", "");

  return {
    id: -1,
    status: formatNpdPendingWithRole(role),
    actionedBy: actionedBy || "—",
    actionedByEmail: email || undefined,
    role,
    comments: "—",
  };
}

const NpdAuditLogTable: React.FC<INpdAuditLogTableProps> = ({
  rows,
  requestStatus,
  workflowSteps = [],
}) => {
  const displayRows = React.useMemo(() => {
    const merged = [...rows];
    const isPending =
      (requestStatus || "").trim().toLowerCase() ===
      RequestStatus.Pending.toLowerCase();

    if (isPending) {
      const pendingRow = buildPendingAuditRow(workflowSteps);
      if (pendingRow) {
        merged.unshift(pendingRow);
      }
    }

    return merged.sort((a, b) => {
      const rankA = getAuditActionRank(a.status);
      const rankB = getAuditActionRank(b.status);
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      const timeA = a.created ? new Date(a.created).getTime() : 0;
      const timeB = b.created ? new Date(b.created).getTime() : 0;
      return timeB - timeA;
    });
  }, [requestStatus, rows, workflowSteps]);

  const columns = React.useMemo<IDataTableColumn<INpdApproverCommentRow>[]>(
    () => [
      {
        field: "role",
        header: "Role",
        style: { width: "9rem", minWidth: "8rem" },
        body: (row) => (
          <span className={styles.role} title={row.role}>
            {row.role || "—"}
          </span>
        ),
      },
      {
        field: "actionedBy",
        header: "Actioned By",
        style: { width: "12rem", minWidth: "10rem" },
        body: (row) => (
          <span className={styles.actionedBy}>
            {row.actionedByEmail
              ? renderSharePointUserPersona(
                row.actionedByEmail,
                row.actionedBy,
              )
              : null}
            <span
              className={styles.actionedByName}
              title={row.actionedBy || undefined}
            >
              {row.actionedBy || "—"}
            </span>
          </span>
        ),
      },
      {
        field: "status",
        header: "Action",
        style: { width: "10rem", minWidth: "9rem" },
        body: (row) => (
          <Tag value={row.status || "—"} className={getStatusClass(row.status)} />
        ),
      },
      {
        field: "actionVia",
        header: "Action Via",
        style: { width: "8rem", minWidth: "7.5rem" },
        body: (row) => {
          const rawVia = typeof row.actionVia === "string" ? row.actionVia.trim() : "";
          if (!rawVia || rawVia === "—") {
            return <span>—</span>;
          }
          const isMail = rawVia.toLowerCase() === "mail";
          const isSystem = rawVia.toLowerCase() === "system";
          const displayLabel = isMail ? "Mail" : isSystem ? "System" : rawVia;
          return (
            <span
              className={
                isMail
                  ? styles.actionViaMail
                  : styles.actionViaSystem
              }
            >
              {displayLabel}
            </span>
          );
        },
      },
      {
        field: "created",
        header: "Action On",
        style: { width: "12rem", minWidth: "11rem" },
        body: (row) => (
          <span className={styles.date}>
            {formatAuditActionDateTime(row.created)}
          </span>
        ),
      },
      {
        field: "comments",
        header: FieldLabels?.Comments || "Comments",
        body: (row) => (
          <span className={styles.comments} title={row.comments}>
            {row.comments || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  if (!displayRows.length) {
    return null;
  }

  return (
    <section className={styles.section} aria-label="Audit log">
      <h2 className={styles.title}>Audit Log</h2>
      <div className={styles.tableWrap}>
        <DataTable
          value={displayRows}
          columns={columns}
          paginator={displayRows.length > 10}
          emptyMessage={Config.FieldLabels.NoItemsFound}
          paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
          paginatorPosition="bottom"
          rows={10}
        />
      </div>
    </section>
  );
};

export default NpdAuditLogTable;
