import {Button, Stack, Text, TextInput} from '@mantine/core';
import {IconArrowRight} from '@tabler/icons-react';
import React from 'react';
import {useNavigate} from 'react-router';

import AuthLayout from '../layouts/AuthLayout';

const VerifyEmailPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <AuthLayout
            subtitle="Login to access your training schedule."
            title="Welcome Back"
        >
            <form>
                <Stack gap="md">
                    <TextInput
                        label={
                            <Text
                                fw={500}
                                size="md"
                            >
                                Email address
                            </Text>
                        }
                        placeholder="Enter your email"
                        size="lg"
                        type="email"
                    />

                    <Button
                        fullWidth
                        loaderProps={{
                            type: 'bars',
                        }}
                        rightSection={<IconArrowRight />}
                        size="lg"
                        type="submit"
                    >
                        Continue
                    </Button>

                    <Stack
                        align="center"
                        gap="md"
                    >
                        <Text
                            c="dimmed"
                            size="md"
                            ta="center"
                        >
                            Have an invitation code?{' '}
                            <Text
                                c="blue"
                                onClick={() => navigate('/join')}
                                span={true}
                                style={{cursor: 'pointer'}}
                            >
                                Join
                            </Text>
                        </Text>
                    </Stack>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default VerifyEmailPage;
