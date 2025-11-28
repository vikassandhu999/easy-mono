import {humanizeError} from '@easy/error-parser';
import {Button, Stack, Text} from '@mantine/core';
import {useRef} from 'react';

import {DRAWER_KEYS} from '@/configs/drawer';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {isSystemExercise, useGetExercise, useUpdateExercise} from '@/services/exercises';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import {ExerciseForm, ExerciseFormHandle} from '@/shared/ExerciseForm';
import {notifyError, notifySuccess} from '@/utils/notification';

const ExerciseEditDrawer = () => {
    const {closeDrawer, openDrawer, getDrawerParams} = useParamsDrawer({});
    const exerciseFormRef = useRef<ExerciseFormHandle<'update'>>(null);
    const [updateExercise, {isLoading}] = useUpdateExercise();

    const params = getDrawerParams();
    const exerciseId = params.exercise_id;

    // Fetch exercise to check if it's a system exercise
    const {data: exercise, isLoading: isLoadingExercise} = useGetExercise(exerciseId ?? '', {
        skip: !exerciseId,
    });

    if (!exerciseId) {
        return null;
    }

    const handleSubmit = async () => {
        await exerciseFormRef.current?.submit();
    };

    // If this is a system exercise, show a message and redirect to view
    if (exercise && isSystemExercise(exercise)) {
        return (
            <AutoDrawer
                actions={
                    <Button
                        color="blue"
                        fullWidth
                        onClick={() => {
                            openDrawer(DRAWER_KEYS.EXERCISE_VIEW, {
                                exercise_id: exerciseId,
                            });
                        }}
                        radius="xl"
                        size="sm"
                        variant="light"
                    >
                        View Exercise
                    </Button>
                }
                content={
                    <Stack
                        align="center"
                        gap="md"
                        p="xl"
                    >
                        <Text
                            fw={500}
                            size="lg"
                        >
                            Cannot Edit System Exercise
                        </Text>
                        <Text
                            c="dimmed"
                            size="sm"
                            ta="center"
                        >
                            System exercises are read-only. You can duplicate this exercise to create your own
                            customizable copy.
                        </Text>
                    </Stack>
                }
                onClose={closeDrawer}
                title="Edit Exercise"
            />
        );
    }

    return (
        <AutoDrawer
            actions={
                <Button
                    color="green"
                    fullWidth
                    loading={isLoading || isLoadingExercise}
                    onClick={handleSubmit}
                    radius="xl"
                    size="sm"
                    variant="light"
                >
                    Save
                </Button>
            }
            content={
                <ExerciseForm
                    exerciseId={exerciseId}
                    onSubmit={async (values) => {
                        try {
                            await updateExercise(values).unwrap();

                            notifySuccess('Exercise updated successfully');

                            closeDrawer();
                        } catch (error) {
                            const errMsg = humanizeError(error);
                            notifyError(errMsg);
                        }
                    }}
                    ref={exerciseFormRef}
                />
            }
            onClose={closeDrawer}
            title="Edit Exercise"
        />
    );
};

export default ExerciseEditDrawer;
