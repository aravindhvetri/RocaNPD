import { Config } from "./Config";
import type {
  IWorkflowConfigSavePayload,
  IWorkflowConfigStep,
} from "./Interface";
import {
  getActiveRecordCreatePayload,
  getActiveRecordFilters,
  getSoftDeletePayload,
  isActiveRecord,
  SOFT_DELETE_FIELD,
} from "./softDelete";
import SPServices from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.WorkflowConfig;

const SELECT_FIELDS = "Id,Title,CurrentRole,NextRole,IsDeleted,Modified";

function mapWorkflowStep(item: Record<string, unknown>): IWorkflowConfigStep {
  return {
    Id: Number(item.Id),
    RequestType: String(item.Title ?? ""),
    CurrentRole: String(item.CurrentRole ?? ""),
    NextRole: String(item.NextRole ?? ""),
    IsDeleted: Boolean(item[SOFT_DELETE_FIELD]),
  };
}

export async function fetchActiveWorkflowSteps(): Promise<IWorkflowConfigStep[]> {
  const rows = (await SPServices.SPReadItems({
    Listname: LIST_NAME(),
    Select: SELECT_FIELDS,
    Filter: getActiveRecordFilters(),
    Orderby: "Modified",
    Orderbydecorasc: false,
  })) as Record<string, unknown>[];

  return rows.map(mapWorkflowStep).filter(isActiveRecord);
}

export async function saveWorkflowConfiguration(
  payload: IWorkflowConfigSavePayload,
): Promise<void> {
  const requestType = payload.requestType.trim();

  if (payload.existingStepIds?.length) {
    for (const stepId of payload.existingStepIds) {
      await SPServices.SPUpdateItem({
        Listname: LIST_NAME(),
        ID: stepId,
        RequestJSON: getSoftDeletePayload(),
      });
    }
  }

  for (const step of payload.steps) {
    await SPServices.SPAddItem({
      Listname: LIST_NAME(),
      RequestJSON: {
        Title: requestType,
        CurrentRole: step.currentRole.trim(),
        NextRole: step.nextRole.trim(),
        ...getActiveRecordCreatePayload(),
      },
    });
  }
}

export async function softDeleteWorkflowByRequestType(
  stepIds: number[],
): Promise<void> {
  for (const stepId of stepIds) {
    await SPServices.SPUpdateItem({
      Listname: LIST_NAME(),
      ID: stepId,
      RequestJSON: getSoftDeletePayload(),
    });
  }
}
