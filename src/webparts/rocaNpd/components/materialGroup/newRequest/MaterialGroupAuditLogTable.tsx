import * as React from "react";
import {
  Config,
  FieldLabels,
  MaterialGroupStatus,
} from "../../../../../External/CommonServices/Config";
import type { IMaterialGroupAuditLogRow } from "../../../../../External/CommonServices/Interface";
import {
  fetchConsultantApproverInfo,
  type IConsultantApproverInfo,
} from "../../../../../External/CommonServices/materialGroupNotificationService";
import { renderSharePointUserPersona } from "../../../../../External/CommonServices/personFieldUtils";
import { formatAuditActionDateTime } from "../../npd/requestList/npdRequestListUtils";
import { DataTable } from "../../common/controls";
import type { IDataTableColumn } from "../../common/controls/DataTable";
import styles from "./MaterialGroupAuditLogTable.module.scss";

export interface IMaterialGroupAuditLogTableProps {
  rows: IMaterialGroupAuditLogRow[];
  requestStatus?: string | null;
}

function getRowTime(row: IMaterialGroupAuditLogRow): number {
  if (!row.created) {
    return 0;
  }
  const time = new Date(row.created).getTime();
  return Number.isFinite(time) ? time : 0;
}

/** Same as NPD: Action On ascending, then Id as stable tie-break. */
function sortAuditRowsChronologically(
  rows: IMaterialGroupAuditLogRow[],
): IMaterialGroupAuditLogRow[] {
  return [...rows].sort((a, b) => {
    const timeA = getRowTime(a);
    const timeB = getRowTime(b);
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return (a.id || 0) - (b.id || 0);
  });
}

function buildPendingAuditRow(
  consultant?: IConsultantApproverInfo | null,
): IMaterialGroupAuditLogRow {
  const name = (consultant?.name || "").trim();
  const email = (consultant?.email || "").trim();

  return {
    id: -1,
    role: Config.Roles.Consultant,
    status: `${FieldLabels.PendingWithPrefix} ${Config.Roles.Consultant}`,
    actionedBy: name || email || Config.Roles.Consultant,
    actionedByEmail: email || undefined,
    comments: "—",
  };
}

const MaterialGroupAuditLogTable: React.FC<IMaterialGroupAuditLogTableProps> = ({
  rows,
  requestStatus,
}) => {
  const isPending =
    (requestStatus || "").trim().toLowerCase() ===
    MaterialGroupStatus.Pending.toLowerCase();

  const [consultant, setConsultant] =
    React.useState<IConsultantApproverInfo | null>(null);

  React.useEffect(() => {
    if (!isPending) {
      setConsultant(null);
      return;
    }

    let cancelled = false;
    void fetchConsultantApproverInfo()
      .then((info) => {
        if (!cancelled) {
          setConsultant(info);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConsultant(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isPending]);

  const displayRows = React.useMemo(() => {
    const chronological = sortAuditRowsChronologically(rows);

    // Real actions stay chronological (Initiated → Rework → Resubmit → …).
    // Pending Consultant placeholder follows at the bottom while still Pending.
    if (!isPending) {
      return chronological;
    }

    return [...chronological, buildPendingAuditRow(consultant)];
  }, [consultant, isPending, rows]);

  const columns = React.useMemo<IDataTableColumn<IMaterialGroupAuditLogRow>[]>(
    () => [
      {
        field: "role",
        header: "Role",
        style: { width: "9rem", minWidth: "8rem" },
        body: (row) => (
          <span
            className={styles.role}
            title={
              row.role ||
              (row.status?.toLowerCase().includes("pending")
                ? Config.Roles.Consultant
                : undefined)
            }
          >
            {row.role ||
              (row.status?.toLowerCase().includes("pending")
                ? Config.Roles.Consultant
                : "—")}
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
              ? renderSharePointUserPersona(row.actionedByEmail, row.actionedBy)
              : null}
            <span className={styles.actionedByName} title={row.actionedBy}>
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

export default MaterialGroupAuditLogTable;
