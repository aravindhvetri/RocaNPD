import * as XLSX from "xlsx-js-style";
import type { IExportColumn } from "./Interface";

export interface IExportToExcelOptions<T extends Record<string, unknown>> {
  fileName: string;
  sheetName: string;
  columns: IExportColumn<T>[];
  rows: T[];
}

/** Shared export filename date segment: DD-MM-YYYY */
export function formatExportDateStamp(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/** Builds `{baseName}_Export_{DD-MM-YYYY}` without extension. */
export function buildExportFileName(baseName: string, date = new Date()): string {
  return `${baseName}_Export_${formatExportDateStamp(date)}`;
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

const EXPORT_HEADER_FILL = "5793A0";
const EXPORT_HEADER_FONT = "FFFFFF";

function applyHeaderStyles(
  worksheet: XLSX.WorkSheet,
  columnCount: number,
): void {
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: columnIndex });
    const cell = worksheet[cellRef];

    if (!cell) {
      continue;
    }

    cell.s = {
      fill: {
        patternType: "solid",
        fgColor: { rgb: EXPORT_HEADER_FILL },
      },
      font: {
        bold: true,
        color: { rgb: EXPORT_HEADER_FONT },
        name: "Poppins",
        sz: 11,
      },
      alignment: {
        vertical: "center",
        horizontal: "left",
      },
    };
  }
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
  applyHeaderStyles(worksheet, columns.length);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
  });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  triggerBrowserDownload(blob, ensureXlsxExtension(fileName));
}
