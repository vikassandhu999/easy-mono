import {Button, Chip, ToggleButton, ToggleButtonGroup, Typography} from '@heroui/react';
import {ClipboardCheck, Plus} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import ListEmptyState from '@/@components/list-empty-state';
import {ListSkeleton} from '@/@components/list-skeleton';
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
  const [purpose, setPurpose] = useState<'all' | 'check_in' | 'intake'>('all');
  const visibleTemplates = purpose === 'all' ? templates : templates.filter((template) => template.purpose === purpose);

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup className="flex items-center">
          <BackButton
            className="lg:hidden"
            onPress={goBack}
          />
          <Page.Title>Forms</Page.Title>
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
          <ListSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Typography
              color="muted"
              type="body-sm"
            >
              Couldn't load check-ins.
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
          <ListEmptyState
            createLabel="Create form"
            createRoute={ROUTES.CREATE_CHECKIN}
            emptyDescription="Build intake and check-in forms for your clients."
            hasFilter={false}
            nounPlural="forms"
          />
        ) : (
          <div className="mt-4 flex max-w-2xl flex-col gap-3">
            <ToggleButtonGroup
              aria-label="Filter forms by type"
              className="flex flex-wrap gap-1 rounded-xl bg-surface-secondary p-1 self-start"
              isDetached
              onSelectionChange={(keys) => {
                const next = [...keys][0];
                if (next) {
                  setPurpose(next as typeof purpose);
                }
              }}
              selectedKeys={[purpose]}
              selectionMode="single"
              size="sm"
            >
              <ToggleButton id="all">All</ToggleButton>
              <ToggleButton id="intake">Intake</ToggleButton>
              <ToggleButton id="check_in">Check-in</ToggleButton>
            </ToggleButtonGroup>
            {visibleTemplates.map((template) => {
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
            {visibleTemplates.length === 0 ? (
              <Typography
                className="py-10 text-center"
                color="muted"
                type="body-sm"
              >
                No {PURPOSE_LABELS[purpose as 'check_in' | 'intake'].toLowerCase()} forms yet.
              </Typography>
            ) : null}
          </div>
        )}
      </Page.Content>
    </Page>
  );
}
