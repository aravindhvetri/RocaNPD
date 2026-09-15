import * as XLSX from "xlsx";
import type { IExportColumn } from "./Interface";

export interface IExportToExcelOptions<T extends Record<string, unknown>> {
  fileName: string;
  sheetName: string;
  columns: IExportColumn<T>[];
  rows: T[];
}

function ensureXlsxExtension(fileName: string): string {
  const trimmed = fileName.trim();
  if (trimmed.toLowerCase().endsWith(".xlsx")) {
    return trimmed;
  }
  return `${trimmed.replace(/\.xls$/i, "")}.xlsx`;
}

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Exports tabular data to an Excel (.xlsx) file and triggers a browser download.
 * Reused by master list screens and report exports.
 */
export function exportToExcel<T extends Record<string, unknown>>(
  options: IExportToExcelOptions<T>,
): void {
  const { fileName, sheetName, columns, rows } = options;

  if (!columns.length) {
    throw new Error("At least one export column is required.");
  }

  const headerRow = columns.map((column) => column.header);
  const dataRows = rows.map((row) =>
    columns.map((column) => String(column.value(row) ?? "")),
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  triggerBrowserDownload(blob, ensureXlsxExtension(fileName));
}
