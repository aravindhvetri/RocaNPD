import { FieldLabels, RequestStatus } from "../../../../../External/CommonServices/Config";
import type { INpdWorkflowStepJson } from "../../../../../External/CommonServices/Interface";
import {
  getFirstPendingApproverRole,
  getFirstPendingApproverStep,
  isMisCoordinatorWorkflowRole,
  isVerticalHeadWorkflowRole,
} from "../../../../../External/CommonServices/npdWorkflowJsonService";
import { resolveNpdWorkflowDisplayName } from "../../../../../External/CommonServices/npdWorkflowStatusView";
import { normalizeEmail } from "../../../../../External/CommonServices/personFieldUtils";
import type { IDropdownOption } from "../../common/controls";

export type NpdRequestDashboardVariant = "all" | "approved";

export const ALL_STATUS_VALUE = "all";
export const ALL_BRAND_VALUE = "all";

export function formatNpdCreatedDate(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
}

export function formatNpdStatusLabel(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (
    normalized === RequestStatus.Rework.toLowerCase() ||
    normalized === "in rework"
  ) {
    return FieldLabels.InRework;
  }

  return status.trim();
}

export function formatNpdPendingWithRole(role: string): string {
  const title = role.trim();
  if (!title) {
    return RequestStatus.Pending;
  }

  if (isVerticalHeadWorkflowRole(title)) {
    return FieldLabels.PendingWithVh;
  }

  if (isMisCoordinatorWorkflowRole(title)) {
    return FieldLabels.PendingWithMisCoordinator;
  }

  return `${FieldLabels.PendingWithPrefix} ${title}`;
}

export function formatNpdRequestListStatus(
  status: string,
  steps: readonly INpdWorkflowStepJson[] = [],
): string {
  if (!isPendingNpdStatus(status)) {
    return formatNpdStatusLabel(status);
  }

  return formatNpdPendingWithRole(getFirstPendingApproverRole(steps));
}

export function getNpdCurrentApprover(row: {
  Status: string;
  AuthorEmail: string;
  AuthorTitle: string;
  WorkflowSteps?: INpdWorkflowStepJson[];
}): { name: string; email: string } {
  if (!isPendingNpdStatus(row.Status)) {
    return { name: "—", email: "" };
  }

  const step = getFirstPendingApproverStep(row.WorkflowSteps ?? []);
  if (!step) {
    return { name: "—", email: "" };
  }

  const name = resolveNpdWorkflowDisplayName(
    normalizeEmail(step.UserEmail),
    normalizeEmail(row.AuthorEmail),
    row.AuthorTitle,
  );
  return {
    name: name.trim() || "—",
    email: step.UserEmail.trim(),
  };
}

export function getNpdCurrentApproverName(row: {
  Status: string;
  AuthorEmail: string;
  AuthorTitle: string;
  WorkflowSteps?: INpdWorkflowStepJson[];
}): string {
  return getNpdCurrentApprover(row).name;
}

export function getNpdStatusFilterKey(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "in rework") {
    return RequestStatus.Rework;
  }

  return status.trim();
}

export function uniqueBrandOptions(
  brands: string[],
): IDropdownOption[] {
  const unique: string[] = [];
  brands.forEach((brand) => {
    const title = brand.trim();
    if (title && unique.indexOf(title) === -1) {
      unique.push(title);
    }
  });

  unique.sort((left, right) => left.localeCompare(right));
  return [
    { label: FieldLabels.AllBrands, value: ALL_BRAND_VALUE },
    ...unique.map((brand) => ({ label: brand, value: brand })),
  ];
}

export function matchesNpdListSearch(
  haystack: string[],
  searchValue: string,
): boolean {
  const query = searchValue.trim().toLowerCase();
  if (!query) {
    return true;
  }

  return haystack.some((value) => value.toLowerCase().includes(query));
}

export function matchesNpdStatusFilter(
  status: string,
  selectedStatus: string,
): boolean {
  if (!selectedStatus || selectedStatus === ALL_STATUS_VALUE) {
    return true;
  }

  return (
    getNpdStatusFilterKey(status).toLowerCase() === selectedStatus.toLowerCase()
  );
}

export function matchesNpdBrandFilter(
  brand: string,
  selectedBrand: string,
): boolean {
  if (!selectedBrand || selectedBrand === ALL_BRAND_VALUE) {
    return true;
  }

  return brand.trim().toLowerCase() === selectedBrand.trim().toLowerCase();
}

export function isApprovedNpdStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === RequestStatus.Approved.toLowerCase() ||
    normalized === RequestStatus.Completed.toLowerCase()
  );
}

export function isPendingNpdStatus(status: string): boolean {
  return status.trim().toLowerCase() === RequestStatus.Pending.toLowerCase();
}

export function isDraftNpdStatus(status: string): boolean {
  return status.trim().toLowerCase() === RequestStatus.Draft.toLowerCase();
}

export function isDraftOrReworkNpdStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === RequestStatus.Draft.toLowerCase() ||
    normalized === RequestStatus.Rework.toLowerCase() ||
    normalized === "in rework"
  );
}

export function getDashboardStatusOptions(): IDropdownOption[] {
  return [
    { label: FieldLabels.AllStatuses, value: ALL_STATUS_VALUE },
    { label: RequestStatus.Draft, value: RequestStatus.Draft },
    { label: RequestStatus.Pending, value: RequestStatus.Pending },
    { label: RequestStatus.Rework, value: RequestStatus.Rework },
    { label: RequestStatus.Approved, value: RequestStatus.Approved },
    { label: RequestStatus.Rejected, value: RequestStatus.Rejected },
  ];
}

export function getDraftStatusOptions(): IDropdownOption[] {
  return [
    { label: FieldLabels.AllStatuses, value: ALL_STATUS_VALUE },
    { label: RequestStatus.Draft, value: RequestStatus.Draft },
    { label: RequestStatus.Rework, value: RequestStatus.Rework },
  ];
}

/**
 * Status filter options from rows currently in the DataTable.
 * - Empty table → All Statuses only (no Draft/Rework placeholders).
 * - "In ReWork" / Rework → label **Rework**.
 * - When `choiceCatalog` is provided (NPD_Request Status choices), use that order
 *   and only include choices that appear in the table data.
 */
export function buildStatusFilterOptionsFromData(
  statuses: string[],
  choiceCatalog: string[] = [],
): IDropdownOption[] {
  const presentByKey = new Map<string, string>();

  statuses.forEach((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return;
    }

    const value = getNpdStatusFilterKey(trimmed);
    const key = value.toLowerCase();
    if (!key || presentByKey.has(key)) {
      return;
    }

    const label =
      key === RequestStatus.Rework.toLowerCase()
        ? RequestStatus.Rework
        : value;
    presentByKey.set(key, label);
  });

  const allOption: IDropdownOption = {
    label: FieldLabels.AllStatuses,
    value: ALL_STATUS_VALUE,
  };

  if (!presentByKey.size) {
    return [allOption];
  }

  const buildOption = (rawChoice: string): IDropdownOption | null => {
    const value = getNpdStatusFilterKey(rawChoice);
    const key = value.toLowerCase();
    if (!presentByKey.has(key)) {
      return null;
    }

    const label =
      key === RequestStatus.Rework.toLowerCase()
        ? RequestStatus.Rework
        : presentByKey.get(key) ?? value;

    return { label, value };
  };

  if (choiceCatalog.length) {
    const fromChoices: IDropdownOption[] = [];
    const used = new Set<string>();

    choiceCatalog.forEach((choice) => {
      const option = buildOption(choice);
      if (!option) {
        return;
      }
      const key = String(option.value).toLowerCase();
      if (used.has(key)) {
        return;
      }
      used.add(key);
      fromChoices.push(option);
    });

    presentByKey.forEach((label, key) => {
      if (used.has(key)) {
        return;
      }
      fromChoices.push({ label, value: label });
    });

    return [allOption, ...fromChoices];
  }

  return [
    allOption,
    ...Array.from(presentByKey.values())
      .sort((left, right) => left.localeCompare(right))
      .map((label) => ({ label, value: label })),
  ];
}
