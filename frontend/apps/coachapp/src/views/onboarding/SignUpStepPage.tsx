import {zodResolver} from '@hookform/resolvers/zod';
import {Anchor, Button, Group, Stack, Text, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {ArrowRightIcon} from '@phosphor-icons/react';
import {IconInfoCircle, IconMail} from '@tabler/icons-react';
import React from 'react';
import {Controller, useForm} from 'react-hook-form';
import {createSearchParams, useNavigate} from 'react-router';

import {SignUp_zod, SignUpProps, UsersAPI} from '@/api/users.ts';
import AuthLayout from '@/components/layouts/AuthLayout';

const signUpResolver = zodResolver(SignUp_zod);

const SignUpStepPage: React.FC = () => {
    const navigate = useNavigate();

    const {
        control,
        formState: {errors, isSubmitting},
        handleSubmit,
    } = useForm<SignUpProps>({
        defaultValues: {email: ''},
        resolver: signUpResolver,
    });

    const onSubmit = async (data: SignUpProps) => {
        try {
            const res = await UsersAPI.signUp(data);
            if (res.isError) {
                notifications.show({
                    color: 'red',
                    icon: <IconInfoCircle size={16} />,
                    message: res.getError().message,
                    title: 'Error',
                });
                throw res.getError();
            }

            notifications.show({
                color: 'green',
                message: 'Verification code sent to your email',
                title: 'Success',
            });

            navigate(
                '/signup/verify?' +
                    createSearchParams([
                        ['token_id', res.getValue().token_id],
                        ['email', data.email],
                    ]).toString(),
            );
        } catch (error) {
            // Error already handled above
        }
    };

    return (
        <AuthLayout
            subtitle="Boost your productivity and grow your client base effortlessly."
            title="Let's get started."
        >
            <Stack
                component="form"
                gap="lg"
                onSubmit={handleSubmit(onSubmit)}
            >
                <Controller
                    control={control}
                    name="email"
                    render={({field}) => (
                        <TextInput
                            {...field}
                            error={errors?.email?.message}
                            h={48}
                            label="Email Address"
                            leftSection={<IconMail size={16} />}
                            placeholder="Enter your email"
                            radius="sm"
                            size="md"
                        />
                    )}
                />

                <Button
                    fullWidth
                    h={48}
                    loading={isSubmitting}
                    radius="sm"
                    rightSection={<ArrowRightIcon size={20} />}
                    size="md"
                    type="submit"
                >
                    Continue
                </Button>

                {/* Footer Actions */}
                <Stack gap="md">
                    <Group
                        gap="xs"
                        justify="start"
                    >
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Already have an account?
                        </Text>
                        <Anchor
                            fw={500}
                            onClick={() => navigate('/login')}
                            size="sm"
                            style={{cursor: 'pointer'}}
                        >
                            Login here
                        </Anchor>
                    </Group>

                    <Text
                        c="dimmed"
                        size="xs"
                        ta="left"
                    >
                        By clicking on Continue, you agree to our Terms of Service and Privacy Policy
                    </Text>
                </Stack>
            </Stack>
        </AuthLayout>
    );
};

export default SignUpStepPage;
