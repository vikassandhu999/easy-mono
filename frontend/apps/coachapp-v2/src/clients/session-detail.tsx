import {formatDuration, formatSessionDateLong, SESSION_STATE_CHIP} from '@easy/utils';
import {Alert, Button, Chip, Separator, Spinner, Table} from '@heroui/react';
import {Activity, ArrowLeft, Clock, Dumbbell, MessageSquare, Plus, RefreshCw, SkipForward} from 'lucide-react';
import {useParams} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetWorkoutSessionQuery} from '@/api/workoutSessions';
import {buildExerciseGroups, type ExerciseGroup, formatLoad, getAdherenceSummary} from '@/clients/lib/session';

function ExerciseGroupSection({group}: {group: ExerciseGroup}) {
  const isSkipped = group.sets.length === 0 && !group.isAdded;
  const hasPlan = group.plannedSets.length > 0;

  return (
    <div className="py-3">
      <div className="mb-2 flex items-center gap-2">
        <h4 className="text-sm font-semibold">{group.exerciseName}</h4>
        {group.isReplacement ? (
          <Chip
            color="default"
            size="sm"
            variant="soft"
          >
            <RefreshCw size={10} />
            <span className="ml-1">Replaced {group.originalExerciseName}</span>
          </Chip>
        ) : null}
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
        <p className="text-xs text-foreground-400">
          {group.plannedSets.length} set{group.plannedSets.length !== 1 ? 's' : ''} planned, none performed
        </p>
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
                      <Table.Cell className="text-foreground-400">{idx + 1}</Table.Cell>
                      {hasPlan ? (
                        <Table.Cell className="text-foreground-500">{planned?.targetReps ?? '—'}</Table.Cell>
                      ) : null}
                      <Table.Cell>
                        {set.completed ? (
                          <span>{set.actual_reps ?? '—'}</span>
                        ) : (
                          <span className="text-foreground-400">skipped</span>
                        )}
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
  const {data, isError, isLoading} = useGetWorkoutSessionQuery(sessionId!);

  if (isLoading) {
    return (
      <PageLayout title="Workout Session">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  if (isError || !data) {
    return (
      <PageLayout title="Workout Session">
        <div className="mb-4">
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back to client
          </Button>
        </div>
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Failed to load session</Alert.Title>
            <Alert.Description>The workout session may not exist or you don&apos;t have access.</Alert.Description>
          </Alert.Content>
        </Alert>
      </PageLayout>
    );
  }

  const session = data.data;
  const snapshot = session.planned_snapshot;
  const title = snapshot ? snapshot.workout_name : 'Freestyle workout';
  const dateStr = formatSessionDateLong(session.started_at);
  const duration = formatDuration(session.started_at, session.ended_at);
  const groups = buildExerciseGroups(session);
  const adherence = getAdherenceSummary(session, groups);

  const stateChip = SESSION_STATE_CHIP[session.state];

  return (
    <PageLayout title="Workout Session">
      <div className="mb-4">
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back to client
        </Button>
      </div>

      <div className="max-w-lg">
        <div className="pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            {stateChip ? (
              <Chip
                color={stateChip.color}
                size="sm"
                variant="soft"
              >
                {stateChip.label}
              </Chip>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-foreground-500">{dateStr}</p>
        </div>

        <div className="flex flex-wrap gap-4 pb-4">
          {duration ? (
            <div className="flex items-center gap-1.5 text-sm text-foreground-500">
              <Clock size={14} />
              {duration}
            </div>
          ) : null}
          {session.soreness_rating ? (
            <div className="flex items-center gap-1.5 text-sm text-foreground-500">
              <Activity size={14} />
              Effort: {session.soreness_rating}/5
            </div>
          ) : null}
          {snapshot ? (
            <div className="flex items-center gap-1.5 text-sm text-foreground-500">
              <Dumbbell size={14} />
              {adherence.completed}/{adherence.totalPlanned} exercises
              {adherence.totalSets > 0 ? ` \u00B7 ${adherence.totalSets} sets` : ''}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-foreground-500">
              <Dumbbell size={14} />
              {adherence.totalSets} sets across {groups.length} exercise{groups.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {session.notes ? (
          <div className="flex items-start gap-2 pb-4">
            <MessageSquare
              className="mt-0.5 shrink-0 text-foreground-400"
              size={14}
            />
            <p className="text-sm italic text-foreground-500">&ldquo;{session.notes}&rdquo;</p>
          </div>
        ) : null}

        {snapshot ? (
          <div className="flex flex-wrap gap-2 pb-4">
            {adherence.replaced > 0 ? (
              <Chip
                color="default"
                size="sm"
                variant="soft"
              >
                {adherence.replaced} replaced
              </Chip>
            ) : null}
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
          <div className="divide-y divide-divider">
            {groups.map((group) => (
              <ExerciseGroupSection
                group={group}
                key={group.elementId ?? `added_${group.exerciseId}`}
              />
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-foreground-400">No exercises logged in this session.</p>
        )}
      </div>
    </PageLayout>
  );
}
