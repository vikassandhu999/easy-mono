/**
 * DefaultIntakeControl — the "which intake do new clients get?" setting, living
 * in the Forms header next to Create form (placement decided by the
 * `prototype/default-intake-placement` branch; Settings had no such card left).
 * One control at every width; it always opens a picker dialog, and "Automatic"
 * (clear) is an option inside it rather than a second header button.
 */
import {Button, ListBox, Typography, toast} from '@heroui/react';
import {Check, ClipboardList} from 'lucide-react';
import {useState} from 'react';

import {toastMutationError} from '@/@components/mutation-toast';
import {
  useClearDefaultIntakeTemplateMutation,
  useListFormTemplatesQuery,
  useSetDefaultIntakeTemplateMutation,
} from '@/api/checkins';
import {PickerModal} from '@/builder-kit/picker-modal';

const AUTOMATIC = 'automatic';

export default function DefaultIntakeControl() {
  const templatesQuery = useListFormTemplatesQuery();
  const setDefaultMutation = useSetDefaultIntakeTemplateMutation();
  const clearDefaultMutation = useClearDefaultIntakeTemplateMutation();
  const [pickerOpen, setPickerOpen] = useState(false);

  const templates = templatesQuery.data?.data ?? [];
  const intakes = templates.filter((t) => t.purpose === 'intake' && t.status === 'active');
  // Effective default: an archived flag-carrier no longer wins on invite, so
  // show "Automatic" rather than naming a template that won't be assigned.
  const current = intakes.find((t) => t.is_default_intake);
  // The carrier may be archived; "Automatic" still needs its id to clear it.
  const flagCarrier = templates.find((t) => t.is_default_intake);
  const pending = setDefaultMutation.isPending || clearDefaultMutation.isPending;

  if (!templatesQuery.isSuccess) {
    return null;
  }

  const pick = (key: string) => {
    if (key === AUTOMATIC) {
      if (!flagCarrier) {
        setPickerOpen(false);
        return;
      }
      clearDefaultMutation
        .mutateAsync(flagCarrier.id)
        .then(() => {
          toast.success('Back to the automatic default', {timeout: 1000});
          setPickerOpen(false);
        })
        .catch((error) => toastMutationError(error, "The default intake wasn't cleared. Try again."));
      return;
    }
    setDefaultMutation
      .mutateAsync(key)
      .then(() => {
        toast.success('Default intake updated', {timeout: 1000});
        setPickerOpen(false);
      })
      .catch((error) => toastMutationError(error, "The default intake wasn't updated. Try again."));
  };

  return (
    <>
      <Button
        aria-label="Default intake form"
        className="rounded-control border border-accent/40 bg-accent-soft text-accent-soft-foreground"
        onPress={() => setPickerOpen(true)}
        size="sm"
        variant="ghost"
      >
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
          <ClipboardList size={12} />
        </span>
        <span className="hidden font-normal lg:inline">New clients get</span>
        <span className="max-w-24 truncate font-bold sm:max-w-44">{current?.name ?? 'Automatic'}</span>
      </Button>

      <PickerModal
        bodyClassName="max-h-[70vh] overflow-y-auto p-2"
        isDismissable={!pending}
        onClose={() => setPickerOpen(false)}
        open={pickerOpen}
        title="Default intake form"
      >
        <Typography
          className="px-2 pb-2"
          color="muted"
          type="body-sm"
        >
          New clients are sent this form when invited.
        </Typography>
        <ListBox
          aria-label="Default intake form"
          onAction={(key) => {
            if (!pending) {
              pick(String(key));
            }
          }}
        >
          <ListBox.Item
            id={AUTOMATIC}
            textValue="Automatic"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 flex-1">
                Automatic
                <Typography
                  className="block"
                  color="muted"
                  type="body-xs"
                >
                  Your oldest active intake form
                </Typography>
              </span>
              {!current && <Check className="size-4 shrink-0 text-accent" />}
            </span>
          </ListBox.Item>
          {intakes.map((template) => (
            <ListBox.Item
              id={template.id}
              key={template.id}
              textValue={template.name}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{template.name}</span>
                {template.id === current?.id && <Check className="size-4 shrink-0 text-accent" />}
              </span>
            </ListBox.Item>
          ))}
        </ListBox>
      </PickerModal>
    </>
  );
}
