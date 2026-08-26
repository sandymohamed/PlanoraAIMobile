import { useTranslation } from "react-i18next";
import { I18nManager } from "react-native";
import { isRTLLanguage } from "@/i18n";
import {
  arrowBackIcon,
  arrowForwardIcon,
  chevronBackIcon,
  chevronForwardIcon,
  directionalTextStyle,
  marginEnd,
  marginStart,
  navigateNextIcon,
  navigatePreviousIcon,
  paddingEnd,
  paddingStart,
  rowDirection,
  textAlign,
  textAlignCenter,
  writingDirection,
  iconPlacement,
} from "@/utils/rtl";

export function useRTL() {
  const { i18n } = useTranslation();

  // const rtl = isRTLLanguage(i18n.language) || I18nManager.isRTL;
  const rtl = isRTLLanguage(i18n.language);

  
  return {
    isRTL: rtl,
    rowDirection,
    textAlign: () => (rtl ? "right" : "left") as "left" | "right",
    textAlignCenter,
    writingDirection: () => (rtl ? "rtl" : "ltr") as "rtl" | "ltr",
    directionalTextStyle: () => ({
      textAlign: (rtl ? "right" : "left") as "left" | "right",
      writingDirection: (rtl ? "rtl" : "ltr") as "rtl" | "ltr",
    }),
    marginStart,
    marginEnd,
    paddingStart,
    paddingEnd,
    chevronForward: chevronForwardIcon,
    chevronBack: chevronBackIcon,
    arrowBack: arrowBackIcon,
    arrowForward: arrowForwardIcon,
    navigatePrevious: navigatePreviousIcon,
    navigateNext: navigateNextIcon,
    iconPlacement,
  };
}
