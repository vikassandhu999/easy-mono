/**
 * DefaultIntakeControl — "which form do new clients get?", in the Forms header
 * beside Create form (placement decided on `prototype/default-intake-placement`).
 *
 * The trigger always names a real form rather than the word "Automatic": with no
 * explicit default the backend assigns the oldest active intake
 * (`Forms.get_or_create_default_intake_template/1`), and the list endpoint hands
 * templates back in that same `inserted_at` order — so the first active intake
 * IS what a new client would receive. Automatic is a row inside the dialog,
 * where there is room to say what it means, instead of a second header button.
 */
import {Button, Description, Label, ListBox, Typography, toast} from '@heroui/react';
import {ChevronDown, ClipboardList, Wand2} from 'lucide-react';
import {useState} from 'react';

import {toastMutationError} from '@/@components/mutation-toast';
import {
  type ClientProfileFormTemplate,
  useClearDefaultIntakeTemplateMutation,
  useListFormTemplatesQuery,
  useSetDefaultIntakeTemplateMutation,
} from '@/api/checkins';
import {PickerModal} from '@/builder-kit/picker-modal';
import {questionCount} from '@/checkins/lib/form-templates';

const AUTOMATIC = 'automatic';

/** Icon tile + title + meta + selection tick — the browse row's anatomy, minus the navigation chevron. */
function PickerRow({id, meta, name, icon}: {icon: React.ReactNode; id: string; meta: string; name: string}) {
  return (
    <ListBox.Item
      className="gap-3 px-3 py-2.5"
      id={id}
      textValue={name}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-tertiary text-muted">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <Label className="max-w-full truncate type-body font-semibold leading-[normal] text-foreground">{name}</Label>
        <Description className="max-w-full truncate type-eyebrow leading-[normal] text-muted">{meta}</Description>
      </span>
      <ListBox.ItemIndicator />
    </ListBox.Item>
  );
}

function templateMeta(template: ClientProfileFormTemplate): string {
  const count = questionCount(template);
  return `${count} question${count === 1 ? '' : 's'}`;
}

export default function DefaultIntakeControl() {
  const templatesQuery = useListFormTemplatesQuery();
  const setDefaultMutation = useSetDefaultIntakeTemplateMutation();
  const clearDefaultMutation = useClearDefaultIntakeTemplateMutation();
  const [open, setOpen] = useState(false);

  const templates = templatesQuery.data?.data ?? [];
  const intakes = templates.filter((t) => t.purpose === 'intake' && t.status === 'active');
  // An archived flag-carrier no longer wins on invite, so it is not the explicit
  // default — but clearing still needs its id.
  const explicit = intakes.find((t) => t.is_default_intake);
  const flagCarrier = templates.find((t) => t.is_default_intake);
  const automatic = intakes[0];
  const effective = explicit ?? automatic;
  const pending = setDefaultMutation.isPending || clearDefaultMutation.isPending;

  if (!templatesQuery.isSuccess) {
    return null;
  }

  const select = (key: string) => {
    if (key === AUTOMATIC) {
      if (!flagCarrier) {
        setOpen(false);
        return;
      }
      clearDefaultMutation
        .mutateAsync(flagCarrier.id)
        .then(() => {
          toast.success(
            automatic ? `New clients now get "${automatic.name}"` : 'New clients get your oldest active intake form',
            {timeout: 1500},
          );
          setOpen(false);
        })
        .catch((error) => toastMutationError(error, "The intake form wasn't changed. Try again."));
      return;
    }
    const picked = intakes.find((t) => t.id === key);
    setDefaultMutation
      .mutateAsync(key)
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
        isDismissable={!pending}
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
            disallowEmptySelection
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (next && !pending) {
                select(String(next));
              }
            }}
            selectedKeys={[explicit?.id ?? AUTOMATIC]}
            selectionMode="single"
          >
            <PickerRow
              icon={<Wand2 className="size-4.5" />}
              id={AUTOMATIC}
              meta={automatic ? `Your oldest form — currently "${automatic.name}"` : 'Your oldest intake form'}
              name="Choose for me"
            />
            {intakes.map((template) => (
              <PickerRow
                icon={<ClipboardList className="size-4.5" />}
                id={template.id}
                key={template.id}
                meta={templateMeta(template)}
                name={template.name}
              />
            ))}
          </ListBox>
        )}
      </PickerModal>
    </>
  );
}
