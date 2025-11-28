import {ActionIcon, Text} from '@mantine/core';
import {IconTrash} from '@tabler/icons-react';

import {PlannedSet, WorkoutElement} from '@/services/training_plans';

import classes from './styles.module.css';

type ExerciseItemProps = {
    element: WorkoutElement;
    position: number;
    exerciseName?: string;
    onDelete: () => void;
    onClick?: () => void;
};

const formatSets = (sets: PlannedSet[]): string => {
    if (!sets || sets.length === 0) return 'No sets configured';

    const setCount = sets.length;
    const firstSet = sets[0];

    // Try to summarize the sets
    if (firstSet.reps_min !== null || firstSet.reps_max !== null) {
        const repsMin = firstSet.reps_min ?? firstSet.reps_max;
        const repsMax = firstSet.reps_max ?? firstSet.reps_min;

        if (repsMin === repsMax) {
            return `${setCount} × ${repsMin} reps`;
        }
        return `${setCount} × ${repsMin}-${repsMax} reps`;
    }

    return `${setCount} ${setCount === 1 ? 'set' : 'sets'}`;
};

const ExerciseItem = ({
    element,
    position,
    exerciseName = 'Unknown Exercise',
    onDelete,
    onClick,
}: ExerciseItemProps) => {
    const setsInfo = formatSets(element.sets || []);

    return (
        <div
            className={classes.exerciseItem}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.();
                }
            }}
            role="button"
            tabIndex={0}
        >
            {/* Position Number */}
            <div className={classes.exerciseItemPosition}>{position}</div>

            {/* Exercise Info */}
            <div className={classes.exerciseItemInfo}>
                <Text className={classes.exerciseName}>{exerciseName}</Text>
                <Text className={classes.exerciseSets}>{setsInfo}</Text>
                {element.notes && (
                    <Text className={classes.exerciseMuscle}>{element.notes}</Text>
                )}
            </div>

            {/* Delete Button */}
            <ActionIcon
                aria-label={`Remove ${exerciseName}`}
                className={classes.deleteButton}
                color="red"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                size="sm"
                variant="subtle"
            >
                <IconTrash size={14} />
            </ActionIcon>
        </div>
    );
};

export default ExerciseItem;
