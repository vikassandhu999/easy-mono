/**
 * NutritionPlanActions — archive / restore / delete dropdown for a nutrition plan.
 *
 * Mirrors training plan-builder/plan-actions.tsx but uses the generated
 * `useUpdateNutritionPlanMutation` and `useDeleteNutritionPlanMutation` hooks.
 */
import {Button, Dropdown, Header, Label, Separator, toast, useOverlayState} from '@heroui/react';
import {ArchiveIcon, ArchiveRestoreIcon, Copy, MoreHorizontal, Pencil, TrashIcon} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import type {NutritionPlan} from '@/api/generated';
import {useDuplicateNutritionPlanMutation, useUpdateNutritionPlanMutation} from '@/api/generated';

import NutritionPlanDeleteAlertDialog from './plan-delete-alert-dialog';

export type Props = {
  plan: NutritionPlan;
  onDeleted: () => void;
};

export function NutritionPlanActions({plan, onDeleted}: Props) {
  const navigate = useNavigate();
  const [updatePlan, {isLoading: updating}] = useUpdateNutritionPlanMutation();
  const [duplicatePlan, {isLoading: duplicating}] = useDuplicateNutritionPlanMutation();
  const deleteAlertState = useOverlayState();

  // Edit details = the full metadata form (name + description). The builder's inline
  // header autosaves the name; this is the only surface for description.
  const editDetails = () => navigate(ROUTES.EDIT_NUTRITION_PLAN.replace(':id', plan.id));

  const copy = async () => {
    const result = await duplicatePlan({id: plan.id}).unwrap();
    toast.success('Plan copied', {timeout: 1000});
    navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', result.data.id));
  };

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

  const blocking = deleteAlertState.isOpen || updating || duplicating;

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
          <Dropdown.Menu
            onAction={(key) => {
              // Drive selection via the menu so it fires on pointer AND keyboard
              // activation (RAC routes Enter/Space through onAction, not onPress).
              if (key === 'restore-plan') {
                restore().catch(() => undefined);
              } else if (key === 'archive-plan') {
                archive().catch(() => undefined);
              } else if (key === 'edit-plan') {
                editDetails();
              } else if (key === 'copy-plan') {
                copy().catch(() => toast.danger("Couldn't copy plan"));
              } else if (key === 'delete-plan') {
                deleteAlertState.open();
              }
            }}
          >
            <Dropdown.Section>
              <Header>Actions</Header>

              {plan.status === 'archived' ? (
                <Dropdown.Item
                  id="restore-plan"
                  isDisabled={blocking}
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

              <Dropdown.Item
                id="edit-plan"
                isDisabled={blocking}
                textValue="Edit details"
              >
                <div className="flex items-start justify-center pt-px">
                  <Pencil className="size-4 shrink-0 text-muted" />
                </div>
                <div className="flex flex-col">
                  <Label>Edit details</Label>
                </div>
              </Dropdown.Item>

              {plan.status === 'active' ? (
                <Dropdown.Item
                  id="archive-plan"
                  isDisabled={blocking}
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
            <Separator />
            <Dropdown.Section>
              <Dropdown.Item
                id="delete-plan"
                isDisabled={blocking}
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
