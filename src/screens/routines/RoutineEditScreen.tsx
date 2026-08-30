import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { routineService } from '@/services/routineService';
import { useAlarmStore } from '@/store/alarmStore';
import { useTaskStore } from '@/store/taskStore';
import { RoutineForm } from '@/components/routines/RoutineForm';
import { CreateRoutineData } from '@/types/routine';
import { RoutinesStackParamList } from '@/navigation/RoutinesStack';
import { PlanoraColors,  } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";
import { getApiErrorMessage } from '@/utils/apiError';
import { showError } from '@/components/ConfirmationDialog';


const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});


export const RoutineEditScreen: React.FC = () => {
    const { styles, colors } = usePlanoraStyles(createStyles);
  
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { routineId } = useRoute<RouteProp<RoutinesStackParamList, 'RoutineEdit'>>().params;
  const fetchAlarms = useAlarmStore((s) => s.fetchAlarms);
  const markStale = useTaskStore((s) => s.markStale);
  const [initial, setInitial] = useState<Partial<CreateRoutineData>>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    routineService
      .getRoutineById(routineId)
      .then((r) =>
        setInitial({
          title: r.title,
          description: r.description,
          frequency: r.frequency,
          schedule: r.schedule,
          timezone: r.timezone,
          reminderBefore: r.reminderBefore,
          nextOccurrenceAt: r.nextOccurrenceAt,
        })
      )
      .catch((e) => showError(t('common.error'), getApiErrorMessage(e)));
  }, [routineId]);

  const onSubmit = async (data: CreateRoutineData) => {
    setLoading(true);
    try {
      await routineService.updateRoutine(routineId, data);
      setTimeout(() => fetchAlarms(1, 1000, true).catch(() => {}), 1000);
       markStale();
      navigation.goBack();
    } catch (e) {
      showError(t('common.error'), getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (!initial) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RoutineForm initial={initial} onSubmit={onSubmit} submitLabel={t('routines.form.saveRoutine')} loading={loading} />
    </View>
  );
};

