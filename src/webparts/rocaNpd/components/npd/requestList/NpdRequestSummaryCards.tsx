import * as React from "react";
import styles from "./NpdRequestList.module.scss";

export interface INpdRequestSummaryCounts {
  total: number;
  pending: number;
  reworkDraft: number;
  approved: number;
}

const NpdRequestSummaryCards: React.FC<{ counts: INpdRequestSummaryCounts }> = ({
  counts,
}) => (
  <div className={styles.cards}>
    <article className={`${styles.card} ${styles.cardTotal}`}>
      <div className={styles.cardCopy}>
        <p className={styles.cardLabel}>Total NPD Requests</p>
        <p className={styles.cardValue}>{counts.total}</p>
      </div>
      <span className={styles.cardIcon} aria-hidden="true">
        <i className="pi pi-file" />
      </span>
    </article>
    <article className={`${styles.card} ${styles.cardPending}`}>
      <div className={styles.cardCopy}>
        <p className={styles.cardLabel}>Pending Approvals</p>
        <p className={styles.cardValue}>{counts.pending}</p>
      </div>
      <span className={styles.cardIcon} aria-hidden="true">
        <i className="pi pi-clock" />
      </span>
    </article>
    <article className={`${styles.card} ${styles.cardRework}`}>
      <div className={styles.cardCopy}>
        <p className={styles.cardLabel}>In Rework / Drafts</p>
        <p className={styles.cardValue}>{counts.reworkDraft}</p>
      </div>
      <span className={styles.cardIcon} aria-hidden="true">
        <i className="pi pi-exclamation-triangle" />
      </span>
    </article>
    <article className={`${styles.card} ${styles.cardApproved}`}>
      <div className={styles.cardCopy}>
        <p className={styles.cardLabel}>Approved Products</p>
        <p className={styles.cardValue}>{counts.approved}</p>
      </div>
      <span className={styles.cardIcon} aria-hidden="true">
        <i className="pi pi-check-circle" />
      </span>
    </article>
  </div>
);

export default NpdRequestSummaryCards;
