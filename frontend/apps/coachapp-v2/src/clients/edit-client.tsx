import {
  AlertDialog,
  Button,
  Description,
  ErrorMessage,
  Fieldset,
  ListBox,
  Separator,
  Surface,
  Typography,
  useOverlayState,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {TriangleAlert} from 'lucide-react';
import {Controller, useForm} from 'react-hook-form';

import {z} from 'zod';
import type {Client} from '@/api/clients';
import {useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {applyFormErrors} from '@/api/shared';
import type {TeamMember} from '@/api/team';
import {useGetTeamQuery, useReassignClientMutation} from '@/api/team';
import {isUnclassified} from '@/clients/client';
import RequiredServicesField, {
  nonEmptyRequiredServices,
  REQUIRED_SERVICE_VALUES,
} from '@/clients/client-required-services-field';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {ErrorState} from '@/ui/error-state';
import {FieldRow} from '@/ui/field-row';
import {FormActions} from '@/ui/form-actions';
import {FormLayout} from '@/ui/form-layout';
import {FormPanel} from '@/ui/form-panel';
import {FormSelectField} from '@/ui/form-select-field';
import {FormTextField} from '@/ui/form-text-field';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import {useGoBack} from '@/ui/use-go-back';
import {useRouteParam} from '@/ui/use-route-param';

/**
 * Profile fields share the client update endpoint; coach assignment is a
 * separate lifecycle event and is sent only when it changes. Coaching period
 * and pause/reactivate live on Client Detail (access strip + Manage sheet).
 */
const editClientSchema = z.object({
  assigned_coach_id: z.string(),
  email: z.string().email('Enter a valid email').or(z.literal('')),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string(),
  phone: z.string(),
  required_services: z.array(z.enum(REQUIRED_SERVICE_VALUES)),
});

const acceptedClientEditSchema = editClientSchema.extend({
  required_services: z.array(z.enum(REQUIRED_SERVICE_VALUES)).min(1, 'Choose at least one coaching service'),
});

type EditClientValues = z.infer<typeof editClientSchema>;

export default function EditClient() {
  const id = useRouteParam('id');
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
        <Page.Description>Update contact details and the assigned coach.</Page.Description>
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
  const leaveConfirm = useOverlayState();
  const form = useForm<EditClientValues>({
    resolver: zodResolver(client.status === 'pending' ? editClientSchema : acceptedClientEditSchema),
    defaultValues: {
      assigned_coach_id: client.assigned_coach_id ?? '',
      email: client.email ?? '',
      first_name: client.first_name ?? '',
      last_name: client.last_name ?? '',
      phone: client.phone ?? '',
      required_services: [...client.required_services],
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const requiredServices = nonEmptyRequiredServices(values.required_services);
      await updateClientMutation.mutateAsync({
        body: {
          email: values.email || null,
          ...(client.status === 'pending' && {
            first_name: values.first_name,
            last_name: values.last_name,
          }),
          phone: values.phone || null,
          ...(requiredServices && {required_services: requiredServices}),
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

  const hasUnsavedChanges = form.formState.isDirty;
  const attemptLeave = () => {
    if (hasUnsavedChanges) {
      leaveConfirm.open();
      return;
    }
    goBack();
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
            <FormPanel>
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

              <Separator className="my-6" />

              {isUnclassified(client) ? (
                <Surface className="mb-6 rounded-card border border-warning bg-warning-soft p-4">
                  <div className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
                    <div>
                      <Typography
                        className="text-warning"
                        type="body-sm"
                        weight="semibold"
                      >
                        Coaching services have not been set
                      </Typography>
                      <Typography
                        className="mt-1"
                        color="muted"
                        type="body-sm"
                      >
                        This client is Unclassified, so Programming cannot identify missing work yet.
                      </Typography>
                    </div>
                  </div>
                </Surface>
              ) : null}

              <Controller
                control={form.control}
                name="required_services"
                render={({field, fieldState}) => (
                  <RequiredServicesField
                    description={
                      client.status === 'pending'
                        ? 'Set services now, or leave this empty so the client can choose during intake.'
                        : 'Choose every service this client requires. This can be updated at any time.'
                    }
                    error={fieldState.error?.message}
                    onChange={field.onChange}
                    services={field.value}
                  />
                )}
              />

              <Separator className="my-6" />

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
            </FormPanel>

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
