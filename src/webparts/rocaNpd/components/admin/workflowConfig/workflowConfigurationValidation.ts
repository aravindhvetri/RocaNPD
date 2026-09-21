import { Config, FieldLabels } from "../../../../../External/CommonServices/Config";
import type {
  ISelectOption,
  IWorkflowConfigRow,
  IWorkflowFormStep,
} from "../../../../../External/CommonServices/Interface";
import {
  canAddWorkflowStep,
  getDefaultStartRole,
  getExcludedNextRolesForRequestType,
  isMgRequestType,
  isNpdRequestType,
} from "../../../../../External/CommonServices/workflowConfigurationUtils";

export function validateWorkflowConfigurationForm(
  requestType: string | null,
  steps: IWorkflowFormStep[],
  existingRows: IWorkflowConfigRow[],
  npdRoleOptions: ISelectOption[],
  editingRequestType?: string,
): string | null {
  const trimmedRequestType = (requestType ?? "").trim();

  if (!trimmedRequestType) {
    return `${FieldLabels.RequestType} is required.`;
  }

  const validRequestTypes = Object.values(Config.WorkflowRequestTypes);

  if (!validRequestTypes.includes(trimmedRequestType as never)) {
    return `Selected ${FieldLabels.RequestType} is not valid.`;
  }

  const isDuplicate = existingRows.some(
    (row) =>
      row.RequestType.trim().toLowerCase() ===
        trimmedRequestType.toLowerCase() &&
      row.RequestType.trim() !== (editingRequestType ?? "").trim(),
  );

  if (isDuplicate) {
    return `Workflow for "${trimmedRequestType}" already exists.`;
  }

  if (!steps.length) {
    return "At least one workflow step is required.";
  }

  const startRole = getDefaultStartRole(trimmedRequestType);

  if (steps[0]?.currentRole.trim() !== startRole) {
    return `The first ${FieldLabels.CurrentRole} must be ${startRole}.`;
  }

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const trimmedNextRole = step.nextRole.trim();

    if (!trimmedNextRole) {
      return `${FieldLabels.NextRole} is required for step ${index + 1}.`;
    }

    if (index > 0 && step.currentRole.trim() !== steps[index - 1]?.nextRole.trim()) {
      return `Step ${index + 1} ${FieldLabels.CurrentRole} must match the previous step ${FieldLabels.NextRole}.`;
    }

    if (trimmedNextRole === Config.Roles.Initiator) {
      return `${Config.Roles.Initiator} cannot be selected as ${FieldLabels.NextRole}.`;
    }

    if (trimmedNextRole === step.currentRole.trim()) {
      return `${FieldLabels.NextRole} must be different from ${FieldLabels.CurrentRole} in step ${index + 1}.`;
    }

    const duplicateNextRole = steps.find(
      (otherStep, otherIndex) =>
        otherIndex !== index &&
        otherStep.nextRole.trim().toLowerCase() ===
          trimmedNextRole.toLowerCase(),
    );

    if (duplicateNextRole) {
      return `"${trimmedNextRole}" is already used in the approval chain.`;
    }

    if (isNpdRequestType(trimmedRequestType)) {
      const excludedRoles = getExcludedNextRolesForRequestType(trimmedRequestType);

      if (excludedRoles.has(trimmedNextRole)) {
        return `"${trimmedNextRole}" is not allowed for NPD Request workflow.`;
      }

      const roleExists = npdRoleOptions.some(
        (option) =>
          String(option.value).trim().toLowerCase() ===
          trimmedNextRole.toLowerCase(),
      );

      if (!roleExists) {
        return `"${trimmedNextRole}" is not available in RoleMaster for NPD.`;
      }
    }

    if (isMgRequestType(trimmedRequestType)) {
      if (trimmedNextRole !== Config.WorkflowDefaults.MgNextRole) {
        return `${FieldLabels.NextRole} for MG Request must be ${Config.WorkflowDefaults.MgNextRole}.`;
      }

      if (index > 0) {
        return "MG Request workflow supports only one approval step.";
      }
    }
  }

  if (isMgRequestType(trimmedRequestType) && steps.length !== 1) {
    return "MG Request workflow must contain exactly one step.";
  }

  if (
    isNpdRequestType(trimmedRequestType) &&
    canAddWorkflowStep(steps, trimmedRequestType, npdRoleOptions)
  ) {
    return "Select all available workflow steps before saving.";
  }

  return null;
}
