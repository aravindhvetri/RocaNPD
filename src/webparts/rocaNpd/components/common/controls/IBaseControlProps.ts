export interface IBaseControlProps {
  id?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  'data-testid'?: string;
}
