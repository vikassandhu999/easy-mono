import {Chip} from '@heroui/react';
import {ClipboardCheck} from 'lucide-react';

import {BrowseRow} from '@/@components/browse-list-box';
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
    <BrowseRow
      icon={<ClipboardCheck className="size-5 text-foreground" />}
      id={template.id}
      meta={getTemplateMeta(template)}
      textValue={template.name}
      title={template.name}
      trailing={
        <Chip
          color={status.color}
          size="sm"
          variant="soft"
        >
          {status.label}
        </Chip>
      }
    />
  );
}
