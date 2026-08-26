// import { I18nManager } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import i18n from "i18next";
// import { initReactI18next } from "react-i18next";
// // import { findBestLanguageTag } from "react-native-localize";

// const en = require("./locales/en.json");
// const ar = require("./locales/ar.json");

// export type AppLanguage = "en" | "ar";

// export const DEFAULT_LANGUAGE: AppLanguage = "en";
// export const LANGUAGE_STORAGE_KEY = "@planora:language";

// export const supportedLanguages: Array<{
//   code: AppLanguage;
//   label: string;
//   nativeLabel: string;
//   isRTL: boolean;
// }> = [
//   { code: "en", label: "English", nativeLabel: "English", isRTL: false },
//   { code: "ar", label: "Arabic", nativeLabel: "العربية", isRTL: true },
// ];

// const resources = {
//   en: { translation: en },
//   ar: { translation: ar },
// };

// function normalizeLanguage(language?: string | null): AppLanguage {
//   return language?.toLowerCase().startsWith("ar") ? "ar" : DEFAULT_LANGUAGE;
// }

// // function detectDeviceLanguage(): AppLanguage {
// //   const best = findBestLanguageTag(["en", "ar"]);
// //   return normalizeLanguage(best?.languageTag);
// // }

// export function isRTLLanguage(language: string = i18n.language): boolean {
//   return normalizeLanguage(language) === "ar";
// }

// // function applyLayoutDirection(language: AppLanguage): void {
// //   const shouldUseRTL = isRTLLanguage(language);
// //   I18nManager.allowRTL(true);
// //   I18nManager.swapLeftAndRightInRTL(true);
// //   if (I18nManager.isRTL !== shouldUseRTL) {
// //     I18nManager.forceRTL(shouldUseRTL);
// //     //  I18nManager.allowRTL(true);
// //   }
// // }

// function applyLayoutDirection(language: AppLanguage): void {
//   const shouldUseRTL = language === "ar";

//   I18nManager.allowRTL(true);
//   I18nManager.swapLeftAndRightInRTL(true);

//   if (I18nManager.isRTL !== shouldUseRTL) {
//     I18nManager.forceRTL(shouldUseRTL);
//   }
// }

// i18n.use(initReactI18next).init({
//   resources,
//   lng: DEFAULT_LANGUAGE,
//   fallbackLng: DEFAULT_LANGUAGE,
//   supportedLngs: supportedLanguages.map((language) => language.code),
//   compatibilityJSON: "v4",
//   interpolation: {
//     escapeValue: false,
//   },
//   returnNull: false,
// });

// export async function initializeI18n(): Promise<AppLanguage> {
//   const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

//   const language = normalizeLanguage(savedLanguage ?? DEFAULT_LANGUAGE);

//   applyLayoutDirection(language);

//   if (i18n.language !== language) {
//     await i18n.changeLanguage(language);
//   }

//   return language;
// }

// export async function setAppLanguage(language: AppLanguage): Promise<void> {
//   const nextLanguage = normalizeLanguage(language);
//   await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
//   applyLayoutDirection(nextLanguage);
//   await i18n.changeLanguage(nextLanguage);
// }

// export function formatDate(
//   value: Date | string | number,
//   options: Intl.DateTimeFormatOptions,
// ): string {
//   const language = normalizeLanguage(i18n.language);
//   return new Intl.DateTimeFormat(
//     language === "ar" ? "ar-EG" : "en-US",
//     options,
//   ).format(new Date(value));
// }

// export function formatNumber(
//   value: number,
//   options?: Intl.NumberFormatOptions,
// ): string {
//   const language = normalizeLanguage(i18n.language);
//   return new Intl.NumberFormat(
//     language === "ar" ? "ar-EG" : "en-US",
//     options,
//   ).format(value);
// }

// void initializeI18n().catch(() => undefined);

// export default i18n;





import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const en = require("./locales/en.json");
const ar = require("./locales/ar.json");

export type AppLanguage = "en" | "ar";

export const DEFAULT_LANGUAGE: AppLanguage = "en";

export const LANGUAGE_STORAGE_KEY = "@planora:language";

export const supportedLanguages: Array<{
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  isRTL: boolean;
}> = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    isRTL: false,
  },
  {
    code: "ar",
    label: "Arabic",
    nativeLabel: "العربية",
    isRTL: true,
  },
];

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

function normalizeLanguage(language?: string | null): AppLanguage {
  return language?.toLowerCase().startsWith("ar")
    ? "ar"
    : DEFAULT_LANGUAGE;
}

export function isRTLLanguage(
  language: string = i18n.language,
): boolean {
  return normalizeLanguage(language) === "ar";
}

i18n.use(initReactI18next).init({
  resources,

  // Planora always starts in English.
  lng: DEFAULT_LANGUAGE,

  fallbackLng: DEFAULT_LANGUAGE,

  supportedLngs: supportedLanguages.map(
    (language) => language.code,
  ),

  compatibilityJSON: "v4",

  interpolation: {
    escapeValue: false,
  },

  returnNull: false,
});

export async function initializeI18n(): Promise<AppLanguage> {
  const savedLanguage = await AsyncStorage.getItem(
    LANGUAGE_STORAGE_KEY,
  );

  // English on first installation.
  // If the user previously selected Arabic,
  // restore Arabic.
  const language = normalizeLanguage(
    savedLanguage ?? DEFAULT_LANGUAGE,
  );

  if (i18n.language !== language) {
    await i18n.changeLanguage(language);
  }

  return language;
}

export async function setAppLanguage(
  language: AppLanguage,
): Promise<void> {
  const nextLanguage = normalizeLanguage(language);

  await AsyncStorage.setItem(
    LANGUAGE_STORAGE_KEY,
    nextLanguage,
  );

  await i18n.changeLanguage(nextLanguage);
}

export function formatDate(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions,
): string {
  const language = normalizeLanguage(i18n.language);

  return new Intl.DateTimeFormat(
    language === "ar" ? "ar-EG" : "en-US",
    options,
  ).format(new Date(value));
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  const language = normalizeLanguage(i18n.language);

  return new Intl.NumberFormat(
    language === "ar" ? "ar-EG" : "en-US",
    options,
  ).format(value);
}

export default i18n;