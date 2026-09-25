import { Config } from "./Config";
import type { INpdRequestGeneralInfo } from "./Interface";
import {
  buildNpdApprovalEmailHtml,
  getNpdEmailIntro,
  getNpdEmailLoginUrl,
  greetingNameFromEmail,
} from "./npdApprovalEmailTemplate";
import { resolveNpdWebAbsoluteUrl } from "./npdAppUrl";
import { getRocaLogoInlineAttachment } from "./npdEmailLogo";
import SPServices from "./SPServices";

export interface INpdNotificationPayload {
  request: INpdRequestGeneralInfo;
  action: string;
  comments?: string;
  role?: string;
  to: string[];
  includeActionButtons?: boolean;
  /**
   * SPFx web absolute URL (from Redux `app.siteUrl` / pageContext.web.absoluteUrl).
   * Required for correct ApproverMail links — do not omit when available.
   */
  siteUrl?: string;
}

export async function sendNpdApprovalNotification(
  payload: INpdNotificationPayload,
): Promise<void> {
  const recipients = payload.to
    .map((email) => email.trim())
    .filter((email, index, values) => email.includes("@") && values.indexOf(email) === index);

  if (!recipients.length) {
    return;
  }

  const requestId = payload.request.Title.trim() || "NPD Request";
  const includeActionButtons = Boolean(payload.includeActionButtons);
  const greetingName = greetingNameFromEmail(recipients[0]);
  const introText = getNpdEmailIntro(payload.action, includeActionButtons);
  const siteUrl = resolveNpdWebAbsoluteUrl(
    payload.siteUrl || SPServices.getSpfxWebAbsoluteUrl(),
  );
  const loginUrl = getNpdEmailLoginUrl(
    payload.action,
    payload.request.Id,
    includeActionButtons,
    siteUrl,
  );
  if (includeActionButtons && !siteUrl) {
    console.error(
      "NPD ApproverMail links: web absolute URL could not be resolved; action buttons may be invalid.",
    );
  }
  const subject = `${requestId} — ${
    includeActionButtons ? "Approval Required" : payload.action
  }`;
  const body = buildNpdApprovalEmailHtml({
    request: payload.request,
    greetingName,
    introText,
    includeActionButtons,
    loginUrl,
    siteUrl,
  });
  const logo = await getRocaLogoInlineAttachment();

  await SPServices.SendOutlookMail({
    to: recipients,
    subject,
    body,
    inlineAttachments: logo ? [logo] : [],
  });
}

export function shouldIncludeNpdEmailActions(role: string): boolean {
  return role.trim().toLowerCase() === Config.Roles.VerticalHead.toLowerCase();
}
