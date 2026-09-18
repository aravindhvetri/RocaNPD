import { ApproverSystems, Config } from "./Config";
import {
  getLookupTitles,
  isDeletedApproverRow,
  lookupTitlesInclude,
} from "./lookupFieldUtils";
import {
  extractPersonEmails,
  normalizeEmail,
  parseSharePointUserIds,
} from "./personFieldUtils";
import { APPROVERS_EXPAND, APPROVERS_SELECT } from "./roleService";
import { requireRocaMasterSiteUrl } from "./rocaSiteUrlResolver";
import SPServices from "./SPServices";

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

function getRowUsers(row: Record<string, unknown>): unknown {
  return row.Users ?? row.User;
}

function rowMatchesNpdSystem(row: Record<string, unknown>): boolean {
  const systemTitles = getLookupTitles(row.System);
  if (!systemTitles.length) {
    return true;
  }

  return lookupTitlesInclude(
    row.System,
    ApproverSystems.NewProductDevelopment,
  );
}

function rowMatchesRole(row: Record<string, unknown>, role: string): boolean {
  return lookupTitlesInclude(row.Role, role);
}

function rowMatchesBrand(row: Record<string, unknown>, brand: string): boolean {
  return lookupTitlesInclude(row.Brand, brand);
}

function collectRowEmails(
  row: Record<string, unknown>,
  userEmailById: ReadonlyMap<number, string>,
): string[] {
  const emails = extractPersonEmails(getRowUsers(row));
  const userIds = [
    ...parseSharePointUserIds(row.UsersId),
    ...parseSharePointUserIds(row.UserId),
  ];

  userIds.forEach((id) => {
    const mappedEmail = userEmailById.get(id);
    if (mappedEmail) {
      emails.push(mappedEmail);
    }
  });

  return uniqueEmails(emails);
}

function roleIgnoresBrand(role: string): boolean {
  return (
    role.trim().toLowerCase() === Config.Roles.MisCoordinator.toLowerCase()
  );
}

export async function fetchNpdApproverAssignmentRows(
  contextSiteUrl?: string,
): Promise<{
  rows: Record<string, unknown>[];
  userEmailById: ReadonlyMap<number, string>;
}> {
  const rocaSiteUrl = requireRocaMasterSiteUrl(contextSiteUrl);
  const [rows, userEmailById] = await Promise.all([
    SPServices.getAnotherSPReadItems({
      SiteUrl: rocaSiteUrl,
      Listname: Config.RocaMasterListNames.ApproversMaster,
      Select: APPROVERS_SELECT,
      Expand: APPROVERS_EXPAND,
      Topcount: 5000,
    }) as Promise<Record<string, unknown>[]>,
    SPServices.getAnotherSPSiteUserEmailMap(rocaSiteUrl).catch(
      () => new Map<number, string>(),
    ),
  ]);

  return { rows, userEmailById };
}

export function getEmailsForNpdWorkflowRole(
  rows: Record<string, unknown>[],
  userEmailById: ReadonlyMap<number, string>,
  role: string,
  brand: string,
): string[] {
  const activeRows = rows.filter(
    (row) =>
      !isDeletedApproverRow(row) &&
      rowMatchesNpdSystem(row) &&
      rowMatchesRole(row, role),
  );

  if (!activeRows.length) {
    return [];
  }

  if (roleIgnoresBrand(role)) {
    return uniqueEmails(
      activeRows.flatMap((row) => collectRowEmails(row, userEmailById)),
    );
  }

  const brandRows = activeRows.filter((row) => rowMatchesBrand(row, brand));
  if (
    role.trim().toLowerCase() === Config.Roles.VerticalHead.toLowerCase() ||
    brandRows.length
  ) {
    return uniqueEmails(
      brandRows.flatMap((row) => collectRowEmails(row, userEmailById)),
    );
  }

  const unbrandedRows = activeRows.filter(
    (row) => getLookupTitles(row.Brand).length === 0,
  );

  return uniqueEmails(
    unbrandedRows.flatMap((row) => collectRowEmails(row, userEmailById)),
  );
}
