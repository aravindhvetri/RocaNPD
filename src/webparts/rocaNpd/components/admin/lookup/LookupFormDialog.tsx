import * as React from "react";
import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type {
  ILookup,
  ILookupType,
} from "../../../../../External/CommonServices/Interface";
import {
  Button,
  Dialog,
  Dropdown,
  InputText,
} from "../../common/controls";
import type { IDropdownOption } from "../../common/controls/Dropdown";
import { validateLookupForm } from "./lookupValidation";
import styles from "./LookupFormDialog.module.scss";

export type LookupDialogMode = "create" | "edit";

export interface ILookupFormDialogProps {
  visible: boolean;
  mode: LookupDialogMode;
  item: ILookup | null;
  existingItems: ILookup[];
  lookupTypes: ILookupType[];
  saving: boolean;
  onHide: () => void;
  onSave: (
    lookupTypeId: number,
    lookupName: string,
    lookupCode: string,
  ) => Promise<void>;
  onValidationWarning: (message: string) => void;
}

const LookupFormDialog: React.FC<ILookupFormDialogProps> = ({
  visible,
  mode,
  item,
  existingItems,
  lookupTypes,
  saving,
  onHide,
  onSave,
  onValidationWarning,
}) => {
  const [lookupTypeId, setLookupTypeId] = React.useState<number | null>(null);
  const [lookupName, setLookupName] = React.useState("");
  const [lookupCode, setLookupCode] = React.useState("");

  const lookupTypeOptions = React.useMemo<IDropdownOption[]>(
    () =>
      lookupTypes.map((lookupType) => ({
        label: lookupType.Title,
        value: lookupType.Id,
      })),
    [lookupTypes],
  );

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    setLookupTypeId(item?.LookupTypeId ?? null);
    setLookupName(item?.LookupName ?? "");
    setLookupCode(item?.LookupCode ?? "");
  }, [item, visible]);

  const dialogTitle = mode === "create" ? "Add Lookup" : "Edit Lookup";
  const saveLabel = mode === "create" ? "Add" : "Update";

  const handleSave = async (): Promise<void> => {
    const validationError = validateLookupForm(
      lookupTypeId,
      lookupName,
      lookupCode,
      existingItems,
      mode === "edit" ? item?.Id : undefined,
    );

    if (validationError) {
      onValidationWarning(validationError);
      return;
    }

    await onSave(lookupTypeId as number, lookupName.trim(), lookupCode.trim());
  };

  return (
    <Dialog
      visible={visible}
      title={dialogTitle}
      width="26rem"
      className={styles.formDialog}
      onHide={onHide}
      footer={
        <div className={styles.footer}>
          <Button
            label="Cancel"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={onHide}
          />
          <Button
            label={saveLabel}
            size="sm"
            loading={saving}
            disabled={saving}
            onClick={() => {
              void handleSave();
            }}
          />
        </div>
      }
    >
      <div className={styles.formFields}>
        <Dropdown
          id="lookupType"
          label={FieldLabels.LookupType}
          required
          value={lookupTypeId}
          options={lookupTypeOptions}
          placeholder="Select Lookup Type"
          disabled={saving}
          className={styles.formField}
          onChange={(value) =>
            setLookupTypeId(typeof value === "number" ? value : null)
          }
        />
        <InputText
          id="lookupName"
          label={FieldLabels.LookupName}
          required
          value={lookupName}
          placeholder="Enter here"
          disabled={saving}
          maxLength={255}
          className={styles.formField}
          onChange={setLookupName}
        />
        <InputText
          id="lookupCode"
          label={FieldLabels.LookupCode}
          required
          value={lookupCode}
          placeholder="Enter here"
          disabled={saving}
          maxLength={255}
          className={styles.formField}
          onChange={setLookupCode}
        />
      </div>
    </Dialog>
  );
};

export default LookupFormDialog;
