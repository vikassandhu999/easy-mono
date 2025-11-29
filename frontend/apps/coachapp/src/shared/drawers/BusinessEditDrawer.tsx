import {humanizeError} from '@easy/error-parser';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Group, Loader, Stack, Text, Textarea, TextInput} from '@mantine/core';
import {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';

import useParamsDrawer from '@/hooks/useParamDrawer';
import {
    UpdateBusiness_zod,
    UpdateBusinessProps,
    useGetBusinessQuery,
    useUpdateBusinessMutation,
} from '@/services/business';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import {notifyError, notifySuccess} from '@/utils/notification';

const BusinessEditDrawer = () => {
    const {closeDrawer} = useParamsDrawer({});

    const {data: business, isLoading: isLoadingBusiness} = useGetBusinessQuery();
    const [updateBusiness, {isLoading: isUpdating}] = useUpdateBusinessMutation();

    const {control, handleSubmit, reset} = useForm<UpdateBusinessProps>({
        defaultValues: {
            name: '',
            description: '',
            email: '',
            phone: '',
            website: '',
            address: '',
            city: '',
            state: '',
            country: '',
            postal_code: '',
            timezone: '',
        },
        resolver: zodResolver(UpdateBusiness_zod),
    });

    useEffect(() => {
        if (business) {
            reset({
                name: business.name || '',
                description: business.description || '',
                email: business.email || '',
                phone: business.phone || '',
                website: business.website || '',
                address: business.address || '',
                city: business.city || '',
                state: business.state || '',
                country: business.country || '',
                postal_code: business.postal_code || '',
                timezone: business.timezone || '',
            });
        }
    }, [business, reset]);

    const handleFormSubmit = async (values: UpdateBusinessProps) => {
        try {
            // Clean up empty strings to null
            const cleanedValues = Object.fromEntries(
                Object.entries(values).map(([key, value]) => [key, value === '' ? null : value]),
            ) as UpdateBusinessProps;

            await updateBusiness(cleanedValues).unwrap();
            notifySuccess('Business profile updated successfully');
            closeDrawer();
        } catch (error) {
            const errMsg = humanizeError(error);
            notifyError(errMsg);
        }
    };

    if (isLoadingBusiness) {
        return (
            <AutoDrawer
                content={
                    <Stack
                        align="center"
                        justify="center"
                        py="xl"
                    >
                        <Loader size="sm" />
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Loading business...
                        </Text>
                    </Stack>
                }
                onClose={closeDrawer}
                title="Edit Business Profile"
            />
        );
    }

    if (!business) {
        return (
            <AutoDrawer
                content={
                    <Text
                        c="red"
                        size="sm"
                    >
                        Business not found
                    </Text>
                }
                onClose={closeDrawer}
                title="Edit Business Profile"
            />
        );
    }

    return (
        <AutoDrawer
            actions={
                <Group w="100%">
                    <Button
                        color="green"
                        flex={1}
                        loading={isUpdating}
                        onClick={handleSubmit(handleFormSubmit)}
                        radius="xl"
                        size="sm"
                        variant="filled"
                    >
                        Save Changes
                    </Button>
                </Group>
            }
            content={
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                    <Stack gap="lg">
                        {/* Basic Info Section */}
                        <Stack gap="xs">
                            <Text
                                c="dimmed"
                                fw={600}
                                size="xs"
                                tt="uppercase"
                            >
                                Basic Information
                            </Text>

                            <Controller
                                control={control}
                                name="name"
                                render={({field, fieldState}) => (
                                    <TextInput
                                        {...field}
                                        error={fieldState.error?.message}
                                        label="Business Name"
                                        placeholder="e.g., FitIndia Coaching"
                                        required
                                    />
                                )}
                            />

                            <Controller
                                control={control}
                                name="description"
                                render={({field, fieldState}) => (
                                    <Textarea
                                        {...field}
                                        error={fieldState.error?.message}
                                        label="Description"
                                        placeholder="Tell clients about your business..."
                                        rows={3}
                                        value={field.value || ''}
                                    />
                                )}
                            />
                        </Stack>

                        {/* Contact Section */}
                        <Stack gap="xs">
                            <Text
                                c="dimmed"
                                fw={600}
                                size="xs"
                                tt="uppercase"
                            >
                                Contact Information
                            </Text>

                            <Controller
                                control={control}
                                name="email"
                                render={({field, fieldState}) => (
                                    <TextInput
                                        {...field}
                                        error={fieldState.error?.message}
                                        label="Business Email"
                                        placeholder="contact@fitindia.in"
                                        type="email"
                                        value={field.value || ''}
                                    />
                                )}
                            />

                            <Controller
                                control={control}
                                name="phone"
                                render={({field, fieldState}) => (
                                    <TextInput
                                        {...field}
                                        error={fieldState.error?.message}
                                        label="Business Phone"
                                        placeholder="+91 98765 43210"
                                        type="tel"
                                        value={field.value || ''}
                                    />
                                )}
                            />

                            <Controller
                                control={control}
                                name="website"
                                render={({field, fieldState}) => (
                                    <TextInput
                                        {...field}
                                        error={fieldState.error?.message}
                                        label="Website"
                                        placeholder="https://fitindia.in"
                                        type="url"
                                        value={field.value || ''}
                                    />
                                )}
                            />
                        </Stack>

                        {/* Address Section */}
                        <Stack gap="xs">
                            <Text
                                c="dimmed"
                                fw={600}
                                size="xs"
                                tt="uppercase"
                            >
                                Address
                            </Text>

                            <Controller
                                control={control}
                                name="address"
                                render={({field, fieldState}) => (
                                    <TextInput
                                        {...field}
                                        error={fieldState.error?.message}
                                        label="Street Address"
                                        placeholder="42, MG Road, Indiranagar"
                                        value={field.value || ''}
                                    />
                                )}
                            />

                            <Group grow>
                                <Controller
                                    control={control}
                                    name="city"
                                    render={({field, fieldState}) => (
                                        <TextInput
                                            {...field}
                                            error={fieldState.error?.message}
                                            label="City"
                                            placeholder="Bengaluru"
                                            value={field.value || ''}
                                        />
                                    )}
                                />

                                <Controller
                                    control={control}
                                    name="state"
                                    render={({field, fieldState}) => (
                                        <TextInput
                                            {...field}
                                            error={fieldState.error?.message}
                                            label="State/Province"
                                            placeholder="Karnataka"
                                            value={field.value || ''}
                                        />
                                    )}
                                />
                            </Group>

                            <Group grow>
                                <Controller
                                    control={control}
                                    name="country"
                                    render={({field, fieldState}) => (
                                        <TextInput
                                            {...field}
                                            error={fieldState.error?.message}
                                            label="Country"
                                            placeholder="India"
                                            value={field.value || ''}
                                        />
                                    )}
                                />

                                <Controller
                                    control={control}
                                    name="postal_code"
                                    render={({field, fieldState}) => (
                                        <TextInput
                                            {...field}
                                            error={fieldState.error?.message}
                                            label="Postal Code"
                                            placeholder="560038"
                                            value={field.value || ''}
                                        />
                                    )}
                                />
                            </Group>
                        </Stack>

                        {/* Settings Section */}
                        <Stack gap="xs">
                            <Text
                                c="dimmed"
                                fw={600}
                                size="xs"
                                tt="uppercase"
                            >
                                Settings
                            </Text>

                            <Controller
                                control={control}
                                name="timezone"
                                render={({field, fieldState}) => (
                                    <TextInput
                                        {...field}
                                        description="e.g., Asia/Kolkata, Asia/Mumbai"
                                        error={fieldState.error?.message}
                                        label="Timezone"
                                        placeholder="Asia/Kolkata"
                                        value={field.value || ''}
                                    />
                                )}
                            />
                        </Stack>
                    </Stack>
                </form>
            }
            onClose={closeDrawer}
            title="Edit Business Profile"
        />
    );
};

export default BusinessEditDrawer;
