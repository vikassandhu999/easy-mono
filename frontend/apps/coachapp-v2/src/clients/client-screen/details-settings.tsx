import {getInitials} from '@easy/utils';
import {AlertDialog, Avatar, Button, Typography, useOverlayState} from '@heroui/react';
import {ClipboardList} from 'lucide-react';
import {Link, useNavigate, useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {toastMutationError} from '@/@components/mutation-toast';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import type {Client} from '@/api/clients';
import {useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {useGetTeamQuery} from '@/api/team';
import {DetailRow} from '@/clients/components/detail-row';
import {SectionCard} from '@/clients/components/section-card';
import {formatDayMonthYear, formatWeight} from '@/clients/lib/client-detail-data';

/**
 * CD-DT — everything about the relationship rather than the training: profile
 * facts, the subscription window, who coaches them, and the one destructive action.
 *
 * Read-only by design: every field here is edited on CD-ED. That split is the
 * design's and it is worth keeping — the deleted implementation mixed display and
 * inline editing in 481 lines, which is why nothing on it was reusable.
 */
export default function DetailsSettings() {
  const {id = ''} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.CLIENT_DETAIL.replace(':id', id));
  const {data, isError, isLoading, refetch} = useGetClientQuery(id);
  const team = useGetTeamQuery();
  const updateClientMutation = useUpdateClientMutation();
  const isSaving = updateClientMutation.isPending;
  const confirmState = useOverlayState();

  const header = (subtitle?: string) => (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center gap-1">
        <BackButton onPress={goBack} />
        <div className="min-w-0">
          <Page.Title>Details &amp; settings</Page.Title>
          {subtitle && <Page.Description>{subtitle}</Page.Description>}
        </div>
      </Page.TitleGroup>
      <Page.Actions>
        <Button
          onPress={() => navigate(ROUTES.CLIENT_EDIT.replace(':id', id))}
          variant="outline"
        >
          Edit
        </Button>
      </Page.Actions>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header()}
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }
  if (isError || !data) {
    return (
      <Page>
        {header()}
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <ErrorState
              message="Couldn't load this client."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const client = data.data;
  const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'this client';
  const coach = (team.data?.data ?? []).find((member) => member.id === client.assigned_coach_id);
  // `/v1/coach/team` is owner-only (`Coaches.list_team` calls `ensure_owner`), so a
  // non-owner coach gets 403 and this list is empty. That is NOT the same as the
  // client having no coach — saying "Unassigned" then would be a lie, and offering
  // "Change" would send them to a screen where reassigning 403s too.
  const canManageTeam = !team.isError;
  const isInactive = client.status === 'inactive';

  const setStatus = async (status: 'active' | 'inactive') => {
    try {
      await updateClientMutation.mutateAsync({body: {status}, id: client.id});
    } catch (err) {
      toastMutationError(err, "The client's status wasn't changed. Try again.");
    }
  };

  return (
    <Page>
      {header(name)}
      <Page.Content bare>
        <Page.Frame
          className="flex flex-col gap-4 pt-4 pb-6"
          size="content"
        >
          <SectionCard
            divided
            title="Profile"
          >
            <Fact
              label="Email"
              value={client.email}
            />
            <Fact
              label="Phone"
              value={client.phone}
            />
            <Fact
              label="Goal weight"
              value={
                client.goal_weight_value != null
                  ? formatWeight(client.goal_weight_value, client.goal_weight_unit ?? 'kg', {decimals: 0})
                  : null
              }
            />
            <Fact
              label="Stage"
              value={client.stage === 'onboarding' ? 'Onboarding' : 'Coaching'}
            />
            <Fact
              label="Client since"
              value={formatDayMonthYear(client.inserted_at.slice(0, 10))}
            />
          </SectionCard>

          <SectionCard
            divided
            title="Subscription"
          >
            <Fact
              label="Started"
              value={client.subscription_started_on ? formatDayMonthYear(client.subscription_started_on) : null}
            />
            <Fact
              label="Ends"
              value={client.subscription_ends_on ? formatDayMonthYear(client.subscription_ends_on) : null}
            />
            {/* The design draws two different banners: expiring soon (warning) and
                already expired (danger, "locked out"). `expiring_soon` and the
                inactive reason are both server-decided, so neither is recomputed
                from the dates here. */}
            {client.expiring_soon && client.status === 'active' && (
              <Banner
                tone="warning"
                onAction={() => navigate(ROUTES.CLIENT_EDIT.replace(':id', id))}
              >
                Subscription ends within 7 days.
              </Banner>
            )}
            {client.inactive_reason === 'subscription_expired' && (
              <Banner
                tone="danger"
                onAction={() => navigate(ROUTES.CLIENT_EDIT.replace(':id', id))}
              >
                Subscription ended. {name} is locked out.
              </Banner>
            )}
            <div className="px-4 py-3">
              <Typography
                color="muted"
                type="body-xs"
              >
                Billing is per seat — manage seats in{' '}
                <Link
                  className="font-semibold text-accent"
                  to={ROUTES.SETTINGS_TAB.replace(':tab', 'billing')}
                >
                  Billing
                </Link>
                .
              </Typography>
            </div>
          </SectionCard>

          <SectionCard title="Coach">
            <div className="flex items-center gap-3 px-4 pb-4">
              <Avatar className="size-9.5 shrink-0">
                <Avatar.Fallback className="bg-accent type-eyebrow font-semibold text-accent-foreground">
                  {getInitials(coach?.first_name ?? null, coach?.last_name ?? null) || '—'}
                </Avatar.Fallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Typography
                  truncate
                  type="body-sm"
                  weight="semibold"
                >
                  {[coach?.first_name, coach?.last_name].filter(Boolean).join(' ') ||
                    coach?.email ||
                    (client.assigned_coach_id ? 'Assigned' : 'Unassigned')}
                </Typography>
                {/* `.eyebrow` is for a LABEL; this line is a sentence either way, so
                    it reads as muted body text. */}
                <Typography
                  color="muted"
                  type="body-xs"
                >
                  {canManageTeam ? 'Assigned coach' : 'Only the owner can see the team'}
                </Typography>
              </div>
              {canManageTeam && (
                <Button
                  onPress={() => navigate(ROUTES.CLIENT_EDIT.replace(':id', id))}
                  size="sm"
                  variant="outline"
                >
                  Change
                </Button>
              )}
            </div>
          </SectionCard>

          <SectionCard>
            <DetailRow
              icon={ClipboardList}
              meta={client.intake_incomplete ? 'Not submitted yet' : 'View answers'}
              title="Intake responses"
              to={ROUTES.CLIENT_INTAKE.replace(':id', id)}
            />
          </SectionCard>

          {/* The design leaves this on the page rather than in a card: a card frames
              a section of the client's record, and this is an action on the client. */}
          <div>
            <div>
              {isInactive ? (
                <Button
                  isPending={isSaving}
                  onPress={() => setStatus('active')}
                  variant="primary"
                >
                  Reactivate client
                </Button>
              ) : (
                // A confirm, not a straight press: it removes the client's app
                // access. Same AlertDialog composition as `plan-actions-menu`, the
                // app's existing destructive confirm.
                <>
                  <Button
                    // Danger OUTLINE, as the design draws it — a filled danger button
                    // on an otherwise calm page reads as the primary action.
                    className="border border-danger-soft bg-transparent text-danger-soft-foreground"
                    onPress={() => confirmState.open()}
                    variant="outline"
                  >
                    Deactivate client
                  </Button>
                  <AlertDialog.Backdrop
                    isDismissable={!isSaving}
                    isOpen={confirmState.isOpen}
                    onOpenChange={confirmState.setOpen}
                  >
                    <AlertDialog.Container>
                      <AlertDialog.Dialog>
                        <AlertDialog.CloseTrigger />
                        <AlertDialog.Header>
                          <AlertDialog.Icon status="danger" />
                          <AlertDialog.Heading>Deactivate {name}?</AlertDialog.Heading>
                        </AlertDialog.Header>
                        <AlertDialog.Body>
                          They lose app access. Their history stays and you can reactivate anytime.
                        </AlertDialog.Body>
                        <AlertDialog.Footer>
                          <Button
                            isDisabled={isSaving}
                            slot="close"
                            variant="tertiary"
                          >
                            Cancel
                          </Button>
                          <Button
                            isPending={isSaving}
                            onPress={async () => {
                              await setStatus('inactive');
                              confirmState.close();
                            }}
                            variant="danger"
                          >
                            Deactivate
                          </Button>
                        </AlertDialog.Footer>
                      </AlertDialog.Dialog>
                    </AlertDialog.Container>
                  </AlertDialog.Backdrop>
                </>
              )}
            </div>
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

/**
 * A label/value row. The design reads it as a ledger — plain muted label on the
 * left, the VALUE bold and right-aligned — not an uppercase eyebrow with the value
 * beside it: the column of right-aligned values is what makes the card scannable.
 * An absent value is an em dash, never a blank row.
 */
function Fact({label, value}: {label: string; value: Client['email']}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-3">
      <Typography
        className="shrink-0"
        color="muted"
        type="body-xs"
      >
        {label}
      </Typography>
      <Typography
        className="min-w-0 text-right"
        truncate
        type="body-xs"
        weight="semibold"
      >
        {value || '—'}
      </Typography>
    </div>
  );
}

function Banner({
  children,
  onAction,
  tone,
}: {
  children: React.ReactNode;
  onAction: () => void;
  tone: 'danger' | 'warning';
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 px-4 py-3 ${tone === 'danger' ? 'bg-danger-soft' : 'bg-warning-soft'}`}
    >
      <Typography
        className={`min-w-0 flex-1 ${tone === 'danger' ? 'text-danger-soft-foreground' : 'text-warning-soft-foreground'}`}
        type="body-xs"
      >
        {children}
      </Typography>
      <Button
        onPress={onAction}
        size="sm"
        variant="outline"
      >
        Extend
      </Button>
    </div>
  );
}
