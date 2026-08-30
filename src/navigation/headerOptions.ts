import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { PlanoraColors } from "@/theme/tokens";

export const createStackHeaderOptions = (
  colors: PlanoraColors
): NativeStackNavigationOptions => ({
  headerStyle: {
    backgroundColor: colors.surface,
  },

  headerTintColor: colors.text,

  headerTitleAlign: "center",

  headerBackVisible: false,
});