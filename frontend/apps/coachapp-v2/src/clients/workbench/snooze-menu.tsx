import {Button, Dropdown, Header, Label, toast} from '@heroui/react';
import {AlarmClockOff} from 'lucide-react';

import {toastMutationError} from '@/@components/mutation-toast';
import {type QueueSnoozeRequest, useSnoozeQueueMutation} from '@/api/workbench';

const DAY_MS = 24 * 60 * 60 * 1000;

const OPTIONS = [
  {days: 7, label: '1 week'},
  {days: 14, label: '2 weeks'},
  {days: 30, label: '30 days'},
];

/**
 * The pressure valve (spec §8 B6): "on holiday" shouldn't mean ignoring the
 * queue or lying to it. The client leaves this queue and its count until the
 * date passes, then reappears on their own.
 */
export function SnoozeMenu({clientId, queue}: {clientId: string; queue: QueueSnoozeRequest['queue']}) {
  const snooze = useSnoozeQueueMutation();

  const snoozeFor = (days: number) => {
    const until = new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
    snooze
      .mutateAsync({clientId, queue, snoozed_until: until})
      .then(() => toast.success('Snoozed — they’ll come back when it matters', {timeout: 1500}))
      .catch((e) => toastMutationError(e, "Couldn't snooze"));
  };

  return (
    <Dropdown>
      <Button
        aria-label="Snooze"
        className="text-muted"
        isIconOnly
        isPending={snooze.isPending}
        size="sm"
        variant="ghost"
      >
        <AlarmClockOff size={16} />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={(key) => snoozeFor(Number(key))}>
          <Dropdown.Section>
            <Header>Snooze for</Header>
            {OPTIONS.map((option) => (
              <Dropdown.Item
                id={String(option.days)}
                key={option.days}
                textValue={option.label}
              >
                <Label>{option.label}</Label>
              </Dropdown.Item>
            ))}
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
