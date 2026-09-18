import * as React from "react";
import { Config, FieldLabels } from "../../../../../External/CommonServices/Config";
import type {
  ISelectOption,
  IWorkflowConfigRow,
  IWorkflowFormStep,
} from "../../../../../External/CommonServices/Interface";
import {
  canAddWorkflowStep,
  createInitialFormSteps,
  getAvailableNextRoleOptions,
  isMgRequestType,
  isNpdRequestType,
  isWorkflowStepNextRoleEditable,
  rebuildFormStepsAfterChange,
  stepsToFormSteps,
} from "../../../../../External/CommonServices/workflowConfigurationUtils";
import {
  Button,
  Dialog,
  Dropdown,
  InputText,
} from "../../common/controls";
import type { IDropdownOption } from "../../common/controls/Dropdown";
import { validateWorkflowConfigurationForm } from "./workflowConfigurationValidation";
import styles from "./WorkflowConfigFormDialog.module.scss";

export type WorkflowConfigDialogMode = "create" | "edit";

export interface IWorkflowConfigFormDialogProps {
  visible: boolean;
  mode: WorkflowConfigDialogMode;
  item: IWorkflowConfigRow | null;
  existingRows: IWorkflowConfigRow[];
  npdRoleOptions: ISelectOption[];
  npdRolesLoading: boolean;
  saving: boolean;
  onHide: () => void;
  onSave: (
    requestType: string,
    steps: IWorkflowFormStep[],
    existingStepIds?: number[],
  ) => Promise<void>;
  onValidationWarning: (message: string) => void;
}

const WorkflowConfigFormDialog: React.FC<IWorkflowConfigFormDialogProps> = ({
  visible,
  mode,
  item,
  existingRows,
  npdRoleOptions,
  npdRolesLoading,
  saving,
  onHide,
  onSave,
  onValidationWarning,
}) => {
  const [requestType, setRequestType] = React.useState<string | null>(null);
  const [steps, setSteps] = React.useState<IWorkflowFormStep[]>([]);

  const requestTypeOptions = React.useMemo<IDropdownOption[]>(() => {
    const allOptions = Object.values(Config.WorkflowRequestTypes).map((value) => ({
      label: value,
      value,
    }));

    if (mode === "edit") {
      return allOptions;
    }

    const configuredTypes = new Set(
      existingRows.map((row) => row.RequestType.trim()),
    );

    return allOptions.filter((option) => !configuredTypes.has(String(option.value)));
  }, [existingRows, mode]);

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    if (mode === "edit" && item) {
      setRequestType(item.RequestType);
      setSteps(stepsToFormSteps(item.Steps, item.RequestType));
      return;
    }

    setRequestType(null);
    setSteps([]);
  }, [item, mode, visible]);

  const dialogTitle =
    mode === "create" ? "Add Workflow" : "Edit Workflow";
  const saveLabel = mode === "create" ? "Add" : "Update";
  const controlsDisabled = saving;
  const requestTypeSelected = Boolean(requestType?.trim());
  const isMgRequest = requestType ? isMgRequestType(requestType) : false;
  const isNpdRequest = requestType ? isNpdRequestType(requestType) : false;

  const showAddStepButton =
    requestTypeSelected &&
    !isMgRequest &&
    canAddWorkflowStep(steps, requestType ?? "", npdRoleOptions);

  const mapRoleOptions = (options: ISelectOption[]): IDropdownOption[] =>
    options.map((option) => ({
      label: String(option.label),
      value: String(option.value),
    }));

  const getNextRoleOptions = (stepIndex: number): IDropdownOption[] => {
    if (!requestTypeSelected || !requestType) {
      return [];
    }

    return mapRoleOptions(
      getAvailableNextRoleOptions(steps, stepIndex, requestType, npdRoleOptions),
    );
  };

  const getNextRolePlaceholder = (): string => {
    if (!requestTypeSelected) {
      return "Select Request Type first";
    }

    if (isNpdRequest && npdRolesLoading) {
      return "Loading roles...";
    }

    if (isNpdRequest && !npdRoleOptions.length) {
      return "No NPD roles available";
    }

    return "Select Next Role";
  };

  const handleRequestTypeChange = (value: string | null): void => {
    const nextRequestType = value?.trim() ?? "";

    if (!nextRequestType) {
      setRequestType(null);
      setSteps([]);
      return;
    }

    setRequestType(nextRequestType);

    if (isMgRequestType(nextRequestType)) {
      setSteps([
        {
          currentRole: Config.WorkflowDefaults.MgStartRole,
          nextRole: Config.WorkflowDefaults.MgNextRole,
        },
      ]);
      return;
    }

    setSteps(createInitialFormSteps(nextRequestType));
  };

  const handleNextRoleChange = (stepIndex: number, value: string | null): void => {
    if (!isWorkflowStepNextRoleEditable(stepIndex, steps.length, { mode })) {
      return;
    }

    const nextRole = value?.trim() ?? "";
    const updatedSteps = steps.map((step, index) =>
      index === stepIndex ? { ...step, nextRole } : step,
    );
    setSteps(rebuildFormStepsAfterChange(updatedSteps));
  };

  const handleAddStep = (): void => {
    const lastStep = steps[steps.length - 1];

    if (!lastStep?.nextRole.trim()) {
      onValidationWarning(
        `Select ${FieldLabels.NextRole} before adding another step.`,
      );
      return;
    }

    if (!canAddWorkflowStep(steps, requestType ?? "", npdRoleOptions)) {
      onValidationWarning("No additional roles are available for this workflow.");
      return;
    }

    setSteps([
      ...steps,
      {
        currentRole: lastStep.nextRole.trim(),
        nextRole: "",
      },
    ]);
  };

  const handleRemoveStep = (stepIndex: number): void => {
    if (steps.length <= 1) {
      onValidationWarning("At least one workflow step is required.");
      return;
    }

    if (stepIndex !== steps.length - 1) {
      onValidationWarning("Only the latest workflow step can be removed.");
      return;
    }

    const updatedSteps = steps.filter((_, index) => index !== stepIndex);
    setSteps(rebuildFormStepsAfterChange(updatedSteps));
  };

  const handleSave = async (): Promise<void> => {
    const validationError = validateWorkflowConfigurationForm(
      requestType,
      steps,
      existingRows,
      npdRoleOptions,
      mode === "edit" ? item?.RequestType : undefined,
    );

    if (validationError) {
      onValidationWarning(validationError);
      return;
    }

    await onSave(
      (requestType ?? "").trim(),
      steps,
      mode === "edit" ? item?.StepIds : undefined,
    );
  };

  return (
    <Dialog
      visible={visible}
      title={dialogTitle}
      width="36rem"
      className={styles.formDialog}
      onHide={onHide}
      footer={
        <div className={styles.footer}>
          <Button
            label="Cancel"
            variant="secondary"
            size="sm"
            disabled={controlsDisabled}
            onClick={onHide}
          />
          <Button
            label={saveLabel}
            size="sm"
            loading={saving}
            disabled={controlsDisabled}
            onClick={() => {
              void handleSave();
            }}
          />
        </div>
      }
    >
      <div className={styles.formFields}>
        <Dropdown
          id="workflowConfigRequestType"
          label={FieldLabels.RequestType}
          required
          value={requestType}
          options={requestTypeOptions}
          placeholder="Select Request Type"
          disabled={controlsDisabled || mode === "edit"}
          className={styles.formField}
          onChange={(value) =>
            handleRequestTypeChange(
              value === null || value === undefined ? null : String(value),
            )
          }
        />

        {requestTypeSelected ? (
          <>
            <hr className={styles.sectionDivider} />
            <h3 className={styles.sectionTitle}>{FieldLabels.WorkflowSteps}</h3>

            <div className={styles.stepsList}>
              {steps.map((step, index) => {
                const isLastStep = index === steps.length - 1;
                const isNextRoleEditable = isWorkflowStepNextRoleEditable(
                  index,
                  steps.length,
                  { mode },
                );

                return (
                  <div key={`workflow-step-${index}`} className={styles.stepCard}>
                    <div className={styles.stepFields}>
                      <InputText
                        id={`workflowCurrentRole-${index}`}
                        label={FieldLabels.CurrentRole}
                        value={step.currentRole}
                        readOnly
                        disabled
                        className={styles.stepField}
                        onChange={() => undefined}
                      />
                      {isNextRoleEditable && !(isMgRequest && index > 0) ? (
                        <Dropdown
                          id={`workflowNextRole-${index}`}
                          label={FieldLabels.NextRole}
                          required
                          value={step.nextRole || null}
                          options={getNextRoleOptions(index)}
                          placeholder={getNextRolePlaceholder()}
                          disabled={
                            controlsDisabled ||
                            !requestTypeSelected ||
                            (isNpdRequest && npdRolesLoading)
                          }
                          className={styles.stepField}
                          onChange={(value) =>
                            handleNextRoleChange(
                              index,
                              value === null || value === undefined
                                ? null
                                : String(value),
                            )
                          }
                        />
                      ) : (
                        <InputText
                          id={`workflowNextRole-${index}`}
                          label={FieldLabels.NextRole}
                          required
                          value={step.nextRole}
                          readOnly
                          disabled
                          className={styles.stepField}
                          onChange={() => undefined}
                        />
                      )}
                      {steps.length > 1 && !isMgRequest && isLastStep ? (
                        <Button
                          variant="text"
                          icon="pi pi-trash"
                          iconOnly
                          className={styles.removeStepButton}
                          disabled={controlsDisabled}
                          onClick={() => handleRemoveStep(index)}
                        />
                      ) : (
                        <span aria-hidden="true" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {showAddStepButton ? (
              <div className={styles.addStepRow}>
                <Button
                  label="Add Step"
                  icon="pi pi-plus"
                  size="sm"
                  className={styles.addStepButton}
                  disabled={controlsDisabled}
                  onClick={handleAddStep}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </Dialog>
  );
};

export default WorkflowConfigFormDialog;
