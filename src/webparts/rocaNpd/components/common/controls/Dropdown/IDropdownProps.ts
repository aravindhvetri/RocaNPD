import type { IBaseControlProps } from "../IBaseControlProps";

export interface IDropdownOption {
  label: string;
  value: string | number;
}

export interface IDropdownProps extends IBaseControlProps {
  value: string | number | null;
  options: IDropdownOption[];
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  filter?: boolean;
  showClear?: boolean;
}
