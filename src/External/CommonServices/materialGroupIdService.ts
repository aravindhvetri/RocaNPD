import { Config } from "./Config";
import { isDeletedYesFlag } from "./lookupFieldUtils";
import { SOFT_DELETE_FIELD } from "./softDelete";
import SPServices from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.MaterialGroupRequests;
const REQUEST_ID_PATTERN = /^MG-\d{4}-\d+$/i;

export function isMgRequestIdTitle(title: string): boolean {
  return REQUEST_ID_PATTERN.test(title.trim());
}

export async function generateNextMgRequestId(): Promise<string> {
  const rows = (await SPServices.SPReadItems({
    Listname: LIST_NAME(),
    Select: `Id,Title,${SOFT_DELETE_FIELD}`,
    Topcount: 5000,
  })) as Record<string, unknown>[];

  const currentYear = new Date().getFullYear();
  const prefix = Config.MgRequestIdFormat.Prefix;
  let lastId = "";
  let lastNumber = 0;

  rows.forEach((row) => {
    if (isDeletedYesFlag(row[SOFT_DELETE_FIELD])) {
      return;
    }

    const title = String(row.Title ?? "").trim();
    if (!isMgRequestIdTitle(title)) {
      return;
    }

    const parts = title.replace(prefix, "").split("-");
    if (parts.length !== 2) {
      return;
    }

    const year = Number(parts[0]);
    const sequence = Number(parts[1]);
    if (year !== currentYear || !Number.isFinite(sequence)) {
      return;
    }

    if (sequence >= lastNumber) {
      lastNumber = sequence;
      lastId = title;
    }
  });

  return SPServices.GenerateFormatId(
    prefix,
    lastId,
    Config.MgRequestIdFormat.PadLength,
  );
}
