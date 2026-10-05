import type { ISapMaterialMasterRequestRow } from "./sapMaterialMasterPayload";

/**
 * Interprets one createZMatMast response.
 * Documented shape is a JSON array of `{ status, matnr, message }` where status is True or False.
 * Plain-text success is accepted only when the body is not JSON, matching the shared API helper.
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

  const rows = Array.isArray(parsed) ? parsed : [parsed];
  if (!rows.length) {
    throw new Error(`SAP did not receive material ${label}.`);
  }

  rows.forEach((row) => {
    if (!row || typeof row !== "object") {
      throw new Error(
        `SAP returned an invalid response for material ${label}.`,
      );
    }

    const record = row as Record<string, unknown>;
    const status = String(record.status ?? record.Status ?? "")
      .trim()
      .toLowerCase();
    const message = String(record.message ?? record.Message ?? "").trim();

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
      message || `SAP returned an unrecognized status for material ${label}.`,
    );
  });
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
