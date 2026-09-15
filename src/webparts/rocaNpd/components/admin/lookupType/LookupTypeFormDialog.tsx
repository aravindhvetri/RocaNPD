import * as React from "react";
import { FieldLabels } from "../../../../../External/CommonServices/Config";
import type { ILookupType } from "../../../../../External/CommonServices/Interface";
import { Button, Dialog, InputText } from "../../common/controls";
import { validateLookupTypeTitle } from "./lookupTypeValidation";
import styles from "./LookupTypeFormDialog.module.scss";

export type LookupTypeDialogMode = "create" | "edit";

export interface ILookupTypeFormDialogProps {
  visible: boolean;
  mode: LookupTypeDialogMode;
  item: ILookupType | null;
  existingItems: ILookupType[];
  saving: boolean;
  onHide: () => void;
  onSave: (title: string) => Promise<void>;
  onValidationWarning: (message: string) => void;
}

const LookupTypeFormDialog: React.FC<ILookupTypeFormDialogProps> = ({
  visible,
  mode,
  item,
  existingItems,
  saving,
  onHide,
  onSave,
  onValidationWarning,
}) => {
  const [title, setTitle] = React.useState("");

  React.useEffect(() => {
    if (!visible) {
      return;
    }
    setTitle(item?.Title ?? "");
  }, [item, visible]);

  const dialogTitle =
    mode === "create" ? "Add Lookup Type" : "Edit Lookup Type";

  const saveLabel = mode === "create" ? "Add" : "Update";

  const handleSave = async (): Promise<void> => {
    const validationError = validateLookupTypeTitle(
      title,
      existingItems,
      mode === "edit" ? item?.Id : undefined,
    );

    if (validationError) {
      onValidationWarning(validationError);
      return;
    }

    await onSave(title.trim());
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
      <InputText
        id="lookupTypeName"
        label={FieldLabels.LookupTypeName}
        required
        value={title}
        placeholder="Enter here"
        disabled={saving}
        maxLength={255}
        className={styles.formField}
        onChange={setTitle}
      />
    </Dialog>
  );
};

export default LookupTypeFormDialog;
