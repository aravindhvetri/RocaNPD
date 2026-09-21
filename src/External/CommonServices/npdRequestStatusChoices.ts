import { Config } from "./Config";
import SPServices from "./SPServices";

/**
 * Status choice values from NPD_Request.Status (SharePoint choice field).
 * Used to order/filter Status dropdown options — never invent extra statuses.
 */
export async function fetchNpdRequestStatusChoices(): Promise<string[]> {
  try {
    const field = (await SPServices.SPGetChoices({
      Listname: Config.ListNames.NpdRequest,
      FieldName: Config.FieldNames.NpdRequest.Status,
    })) as { Choices?: unknown };

    if (!Array.isArray(field.Choices)) {
      return [];
    }

    return field.Choices.map((choice) => String(choice ?? "").trim()).filter(
      Boolean,
    );
  } catch {
    return [];
  }
}
