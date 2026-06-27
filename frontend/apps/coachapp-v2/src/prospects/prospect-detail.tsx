import {Alert, Button, Chip, Spinner, Typography, toast} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGetLandingPageQuery} from '@/api/landing-page';
import {
  PROSPECT_STATUS_CHIP,
  PROSPECT_STATUS_LABEL,
  type ProspectStatus,
  useGetProspectQuery,
  useUpdateProspectMutation,
} from '@/api/prospects';
import {getApiErrorMessage} from '@/api/shared';
import SectionHeading from '@/settings/components/section-heading';

function Card({children}: {children: React.ReactNode}) {
  return <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">{children}</div>;
}

function Field({label, value}: {label: string; value: React.ReactNode}) {
  return (
    <div className="flex gap-3 py-1.5">
      <Typography
        className="w-28 shrink-0"
        color="muted"
        type="body-sm"
      >
        {label}
      </Typography>
      <div className="min-w-0 flex-1 text-sm">{value}</div>
    </div>
  );
}

export default function ProspectDetail() {
  const {id = ''} = useParams();
  const navigate = useNavigate();
  const {data, isError, isLoading, refetch} = useGetProspectQuery({id});
  const {data: pageData} = useGetLandingPageQuery();
  const [update, {isLoading: isUpdating}] = useUpdateProspectMutation();

  const prospect = data?.data;
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (prospect) {
      setNotes(prospect.notes ?? '');
    }
  }, [prospect]);

  const questionLabels = new Map((pageData?.data?.application_questions ?? []).map((q) => [q.id ?? '', q.label ?? '']));

  const setStatus = async (status: ProspectStatus) => {
    if (!prospect) {
      return;
    }
    try {
      await update({id, prospectUpdateRequest: {status, notes: prospect.notes}}).unwrap();
      toast.success(`Marked ${PROSPECT_STATUS_LABEL[status].toLowerCase()}`);
    } catch (error) {
      toast.danger(getApiErrorMessage(error, "Couldn't update prospect"));
    }
  };

  const saveNotes = async () => {
    if (!prospect) {
      return;
    }
    try {
      await update({id, prospectUpdateRequest: {status: prospect.status, notes: notes.trim() || null}}).unwrap();
      toast.success('Notes saved');
    } catch (error) {
      toast.danger(getApiErrorMessage(error, "Couldn't save notes"));
    }
  };

  const header = (
    <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
      <button
        className="mb-2 flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
        onClick={() => navigate(ROUTES.PROSPECTS)}
        type="button"
      >
        <ArrowLeft size={16} /> Prospects
      </button>
      <Page.TitleGroup>
        <Page.Title>{prospect?.name ?? 'Prospect'}</Page.Title>
      </Page.TitleGroup>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header}
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !prospect) {
    return (
      <Page>
        {header}
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl pt-4">
            <Alert status="danger">
              <Alert.Content>
                <Alert.Title>Couldn't load this prospect.</Alert.Title>
              </Alert.Content>
              <Button
                onPress={() => refetch()}
                size="sm"
                variant="secondary"
              >
                Retry
              </Button>
            </Alert>
          </div>
        </Page.Content>
      </Page>
    );
  }

  const answers = Object.entries(prospect.answers ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== '');
  const enrolled = Boolean(prospect.client);

  return (
    <Page>
      {header}
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-6 pt-2">
          {/* Status + actions */}
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Chip
                color={PROSPECT_STATUS_CHIP[prospect.status]}
                variant="soft"
              >
                {PROSPECT_STATUS_LABEL[prospect.status]}
              </Chip>
              {prospect.program ? (
                <Typography
                  color="muted"
                  type="body-sm"
                >
                  Interested in {prospect.program.name}
                </Typography>
              ) : null}
            </div>

            {enrolled ? (
              <div className="flex flex-col gap-2">
                <Typography
                  color="muted"
                  type="body-sm"
                >
                  Enrolled as a client.
                </Typography>
                <Button
                  className="self-start"
                  onPress={() => navigate(ROUTES.CLIENT_DETAIL.replace(':id', prospect.client?.id ?? ''))}
                  size="sm"
                  variant="secondary"
                >
                  View client
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {prospect.status === 'new' ? (
                  <Button
                    isDisabled={isUpdating}
                    onPress={() => setStatus('reviewing')}
                    size="sm"
                    variant="secondary"
                  >
                    Mark reviewing
                  </Button>
                ) : null}
                <Button
                  isDisabled={isUpdating}
                  onPress={() => navigate(ROUTES.ENROLL_PROSPECT.replace(':id', prospect.id))}
                  size="sm"
                >
                  Enroll
                </Button>
                {prospect.status !== 'lost' ? (
                  <Button
                    isDisabled={isUpdating}
                    onPress={() => setStatus('lost')}
                    size="sm"
                    variant="ghost"
                  >
                    Mark lost
                  </Button>
                ) : null}
              </div>
            )}
          </Card>

          {/* Contact */}
          <section>
            <SectionHeading title="Contact" />
            <Card>
              <Field
                label="Name"
                value={prospect.name}
              />
              {prospect.phone ? (
                <Field
                  label="Phone"
                  value={
                    <a
                      className="text-accent"
                      href={`tel:${prospect.phone}`}
                    >
                      {prospect.phone}
                    </a>
                  }
                />
              ) : null}
              {prospect.email ? (
                <Field
                  label="Email"
                  value={
                    <a
                      className="text-accent"
                      href={`mailto:${prospect.email}`}
                    >
                      {prospect.email}
                    </a>
                  }
                />
              ) : null}
              {prospect.instagram ? (
                <Field
                  label="Instagram"
                  value={prospect.instagram}
                />
              ) : null}
              {prospect.landing_page_slug ? (
                <Field
                  label="Source"
                  value={`/${prospect.landing_page_slug}`}
                />
              ) : null}
            </Card>
          </section>

          {/* Answers */}
          {answers.length > 0 ? (
            <section>
              <SectionHeading title="Answers" />
              <Card>
                <div className="flex flex-col gap-3">
                  {answers.map(([qid, value]) => (
                    <div key={qid}>
                      <Typography
                        color="muted"
                        type="body-xs"
                      >
                        {questionLabels.get(qid) || qid}
                      </Typography>
                      <Typography type="body-sm">{String(value)}</Typography>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          ) : null}

          {/* Notes */}
          <section>
            <SectionHeading title="Notes" />
            <Card>
              <textarea
                className="min-h-20 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-muted"
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Private notes about this prospect."
                value={notes}
              />
              <Button
                className="mt-2"
                isDisabled={isUpdating || notes === (prospect.notes ?? '')}
                onPress={saveNotes}
                size="sm"
                variant="secondary"
              >
                Save notes
              </Button>
            </Card>
          </section>
        </div>
      </Page.Content>
    </Page>
  );
}
