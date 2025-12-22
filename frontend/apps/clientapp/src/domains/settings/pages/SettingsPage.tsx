import {Avatar, Card, Group, Stack, Text, useMantineTheme} from '@mantine/core';
import {IconHelp, IconInfoCircle, IconLock, IconLogout2, IconUser} from '@tabler/icons-react';
import React, {useMemo} from 'react';
import {useNavigate} from 'react-router';

import ActionListCard from '@/domains/settings/components/ActionListCard';
import {type Profile, useGetProfileQuery} from '@/services/profile';
import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import Header from '@/shared/layouts/Header';

type SummaryCardProps = {
    profile?: Profile;
    isLoading: boolean;
};

const SummaryCard = ({profile, isLoading}: SummaryCardProps) => {
    const initials = useMemo(() => {
        const name = (profile?.full_name || '').trim();
        if (!name) return 'C';
        return name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join('');
    }, [profile?.full_name]);

    return (
        <Card
            padding="lg"
            radius="lg"
            style={{
                boxShadow: 'none',
            }}
            withBorder
        >
            <Group
                align="center"
                justify="space-between"
                wrap="nowrap"
            >
                <Group
                    gap="md"
                    wrap="nowrap"
                >
                    <Avatar
                        color="brand"
                        radius="xl"
                        size="lg"
                        variant="outline"
                    >
                        {initials}
                    </Avatar>
                    <Stack gap={2}>
                        <Group gap="xs">
                            <Text fw={600}>{isLoading ? 'Loading…' : profile?.full_name || '—'}</Text>
                        </Group>
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            {isLoading ? '—' : profile?.email || '—'}
                        </Text>
                        {!!profile?.business?.name && (
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                {profile.business.name}
                            </Text>
                        )}
                    </Stack>
                </Group>
            </Group>
        </Card>
    );
};

const SettingsPage = () => {
    const navigate = useNavigate();
    const theme = useMantineTheme();
    const {data, isLoading} = useGetProfileQuery();

    const profile = data?.data;

    const actions: Array<{
        label: string;
        description?: string;
        to?: string;
        icon: React.ReactNode;
        disabled?: boolean;
    }> = [
        {
            label: 'Profile',
            description: 'Edit your personal details',
            to: '/settings/profile',
            icon: <IconUser size={18} />,
        },

        {
            label: 'Coach Details',
            description: 'Learn about your coach and business.',
            to: '/settings/profile',
            icon: <IconUser size={18} />,
        },

        {
            label: 'Security',
            description: 'Sign-in and account security',
            to: '/settings/security',
            icon: <IconLock size={18} />,
        },
        {
            label: 'Support',
            description: 'Get Help and Contact',
            to: '/settings/support',
            icon: <IconHelp size={18} />,
        },
        {
            label: 'About',
            description: 'Platform Information and Legal',
            to: '/settings/about',
            icon: <IconInfoCircle size={18} />,
        },
    ];

    return (
        <React.Fragment>
            <HeadingContainer>
                <Header title="Settings" />
            </HeadingContainer>
            <PaddingContainer
                style={{
                    paddingTop: theme.spacing.lg,
                }}
            >
                <Stack gap="xl">
                    <SummaryCard
                        isLoading={isLoading}
                        profile={profile}
                    />

                    <Stack gap="md">
                        {actions.map((action) => (
                            <ActionListCard
                                ariaLabel={action.description ? `${action.label}. ${action.description}` : action.label}
                                danger={false}
                                description={action.description}
                                disabled={action.disabled}
                                icon={action.icon}
                                key={action.label}
                                label={action.label}
                                onClick={() => {
                                    if (action.to && !action.disabled) navigate(action.to);
                                }}
                                padding="md"
                                radius="lg"
                                withBorder
                            />
                        ))}

                        <ActionListCard
                            ariaLabel="Logout"
                            danger={true}
                            icon={
                                <IconLogout2
                                    color={theme.colors.red[6]}
                                    size={18}
                                />
                            }
                            label="Logout"
                            onClick={() => {
                                // TODO: wire logout action
                            }}
                            padding="md"
                            radius="lg"
                            withBorder
                            withChevron={false}
                        />
                    </Stack>
                </Stack>
            </PaddingContainer>
        </React.Fragment>
    );
};

export default SettingsPage;
