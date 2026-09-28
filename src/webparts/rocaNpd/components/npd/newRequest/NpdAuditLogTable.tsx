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
  getAuditLogPendingWorkflowSteps,
  isInitiatorWorkflowRole,
} from "../../../../../External/CommonServices/npdWorkflowJsonService";
import { resolveNpdWorkflowDisplayName } from "../../../../../External/CommonServices/npdWorkflowStatusView";
import { renderSharePointUserPersona } from "../../../../../External/CommonServices/personFieldUtils";
import { DataTable } from "../../common/controls";
import type { IDataTableColumn } from "../../common/controls/DataTable";
import { formatAuditActionDateTime } from "../requestList/npdRequestListUtils";
import styles from "./NpdAuditLogTable.module.scss";

export interface INpdAuditLogTableProps {
  rows: INpdApproverCommentRow[];
  requestStatus?: string | null;
  workflowSteps?: INpdWorkflowStepJson[];
}

function getRowTime(row: INpdApproverCommentRow): number {
  if (!row.created) {
    return 0;
  }
  const time = new Date(row.created).getTime();
  return Number.isFinite(time) ? time : 0;
}

/** Chronological order: Action On ascending, then Id as stable tie-break. */
function sortAuditRowsChronologically(
  rows: INpdApproverCommentRow[],
): INpdApproverCommentRow[] {
  return [...rows].sort((a, b) => {
    const timeA = getRowTime(a);
    const timeB = getRowTime(b);
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return (a.id || 0) - (b.id || 0);
  });
}

function isInitiatorSubmitAction(status: string): boolean {
  const normalized = (status || "").trim().toLowerCase();
  return (
    normalized === "initiated" ||
    normalized === "initiate" ||
    normalized === "submit" ||
    normalized === "submitted" ||
    normalized === "resubmit" ||
    normalized === "resubmitted" ||
    normalized.includes("initiat") ||
    normalized.includes("resubmit")
  );
}

/**
 * Latest Initiated / Resubmit timestamp — pending placeholders only apply after this cycle.
 */
function getLatestInitiatorSubmitTime(rows: INpdApproverCommentRow[]): number {
  let latest = 0;
  for (const row of rows) {
    if (!isInitiatorSubmitAction(row.status)) {
      continue;
    }
    const time = getRowTime(row);
    if (time >= latest) {
      latest = time;
    }
  }
  return latest;
}

function normalizeKey(value: string): string {
  return (value || "").trim().toLowerCase();
}

/**
 * True when NPD_ApproverComments already has an action for this workflow step
 * in the current cycle (after last Initiated / Resubmit).
 */
function hasCommentForPendingStep(
  rows: INpdApproverCommentRow[],
  step: INpdWorkflowStepJson,
  afterSubmitTime: number,
): boolean {
  const stepEmail = normalizeKey(step.UserEmail);
  const stepRole = normalizeKey(step.Role);

  return rows.some((row) => {
    if (isInitiatorWorkflowRole(row.role || "")) {
      return false;
    }
    if (isInitiatorSubmitAction(row.status)) {
      return false;
    }

    const time = getRowTime(row);
    // Comments without Created still count if id > 0 (persisted list row).
    if (afterSubmitTime > 0 && time > 0 && time <= afterSubmitTime) {
      return false;
    }

    const rowEmail = normalizeKey(row.actionedByEmail || "");
    const rowRole = normalizeKey(row.role || "");

    if (stepEmail && rowEmail && stepEmail === rowEmail) {
      return true;
    }

    if (stepRole && rowRole && stepRole === rowRole) {
      return true;
    }

    return false;
  });
}

function buildPendingAuditRows(
  workflowSteps: INpdWorkflowStepJson[],
  commentRows: INpdApproverCommentRow[],
): INpdApproverCommentRow[] {
  const afterSubmitTime = getLatestInitiatorSubmitTime(commentRows);
  const pendingSteps = getAuditLogPendingWorkflowSteps(workflowSteps);
  const pendingRows: INpdApproverCommentRow[] = [];

  pendingSteps.forEach((step, index) => {
    if (hasCommentForPendingStep(commentRows, step, afterSubmitTime)) {
      return;
    }

    const email = (step.UserEmail || "").trim();
    const role = (step.Role || "").trim();
    const actionedBy = resolveNpdWorkflowDisplayName(email, "", "");

    pendingRows.push({
      id: -1 - index,
      status: RequestStatus.Pending,
      actionedBy: actionedBy || "—",
      actionedByEmail: email || undefined,
      role,
      comments: "—",
    });
  });

  return pendingRows;
}

const NpdAuditLogTable: React.FC<INpdAuditLogTableProps> = ({
  rows,
  requestStatus,
  workflowSteps = [],
}) => {
  const displayRows = React.useMemo(() => {
    const chronological = sortAuditRowsChronologically(rows);
    const normalizedStatus = (requestStatus || "").trim().toLowerCase();

    // Show WorkflowJSON Pending/empty approvers while the request is still in flight
    // (Pending or Rework). Hide on Draft / Approved / Rejected / Completed.
    const allowPendingPlaceholders =
      normalizedStatus === RequestStatus.Pending.toLowerCase() ||
      normalizedStatus === RequestStatus.Rework.toLowerCase() ||
      normalizedStatus === "in rework";

    if (!allowPendingPlaceholders || !workflowSteps.length) {
      return chronological;
    }

    const pendingRows = buildPendingAuditRows(workflowSteps, chronological);
    if (!pendingRows.length) {
      return chronological;
    }

    // Real actions stay chronological; pending placeholders follow at the bottom.
    return [...chronological, ...pendingRows];
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
          <span className={styles.actionText}>{row.status || "—"}</span>
        ),
      },
      {
        field: "actionVia",
        header: "Action Via",
        style: { width: "8rem", minWidth: "7.5rem" },
        body: (row) => {
          const rawVia =
            typeof row.actionVia === "string" ? row.actionVia.trim() : "";
          if (!rawVia || rawVia === "—") {
            return <span>—</span>;
          }
          const isMail = rawVia.toLowerCase() === "mail";
          const isSystem = rawVia.toLowerCase() === "system";
          const displayLabel = isMail ? "Mail" : isSystem ? "System" : rawVia;
          return (
            <span
              className={
                isMail ? styles.actionViaMail : styles.actionViaSystem
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
