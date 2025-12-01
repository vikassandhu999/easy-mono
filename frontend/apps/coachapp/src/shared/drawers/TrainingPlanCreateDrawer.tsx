import { humanizeError } from "@easy/error-parser";
import { Button } from "@mantine/core";
import { useRef } from "react";

import { DRAWER_KEYS } from "@/configs";
import useParamsDrawer from "@/hooks/useParamDrawer";
import { useCreateTrainingPlan } from "@/services/training_plans";
import AutoDrawer from "@/shared/AutoDrawer/AutoDrawer";
import {
  TrainingPlanForm,
  TrainingPlanFormHandle,
} from "@/shared/TrainingPlanForm";
import { notifyError, notifySuccess } from "@/utils/notification";

const TrainingPlanCreateDrawer = () => {
  const { closeDrawer, openDrawer } = useParamsDrawer({});
  const trainingPlanFormRef = useRef<TrainingPlanFormHandle<"create">>(null);
  const [createPlan, { isLoading }] = useCreateTrainingPlan();

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
              const createdPlan = await createPlan(values).unwrap();
              // Navigate to the builder to add workouts and exercises
              openDrawer(DRAWER_KEYS.TRAINING_PLAN_BUILDER, {
                training_plan_id: createdPlan.id,
              });
            } catch (error) {
              const errMsg = humanizeError(error);
              notifyError(errMsg);
            }
          }}
          ref={trainingPlanFormRef}
        />
      }
      onClose={closeDrawer}
      title="Create Training Plan"
    />
  );
};

export default TrainingPlanCreateDrawer;
