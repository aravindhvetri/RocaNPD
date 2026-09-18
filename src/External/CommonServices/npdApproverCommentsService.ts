import { Config } from "./Config";
import type { INpdApproverCommentPayload } from "./Interface";
import SPServices from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.NpdApproverComments;
const FIELDS = Config.FieldNames.NpdApproverComments;

function resolveCommentText(action: string, comments: string): string {
  const trimmed = comments.trim();
  if (trimmed) {
    return trimmed;
  }

  if (action === "Approve") {
    return "Approved";
  }
  if (action === "Reject") {
    return "Rejected";
  }
  return "Rework requested";
}

export async function addNpdApproverComment(
  payload: INpdApproverCommentPayload,
): Promise<void> {
  const comments = resolveCommentText(payload.action, payload.comments);
  const userIds = payload.userIds.filter((id) => Number.isFinite(id) && id > 0);
  const requestJson: Record<string, unknown> = {
    [FIELDS.Title]: `${payload.requestTitle || "NPD Request"} - ${payload.action}`,
    [FIELDS.Comments]: comments,
    [FIELDS.Role]: payload.role,
    [FIELDS.NPDRequestId]: payload.requestId,
  };

  if (userIds.length) {
    requestJson[FIELDS.UserId] = userIds;
  }

  await SPServices.SPAddItem({
    Listname: LIST_NAME(),
    RequestJSON: requestJson,
  });
}

export async function resolveApproverUserIds(
  actorUserId: number,
  actorEmail: string,
): Promise<number[]> {
  if (actorUserId > 0) {
    return [actorUserId];
  }

  const ensured = await SPServices.ensureSiteUserId(actorEmail);
  return ensured > 0 ? [ensured] : [];
}
