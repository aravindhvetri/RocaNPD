import type { INpdItemDetailRecord } from "./Interface";
import type { ISapMaterialMasterRequestRow } from "./sapMaterialMasterPayload";

export interface ISapMaterialMasterPostDependencies {
  postRow: (row: ISapMaterialMasterRequestRow) => Promise<string>;
  assertSuccess: (responseText: string, materialCode: string) => void;
  markPosted: (sharePointId: number) => Promise<void>;
  insertMaster: (item: INpdItemDetailRecord) => Promise<void>;
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
 */
export async function postItemDetailsToSap(
  items: INpdItemDetailRecord[],
  buildRow: (item: INpdItemDetailRecord) => ISapMaterialMasterRequestRow,
  deps: ISapMaterialMasterPostDependencies,
): Promise<void> {
  const failures: string[] = [];

  for (const item of items.filter(isPersistableItem)) {
    const label = item.materialCode.trim() || item.materialDescription.trim();

    if (item.sapPosted) {
      try {
        await deps.insertMaster(item);
      } catch (error) {
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
      await deps.insertMaster(item);
    } catch (error) {
      failures.push(`${label}: ${errorText(error)}`);
    }
  }

  if (failures.length) {
    throw new Error(
      `SAP did not complete every Item Details record. ${failures.join(" ")} Records already accepted by SAP were kept and will not be sent again.`,
    );
  }
}
