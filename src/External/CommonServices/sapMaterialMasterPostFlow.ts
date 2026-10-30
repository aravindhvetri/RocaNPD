import type { INpdItemDetailRecord } from "./Interface";
import type { ISapMaterialMasterRequestRow } from "./sapMaterialMasterPayload";
import {
  isBrowserOnline,
  isNetworkError,
  NETWORK_OFFLINE_MESSAGE,
} from "./networkConnectivity";

export interface ISapMaterialMasterPostDependencies {
  postRow: (row: ISapMaterialMasterRequestRow) => Promise<string>;
  assertSuccess: (responseText: string, materialCode: string) => void;
  markPosted: (sharePointId: number) => Promise<void>;
  /**
   * Called once after every persistable Item Details line has SAP=true.
   * Must not run while any SAP=false targets remain.
   */
  insertMaster: (items: INpdItemDetailRecord[]) => Promise<void>;
  /**
   * Called when SAP posting starts (0/total) and after each successful
   * createZMatMast + SAP flag write. Failures do not increment current.
   * `total` is the count of SAP=false lines for this attempt only.
   */
  onProgress?: (
    posted: number,
    total: number,
    postedSharePointId?: number,
  ) => void;
}

function isPersistableItem(item: INpdItemDetailRecord): boolean {
  return Boolean(item.materialCode.trim() || item.materialDescription.trim());
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "SAP request failed.";
}

/**
 * Posts each Item Details line with SAP=false to createZMatMast.
 * On success, sets that line's NPD_ItemDetails.SAP = true.
 * Material Master is written once after every persistable line is SAP=true —
 * never mid-batch when a later line fails.
 * Retry skips SAP=true lines; progress total is remaining SAP=false count only.
 * Network loss fails immediately. Reconnecting does not resume this batch.
 */
export async function postItemDetailsToSap(
  items: INpdItemDetailRecord[],
  buildRow: (item: INpdItemDetailRecord) => ISapMaterialMasterRequestRow,
  deps: ISapMaterialMasterPostDependencies,
): Promise<void> {
  const persistable = items.filter(isPersistableItem);
  const sapTargets = persistable.filter((item) => !item.sapPosted);
  const total = sapTargets.length;
  let posted = 0;
  deps.onProgress?.(0, total);

  // Stays set after the connection returns so this click does not post the rest.
  let stopAfterCurrent = false;
  const onOffline = (): void => {
    stopAfterCurrent = true;
  };
  const markStopped = (): void => {
    if (!isBrowserOnline()) {
      stopAfterCurrent = true;
    }
  };
  const shouldStop = (): boolean => stopAfterCurrent || !isBrowserOnline();

  if (typeof window !== "undefined") {
    window.addEventListener("offline", onOffline);
  }
  let topWindow: Window | null = null;
  try {
    if (typeof window !== "undefined" && window.top && window.top !== window) {
      topWindow = window.top;
      topWindow.addEventListener("offline", onOffline);
    }
  } catch {
    topWindow = null;
  }
  const offlinePollId =
    typeof window === "undefined" ? 0 : window.setInterval(markStopped, 200);

  const stopWatch = (): void => {
    if (typeof window !== "undefined") {
      window.removeEventListener("offline", onOffline);
      if (offlinePollId) {
        window.clearInterval(offlinePollId);
      }
    }
    if (topWindow) {
      topWindow.removeEventListener("offline", onOffline);
    }
  };

  if (shouldStop()) {
    stopWatch();
    throw new Error(NETWORK_OFFLINE_MESSAGE);
  }

  try {
    for (const item of sapTargets) {
      // Do not start the next line after offline, even if the network is back.
      if (shouldStop()) {
        throw new Error(NETWORK_OFFLINE_MESSAGE);
      }

      const label = item.materialCode.trim() || item.materialDescription.trim();

      if (!item.sharePointId) {
        throw new Error(
          `${label}: the Item Details record was not saved, so it was not sent to SAP.`,
        );
      }

      try {
        const row = buildRow(item);
        const responseText = await deps.postRow(row);
        // Reads sapData[].STATUS / MESSAGE — STATUS False stops the batch here.
        deps.assertSuccess(responseText, label);
        await deps.markPosted(item.sharePointId);
        item.sapPosted = true;
        posted += 1;
        deps.onProgress?.(posted, total, item.sharePointId);
        if (shouldStop()) {
          throw new Error(NETWORK_OFFLINE_MESSAGE);
        }
      } catch (error) {
        // Stop immediately — do not process remaining records or Material Master.
        if (isNetworkError(error) || shouldStop()) {
          throw error instanceof Error
            ? error
            : new Error(NETWORK_OFFLINE_MESSAGE);
        }
        const detail = errorText(error);
        throw new Error(
          detail.toLowerCase().includes(label.toLowerCase())
            ? detail
            : `${label}: ${detail}`,
        );
      }
    }

    // All SAP=false lines succeeded (or none remained). One Material Master write.
    if (shouldStop()) {
      throw new Error(NETWORK_OFFLINE_MESSAGE);
    }
    if (persistable.length) {
      await deps.insertMaster(persistable);
    }
  } finally {
    stopWatch();
  }
}
