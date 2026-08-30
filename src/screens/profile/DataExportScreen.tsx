import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/Button";
import { PlanoraColors, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";
import { getApiErrorMessage } from "@/utils/apiError";
import { useAuthStore } from "@/store/authStore";
import {
  showError,
  showConfirmDialog,
  showSuccess,
} from "@/components/ConfirmationDialog";
import type { PlanoraExportApiResponse } from "@/types/dataExport";
import {
  buildExcelBase64,
  buildWordDocumentHtml,
  exportFileBaseName,
} from "@/utils/dataExportFiles";
import {
  EXPORT_MIME,
  shareBase64File,
  shareTextFile,
} from "@/utils/shareExportFile";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.lg,
    },
    body: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
    buttonGap: { height: spacing.sm },
    hint: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.md,
    },
    dangerZone: {
      marginTop: spacing.xl,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
    },
    dangerTitle: {
      ...typography.label,
      color: colors.error,
      marginBottom: spacing.sm,
    },
  });

type ExportFormat = "excel" | "word";

export const DataExportScreen: React.FC = () => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  const { logout } = useAuthStore();
  const [loading, setLoading] = useState<ExportFormat | null>(null);

  const fetchExportPayload = async () => {
    const res = await apiClient.get<PlanoraExportApiResponse>("/me/export");
    if (!res.success || !res.data) {
      throw new Error("Export data was not returned by the server");
    }
    return res.data;
  };

  const exportAsFile = async (format: ExportFormat) => {
    setLoading(format);
    try {
      const payload = await fetchExportPayload();
      const baseName = exportFileBaseName(payload.exportedAt);

      if (format === "excel") {
        const base64 = buildExcelBase64(payload);
        await shareBase64File(`${baseName}.xlsx`, base64, EXPORT_MIME.xlsx);
      } else {
        const html = buildWordDocumentHtml(payload);
        await shareTextFile(`${baseName}.doc`, html, EXPORT_MIME.doc);
      }

      showSuccess(
        "Export ready",
        "Use Save to Files, Drive, or an office app to open your spreadsheet or document.",
      );
    } catch (e) {
      showError("Export failed", getApiErrorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  const deleteAccount = () => {
    showConfirmDialog({
      title: "Delete account",
      message:
        "This permanently deletes your account and data. This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        try {
          await apiClient.delete("/me");
          await logout();
        } catch (e) {
          showError("Error", getApiErrorMessage(e));
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.body}>
        Download your tasks, goals, alarms, routines, and profile as a real file
        you can open in Excel, Google Sheets, Word, or Google Docs on your
        phone.
      </Text>
      <Button
        label="Export as Excel (.xlsx)"
        onPress={() => exportAsFile("excel")}
        loading={loading === "excel"}
        disabled={loading !== null && loading !== "excel"}
      />
      <View style={styles.buttonGap} />
      <Button
        label="Export as Word (.doc)"
        onPress={() => exportAsFile("word")}
        variant="secondary"
        loading={loading === "word"}
        disabled={loading !== null && loading !== "word"}
      />
      <Text style={styles.hint}>
        After tapping export, choose where to save or which app should open the
        file (Files, Drive, Excel, Word, etc.).
      </Text>
      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>Danger zone</Text>
        <Button
          label="Delete account"
          onPress={deleteAccount}
          variant="ghost"
        />
      </View>
    </View>
  );
};
