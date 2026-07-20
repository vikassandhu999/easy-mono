import {Chip, Description, Label, ListBox} from '@heroui/react';
import {cn} from '@heroui/styles';
import {ChevronRight, ClipboardCheck} from 'lucide-react';

import {LIST_ITEM_CLASS} from '@/@components/browse-list-box';
import {type ClientProfileFormTemplate, PURPOSE_LABELS} from '@/api/checkins';

type TemplateStatus = ClientProfileFormTemplate['status'];

const STATUS_MAP: Record<TemplateStatus, {color: 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

function questionCount(template: ClientProfileFormTemplate): number {
  return (template.sections ?? []).reduce(
    (sum, section) => sum + (Array.isArray(section.questions) ? section.questions.length : 0),
    0,
  );
}

// COPY.md §FM row meta is `{Type} · {n} questions · {m} responses` — the
// template list endpoint carries no response count, so that segment is
// omitted rather than hand-wired; see PORT-TICKET notes for FM.
function getTemplateMeta(template: ClientProfileFormTemplate): string {
  const count = questionCount(template);
  return `${PURPOSE_LABELS[template.purpose]} · ${count} question${count === 1 ? '' : 's'}`;
}

export default function FormTemplateListItem({template}: {template: ClientProfileFormTemplate}) {
  const status = STATUS_MAP[template.status];

  return (
    <ListBox.Item
      className={cn(
        LIST_ITEM_CLASS,
        'gap-3 rounded-none border-b border-separator py-3 last:border-0 hover:bg-surface-secondary sm:px-4',
      )}
      id={template.id}
      textValue={template.name}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-secondary">
        <ClipboardCheck className="size-5 text-foreground" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Label className="max-w-full truncate text-sm font-semibold text-foreground">{template.name}</Label>
        <Description className="max-w-full truncate text-xs text-muted">{getTemplateMeta(template)}</Description>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Chip
          color={status.color}
          size="sm"
          variant="soft"
        >
          {status.label}
        </Chip>
        <ChevronRight className="size-4 shrink-0 text-muted-2" />
      </div>
    </ListBox.Item>
  );
}
