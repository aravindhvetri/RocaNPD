import type { IBaseControlProps } from "../IBaseControlProps";
import type { IDropdownOption } from "../Dropdown/IDropdownProps";

export interface IComboBoxProps extends IBaseControlProps {
  value: string;
  suggestions: IDropdownOption[];
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  minLength?: number;
}
