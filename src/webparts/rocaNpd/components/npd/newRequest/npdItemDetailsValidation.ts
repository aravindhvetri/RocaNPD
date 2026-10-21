import type { INpdGeneralInfo } from "../../../../../External/CommonServices/Interface";
import {
  getVisibleNpdItemDetailFields,
  isEmptyItemDetailRow,
} from "./npdItemDetailsConfig";
import type { INpdItemDetailRow } from "./npdItemDetails.types";

function isEmptyText(value: string): boolean {
  return !value.trim();
}

function isEmptyMultiValue(value: unknown): boolean {
  return !Array.isArray(value) || value.length === 0;
}

function isEmptyNumber(value: unknown): boolean {
  return typeof value !== "number" || !Number.isFinite(value);
}

function normalizeUniqueValue(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Material Code must be unique within the request (case-insensitive).
 * Roca Global Code and Material Description duplicates are allowed.
 * Empty values are ignored.
 */
export function validateNpdItemDetailDuplicates(
  itemRows: INpdItemDetailRow[],
  _brand: string | null,
): string[] {
  const messages: string[] = [];
  const firstLineByValue = new Map<string, number>();

  itemRows.forEach((row, index) => {
    const raw = String(row.materialCode ?? "");
    const key = normalizeUniqueValue(raw);
    if (!key) {
      return;
    }

    const firstLine = firstLineByValue.get(key);
    if (firstLine === undefined) {
      firstLineByValue.set(key, index + 1);
      return;
    }

    messages.push(
      `Item line ${index + 1}: Material Code "${raw.trim()}" already exists (Item line ${firstLine}).`,
    );
  });

  return messages;
}

export function validateNpdDraftGeneralInfo(
  generalInfo: INpdGeneralInfo,
): string[] {
  const messages: string[] = [];

  if (!generalInfo.brand) {
    messages.push("Brand (MG1) is required.");
  }

  if (!generalInfo.materialType) {
    messages.push("Material Type is required.");
  }

  return messages;
}

/** Draft save: header fields + uniqueness of key Item Details texts. */
export function validateNpdDraftForm(
  generalInfo: INpdGeneralInfo,
  itemRows: INpdItemDetailRow[],
): string[] {
  const messages = validateNpdDraftGeneralInfo(generalInfo);
  const filledRows = itemRows.filter((row) => !isEmptyItemDetailRow(row));
  messages.push(
    ...validateNpdItemDetailDuplicates(filledRows, generalInfo.brand),
  );
  return messages;
}

export function validateNpdGeneralInfo(
  generalInfo: INpdGeneralInfo,
): string[] {
  const messages: string[] = [];

  if (!generalInfo.brand) {
    messages.push("Brand (MG1) is required.");
  }

  if (!generalInfo.materialType) {
    messages.push("Material Type is required.");
  }

  if (!generalInfo.plantSource) {
    messages.push("Plant / Source is required.");
  }

  return messages;
}

/**
 * Item Details grid only — every row's required fields + uniqueness.
 * Used for Initiator Submit and MIS Post to SAP when items are editable.
 * MIS Rework / Reject do not use this gate.
 */
export function validateNpdItemDetailsRows(
  brand: string | null,
  itemRows: INpdItemDetailRow[],
): string[] {
  const messages: string[] = [];

  if (!itemRows.length) {
    messages.push("Add at least one item line.");
    return messages;
  }

  const visibleFields = getVisibleNpdItemDetailFields(brand);

  itemRows.forEach((row, index) => {
    const lineLabel = `Item line ${index + 1}`;

    visibleFields.forEach((fieldDef) => {
      if (!fieldDef.required) {
        return;
      }

      const value = row[fieldDef.field];

      if (fieldDef.controlType === "multiselect" && isEmptyMultiValue(value)) {
        messages.push(`${lineLabel}: ${fieldDef.header} is required.`);
        return;
      }

      if (fieldDef.controlType === "number" && isEmptyNumber(value)) {
        messages.push(`${lineLabel}: ${fieldDef.header} is required.`);
        return;
      }

      if (
        fieldDef.controlType === "text" &&
        isEmptyText(String(value ?? ""))
      ) {
        messages.push(`${lineLabel}: ${fieldDef.header} is required.`);
      }
    });

    if (String(row.materialCode).trim().length > 18) {
      messages.push(`${lineLabel}: Material Code must be 18 characters or fewer.`);
    }

    if (String(row.materialDescription).trim().length > 40) {
      messages.push(
        `${lineLabel}: Material Description must be 40 characters or fewer.`,
      );
    }
  });

  messages.push(...validateNpdItemDetailDuplicates(itemRows, brand));
  return messages;
}

/**
 * MIS Coordinator gate for Post to SAP:
 * every Item Details row must be complete, and Profit Center is required.
 */
export function validateMisCoordinatorAction(
  brand: string | null,
  itemRows: INpdItemDetailRow[],
  profitCenter: string | null | undefined,
): string[] {
  const messages = validateNpdItemDetailsRows(brand, itemRows);
  if (!String(profitCenter ?? "").trim()) {
    messages.push("Profit Center is required.");
  }
  return messages;
}

/** MIS Reject: Profit Center is not required. */
export function validateMisCoordinatorReject(
  _profitCenter: string | null | undefined,
): string[] {
  return [];
}

/**
 * MIS Rework: Item Details completeness and Profit Center are not required.
 * Empty / incomplete Item Details are validated only on Post to SAP.
 */
export function validateMisCoordinatorRework(
  _brand: string | null,
  _changedRows: INpdItemDetailRow[],
  _profitCenter: string | null | undefined,
): string[] {
  return [];
}

/**
 * Submit / Approve validation. Every row in the grid is validated — blank added
 * lines are not skipped. Required fields must be filled on each line.
 */
export function validateNpdRequestForm(
  generalInfo: INpdGeneralInfo,
  itemRows: INpdItemDetailRow[],
): string[] {
  const messages = validateNpdGeneralInfo(generalInfo);
  messages.push(
    ...validateNpdItemDetailsRows(generalInfo.brand, itemRows),
  );
  return messages;
}
