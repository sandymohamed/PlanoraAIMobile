export type PlanoraExportRecord = Record<string, unknown>;

export type PlanoraExportGoal = PlanoraExportRecord & {
  milestones?: PlanoraExportRecord[];
};

export type PlanoraExportRoutine = PlanoraExportRecord & {
  routineTasks?: PlanoraExportRecord[];
};

export type PlanoraExportData = {
  user: PlanoraExportRecord | null;
  tasks: PlanoraExportRecord[];
  projects: PlanoraExportRecord[];
  goals: PlanoraExportGoal[];
  alarms: PlanoraExportRecord[];
  reminders: PlanoraExportRecord[];
  routines: PlanoraExportRoutine[];
  timers: PlanoraExportRecord[];
  weeklyReviews: PlanoraExportRecord[];
  exportedAt: string;
};

export type PlanoraExportApiResponse = {
  success: boolean;
  data: PlanoraExportData;
};
