/**
 * DefaultIntakeControl — "which form do new clients get?", in the Forms header
 * beside Create form (placement decided on `prototype/default-intake-placement`).
 *
 * There is no "automatic" option, because it was never a choice a coach wants to
 * make: when no template carries the flag the backend assigns the oldest active
 * intake (`Forms.get_or_create_default_intake_template/1`), and the list endpoint
 * returns templates in that same `inserted_at` order — so the first active intake
 * IS what a new client would receive. The picker shows it as the current one and
 * a coach only ever picks a form. The unflagged state stays a bootstrap detail.
 */
import {Button, Description, Label, ListBox, Typography, toast} from '@heroui/react';
import {Check, ChevronDown, ClipboardList} from 'lucide-react';
import {useState} from 'react';
import {useListFormTemplatesQuery, useSetDefaultIntakeTemplateMutation} from '@/api/checkins';
import {questionCount} from '@/checkins/form-templates';
import {LIST_ITEM_CLASS} from '@/ui/browse-list-box';
import {toastMutationError} from '@/ui/mutation-toast';
import {PickerModal} from '@/ui/picker-modal';

export default function DefaultIntakeControl() {
  const templatesQuery = useListFormTemplatesQuery();
  const setDefaultMutation = useSetDefaultIntakeTemplateMutation();
  const [open, setOpen] = useState(false);

  const templates = templatesQuery.data?.data ?? [];
  const intakes = templates.filter((t) => t.purpose === 'intake' && t.status === 'active');
  // An archived flag-carrier no longer wins on invite, so the fallback takes over
  // and the control self-heals to whatever a new client would actually receive.
  const effective = intakes.find((t) => t.is_default_intake) ?? intakes[0];

  if (!templatesQuery.isSuccess) {
    return null;
  }

  const pick = (id: string) => {
    const picked = intakes.find((t) => t.id === id);
    setDefaultMutation
      .mutateAsync(id)
      .then(() => {
        toast.success(`New clients now get "${picked?.name ?? 'this form'}"`, {timeout: 1500});
        setOpen(false);
      })
      .catch((error) => toastMutationError(error, "The intake form wasn't changed. Try again."));
  };

  return (
    <>
      <Button
        aria-label={`Intake form for new clients: ${effective?.name ?? 'none'}`}
        className="w-full justify-start gap-1.5 sm:w-auto"
        onPress={() => setOpen(true)}
        size="sm"
        variant="outline"
      >
        <ClipboardList className="size-4 shrink-0 text-muted" />
        <span className="shrink-0 font-normal text-muted">New clients get:</span>
        {/* Desktop needs an explicit cap, not just `truncate`: the header row does
            not shrink this control, so a long form name would grow it until it ate
            the page title. Mobile has its own line, so it just fills it. */}
        <span className="min-w-0 flex-1 truncate text-start font-semibold text-foreground sm:max-w-48 sm:flex-none">
          {effective?.name ?? 'No intake form'}
        </span>
        <ChevronDown className="ms-auto size-3.5 shrink-0 text-muted sm:ms-0" />
      </Button>

      <PickerModal
        bodyClassName="max-h-[70vh] overflow-y-auto px-2 pb-2"
        isDismissable={!setDefaultMutation.isPending}
        onClose={() => setOpen(false)}
        open={open}
        title="Intake form for new clients"
      >
        <Typography
          className="px-3 pb-3"
          color="muted"
          type="body-sm"
        >
          Every client you invite is sent this form to fill in before you start working together.
        </Typography>

        {intakes.length === 0 ? (
          <Typography
            className="px-3 pb-6"
            color="muted"
            type="body-sm"
          >
            No active intake forms yet. Create one and it will be sent to new clients automatically.
          </Typography>
        ) : (
          <ListBox
            aria-label="Intake form for new clients"
            className="p-0"
            // An action list, not a selection list: HeroUI suppresses `onAction`
            // once a `selectionMode` is set, and then tapping the form that is
            // already current fires nothing and the picker just sits there. The
            // current one is marked in its own row instead.
            onAction={(key) => {
              if (setDefaultMutation.isPending) {
                return;
              }
              if (key === effective?.id) {
                setOpen(false);
                return;
              }
              pick(String(key));
            }}
          >
            {intakes.map((template) => {
              const count = questionCount(template);
              const isCurrent = template.id === effective?.id;
              return (
                <ListBox.Item
                  className={LIST_ITEM_CLASS}
                  id={template.id}
                  key={template.id}
                  textValue={template.name}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-tertiary text-muted">
                    <ClipboardList className="size-4.5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <Label className="max-w-full truncate type-body font-semibold leading-[normal] text-foreground">
                      {template.name}
                    </Label>
                    <Description className="max-w-full truncate type-eyebrow leading-[normal] text-muted">
                      {isCurrent ? 'Current · ' : ''}
                      {count} question{count === 1 ? '' : 's'}
                    </Description>
                  </span>
                  {isCurrent && <Check className="size-4 shrink-0 text-accent" />}
                </ListBox.Item>
              );
            })}
          </ListBox>
        )}
      </PickerModal>
    </>
  );
}
