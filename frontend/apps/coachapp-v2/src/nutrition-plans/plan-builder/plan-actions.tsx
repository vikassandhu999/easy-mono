/**
 * NutritionPlanActions — archive / restore / delete dropdown for a nutrition plan.
 *
 * Mirrors training plan-builder/plan-actions.tsx but uses the generated
 * `useUpdateNutritionPlanMutation` and `useDeleteNutritionPlanMutation` hooks.
 */
import {Button, Dropdown, Header, Label, Separator, toast, useOverlayState} from '@heroui/react';
import {ArchiveIcon, ArchiveRestoreIcon, MoreHorizontal, TrashIcon} from 'lucide-react';

import type {NutritionPlan} from '@/api/generated';
import {useDeleteNutritionPlanMutation, useUpdateNutritionPlanMutation} from '@/api/generated';

import NutritionPlanDeleteAlertDialog from './plan-delete-alert-dialog';

export type Props = {
  plan: NutritionPlan;
  onDeleted: () => void;
};

export function NutritionPlanActions({plan, onDeleted}: Props) {
  const [updatePlan, {isLoading: updating}] = useUpdateNutritionPlanMutation();
  const deleteAlertState = useOverlayState();

  const archive = async () => {
    await updatePlan({
      id: plan.id,
      nutritionPlanRequest: {name: plan.name, status: 'archived'},
    })
      .unwrap()
      .then(() => {
        toast.success('Plan archived', {timeout: 1000});
      });
  };

  const restore = async () => {
    await updatePlan({
      id: plan.id,
      nutritionPlanRequest: {name: plan.name, status: 'active'},
    })
      .unwrap()
      .then(() => {
        toast.success('Plan restored', {timeout: 1000});
      });
  };

  const blocking = deleteAlertState.isOpen || updating;

  return (
    <>
      <Dropdown>
        <Button
          aria-label="Menu"
          isIconOnly
          isPending={blocking}
          size="sm"
          variant="secondary"
        >
          <MoreHorizontal size={18} />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu>
            <Dropdown.Section>
              <Header>Actions</Header>

              {plan.status === 'archived' ? (
                <Dropdown.Item
                  id="restore-plan"
                  isDisabled={blocking}
                  onPress={restore}
                  textValue="Restore"
                >
                  <div className="flex items-start justify-center pt-px">
                    <ArchiveRestoreIcon className="size-4 shrink-0 text-muted" />
                  </div>
                  <div className="flex flex-col">
                    <Label>Restore plan</Label>
                  </div>
                </Dropdown.Item>
              ) : null}

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
            </Dropdown.Section>
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
      <NutritionPlanDeleteAlertDialog
        onSuccess={onDeleted}
        plan={plan}
        state={deleteAlertState}
      />
    </>
  );
}
