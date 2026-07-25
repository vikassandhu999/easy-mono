import {getInitials} from '@easy/utils';
import {AlertDialog, Avatar, Button, Typography, useOverlayState} from '@heroui/react';
import {useNavigate, useParams} from 'react-router-dom';

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
import {formatDayMonth, formatWeight} from '@/clients/lib/client-detail-data';

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
  const [updateClient, {isLoading: isSaving}] = useUpdateClientMutation();
  const confirmState = useOverlayState();

  const header = (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center gap-1">
        <BackButton onPress={goBack} />
        <Page.Title>Details &amp; settings</Page.Title>
      </Page.TitleGroup>
      <Page.Toolbar size="content">
        <Button
          onPress={() => navigate(ROUTES.CLIENT_EDIT.replace(':id', id))}
          variant="outline"
        >
          Edit
        </Button>
      </Page.Toolbar>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header}
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
            <PageSkeleton />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }
  if (isError || !data) {
    return (
      <Page>
        {header}
        <Page.Content bare>
          <Page.Frame className="pt-4 pb-6">
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
  const isInactive = client.status === 'inactive';

  const setStatus = async (status: 'active' | 'inactive') => {
    try {
      await updateClient({body: {status}, id: client.id}).unwrap();
    } catch (err) {
      toastMutationError(err, "The client's status wasn't changed. Try again.");
    }
  };

  return (
    <Page>
      {header}
      <Page.Content bare>
        <Page.Frame className="flex flex-col gap-4 pt-4 pb-6">
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
              value={formatDayMonth(client.inserted_at.slice(0, 10))}
            />
          </SectionCard>

          <SectionCard
            divided
            title="Subscription"
          >
            <Fact
              label="Started"
              value={client.subscription_started_on ? formatDayMonth(client.subscription_started_on) : null}
            />
            <Fact
              label="Ends"
              value={client.subscription_ends_on ? formatDayMonth(client.subscription_ends_on) : null}
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
                Billing is per seat — manage seats in Billing.
              </Typography>
            </div>
          </SectionCard>

          <SectionCard title="Coach">
            <div className="flex items-center gap-3 px-4 pb-4">
              <Avatar className="size-10 shrink-0">
                <Avatar.Fallback className="type-eyebrow font-semibold">
                  {getInitials(coach?.first_name ?? null, coach?.last_name ?? null) || '—'}
                </Avatar.Fallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Typography
                  truncate
                  type="body-sm"
                  weight="semibold"
                >
                  {[coach?.first_name, coach?.last_name].filter(Boolean).join(' ') || coach?.email || 'Unassigned'}
                </Typography>
                <span className="eyebrow">Assigned coach</span>
              </div>
              <Button
                onPress={() => navigate(ROUTES.CLIENT_EDIT.replace(':id', id))}
                size="sm"
                variant="outline"
              >
                Change
              </Button>
            </div>
          </SectionCard>

          <SectionCard>
            <DetailRow
              meta={client.intake_incomplete ? 'Not submitted yet' : 'View answers'}
              title="Intake responses"
              to={ROUTES.CLIENT_INTAKE.replace(':id', id)}
            />
          </SectionCard>

          <SectionCard>
            <div className="p-4">
              {isInactive ? (
                <Button
                  isPending={isSaving}
                  onPress={() => setStatus('active')}
                  variant="outline"
                >
                  Reactivate client
                </Button>
              ) : (
                // A confirm, not a straight press: it removes the client's app
                // access. Same AlertDialog composition as `plan-actions-menu`, the
                // app's existing destructive confirm.
                <>
                  <Button
                    onPress={() => confirmState.open()}
                    variant="danger-soft"
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
          </SectionCard>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

/** A label/value row. An absent value is an em dash, never a blank row. */
function Fact({label, value}: {label: string; value: Client['email']}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="eyebrow w-28 shrink-0">{label}</span>
      <Typography
        className="min-w-0 flex-1"
        truncate
        type="body-sm"
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
