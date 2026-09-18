import { Config, FieldLabels } from "./Config";
import type { INpdRequestGeneralInfo, NpdWorkflowAction } from "./Interface";
import {
  buildNpdDraftReworkUrl,
  buildNpdEmailActionUrl,
  buildNpdPendingUrl,
  buildNpdRequestFormUrl,
} from "./npdAppUrl";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function cellLabel(text: string): string {
  return `<td style="background:${Config.NpdEmail.LabelBackground};font-weight:600;width:22%;padding:8px;border:1px solid ${Config.NpdEmail.BorderColor};">${escapeHtml(text)}</td>`;
}

function cellValue(text: string): string {
  return `<td style="padding:8px;border:1px solid ${Config.NpdEmail.BorderColor};">${escapeHtml(text)}</td>`;
}

function actionButton(label: string, href: string, background: string): string {
  return `<a href="${escapeHtml(href)}" style="background:${background};color:${Config.NpdEmail.ButtonColor};padding:10px 22px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:600;font-size:14px;margin-right:10px;">${escapeHtml(label)}</a>`;
}

export function buildNpdApprovalEmailHtml(params: {
  request: INpdRequestGeneralInfo;
  greetingName: string;
  introText: string;
  includeActionButtons: boolean;
  loginUrl: string;
}): string {
  const { request } = params;
  const requestId = request.Title.trim() || "NPD Request";
  const theme = Config.NpdEmail;
  const logoCid = theme.LogoContentId;

  const actionButtons = params.includeActionButtons
    ? `<p style="margin:20px 0;">${actionButton(
        "Approve",
        buildNpdEmailActionUrl(request.Id, "Approve"),
        theme.ApproveBackground,
      )}${actionButton(
        "Re-work",
        buildNpdEmailActionUrl(request.Id, "Rework"),
        theme.ReworkBackground,
      )}${actionButton(
        "Reject",
        buildNpdEmailActionUrl(request.Id, "Reject"),
        theme.RejectBackground,
      )}</p>`
    : "";

  return `
<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#222;border-collapse:collapse;">
  <tr>
    <td style="background:${theme.HeaderBackground};padding:12px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="color:${theme.HeaderColor};font-weight:600;font-size:16px;vertical-align:middle;">NPD Request</td>
          <td style="text-align:right;vertical-align:middle;width:1%;white-space:nowrap;">
            <span style="display:inline-block;background:#ffffff;padding:6px 10px;border-radius:2px;">
              <img src="cid:${logoCid}" alt="ROCA Group" height="36" style="display:block;height:36px;width:auto;border:0;" />
            </span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 16px 8px;">
      <p style="margin:0 0 12px;">Dear ${escapeHtml(params.greetingName)},</p>
      <p style="margin:0 0 16px;">${escapeHtml(params.introText)}</p>
      <p style="margin:0 0 8px;font-weight:700;">Request Details</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
        <tr>
          ${cellLabel("Request ID")}
          ${cellValue(requestId)}
          ${cellLabel("Status")}
          ${cellValue(request.Status)}
        </tr>
        <tr>
          ${cellLabel(FieldLabels.BrandMg1)}
          ${cellValue(request.Brand)}
          ${cellLabel(FieldLabels.MaterialType)}
          ${cellValue(request.MaterialType)}
        </tr>
        <tr>
          ${cellLabel(FieldLabels.PlantSource)}
          ${cellValue(request.Plant)}
          ${cellLabel("Submitted By")}
          ${cellValue(request.AuthorTitle || request.AuthorEmail)}
        </tr>
        <tr>
          ${cellLabel("Submitted Date")}
          ${cellValue(formatDate(request.Created))}
          ${cellLabel("")}
          ${cellValue("")}
        </tr>
      </table>
      <p style="margin:0 0 16px;">Please <a href="${escapeHtml(params.loginUrl)}">log in</a> to the NPD system to continue the approval process.</p>
      ${actionButtons}
      <p style="margin:24px 0 4px;">Regards,<br/>NPD System</p>
      <p style="margin:12px 0 0;"><strong>Note:</strong> This is an auto-generated email from the NPD System. Please do not reply directly to this message</p>
    </td>
  </tr>
</table>`.trim();
}

export function getNpdEmailIntro(
  action: string,
  includeActionButtons: boolean,
): string {
  if (action === "Submitted") {
    return "A new NPD request has been submitted and requires your approval.";
  }
  if (action === "Approve") {
    return includeActionButtons
      ? "An NPD request requires your approval."
      : "An NPD request has been approved by the Vertical Head and is awaiting your review.";
  }
  if (action === "Rework") {
    return "An NPD request has been sent back for rework.";
  }
  if (action === "Reject") {
    return "An NPD request has been rejected.";
  }
  return "An NPD request requires your attention.";
}

export function getNpdEmailLoginUrl(
  action: string,
  requestId: number,
  includeActionButtons: boolean,
): string {
  if (action === "Rework") {
    return buildNpdDraftReworkUrl();
  }
  if (includeActionButtons) {
    return buildNpdRequestFormUrl(requestId);
  }
  if (action === "Approve" || action === "Submitted") {
    return buildNpdRequestFormUrl(requestId);
  }
  return buildNpdPendingUrl();
}

export function greetingNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  if (!local) {
    return "Approver";
  }

  const cleaned = local.replace(/[._]+/g, " ").trim();
  return cleaned
    ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    : "Approver";
}

export type { NpdWorkflowAction };
