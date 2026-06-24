import {Button, Dropdown, Header, Label, Separator, toast, useOverlayState} from '@heroui/react';
import {ArchiveIcon, ArchiveRestoreIcon, Copy, MoreHorizontal, Pencil, TrashIcon} from 'lucide-react';
import {useDispatch} from 'react-redux';

import {api} from '@/api/base';
import {TrainingPlan, useUpdateTrainingPlanMutation} from '@/api/generated';

import PlanDeleteAlertDialog from './plan-delete-alert-dialog';

export type Props = {
  plan: TrainingPlan;
  onDeleted: () => void;
};

export function PlanActions({plan, onDeleted}: Props) {
  const dispatch = useDispatch();
  const [updatePlan, {isLoading: updating}] = useUpdateTrainingPlanMutation();

  // Generated endpoints are tag:false, so optimistically patch the cached plan
  // status and roll back on failure.
  const setStatus = async (status: 'active' | 'archived', successMessage: string) => {
    const patch = dispatch(
      api.util.updateQueryData('getTrainingPlan', {id: plan.id}, (draft) => {
        draft.data.status = status;
      }),
    );
    try {
      await updatePlan({id: plan.id, trainingPlanUpdateRequest: {status}}).unwrap();
      toast.success(successMessage, {timeout: 1000});
    } catch (e) {
      patch.undo();
      throw e;
    }
  };
  const archive = () => setStatus('archived', 'Plan archived');
  const restore = () => setStatus('active', 'Plan restored');

  const deleteAlertState = useOverlayState();

  const blocking = deleteAlertState.isOpen || updating;

  return (
    <>
      <Dropdown>
        <Button
          aria-label="Menu"
          isIconOnly
          isPending={blocking}
          size={'sm'}
          variant="secondary"
        >
          <MoreHorizontal size={18} />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={(key) => console.log(`Selected: ${key}`)}>
            <Dropdown.Section>
              <Header>Actions</Header>

              {plan.status === 'archived' ? (
                <Dropdown.Item
                  id="restore-plan"
                  isDisabled={blocking}
                  onPress={restore}
                  textValue="Restore "
                >
                  <div className="flex items-start justify-center pt-px">
                    <ArchiveRestoreIcon className="size-4 shrink-0 text-muted" />
                  </div>
                  <div className="flex flex-col">
                    <Label>Restore plan</Label>
                  </div>
                </Dropdown.Item>
              ) : null}

              <Dropdown.Item
                id="edit-plan"
                isDisabled={blocking}
                textValue="Edit"
              >
                <div className="flex items-start justify-center pt-px">
                  <Pencil className="size-4 shrink-0 text-muted" />
                </div>
                <div className="flex flex-col">
                  <Label>Edit</Label>
                </div>
              </Dropdown.Item>
            </Dropdown.Section>
            <Dropdown.Section>
              <Dropdown.Item
                id="copy-plan"
                isDisabled={blocking}
                textValue="Copy"
              >
                <div className="flex items-start justify-center pt-px">
                  <Copy className="size-4 shrink-0 text-muted" />
                </div>
                <div className="flex flex-col">
                  <Label>Copy</Label>
                </div>
              </Dropdown.Item>
            </Dropdown.Section>
            {plan.status === 'active' ? (
              <Dropdown.Item
                id="archive-plan"
                isDisabled={blocking}
                onPress={archive}
                textValue="Archive"
              >
                <div className="flex items-start justify-center pt-px">
                  <ArchiveIcon className="size-4 shrink-0 text-muted" />
                </div>
                <div className="flex flex-col">
                  <Label>Archive</Label>
                </div>
              </Dropdown.Item>
            ) : null}
            <Separator />
            <Dropdown.Section>
              <Dropdown.Item
                id="delete-plan"
                isDisabled={blocking}
                onPress={() => deleteAlertState.open()}
                textValue="Delete"
                variant="danger"
              >
                <div className="flex items-start justify-center pt-px">
                  <TrashIcon className="size-4 shrink-0 text-danger" />
                </div>
                <div className="flex flex-col">
                  <Label>Delete</Label>
                </div>
              </Dropdown.Item>
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      <PlanDeleteAlertDialog
        onSuccess={onDeleted}
        plan={plan}
        state={deleteAlertState}
      />
    </>
  );
}
