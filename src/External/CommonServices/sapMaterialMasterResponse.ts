import type { ISapMaterialMasterRequestRow } from "./sapMaterialMasterPayload";

function readSapResultStatus(record: Record<string, unknown>): string {
  return String(
    record.STATUS ?? record.Status ?? record.status ?? "",
  )
    .trim()
    .toLowerCase();
}

function readSapResultMessage(record: Record<string, unknown>): string {
  return String(
    record.MESSAGE ?? record.Message ?? record.message ?? "",
  ).trim();
}

/**
 * Validates one createZMatMast result row. Success requires STATUS/status True —
 * not HTTP 200, sapStatusCode, or a wrapper-level status alone.
 */
function assertSapResultRowSuccess(
  row: unknown,
  materialCode: string,
): void {
  const label = materialCode.trim() || "item";
  if (!row || typeof row !== "object") {
    throw new Error(
      `SAP returned an invalid response for material ${label}.`,
    );
  }

  const record = row as Record<string, unknown>;
  const status = readSapResultStatus(record);
  const message = readSapResultMessage(record);

  if (status === "true") {
    return;
  }

  if (
    status === "false" ||
    status === "failed" ||
    status === "failure" ||
    record.success === false
  ) {
    throw new Error(message || `SAP rejected material ${label}.`);
  }

  throw new Error(
    message ||
      `SAP returned an unrecognized status for material ${label}.`,
  );
}

function assertSapResultRowsSuccess(
  rows: unknown[],
  materialCode: string,
): void {
  const label = materialCode.trim() || "item";
  if (!rows.length) {
    throw new Error(`SAP did not receive material ${label}.`);
  }
  rows.forEach((row) => assertSapResultRowSuccess(row, label));
}

/**
 * Interprets one createZMatMast response.
 * Success is driven by each sapData item's STATUS (True/False). Top-level
 * status, sapStatusCode, and HTTP success alone must not mark a line posted.
 * Legacy array bodies `[{ status, matnr, message }]` are still accepted.
 * Plain-text success is accepted only when the body is not JSON.
 */
export function assertSapMaterialMasterSuccess(
  responseText: string,
  materialCode: string,
): void {
  const trimmed = String(responseText ?? "").trim();
  const label = materialCode.trim() || "item";
  if (!trimmed) {
    throw new Error(`SAP returned an empty response for material ${label}.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const cleaned = trimmed.replace(/^"|"$/g, "").trim().toLowerCase();
    if (cleaned === "save successfully" || cleaned.includes("success")) {
      return;
    }
    throw new Error(trimmed);
  }

  // Current API: { status, message, sapStatusCode, sapData: [{ STATUS, MATNR, MESSAGE }] }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const envelope = parsed as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(envelope, "sapData") ||
      Object.prototype.hasOwnProperty.call(envelope, "SapData")) {
      const sapData = envelope.sapData ?? envelope.SapData;
      if (!Array.isArray(sapData)) {
        throw new Error(
          `SAP returned an invalid sapData response for material ${label}.`,
        );
      }
      assertSapResultRowsSuccess(sapData, label);
      return;
    }
  }

  // Legacy body: array of result rows, or a single result row.
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  assertSapResultRowsSuccess(rows, label);
}

export async function postSapMaterialMasterRow(
  apiUrl: string,
  row: ISapMaterialMasterRequestRow,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  // One Item Details record per call — body is an array containing a single TY_DATA object.
  const payload = JSON.stringify([row]);
  console.log("SAP Material Master request JSON:", payload);

  const response = await fetchImpl(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });

  const text = await response.text();
  console.log("SAP Material Master response text:", text);
  if (!response.ok) {
    throw new Error(text.trim() || `HTTP error! Status: ${response.status}`);
  }

  return text;
}
