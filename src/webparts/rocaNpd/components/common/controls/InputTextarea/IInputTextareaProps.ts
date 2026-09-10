import type { IBaseControlProps } from "../IBaseControlProps";

export interface IInputTextareaProps extends IBaseControlProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  autoResize?: boolean;
}
