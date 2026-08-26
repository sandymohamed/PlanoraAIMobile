import { I18nManager, StyleSheet, TextStyle, ViewStyle } from "react-native";
import { isRTLLanguage } from "@/i18n";

/** Whether the app is currently in RTL layout mode. */
export function isRTL(): boolean {
  return I18nManager.isRTL;
}

/** Whether a given language code should use RTL. */
export { isRTLLanguage };

/** Horizontal flex direction that respects layout direction. */
export function rowDirection(): ViewStyle["flexDirection"] {
  return isRTL() ? "row-reverse" : "row";
}

/** Text alignment that follows the active layout direction. */
export function textAlign(): TextStyle["textAlign"] {
  return isRTL() ? "right" : "left";
}

/** Center text alignment (direction-neutral). */
export function textAlignCenter(): TextStyle["textAlign"] {
  return "center";
}

/** Writing direction style for RTL text content. */
export function writingDirection(): TextStyle["writingDirection"] {
  return isRTL() ? "rtl" : "ltr";
}

/** Combined text style for body text in the active direction. */
export function directionalTextStyle(): TextStyle {
  return {
    textAlign: textAlign(),
    writingDirection: writingDirection(),
  };
}

/** TextInput style that respects RTL typing and cursor placement. */
export function inputTextStyle(): TextStyle {
  return directionalTextStyle();
}

/** Logical start edge (left in LTR, right in RTL). */
export function start(value: number): Pick<ViewStyle, "start"> {
  return { start: value };
}

/** Logical end edge (right in LTR, left in RTL). */
export function end(value: number): Pick<ViewStyle, "end"> {
  return { end: value };
}

/** Margin on the logical start side. */
export function marginStart(value: number): Pick<ViewStyle, "marginStart"> {
  return { marginStart: value };
}

/** Margin on the logical end side. */
export function marginEnd(value: number): Pick<ViewStyle, "marginEnd"> {
  return { marginEnd: value };
}

/** Padding on the logical start side. */
export function paddingStart(value: number): Pick<ViewStyle, "paddingStart"> {
  return { paddingStart: value };
}

/** Padding on the logical end side. */
export function paddingEnd(value: number): Pick<ViewStyle, "paddingEnd"> {
  return { paddingEnd: value };
}

/** Border on the logical start side. */
export function borderStartWidth(width: number, color?: string): ViewStyle {
  const style: ViewStyle = { borderStartWidth: width };
  if (color) style.borderStartColor = color;
  return style;
}

/** Hit slop that mirrors with layout direction. */
export function directionalHitSlop(size: number = 8) {
  return { top: size, bottom: size, left: size, right: size };
}

// ── Directional icons (mirror) ──────────────────────────────────────────────

/** Chevron pointing toward "forward" / next screen. */
export function chevronForwardIcon(): string {
  return isRTL() ? "chevron-left" : "chevron-right";
}

/** Chevron pointing toward "back" / previous screen. */
export function chevronBackIcon(): string {
  return isRTL() ? "chevron-right" : "chevron-left";
}

/** Arrow pointing toward "back" navigation. */
export function arrowBackIcon(): string {
  return isRTL() ? "arrow-right" : "arrow-left";
}

/** Arrow pointing toward "forward" navigation. */
export function arrowForwardIcon(): string {
  return isRTL() ? "arrow-left" : "arrow-right";
}

/** Previous / rewind navigation icon. */
export function navigatePreviousIcon(): string {
  return isRTL() ? "chevron-right" : "chevron-left";
}

/** Next / forward navigation icon. */
export function navigateNextIcon(): string {
  return isRTL() ? "chevron-left" : "chevron-right";
}

/** Logical icon placement for leading/trailing icons in rows. */
export function iconPlacement(side: "leading" | "trailing"): "start" | "end" {
  if (side === "leading") return "start";
  return "end";
}

// ── Reusable style fragments ──────────────────────────────────────────────────

export const rtlStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowSpread: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
