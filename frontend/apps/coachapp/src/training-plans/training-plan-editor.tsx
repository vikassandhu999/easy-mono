import {useEffect, useState} from 'react';
import {generatePath, useParams} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {type TrainingPlan, useTrainingPlan} from '../api/training-plans';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {useListLocation} from '../ui/list-location';
import {Page, PageHeader, Surface} from '../ui/page';
import {type TrainingEditorContext, TrainingPlanWorksheet} from './training-plan-worksheet';

export function TrainingPlanEditor() {
  const {id, clientId} = useParams();
  const context: TrainingEditorContext = clientId ? {kind: 'client', clientId} : {kind: 'template'};
  return id ? (
    <LoadEditor
      key={`${clientId ?? 'template'}:${id}`}
      id={id}
      context={context}
    />
  ) : (
    <TrainingPlanWorksheet
      key="new"
      initial={undefined}
      context={context}
    />
  );
}

function LoadEditor({id, context}: {id: string; context: TrainingEditorContext}) {
  const query = useTrainingPlan(id);
  const [initial, setInitial] = useState<TrainingPlan>();
  const {to: libraryLocation, state} = useListLocation(routes.trainingPlans);
  const to = context.kind === 'client' ? generatePath(routes.client, {id: context.clientId}) : libraryLocation;
  const backLabel = context.kind === 'client' ? 'Back to client' : 'Back to training plans';
  useEffect(() => {
    if (!initial && query.isSuccess && query.isFetchedAfterMount) {
      setInitial(query.data.data);
    }
  }, [initial, query.isSuccess, query.isFetchedAfterMount, query.data]);
  const matches =
    initial &&
    (context.kind === 'client'
      ? initial.kind === 'client_plan' && initial.client_id === context.clientId
      : initial.kind === 'template');
  if (!initial || !matches) {
    return (
      <Page>
        <PageHeader
          title="Training plan"
          back={{to, label: backLabel, state}}
        />
        <Surface>
          {initial ? (
            <FormError message="This plan does not belong here. Return to choose a plan." />
          ) : query.isError ? (
            <div className="space-y-4">
              <FormError message={errorMessage(query.error, "We couldn't load this plan.")} />
              <Button
                isPending={query.isFetching}
                onPress={() => {
                  query.refetch();
                }}
              >
                Try again
              </Button>
            </div>
          ) : (
            <p role="status">Loading plan…</p>
          )}
        </Surface>
      </Page>
    );
  }
  return (
    <TrainingPlanWorksheet
      initial={initial}
      context={context}
    />
  );
}
