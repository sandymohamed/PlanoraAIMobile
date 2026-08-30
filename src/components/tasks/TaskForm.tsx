import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { TaskPriority, TaskStatus } from "@/types/task";
import { PlanoraColors, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";
import {
  priorityColor,
  translateTaskPriority,
  translateTaskStatus,
} from "@/utils/taskUi";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    wrap: { padding: spacing.lg, paddingBottom: 120 },
    label: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    input: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      ...typography.body,
    },
    inputError: { borderColor: colors.error },
    multiline: { minHeight: 88, textAlignVertical: "top" },
    err: { color: colors.error, ...typography.caption, marginTop: 4 },
    rowChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    chipText: { ...typography.caption, color: colors.textSecondary },
    chipTextActive: { color: colors.primary, fontWeight: "600" },
  });

export interface TaskFormValues {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  dueTime?: string;
}

interface TaskFormProps {
  values: TaskFormValues;
  errors: Record<string, string>;
  onChange: (patch: Partial<TaskFormValues>) => void;
  hasTime: boolean;
  selectedDateTime: Date | null;
  onDueChange: (date: Date | null) => void;
  onToggleHasTime: (v: boolean) => void;
  onClearDue: () => void;
}

const PRIORITIES = [
  TaskPriority.LOW,
  TaskPriority.MEDIUM,
  TaskPriority.HIGH,
  TaskPriority.URGENT,
];
const STATUSES = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE];

export const TaskForm: React.FC<TaskFormProps> = ({
  values,
  errors,
  onChange,
  hasTime,
  selectedDateTime,
  onDueChange,
  onToggleHasTime,
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const { styles, colors } = usePlanoraStyles(createStyles);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.wrap,
        {
          flexDirection: "column",
          alignItems: isArabic ? "flex-end" : "flex-start",
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text
        style={[
          styles.label,
          {
            textAlign: isArabic ? "right" : "left",
            writingDirection: isArabic ? "rtl" : "ltr",
          },
        ]}
      >
        {t("tasks.form.titleLabel")}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            textAlign: isArabic ? "right" : "left",
            writingDirection: isArabic ? "rtl" : "ltr",
          },
          errors.title && styles.inputError,
        ]}
        value={values.title}
        onChangeText={(title) => onChange({ title })}
        placeholder={t("tasks.form.titlePlaceholder")}
        placeholderTextColor={colors.textMuted}
      />
      {errors.title ? (
        <Text
          style={[
            styles.err,
            {
              textAlign: isArabic ? "right" : "left",
              writingDirection: isArabic ? "rtl" : "ltr",
            },
          ]}
        >
          {errors.title}
        </Text>
      ) : null}

      <Text
        style={[
          styles.label,
          {
            textAlign: isArabic ? "right" : "left",
            writingDirection: isArabic ? "rtl" : "ltr",
          },
        ]}
      >
        {t("tasks.form.descriptionLabel")}
      </Text>
      <TextInput
        style={[
          styles.input,
          styles.multiline,
          {
            textAlign: isArabic ? "right" : "left",
            writingDirection: isArabic ? "rtl" : "ltr",
          },
        ]}
        value={values.description}
        onChangeText={(description) => onChange({ description })}
        placeholder={t("tasks.form.descriptionPlaceholder")}
        placeholderTextColor={colors.textMuted}
        multiline
      />

      <Text
        style={[
          styles.label,
          {
            textAlign: isArabic ? "right" : "left",
            writingDirection: isArabic ? "rtl" : "ltr",
          },
        ]}
      >
        {t("tasks.form.priorityLabel")}
      </Text>
      <View style={styles.rowChips}>
        {PRIORITIES.map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.chip,
              values.priority === p && {
                borderColor: priorityColor(p,colors),
                backgroundColor: colors.primarySoft,
              },
            ]}
            onPress={() => onChange({ priority: p })}
          >
            <Text
              style={[
                styles.chipText,
                values.priority === p && { color: priorityColor(p,colors) },
              ]}
            >
              {translateTaskPriority(p)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text
        style={[
          styles.label,
          {
            textAlign: isArabic ? "right" : "left",
            writingDirection: isArabic ? "rtl" : "ltr",
          },
        ]}
      >
        {t("tasks.form.statusLabel")}
      </Text>
      <View style={styles.rowChips}>
        {STATUSES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, values.status === s && styles.chipActive]}
            onPress={() => onChange({ status: s })}
          >
            <Text
              style={[
                styles.chipText,
                values.status === s && styles.chipTextActive,
              ]}
            >
              {translateTaskStatus(s)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text
        style={[
          styles.label,
          {
            textAlign: isArabic ? "right" : "left",
            writingDirection: isArabic ? "rtl" : "ltr",
          },
        ]}
      >
        {t("tasks.form.dueDateLabel")}
      </Text>
      <DateTimePicker
        mode="datetime"
        value={selectedDateTime}
        onChange={onDueChange}
        optionalTime
        hasTime={hasTime}
        onHasTimeChange={onToggleHasTime}
        placeholder={t("tasks.form.noDueDate")}
        helperText={t("tasks.form.dueDateHelper")}
        clearLabel={t("tasks.form.noDueDate")}
        showClear={Boolean(values.dueDate)}
      />
      {errors.dueDate ? (
        <Text
          style={[
            styles.err,
            {
              textAlign: isArabic ? "right" : "left",
              writingDirection: isArabic ? "rtl" : "ltr",
            },
          ]}
        >
          {errors.dueDate}
        </Text>
      ) : null}
    </ScrollView>
  );
};
