import {AlertDialog, Button, Description, ErrorMessage, Fieldset, ListBox, useOverlayState} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {useParams} from 'react-router-dom';
import {z} from 'zod';

import {BackButton} from '@/@components/back-button';
import DateInput from '@/@components/date-input';
import {ErrorState} from '@/@components/error-state';
import {FieldRow} from '@/@components/form-fields/field-row';
import {FormActions} from '@/@components/form-fields/form-actions';
import {RESPONSIVE_FORM_SECTION_CLASS} from '@/@components/form-fields/form-classes';
import {FormLayout} from '@/@components/form-fields/form-layout';
import {FormSelectField} from '@/@components/form-fields/form-select-field';
import {FormTextField} from '@/@components/form-fields/form-text-field';
import {toastMutationError} from '@/@components/mutation-toast';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import type {Client} from '@/api/clients';
import {useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {applyFormErrors} from '@/api/shared';
import type {TeamMember} from '@/api/team';
import {useGetTeamQuery, useReassignClientMutation} from '@/api/team';
import {subscriptionDatesAreOrdered} from '@/clients/lib/client';

/**
 * Profile and subscription fields share the client update endpoint; coach
 * assignment is a separate lifecycle event and is sent only when it changes.
 */
const editClientSchema = z
  .object({
    assigned_coach_id: z.string(),
    email: z.string().email('Enter a valid email').or(z.literal('')),
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string(),
    phone: z.string(),
    subscription_ends_on: z.string(),
    subscription_started_on: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!subscriptionDatesAreOrdered(values.subscription_started_on, values.subscription_ends_on)) {
      ctx.addIssue({
        code: 'custom',
        message: 'End date must be on or after the start date',
        path: ['subscription_ends_on'],
      });
    }
  });

type EditClientValues = z.infer<typeof editClientSchema>;

export default function EditClient() {
  const {id = ''} = useParams<{id: string}>();
  const backPath = ROUTES.CLIENT_DETAIL.replace(':id', id);
  const goBack = useGoBack(backPath);
  const {data, isError, isLoading, refetch} = useGetClientQuery(id);
  const team = useGetTeamQuery();

  const header = <EditClientHeader onBack={goBack} />;

  // `team.isLoading` is in here deliberately. The trainer Select resolves its
  // selected key against its ITEMS, so rendering it before the team list arrives
  // leaves it showing the placeholder even though the client has an assigned
  // coach — and it does not recover when the items land. Rowan White reproduced
  // this exactly. The form cannot be correctly populated until both have loaded.
  if (isLoading || team.isLoading) {
    return (
      <Page>
        {header}
        <Page.Content
          bare
          className="pt-4 pb-6"
        >
          <Page.Frame size="content">
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
        <Page.Content
          bare
          className="pt-4 pb-6"
        >
          <Page.Frame size="content">
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

  return (
    <EditClientForm
      backPath={backPath}
      canManageTeam={!team.isError}
      client={client}
      key={client.id}
      trainers={(team.data?.data ?? []).filter((member) => member.status === 'active')}
    />
  );
}

function EditClientHeader({onBack}: {onBack: () => void}) {
  return (
    <Page.Header size="content">
      <Page.TitleGroup>
        <div className="flex items-center">
          <BackButton onPress={onBack} />
          <Page.Title>Edit client</Page.Title>
        </div>
        <Page.Description>Update contact, coaching, subscription, and access details.</Page.Description>
      </Page.TitleGroup>
    </Page.Header>
  );
}

function EditClientForm({
  backPath,
  canManageTeam,
  client,
  trainers,
}: {
  backPath: string;
  canManageTeam: boolean;
  client: Client;
  trainers: TeamMember[];
}) {
  const goBack = useGoBack(backPath);
  const updateClientMutation = useUpdateClientMutation();
  const reassignClientMutation = useReassignClientMutation();
  const deactivateConfirm = useOverlayState();
  const leaveConfirm = useOverlayState();
  const form = useForm<EditClientValues>({
    resolver: zodResolver(editClientSchema),
    defaultValues: {
      assigned_coach_id: client.assigned_coach_id ?? '',
      email: client.email ?? '',
      first_name: client.first_name ?? '',
      last_name: client.last_name ?? '',
      phone: client.phone ?? '',
      subscription_ends_on: client.subscription_ends_on ?? '',
      subscription_started_on: client.subscription_started_on ?? '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateClientMutation.mutateAsync({
        body: {
          email: values.email || null,
          ...(client.status === 'pending' && {
            first_name: values.first_name,
            last_name: values.last_name,
          }),
          phone: values.phone || null,
          subscription_ends_on: values.subscription_ends_on || null,
          subscription_started_on: values.subscription_started_on || null,
        },
        id: client.id,
      });

      // Only when it changed — see the note on the module.
      if (values.assigned_coach_id && values.assigned_coach_id !== (client.assigned_coach_id ?? '')) {
        await reassignClientMutation.mutateAsync({body: {coach_id: values.assigned_coach_id}, clientId: client.id});
      }
      goBack();
    } catch (err) {
      applyFormErrors(err, "The client wasn't saved. Check the details and try again", form.setError);
    }
  });

  const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'this client';
  const isBusy = form.formState.isSubmitting || updateClientMutation.isPending || reassignClientMutation.isPending;
  const hasUnsavedChanges = form.formState.isDirty;
  const attemptLeave = () => {
    if (hasUnsavedChanges) {
      leaveConfirm.open();
      return;
    }
    goBack();
  };
  const setStatus = async (status: 'active' | 'inactive') => {
    try {
      await updateClientMutation.mutateAsync({body: {status}, id: client.id});
      return true;
    } catch (err) {
      toastMutationError(err, "The client's status wasn't changed. Try again.");
      return false;
    }
  };

  return (
    <Page>
      <EditClientHeader onBack={attemptLeave} />
      <Page.Content
        bare
        className="pt-4 pb-6"
      >
        <Page.Frame size="content">
          <FormLayout onSubmit={onSubmit}>
            <div className={RESPONSIVE_FORM_SECTION_CLASS}>
              <Fieldset>
                <Fieldset.Legend>Profile</Fieldset.Legend>
                <Description>
                  {client.status === 'pending'
                    ? 'Update the invitation name and contact details.'
                    : 'Update contact details. The client manages their name from their account.'}
                </Description>
                <Fieldset.Group>
                  <FieldRow>
                    <FormTextField
                      control={form.control}
                      fullWidth
                      isDisabled={client.status !== 'pending'}
                      isRequired
                      label="First name"
                      name="first_name"
                    />
                    <FormTextField
                      control={form.control}
                      fullWidth
                      isDisabled={client.status !== 'pending'}
                      label="Last name"
                      name="last_name"
                    />
                  </FieldRow>
                  <FieldRow>
                    <FormTextField
                      control={form.control}
                      fullWidth
                      inputProps={{type: 'tel'}}
                      label="Phone"
                      name="phone"
                    />
                    <FormTextField
                      control={form.control}
                      fullWidth
                      inputProps={{type: 'email'}}
                      label="Email"
                      name="email"
                    />
                  </FieldRow>
                </Fieldset.Group>
              </Fieldset>

              <div className="my-6 border-t border-separator" />

              {/* Reassignment is owner-only on the backend (`Coaches.list_team` and
            `reassign` both `ensure_owner`), so a non-owner sees 403 and an empty
            trainer list. Offering the picker anyway would be a control that
            cannot work — say why instead. */}
              <Fieldset>
                <Fieldset.Legend>Coach</Fieldset.Legend>
                <Description>
                  {canManageTeam
                    ? 'Choose the trainer responsible for this client.'
                    : 'Only the business owner can reassign clients.'}
                </Description>
                <Fieldset.Group>
                  <FormSelectField
                    control={form.control}
                    fullWidth
                    isDisabled={!canManageTeam}
                    label="Assigned trainer"
                    name="assigned_coach_id"
                    placeholder={canManageTeam ? 'Select a trainer…' : 'Not available'}
                  >
                    {trainers.map((member) => {
                      const label =
                        [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'Trainer';
                      return (
                        <ListBox.Item
                          id={member.id}
                          key={member.id}
                          textValue={label}
                        >
                          {label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      );
                    })}
                  </FormSelectField>
                </Fieldset.Group>
              </Fieldset>

              <div className="my-6 border-t border-separator" />

              <Fieldset>
                <Fieldset.Legend>Subscription</Fieldset.Legend>
                <Description>Set the coaching period. Billing and seats are managed in Billing.</Description>
                <Fieldset.Group>
                  <FieldRow>
                    <DateInput
                      label="Subscription start"
                      onChange={(value) => form.setValue('subscription_started_on', value ?? '', {shouldDirty: true})}
                      value={form.watch('subscription_started_on') || null}
                    />
                    <DateInput
                      errorMessage={form.formState.errors.subscription_ends_on?.message}
                      label="Subscription end"
                      onChange={(value) => form.setValue('subscription_ends_on', value ?? '', {shouldDirty: true})}
                      value={form.watch('subscription_ends_on') || null}
                    />
                  </FieldRow>
                </Fieldset.Group>
              </Fieldset>

              <div className="my-6 border-t border-separator" />

              <Fieldset>
                <Fieldset.Legend>Client access</Fieldset.Legend>
                <Description>
                  {client.status === 'inactive'
                    ? 'Reactivate this client to restore app access.'
                    : 'Deactivating removes app access but keeps the client history.'}
                </Description>
                <Fieldset.Group>
                  <div>
                    {client.status === 'inactive' ? (
                      <Button
                        isDisabled={form.formState.isSubmitting || reassignClientMutation.isPending}
                        isPending={updateClientMutation.isPending}
                        onPress={() => setStatus('active')}
                        type="button"
                        variant="primary"
                      >
                        Reactivate client
                      </Button>
                    ) : (
                      <Button
                        className="border border-danger-soft bg-transparent text-danger-soft-foreground"
                        isDisabled={isBusy}
                        onPress={() => deactivateConfirm.open()}
                        type="button"
                        variant="outline"
                      >
                        Deactivate client
                      </Button>
                    )}
                  </div>
                  <AlertDialog.Backdrop
                    isDismissable={!isBusy}
                    isOpen={deactivateConfirm.isOpen}
                    onOpenChange={deactivateConfirm.setOpen}
                    variant="transparent"
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
                            isDisabled={isBusy}
                            slot="close"
                            type="button"
                            variant="tertiary"
                          >
                            Cancel
                          </Button>
                          <Button
                            isPending={updateClientMutation.isPending}
                            onPress={async () => {
                              if (await setStatus('inactive')) {
                                deactivateConfirm.close();
                              }
                            }}
                            type="button"
                            variant="danger"
                          >
                            Deactivate
                          </Button>
                        </AlertDialog.Footer>
                      </AlertDialog.Dialog>
                    </AlertDialog.Container>
                  </AlertDialog.Backdrop>
                </Fieldset.Group>
              </Fieldset>
            </div>

            {form.formState.errors.root && <ErrorMessage>{form.formState.errors.root.message}</ErrorMessage>}

            <FormActions
              isSubmitting={form.formState.isSubmitting}
              onCancel={attemptLeave}
              submitLabel="Save changes"
              submittingLabel="Saving changes"
            />
          </FormLayout>
        </Page.Frame>
      </Page.Content>

      <AlertDialog.Backdrop
        isOpen={leaveConfirm.isOpen}
        onOpenChange={leaveConfirm.setOpen}
        variant="transparent"
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>Discard changes?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>You have unsaved changes. Leaving now will discard them.</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                slot="close"
                type="button"
                variant="tertiary"
              >
                Keep editing
              </Button>
              <Button
                onPress={() => {
                  leaveConfirm.close();
                  goBack();
                }}
                type="button"
                variant="danger"
              >
                Discard
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </Page>
  );
}
