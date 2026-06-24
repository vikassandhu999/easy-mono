import {AlertDialog, Button, Spinner, toast, UseOverlayStateReturn} from '@heroui/react';

import {TrainingPlan, useDeleteTrainingPlanMutation} from '@/api/generated';

type Props = {
  plan: Pick<TrainingPlan, 'id' | 'name'>;
  state: UseOverlayStateReturn;
  onSuccess: () => void;
};

export default function PlanDeleteAlertDialog({plan, state, onSuccess}: Props) {
  const [deletePlan, {isLoading: deleting}] = useDeleteTrainingPlanMutation();
  const deleteFn = async () => {
    return deletePlan({id: plan.id})
      .unwrap()
      .then(() => {
        toast.success('Plan deleted', {timeout: 1000});
        state.close();
        onSuccess();
      })
      .catch((e) => {
        state.close();
        toast.danger('Plan deleted failed', {timeout: 1500, description: e?.message});
      });
  };
  return (
    <AlertDialog.Backdrop
      isDismissable={!deleting}
      isOpen={state.isOpen}
      onOpenChange={state.setOpen}
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-[400px]">
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger" />
            <AlertDialog.Heading>
              Delete plan: <strong>{plan.name}</strong>
            </AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>Are you sure you want to delete the training plan permanently?</AlertDialog.Body>
          <AlertDialog.Footer>
            <Button
              isDisabled={deleting}
              slot="close"
              variant="tertiary"
            >
              Cancel
            </Button>
            <Button
              isPending={deleting}
              onPress={deleteFn}
              variant="danger"
            >
              {deleting ? (
                <>
                  <Spinner
                    color="current"
                    size="sm"
                  />
                  Deleting...
                </>
              ) : (
                'Delete Plan'
              )}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
