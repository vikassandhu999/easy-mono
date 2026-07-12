/**
 * TemplateCard — Builder hub/section card for any library type. Card body
 * click opens the item; the "⋯" menu carries Favourite plus whichever of
 * Duplicate/Delete the type's API supports (absent callback = hidden item).
 */
import {AlertDialog, Button, Dropdown, Label, Separator, Spinner, toast, useOverlayState} from '@heroui/react';
import {Copy, MoreHorizontal, Star, TrashIcon} from 'lucide-react';
import {type ReactNode, useState} from 'react';

import {toastMutationError} from '@/@components/mutation-toast';
import {timeAgo} from '@/domain/time';
import type {BuilderItem} from '@/library/lib/builder-items';
import type {BuilderType} from '@/library/lib/builder-types';

interface TemplateCardProps {
  isFav: boolean;
  item: BuilderItem;
  onDelete?: () => Promise<void>;
  onDuplicate?: () => Promise<void>;
  onOpen: () => void;
  onToggleFav: () => void;
  type: BuilderType;
}

function ItemBody({icon, label}: {icon: ReactNode; label: string}) {
  return (
    <>
      <div className="flex items-start justify-center pt-px">{icon}</div>
      <Label>{label}</Label>
    </>
  );
}

export default function TemplateCard({
  isFav,
  item,
  onDelete,
  onDuplicate,
  onOpen,
  onToggleFav,
  type,
}: TemplateCardProps) {
  const deleteAlertState = useOverlayState();
  const [pending, setPending] = useState(false);

  const duplicate = async () => {
    if (!onDuplicate) {
      return;
    }
    setPending(true);
    try {
      await onDuplicate();
      toast.success('Duplicated', {timeout: 1000});
    } catch (e) {
      toastMutationError(e, `Couldn't duplicate ${type.label.toLowerCase()}`);
    } finally {
      setPending(false);
    }
  };

  const confirmDelete = async () => {
    if (!onDelete) {
      return;
    }
    setPending(true);
    try {
      await onDelete();
      toast.success('Deleted', {timeout: 1000});
      deleteAlertState.close();
    } catch (e) {
      deleteAlertState.close();
      toastMutationError(e, `Couldn't delete ${type.label.toLowerCase()}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="group relative rounded-[18px] border border-separator bg-surface transition-all hover:-translate-y-0.5 hover:border-edge hover:shadow-[0_18px_36px_-20px_rgba(24,24,27,0.4)]">
      <button
        className="block w-full cursor-pointer p-[13px] pr-11 text-left sm:px-[18px] sm:py-[17px]"
        onClick={onOpen}
        type="button"
      >
        <div className="flex items-center gap-3.5">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-[13px] sm:size-[46px] ${type.bg}`}
          >
            <type.icon
              className={type.fg}
              size={22}
              strokeWidth={1.9}
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-grotesk text-base font-bold tracking-[-0.01em]">{item.name}</div>
            <div className="mt-1 truncate text-[13px] text-muted">{item.meta}</div>
          </div>
        </div>
        {item.updatedAt ? (
          <div className="mt-[15px] hidden items-center gap-2 border-t border-surface-secondary pt-3.5 text-xs text-muted sm:flex">
            Updated {timeAgo(item.updatedAt)} ago
          </div>
        ) : null}
      </button>

      {isFav ? (
        <Star
          aria-label="Favourite"
          className="absolute top-[17px] right-12 text-star"
          fill="currentColor"
          size={16}
        />
      ) : null}

      <div className="absolute top-[13px] right-2.5 sm:top-[15px] sm:right-3.5">
        <Dropdown>
          <Button
            aria-label={`Actions for ${item.name}`}
            className="rounded-[9px] text-muted/70 hover:bg-surface-secondary hover:text-foreground"
            isIconOnly
            isPending={pending}
            size="sm"
            variant="ghost"
          >
            <MoreHorizontal size={17} />
          </Button>
          <Dropdown.Popover className="w-[184px] min-w-0 rounded-[14px]">
            <Dropdown.Menu
              onAction={(key) => {
                if (key === 'fav') {
                  onToggleFav();
                } else if (key === 'duplicate') {
                  duplicate();
                } else if (key === 'delete') {
                  deleteAlertState.open();
                }
              }}
            >
              <Dropdown.Section>
                <Dropdown.Item
                  id="fav"
                  textValue={isFav ? 'Unfavourite' : 'Favourite'}
                >
                  <ItemBody
                    icon={
                      <Star
                        className={`size-4 shrink-0 ${isFav ? 'text-star' : 'text-muted'}`}
                        fill={isFav ? 'currentColor' : 'none'}
                      />
                    }
                    label={isFav ? 'Unfavourite' : 'Favourite'}
                  />
                </Dropdown.Item>
                {onDuplicate ? (
                  <Dropdown.Item
                    id="duplicate"
                    isDisabled={pending}
                    textValue="Duplicate"
                  >
                    <ItemBody
                      icon={<Copy className="size-4 shrink-0 text-muted" />}
                      label="Duplicate"
                    />
                  </Dropdown.Item>
                ) : null}
              </Dropdown.Section>
              {onDelete ? (
                <>
                  <Separator />
                  <Dropdown.Section>
                    <Dropdown.Item
                      id="delete"
                      isDisabled={pending}
                      textValue="Delete"
                      variant="danger"
                    >
                      <ItemBody
                        icon={<TrashIcon className="size-4 shrink-0 text-danger" />}
                        label="Delete"
                      />
                    </Dropdown.Item>
                  </Dropdown.Section>
                </>
              ) : null}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      <AlertDialog.Backdrop
        isDismissable={!pending}
        isOpen={deleteAlertState.isOpen}
        onOpenChange={deleteAlertState.setOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>
                Delete {type.label.toLowerCase()}: <strong>{item.name}</strong>
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>This can't be undone.</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={pending}
                slot="close"
                variant="tertiary"
              >
                Cancel
              </Button>
              <Button
                className="relative"
                isPending={pending}
                onPress={() => confirmDelete()}
                variant="danger"
              >
                <span className={pending ? 'invisible' : undefined}>Delete</span>
                {pending ? (
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
    </div>
  );
}
