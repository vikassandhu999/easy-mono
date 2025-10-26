import {ActionIcon, Avatar, Group, rem, Stack, Text} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {BellIcon} from '@phosphor-icons/react';
import {useNavigate} from 'react-router';

import {useAuth} from '@/providers/AuthProvider';

import NotificationDrawer from '../../components/notification/NotificationDrawer';
import Hero from './Hero';
import NoClientHero from './NoClientHero';
import ProgramSection from './ProgramSection';

export default function HomePage() {
    const navigate = useNavigate();
    const [opened, {open, close}] = useDisclosure(false);

    const {isClient} = useAuth();

    return (
        <>
            <Stack
                gap="xl"
                style={{
                    padding: rem(20),
                    minHeight: '100vh',
                    paddingBottom: rem(100),
                }}
            >
                {/* Header */}

                <Group
                    justify="space-between"
                    mb="md"
                    wrap="nowrap"
                >
                    <Group>
                        <ActionIcon
                            aria-label="View profile"
                            onClick={() => navigate('/profile')}
                            radius="md"
                            size="xl"
                            variant="subtle"
                        >
                            <Avatar
                                color="gray"
                                radius="xl"
                                size="lg"
                                variant="light"
                            />
                        </ActionIcon>
                        <Stack gap={2}>
                            <Text
                                fw={600}
                                lh={'xs'}
                                size="xxl"
                            >
                                Hello, Navraj
                            </Text>
                            <Text
                                c="dimmed"
                                size="lg"
                            >
                                Welcome back!
                            </Text>
                        </Stack>
                    </Group>

                    <ActionIcon
                        aria-label="View notifications"
                        onClick={open}
                        radius="xl"
                        size="xl"
                        variant="light"
                    >
                        <BellIcon size={24} />
                    </ActionIcon>
                </Group>

                {isClient ? (
                    <>
                        <Hero />
                        <ProgramSection />
                    </>
                ) : (
                    <NoClientHero />
                )}
            </Stack>

            <NotificationDrawer
                onClose={close}
                open={open}
                opened={opened}
            />
        </>
    );
}
