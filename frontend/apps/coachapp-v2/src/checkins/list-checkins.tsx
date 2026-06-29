import {Button, Chip, Spinner, Typography} from '@heroui/react';
import {ArrowLeft, ClipboardCheck, Plus} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {type ClientProfileFormTemplate, PURPOSE_LABELS, useListFormTemplatesQuery} from '@/api/checkins';

function questionCount(template: ClientProfileFormTemplate): number {
  return (template.sections ?? []).reduce(
    (sum, section) => sum + (Array.isArray(section.questions) ? section.questions.length : 0),
    0,
  );
}

export default function ListCheckins() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.LIBRARY);
  const {data, isError, isLoading, refetch} = useListFormTemplatesQuery();
  const templates = data?.data ?? [];

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup className="flex items-center">
          <Button
            className="lg:hidden"
            isIconOnly
            onPress={goBack}
            size="md"
            variant="ghost"
          >
            <ArrowLeft size={18} />
          </Button>
          <Page.Title>Check-ins</Page.Title>
        </Page.TitleGroup>
        <Page.Actions>
          <Button
            onPress={() => navigate(ROUTES.CREATE_CHECKIN)}
            size="sm"
          >
            <Plus size={16} />
            Create
          </Button>
        </Page.Actions>
      </Page.Header>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Typography
              color="muted"
              type="body-sm"
            >
              Couldn't load check-ins. Check your connection and try again.
            </Typography>
            <Button
              onPress={() => refetch()}
              size="sm"
              variant="secondary"
            >
              Retry
            </Button>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <ClipboardCheck
              className="text-muted"
              size={28}
            />
            <Typography
              color="muted"
              type="body-sm"
            >
              No check-ins yet. Build an intake or weekly check-in to send your clients.
            </Typography>
            <Button
              className="mt-1"
              onPress={() => navigate(ROUTES.CREATE_CHECKIN)}
              size="sm"
            >
              <Plus size={16} />
              Create check-in
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex max-w-2xl flex-col gap-2">
            {templates.map((template) => {
              const count = questionCount(template);
              return (
                <button
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-hover active:bg-surface-hover"
                  key={template.id}
                  onClick={() => navigate(ROUTES.EDIT_CHECKIN.replace(':id', template.id))}
                  type="button"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                    <ClipboardCheck size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Typography
                      truncate
                      type="body-sm"
                      weight="semibold"
                    >
                      {template.name}
                    </Typography>
                    <Typography
                      color="muted"
                      type="body-xs"
                    >
                      {count} question{count === 1 ? '' : 's'}
                    </Typography>
                  </div>
                  <Chip
                    size="sm"
                    variant="soft"
                  >
                    {PURPOSE_LABELS[template.purpose] ?? template.purpose}
                  </Chip>
                </button>
              );
            })}
          </div>
        )}
      </Page.Content>
    </Page>
  );
}
