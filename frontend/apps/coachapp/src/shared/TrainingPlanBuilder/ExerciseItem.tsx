import {ActionIcon, Text} from '@mantine/core';
import {TrashIcon} from '@phosphor-icons/react';

import {PlannedSet, WorkoutElement} from '@/services/training_plans';

import classes from './styles.module.css';

type ExerciseItemProps = {
    element: WorkoutElement;
    position: number;
    exerciseName?: string;
    onDelete: () => void;
    onClick?: () => void;
};

/**
 * Format sets for display using the new schema.
 * Parses target_reps string (e.g., "10", "8-12", "AMRAP") for display.
 */
const formatSets = (sets: PlannedSet[]): string => {
    if (!sets || sets.length === 0) return 'No sets configured';

    const setCount = sets.length;
    const firstSet = sets[0];

    // Early return if firstSet is somehow undefined
    if (!firstSet) return `${setCount} ${setCount === 1 ? 'set' : 'sets'}`;

    // Display based on target_reps
    if (firstSet.target_reps) {
        const reps = firstSet.target_reps;

        // Check for special formats
        if (reps.toUpperCase() === 'AMRAP') {
            return `${setCount} × AMRAP`;
        }
        if (reps.toUpperCase() === 'MAX' || reps.toUpperCase() === 'FAILURE') {
            return `${setCount} × ${reps}`;
        }

        return `${setCount} × ${reps} reps`;
    }

    // Fallback for duration-based sets
    if (firstSet.duration_seconds) {
        const duration = firstSet.duration_seconds;
        if (duration >= 60) {
            return `${setCount} × ${Math.floor(duration / 60)}min`;
        }
        return `${setCount} × ${duration}s`;
    }

    // Fallback for distance-based sets
    if (firstSet.distance_value) {
        const unit = firstSet.distance_unit !== 'none' ? firstSet.distance_unit : 'm';
        return `${setCount} × ${firstSet.distance_value}${unit}`;
    }

    return `${setCount} ${setCount === 1 ? 'set' : 'sets'}`;
};

const ExerciseItem = ({element, position, exerciseName = 'Unknown Exercise', onDelete, onClick}: ExerciseItemProps) => {
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
                {element.notes && <Text className={classes.exerciseMuscle}>{element.notes}</Text>}
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
                <TrashIcon size={14} />
            </ActionIcon>
        </div>
    );
};

export default ExerciseItem;
