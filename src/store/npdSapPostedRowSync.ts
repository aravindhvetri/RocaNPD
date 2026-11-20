type SapPostedListener = (sharePointId: number) => void;

interface IStoredItemIdentity {
  sharePointId: number;
  sapPosted?: boolean;
  isMisAdded?: boolean;
  materialCode: string;
  materialDescription: string;
  rocaGlobalCode: string;
}

type StoredItemsListener = (items: IStoredItemIdentity[]) => void;

let listener: SapPostedListener | null = null;
let storedItemsListener: StoredItemsListener | null = null;

function storedLineKey(item: IStoredItemIdentity): string {
  return [
    item.isMisAdded ? "1" : "0",
    item.materialCode.trim().toLowerCase(),
    item.materialDescription.trim().toLowerCase(),
    item.rocaGlobalCode.trim().toLowerCase(),
  ].join("|");
}

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

/** Form registers this so a save+reload can copy SharePoint Ids and SAP flags onto the grid. */
export function subscribeStoredItemDetails(
  next: StoredItemsListener,
): () => void {
  storedItemsListener = next;
  return () => {
    if (storedItemsListener === next) {
      storedItemsListener = null;
    }
  };
}

export function notifyStoredItemDetails(items: IStoredItemIdentity[]): void {
  storedItemsListener?.(items);
}

/**
 * Copy SharePoint Id and SAP from the rows just read back.
 * New grid lines (Id 0) take the unmatched saved row with the same content
 * so the next Post to SAP updates that record instead of inserting another.
 */
export function withStoredItemIdentity<T extends IStoredItemIdentity>(
  rows: T[],
  stored: IStoredItemIdentity[],
): T[] {
  const storedById = new Map<number, IStoredItemIdentity>();
  stored.forEach((item) => {
    const id = Number(item.sharePointId) || 0;
    if (id > 0) {
      storedById.set(id, item);
    }
  });

  const usedIds = new Set<number>();
  let changed = false;
  const next = rows.map((row) => {
    const id = Number(row.sharePointId) || 0;
    const match = id > 0 ? storedById.get(id) : undefined;
    if (!match) {
      return row;
    }
    usedIds.add(id);
    const sapPosted = Boolean(match.sapPosted);
    if (row.sapPosted === sapPosted) {
      return row;
    }
    changed = true;
    return { ...row, sapPosted };
  });

  const unmatched = stored.filter((item) => {
    const id = Number(item.sharePointId) || 0;
    return id > 0 && !usedIds.has(id);
  });
  const unsavedCount = next.filter(
    (row) => (Number(row.sharePointId) || 0) <= 0,
  ).length;

  next.forEach((row, index) => {
    if ((Number(row.sharePointId) || 0) > 0 || unmatched.length === 0) {
      return;
    }
    const key = storedLineKey(row);
    const found = unmatched.findIndex((item) => storedLineKey(item) === key);
    const pick =
      found >= 0
        ? unmatched.splice(found, 1)[0]
        : unmatched.length === 1 && unsavedCount === 1
          ? unmatched.shift()
          : undefined;
    if (!pick) {
      return;
    }
    changed = true;
    next[index] = {
      ...row,
      sharePointId: Number(pick.sharePointId) || 0,
      sapPosted: Boolean(pick.sapPosted),
    };
  });

  return changed ? next : rows;
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
