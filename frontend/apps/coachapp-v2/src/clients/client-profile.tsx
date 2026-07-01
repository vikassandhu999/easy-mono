/**
 * Per-client coaching profile (intake). Renders the business's profile fields,
 * grouped by section, prefilled from the client's stored answers, plus the
 * coach-owned intake status. Saving rebuilds each section map as
 * {...existing, key: value} to avoid wiping answers not shown here.
 */
import {formatIsoDateOnly} from '@easy/utils';
import {Button, Label, ListBox, Select, Spinner, Typography, toast} from '@heroui/react';
import {useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import SectionHeading from '@/@components/section-heading';
import {ROUTES} from '@/@config/routes';
import {
  buildProfileSectionsPayload,
  type ClientProfileField,
  type CoachingClientProfile,
  PROFILE_SECTIONS,
  type ProfileFieldValue,
  readProfileFieldValue,
  useGetCoachingClientProfileQuery,
  useListProfileFieldsQuery,
  useUpdateCoachingClientProfileMutation,
} from '@/api/client-profile';
import {type Client, useGetClientQuery} from '@/api/clients';
import ProfileFieldInput from '@/clients/components/profile-field-input';

type IntakeStatus = CoachingClientProfile['intake_status'];

const INTAKE_STATUS_LABELS: Record<IntakeStatus, string> = {
  assigned: 'Assigned',
  completed: 'Completed',
  dismissed: 'Dismissed',
  in_progress: 'In progress',
};

const INTAKE_STATUSES = Object.keys(INTAKE_STATUS_LABELS) as IntakeStatus[];

function clientName(client: Client): string {
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Client';
}

function ProfileHeader({goBack, name}: {goBack: () => void; name?: string}) {
  return (
    <Page.Header>
      <Page.TitleGroup>
        <div className="flex items-center gap-1">
          <BackButton onPress={goBack} />
          <Page.Title>Profile</Page.Title>
        </div>
        {name ? <Page.Description>{name}</Page.Description> : null}
      </Page.TitleGroup>
    </Page.Header>
  );
}

function ClientProfileEditor({
  client,
  profile,
  fields,
}: {
  client: Client;
  profile: CoachingClientProfile;
  fields: ClientProfileField[];
}) {
  const navigate = useNavigate();
  const backPath = `/clients/${client.id}`;
  const goBack = () => navigate(backPath);
  const [updateProfile, {isLoading: isSaving}] = useUpdateCoachingClientProfileMutation();

  const [values, setValues] = useState<Record<string, ProfileFieldValue>>(() => {
    const init: Record<string, ProfileFieldValue> = {};
    for (const field of fields) {
      init[field.id] = readProfileFieldValue(profile, field);
    }
    return init;
  });
  const [status, setStatus] = useState<IntakeStatus>(profile.intake_status);

  const setValue = (fieldId: string, value: ProfileFieldValue) => {
    setValues((prev) => ({...prev, [fieldId]: value}));
  };

  const handleSave = async () => {
    const sections = buildProfileSectionsPayload(fields, profile, values);
    const completedAt = status === 'completed' ? (profile.intake_completed_at ?? new Date().toISOString()) : null;
    try {
      await updateProfile({
        clientId: client.id,
        coachingClientProfileRequest: {...sections, intake_completed_at: completedAt, intake_status: status},
      }).unwrap();
      toast.success('Profile saved');
      navigate(backPath);
    } catch {
      toast.danger("Profile wasn't saved. Try again.");
    }
  };

  const hasFields = fields.length > 0;

  return (
    <Page>
      <ProfileHeader
        goBack={goBack}
        name={clientName(client)}
      />
      <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-160 space-y-8">
          {/* Intake status — a single control, sized to its content rather than boxed. */}
          <div className="max-w-xs">
            <Select
              onChange={(key) => key && setStatus(key as IntakeStatus)}
              value={status}
              variant="secondary"
            >
              <Label>Intake status</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {INTAKE_STATUSES.map((s) => (
                    <ListBox.Item
                      id={s}
                      key={s}
                      textValue={INTAKE_STATUS_LABELS[s]}
                    >
                      {INTAKE_STATUS_LABELS[s]}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            {status === 'completed' && profile.intake_completed_at ? (
              <Typography
                className="mt-1.5"
                color="muted"
                type="body-xs"
              >
                Completed {formatIsoDateOnly(profile.intake_completed_at)}
              </Typography>
            ) : null}
          </div>

          {hasFields ? (
            PROFILE_SECTIONS.map((section) => {
              const sectionFields = fields.filter((f) => f.section === section.key);
              if (sectionFields.length === 0) {
                return null;
              }
              return (
                <section key={section.key}>
                  <SectionHeading title={section.label} />
                  <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    {sectionFields.map((field) => (
                      <div
                        className={field.field_type === 'multi_select' ? 'sm:col-span-2' : undefined}
                        key={field.id}
                      >
                        <ProfileFieldInput
                          field={field}
                          onChange={(value) => setValue(field.id, value)}
                          value={values[field.id] ?? null}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Typography
                color="muted"
                type="body-sm"
              >
                No profile fields defined yet.
              </Typography>
              <Button
                className="mt-3"
                onPress={() => navigate(ROUTES.SETTINGS_PROFILE_FIELDS)}
                size="sm"
                variant="secondary"
              >
                Set up profile fields
              </Button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              isPending={isSaving}
              onPress={handleSave}
            >
              {isSaving ? 'Saving profile' : 'Save profile'}
            </Button>
            <Button
              onPress={goBack}
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Page.Content>
    </Page>
  );
}

export default function ClientProfilePage() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = () => navigate(`/clients/${id}`);
  const clientQuery = useGetClientQuery(id!);
  const profileQuery = useGetCoachingClientProfileQuery({clientId: id!});
  const fieldsQuery = useListProfileFieldsQuery();

  if (clientQuery.isLoading || profileQuery.isLoading || fieldsQuery.isLoading) {
    return (
      <Page>
        <ProfileHeader goBack={goBack} />
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (clientQuery.isError || profileQuery.isError || !clientQuery.data || !profileQuery.data) {
    return (
      <Page>
        <ProfileHeader goBack={goBack} />
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
          <ErrorState message="Couldn't load profile." />
        </Page.Content>
      </Page>
    );
  }

  return (
    <ClientProfileEditor
      client={clientQuery.data.data}
      fields={fieldsQuery.data?.data ?? []}
      profile={profileQuery.data.data}
    />
  );
}
