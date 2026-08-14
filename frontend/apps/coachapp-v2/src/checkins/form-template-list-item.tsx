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

// COPY.md §FM row meta: `{Type} · {n} questions · {m} responses`.
function getTemplateMeta(template: ClientProfileFormTemplate): string {
  const count = questionCount(template);
  const responses = template.response_count ?? 0;

  return [
    PURPOSE_LABELS[template.purpose],
    `${count} question${count === 1 ? '' : 's'}`,
    // Printed even at zero, unlike NP's client count: the ref shows `0 responses`
    // on a draft form, and "nobody has filled this in" is the useful reading.
    `${responses} response${responses === 1 ? '' : 's'}`,
  ].join(' · ');
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
        <>
          {/* Effective default only: an archived flag-carrier no longer wins on invite. */}
          {template.is_default_intake && template.status === 'active' && (
            <Chip
              className="chip--outline"
              size="sm"
            >
              Default intake
            </Chip>
          )}
          <Chip
            color={status.color}
            size="sm"
            variant="soft"
          >
            {status.label}
          </Chip>
        </>
      }
    />
  );
}
