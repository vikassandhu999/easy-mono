import {humanizeError} from '@easy/error-parser';
import {Button} from '@mantine/core';
import {useRef} from 'react';

import useParamsDrawer from '@/hooks/useParamDrawer';
import {useUpdateTrainingPlan} from '@/services/training_plans';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import {TrainingPlanForm, TrainingPlanFormHandle} from '@/components/TrainingPlanForm';
import {notifyError} from '@/utils/notification';

const TrainingPlanEditDrawer = () => {
  const {closeDrawer, getDrawerParams} = useParamsDrawer({});
  const {training_plan_id} = getDrawerParams();
  const planId = training_plan_id;
  const trainingPlanFormRef = useRef<TrainingPlanFormHandle<'update'>>(null);
  const [updatePlan, {isLoading}] = useUpdateTrainingPlan();

  const handleSubmit = async () => {
    await trainingPlanFormRef.current?.submit();
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
        <TrainingPlanForm
          onSubmit={async (values) => {
            try {
              await updatePlan(values).unwrap();
              closeDrawer();
            } catch (error) {
              const errMsg = humanizeError(error);
              notifyError(errMsg);
            }
          }}
          planId={planId}
          ref={trainingPlanFormRef}
        />
      }
      onClose={closeDrawer}
      title="Edit Training Plan"
    />
  );
};

export default TrainingPlanEditDrawer;
