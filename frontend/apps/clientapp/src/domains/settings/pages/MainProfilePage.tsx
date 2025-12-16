import React, {useEffect, useState} from 'react';
import {
    Alert,
    Box,
    Button,
    Divider,
    Group,
    LoadingOverlay,
    Select,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    Textarea,
    Title,
} from '@mantine/core';
import {IconCheck, IconEdit, IconExclamationCircle} from '@tabler/icons-react';

import PaddingContainer from '@/shared/containers/PaddingContainer';

import {useGetProfileQuery, useUpdateProfileMutation} from '@/services/profile';
import HeadingContainer from '@/shared/containers/HeaderContainer';
import Header from '@/shared/layouts/Header';
import { useNavigate } from 'react-router';

type EditableProfileForm = {
    full_name: string;
    phone: string;
    height_cm: string;
    weight_kg: string;
    date_of_birth: string;
    sex: string;
    gender_identity: string;
    activity_level: string;
    goal: string;
    measurement_system: string;
    dietary_notes: string;
    injury_notes: string;
    medication_notes: string;
};

const toStringOrEmpty = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

const safeNumberString = (v: unknown) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
    if (typeof v === 'string') return v;
    return '';
};

const pickInitialForm = (profile: any): EditableProfileForm => ({
    full_name: toStringOrEmpty(profile?.full_name),
    phone: toStringOrEmpty(profile?.phone),
    height_cm: safeNumberString(profile?.height_cm),
    weight_kg: safeNumberString(profile?.weight_kg),
    date_of_birth: toStringOrEmpty(profile?.date_of_birth), // expects "YYYY-MM-DD"
    sex: toStringOrEmpty(profile?.sex),
    gender_identity: toStringOrEmpty(profile?.gender_identity),
    activity_level: toStringOrEmpty(profile?.activity_level),
    goal: toStringOrEmpty(profile?.goal),
    measurement_system: toStringOrEmpty(profile?.measurement_system),
    dietary_notes: toStringOrEmpty(profile?.dietary_notes),
    injury_notes: toStringOrEmpty(profile?.injury_notes),
    medication_notes: toStringOrEmpty(profile?.medication_notes),
});

const buildUpdatePayload = (form: EditableProfileForm) => {
    // Only send values that are explicitly set; convert numeric strings to numbers.
    // Keep empty strings as null for optional fields.
    const normalizeNullable = (s: string) => (s.trim() === '' ? null : s.trim());

    const height = form.height_cm.trim() === '' ? null : Number(form.height_cm);
    const weight = form.weight_kg.trim() === '' ? null : Number(form.weight_kg);

    return {
        full_name: normalizeNullable(form.full_name),
        phone: normalizeNullable(form.phone),
        height_cm: height,
        weight_kg: weight,
        date_of_birth: normalizeNullable(form.date_of_birth),
        sex: normalizeNullable(form.sex),
        gender_identity: normalizeNullable(form.gender_identity),
        activity_level: normalizeNullable(form.activity_level),
        goal: normalizeNullable(form.goal),
        measurement_system: normalizeNullable(form.measurement_system),
        dietary_notes: normalizeNullable(form.dietary_notes),
        injury_notes: normalizeNullable(form.injury_notes),
        medication_notes: normalizeNullable(form.medication_notes),
    };
};

const MainProfilePage = () => {

  const navigate= useNavigate()
  const {data, isLoading, isFetching, isError, error} = useGetProfileQuery();
    const [updateProfile, updateState] = useUpdateProfileMutation();


    const profile = data?.data;

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<EditableProfileForm>(() => pickInitialForm(profile));
    const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);


    useEffect(() => {
        // Whenever profile loads/refreshes, reset display form if not editing.
        if (profile && !isEditing) {
            setForm(pickInitialForm(profile));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.updated_at, isEditing]);

    const onChange = (key: keyof EditableProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setSaveSuccessMessage(null);
        setForm((prev) => ({...prev, [key]: e.target.value}));
    };

    const onChangeSelect = (key: keyof EditableProfileForm) => (value: string | null) => {
        setSaveSuccessMessage(null);
        setForm((prev) => ({...prev, [key]: value ?? ''}));
    };

    const onCancel = () => {
        setSaveSuccessMessage(null);
        setIsEditing(false);
        setForm(pickInitialForm(profile));
    };

    const onSave = async () => {
        setSaveSuccessMessage(null);

        // Basic client-side guards for numeric fields (server will validate too)
        if (form.height_cm.trim() !== '' && Number.isNaN(Number(form.height_cm))) return;
        if (form.weight_kg.trim() !== '' && Number.isNaN(Number(form.weight_kg))) return;

        const payload = buildUpdatePayload(form);

        const res: any = await updateProfile(payload);
        if ('data' in res) {
            setIsEditing(false);
            setSaveSuccessMessage('Profile updated successfully.');
        }
    };

    const pageBusy = isLoading || isFetching || updateState.isLoading;

    return (
        <React.Fragment>

          <HeadingContainer>
            <Header title='Profile' onBack={() => {navigate(-1)}}/>
          </HeadingContainer>
            <PaddingContainer paddingY="xl">
                <Box pos="relative">
                    <LoadingOverlay visible={pageBusy} zIndex={10} overlayProps={{radius: 'md', blur: 2}} />

                    <Stack gap="xl">


                        {isError && (
                            <Alert icon={<IconExclamationCircle size={16} />} color="red" title="Failed to load profile">
                                <Text size="sm">
                                    {(error as any)?.message ??
                                        'Something went wrong while loading your profile. Please try again.'}
                                </Text>
                            </Alert>
                        )}

                        {!!saveSuccessMessage && (
                            <Alert icon={<IconCheck size={16} />} color="green" title="Saved">
                                <Text size="sm">{saveSuccessMessage}</Text>
                            </Alert>
                        )}



                            <Stack gap="md">
                                <Group justify="space-between" align="center">
                                    <Title order={4}>Details</Title>
                                      <Group gap="sm">
                                          {!isEditing ? (
                                              <Button
                                                  variant="light"
                                                  color="brand"
                                                  size="sm"
                                                  leftSection={<IconEdit size={16} />}
                                                  onClick={() => {
                                                      setSaveSuccessMessage(null);
                                                      setIsEditing(true);
                                                  }}
                                                  disabled={!profile}
                                              >
                                                  Edit
                                              </Button>
                                          ) : (
                                              <>
                                                  <Button variant="default" size="sm" color="gray" onClick={onCancel}>
                                                      Cancel
                                                  </Button>
                                                  <Button
                                                      color="brand"
                                                      leftSection={<IconCheck size={16} />}
                                                      onClick={onSave}
                                                      disabled={updateState.isLoading}
                                                      size="sm"
                                                  >
                                                      Save
                                                  </Button>
                                              </>
                                          )}
                                      </Group>
                                </Group>

                                <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
                                    <TextInput
                                        label="Full name"
                                        placeholder="Your name"
                                        value={form.full_name}
                                        onChange={onChange('full_name')}
                                        disabled={!isEditing}
                                    />

                                    <TextInput
                                        label="Phone"
                                        placeholder="+1234567890"
                                        value={form.phone}
                                        onChange={onChange('phone')}
                                        disabled={!isEditing}
                                    />



                                    <TextInput
                                        label="Date of birth"
                                        placeholder="YYYY-MM-DD"
                                        value={form.date_of_birth}
                                        onChange={onChange('date_of_birth')}
                                        disabled={!isEditing}
                                    />

                                    <TextInput
                                        label="Height (cm)"
                                        placeholder="e.g. 170"
                                        value={form.height_cm}
                                        onChange={onChange('height_cm')}
                                        disabled={!isEditing}
                                    />

                                    <TextInput
                                        label="Weight (kg)"
                                        placeholder="e.g. 70"
                                        value={form.weight_kg}
                                        onChange={onChange('weight_kg')}
                                        disabled={!isEditing}
                                    />

                                    <Select
                                        label="Sex"
                                        placeholder="Select"
                                        value={form.sex || null}
                                        onChange={onChangeSelect('sex')}
                                        disabled={!isEditing}
                                        data={[
                                            {value: 'male', label: 'Male'},
                                            {value: 'female', label: 'Female'},
                                            {value: 'intersex', label: 'Intersex'},
                                            {value: 'prefer_not_to_say', label: 'Prefer not to say'},
                                        ]}
                                        clearable
                                    />

                                    <TextInput
                                        label="Gender identity"
                                        placeholder="e.g. Non-binary"
                                        value={form.gender_identity}
                                        onChange={onChange('gender_identity')}
                                        disabled={!isEditing}
                                    />

                                    <Select
                                        label="Activity level"
                                        placeholder="Select"
                                        value={form.activity_level || null}
                                        onChange={onChangeSelect('activity_level')}
                                        disabled={!isEditing}
                                        data={[
                                            {value: 'sedentary', label: 'Sedentary'},
                                            {value: 'light', label: 'Light'},
                                            {value: 'moderate', label: 'Moderate'},
                                            {value: 'active', label: 'Active'},
                                            {value: 'athlete', label: 'Athlete'},
                                        ]}
                                        clearable
                                    />

                                    <Select
                                        label="Goal"
                                        placeholder="Select"
                                        value={form.goal || null}
                                        onChange={onChangeSelect('goal')}
                                        disabled={!isEditing}
                                        data={[
                                            {value: 'lose_weight', label: 'Lose weight'},
                                            {value: 'maintain', label: 'Maintain'},
                                            {value: 'gain_muscle', label: 'Gain muscle'},
                                            {value: 'improve_endurance', label: 'Improve endurance'},
                                            {value: 'rehab', label: 'Rehab'},
                                        ]}
                                        clearable
                                    />

                                    <Select
                                        label="Measurement system"
                                        placeholder="Select"
                                        value={form.measurement_system || null}
                                        onChange={onChangeSelect('measurement_system')}
                                        disabled={!isEditing}
                                        data={[
                                            {value: 'metric', label: 'Metric'},
                                            {value: 'imperial', label: 'Imperial'},
                                        ]}
                                        clearable
                                    />
                                </SimpleGrid>

                                <Divider my="sm" />

                                <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
                                    <Textarea
                                        label="Dietary notes"
                                        placeholder="Allergies, preferences..."
                                        minRows={3}
                                        value={form.dietary_notes}
                                        onChange={onChange('dietary_notes')}
                                        disabled={!isEditing}
                                    />
                                    <Textarea
                                        label="Injury notes"
                                        placeholder="Anything your coach should know..."
                                        minRows={3}
                                        value={form.injury_notes}
                                        onChange={onChange('injury_notes')}
                                        disabled={!isEditing}
                                    />
                                    <Textarea
                                        label="Medication notes"
                                        placeholder="Optional"
                                        minRows={3}
                                        value={form.medication_notes}
                                        onChange={onChange('medication_notes')}
                                        disabled={!isEditing}
                                    />
                                </SimpleGrid>
                            </Stack>
                    </Stack>
                </Box>
            </PaddingContainer>
        </React.Fragment>
    );
};

export default MainProfilePage;
