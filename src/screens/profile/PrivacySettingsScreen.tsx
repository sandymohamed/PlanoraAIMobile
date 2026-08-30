import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiClient } from "@/services/apiClient";
import { PlanoraColors, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    label: { ...typography.body, color: colors.text },
  });

type PrivacyPrefs = {
  shareAnalytics?: boolean;
  shareCrashReports?: boolean;
  allowDataCollection?: boolean;
};

const TOGGLES: { key: keyof PrivacyPrefs; label: string }[] = [
  { key: "shareAnalytics", label: "Share usage analytics" },
  { key: "shareCrashReports", label: "Share crash reports" },
  { key: "allowDataCollection", label: "Allow product improvement data" },
];

export const PrivacySettingsScreen: React.FC = () => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  const [prefs, setPrefs] = useState<PrivacyPrefs>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: PrivacyPrefs }>(
        "/me/privacy-settings",
      );
      setPrefs(res.data || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const update = async (key: keyof PrivacyPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await apiClient.put("/me/privacy-settings", next);
  };

  if (loading)
    return (
      <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
    );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
    >
      {TOGGLES.map(({ key, label }) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Switch
            value={prefs[key] !== false}
            onValueChange={(v) => update(key, v)}
          />
        </View>
      ))}
    </ScrollView>
  );
};
