import { Config } from "./Config";
import type {
  ISelectOption,
  IWorkflowConfigRow,
  IWorkflowConfigStep,
  IWorkflowFormStep,
} from "./Interface";

export function getDefaultStartRole(requestType: string): string {
  if (requestType === Config.WorkflowRequestTypes.MgRequest) {
    return Config.WorkflowDefaults.MgStartRole;
  }

  return Config.WorkflowDefaults.NpdStartRole;
}

export function isNpdRequestType(requestType: string): boolean {
  return requestType === Config.WorkflowRequestTypes.NpdRequest;
}

export function isMgRequestType(requestType: string): boolean {
  return requestType === Config.WorkflowRequestTypes.MgRequest;
}

/** Orders step records into a linear approval chain starting from the default role. */
export function orderWorkflowSteps(
  steps: IWorkflowConfigStep[],
  requestType: string,
): IWorkflowConfigStep[] {
  const startRole = getDefaultStartRole(requestType);
  const ordered: IWorkflowConfigStep[] = [];
  const remaining = [...steps];
  let currentRole = startRole;

  while (remaining.length > 0) {
    const matchIndex = remaining.findIndex(
      (step) => step.CurrentRole.trim() === currentRole.trim(),
    );

    if (matchIndex === -1) {
      break;
    }

    const [step] = remaining.splice(matchIndex, 1);
    ordered.push(step);
    currentRole = step.NextRole;
  }

  return [...ordered, ...remaining];
}

/** Builds the display string: Initiator → Vertical Head → MIS Coordinator */
export function buildApprovalChainLabel(
  steps: IWorkflowConfigStep[],
  requestType: string,
): string {
  const orderedSteps = orderWorkflowSteps(steps, requestType);

  if (!orderedSteps.length) {
    return getDefaultStartRole(requestType);
  }

  const roles = [getDefaultStartRole(requestType)];

  orderedSteps.forEach((step) => {
    roles.push(step.NextRole);
  });

  return roles.join(" → ");
}

/** Groups flat SharePoint step records into one dashboard row per request type. */
export function groupWorkflowStepsByRequestType(
  steps: IWorkflowConfigStep[],
): IWorkflowConfigRow[] {
  const grouped = new Map<string, IWorkflowConfigStep[]>();

  steps.forEach((step) => {
    const requestType = step.RequestType.trim();
    const existing = grouped.get(requestType) ?? [];
    existing.push(step);
    grouped.set(requestType, existing);
  });

  return Array.from(grouped.entries()).map(([requestType, requestSteps]) => {
    const orderedSteps = orderWorkflowSteps(requestSteps, requestType);

    return {
      RequestType: requestType,
      ApprovalChain: buildApprovalChainLabel(requestSteps, requestType),
      StepIds: orderedSteps.map((step) => step.Id),
      Steps: orderedSteps,
    };
  });
}

export function createInitialFormSteps(requestType: string): IWorkflowFormStep[] {
  return [
    {
      currentRole: getDefaultStartRole(requestType),
      nextRole: "",
    },
  ];
}

export function rebuildFormStepsAfterChange(
  steps: IWorkflowFormStep[],
): IWorkflowFormStep[] {
  if (!steps.length) {
    return steps;
  }

  const rebuilt: IWorkflowFormStep[] = [
    { ...steps[0], currentRole: steps[0].currentRole },
  ];

  for (let index = 1; index < steps.length; index += 1) {
    rebuilt.push({
      currentRole: rebuilt[index - 1]?.nextRole ?? "",
      nextRole: steps[index]?.nextRole ?? "",
    });
  }

  return rebuilt;
}

export function stepsToFormSteps(
  steps: IWorkflowConfigStep[],
  requestType: string,
): IWorkflowFormStep[] {
  const orderedSteps = orderWorkflowSteps(steps, requestType);

  if (!orderedSteps.length) {
    return createInitialFormSteps(requestType);
  }

  return orderedSteps.map((step) => ({
    currentRole: step.CurrentRole,
    nextRole: step.NextRole,
  }));
}

/** Roles already used in the chain — excluded from Next Role options. */
export function getUsedRolesInChain(
  steps: IWorkflowFormStep[],
  stepIndex: number,
): Set<string> {
  const usedRoles = new Set<string>([Config.Roles.Initiator]);

  for (let index = 0; index < stepIndex; index += 1) {
    const nextRole = steps[index]?.nextRole.trim();

    if (nextRole) {
      usedRoles.add(nextRole);
    }
  }

  const currentRole = steps[stepIndex]?.currentRole.trim();

  if (currentRole) {
    usedRoles.add(currentRole);
  }

  return usedRoles;
}

/** Request-type-specific roles that must never appear as Next Role options. */
export function getExcludedNextRolesForRequestType(
  requestType: string,
): Set<string> {
  const excluded = new Set<string>();

  if (isNpdRequestType(requestType)) {
    Config.WorkflowNpdExcludedNextRoles.forEach((role) => {
      excluded.add(role.trim());
    });
  }

  return excluded;
}

/** Available Next Role options for a step after used-role and request-type exclusions. */
export function getAvailableNextRoleOptions(
  steps: IWorkflowFormStep[],
  stepIndex: number,
  requestType: string,
  npdRoleOptions: ISelectOption[],
): ISelectOption[] {
  if (!requestType.trim()) {
    return [];
  }

  if (isMgRequestType(requestType)) {
    return [
      {
        label: Config.WorkflowDefaults.MgNextRole,
        value: Config.WorkflowDefaults.MgNextRole,
      },
    ];
  }

  const usedRoles = getUsedRolesInChain(steps, stepIndex);
  const excludedRoles = getExcludedNextRolesForRequestType(requestType);

  return npdRoleOptions.filter((option) => {
    const roleName = String(option.value).trim();
    return !usedRoles.has(roleName) && !excludedRoles.has(roleName);
  });
}

/** Whether a step's Next Role dropdown is editable for the current request type. */
export function isWorkflowStepNextRoleEditable(
  _stepIndex: number,
  _totalSteps: number,
  _options?: { mode?: "create" | "edit" },
): boolean {
  return true;
}

/** Whether another approval step can be appended to the chain. */
export function canAddWorkflowStep(
  steps: IWorkflowFormStep[],
  requestType: string,
  npdRoleOptions: ISelectOption[],
): boolean {
  if (!requestType.trim() || isMgRequestType(requestType) || !steps.length) {
    return false;
  }

  const lastStep = steps[steps.length - 1];

  if (!lastStep?.nextRole.trim()) {
    return false;
  }

  const prospectiveSteps: IWorkflowFormStep[] = [
    ...steps,
    {
      currentRole: lastStep.nextRole.trim(),
      nextRole: "",
    },
  ];

  return (
    getAvailableNextRoleOptions(
      prospectiveSteps,
      prospectiveSteps.length - 1,
      requestType,
      npdRoleOptions,
    ).length > 0
  );
}
