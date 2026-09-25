import type {
  IMaterialGroupConfigOption,
  IMaterialGroupEntryRow,
} from "../../../../../External/CommonServices/Interface";

export type MaterialGroupFormMode =
  | "create"
  | "edit"
  | "view"
  | "consultant-edit";

export type MaterialGroupConsultantActionType =
  | "Completed"
  | "Rework"
  | "Rejected";

export interface ISelectMastersSectionProps {
  configs: IMaterialGroupConfigOption[];
  selectedConfigIds: number[];
  loading?: boolean;
  readOnly?: boolean;
  onToggleConfig: (configId: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export interface IMasterDetailsSectionProps {
  configs: IMaterialGroupConfigOption[];
  selectedConfigIds: number[];
  entriesByConfigId: Record<number, IMaterialGroupEntryRow[]>;
  readOnly?: boolean;
  isConsultantMode?: boolean;
  onAddRow: (configId: number) => void;
  onRemoveRow: (configId: number, tempId: string) => void;
  onUpdateRow: (
    configId: number,
    tempId: string,
    field: "code" | "description",
    value: string,
  ) => void;
}

export interface IMaterialGroupFormFooterProps {
  mode?: MaterialGroupFormMode;
  saving?: boolean;
  submitting?: boolean;
  onCancel: () => void;
  onSaveDraft?: () => void;
  onSubmit?: () => void;
  onConsultantAction?: (action: MaterialGroupConsultantActionType) => void;
}
