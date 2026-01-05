import {LoadingOverlay, Text} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';

import {type DayOfWeek, PlannedWorkout, WEEKDAY_NAMES} from '@/services/training_plans';
import {ExerciseSelectDrawer} from '@/shared/ExerciseSelect';

import AddWorkoutModal from './AddWorkoutModal';
import SetConfigModal from './SetConfigModal';
import classes from './styles.module.css';
import useDayWorkouts from './useDayWorkouts';
import WorkoutCard from './WorkoutCard';

type DayWorkoutsViewProps = {
  currentDay: DayOfWeek;
  planId: null | string;
  workouts: PlannedWorkout[];
  exerciseNames?: Record<string, string>;
};

const DayWorkoutsView = ({
  currentDay,
  planId,
  workouts,
  exerciseNames: externalExerciseNames = {},
}: DayWorkoutsViewProps) => {
  const {
    planId: effectivePlanId,
    isLoading,
    workoutsForDay,
    isExerciseDrawerOpen,
    closeExerciseDrawer,
    handleExerciseSelect,
    handleAddExercise,
    deleteExercise,
    handleExerciseClick,
    selectedElement,
    selectedWorkoutId,
    closeElementEditor,
    updateElementSets,
    exerciseNames: hookExerciseNames,
    // Workout management
    isAddWorkoutModalOpen,
    openAddWorkoutModal,
    closeAddWorkoutModal,
    createWorkout,
  } = useDayWorkouts({
    currentDay,
    planId,
    workouts,
  });

  // Merge exercise names from props and hook
  const exerciseNames = {...hookExerciseNames, ...externalExerciseNames};

  if (!effectivePlanId) return null;

  const hasWorkouts = workoutsForDay.length > 0;

  // Find the exercise name for the selected element
  const selectedExerciseName = selectedElement ? exerciseNames[selectedElement.exercise_id] || 'Exercise' : 'Exercise';

  return (
    <div className={classes.loadingContainer}>
      <LoadingOverlay visible={isLoading} />

      {isExerciseDrawerOpen && (
        <ExerciseSelectDrawer
          multiple={false}
          onClose={closeExerciseDrawer}
          onComplete={(selectedIds: string[]) => {
            handleExerciseSelect(selectedIds);
          }}
        />
      )}

      {/* Set Configuration Modal */}
      {selectedElement && (
        <SetConfigModal
          exerciseName={selectedExerciseName}
          initialSets={selectedElement.sets || []}
          onClose={closeElementEditor}
          onDelete={() => {
            if (selectedWorkoutId) {
              deleteExercise(selectedWorkoutId, selectedElement.id);
            }
          }}
          onSave={async (sets) => {
            await updateElementSets(selectedElement.id, sets);
          }}
          opened={!!selectedElement}
        />
      )}

      {/* Add Workout Modal */}
      <AddWorkoutModal
        dayName={WEEKDAY_NAMES[currentDay]}
        onClose={closeAddWorkoutModal}
        onSubmit={createWorkout}
        opened={isAddWorkoutModalOpen}
      />

      <div className={classes.workoutsContainer}>
        {hasWorkouts ? (
          <>
            {workoutsForDay.map((workout) => (
              <WorkoutCard
                defaultExpanded={workoutsForDay.length === 1}
                exerciseNames={exerciseNames}
                key={workout.id}
                onAddExercise={handleAddExercise}
                onDeleteExercise={deleteExercise}
                onExerciseClick={handleExerciseClick}
                workout={workout}
              />
            ))}
          </>
        ) : (
          <div className={classes.emptyState}>
            <Text className={classes.emptyStateText}>No workouts scheduled for this day</Text>
          </div>
        )}

        {/* Add Workout Button */}
        <div
          className={classes.addWorkoutCard}
          onClick={openAddWorkoutModal}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openAddWorkoutModal();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <IconPlus
            color="var(--mantine-color-gray-5)"
            size={20}
          />
          <Text className={classes.addWorkoutCardText}>Add Workout</Text>
        </div>
      </div>
    </div>
  );
};

export default DayWorkoutsView;
