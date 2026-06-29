/**
 * Body of the check-in assign surface: pick a template, optional due date +
 * priority, then assign to the client. Rendered inside the popover (desktop) or
 * KeyboardSheet (mobile) by CheckinAssignControl.
 */
import {Button, Label, ListBox, Select, Spinner, Typography, toast} from '@heroui/react';
import {X} from 'lucide-react';
import {useState} from 'react';

import DateInput from '@/@components/date-input';
import {ROUTES} from '@/@config/routes';
import {PURPOSE_LABELS, useAssignFormTemplateMutation, useListFormTemplatesQuery} from '@/api/checkins';

interface Props {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

type Priority = 'high' | 'normal';

export default function CheckinAssignContent({clientId, clientName, onClose}: Props) {
  const {data, isLoading} = useListFormTemplatesQuery();
  const [assign, {isLoading: isAssigning}] = useAssignFormTemplateMutation();
  const templates = data?.data ?? [];

  const [templateId, setTemplateId] = useState<null | string>(null);
  const [dueDate, setDueDate] = useState<null | string>(null);
  const [priority, setPriority] = useState<Priority>('normal');

  const handleAssign = async () => {
    if (!templateId) {
      return;
    }
    try {
      await assign({
        id: templateId,
        clientProfileFormAssignmentAssignRequest: {client_id: clientId, due_date: dueDate, priority},
      }).unwrap();
      toast.success('Check-in assigned');
      onClose();
    } catch {
      toast.danger("Check-in wasn't assigned. Try again.");
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Typography
          type="body-sm"
          weight="semibold"
        >
          Assign check-in
        </Typography>
        <button
          aria-label="Close"
          className="grid size-9 place-items-center rounded-md text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={onClose}
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="sm" />
        </div>
      ) : templates.length === 0 ? (
        <div className="py-6 text-center">
          <Typography
            color="muted"
            type="body-sm"
          >
            No check-ins yet. Build one in the library first.
          </Typography>
          <Button
            className="mt-3"
            onPress={() => {
              window.location.assign(ROUTES.CREATE_CHECKIN);
            }}
            size="sm"
            variant="secondary"
          >
            Create check-in
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Select
            onChange={(key) => setTemplateId(key ? String(key) : null)}
            placeholder="Choose a check-in"
            value={templateId}
            variant="secondary"
          >
            <Label>Check-in</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {templates.map((t) => (
                  <ListBox.Item
                    id={t.id}
                    key={t.id}
                    textValue={t.name}
                  >
                    {t.name}
                    <span className="ml-2 text-muted text-xs">{PURPOSE_LABELS[t.purpose] ?? t.purpose}</span>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <DateInput
            label="Due date (optional)"
            onChange={setDueDate}
            value={dueDate}
          />

          <div>
            <Label className="mb-1.5 block text-sm font-medium">Priority</Label>
            <div className="flex gap-2">
              {(['normal', 'high'] as Priority[]).map((p) => (
                <button
                  className={`min-h-10 rounded-lg border px-3 py-1.5 text-xs font-medium capitalize ${
                    priority === p
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border text-muted hover:bg-surface-hover'
                  }`}
                  key={p}
                  onClick={() => setPriority(p)}
                  type="button"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            isDisabled={!templateId}
            isPending={isAssigning}
            onPress={handleAssign}
          >
            {isAssigning ? 'Assigning…' : `Assign to ${clientName}`}
          </Button>
        </div>
      )}
    </div>
  );
}
