import * as React from "react";
import { InputSwitch } from "primereact/inputswitch";
import {
  Config,
  FieldLabels,
} from "../../../../../External/CommonServices/Config";
import type {
  ILookupType,
  ILookupTypeFormValues,
} from "../../../../../External/CommonServices/Interface";
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
  onSave: (values: ILookupTypeFormValues) => Promise<void>;
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
  const [required, setRequired] = React.useState(false);

  React.useEffect(() => {
    if (!visible) {
      return;
    }
    setTitle(item?.Title ?? "");
    setRequired(item?.Required === true);
  }, [item, visible]);

  const dialogTitle =
    mode === "create"
      ? `${Config.Add} Lookup Type`
      : `${Config.Edit} Lookup Type`;

  const saveLabel = mode === "create" ? Config.Add : Config.Update;

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

    await onSave({ title: title.trim(), required });
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
            label={Config.Cancel}
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
      <div className={`${styles.formField} ${styles.mandatoryField}`}>
        <label className={styles.mandatoryLabel} htmlFor="lookupTypeRequired">
          {FieldLabels.LookupTypeRequired}
        </label>
        <div className={styles.mandatoryToggleRow}>
          <InputSwitch
            inputId="lookupTypeRequired"
            checked={required}
            disabled={saving}
            className={styles.mandatorySwitch}
            onChange={(e) => setRequired(Boolean(e.value))}
          />
          {/* <span className={styles.mandatoryState} aria-hidden="true">
            {required ? Config.Yes : Config.No}
          </span> */}
        </div>
      </div>
    </Dialog>
  );
};

export default LookupTypeFormDialog;
