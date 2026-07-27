import {Fieldset, ListBox, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {useParams} from 'react-router-dom';
import {z} from 'zod';

import {BackButton} from '@/@components/back-button';
import DateInput from '@/@components/date-input';
import {ErrorState} from '@/@components/error-state';
import {FieldRow, FormActions, FormLayout, FormSelectField, FormTextField} from '@/@components/form-fields';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetClientQuery, useUpdateClientMutation} from '@/api/clients';
import {applyFormErrors} from '@/api/shared';
import {useGetTeamQuery, useReassignClientMutation} from '@/api/team';

/**
 * CD-ED — edit a client. A NEW screen: the design specifies it, and
 * CLIENT-DETAIL.md claimed `clients/edit-client.tsx` already existed, which it did
 * not. No backend work was needed — every field is served by an existing endpoint.
 *
 * The seven fields land on TWO mutations, which is the only real complexity here:
 * name / phone / email / subscription dates go through `updateClient`, while the
 * assigned trainer is its own `reassignClient` call. So `onSubmit` issues the
 * reassignment only when that field actually changed — sending it unconditionally
 * would reassign a client to the coach they already have on every save, and each
 * reassignment is a real event on the client's history.
 */
const editClientSchema = z.object({
  assigned_coach_id: z.string(),
  email: z.string().email('Enter a valid email').or(z.literal('')),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string(),
  phone: z.string(),
  subscription_ends_on: z.string(),
  subscription_started_on: z.string(),
});

type EditClientValues = z.infer<typeof editClientSchema>;

export default function EditClient() {
  const {id = ''} = useParams<{id: string}>();
  const goBack = useGoBack(ROUTES.CLIENT_DETAILS.replace(':id', id));
  const {data, isError, isLoading, refetch} = useGetClientQuery(id);
  const team = useGetTeamQuery();
  const updateClientMutation = useUpdateClientMutation();
  const reassignClientMutation = useReassignClientMutation();

  const client = data?.data;
  const form = useForm<EditClientValues>({
    resolver: zodResolver(editClientSchema),
    values: client
      ? {
          assigned_coach_id: client.assigned_coach_id ?? '',
          email: client.email ?? '',
          first_name: client.first_name ?? '',
          last_name: client.last_name ?? '',
          phone: client.phone ?? '',
          subscription_ends_on: client.subscription_ends_on ?? '',
          subscription_started_on: client.subscription_started_on ?? '',
        }
      : undefined,
  });

  const header = (
    <Page.Header size="content">
      <Page.TitleGroup className="flex items-center gap-1">
        <BackButton onPress={goBack} />
        <Page.Title>Edit client</Page.Title>
      </Page.TitleGroup>
    </Page.Header>
  );

  // `team.isLoading` is in here deliberately. The trainer Select resolves its
  // selected key against its ITEMS, so rendering it before the team list arrives
  // leaves it showing the placeholder even though the client has an assigned
  // coach — and it does not recover when the items land. Rowan White reproduced
  // this exactly. The form cannot be correctly populated until both have loaded.
  if (isLoading || team.isLoading) {
    return (
      <Page>
        {header}
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
  if (isError || !client) {
    return (
      <Page>
        {header}
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

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateClientMutation.mutateAsync({
        body: {
          email: values.email || null,
          first_name: values.first_name,
          last_name: values.last_name,
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

  const trainers = (team.data?.data ?? []).filter((member) => member.status === 'active');

  return (
    <Page>
      {header}
      <Page.Content bare>
        <Page.Frame
          className="pt-4 pb-6"
          size="content"
        >
          <FormLayout onSubmit={onSubmit}>
            <Fieldset>
              <Fieldset.Legend>Profile</Fieldset.Legend>
              <FieldRow>
                <FormTextField
                  control={form.control}
                  isRequired
                  label="First name"
                  name="first_name"
                />
                <FormTextField
                  control={form.control}
                  label="Last name"
                  name="last_name"
                />
              </FieldRow>
              <FieldRow>
                <FormTextField
                  control={form.control}
                  inputProps={{type: 'tel'}}
                  label="Phone"
                  name="phone"
                />
                <FormTextField
                  control={form.control}
                  inputProps={{type: 'email'}}
                  label="Email"
                  name="email"
                />
              </FieldRow>
            </Fieldset>

            {/* Reassignment is owner-only on the backend (`Coaches.list_team` and
                `reassign` both `ensure_owner`), so a non-owner sees 403 and an empty
                trainer list. Offering the picker anyway would be a control that
                cannot work — say why instead. */}
            <Fieldset>
              <Fieldset.Legend>Coach</Fieldset.Legend>
              <FormSelectField
                control={form.control}
                description={
                  team.isError
                    ? 'Only the business owner can reassign clients.'
                    : 'Reassigns this client to the selected trainer.'
                }
                isDisabled={team.isError}
                label="Assigned trainer"
                name="assigned_coach_id"
                placeholder={team.isError ? 'Not available' : 'Select a trainer…'}
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
                    </ListBox.Item>
                  );
                })}
              </FormSelectField>
            </Fieldset>

            {/* The design rules a hairline off above the subscription block — it is
                the boundary between who the client is and what they are paying for.
                On a WRAPPER, not on the `Fieldset`: a `<legend>` inside a bordered
                `<fieldset>` notches the border, so the rule came out running from the
                right of the word "Subscription" instead of above it. */}
            <div className="border-t border-border pt-4">
              <Fieldset>
                <Fieldset.Legend>Subscription</Fieldset.Legend>
                <Typography
                  className="mb-3"
                  color="muted"
                  type="body-xs"
                >
                  Billing is per seat — manage seats in Billing.
                </Typography>
                <FieldRow>
                  <DateInput
                    label="Subscription start"
                    onChange={(value) => form.setValue('subscription_started_on', value ?? '', {shouldDirty: true})}
                    value={form.watch('subscription_started_on') || null}
                  />
                  <DateInput
                    label="Subscription end"
                    onChange={(value) => form.setValue('subscription_ends_on', value ?? '', {shouldDirty: true})}
                    value={form.watch('subscription_ends_on') || null}
                  />
                </FieldRow>
              </Fieldset>
            </div>

            <FormActions
              isSubmitting={form.formState.isSubmitting}
              onCancel={goBack}
              submitLabel="Save changes"
              submittingLabel="Saving…"
            />
          </FormLayout>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
