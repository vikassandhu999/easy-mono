import {Avatar, Card, Group, Stack, Text, useMantineTheme} from '@mantine/core';
import {IconHelp, IconInfoCircle, IconLock, IconLogout2, IconUser} from '@tabler/icons-react';
import React, {useMemo} from 'react';
import {useNavigate} from 'react-router';

import ActionListCard from '@/domains/settings/components/ActionListCard';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import {useGetProfileQuery, type Profile} from '@/services/profile';
import Header from '@/shared/layouts/Header';
import HeadingContainer from '@/shared/containers/HeaderContainer';

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
            radius="lg"
            padding="lg"
            style={{
                boxShadow: 'none',
            }}
            withBorder
        >
            <Group justify="space-between" align="center" wrap="nowrap">
                <Group gap="md" wrap="nowrap">
                    <Avatar radius="xl" size="lg" variant="outline" color="brand">
                        {initials}
                    </Avatar>
                    <Stack gap={2}>
                        <Group gap="xs">
                            <Text fw={600}>{isLoading ? 'Loading…' : profile?.full_name || '—'}</Text>
                        </Group>
                        <Text size="sm" c="dimmed">
                            {isLoading ? '—' : profile?.email || '—'}
                        </Text>
                        {!!profile?.business?.name && (
                            <Text size="sm" c="dimmed">
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
    const theme = useMantineTheme()
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
              <Header title='Settings' />
            </HeadingContainer>
            <PaddingContainer style={{
              paddingTop : theme.spacing.lg
            }}>
                <Stack gap="xl">
                    <SummaryCard profile={profile} isLoading={isLoading} />

                    <Stack gap="md">
                        {actions.map((action) => (
                            <ActionListCard
                                key={action.label}
                                label={action.label}
                                description={action.description}
                                icon={action.icon}
                                disabled={action.disabled}
                                danger={false}
                                ariaLabel={action.description ? `${action.label}. ${action.description}` : action.label}
                                onClick={() => {
                                    if (action.to && !action.disabled) navigate(action.to);
                                }}
                                withBorder
                                radius="lg"
                                padding="md"
                            />
                        ))}

                        <ActionListCard
                            label="Logout"
                            icon={<IconLogout2 size={18} color={theme.colors.red[6]} />}
                            ariaLabel="Logout"
                            withChevron={false}
                            onClick={() => {
                                // TODO: wire logout action
                            }}
                            withBorder
                            radius="lg"
                            padding="md"
                            danger={true}
                        />
                    </Stack>

                </Stack>
            </PaddingContainer>
      </React.Fragment>
    );
};

export default SettingsPage;
