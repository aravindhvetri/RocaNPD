import * as React from "react";
import { Config } from "../../../../../../External/CommonServices/Config";
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
  onHide,
  onDownloadTemplate,
  onFileRejected,
  onImport,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);

  React.useEffect(() => {
    if (!visible) {
      setSelectedFile(null);
      setIsDragActive(false);
    }
  }, [visible]);

  const assignFile = (file: File | undefined): void => {
    if (!file || importing) {
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

    setSelectedFile(file);
  };

  const openFilePicker = (): void => {
    if (importing) {
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
    if (!importing) {
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

  const handleImportClick = (): void => {
    if (!selectedFile || importing) {
      return;
    }

    void onImport(selectedFile);
  };

  const canDownloadTemplate =
    Boolean(templateFileName) && Boolean(onDownloadTemplate) && !templateLoading;

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
            disabled={importing}
            onClick={onHide}
          />
          <Button
            label="Import"
            size="sm"
            loading={importing}
            disabled={!selectedFile || importing}
            onClick={handleImportClick}
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
              disabled={importing}
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
            {selectedFile && (
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
                disabled={importing}
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
