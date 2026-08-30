import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { routineService } from "@/services/routineService";
import { useAlarmStore } from "@/store/alarmStore";
import { useTaskStore } from "@/store/taskStore";
import { RoutineForm } from "@/components/routines/RoutineForm";
import { CreateRoutineData } from "@/types/routine";
import { PlanoraColors } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";
import { getApiErrorMessage } from "@/utils/apiError";
import { showError } from "@/components/ConfirmationDialog";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
  });

export const RoutineCreateScreen: React.FC = () => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  const navigation = useNavigation();
  const { t } = useTranslation();
  const fetchAlarms = useAlarmStore((s) => s.fetchAlarms);
  const markStale = useTaskStore((s) => s.markStale);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: CreateRoutineData) => {
    setLoading(true);
    try {
      await routineService.createRoutine(data);
      setTimeout(() => fetchAlarms(1, 1000, true).catch(() => {}), 1000);
      markStale();
      navigation.goBack();
    } catch (e) {
      showError(t("common.error"), getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <RoutineForm
        onSubmit={onSubmit}
        submitLabel={t("routines.form.createRoutine")}
        loading={loading}
      />
    </View>
  );
};
