import {Anchor, Button, Stack, Text, TextInput} from '@mantine/core';
import {useForm, zodResolver} from '@mantine/form';
import {notifications} from '@mantine/notifications';
import {ArrowRight} from '@phosphor-icons/react';
import {IconMail} from '@tabler/icons-react';
import React from 'react';
import {createSearchParams, useNavigate} from 'react-router';
import {z} from 'zod';

import AuthLayout from '@/shared/layouts/AuthLayout';
import {useSignUpMutation} from '@/store/services/users';
import {getApiErrorMessage} from '@/utils/error';

const signUpSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

const SignUpStepPage: React.FC = () => {
    const navigate = useNavigate();
    const [signUp, {isLoading}] = useSignUpMutation();

    const form = useForm<SignUpFormValues>({
        initialValues: {
            email: '',
        },
        validate: zodResolver(signUpSchema),
    });

    const onSubmit = async (data: SignUpFormValues) => {
        try {
            const response = await signUp(data).unwrap();

            notifications.show({
                color: 'green',
                message: 'Verification code sent to your email',
                title: 'Success',
            });

            navigate(
                '/signup/verify?' +
                    createSearchParams([
                        ['token_id', response.token_id],
                        ['email', data.email],
                    ]).toString(),
            );
        } catch (error) {
            const errorMessage = getApiErrorMessage(error);
            notifications.show({
                color: 'red',
                message: errorMessage,
                title: 'Sign up failed',
            });
        }
    };

    return (
        <AuthLayout
            subtitle="Boost your productivity and grow your client base effortlessly"
            title="Get started"
        >
            <form onSubmit={form.onSubmit(onSubmit)}>
                <Stack gap="lg">
                    {/* Form Fields */}
                    <TextInput
                        label="Email address"
                        leftSection={<IconMail size={16} />}
                        placeholder="your@email.com"
                        size="lg"
                        type="email"
                        {...form.getInputProps('email')}
                    />

                    <Button
                        fullWidth
                        loading={isLoading}
                        rightSection={<ArrowRight size={16} />}
                        size="lg"
                        type="submit"
                    >
                        Continue
                    </Button>

                    {/* Footer */}
                    <Stack
                        align="center"
                        gap="md"
                    >
                        <Text
                            c="dimmed"
                            size="sm"
                            ta="center"
                        >
                            Already have an account?{' '}
                            <Anchor
                                fw={600}
                                onClick={() => navigate('/login')}
                                style={{cursor: 'pointer'}}
                            >
                                Sign in
                            </Anchor>
                        </Text>

                        <Text
                            c="dimmed"
                            size="xs"
                            ta="center"
                        >
                            By continuing, you agree to our Terms of Service and Privacy Policy
                        </Text>
                    </Stack>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default SignUpStepPage;
