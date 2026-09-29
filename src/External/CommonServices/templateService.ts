import * as XLSX from "xlsx";
import { Config } from "./Config";
import type { ITemplateDocument } from "./Interface";
import SPServices from "./SPServices";

const TEMPLATE_SELECT =
  "Id,FileLeafRef,FileRef,TemplateType,File/ServerRelativeUrl,File/Name";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function mapTemplateItem(item: Record<string, unknown>): ITemplateDocument {
  const file = item.File as Record<string, unknown> | undefined;

  return {
    Id: Number(item.Id),
    FileName: String(file?.Name ?? item.FileLeafRef ?? ""),
    ServerRelativeUrl: String(file?.ServerRelativeUrl ?? item.FileRef ?? ""),
    TemplateType: String(item.TemplateType ?? ""),
  };
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
 * Rebuilds a workbook as plain cell values only — no Excel data validations,
 * dropdown lists, or other worksheet constraints.
 */
function toPlainTemplateWorkbook(source: XLSX.WorkBook): XLSX.WorkBook {
  const cleanBook = XLSX.utils.book_new();

  source.SheetNames.forEach((sheetName) => {
    const sourceSheet = source.Sheets[sheetName];
    if (!sourceSheet) {
      return;
    }

    const rows = XLSX.utils.sheet_to_json<Array<string | number | boolean | null>>(
      sourceSheet,
      {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
      },
    );

    const cleanSheet = XLSX.utils.aoa_to_sheet(rows);
    delete (cleanSheet as XLSX.WorkSheet & { "!dataValidation"?: unknown })[
      "!dataValidation"
    ];
    delete (cleanSheet as XLSX.WorkSheet & { "!dataValidations"?: unknown })[
      "!dataValidations"
    ];

    XLSX.utils.book_append_sheet(cleanBook, cleanSheet, sheetName);
  });

  if (!cleanBook.SheetNames.length) {
    XLSX.utils.book_append_sheet(cleanBook, XLSX.utils.aoa_to_sheet([[]]), "Sheet1");
  }

  return cleanBook;
}

/**
 * Fetches the first template file from NPD_Templates where TemplateType matches.
 */
export async function fetchTemplateByType(
  templateType: string,
): Promise<ITemplateDocument | null> {
  const rows = (await SPServices.SPReadItems({
    Listname: Config.LibraryNames.NPDTemplates,
    Select: TEMPLATE_SELECT,
    Expand: "File",
    Filter: [
      {
        FilterKey: "TemplateType",
        Operator: "eq",
        FilterValue: templateType,
      },
    ],
    Topcount: 1,
    Orderby: "Modified",
    Orderbydecorasc: false,
  })) as Record<string, unknown>[];

  if (!rows.length) {
    return null;
  }

  const mapped = mapTemplateItem(rows[0]);
  if (!mapped.ServerRelativeUrl || !mapped.FileName) {
    return null;
  }

  return mapped;
}

/**
 * Downloads a SharePoint template as a simple Excel file (values only, no
 * data validations). Falls back to the raw blob if workbook rewrite fails.
 */
export async function downloadTemplateFile(
  template: ITemplateDocument,
): Promise<void> {
  const blob = await SPServices.SPDownloadFileBlob(template.ServerRelativeUrl);

  try {
    const buffer = await blob.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const plainWorkbook = toPlainTemplateWorkbook(workbook);
    const output = XLSX.write(plainWorkbook, {
      bookType: "xlsx",
      type: "array",
    });
    const fileName = template.FileName.toLowerCase().endsWith(".xlsx")
      ? template.FileName
      : `${template.FileName.replace(/\.xls$/i, "")}.xlsx`;
    triggerBrowserDownload(new Blob([output], { type: XLSX_MIME }), fileName);
  } catch {
    triggerBrowserDownload(blob, template.FileName);
  }
}
