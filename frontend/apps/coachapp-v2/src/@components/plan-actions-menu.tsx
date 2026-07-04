/**
 * PlanActionsMenu — archive / restore / edit / copy / delete dropdown shared by
 * the training and nutrition plan builders. Domain-specific mutations (status
 * update with optimistic patch, duplicate+navigate, delete+invalidate) come in
 * as callbacks; all toasts and the confirm-delete dialog live here.
 */
import {AlertDialog, Button, Dropdown, Header, Label, Separator, Spinner, toast, useOverlayState} from '@heroui/react';
import {ArchiveIcon, ArchiveRestoreIcon, Copy, MoreHorizontal, Pencil, TrashIcon} from 'lucide-react';
import type {ReactNode} from 'react';

import {toastMutationError} from '@/@components/mutation-toast';

type Props = {
  plan: {id: string; name: string; status?: string | null};
  pending: boolean;
  deleting: boolean;
  deleteBody: string;
  onEdit: () => void;
  onCopy: () => Promise<void>;
  onSetStatus: (status: 'active' | 'archived') => Promise<void>;
  onDelete: () => Promise<void>;
  onDeleted: () => void;
};

function ItemBody({icon, label}: {icon: ReactNode; label: string}) {
  return (
    <>
      <div className="flex items-start justify-center pt-px">{icon}</div>
      <div className="flex flex-col">
        <Label>{label}</Label>
      </div>
    </>
  );
}

export function PlanActionsMenu({
  plan,
  pending,
  deleting,
  deleteBody,
  onEdit,
  onCopy,
  onSetStatus,
  onDelete,
  onDeleted,
}: Props) {
  const deleteAlertState = useOverlayState();
  const blocking = deleteAlertState.isOpen || pending;

  const setStatus = (status: 'active' | 'archived', successMessage: string, failureMessage: string) =>
    onSetStatus(status)
      .then(() => toast.success(successMessage, {timeout: 1000}))
      .catch((e) => toastMutationError(e, failureMessage));

  const confirmDelete = () =>
    onDelete()
      .then(() => {
        toast.success('Plan deleted', {timeout: 1000});
        deleteAlertState.close();
        onDeleted();
      })
      .catch((e: {message?: string}) => {
        deleteAlertState.close();
        toast.danger("Couldn't delete plan", {timeout: 1500, description: e?.message});
      });

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
                setStatus('active', 'Plan restored', "Couldn't restore plan");
              } else if (key === 'archive-plan') {
                setStatus('archived', 'Plan archived', "Couldn't archive plan");
              } else if (key === 'edit-plan') {
                onEdit();
              } else if (key === 'copy-plan') {
                onCopy().catch((e) => toastMutationError(e, "Couldn't copy plan"));
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
                  <ItemBody
                    icon={<ArchiveRestoreIcon className="size-4 shrink-0 text-muted" />}
                    label="Restore"
                  />
                </Dropdown.Item>
              ) : null}

              <Dropdown.Item
                id="edit-plan"
                isDisabled={blocking}
                textValue="Edit details"
              >
                <ItemBody
                  icon={<Pencil className="size-4 shrink-0 text-muted" />}
                  label="Edit details"
                />
              </Dropdown.Item>

              {plan.status === 'active' ? (
                <Dropdown.Item
                  id="archive-plan"
                  isDisabled={blocking}
                  textValue="Archive"
                >
                  <ItemBody
                    icon={<ArchiveIcon className="size-4 shrink-0 text-muted" />}
                    label="Archive"
                  />
                </Dropdown.Item>
              ) : null}
            </Dropdown.Section>
            <Dropdown.Section>
              <Dropdown.Item
                id="copy-plan"
                isDisabled={blocking}
                textValue="Copy"
              >
                <ItemBody
                  icon={<Copy className="size-4 shrink-0 text-muted" />}
                  label="Copy"
                />
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
                <ItemBody
                  icon={<TrashIcon className="size-4 shrink-0 text-danger" />}
                  label="Delete"
                />
              </Dropdown.Item>
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <AlertDialog.Backdrop
        isDismissable={!deleting}
        isOpen={deleteAlertState.isOpen}
        onOpenChange={deleteAlertState.setOpen}
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
            <AlertDialog.Body>{deleteBody}</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={deleting}
                slot="close"
                variant="tertiary"
              >
                Cancel
              </Button>
              <Button
                className="relative"
                isPending={deleting}
                onPress={confirmDelete}
                variant="danger"
              >
                {/* RM-125: constant-width pending button — spinner overlays an
                    invisible copy of the label instead of swapping children */}
                <span className={deleting ? 'invisible' : undefined}>Delete plan</span>
                {deleting ? (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Spinner
                      color="current"
                      size="sm"
                    />
                    <span className="sr-only">Deleting</span>
                  </span>
                ) : null}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
