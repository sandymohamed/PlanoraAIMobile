type RoutineDeletedListener = (routineId: string) => void;

const routineDeletedListeners = new Set<RoutineDeletedListener>();

export const routineEvents = {
  emitDeleted(routineId: string) {
    console.log("routineEvents: initialized  emitDeleted", routineId);
    routineDeletedListeners.forEach((listener) => listener(routineId));
  },

  onDeleted(listener: RoutineDeletedListener) {
    console.log("routineEvents: initialized  onDeleted", listener);
    routineDeletedListeners.add(listener);
    return () => {
      routineDeletedListeners.delete(listener);
    };
  },
};
