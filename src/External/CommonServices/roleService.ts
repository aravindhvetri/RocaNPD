import { ApproverSystems, Config, type UserRole } from "./Config";
import type { IResolvedUserAccess, IRoleBrandAssignment } from "./Interface";
import {
  getLookupTitles,
  isDeletedApproverRow,
} from "./lookupFieldUtils";
import {
  approversRowMatchesEmail,
  personFieldMatchesEmail,
  resolveLoginEmail,
  type ILoginIdentityContext,
} from "./personFieldUtils";
import { requireRocaMasterSiteUrl } from "./rocaSiteUrlResolver";
import SPServices from "./SPServices";

export const APPROVERS_SELECT =
  "Id,System/Title,Role/Title,Brand/Title,Users/Id,Users/Title,Users/EMail";
export const APPROVERS_EXPAND = "System,Role,Brand,Users";

const KNOWN_ROLES: UserRole[] = [
  Config.Roles.Initiator,
  Config.Roles.VerticalHead,
  Config.Roles.MisCoordinator,
  Config.Roles.Consultant,
];

export const emptyUserAccess = (): IResolvedUserAccess => ({
  assignedRoles: [],
  mappedBrands: [],
  npdInitiatorBrands: [],
  npdVerticalHeadBrands: [],
  npdMisCoordinatorBrands: [],
  mgInitiatorBrands: [],
  mgConsultantBrands: [],
  assignments: [],
});

export async function resolveUserAccess(
  identity: ILoginIdentityContext,
  contextSiteUrl?: string,
): Promise<IResolvedUserAccess> {
  const isAdmin = await isCurrentUserInAdminsGroup(identity);

  try {
    const assignments = await fetchMatchingApproverAssignments(
      identity,
      contextSiteUrl,
    );
    return buildResolvedAccess(isAdmin, assignments);
  } catch (error) {
    if (isAdmin) {
      return buildResolvedAccess(true, []);
    }
    throw error;
  }
}

export async function isCurrentUserInAdminsGroup(
  identity: ILoginIdentityContext,
): Promise<boolean> {
  try {
    const members = (await SPServices.getSPGroupMember({
      GroupName: Config.SharePointGroups.Admins,
    })) as Record<string, unknown>[];

    const loginEmail = resolveLoginEmail(identity.email, identity.loginName);
    if (!loginEmail) {
      return false;
    }

    return members.some((member) => {
      if (personFieldMatchesEmail(member, loginEmail)) {
        return true;
      }

      const memberEmail = resolveLoginEmail(
        String(member.Email ?? member.EMail ?? ""),
        String(member.LoginName ?? ""),
      );
      return Boolean(memberEmail) && memberEmail === loginEmail;
    });
  } catch {
    return false;
  }
}

async function fetchMatchingApproverAssignments(
  identity: ILoginIdentityContext,
  contextSiteUrl?: string,
): Promise<IRoleBrandAssignment[]> {
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

  const assignmentMap = new Map<string, IRoleBrandAssignment>();

  rows.forEach((row) => {
    if (isDeletedApproverRow(row)) {
      return;
    }

    if (!approverRowMatchesUser(row, identity, userEmailById)) {
      return;
    }

    const roleTitle = getLookupTitles(row.Role)[0] ?? "";
    const knownRole = matchKnownRole(roleTitle);
    if (!knownRole) {
      return;
    }

    const systemTitle = getLookupTitles(row.System)[0] ?? "";
    const key = `${knownRole}::${systemTitle}`;
    const existing = assignmentMap.get(key) ?? {
      role: knownRole,
      system: systemTitle,
      brands: [],
    };
    const brands = new Set(existing.brands);
    getLookupTitles(row.Brand).forEach((title) => brands.add(title));
    assignmentMap.set(key, { ...existing, brands: Array.from(brands) });
  });

  return Array.from(assignmentMap.values()).map((assignment) => ({
    ...assignment,
    brands: assignment.brands.sort((left, right) => left.localeCompare(right)),
  }));
}

function approverRowMatchesUser(
  row: Record<string, unknown>,
  identity: ILoginIdentityContext,
  userEmailById: ReadonlyMap<number, string>,
): boolean {
  const loginEmail = resolveLoginEmail(identity.email, identity.loginName);
  if (!loginEmail) {
    return false;
  }

  return approversRowMatchesEmail(row, loginEmail, userEmailById);
}

function matchKnownRole(roleTitle: string): UserRole | null {
  const normalized = roleTitle.trim().toLowerCase();
  return (
    KNOWN_ROLES.find((role) => role.toLowerCase() === normalized) ?? null
  );
}

function brandsFor(
  assignments: IRoleBrandAssignment[],
  role: UserRole,
  system?: string,
): string[] {
  const titles = new Set<string>();

  assignments.forEach((assignment) => {
    if (assignment.role !== role) {
      return;
    }

    if (
      system &&
      assignment.system &&
      assignment.system.toLowerCase() !== system.toLowerCase()
    ) {
      return;
    }

    assignment.brands.forEach((brand) => titles.add(brand));
  });

  return Array.from(titles).sort((left, right) => left.localeCompare(right));
}

function buildResolvedAccess(
  isAdmin: boolean,
  assignments: IRoleBrandAssignment[],
): IResolvedUserAccess {
  const assignedRoles = new Set<string>(assignments.map((item) => item.role));
  if (isAdmin) {
    assignedRoles.add(Config.Roles.Admin);
  }

  const npdSystem = ApproverSystems.NewProductDevelopment;
  const mgSystem = ApproverSystems.NewMaterialGroup;

  const npdInitiatorBrands = brandsFor(
    assignments,
    Config.Roles.Initiator,
    npdSystem,
  );
  const fallbackInitiatorBrands =
    npdInitiatorBrands.length > 0
      ? npdInitiatorBrands
      : brandsFor(assignments, Config.Roles.Initiator);

  const mgInitiatorBrands = brandsFor(
    assignments,
    Config.Roles.Initiator,
    mgSystem,
  );
  const npdVerticalHeadBrands = brandsFor(
    assignments,
    Config.Roles.VerticalHead,
    npdSystem,
  );
  const fallbackVerticalHeadBrands =
    npdVerticalHeadBrands.length > 0
      ? npdVerticalHeadBrands
      : brandsFor(assignments, Config.Roles.VerticalHead);

  return {
    assignedRoles: Array.from(assignedRoles),
    mappedBrands: uniqueBrands(assignments),
    npdInitiatorBrands: fallbackInitiatorBrands,
    npdVerticalHeadBrands: fallbackVerticalHeadBrands,
    npdMisCoordinatorBrands: brandsFor(
      assignments,
      Config.Roles.MisCoordinator,
    ),
    mgInitiatorBrands:
      mgInitiatorBrands.length > 0 ? mgInitiatorBrands : fallbackInitiatorBrands,
    mgConsultantBrands: brandsFor(assignments, Config.Roles.Consultant),
    assignments,
  };
}

function uniqueBrands(assignments: IRoleBrandAssignment[]): string[] {
  const titles = new Set<string>();
  assignments.forEach((assignment) => {
    assignment.brands.forEach((brand) => titles.add(brand));
  });
  return Array.from(titles).sort((left, right) => left.localeCompare(right));
}
