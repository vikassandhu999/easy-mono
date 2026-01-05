import {ActionIcon, Text} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {IconBarbell, IconChevronDown, IconPlus} from '@tabler/icons-react';

import {PlannedWorkout, WorkoutElement} from '@/services/training_plans';

import ExerciseItem from './ExerciseItem';
import classes from './styles.module.css';

type WorkoutCardProps = {
  workout: PlannedWorkout;
  exerciseNames?: Record<string, string>; // Map of exercise_id -> name
  onAddExercise: (workoutId: string) => void;
  onDeleteExercise: (workoutId: string, elementId: string) => void;
  onExerciseClick?: (workoutId: string, element: WorkoutElement) => void;
  defaultExpanded?: boolean;
};

const WorkoutCard = ({
  workout,
  exerciseNames = {},
  onAddExercise,
  onDeleteExercise,
  onExerciseClick,
  defaultExpanded = false,
}: WorkoutCardProps) => {
  const [isOpen, {toggle}] = useDisclosure(defaultExpanded);
  const elementCount = workout.elements?.length ?? 0;
  const hasElements = elementCount > 0;

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddExercise(workout.id);
  };

  // Sort elements by position
  const sortedElements = [...(workout.elements || [])].sort((a, b) => a.position - b.position);

  // Group elements by superset_group_id
  const groupedElements: {groupId: null | string; elements: WorkoutElement[]}[] = [];
  let currentGroup: null | {groupId: null | string; elements: WorkoutElement[]} = null;

  sortedElements.forEach((element) => {
    const groupId = element.superset_group_id;

    if (groupId) {
      // Element is part of a superset
      if (currentGroup && currentGroup.groupId === groupId) {
        currentGroup.elements.push(element);
      } else {
        if (currentGroup) {
          groupedElements.push(currentGroup);
        }
        currentGroup = {groupId, elements: [element]};
      }
    } else {
      // Element is not part of a superset
      if (currentGroup) {
        groupedElements.push(currentGroup);
        currentGroup = null;
      }
      groupedElements.push({groupId: null, elements: [element]});
    }
  });

  if (currentGroup) {
    groupedElements.push(currentGroup);
  }

  return (
    <div className={classes.workoutSection}>
      {/* Clickable Header */}
      <div
        aria-expanded={isOpen}
        className={classes.workoutSectionHeader}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        role="button"
        tabIndex={0}
      >
        {/* Left: Icon + Title + Count */}
        <div className={classes.workoutSectionInfo}>
          <div className={classes.workoutIcon}>
            <IconBarbell size={20} />
          </div>
          <div className={classes.workoutTitleGroup}>
            <Text className={classes.workoutTitle}>{workout.name}</Text>
            {!isOpen && hasElements && (
              <Text className={classes.workoutSubtitle}>
                {elementCount} {elementCount === 1 ? 'exercise' : 'exercises'}
              </Text>
            )}
            {workout.notes && isOpen && <Text className={classes.workoutSubtitle}>{workout.notes}</Text>}
          </div>
        </div>

        {/* Right: Actions */}
        <div className={classes.workoutSectionActions}>
          {hasElements && <span className={classes.itemCountActive}>{elementCount}</span>}
          <ActionIcon
            aria-label={`Add exercise to ${workout.name}`}
            className={classes.addButton}
            color="brand"
            onClick={handleAddClick}
            radius="md"
            size="sm"
            variant="light"
          >
            <IconPlus size={16} />
          </ActionIcon>
          <IconChevronDown
            className={isOpen ? classes.chevronIconOpen : classes.chevronIcon}
            size={18}
          />
        </div>
      </div>

      {/* Collapsible Body */}
      <div className={isOpen ? classes.workoutSectionBodyOpen : classes.workoutSectionBody}>
        <div className={classes.workoutSectionBodyInner}>
          {hasElements ? (
            <div className={classes.exercisesList}>
              {groupedElements.map((group) => {
                if (group.groupId && group.elements.length > 1) {
                  // Render as superset
                  return (
                    <div
                      className={classes.supersetGroup}
                      key={group.groupId}
                    >
                      <Text className={classes.supersetLabel}>Superset</Text>
                      {group.elements.map((element) => (
                        <ExerciseItem
                          element={element}
                          exerciseName={exerciseNames[element.exercise_id]}
                          key={element.id}
                          onClick={() => onExerciseClick?.(workout.id, element)}
                          onDelete={() => onDeleteExercise(workout.id, element.id)}
                          position={sortedElements.findIndex((e) => e.id === element.id) + 1}
                        />
                      ))}
                    </div>
                  );
                }

                // Render as individual exercise(s)
                return group.elements.map((element) => (
                  <ExerciseItem
                    element={element}
                    exerciseName={exerciseNames[element.exercise_id]}
                    key={element.id}
                    onClick={() => onExerciseClick?.(workout.id, element)}
                    onDelete={() => onDeleteExercise(workout.id, element.id)}
                    position={sortedElements.findIndex((e) => e.id === element.id) + 1}
                  />
                ));
              })}
            </div>
          ) : (
            <div className={classes.emptyState}>
              <Text className={classes.emptyStateText}>Tap + to add exercises</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkoutCard;
