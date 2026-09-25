/**
 * Compatibility stub — the consultant action popup was removed in favor of
 * the inline Approver Remarks field on MaterialGroupRequestForm.
 * Kept so SPFx watch / incremental TypeScript does not fail on a stale root file.
 */
export type { MaterialGroupConsultantActionType } from "./materialGroupTypes";

const MaterialGroupConsultantActionDialog = (): null => null;

export default MaterialGroupConsultantActionDialog;
