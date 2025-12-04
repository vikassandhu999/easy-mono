import {Button} from '@mantine/core';
import {FC, useRef} from 'react';

import {Exercise} from '@/services/exercises';
import AutoDrawer from '@/shared/AutoDrawer';

import ExerciseSelect from './ExerciseSelect';

interface ExerciseSelectDrawerProps {
    multiple?: boolean;
    onClose: () => void;
    onComplete?: (selectedIds: string[], selectedExercises?: Exercise[]) => void;
}

const ExerciseSelectDrawer: FC<ExerciseSelectDrawerProps> = ({multiple = true, onClose, onComplete}) => {
    const exerciseSelectRef = useRef<{handleSave: () => void}>(null);

    const handleComplete = (selectedIds: string[], selectedExercises?: Exercise[]) => {
        onComplete?.(selectedIds, selectedExercises);
        onClose();
    };

    const handleSelectClick = () => {
        if (multiple) {
            exerciseSelectRef.current?.handleSave();
        }
    };

    return (
        <AutoDrawer
            actions={
                multiple ? (
                    <Button
                        onClick={handleSelectClick}
                        radius="lg"
                        size="sm"
                    >
                        Select
                    </Button>
                ) : null
            }
            content={
                <ExerciseSelect
                    multiple={multiple}
                    onComplete={handleComplete}
                />
            }
            onClose={onClose}
            title={`Select Exercise${multiple ? 's' : ''}`}
        />
    );
};

export default ExerciseSelectDrawer;
