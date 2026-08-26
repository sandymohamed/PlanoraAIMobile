type RoutineDeletedListener = (routineId: string) => void;

const routineDeletedListeners = new Set<RoutineDeletedListener>();

export const routineEvents = {
  emitDeleted(routineId: string) {
    routineDeletedListeners.forEach((listener) => listener(routineId));
  },

  onDeleted(listener: RoutineDeletedListener) {
    routineDeletedListeners.add(listener);
    return () => {
      routineDeletedListeners.delete(listener);
    };
  },
};
