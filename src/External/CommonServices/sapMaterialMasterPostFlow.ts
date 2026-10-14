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
  insertMaster: (item: INpdItemDetailRecord) => Promise<void>;
  /**
   * Called when SAP posting starts (0/total) and after each successful
   * createZMatMast + SAP flag write. Failures do not increment current.
   */
  onProgress?: (posted: number, total: number) => void;
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
 * Posts each Item Details line with SAP=false, then inserts that line into Material Master.
 * Lines already marked SAP=true are not sent again; their Material Master row is ensured.
 * Any failure is collected so later lines can still succeed. The caller must not approve
 * when this throws.
 * Network loss fails immediately and does not continue remaining lines.
 * Reconnecting does not resume this batch — the caller must start a new action.
 * An in-flight line that still succeeds after a brief reconnect is not interrupted.
 */
export async function postItemDetailsToSap(
  items: INpdItemDetailRecord[],
  buildRow: (item: INpdItemDetailRecord) => ISapMaterialMasterRequestRow,
  deps: ISapMaterialMasterPostDependencies,
): Promise<void> {
  const failures: string[] = [];
  const sapTargets = items.filter(
    (item) => isPersistableItem(item) && !item.sapPosted,
  );
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
    for (const item of items.filter(isPersistableItem)) {
      // Do not start the next line after offline, even if the network is back.
      if (shouldStop()) {
        throw new Error(NETWORK_OFFLINE_MESSAGE);
      }

      const label = item.materialCode.trim() || item.materialDescription.trim();

      if (item.sapPosted) {
        try {
          await deps.insertMaster(item);
        } catch (error) {
          if (isNetworkError(error)) {
            throw error instanceof Error
              ? error
              : new Error(NETWORK_OFFLINE_MESSAGE);
          }
          failures.push(`${label}: ${errorText(error)}`);
        }
        continue;
      }

      if (!item.sharePointId) {
        failures.push(
          `${label}: the Item Details record was not saved, so it was not sent to SAP.`,
        );
        continue;
      }

      try {
        const row = buildRow(item);
        const responseText = await deps.postRow(row);
        deps.assertSuccess(responseText, label);
        await deps.markPosted(item.sharePointId);
        item.sapPosted = true;
        posted += 1;
        deps.onProgress?.(posted, total);
        if (shouldStop()) {
          throw new Error(NETWORK_OFFLINE_MESSAGE);
        }
        await deps.insertMaster(item);
        if (shouldStop()) {
          throw new Error(NETWORK_OFFLINE_MESSAGE);
        }
      } catch (error) {
        // Stop the batch immediately on network loss — do not continue remaining lines.
        if (isNetworkError(error) || shouldStop()) {
          throw error instanceof Error
            ? error
            : new Error(NETWORK_OFFLINE_MESSAGE);
        }
        failures.push(`${label}: ${errorText(error)}`);
      }
    }

    if (failures.length) {
      throw new Error(
        `SAP did not process all Item Details records due to the error: ${failures.join(" ")} Records already accepted by SAP have been retained and will not be resubmitted.`,
      );
    }
  } finally {
    stopWatch();
  }
}
