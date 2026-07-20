import {Button, Fieldset, Typography, toast} from '@heroui/react';
import {useForm} from 'react-hook-form';
import {useNavigate, useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {FieldRow, FormActions, FormLayout, FormTextField} from '@/@components/form-fields';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useEnrollProspectMutation, useGetProspectQuery} from '@/api/prospects';
import {getApiErrorMessage} from '@/api/shared';

type EnrollFormValues = {first_name: string; last_name: string; email: string; phone: string};

function splitName(name: string): {first: string; last: string} {
  const [first = '', ...rest] = name.trim().split(/\s+/);
  return {first, last: rest.join(' ')};
}

export default function EnrollProspect() {
  const {id = ''} = useParams();
  const navigate = useNavigate();
  const {data, isError, isLoading} = useGetProspectQuery({id});
  const [enroll, {isLoading: isEnrolling}] = useEnrollProspectMutation();

  const prospect = data?.data;
  const goBack = () => navigate(ROUTES.PROSPECT_DETAIL.replace(':id', id));

  const nameParts = prospect ? splitName(prospect.name) : {first: '', last: ''};
  const {control, handleSubmit} = useForm<EnrollFormValues>({
    defaultValues: {first_name: '', last_name: '', email: '', phone: ''},
    values: prospect
      ? {
          first_name: nameParts.first,
          last_name: nameParts.last,
          email: prospect.email ?? '',
          phone: prospect.phone ?? '',
        }
      : undefined,
  });

  const onSubmit = async (values: EnrollFormValues) => {
    try {
      const result = await enroll({
        id,
        prospectEnrollRequest: {
          first_name: values.first_name.trim() || null,
          last_name: values.last_name.trim() || null,
          email: values.email.trim() || null,
          phone: values.phone.trim() || null,
        },
      }).unwrap();
      toast.success(result.data.already_enrolled ? 'Already enrolled' : 'Client invited');
      navigate(ROUTES.CLIENT_DETAIL.replace(':id', result.data.prospect.client?.id ?? ''));
    } catch (error) {
      toast.danger(getApiErrorMessage(error, "Couldn't enroll this prospect"));
    }
  };

  const header = (
    <Page.Header>
      <Page.TitleGroup>
        <div className="flex items-center gap-1">
          <BackButton onPress={goBack} />
          <Page.Title>Enroll prospect</Page.Title>
        </div>
        <Page.Description>Enrolling sends a client invite and links this prospect.</Page.Description>
      </Page.TitleGroup>
    </Page.Header>
  );

  if (isLoading) {
    return (
      <Page>
        {header}
        <Page.Content className="pt-4 pb-6">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !prospect) {
    return (
      <Page>
        {header}
        <Page.Content className="pt-4 pb-6">
          <div className="mx-auto max-w-160">
            <ErrorState message="Couldn't load prospect." />
          </div>
        </Page.Content>
      </Page>
    );
  }

  // Already enrolled — surface the linked client instead of inviting again.
  if (prospect.client) {
    return (
      <Page>
        {header}
        <Page.Content className="pt-4 pb-6">
          <div className="mx-auto flex max-w-160 flex-col gap-3">
            <Typography color="muted">This prospect is already enrolled.</Typography>
            <Button
              className="self-start"
              onPress={() => navigate(ROUTES.CLIENT_DETAIL.replace(':id', prospect.client?.id ?? ''))}
            >
              View client
            </Button>
          </div>
        </Page.Content>
      </Page>
    );
  }

  return (
    <Page>
      {header}
      <Page.Content className="pt-4 pb-6">
        <FormLayout onSubmit={handleSubmit(onSubmit)}>
          <Fieldset>
            <Fieldset.Group>
              <FieldRow>
                <FormTextField
                  control={control}
                  fullWidth
                  inputProps={{autoComplete: 'given-name'}}
                  label="First name"
                  name="first_name"
                />
                <FormTextField
                  control={control}
                  fullWidth
                  inputProps={{autoComplete: 'family-name'}}
                  label="Last name"
                  name="last_name"
                />
              </FieldRow>
              <FormTextField
                control={control}
                fullWidth
                inputProps={{autoComplete: 'email'}}
                label="Email"
                name="email"
                type="email"
              />
              <FormTextField
                control={control}
                fullWidth
                inputProps={{autoComplete: 'tel'}}
                label="Phone"
                name="phone"
                type="tel"
              />
            </Fieldset.Group>
          </Fieldset>

          <FormActions
            isSubmitting={isEnrolling}
            onCancel={goBack}
            submitLabel="Send invite"
            submittingLabel="Sending invite"
          />
        </FormLayout>
      </Page.Content>
    </Page>
  );
}
