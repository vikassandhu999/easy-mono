import {humanizeError} from '@easy/error-parser';
import {Button} from '@mantine/core';
import {useRef} from 'react';

import {DRAWER_KEYS} from '@/configs/drawer';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {useCreateExercise} from '@/services/exercises';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import {ExerciseForm, ExerciseFormHandle} from '@/shared/ExerciseForm';
import {notifyError} from '@/utils/notification';

const ExerciseCreateDrawer = () => {
  const {closeDrawer, openDrawer} = useParamsDrawer({});
  const exerciseFormRef = useRef<ExerciseFormHandle<'create'>>(null);
  const [createExercise, {isLoading}] = useCreateExercise();

  const handleSubmit = async () => {
    await exerciseFormRef.current?.submit();
  };

  return (
    <AutoDrawer
      actions={
        <Button
          color="green"
          fullWidth
          loading={isLoading}
          onClick={handleSubmit}
          radius="xl"
          size="sm"
          variant="solid"
        >
          Save
        </Button>
      }
      content={
        <ExerciseForm
          onSubmit={async (values) => {
            try {
              const exercise = await createExercise(values).unwrap();

              closeDrawer();
              openDrawer(DRAWER_KEYS.EXERCISE_VIEW, {
                exercise_id: exercise.id,
              });
            } catch (error) {
              const errMsg = humanizeError(error);
              notifyError(errMsg);
            }
          }}
          ref={exerciseFormRef}
        />
      }
      onClose={closeDrawer}
      title="Create Exercise"
    />
  );
};

export default ExerciseCreateDrawer;
