import {ActionIcon, Avatar, Badge, Box, CopyButton, Divider, Group, Stack, Text, ThemeIcon, Tooltip, UnstyledButton} from '@mantine/core';
import {modals} from '@mantine/modals';
import {
    IconBuilding,
    IconCalendar,
    IconCheck,
    IconChevronRight,
    IconCopy,
    IconCreditCard,
    IconExternalLink,
    IconShare,
    IconUser,
    IconUsers,
} from '@tabler/icons-react';
import {FC, useMemo} from 'react';
import {Link, useNavigate} from 'react-router';

import {DRAWER_KEYS} from '@/configs';
import {useAuthActions} from '@/hooks/useAuthActions';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {useProfileQuery, UserProfileResponse} from '@/services/auth';
import {useGetBusinessSettingsQuery} from '@/services/settings/settings';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';
import {notifyInfo, notifySuccess} from '@/utils/notification';

import {LEGAL_LINKS, LegalLink} from '../config/ui';
import classes from './styles.module.css';


export default function SettingsPage() {
    const navigate = useNavigate();
    const {logout} = useAuthActions();
    const {openDrawer} = useParamsDrawer({});
    const {data: profile, isLoading: profileLoading} = useProfileQuery();
    const {data: settings} = useGetBusinessSettingsQuery();

    const handleLogout = () => {
        modals.openConfirmModal({
            title: 'Logout',
            children: <Text size="sm">Are you sure you want to logout from your account?</Text>,
            labels: {confirm: 'Logout', cancel: 'Cancel'},
            confirmProps: {color: 'red'},
            cancelProps: {variant: 'light'},
            centered: true,
            onConfirm: () => logout(),
        });
    };

    const handleSettingClick = (id: string) => {
        switch (id) {
            case 'profile':
                openDrawer(DRAWER_KEYS.COACH_PROFILE_EDIT);
                break;
            case 'business':
                openDrawer(DRAWER_KEYS.BUSINESS_EDIT);
                break;
            default:
                notifyInfo('This feature is coming soon!', {title: 'Coming Soon'});
                break;
        }
    };

    if (profileLoading) {
        return (
            <PagePaper>
                <PaddingContainer>
                    <div className={classes.loadingState}>
                        <Text c="dimmed">Loading profile...</Text>
                    </div>
                </PaddingContainer>
            </PagePaper>
        );
    }

    return (
        <PagePaper>
            <PaddingContainer>
                <Stack gap="lg">
                    {/* Header */}
                    {profile && <Header profile={profile} />}

                    {/* Share Page Card */}
                    {settings?.public_join_url && <SharePageCard joinUrl={settings.public_join_url} />}

                    {/* Stats Row */}
                    {profile && <StatsRow profile={profile} navigate={navigate} />}

                    {/* Settings List */}
                    <SettingsList onItemClick={handleSettingClick} />

                    {/* Logout Button */}
                    <UnstyledButton
                        className={classes.logoutButton}
                        onClick={handleLogout}
                    >
                        Logout
                    </UnstyledButton>

                    <Divider />

                    {/* Legal Links */}
                    <LegalLinks links={LEGAL_LINKS} />
                </Stack>
            </PaddingContainer>
        </PagePaper>
    );
}

/*
     PAGE SPECIFIC COMPONENTS
*/

interface HeaderProps {
    profile: UserProfileResponse;
}

const Header: FC<HeaderProps> = ({profile}) => {
    const getInitials = (name: string): string => {
        const parts = name.trim().split(' ');
        if (parts.length === 0 || !parts[0]) {
            return '';
        }
        if (parts.length === 1) {
            return parts[0].substring(0, 2).toUpperCase();
        }
        const firstInitial = parts[0]?.[0] ?? '';
        const lastInitial = parts[parts.length - 1]?.[0] ?? '';
        return (firstInitial + lastInitial).toUpperCase();
    };

    const fullName = `${profile.user.first_name} ${profile.user.last_name}`;

    return (
        <Group
            gap="md"
            wrap="nowrap"
        >
            <Avatar
                color="blue"
                name={fullName}
                radius="xl"
                size="lg"
            >
                {getInitials(profile.user.first_name)}
            </Avatar>
            <Stack gap={2}>
                <Text
                    fw={600}
                    size="lg"
                >
                    {fullName}
                </Text>
                <Group gap="xs">
                    <Text
                        c="dimmed"
                        size="sm"
                    >
                        {profile.user.email}
                    </Text>
                    <Badge
                        color={profile.user.email_verified ? 'green' : 'gray'}
                        size="xs"
                        variant="light"
                    >
                        {profile.user.email_verified ? 'Verified' : 'Not Verified'}
                    </Badge>
                </Group>
            </Stack>
        </Group>
    );
};

interface StatsRowProps {
    profile: UserProfileResponse;
    navigate: (path: string) => void;
}

const StatsRow: FC<StatsRowProps> = ({profile, navigate}) => {
    const stats = useMemo(() => {
        const coachStats = profile?.coach?.stats;
        return [
            {
                color: 'blue',
                icon: IconCalendar,
                label: 'Plans',
                value: coachStats?.total_plans ?? 0,
                onClick: () => navigate('/plans'),
            },
            {
                color: 'green',
                icon: IconUsers,
                label: 'Clients',
                value: coachStats?.total_clients ?? 0,
                onClick: () => navigate('/clients'),
            },
        ];
    }, [profile?.coach?.stats, navigate]);

    return (
        <Group
            grow
            gap="md"
        >
            {stats.map((stat) => (
                <UnstyledButton
                    key={stat.label}
                    onClick={stat.onClick}
                    style={{
                        padding: 'var(--mantine-spacing-md)',
                        borderRadius: 'var(--mantine-radius-md)',
                        border: '1px solid var(--mantine-color-gray-2)',
                        background: 'white',
                    }}
                >
                    <Group
                        gap="sm"
                        wrap="nowrap"
                    >
                        <ThemeIcon
                            color={stat.color}
                            radius="md"
                            size="lg"
                            variant="light"
                        >
                            <stat.icon size={18} />
                        </ThemeIcon>
                        <Stack gap={0}>
                            <Text
                                fw={700}
                                size="lg"
                                lh={1.2}
                            >
                                {stat.value}
                            </Text>
                            <Text
                                c="dimmed"
                                size="xs"
                            >
                                {stat.label}
                            </Text>
                        </Stack>
                    </Group>
                </UnstyledButton>
            ))}
        </Group>
    );
};

const SETTINGS_ITEMS = [
    {id: 'profile', label: ' My Profile', icon: IconUser, color: 'blue'},
    {id: 'business', label: 'Business Profile', icon: IconBuilding, color: 'green'},
    {id: 'subscription', label: 'Subscription', icon: IconCreditCard, color: 'violet'},
];

interface SettingsListProps {
    onItemClick: (id: string) => void;
}

const SettingsList: FC<SettingsListProps> = ({onItemClick}) => {
    return (
        <Box
            style={{
                borderRadius: 'var(--mantine-radius-md)',
                border: '1px solid var(--mantine-color-gray-2)',
                overflow: 'hidden',
                background: 'white',
            }}
        >
            {SETTINGS_ITEMS.map((item, index) => (
                <UnstyledButton
                    key={item.id}
                    onClick={() => onItemClick(item.id)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: 'var(--mantine-spacing-md)',
                        borderBottom: index < SETTINGS_ITEMS.length - 1 ? '1px solid var(--mantine-color-gray-2)' : 'none',
                    }}
                >
                    <Group
                        gap="sm"
                        wrap="nowrap"
                    >
                        <ThemeIcon
                            color={item.color}
                            radius="md"
                            size="md"
                            variant="light"
                        >
                            <item.icon size={16} />
                        </ThemeIcon>
                        <Text
                            fw={500}
                            size="sm"
                        >
                            {item.label}
                        </Text>
                    </Group>
                    <IconChevronRight
                        size={16}
                        color="var(--mantine-color-gray-5)"
                    />
                </UnstyledButton>
            ))}
        </Box>
    );
};

const SharePageCard: FC<{joinUrl: string}> = ({joinUrl}) => {
    const handleOpenPage = () => {
        window.open(joinUrl, '_blank');
    };

    return (
        <Box
            p="md"
            style={{
                borderRadius: 'var(--mantine-radius-md)',
                background: 'linear-gradient(135deg, var(--mantine-color-violet-6) 0%, var(--mantine-color-indigo-6) 100%)',
            }}
        >
            <Group
                justify="space-between"
                wrap="nowrap"
            >
                <Group
                    gap="sm"
                    wrap="nowrap"
                >
                    <ThemeIcon
                        color="white"
                        radius="md"
                        size="lg"
                        variant="transparent"
                    >
                        <IconShare size={20} />
                    </ThemeIcon>
                    <Stack gap={0}>
                        <Text
                            c="white"
                            fw={600}
                            size="sm"
                        >
                            Share Your Page
                        </Text>
                        <Text
                            c="rgba(255,255,255,0.7)"
                            size="xs"
                        >
                            Invite clients to join
                        </Text>
                    </Stack>
                </Group>
                <Group gap="xs">
                    <CopyButton
                        timeout={2000}
                        value={joinUrl}
                    >
                        {({copied, copy}) => (
                            <Tooltip label={copied ? 'Copied!' : 'Copy link'}>
                                <ActionIcon
                                    color="white"
                                    onClick={() => {
                                        copy();
                                        notifySuccess('Link copied to clipboard!');
                                    }}
                                    radius="md"
                                    size="lg"
                                    variant="subtle"
                                >
                                    {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </CopyButton>
                    <Tooltip label="Open page">
                        <ActionIcon
                            color="white"
                            onClick={handleOpenPage}
                            radius="md"
                            size="lg"
                            variant="subtle"
                        >
                            <IconExternalLink size={18} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
        </Box>
    );
};

interface LegalLinksProps {
    links: LegalLink[];
}

const LegalLinks: FC<LegalLinksProps> = ({links}) => {
    return (
        <div className={classes.legalLinks}>
            {links.map(({id, label, link}) => (
                <Link
                    className={classes.legalLink}
                    key={id}
                    to={link}
                >
                    {label}
                </Link>
            ))}
        </div>
    );
};
