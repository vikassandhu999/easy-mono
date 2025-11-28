import {Avatar, Badge, Button, Divider, Group, Stack, Text, ThemeIcon} from '@mantine/core';
import {IconChevronRight, IconLogs, IconNotification, IconShield, IconWorldWww} from '@tabler/icons-react';
import {FC} from 'react';
import {Link} from 'react-router';

import {useAuthActions} from '@/hooks/useAuthActions';
import {useProfileQuery, UserProfileResponse} from '@/services/auth';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';
import {notifyInfo} from '@/utils/notification';

import {ACTION_GRID_CONFIG, ActionGridConfig, LEGAL_LINKS, LegalLink} from '../config/ui';
import classes from './styles.module.css';

const ACTION_LIST_ITEMS = [
    {
        id: 'my_website',
        label: 'Website Manager',
        icon: IconWorldWww,
        link: '',
        badge: 'Coming Soon',
        color: 'gray',
    },

    {
        id: 'recent_activities',
        label: 'Recent Activities',
        icon: IconLogs,
        link: '',
        badge: 'Coming Soon',
        color: 'gray',
    },
    {
        id: 'account_privacy',
        label: 'Account & Privacy',
        icon: IconShield,
        link: '',
        color: 'gray',
    },
];

export default function MainProfilePage() {
    const {logout} = useAuthActions();
    const {data: profile, isLoading: profileLoading} = useProfileQuery();

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
                <Stack gap="xl">
                    {profile && <Header profile={profile} />}

                    <ActionGrid configs={ACTION_GRID_CONFIG} />
                    <ActionList />
                    <Divider />

                    <Button
                        className={classes.logoutButton}
                        color="red"
                        onClick={() => logout()}
                        radius="sm"
                        variant="light"
                    >
                        Logout
                    </Button>
                    <Divider />
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

interface ActionGridProps {
    configs: ActionGridConfig;
}

interface LegalLinksProps {
    links: LegalLink[];
}

const Header: FC<HeaderProps> = ({profile}) => {
    const getInitials = (name: string): string => {
        const parts = name.trim().split(' ');
        if (parts.length === 1) {
            return parts[0].substring(0, 2).toUpperCase();
        }
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const fullName = `${profile.user.first_name} ${profile.user.last_name}`;

    return (
        <div className={classes.profileCard}>
            <Avatar
                color="blue"
                name={fullName}
                radius="xl"
                size="xl"
            >
                {getInitials(profile.user.first_name)}
            </Avatar>
            <div className={classes.profileInfo}>
                <Text
                    className={classes.profileName}
                    fw={600}
                    size="xl"
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
            </div>
        </div>
    );
};

const ActionGrid: FC<ActionGridProps> = ({configs}) => {
    return (
        <div className={classes.actionGrid}>
            {configs.map(({id, label, icon: Icon, color}) => (
                <button
                    className={classes.actionGridCard}
                    key={id}
                    type="button"
                >
                    <ThemeIcon
                        color={color || 'blue'}
                        radius="md"
                        size="lg"
                        variant="light"
                    >
                        <Icon size={20} />
                    </ThemeIcon>
                    <Text
                        fw={500}
                        size="sm"
                    >
                        {label}
                    </Text>
                </button>
            ))}
        </div>
    );
};

const ActionList = () => {
    const handleItemClick = (badge?: string) => {
        if (badge === 'Coming Soon') {
            notifyInfo('This feature will be available in upcoming versions. We are working on it!', {
                title: 'Coming Soon',
            });
        }
    };

    return (
        <div className={classes.actionList}>
            <Text
                c="dimmed"
                className={classes.sectionTitle}
                fw={600}
                size="xs"
                tt="uppercase"
            >
                Other Actions
            </Text>

            <div className={classes.actionList}>
                {ACTION_LIST_ITEMS.map(({id, label, icon: Icon, badge, color}) => (
                    <button
                        className={classes.actionListItem}
                        key={id}
                        onClick={() => handleItemClick(badge)}
                        type="button"
                    >
                        <div className={classes.actionListLeft}>
                            <ThemeIcon
                                color={color || 'gray'}
                                radius="md"
                                size="md"
                                variant="light"
                            >
                                <Icon size={16} />
                            </ThemeIcon>
                            <Text size="sm">{label}</Text>
                            {badge && (
                                <Badge
                                    color="yellow"
                                    size="xs"
                                    variant="light"
                                >
                                    {badge}
                                </Badge>
                            )}
                        </div>
                        <IconChevronRight
                            className={classes.chevron}
                            size={18}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
};

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
