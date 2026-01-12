import {humanizeError} from '@easy/error-parser';
import {Button, Modal, Surface} from '@heroui/react';
import {useRef} from 'react';

import {TrainingPlanForm, TrainingPlanFormHandle} from '@/components/TrainingPlanForm';
import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {useCreateTrainingPlan} from '@/services/training_plans';
import {notifyError} from '@/utils/notification';

const TrainingPlanCreateDrawer = () => {
  const {closeDrawer, openDrawer, isDrawerOpen} = useParamsDrawer({});
  const trainingPlanFormRef = useRef<TrainingPlanFormHandle<'create'>>(null);
  const [createPlan, {isLoading}] = useCreateTrainingPlan();

  const handleSubmit = async () => {
    await trainingPlanFormRef.current?.submit();
  };

  return (
    <Modal>
      <Modal.Backdrop
        isDismissable
        isOpen={isDrawerOpen(DRAWER_KEYS.TRAINING_PLAN_CREATE)}
        onOpenChange={() => closeDrawer()}
      >
        <Modal.Container
          placement={'top'}
          scroll={'outside'}
          size={'lg'}
        >
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className={'text-xl font-semibold'}>Create Training Plan</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-1">
              <Surface variant="default">
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
              </Surface>
            </Modal.Body>
            <Modal.Footer>
              <Button
                slot="close"
                variant="secondary"
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Save</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default TrainingPlanCreateDrawer;
