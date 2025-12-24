import {humanizeError} from '@easy/error-parser';
import {zodResolver} from '@hookform/resolvers/zod';
import {
    ActionIcon,
    Badge,
    Button,
    Group,
    Loader,
    NumberInput,
    Stack,
    Text,
    Textarea,
    TextInput,
} from '@mantine/core';
import {IconBrandFacebook, IconBrandInstagram, IconBrandX, IconBrandYoutube, IconPlus, IconX} from '@tabler/icons-react';
import {useEffect, useMemo, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';

import useParamsDrawer from '@/hooks/useParamDrawer';
import {
    UpdateCoachProfile_zod,
    UpdateCoachProfileRequest,
    useProfileQuery,
    useUpdateCoachProfileMutation,
} from '@/services/auth';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import {notifyError, notifySuccess} from '@/utils/notification';

const MAX_BIO_WORDS = 200;
const MAX_SPECIALTIES = 6;

const countWords = (text: string): number => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
};

const CoachProfileEditDrawer = () => {
    const {closeDrawer} = useParamsDrawer({});

    const {data: profile, isLoading: isLoadingProfile} = useProfileQuery();
    const [updateProfile, {isLoading: isUpdating}] = useUpdateCoachProfileMutation();

    const [newSpecialty, setNewSpecialty] = useState('');
    const [newCertification, setNewCertification] = useState('');

    const {control, handleSubmit, reset, watch, setValue, getValues} = useForm<UpdateCoachProfileRequest>({
        defaultValues: {
            first_name: '',
            last_name: '',
            bio: '',
            specialties: [],
            instagram_url: '',
            facebook_url: '',
            youtube_url: '',
            x_url: '',
            years_of_experience: null,
            certifications: [],
        },
        resolver: zodResolver(UpdateCoachProfile_zod),
    });

    const bioValue = watch('bio');
    const specialtiesValue = watch('specialties') || [];
    const certificationsValue = watch('certifications') || [];

    const wordCount = useMemo(() => countWords(bioValue || ''), [bioValue]);
    const isOverWordLimit = wordCount > MAX_BIO_WORDS;
    const canAddMoreSpecialties = specialtiesValue.length < MAX_SPECIALTIES;

    useEffect(() => {
        if (profile) {
            reset({
                first_name: profile.user.first_name || '',
                last_name: profile.user.last_name || '',
                bio: profile.coach?.bio || '',
                specialties: profile.coach?.specialties || [],
                instagram_url: profile.coach?.instagram_url || '',
                facebook_url: profile.coach?.facebook_url || '',
                youtube_url: profile.coach?.youtube_url || '',
                x_url: profile.coach?.x_url || '',
                years_of_experience: profile.coach?.years_of_experience ?? null,
                certifications: profile.coach?.certifications || [],
            });
        }
    }, [profile, reset]);

    const handleAddSpecialty = () => {
        if (newSpecialty.trim() && canAddMoreSpecialties) {
            const current = getValues('specialties') || [];
            if (!current.includes(newSpecialty.trim())) {
                setValue('specialties', [...current, newSpecialty.trim()]);
            }
            setNewSpecialty('');
        }
    };

    const handleRemoveSpecialty = (specialty: string) => {
        const current = getValues('specialties') || [];
        setValue(
            'specialties',
            current.filter((s) => s !== specialty)
        );
    };

    const handleAddCertification = () => {
        if (newCertification.trim()) {
            const current = getValues('certifications') || [];
            if (!current.includes(newCertification.trim())) {
                setValue('certifications', [...current, newCertification.trim()]);
            }
            setNewCertification('');
        }
    };

    const handleRemoveCertification = (cert: string) => {
        const current = getValues('certifications') || [];
        setValue(
            'certifications',
            current.filter((c) => c !== cert)
        );
    };

    const handleFormSubmit = async (values: UpdateCoachProfileRequest) => {
        try {
            // Clean up empty strings to null for optional fields
            const cleanedValues = {
                ...values,
                bio: values.bio === '' ? null : values.bio,
                instagram_url: values.instagram_url === '' ? null : values.instagram_url,
                facebook_url: values.facebook_url === '' ? null : values.facebook_url,
                youtube_url: values.youtube_url === '' ? null : values.youtube_url,
                x_url: values.x_url === '' ? null : values.x_url,
            };

            await updateProfile(cleanedValues).unwrap();
            notifySuccess('Profile updated successfully');
            closeDrawer();
        } catch (error) {
            const errMsg = humanizeError(error);
            notifyError(errMsg);
        }
    };

    if (isLoadingProfile) {
        return (
            <AutoDrawer
                content={
                    <Stack align="center" justify="center" py="xl">
                        <Loader size="sm" />
                        <Text c="dimmed" size="sm">
                            Loading profile...
                        </Text>
                    </Stack>
                }
                onClose={closeDrawer}
                title="Edit Profile"
            />
        );
    }

    if (!profile) {
        return (
            <AutoDrawer
                content={
                    <Text c="red" size="sm">
                        Profile not found
                    </Text>
                }
                onClose={closeDrawer}
                title="Edit Profile"
            />
        );
    }

    return (
        <AutoDrawer
            actions={
                <Group w="100%">
                    <Button
                        color="blue"
                        flex={1}
                        loading={isUpdating}
                        onClick={handleSubmit(handleFormSubmit)}
                        radius="xl"
                        size="sm"
                        variant="filled"
                    >
                        Save
                    </Button>
                </Group>
            }
            content={
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                    <Stack gap="lg">
                        {/* Personal Info Section */}
                        <Stack gap="xs">
                            <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                                Personal Information
                            </Text>

                            <Controller
                                control={control}
                                name="first_name"
                                render={({field, fieldState}) => (
                                    <TextInput
                                        {...field}
                                        error={fieldState.error?.message}
                                        label="First Name"
                                        placeholder="e.g., Rahul"
                                        required
                                    />
                                )}
                            />

                            <Controller
                                control={control}
                                name="last_name"
                                render={({field, fieldState}) => (
                                    <TextInput
                                        {...field}
                                        error={fieldState.error?.message}
                                        label="Last Name"
                                        placeholder="e.g., Sharma"
                                        required
                                    />
                                )}
                            />

                            <TextInput
                                description="Email cannot be changed"
                                disabled
                                label="Email"
                                value={profile.user.email}
                            />
                        </Stack>

                        {/* Coach Info Section */}
                        <Stack gap="xs">
                            <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                                Coach Profile
                            </Text>

                            <Controller
                                control={control}
                                name="bio"
                                render={({field, fieldState}) => (
                                    <Stack gap={4}>
                                        <Textarea
                                            {...field}
                                            description="Tell your clients about yourself and your coaching style"
                                            error={fieldState.error?.message}
                                            label="Bio"
                                            placeholder="e.g., Certified fitness coach with 5+ years of experience specializing in weight training and nutrition..."
                                            rows={4}
                                            value={field.value || ''}
                                        />
                                        <Text
                                            c={isOverWordLimit ? 'red' : 'dimmed'}
                                            size="xs"
                                            ta="right"
                                        >
                                            {wordCount} / {MAX_BIO_WORDS} words
                                        </Text>
                                    </Stack>
                                )}
                            />

                            <Controller
                                control={control}
                                name="years_of_experience"
                                render={({field, fieldState}) => (
                                    <NumberInput
                                        {...field}
                                        error={fieldState.error?.message}
                                        label="Years of Experience"
                                        min={0}
                                        onChange={(val) => field.onChange(val === '' ? null : val)}
                                        placeholder="e.g., 5"
                                        value={field.value ?? ''}
                                    />
                                )}
                            />
                        </Stack>

                        {/* Specialties Section */}
                        <Stack gap="xs">
                            <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                                Specialties ({specialtiesValue.length}/{MAX_SPECIALTIES})
                            </Text>

                            <Group gap="xs" wrap="wrap">
                                {specialtiesValue.map((specialty) => (
                                    <Badge
                                        key={specialty}
                                        pr={3}
                                        rightSection={
                                            <ActionIcon
                                                color="blue"
                                                onClick={() => handleRemoveSpecialty(specialty)}
                                                size="xs"
                                                variant="transparent"
                                            >
                                                <IconX size={12} />
                                            </ActionIcon>
                                        }
                                        size="lg"
                                        variant="light"
                                    >
                                        {specialty}
                                    </Badge>
                                ))}
                            </Group>

                            {canAddMoreSpecialties && (
                                <Group gap="xs">
                                    <TextInput
                                        flex={1}
                                        onChange={(e) => setNewSpecialty(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddSpecialty();
                                            }
                                        }}
                                        placeholder="e.g., Weight Loss, Muscle Building"
                                        size="sm"
                                        value={newSpecialty}
                                    />
                                    <ActionIcon
                                        color="blue"
                                        disabled={!newSpecialty.trim()}
                                        onClick={handleAddSpecialty}
                                        size="lg"
                                        variant="light"
                                    >
                                        <IconPlus size={16} />
                                    </ActionIcon>
                                </Group>
                            )}

                            {!canAddMoreSpecialties && (
                                <Text c="dimmed" size="xs">
                                    Maximum {MAX_SPECIALTIES} specialties reached
                                </Text>
                            )}
                        </Stack>

                        {/* Certifications Section */}
                        <Stack gap="xs">
                            <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                                Certifications
                            </Text>

                            <Group gap="xs" wrap="wrap">
                                {certificationsValue.map((cert) => (
                                    <Badge
                                        color="green"
                                        key={cert}
                                        pr={3}
                                        rightSection={
                                            <ActionIcon
                                                color="green"
                                                onClick={() => handleRemoveCertification(cert)}
                                                size="xs"
                                                variant="transparent"
                                            >
                                                <IconX size={12} />
                                            </ActionIcon>
                                        }
                                        size="lg"
                                        variant="light"
                                    >
                                        {cert}
                                    </Badge>
                                ))}
                            </Group>

                            <Group gap="xs">
                                <TextInput
                                    flex={1}
                                    onChange={(e) => setNewCertification(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddCertification();
                                        }
                                    }}
                                    placeholder="e.g., NASM-CPT, ACE Certified"
                                    size="sm"
                                    value={newCertification}
                                />
                                <ActionIcon
                                    color="green"
                                    disabled={!newCertification.trim()}
                                    onClick={handleAddCertification}
                                    size="lg"
                                    variant="light"
                                >
                                    <IconPlus size={16} />
                                </ActionIcon>
                            </Group>
                        </Stack>

                        {/* Social Links Section */}
                        <Stack gap="xs">
                            <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                                Social Links
                            </Text>

                            <Controller
                                control={control}
                                name="instagram_url"
                                render={({field, fieldState}) => (
                                    <TextInput
                                        {...field}
                                        error={fieldState.error?.message}
                                        rightSection={<IconBrandInstagram size={16} />}
                                        placeholder="https://instagram.com/yourprofile"
                                        value={field.value || ''}
                                    />
                                )}
                            />

                            <Controller
                                control={control}
                                name="facebook_url"
                                render={({field, fieldState}) => (
                                    <TextInput
                                        {...field}
                                        error={fieldState.error?.message}
                                        rightSection={<IconBrandFacebook size={16} />}
                                        placeholder="https://facebook.com/yourpage"
                                        value={field.value || ''}
                                    />
                                )}
                            />

                            <Controller
                                control={control}
                                name="youtube_url"
                                render={({field, fieldState}) => (
                                    <TextInput
                                        {...field}
                                        error={fieldState.error?.message}
                                        rightSection={<IconBrandYoutube size={16} />}
                                        placeholder="https://youtube.com/@yourchannel"
                                        value={field.value || ''}
                                    />
                                )}
                            />

                            <Controller
                                control={control}
                                name="x_url"
                                render={({field, fieldState}) => (
                                    <TextInput
                                        {...field}
                                        error={fieldState.error?.message}
                                        rightSection={<IconBrandX size={16} />}
                                        placeholder="https://x.com/yourhandle"
                                        value={field.value || ''}
                                    />
                                )}
                            />
                        </Stack>
                    </Stack>
                </form>
            }
            onClose={closeDrawer}
            title="Edit Profile"
        />
    );
};

export default CoachProfileEditDrawer;
