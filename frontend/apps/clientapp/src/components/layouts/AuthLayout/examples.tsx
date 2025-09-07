import React from 'react';
import {Button, TextInput, PasswordInput, Stack, Text, Anchor} from '@mantine/core';
import {AuthLayout} from './AuthLayout';

// Example: Login Form using improved Index
export function LoginExample() {
    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in to your account to continue"
        >
            <Stack gap="md">
                <TextInput
                    label="Email"
                    placeholder="your@email.com"
                    required
                />
                <PasswordInput
                    label="Password"
                    placeholder="Your password"
                    required
                />
                <Button
                    fullWidth
                    variant="filled"
                    size="md"
                >
                    Sign In
                </Button>
                <Text
                    size="sm"
                    ta="center"
                    c="dimmed"
                >
                    Don't have an account?{' '}
                    <Anchor
                        href="/signup"
                        fw={500}
                    >
                        Create one
                    </Anchor>
                </Text>
            </Stack>
        </AuthLayout>
    );
}

// Example: Signup Form with loading state
export function SignupExample() {
    const [loading, setLoading] = React.useState(false);

    return (
        <AuthLayout
            title="Create your account"
            subtitle="Start your coaching journey today"
            loading={loading}
        >
            <Stack gap="md">
                <TextInput
                    label="Full Name"
                    placeholder="John Doe"
                    required
                />
                <TextInput
                    label="Email"
                    placeholder="your@email.com"
                    required
                />
                <PasswordInput
                    label="Password"
                    placeholder="Create a strong password"
                    required
                />
                <Button
                    fullWidth
                    variant="filled"
                    size="md"
                    loading={loading}
                    onClick={() => setLoading(!loading)}
                >
                    {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
                <Text
                    size="sm"
                    ta="center"
                    c="dimmed"
                >
                    Already have an account?{' '}
                    <Anchor
                        href="/login"
                        fw={500}
                    >
                        Sign in
                    </Anchor>
                </Text>
            </Stack>
        </AuthLayout>
    );
}

// Example: Error state
export function ErrorExample() {
    return (
        <AuthLayout
            title="Authentication failed"
            subtitle="Please check your credentials and try again"
            error={true}
        >
            <Stack gap="md">
                <Text
                    c="red"
                    size="sm"
                    ta="center"
                >
                    Invalid email or password. Please try again.
                </Text>
                <Button
                    fullWidth
                    variant="outline"
                    size="md"
                >
                    Try Again
                </Button>
                <Text
                    size="sm"
                    ta="center"
                    c="dimmed"
                >
                    Need help?{' '}
                    <Anchor
                        href="/forgot-password"
                        fw={500}
                    >
                        Reset password
                    </Anchor>
                </Text>
            </Stack>
        </AuthLayout>
    );
}
