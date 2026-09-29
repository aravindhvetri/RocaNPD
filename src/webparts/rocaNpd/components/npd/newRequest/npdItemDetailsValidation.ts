import type { INpdGeneralInfo } from "../../../../../External/CommonServices/Interface";
import {
  getVisibleNpdItemDetailFields,
  isEmptyItemDetailRow,
  isRocaGlobalCodeBrand,
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
 * Roca Global Code / Material Code / Material Description must be unique
 * within the request (case-insensitive). Empty values are ignored.
 */
export function validateNpdItemDetailDuplicates(
  itemRows: INpdItemDetailRow[],
  brand: string | null,
): string[] {
  const messages: string[] = [];
  const checkRocaGlobalCode = isRocaGlobalCodeBrand(brand);

  const trackers: Array<{
    label: string;
    getValue: (row: INpdItemDetailRow) => string;
    enabled: boolean;
  }> = [
    {
      label: "Roca Global Code",
      getValue: (row) => String(row.rocaGlobalCode ?? ""),
      enabled: checkRocaGlobalCode,
    },
    {
      label: "Material Code",
      getValue: (row) => String(row.materialCode ?? ""),
      enabled: true,
    },
    {
      label: "Material Description",
      getValue: (row) => String(row.materialDescription ?? ""),
      enabled: true,
    },
  ];

  trackers.forEach(({ label, getValue, enabled }) => {
    if (!enabled) {
      return;
    }

    const firstLineByValue = new Map<string, number>();
    itemRows.forEach((row, index) => {
      const raw = getValue(row);
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
        `Item line ${index + 1}: ${label} "${raw.trim()}" already exists (Item line ${firstLine}).`,
      );
    });
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
 * Used for Initiator Submit and MIS Post to SAP / Approve / Rework / Reject
 * when items are editable.
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
 * MIS Coordinator gate for Post to SAP / Rework / Reject:
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
