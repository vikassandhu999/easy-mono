import {humanizeError} from '@easy/error-parser';
import {Button, Modal, Surface} from '@heroui/react';
import {useDisclosure} from '@mantine/hooks';
import {IconCopy, IconPencil, IconTrash} from '@tabler/icons-react';
import {useSearchParams} from 'react-router';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import useScreenSize from '@/hooks/useScreenSize';
import {useDeleteTrainingPlan, useDuplicateTrainingPlan, useGetTrainingPlan} from '@/services/training_plans';
import TrainingPlanBuilder from '@/shared/TrainingPlanBuilder/TrainingPlanBuilder';
import {notifyError} from '@/utils/notification';

export default function TrainingPlanBuildDrawer() {
  const {openDrawer, closeDrawer} = useParamsDrawer({});
  const [searchParams] = useSearchParams();
  const {isMobile} = useScreenSize();
  const [deleteModalOpened, {close: closeDeleteModal}] = useDisclosure(false);
  const [deleteTrainingPlan] = useDeleteTrainingPlan();
  const [duplicateTrainingPlan, {isLoading: isDuplicating}] = useDuplicateTrainingPlan();

  const trainingPlanId = searchParams.get('training_plan_id') ?? '';

  const {data: plan} = useGetTrainingPlan(trainingPlanId, {
    skip: !trainingPlanId,
  });

  const planNameTitle = plan?.name ? plan.name : 'Build Training Plan';

  const handleEdit = () => {
    if (trainingPlanId) {
      openDrawer(DRAWER_KEYS.TRAINING_PLAN_EDIT, {
        training_plan_id: trainingPlanId,
      });
    }
  };

  const handleDelete = async () => {
    if (!trainingPlanId) return;

    try {
      await deleteTrainingPlan(trainingPlanId).unwrap();
      closeDeleteModal();
      closeDrawer();
    } catch (error) {
      const errMsg = humanizeError(error);
      notifyError(errMsg);
    }
  };

  const handleDuplicate = async () => {
    if (!trainingPlanId || isDuplicating) return;

    try {
      const duplicatedPlan = await duplicateTrainingPlan(trainingPlanId).unwrap();
      // Open the duplicated plan in the builder
      openDrawer(DRAWER_KEYS.TRAINING_PLAN_BUILDER, {
        training_plan_id: duplicatedPlan.id,
      });
    } catch (error) {
      const errMsg = humanizeError(error);
      notifyError(errMsg);
    }
  };

  return (
    <>
      <Modal>
        <Modal.Backdrop
          isDismissable
          isOpen
          onOpenChange={() => closeDrawer()}
        >
          <Modal.Container
            placement={'top'}
            size={'lg'}
          >
            <Modal.Dialog>
              <Modal.Header className={'border-b border-gray-200'}>
                <Modal.CloseTrigger />
                <Modal.Heading className={'text-base font-semibold mt-4'}>{planNameTitle}</Modal.Heading>
                <div className={'flex items-center justify-end gap-1.5 mb-3'}>
                  <Button
                    className={'h-8'}
                    onClick={handleEdit}
                    size={'sm'}
                    variant={'tertiary'}
                  >
                    <IconPencil />
                    Edit
                  </Button>
                  <Button
                    className={'h-8'}
                    isIconOnly
                    onClick={handleDuplicate}
                    size={'sm'}
                    variant={'tertiary'}
                  >
                    <IconCopy />
                  </Button>
                  <Button
                    className={'h-8'}
                    isIconOnly
                    onClick={handleDelete}
                    size={'sm'}
                    variant={'danger-soft'}
                  >
                    <IconTrash />
                  </Button>
                </div>
              </Modal.Header>
              <Modal.Body>
                <Surface variant="default">
                  <TrainingPlanBuilder />
                </Surface>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* <Modal
        centered
        onClose={closeDeleteModal}
        opened={deleteModalOpened}
        title="Delete Training Plan"
      >
        <div>
          <p>Are you sure you want to delete this training plan?</p>
          <p style={{color: 'var(--mantine-color-dimmed)', fontSize: '14px'}}>
            This action cannot be undone. All phases, workouts, and exercises in this plan will be permanently removed.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '20px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={closeDeleteModal}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--mantine-color-gray-4)',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              disabled={isDeleting}
              onClick={handleDelete}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '8px',
                background: 'var(--mantine-color-red-6)',
                color: 'white',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                opacity: isDeleting ? 0.6 : 1,
              }}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal> */}
    </>
  );
}
