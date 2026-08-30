import React, { useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { AppIcon } from "@/components/ui/AppIcon";
import { inputTextStyle } from "@/utils/rtl";
import { PlanoraColors, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    input: {
      flex: 1,
      padding: spacing.md,
      paddingEnd: spacing.xs,
      color: colors.text,
    },
    toggle: {
      padding: spacing.md,
      paddingStart: spacing.xs,
    },
  });

type PasswordInputProps = Omit<TextInputProps, "secureTextEntry">;

export const PasswordInput: React.FC<PasswordInputProps> = ({
  style,
  ...textInputProps
}) => {
  const [visible, setVisible] = useState(false);
  const { styles, colors } = usePlanoraStyles(createStyles);

  return (
    <View style={styles.container}>
      <TextInput
        {...textInputProps}
        style={[styles.input, inputTextStyle(), style]}
        secureTextEntry={!visible}
      />
      <Pressable
        style={styles.toggle}
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        hitSlop={8}
      >
        <AppIcon
          name={visible ? "eye-off-outline" : "eye-outline"}
          size={22}
          color={colors.textMuted}
        />
      </Pressable>
    </View>
  );
};
