import {formatDuration, formatSessionDateLong, SESSION_STATE_CHIP} from '@easy/utils';
import {Alert, Button, Chip, Separator, Table, Typography} from '@heroui/react';
import {Activity, ArrowLeft, Clock, Dumbbell, MessageSquare, Plus, SkipForward} from 'lucide-react';
import {useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetCoachClientTrainingSessionQuery} from '@/api/generated';
import {buildExerciseGroups, type ExerciseGroup, formatLoad, getAdherenceSummary} from '@/clients/lib/session';
import {getWorkoutSessionTitle} from '@/domain/workout-sessions';

function ExerciseGroupSection({group}: {group: ExerciseGroup}) {
  const isSkipped = group.sets.length === 0 && !group.isAdded;
  const hasPlan = group.plannedSets.length > 0;

  return (
    <div className="py-3">
      <div className="mb-2 flex items-center gap-2">
        <Typography
          type="body-sm"
          weight="semibold"
        >
          {group.exerciseName}
        </Typography>
        {group.isAdded ? (
          <Chip
            color="success"
            size="sm"
            variant="soft"
          >
            <Plus size={10} />
            <span className="ml-1">Added</span>
          </Chip>
        ) : null}
        {isSkipped ? (
          <Chip
            color="default"
            size="sm"
            variant="soft"
          >
            <SkipForward size={10} />
            <span className="ml-1">Skipped</span>
          </Chip>
        ) : null}
      </div>

      {isSkipped ? (
        <Typography
          color="muted"
          type="body-xs"
        >
          {group.plannedSets.length} set{group.plannedSets.length !== 1 ? 's' : ''} planned, none performed
        </Typography>
      ) : group.sets.length > 0 ? (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Set log">
              <Table.Header>
                <Table.Column isRowHeader>#</Table.Column>
                {hasPlan ? <Table.Column>Plan</Table.Column> : null}
                <Table.Column>Done</Table.Column>
                <Table.Column>Load</Table.Column>
              </Table.Header>
              <Table.Body>
                {group.sets.map((set, idx) => {
                  const planned = hasPlan ? group.plannedSets[idx] : null;
                  return (
                    <Table.Row
                      id={set.id}
                      key={set.id}
                    >
                      <Table.Cell className="text-muted">{idx + 1}</Table.Cell>
                      {hasPlan ? <Table.Cell className="text-muted">{planned?.targetReps ?? '—'}</Table.Cell> : null}
                      <Table.Cell>
                        {set.completed ? <span>{set.reps ?? '—'}</span> : <span className="text-muted">skipped</span>}
                      </Table.Cell>
                      <Table.Cell>{formatLoad(set.load_value, set.load_unit)}</Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      ) : null}
    </div>
  );
}

export default function SessionDetail() {
  const {clientId, sessionId} = useParams<{clientId: string; sessionId: string}>();
  const goBack = useGoBack(`/clients/${clientId}`);
  const {data, isError, isLoading} = useGetCoachClientTrainingSessionQuery({clientId: clientId!, id: sessionId!});

  if (isLoading) {
    return (
      <Page>
        <Page.Header size="content">
          <Page.TitleGroup>
            <Page.Title>Workout session</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="pt-4 pb-6">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header size="content">
          <Page.TitleGroup>
            <Page.Title>Workout session</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Toolbar>
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Client
          </Button>
        </Page.Toolbar>
        <Page.Content className="pt-4 pb-6">
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Session couldn&apos;t load</Alert.Title>
              <Alert.Description>The workout session may not exist, or you may not have access</Alert.Description>
            </Alert.Content>
          </Alert>
        </Page.Content>
      </Page>
    );
  }

  const session = data.data;
  const snapshot = session.planned_snapshot;
  const title = getWorkoutSessionTitle(session);
  const dateStr = formatSessionDateLong(session.started_at);
  const duration = formatDuration(session.started_at, session.ended_at);
  const groups = buildExerciseGroups(session);
  const adherence = getAdherenceSummary(session, groups);

  const stateChip = SESSION_STATE_CHIP[session.state];

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <Page.Title>Workout session</Page.Title>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Client
        </Button>
      </Page.Toolbar>
      <Page.Content className="pt-4 pb-6">
        <div className="mx-auto max-w-lg">
          <div className="pb-4">
            <div className="flex min-w-0 items-center gap-2">
              <Typography
                truncate
                type="h5"
              >
                {title}
              </Typography>
              {stateChip ? (
                <Chip
                  className="shrink-0"
                  color={stateChip.color}
                  size="sm"
                  variant="soft"
                >
                  {stateChip.label}
                </Chip>
              ) : null}
            </div>
            <Typography
              className="mt-1"
              color="muted"
              type="body-sm"
            >
              {dateStr}
            </Typography>
          </div>

          <div className="flex flex-wrap gap-4 pb-4">
            {duration ? (
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <Clock size={14} />
                {duration}
              </div>
            ) : null}
            {session.soreness_rating ? (
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <Activity size={14} />
                Effort: {session.soreness_rating}/5
              </div>
            ) : null}
            {snapshot ? (
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <Dumbbell size={14} />
                {adherence.completed}/{adherence.totalPlanned} exercises
                {adherence.totalSets > 0 ? ` \u00B7 ${adherence.totalSets} sets` : ''}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <Dumbbell size={14} />
                {adherence.totalSets} sets across {groups.length} exercise{groups.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {session.notes ? (
            <div className="flex items-start gap-2 pb-4">
              <MessageSquare
                className="mt-0.5 shrink-0 text-muted"
                size={14}
              />
              <Typography
                className="italic min-w-0 break-words"
                color="muted"
                type="body-sm"
              >
                &ldquo;{session.notes}&rdquo;
              </Typography>
            </div>
          ) : null}

          {snapshot ? (
            <div className="flex flex-wrap gap-2 pb-4">
              {adherence.skipped > 0 ? (
                <Chip
                  color="default"
                  size="sm"
                  variant="soft"
                >
                  {adherence.skipped} skipped
                </Chip>
              ) : null}
              {adherence.added > 0 ? (
                <Chip
                  color="success"
                  size="sm"
                  variant="soft"
                >
                  {adherence.added} added
                </Chip>
              ) : null}
            </div>
          ) : null}

          <Separator />

          {groups.length > 0 ? (
            <div className="divide-y divide-surface-secondary">
              {groups.map((group) => (
                <ExerciseGroupSection
                  group={group}
                  key={`${group.exerciseId}_${group.exerciseName}`}
                />
              ))}
            </div>
          ) : (
            <Typography
              align="center"
              className="py-6"
              color="muted"
              type="body-sm"
            >
              No exercises logged in this session
            </Typography>
          )}
        </div>
      </Page.Content>
    </Page>
  );
}
