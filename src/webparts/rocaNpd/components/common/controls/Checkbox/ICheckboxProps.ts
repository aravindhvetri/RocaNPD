import type { IBaseControlProps } from "../IBaseControlProps";

export interface ICheckboxProps extends IBaseControlProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}
