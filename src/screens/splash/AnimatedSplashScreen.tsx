import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Video from "react-native-video";
import { PlanoraColors, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";

const logoVideo = require("@/assets/logo.mp4");

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    skipButton: {
      position: "absolute",
      end: spacing.lg,
      top: spacing.xxl,
      borderRadius: 999,
      backgroundColor: "rgba(10, 10, 15, 0.55)",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    skipText: {
      ...typography.label,
      color: colors.text,
    },
  });

type AnimatedSplashScreenProps = {
  onFinish: () => void;
};

export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  onFinish,
}) => {
  const { styles } = usePlanoraStyles(createStyles);

  return (
    <View style={styles.container}>
      <Video
        source={logoVideo}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        paused={false}
        repeat={false}
        muted
        controls={false}
        onEnd={onFinish}
        onError={onFinish}
      />
      {/* <Pressable style={styles.skipButton} onPress={onFinish} accessibilityRole="button">
      <Text style={styles.skipText}>Skip</Text>
    </Pressable> */}
    </View>
  );
};
