import {Accordion, Button, Spinner, Surface} from '@heroui/react';
import {IconBarbell, IconChevronDown, IconPlus} from '@tabler/icons-react';

import {type DayOfWeek, PlannedWorkout, WEEKDAY_NAMES} from '@/services/training_plans';
import {ExerciseSelectDrawer} from '@/shared/ExerciseSelect';

import AddWorkoutModal from './AddWorkoutModal';
import SetConfigModal from './SetConfigModal';
import useDayWorkouts from './useDayWorkouts';

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
    deleteExercise,
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

  const exerciseNames = {...hookExerciseNames, ...externalExerciseNames};

  if (!effectivePlanId) return null;

  const selectedExerciseName = selectedElement ? exerciseNames[selectedElement.exercise_id] || 'Exercise' : 'Exercise';

  return (
    <Surface>
      {isLoading && <Spinner />}

      {isExerciseDrawerOpen && (
        <ExerciseSelectDrawer
          multiple={false}
          onClose={closeExerciseDrawer}
          onComplete={(selectedIds: string[]) => {
            handleExerciseSelect(selectedIds);
          }}
        />
      )}

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

      <AddWorkoutModal
        dayName={WEEKDAY_NAMES[currentDay]}
        onClose={closeAddWorkoutModal}
        onSubmit={createWorkout}
        opened={isAddWorkoutModalOpen}
      />

      <div className={'flex flex-col gap-4'}>
        {workoutsForDay.length > 0 ? (
          <>
            <h4>Workouts</h4>
            <Accordion className="w-full max-w-md shadow-md border border-gray-200 rounded-2xl">
              {workoutsForDay.map((workout, index) => (
                <Accordion.Item key={index}>
                  {({isExpanded}) => (
                    <>
                      <Accordion.Heading>
                        <Accordion.Trigger className="hover:bgsurface group flex items-center gap-4 transition-none  rounded-2xl">
                          <IconBarbell
                            className="text-primary/80 group-hover:text-primary block"
                            size={28}
                          />
                          <div className="flex flex-col gap-0">
                            <span className="leading-5 font-medium text-gray-900">{workout.name}</span>
                            <span className="leading-6 font-normal text-muted/80">
                              {workout.elements.length} Exercises
                            </span>
                          </div>
                          <Accordion.Indicator>
                            <IconChevronDown />
                          </Accordion.Indicator>
                        </Accordion.Trigger>
                      </Accordion.Heading>
                      <Accordion.Panel>
                        <Accordion.Body>{isExpanded}</Accordion.Body>
                      </Accordion.Panel>
                    </>
                  )}
                </Accordion.Item>
              ))}
            </Accordion>
          </>
        ) : (
          <h4 className={'text-center text-base mt-6'}>No Workouts for {WEEKDAY_NAMES[currentDay]}</h4>
        )}

        <Button
          className={'mx-auto'}
          onClick={openAddWorkoutModal}
          size={'sm'}
          variant={'secondary'}
        >
          <IconPlus size={20} />
          Add Workout
        </Button>
      </div>
    </Surface>
  );
};

export default DayWorkoutsView;
