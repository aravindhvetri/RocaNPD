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

export function validateNpdRequestForm(
  generalInfo: INpdGeneralInfo,
  itemRows: INpdItemDetailRow[],
): string[] {
  const messages = validateNpdGeneralInfo(generalInfo);
  const filledRows = itemRows.filter((row) => !isEmptyItemDetailRow(row));

  if (!filledRows.length) {
    messages.push("Add at least one item line.");
    return messages;
  }

  const visibleFields = getVisibleNpdItemDetailFields(generalInfo.brand);

  filledRows.forEach((row, index) => {
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

  return messages;
}
