type SapPostedListener = (sharePointId: number) => void;

let listener: SapPostedListener | null = null;

/** Form registers this so a successful SAP line updates the open grid immediately. */
export function subscribeSapPostedRow(next: SapPostedListener): () => void {
  listener = next;
  return () => {
    if (listener === next) {
      listener = null;
    }
  };
}

/** Called after NPD_ItemDetails.SAP is set true. No-op when the form is not open. */
export function notifySapPostedRow(sharePointId: number): void {
  if (!sharePointId) {
    return;
  }
  listener?.(sharePointId);
}

export function withSapPostedRow<T extends { sharePointId: number; sapPosted?: boolean }>(
  rows: T[],
  sharePointId: number,
): T[] {
  const target = Number(sharePointId);
  if (!target) {
    return rows;
  }

  let changed = false;
  const next = rows.map((row) => {
    if (Number(row.sharePointId) !== target || row.sapPosted === true) {
      return row;
    }
    changed = true;
    return { ...row, sapPosted: true };
  });
  return changed ? next : rows;
}
