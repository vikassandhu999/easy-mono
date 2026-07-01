import {Alert, Avatar, Button, Chip, Spinner, Typography, toast} from '@heroui/react';
import {ArrowLeft, Mail, Phone} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
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

function SectionHeading({title}: {title: string}) {
  return (
    <Typography
      className="mb-3 uppercase tracking-wider"
      color="muted"
      type="body-xs"
      weight="semibold"
    >
      {title}
    </Typography>
  );
}

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
      <div className="min-w-0 flex-1 text-sm break-words">{value}</div>
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
  // Seed the notes draft only once per prospect (by id). A refetch — e.g. after a
  // status change invalidates the Prospect tag — hands us a new object identity for
  // the same prospect; without the id guard that re-seed would wipe an unsaved draft.
  const seededProspectIdRef = useRef<null | string>(null);
  useEffect(() => {
    if (prospect && seededProspectIdRef.current !== prospect.id) {
      seededProspectIdRef.current = prospect.id;
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

  if (isLoading) {
    return (
      <Page>
        <Page.Header>
          <Page.TitleGroup>
            <div className="flex items-center gap-1">
              <Button
                isIconOnly
                onPress={() => navigate(ROUTES.PROSPECTS)}
                size="md"
                variant="ghost"
              >
                <ArrowLeft size={20} />
              </Button>
              <Page.Title>Prospect</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
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
        <Page.Header>
          <Page.TitleGroup>
            <div className="flex items-center gap-1">
              <Button
                isIconOnly
                onPress={() => navigate(ROUTES.PROSPECTS)}
                size="md"
                variant="ghost"
              >
                <ArrowLeft size={20} />
              </Button>
              <Page.Title>Prospect</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="max-w-4xl pt-4">
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
  const initials = prospect.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Page>
      <Page.Header className="flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:py-8 w-full max-w-6xl">
        <Page.TitleGroup>
          <div className="flex items-center gap-1">
            <Button
              isIconOnly
              onPress={() => navigate(ROUTES.PROSPECTS)}
              size="md"
              variant="ghost"
            >
              <ArrowLeft size={20} />
            </Button>
            <Page.Title>{prospect.name}</Page.Title>
          </div>
        </Page.TitleGroup>
        <Page.Actions className="flex-wrap">
          {enrolled ? (
            <Button
              onPress={() => navigate(ROUTES.CLIENT_DETAIL.replace(':id', prospect.client?.id ?? ''))}
              size="sm"
              variant="secondary"
            >
              View client
            </Button>
          ) : (
            <>
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
            </>
          )}
        </Page.Actions>
      </Page.Header>

      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="max-w-4xl space-y-4">
          {/* Profile hero */}
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  className="size-14 shrink-0"
                  color="accent"
                >
                  <Avatar.Fallback className="text-base">{initials}</Avatar.Fallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Typography
                      truncate
                      type="h5"
                    >
                      {prospect.name}
                    </Typography>
                    <Chip
                      color={PROSPECT_STATUS_CHIP[prospect.status]}
                      size="sm"
                      variant="soft"
                    >
                      {PROSPECT_STATUS_LABEL[prospect.status]}
                    </Chip>
                  </div>
                  {prospect.program ? (
                    <Typography
                      className="mt-0.5"
                      color="muted"
                      truncate
                      type="body-sm"
                    >
                      Interested in {prospect.program.name}
                    </Typography>
                  ) : null}
                </div>
              </div>
              {prospect.phone || prospect.email ? (
                <div className="flex gap-2 sm:ml-auto sm:shrink-0">
                  {prospect.phone ? (
                    <a
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-hover sm:min-h-9 sm:flex-none"
                      href={`tel:${prospect.phone}`}
                    >
                      <Phone size={15} />
                      Call
                    </a>
                  ) : null}
                  {prospect.email ? (
                    <a
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-hover sm:min-h-9 sm:flex-none"
                      href={`mailto:${prospect.email}`}
                    >
                      <Mail size={15} />
                      Email
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>

          {/* Contact details */}
          <section>
            <SectionHeading title="Contact" />
            <Card>
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

          {/* Application answers */}
          {answers.length > 0 ? (
            <section>
              <SectionHeading title="Answers" />
              <Card>
                <div className="flex flex-col gap-4">
                  {answers.map(([qid, value]) => (
                    <div key={qid}>
                      <Typography
                        color="muted"
                        type="body-xs"
                      >
                        {questionLabels.get(qid) || qid}
                      </Typography>
                      <Typography
                        className="break-words"
                        type="body-sm"
                      >
                        {String(value)}
                      </Typography>
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
                className="min-h-24 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-muted"
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
