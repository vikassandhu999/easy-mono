/**
 * NutritionPlanDeleteAlertDialog — confirm-before-delete modal.
 *
 * Mirrors training plan-builder/plan-delete-alert-dialog.tsx but uses the
 * generated `useDeleteNutritionPlanMutation` hook.
 */
import {AlertDialog, Button, Spinner, toast, type UseOverlayStateReturn} from '@heroui/react';

import type {NutritionPlan} from '@/api/generated';
import {coachApi, useDeleteNutritionPlanMutation} from '@/api/generated';
import {useAppDispatch} from '@/store';

type Props = {
  plan: Pick<NutritionPlan, 'id' | 'name'>;
  state: UseOverlayStateReturn;
  onSuccess: () => void;
};

export default function NutritionPlanDeleteAlertDialog({plan, state, onSuccess}: Props) {
  const dispatch = useAppDispatch();
  const [deletePlan, {isLoading: deleting}] = useDeleteNutritionPlanMutation();

  const deleteFn = async () => {
    return deletePlan({id: plan.id})
      .unwrap()
      .then(() => {
        toast.success('Plan deleted', {timeout: 1000});
        // Generated mutation is tag:false — refresh the plan list.
        dispatch(coachApi.util.invalidateTags([{type: 'NutritionPlan', id: 'LIST'}]));
        state.close();
        onSuccess();
      })
      .catch((e: {message?: string}) => {
        state.close();
        toast.danger('Plan deletion failed', {timeout: 1500, description: e?.message});
      });
  };

  return (
    <AlertDialog.Backdrop
      isDismissable={!deleting}
      isOpen={state.isOpen}
      onOpenChange={state.setOpen}
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-100">
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger" />
            <AlertDialog.Heading>
              Delete plan: <strong>{plan.name}</strong>
            </AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>Are you sure you want to delete this nutrition plan permanently?</AlertDialog.Body>
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
