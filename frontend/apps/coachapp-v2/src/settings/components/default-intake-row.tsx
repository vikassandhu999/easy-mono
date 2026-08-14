/**
 * DefaultIntakeRow — the "which intake do new clients get?" setting.
 * Shows the effective default (or "Automatic"), opens a PickerModal of active
 * intake templates to change it, and clears back to automatic.
 */
import {Button, ListBox, Typography, toast} from '@heroui/react';
import {Check} from 'lucide-react';
import {useState} from 'react';

import {toastMutationError} from '@/@components/mutation-toast';
import {
  useClearDefaultIntakeTemplateMutation,
  useListFormTemplatesQuery,
  useSetDefaultIntakeTemplateMutation,
} from '@/api/checkins';
import {PickerModal} from '@/builder-kit/picker-modal';

export default function DefaultIntakeRow() {
  const templatesQuery = useListFormTemplatesQuery();
  const setDefaultMutation = useSetDefaultIntakeTemplateMutation();
  const clearDefaultMutation = useClearDefaultIntakeTemplateMutation();
  const [pickerOpen, setPickerOpen] = useState(false);

  const templates = templatesQuery.data?.data ?? [];
  const intakes = templates.filter((t) => t.purpose === 'intake' && t.status === 'active');
  // Effective default: an archived flag-carrier no longer wins on invite, so
  // show "Automatic" rather than naming a template that won't be assigned.
  const current = intakes.find((t) => t.is_default_intake);
  const pending = setDefaultMutation.isPending || clearDefaultMutation.isPending;
  const unavailable = templatesQuery.isLoading || templatesQuery.isError;

  const pick = async (templateId: string) => {
    try {
      await setDefaultMutation.mutateAsync(templateId);
      toast.success('Default intake updated', {timeout: 1000});
      setPickerOpen(false);
    } catch (error) {
      toastMutationError(error, "The default intake wasn't updated. Try again.");
    }
  };

  const clear = () => {
    if (!current) {
      return;
    }
    clearDefaultMutation
      .mutateAsync(current.id)
      .then(() => toast.success('Back to the automatic default', {timeout: 1000}))
      .catch((error) => toastMutationError(error, "The default intake wasn't cleared. Try again."));
  };

  return (
    <div className="flex min-h-12 items-center gap-3 px-4 py-3">
      <Typography
        className="w-16 shrink-0 md:w-22"
        color="muted"
        type="body-sm"
      >
        Intake
      </Typography>
      <Typography
        className="min-w-0 flex-1"
        truncate
        type="body-sm"
      >
        {templatesQuery.isLoading && '—'}
        {templatesQuery.isError && "Couldn't load intake forms"}
        {!unavailable && (current?.name ?? 'Automatic')}
      </Typography>
      <div className="flex shrink-0 items-center gap-1">
        {current && (
          <Button
            className="text-muted"
            isDisabled={pending || unavailable}
            onPress={clear}
            size="sm"
            variant="ghost"
          >
            Use automatic
          </Button>
        )}
        <Button
          isDisabled={pending || unavailable}
          onPress={() => setPickerOpen(true)}
          size="sm"
          variant="ghost"
        >
          {current ? 'Change' : 'Choose'}
        </Button>
      </div>

      <PickerModal
        bodyClassName="max-h-[70vh] overflow-y-auto p-2"
        isDismissable={!pending}
        onClose={() => setPickerOpen(false)}
        open={pickerOpen}
        title="Default intake form"
      >
        {intakes.length === 0 ? (
          <Typography
            className="px-2 py-6"
            color="muted"
            type="body-sm"
          >
            No active intake forms yet. Build one under Forms first.
          </Typography>
        ) : (
          <ListBox
            aria-label="Intake forms"
            onAction={(key) => {
              if (!pending) {
                void pick(String(key));
              }
            }}
          >
            {intakes.map((template) => (
              <ListBox.Item
                id={template.id}
                key={template.id}
                textValue={template.name}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">{template.name}</span>
                  {template.is_default_intake && <Check className="size-4 shrink-0 text-accent" />}
                </span>
              </ListBox.Item>
            ))}
          </ListBox>
        )}
      </PickerModal>
    </div>
  );
}
