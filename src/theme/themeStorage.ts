import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeMode } from "./types";

const THEME_STORAGE_KEY = "@planora/theme";

export const getStoredTheme = async (): Promise<ThemeMode> => {
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);

    return stored === "light" ? "light" : "dark";
  } catch (error) {
    console.error("Failed to load theme:", error);
    return "dark";
  }
};

export const saveTheme = async (theme: ThemeMode): Promise<void> => {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error("Failed to save theme:", error);
  }
};