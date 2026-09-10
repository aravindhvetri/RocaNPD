import type { INavItemConfig, NavSelectedBarTone } from "../../../../../External/CommonServices/navigationConfig";
import barStyles from "./NavSelectedBar.module.scss";

export const selectedBarToneClass: Record<NavSelectedBarTone, string> = {
  gold: barStyles.selectedBarGold,
  amber: barStyles.selectedBarAmber,
  lime: barStyles.selectedBarLime,
  mint: barStyles.selectedBarMint,
  sky: barStyles.selectedBarSky,
  coral: barStyles.selectedBarCoral,
  violet: barStyles.selectedBarViolet,
  peach: barStyles.selectedBarPeach,
  teal: barStyles.selectedBarTeal,
};

export function resolveSelectedBarTone(item: INavItemConfig): NavSelectedBarTone {
  if (item.selectedBarTone) {
    return item.selectedBarTone;
  }

  switch (item.iconTone) {
    case "pending":
      return "amber";
    case "approved":
      return "mint";
    case "draft":
      return "coral";
    default:
      return "gold";
  }
}

export function getSelectedBarToneClass(item: INavItemConfig): string {
  return selectedBarToneClass[resolveSelectedBarTone(item)];
}
