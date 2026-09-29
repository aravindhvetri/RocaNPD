import * as React from "react";
import { Config } from "../../../../../../External/CommonServices/Config";
import { validateRequiredImportHeaders } from "../../../../../../External/CommonServices/importService";
import { Button, Dialog } from "../../controls";
import type { IImportDialogProps } from "./IImportDialogProps";
import styles from "./ImportDialog.module.scss";

const ImportDialog: React.FC<IImportDialogProps> = ({
  visible,
  title = "Import",
  importSectionTitle,
  templateSectionHint,
  templateFileName,
  templateLoading = false,
  templateUnavailableMessage = "Template is not available.",
  acceptedFormatsLabel,
  maxSizeLabel,
  maxFileSizeBytes,
  accept,
  importing = false,
  expectedHeaders,
  onHide,
  onDownloadTemplate,
  onFileRejected,
  onImport,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const validateGenerationRef = React.useRef(0);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [isValidatingHeaders, setIsValidatingHeaders] = React.useState(false);

  React.useEffect(() => {
    if (!visible) {
      validateGenerationRef.current += 1;
      setSelectedFile(null);
      setIsDragActive(false);
      setIsValidatingHeaders(false);
    }
  }, [visible]);

  const assignFile = (file: File | undefined): void => {
    if (!file || importing || isValidatingHeaders) {
      return;
    }

    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const allowedExtensions = Config.ImportExport.AcceptedSpreadsheetExtensions;

    if (
      !allowedExtensions.includes(
        extension as (typeof allowedExtensions)[number],
      )
    ) {
      onFileRejected?.(acceptedFormatsLabel);
      return;
    }

    if (file.size > maxFileSizeBytes) {
      onFileRejected?.(maxSizeLabel);
      return;
    }

    const headers = expectedHeaders?.length ? [...expectedHeaders] : [];
    if (!headers.length) {
      setSelectedFile(file);
      return;
    }

    const generation = ++validateGenerationRef.current;
    setIsValidatingHeaders(true);

    void validateRequiredImportHeaders(file, headers)
      .then(() => {
        if (generation !== validateGenerationRef.current) {
          return;
        }
        setSelectedFile(file);
      })
      .catch((error: unknown) => {
        if (generation !== validateGenerationRef.current) {
          return;
        }
        setSelectedFile(null);
        onFileRejected?.(
          error instanceof Error
            ? error.message
            : Config.ImportExport.MissingRequiredColumnsMessage,
        );
      })
      .finally(() => {
        if (generation === validateGenerationRef.current) {
          setIsValidatingHeaders(false);
        }
      });
  };

  const openFilePicker = (): void => {
    if (importing || isValidatingHeaders) {
      return;
    }
    inputRef.current?.click();
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    assignFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    if (!importing && !isValidatingHeaders) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragActive(false);
    assignFile(event.dataTransfer.files?.[0]);
  };

  const handleImport = (): void => {
    if (importing || isValidatingHeaders || !selectedFile) {
      return;
    }

    void onImport(selectedFile);
  };

  const canDownloadTemplate =
    Boolean(templateFileName) && Boolean(onDownloadTemplate) && !templateLoading;
  const interactionLocked = importing || isValidatingHeaders;

  return (
    <Dialog
      visible={visible}
      title={title}
      width="44rem"
      className={styles.importDialog}
      onHide={onHide}
      footer={
        <div className={styles.footer}>
          <Button
            label="Cancel"
            variant="secondary"
            size="sm"
            disabled={interactionLocked}
            onClick={onHide}
          />
          <Button
            label="Import"
            size="sm"
            loading={importing}
            disabled={!selectedFile || interactionLocked}
            onClick={handleImport}
          />
        </div>
      }
    >
      <div className={styles.body}>
        <section>
          <h3 className={styles.sectionTitle}>{importSectionTitle}</h3>
          <div
            className={`${styles.dropZone} ${isDragActive ? styles.dropZoneActive : ""}`}
            role="button"
            tabIndex={0}
            onClick={openFilePicker}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openFilePicker();
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className={styles.hiddenInput}
              disabled={interactionLocked}
              onChange={handleInputChange}
            />
            <i
              className={`pi pi-cloud-upload ${styles.uploadIcon}`}
              aria-hidden="true"
            />
            <p className={styles.dropZonePrimary}>
              Click to browse or drag and drop
            </p>
            <p className={styles.dropZoneSecondary}>
              {acceptedFormatsLabel}
              <br />
              {maxSizeLabel}
            </p>
            {isValidatingHeaders && (
              <p className={styles.selectedFileName}>Validating columns...</p>
            )}
            {!isValidatingHeaders && selectedFile && (
              <p className={styles.selectedFileName}>{selectedFile.name}</p>
            )}
          </div>
        </section>

        <section className={styles.templatePanel}>
          <h3 className={styles.sectionTitle}>{templateSectionHint}</h3>
          {templateLoading ? (
            <p className={styles.templateUnavailable}>Loading template...</p>
          ) : canDownloadTemplate ? (
            <div className={styles.templateRow}>
              <span className={styles.templateFileName}>{templateFileName}</span>
              <Button
                variant="text"
                icon="pi pi-download"
                iconOnly
                className={styles.downloadButton}
                disabled={interactionLocked}
                onClick={onDownloadTemplate}
              />
            </div>
          ) : (
            <p className={styles.templateUnavailable}>
              {templateUnavailableMessage}
            </p>
          )}
        </section>
      </div>
    </Dialog>
  );
};

export default ImportDialog;
