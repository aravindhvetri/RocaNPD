import { Config, FieldLabels } from "./Config";
import { lookupTitlesInclude } from "./lookupFieldUtils";
import {
  buildMgDraftReworkUrl,
  buildMgHashUrl,
  buildMgRejectedViewUrl,
  buildMgRequestFormUrl,
  buildMgReworkEditUrl,
} from "./mgAppUrl";
import { getRocaLogoInlineAttachment } from "./npdEmailLogo";
import { greetingNameFromEmail } from "./npdApprovalEmailTemplate";
import { extractPersonEmails, normalizeEmail } from "./personFieldUtils";
import { APPROVERS_EXPAND, APPROVERS_SELECT } from "./roleService";
import { requireRocaMasterSiteUrl } from "./rocaSiteUrlResolver";
import SPServices from "./SPServices";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function uniqueEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  emails.forEach((email) => {
    const normalized = normalizeEmail(email);
    if (!normalized.includes("@") || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    unique.push(email.trim());
  });

  return unique;
}

function cellLabel(text: string): string {
  return `<td style="background:${Config.NpdEmail.LabelBackground};font-weight:600;width:22%;padding:8px;border:1px solid ${Config.NpdEmail.BorderColor};">${escapeHtml(text)}</td>`;
}

function cellValue(text: string): string {
  return `<td style="padding:8px;border:1px solid ${Config.NpdEmail.BorderColor};">${escapeHtml(text)}</td>`;
}

function formatDate(value?: string): string {
  if (!value) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${now.getFullYear()}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * Resolves Consultant email addresses from ROCA ApproversMaster.
 */
export async function fetchConsultantEmails(
  contextSiteUrl?: string,
): Promise<string[]> {
  try {
    const rocaSiteUrl = requireRocaMasterSiteUrl(contextSiteUrl);
    const rows = (await SPServices.getAnotherSPReadItems({
      SiteUrl: rocaSiteUrl,
      Listname: Config.RocaMasterListNames.ApproversMaster,
      Select: APPROVERS_SELECT,
      Expand: APPROVERS_EXPAND,
      Topcount: 5000,
    })) as Record<string, unknown>[];

    const consultantEmails: string[] = [];

    rows.forEach((row) => {
      if (
        row.IsDelete === true ||
        row.IsDelete === "Yes" ||
        row.IsDeleted === true ||
        row.IsDeleted === "Yes"
      ) {
        return;
      }

      if (lookupTitlesInclude(row.Role, Config.Roles.Consultant)) {
        const rowEmails = extractPersonEmails(row.Users ?? row.User);
        consultantEmails.push(...rowEmails);
      }
    });

    return uniqueEmails(consultantEmails);
  } catch (error) {
    console.warn("Could not fetch Consultant emails from ApproversMaster:", error);
    return [];
  }
}

export interface IConsultantApproverInfo {
  name: string;
  email: string;
}

/**
 * Resolves the configured Consultant's display name and email from ROCA ApproversMaster.
 */
export async function fetchConsultantApproverInfo(
  contextSiteUrl?: string,
): Promise<IConsultantApproverInfo | null> {
  try {
    const rocaSiteUrl = requireRocaMasterSiteUrl(contextSiteUrl);
    const rows = (await SPServices.getAnotherSPReadItems({
      SiteUrl: rocaSiteUrl,
      Listname: Config.RocaMasterListNames.ApproversMaster,
      Select: APPROVERS_SELECT,
      Expand: APPROVERS_EXPAND,
      Topcount: 5000,
    })) as Record<string, unknown>[];

    for (const row of rows) {
      if (
        row.IsDelete === true ||
        row.IsDelete === "Yes" ||
        row.IsDeleted === true ||
        row.IsDeleted === "Yes"
      ) {
        continue;
      }

      if (lookupTitlesInclude(row.Role, Config.Roles.Consultant)) {
        const users = row.Users ?? row.User;
        if (Array.isArray(users) && users.length > 0) {
          const first = users[0] as Record<string, unknown>;
          const name = String(first?.Title || first?.name || "").trim();
          const email = String(first?.EMail || first?.email || "").trim();
          if (name || email) {
            return { name: name || email, email };
          }
        } else if (users && typeof users === "object") {
          const userObj = users as Record<string, unknown>;
          const name = String(userObj.Title || userObj.name || "").trim();
          const email = String(userObj.EMail || userObj.email || "").trim();
          if (name || email) {
            return { name: name || email, email };
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.warn("Could not fetch Consultant info from ApproversMaster:", error);
    return null;
  }
}

function buildMaterialGroupEmailHtml(params: {
  greetingName: string;
  introText: string;
  requestId: string;
  status: string;
  initiatorName: string;
  submittedDate?: string;
  configuredMasters: string[];
  entriesCount: number;
  comments?: string;
  loginUrl: string;
  loginLabel?: string;
}): string {
  const theme = Config.NpdEmail;
  const logoCid = theme.LogoContentId;
  const mastersText = params.configuredMasters.length
    ? params.configuredMasters.join(", ")
    : "—";
  const commentsRow = params.comments
    ? `<tr>
          ${cellLabel("Comments")}
          ${cellValue(params.comments)}
          ${cellLabel("")}
          ${cellValue("")}
        </tr>`
    : "";

  return `
<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#222;border-collapse:collapse;">
  <tr>
    <td style="background:${theme.HeaderBackground};padding:12px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="color:${theme.HeaderColor};font-weight:600;font-size:16px;vertical-align:middle;">Material Group Request</td>
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
          ${cellValue(params.requestId)}
          ${cellLabel("Status")}
          ${cellValue(params.status)}
        </tr>
        <tr>
          ${cellLabel(FieldLabels.Initiator)}
          ${cellValue(params.initiatorName)}
          ${cellLabel("Submitted Date")}
          ${cellValue(formatDate(params.submittedDate))}
        </tr>
        <tr>
          ${cellLabel(FieldLabels.ConfiguredMasters)}
          ${cellValue(mastersText)}
          ${cellLabel(FieldLabels.EntriesCount)}
          ${cellValue(String(params.entriesCount))}
        </tr>
        ${commentsRow}
      </table>
      <p style="margin:0 0 16px;">Please <a href="${escapeHtml(params.loginUrl)}">${escapeHtml(params.loginLabel || "log in")}</a> to the NPD system to continue.</p>
      <p style="margin:24px 0 4px;">Regards,<br/>NPD System</p>
      <p style="margin:12px 0 0;"><strong>Note:</strong> This is an auto-generated email from the NPD System. Please do not reply directly to this message</p>
    </td>
  </tr>
</table>`.trim();
}

async function sendMgMail(params: {
  to: string[];
  subject: string;
  body: string;
}): Promise<void> {
  const recipients = uniqueEmails(params.to);
  if (!recipients.length) {
    return;
  }

  const logo = await getRocaLogoInlineAttachment().catch(() => null);
  await SPServices.SendOutlookMail({
    to: recipients,
    subject: params.subject,
    body: params.body,
    inlineAttachments: logo ? [logo] : [],
  });
}

export interface IMaterialGroupSubmitNotificationParams {
  requestId: string;
  requestListItemId: number;
  initiatorName: string;
  initiatorEmail: string;
  configuredMasters: string[];
  entriesCount: number;
  submittedDate?: string;
}

/**
 * Sends an email notification to the Consultant when an Initiator submits an MG request.
 * Template matches NPD approval email (header + ROCA logo + deep link).
 */
export async function sendMaterialGroupSubmitNotification(
  params: IMaterialGroupSubmitNotificationParams,
): Promise<void> {
  const consultantEmails = await fetchConsultantEmails();
  if (!consultantEmails.length) {
    console.warn(
      `No Consultant email found in ApproversMaster for MG submission ${params.requestId}.`,
    );
    return;
  }

  const greetingName = greetingNameFromEmail(consultantEmails[0]);
  const loginUrl = buildMgRequestFormUrl(
    params.requestListItemId,
    "consultant-edit",
  );
  const subject = `${params.requestId} — Approval Required`;
  const body = buildMaterialGroupEmailHtml({
    greetingName,
    introText:
      "A new Material Group request has been submitted and requires your review and SAP codification.",
    requestId: params.requestId,
    status: Config.MaterialGroupStatus.Pending,
    initiatorName: params.initiatorName || params.initiatorEmail || "Initiator",
    submittedDate: params.submittedDate,
    configuredMasters: params.configuredMasters,
    entriesCount: params.entriesCount,
    loginUrl,
    loginLabel: "open this request",
  });

  await sendMgMail({ to: consultantEmails, subject, body });
}

export interface IMaterialGroupInitiatorNotificationParams {
  requestId: string;
  requestListItemId: number;
  initiatorName: string;
  initiatorEmail: string;
  configuredMasters: string[];
  entriesCount: number;
  action: "Rework" | "Rejected";
  comments: string;
  submittedDate?: string;
}

/**
 * Notifies the Initiator when Consultant sends Rework or Rejects the request.
 */
export async function sendMaterialGroupInitiatorNotification(
  params: IMaterialGroupInitiatorNotificationParams,
): Promise<void> {
  const to = uniqueEmails([params.initiatorEmail]);
  if (!to.length) {
    console.warn(
      `No Initiator email for MG ${params.action} on ${params.requestId}.`,
    );
    return;
  }

  const isRework = params.action === "Rework";
  const greetingName =
    params.initiatorName?.trim() || greetingNameFromEmail(to[0]);
  const loginUrl = isRework
    ? buildMgReworkEditUrl(params.requestListItemId)
    : buildMgRejectedViewUrl(params.requestListItemId);
  const fallbackListUrl = isRework
    ? buildMgDraftReworkUrl()
    : buildMgHashUrl(Config.Routes.MgAll);

  const subject = `${params.requestId} — ${params.action}`;
  const introText = isRework
    ? "A Material Group request has been sent back for rework."
    : "A Material Group request has been rejected.";

  const body = buildMaterialGroupEmailHtml({
    greetingName,
    introText,
    requestId: params.requestId,
    status: isRework
      ? Config.MaterialGroupStatus.Rework
      : Config.MaterialGroupStatus.Rejected,
    initiatorName: params.initiatorName || params.initiatorEmail || "Initiator",
    submittedDate: params.submittedDate,
    configuredMasters: params.configuredMasters,
    entriesCount: params.entriesCount,
    comments: params.comments,
    loginUrl: loginUrl || fallbackListUrl,
    loginLabel: isRework ? "open this request for rework" : "view this request",
  });

  await sendMgMail({ to, subject, body });
}
