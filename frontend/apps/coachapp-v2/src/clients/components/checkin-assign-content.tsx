/**
 * Body of the check-in schedule surface: pick a template, repeat cadence, and
 * first due date. Rendered inside the popover (desktop) or
 * KeyboardSheet (mobile) by CheckinAssignControl.
 */
import {Button, Label, ListBox, Select, Spinner, Typography, toast} from '@heroui/react';
import {X} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import DateInput from '@/@components/date-input';
import {ROUTES} from '@/@config/routes';
import {
  type ClientProfileCheckInScheduleRequest,
  useCreateCheckInScheduleMutation,
  useListFormTemplatesQuery,
} from '@/api/checkins';

interface Props {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

type Frequency = ClientProfileCheckInScheduleRequest['frequency'];

const FREQUENCY_LABELS: Record<Frequency, string> = {
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  once: 'Once',
  weekly: 'Weekly',
};

export default function CheckinAssignContent({clientId, clientName, onClose}: Props) {
  const navigate = useNavigate();
  const {data, isLoading} = useListFormTemplatesQuery();
  const [createSchedule, {isLoading: isCreating}] = useCreateCheckInScheduleMutation();
  const templates = (data?.data ?? []).filter((template) => template.purpose === 'check_in');

  const [templateId, setTemplateId] = useState<null | string>(null);
  const [dueDate, setDueDate] = useState<null | string>(null);
  const [frequency, setFrequency] = useState<Frequency>('weekly');

  const handleAssign = async () => {
    if (!templateId || !dueDate) {
      return;
    }
    try {
      await createSchedule({
        clientId,
        clientProfileCheckInScheduleRequest: {form_template_id: templateId, frequency, next_due_on: dueDate},
      }).unwrap();
      toast.success('Check-in scheduled');
      onClose();
    } catch {
      toast.danger("Check-in wasn't scheduled. Try again.");
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Typography
          type="body-sm"
          weight="semibold"
        >
          Schedule check-in
        </Typography>
        <button
          aria-label="Close"
          className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
            No check-in forms yet. Build one in Forms first.
          </Typography>
          <Button
            className="mt-3"
            onPress={() => {
              navigate(ROUTES.CREATE_CHECKIN);
            }}
            size="sm"
            variant="secondary"
          >
            Create form
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
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <DateInput
            isRequired
            label="First due date"
            onChange={setDueDate}
            value={dueDate}
          />

          <Select
            onChange={(key) => key && setFrequency(key as Frequency)}
            value={frequency}
            variant="secondary"
          >
            <Label>Repeat</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((value) => (
                  <ListBox.Item
                    id={value}
                    key={value}
                    textValue={FREQUENCY_LABELS[value]}
                  >
                    {FREQUENCY_LABELS[value]}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <Button
            className="w-full"
            isDisabled={!templateId || !dueDate}
            isPending={isCreating}
            onPress={handleAssign}
          >
            {isCreating ? 'Scheduling' : `Schedule for ${clientName}`}
          </Button>
        </div>
      )}
    </div>
  );
}
