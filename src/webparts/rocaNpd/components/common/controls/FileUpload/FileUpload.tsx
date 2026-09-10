import * as React from "react";
import { FileUpload as PrimeFileUpload } from "primereact/fileupload";
import ControlField from "../ControlField/ControlField";
import type { IFileUploadProps } from "./IFileUploadProps";

const FileUpload: React.FC<IFileUploadProps> = ({
  id,
  label,
  required,
  disabled,
  error,
  helperText,
  className,
  accept,
  multiple,
  maxFileSize,
  onSelect,
  chooseLabel = "Choose",
  'data-testid': testId,
}) => (
  <ControlField
    id={id}
    label={label}
    required={required}
    error={error}
    helperText={helperText}
    className={className}
  >
    <PrimeFileUpload
      mode="basic"
      name={id ?? "file"}
      accept={accept}
      multiple={multiple}
      maxFileSize={maxFileSize}
      disabled={disabled}
      chooseLabel={chooseLabel}
      className={error ? "p-invalid" : undefined}
      data-testid={testId}
      customUpload
      uploadHandler={() => undefined}
      onSelect={(e) => onSelect(Array.from(e.files))}
    />
  </ControlField>
);

export default FileUpload;
