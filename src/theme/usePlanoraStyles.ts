import { useMemo } from "react";
import { usePlanoraTheme } from "./ThemeProvider";
import { PlanoraColors } from "./tokens";

export const usePlanoraStyles = <T>(
  createStyles: (colors: PlanoraColors) => T,
) => {
  const { colors } = usePlanoraTheme();

  const styles = useMemo(() => createStyles(colors), [colors, createStyles]);

  return {
    styles,
    colors,
  };
};
