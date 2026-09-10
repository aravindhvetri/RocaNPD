export type TagSeverity = "success" | "info" | "warning" | "danger" | null;

export interface ITagProps {
  value: string;
  severity?: TagSeverity;
  rounded?: boolean;
  icon?: string;
  className?: string;
}
