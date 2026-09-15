import { Config } from "./Config";
import type { ITemplateDocument } from "./Interface";
import SPServices from "./SPServices";

const TEMPLATE_SELECT =
  "Id,FileLeafRef,FileRef,TemplateType,File/ServerRelativeUrl,File/Name";

function mapTemplateItem(item: Record<string, unknown>): ITemplateDocument {
  const file = item.File as Record<string, unknown> | undefined;

  return {
    Id: Number(item.Id),
    FileName: String(file?.Name ?? item.FileLeafRef ?? ""),
    ServerRelativeUrl: String(file?.ServerRelativeUrl ?? item.FileRef ?? ""),
    TemplateType: String(item.TemplateType ?? ""),
  };
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
 * Downloads a SharePoint template file to the user's browser.
 */
export async function downloadTemplateFile(
  template: ITemplateDocument,
): Promise<void> {
  const blob = await SPServices.SPDownloadFileBlob(template.ServerRelativeUrl);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = template.FileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
