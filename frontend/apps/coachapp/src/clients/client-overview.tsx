import {RefreshCw} from 'lucide-react';
import {useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {useClientIntake, useFormSubmissions} from '../api/forms';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {useListLocation} from '../ui/list-location';
import {Page, PageHeader, Surface} from '../ui/page';
import {ClientIntake} from './client-intake';
import {ClientInvitation} from './client-invitation';

export function ClientOverview() {
  const {id = ''} = useParams();
  return (
    <Overview
      key={id}
      id={id}
    />
  );
}

function Overview({id}: {id: string}) {
  const {to: listLocation} = useListLocation(routes.home);
  const client = useClient(id);
  const assignments = useClientIntake(id);
  const intake = assignments.data?.data;
  const submittedId = intake && (intake.latest_submission || intake.status === 'completed') ? intake.id : undefined;
  const submissions = useFormSubmissions(submittedId);
  const refresh = () => {
    client.refetch();
    assignments.refetch();
    if (submittedId) {
      submissions.refetch();
    }
  };
  if (!client.isSuccess) {
    return (
      <Page>
        <PageHeader
          title={
            client.isPending
              ? 'Client overview'
              : client.error instanceof ApiError && client.error.status === 404
                ? 'Client not found'
                : "Couldn't load client"
          }
          back={{to: listLocation, label: 'Back to clients'}}
        />
        <Surface>
          {client.isPending ? (
            <p
              role="status"
              className="py-8 text-muted-foreground"
            >
              Loading client…
            </p>
          ) : (
            <div className="space-y-4">
              <FormError message={errorMessage(client.error, 'Check your connection and try again.')} />
              <Button
                variant="outline"
                onPress={refresh}
              >
                Try again
              </Button>
            </div>
          )}
        </Surface>
      </Page>
    );
  }
  const person = client.data.data;
  return (
    <Page>
      <PageHeader
        title={
          `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.email || person.phone || 'Client'
        }
        description={
          <>
            <span className="block text-xs font-medium uppercase tracking-wider">Client overview</span>
            <span className="mt-1 block">{person.email || person.phone}</span>
          </>
        }
        back={{to: listLocation, label: 'Back to clients'}}
        actions={
          <Button
            variant="outline"
            isPending={client.isFetching || assignments.isFetching || submissions.isFetching}
            onPress={refresh}
          >
            <RefreshCw aria-hidden="true" />
            Refresh status
          </Button>
        }
      />
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-8">
        <aside
          className="min-w-0 space-y-6"
          aria-label="Client summary"
        >
          <ClientInvitation person={person} />
        </aside>
        <section
          className="min-w-0 space-y-5"
          aria-label="Client intake"
        >
          {assignments.isPending ? (
            <Surface>
              <p
                role="status"
                className="py-8 text-muted-foreground"
              >
                Loading intake…
              </p>
            </Surface>
          ) : assignments.isError ? (
            <Surface className="space-y-4">
              <h2 className="section-title">Intake unavailable</h2>
              <FormError
                message={errorMessage(assignments.error, "We couldn't load the assigned intake. Please try again.")}
              />
              <Button
                variant="outline"
                onPress={refresh}
              >
                Retry intake
              </Button>
            </Surface>
          ) : intake ? (
            <ClientIntake
              key={intake.id}
              assignment={intake}
              person={person}
              submissions={submissions}
            />
          ) : (
            <Surface>
              <h2 className="section-title">No intake assigned</h2>
              <p className="mt-2 text-sm text-muted-foreground">There is no intake form for this client yet.</p>
            </Surface>
          )}
        </section>
      </div>
    </Page>
  );
}
