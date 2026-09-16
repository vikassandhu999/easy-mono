import {useEffect, useRef, useState} from 'react';
import {generatePath, Link, useLocation, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {useAssignIntake, useClientIntake, useFormTemplate, useFormTemplates} from '../api/forms';
import {getSession} from '../api/session';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {FormPreview} from '../ui/form-preview';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {Page, PageHeader, Surface} from '../ui/page';

export function AssignIntake() {
  const {id = ''} = useParams();
  return (
    <Assignment
      key={id}
      clientId={id}
    />
  );
}

function Assignment({clientId}: {clientId: string}) {
  const navigate = useNavigate();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const client = useClient(clientId);
  const intake = useClientIntake(clientId);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const assignedId = intake.data?.data?.id;
  const loadedClientId = client.data?.data.id;
  useEffect(() => {
    if (client.isError || intake.isError || (loadedClientId && assignedId)) {
      resultRef.current?.focus();
    }
  }, [client.isError, intake.isError, loadedClientId, assignedId]);
  const [params] = useSearchParams();
  const {state} = useLocation();
  const person = client.data?.data;
  const back = generatePath(routes.client, {id: clientId});
  const templateId = params.get('template');
  const name = person
    ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.email || 'Client'
    : 'Client';
  return (
    <Page>
      <PageHeader
        title={`Assign intake to ${name}`}
        description="Choose the questions your client needs to answer before coaching."
        back={{to: back, label: 'Back to client', state}}
      />
      {client.isError || intake.isError ? (
        <Surface className="space-y-4">
          <h2
            ref={resultRef}
            tabIndex={-1}
            className="section-title"
          >
            Intake unavailable
          </h2>
          <FormError message="Could not confirm this client's intake. Refresh before assigning a form." />
          <Button
            isPending={client.isFetching || intake.isFetching}
            onPress={() => {
              client.refetch();
              intake.refetch();
            }}
          >
            Retry client intake
          </Button>
        </Surface>
      ) : !person || intake.isPending ? (
        <p role="status">Loading client intake…</p>
      ) : intake.data?.data ? (
        <Surface className="space-y-4">
          <h2
            ref={resultRef}
            tabIndex={-1}
            className="section-title"
          >
            Intake already assigned
          </h2>
          <p className="wrap-anywhere">{intake.data.data.form_template.name}</p>
          <p className="text-sm text-muted-foreground">
            This client already has an intake. Open it to review answers or manage follow-up.
          </p>
          <Link
            to={back}
            state={state}
            className={buttonVariants()}
          >
            Open client intake
          </Link>
        </Surface>
      ) : person.status === 'inactive' ? (
        <Surface className="space-y-4">
          <p>Activate this client's coaching access before assigning an intake.</p>
          <Link
            to={generatePath(routes.clientProfile, {id: clientId})}
            state={state}
            className="text-link"
          >
            Open client details
          </Link>
        </Surface>
      ) : templateId ? (
        <SelectedIntake
          key={templateId}
          clientId={clientId}
          templateId={templateId}
          onAssigned={() => {
            if (mounted.current) {
              navigate(back, {replace: true, state});
            }
          }}
        />
      ) : (
        <ChooseIntake />
      )}
    </Page>
  );
}

function ChooseIntake() {
  useEffect(() => {
    document.getElementById('list-search')?.focus();
  }, []);
  const [params] = useSearchParams();
  const {pathname, state} = useLocation();
  const query = useFormTemplates({purpose: 'intake', status: 'active', search: params.get('search')?.trim() ?? ''});
  return (
    <>
      <ListSearch label="Search intake forms" />
      <InfiniteList
        query={query}
        label="intake forms"
        singular="intake form"
        empty={
          <Surface>
            <h2 className="section-title">No matching intake forms</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another name, or create an Intake in Forms before returning here.
            </p>
            <Link
              to={routes.createForm}
              className="text-link"
            >
              Create a form
            </Link>
          </Surface>
        }
      >
        {(template) => {
          const next = new URLSearchParams(params);
          next.set('template', template.id);
          return (
            <Link
              to={`${pathname}?${next}`}
              state={state}
              className="block space-y-1 p-5 hover:bg-muted/50 focus-visible:-outline-offset-4"
            >
              <p className="wrap-anywhere font-semibold">{template.name}</p>
              <p className="text-sm text-muted-foreground">
                {template.question_count} {template.question_count === 1 ? 'question' : 'questions'}
                {template.is_default_intake ? ' · Default intake' : ''}
              </p>
            </Link>
          );
        }}
      </InfiniteList>
    </>
  );
}

function SelectedIntake({
  clientId,
  templateId,
  onAssigned,
}: {
  clientId: string;
  templateId: string;
  onAssigned: () => void;
}) {
  const query = useFormTemplate(templateId);
  const intake = useClientIntake(clientId);
  const save = useAssignIntake(clientId);
  const [params] = useSearchParams();
  const {pathname, state} = useLocation();
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState('');
  const feedbackRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (query.data?.data.id || query.isError) {
      titleRef.current?.focus();
    }
  }, [query.data?.data.id, query.isError]);
  const mounted = useRef(true);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (notice && !save.isPending && !checking) {
      feedbackRef.current?.focus();
    }
  }, [notice, save.isPending, checking]);
  const choices = new URLSearchParams(params);
  choices.delete('template');
  const changeLink = (
    <Link
      to={`${pathname}?${choices}`}
      state={state}
      className="text-link"
    >
      Choose another intake
    </Link>
  );
  const template = query.data?.data;
  const checkSaved = async () => {
    const sessionId = getSession()?.id;
    setChecking(true);
    setNotice('');
    const result = await intake.refetch();
    if (!mounted.current || getSession()?.id !== sessionId) {
      return;
    }
    setChecking(false);
    if (result.isError) {
      setNotice('Could not check the saved intake. Try checking again before assigning.');
    } else if (!result.data?.data) {
      setUncertain(false);
      setNotice('This client still has no intake. You can try assigning again.');
    }
  };
  return (
    <div className="space-y-5">
      {query.isError ? (
        <Surface className="space-y-4">
          <h2
            ref={titleRef}
            tabIndex={-1}
            className="section-title"
          >
            Intake form unavailable
          </h2>
          <FormError message="Could not load this intake. Refresh its preview before assigning." />
          <Button
            isPending={query.isFetching}
            onPress={() => {
              query.refetch();
            }}
          >
            Retry form
          </Button>
          {changeLink}
        </Surface>
      ) : !template ? (
        <p role="status">Loading intake form…</p>
      ) : template.status !== 'active' || template.purpose !== 'intake' ? (
        <Surface className="space-y-4">
          <h2
            ref={titleRef}
            tabIndex={-1}
            className="section-title"
          >
            Choose another intake
          </h2>
          <p>This form is no longer available as an intake. Choose an active Intake form.</p>
          {changeLink}
        </Surface>
      ) : (
        <>
          <Surface className="space-y-4">
            <div>
              <h2
                ref={titleRef}
                tabIndex={-1}
                className="wrap-anywhere text-xl font-semibold"
              >
                {template.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {template.question_count} {template.question_count === 1 ? 'question' : 'questions'}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              This becomes the client's intake in their app. It will not replace an existing intake.
            </p>
            <FormPreview values={template} />
          </Surface>
          <div
            ref={feedbackRef}
            tabIndex={-1}
            className="space-y-3"
          >
            {notice && (
              <p
                role={uncertain || save.isError ? 'alert' : 'status'}
                className="text-sm"
              >
                {notice}
              </p>
            )}
            {uncertain && (
              <Button
                variant="outline"
                isPending={checking}
                onPress={checkSaved}
              >
                Check saved intake
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button
              isPending={save.isPending}
              isDisabled={uncertain || checking || query.isFetching}
              onPress={async () => {
                const sessionId = getSession()?.id;
                setNotice('');
                try {
                  await save.mutateAsync({form_template_id: template.id});
                  if (getSession()?.id === sessionId) {
                    onAssigned();
                  }
                } catch (error) {
                  if (!mounted.current || getSession()?.id !== sessionId) {
                    return;
                  }
                  const unknown = !(error instanceof ApiError) || error.status >= 500;
                  setUncertain(unknown);
                  setNotice(
                    unknown
                      ? 'The assignment could not be confirmed. Check the saved intake before trying again.'
                      : errorMessage(error, 'Could not assign this intake. Your choice is still here.'),
                  );
                }
              }}
            >
              Assign intake
            </Button>
            {!save.isPending && !uncertain && changeLink}
          </div>
        </>
      )}
    </div>
  );
}
