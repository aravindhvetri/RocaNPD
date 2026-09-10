import type { IBaseControlProps } from "../IBaseControlProps";

export interface IFileUploadProps extends IBaseControlProps {
  accept?: string;
  multiple?: boolean;
  maxFileSize?: number;
  onSelect: (files: File[]) => void;
  chooseLabel?: string;
}
