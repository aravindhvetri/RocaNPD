import { Config } from "./Config";
import type { INpdRequestGeneralInfo } from "./Interface";
import {
  buildNpdApprovalEmailHtml,
  getNpdEmailIntro,
  getNpdEmailLoginUrl,
  greetingNameFromEmail,
} from "./npdApprovalEmailTemplate";
import { getRocaLogoInlineAttachment } from "./npdEmailLogo";
import SPServices from "./SPServices";

export interface INpdNotificationPayload {
  request: INpdRequestGeneralInfo;
  action: string;
  comments?: string;
  role?: string;
  to: string[];
  includeActionButtons?: boolean;
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
  const loginUrl = getNpdEmailLoginUrl(
    payload.action,
    payload.request.Id,
    includeActionButtons,
  );
  const subject = `${requestId} — ${
    includeActionButtons ? "Approval Required" : payload.action
  }`;
  const body = buildNpdApprovalEmailHtml({
    request: payload.request,
    greetingName,
    introText,
    includeActionButtons,
    loginUrl,
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
