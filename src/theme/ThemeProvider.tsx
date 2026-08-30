import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MD3Theme } from "react-native-paper";

import { createPlanoraTheme } from "./paperTheme";
import {
  darkColors,
  lightColors,
  PlanoraColors,
} from "./tokens";
import { ThemeMode } from "./types";
import { getStoredTheme, saveTheme } from "./themeStorage";

interface PlanoraThemeContextValue {
  theme: MD3Theme;
  colors: PlanoraColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isThemeReady: boolean;
}

const ThemeContext =
  createContext<PlanoraThemeContextValue | null>(null);

export const PlanoraThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Dark is the default.
  const [themeMode, setThemeModeState] =
    useState<ThemeMode>("dark");

  const [isThemeReady, setIsThemeReady] = useState(false);

  /**
   * Load persisted theme once when the provider mounts.
   */
  useEffect(() => {
    let mounted = true;

    const loadTheme = async () => {
      try {
        const storedTheme = await getStoredTheme();

        if (mounted) {
          setThemeModeState(storedTheme);
        }
      } catch (error) {
        console.error("Failed to initialize theme:", error);
      } finally {
        if (mounted) {
          setIsThemeReady(true);
        }
      }
    };

    loadTheme();

    return () => {
      mounted = false;
    };
  }, []);

  
  const setThemeMode = (mode: ThemeMode) => {
    if (mode !== "light" && mode !== "dark") {
      return;
    }

    setThemeModeState(mode);

    saveTheme(mode).catch((error) => {
      console.error("Failed to persist theme:", error);
    });
  };

  const isDark = themeMode === "dark";

  const colors = isDark ? darkColors : lightColors;

  const theme = useMemo(
    () => createPlanoraTheme(isDark),
    [isDark]
  );

  const value = useMemo(
    () => ({
      theme,
      colors,
      isDark,
      themeMode,
      setThemeMode,
      isThemeReady,
    }),
    [
      theme,
      colors,
      isDark,
      themeMode,
      isThemeReady,
    ]
  );


  if (!isThemeReady) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const usePlanoraTheme = (): PlanoraThemeContextValue => {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error(
      "usePlanoraTheme must be used inside PlanoraThemeProvider"
    );
  }

  return context;
};