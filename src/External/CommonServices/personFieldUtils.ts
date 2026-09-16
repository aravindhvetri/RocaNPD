/** Normalizes an email/login string for comparison. */
export function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase();
}

/** Normalizes a display name for comparison (case/whitespace insensitive). */
export function normalizeDisplayName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface ILoginIdentityContext {
  email: string;
  loginName?: string;
  displayName?: string;
  userId?: number;
}

/** Resolves the login email from SPFx context (email claim or loginName tail). */
export function resolveLoginEmail(email: string, loginName?: string): string {
  const trimmedEmail = normalizeEmail(email);
  if (trimmedEmail) {
    return trimmedEmail;
  }

  if (!loginName) {
    return "";
  }

  const claimsTail = loginName.split("|").pop() ?? "";
  return claimsTail.includes("@") ? normalizeEmail(claimsTail) : "";
}

/** Normalizes an email for comparison (trim, lowercase, strip mailto/sip). */
export function normalizeEmail(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^mailto:/i, "")
    .replace(/^sip:/i, "");
}

/** Expands guest / claims login formats into comparable identity strings. */
export function expandIdentityVariants(value: string): string[] {
  const normalized = normalizeIdentity(value);

  if (!normalized) {
    return [];
  }

  const variants = new Set<string>([normalized]);

  const claimsParts = normalized.split("|");
  const claimsTail = claimsParts[claimsParts.length - 1];
  if (claimsTail) {
    variants.add(claimsTail);
  }

  const extMatch = normalized.match(/^(.+)#ext#@(.+)$/i);
  if (extMatch) {
    const guestLocal = extMatch[1].replace(/_/g, "@");
    variants.add(guestLocal);
    variants.add(`${extMatch[1]}@${extMatch[2]}`);
  }

  const atIndex = normalized.indexOf("@");
  if (atIndex > 0) {
    variants.add(normalized.slice(0, atIndex));
  }

  return Array.from(variants).filter(Boolean);
}

/** Builds identity variants for the current logged-in user. */
export function buildLoginIdentityVariants(
  email: string,
  loginName?: string,
  displayName?: string,
): Set<string> {
  const variants = new Set<string>();

  expandIdentityVariants(email).forEach((item) => variants.add(item));

  if (loginName) {
    expandIdentityVariants(loginName).forEach((item) => variants.add(item));
  }

  if (displayName) {
    const normalizedDisplayName = normalizeDisplayName(displayName);
    if (normalizedDisplayName) {
      variants.add(normalizedDisplayName);
      variants.add(normalizedDisplayName.replace(/\s+/g, ""));
    }
  }

  return variants;
}

/** Flattens SharePoint single/multi person field payloads (incl. `{ results: [] }`). */
export function flattenPersonField(value: unknown): Record<string, unknown>[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === "object",
    );
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (Array.isArray(record.results)) {
      return record.results.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object",
      );
    }

    if (
      record.Id !== undefined ||
      record.EMail !== undefined ||
      record.Email !== undefined ||
      record.UserPrincipalName !== undefined ||
      record.LoginName !== undefined ||
      record.Title !== undefined
    ) {
      return [record];
    }
  }

  return [];
}

/** Collects identity strings from a SharePoint person object. */
export function extractPersonIdentityVariants(
  person: Record<string, unknown>,
): Set<string> {
  const variants = new Set<string>();

  const candidates = [
    person.EMail,
    person.Email,
    person.UserPrincipalName,
    person.LoginName,
    person.Title,
  ];

  candidates.forEach((candidate) => {
    const text = String(candidate ?? "").trim();
    if (!text) {
      return;
    }

    expandIdentityVariants(text).forEach((item) => variants.add(item));

    if (!String(candidate).includes("@")) {
      const normalizedDisplayName = normalizeDisplayName(text);
      if (normalizedDisplayName) {
        variants.add(normalizedDisplayName);
        variants.add(normalizedDisplayName.replace(/\s+/g, ""));
      }
    }
  });

  return variants;
}

/** Parses SharePoint `UsersId` / `UserId` scalar values into numeric ids. */
export function parseSharePointUserIds(value: unknown): number[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => Number(entry))
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  if (typeof value === "number" && value > 0) {
    return [value];
  }

  if (typeof value === "string") {
    return value
      .split(/[,;|]/)
      .map((entry) => Number(entry.trim()))
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  return [];
}

/** True when any person in the field matches any login identity variant. */
export function personFieldMatchesLogin(
  users: unknown,
  loginEmail: string,
  loginName?: string,
  displayName?: string,
  loginUserId?: number,
  userIds?: number[],
): boolean {
  const normalizedUserId =
    Number.isFinite(loginUserId) && loginUserId && loginUserId > 0
      ? loginUserId
      : undefined;

  if (normalizedUserId && userIds?.includes(normalizedUserId)) {
    return true;
  }

  const loginVariants = buildLoginIdentityVariants(
    loginEmail,
    loginName,
    displayName,
  );

  if (!loginVariants.size) {
    return false;
  }

  const persons = flattenPersonField(users);

  return persons.some((person) => {
    const personId = Number(person.Id);
    if (normalizedUserId && personId === normalizedUserId) {
      return true;
    }

    const personVariants = extractPersonIdentityVariants(person);

    return Array.from(personVariants).some((personIdVariant) => {
      if (loginVariants.has(personIdVariant)) {
        return true;
      }

      return Array.from(loginVariants).some(
        (loginId) =>
          personIdVariant.includes(loginId) ||
          loginId.includes(personIdVariant) ||
          (personIdVariant.includes("@") &&
            loginId.includes("@") &&
            personIdVariant.split("@")[0] === loginId.split("@")[0]),
      );
    });
  });
}

/** True when any expanded Users entry EMail matches the login email. */
export function personFieldMatchesEmail(
  users: unknown,
  loginEmail: string,
): boolean {
  const normalizedLogin = normalizeEmail(loginEmail);
  if (!normalizedLogin) {
    return false;
  }

  return flattenPersonField(users).some((person) => {
    const personEmail = normalizeEmail(
      String(person.EMail ?? person.Email ?? ""),
    );
    return Boolean(personEmail) && personEmail === normalizedLogin;
  });
}

/** True when Users (expanded EMail) or UsersId + site-user map matches login email. */
export function approversRowMatchesEmail(
  row: Record<string, unknown>,
  loginEmail: string,
  userEmailById?: ReadonlyMap<number, string>,
): boolean {
  const users = row.Users ?? row.User;
  if (personFieldMatchesEmail(users, loginEmail)) {
    return true;
  }

  if (!userEmailById?.size) {
    return false;
  }

  const normalizedLogin = normalizeIdentity(loginEmail);
  const userIds = [
    ...parseSharePointUserIds(row.UsersId),
    ...parseSharePointUserIds(row.UserId),
  ];

  return userIds.some((id) => userEmailById.get(id) === normalizedLogin);
}
