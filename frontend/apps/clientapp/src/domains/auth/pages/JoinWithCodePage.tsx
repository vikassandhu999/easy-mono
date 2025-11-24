import {Button, Stack, Text, TextInput} from '@mantine/core';
import {IconArrowRight} from '@tabler/icons-react';
import React from 'react';
import {useNavigate} from 'react-router';

import AuthLayout from '../layouts/AuthLayout';

const JoinWithCodePage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <AuthLayout
            subtitle="Enter your invitation code to get started"
            title="Join Your Coach"
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

                    <TextInput
                        description="An invitation code is sent by your coach to your email."
                        label={
                            <Text
                                fw={500}
                                size="md"
                            >
                                Invitation Code
                            </Text>
                        }
                        placeholder="Enter invitation code here"
                        size="lg"
                        type="text"
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
                            Already have a coach?{' '}
                            <Text
                                c="blue"
                                onClick={() => navigate('/')}
                                span={true}
                                style={{cursor: 'pointer'}}
                            >
                                Login
                            </Text>
                        </Text>
                    </Stack>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default JoinWithCodePage;
