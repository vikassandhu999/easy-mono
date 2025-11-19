import {
    Alert,
    Avatar,
    Badge,
    Button,
    Card,
    Group,
    LoadingOverlay,
    Paper,
    SimpleGrid,
    Stack,
    Text,
    useMantineTheme,
} from '@mantine/core';
import {IconChevronRight, IconHeart, IconLogs, IconNotification, IconShield, IconWorldWww} from '@tabler/icons-react';
import {FC} from 'react';
import {Link} from 'react-router';

import {useAuthActions} from '@/hooks/useAuthActions';
import {useProfileQuery, UserProfileResponse} from '@/services/auth';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';

import {ACTION_GRID_CONFIG, ActionGridConfig, LEGAL_LINKS, LegalLink} from '../config/ui';

export default function MainProfilePage() {
    const {logout} = useAuthActions();

    const {data: profile, isLoading: profileLoading} = useProfileQuery();
    const loading = profileLoading;

    return (
        <PagePaper>
            <LoadingOverlay visible={loading} />
            <PaddingContainer>
                <Stack gap="xl">
                    {profile && <Header profile={profile} />}

                    <ActionGrid configs={ACTION_GRID_CONFIG} />
                    <ActionList />

                    <Alert
                        color="pink"
                        icon={<IconHeart />}
                        title="Help us improving"
                    >
                        <Text fs="italic">
                            We are in beta phase. So please help improving. Report any bug you encounter or you can ask
                            for feature that you think can be of some value.
                        </Text>
                    </Alert>
                    <LegalLinks links={LEGAL_LINKS} />

                    <Button
                        color="red"
                        onClick={() => logout()}
                        variant="outline"
                    >
                        Logout
                    </Button>
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

    return (
        <Paper
            py="sm"
            radius="md"
        >
            <Stack gap="md">
                {/* Header section with Avatar and name */}
                <Group
                    align="flex-start"
                    gap="md"
                    justify="space-between"
                    w="100%"
                >
                    <Group>
                        <Avatar
                            color="blue"
                            radius="xl"
                            size="lg"
                        >
                            {getInitials(profile.user.first_name)}
                        </Avatar>
                        <Stack gap={4}>
                            <Text
                                fw={600}
                                size="xl"
                            >
                                {profile.user.first_name + ' ' + profile.user.last_name}
                            </Text>
                            <Text
                                c="dimmed"
                                size="xs"
                            >
                                {profile.user.email}
                                {profile.user.email_verified ? (
                                    <Badge
                                        color="green"
                                        size="sm"
                                        variant="light"
                                    >
                                        Verified
                                    </Badge>
                                ) : (
                                    <Badge
                                        color="gray"
                                        size="sm"
                                        variant="light"
                                    >
                                        Not Verified
                                    </Badge>
                                )}
                            </Text>
                        </Stack>
                    </Group>
                </Group>
            </Stack>
        </Paper>
    );
};

const ActionGrid: FC<ActionGridProps> = ({configs}) => {
    return (
        <SimpleGrid cols={2}>
            {configs.map(({id, label, icon: Icon}) => {
                return (
                    <Card
                        key={id}
                        withBorder
                    >
                        <Group>
                            <Icon />
                            <Text>{label}</Text>
                        </Group>
                    </Card>
                );
            })}
        </SimpleGrid>
    );
};

const ActionList = () => {
    const theme = useMantineTheme();

    return (
        <Stack>
            <Text
                c="dimmed"
                fw="bold"
                size="sm"
            >
                OTHER ACTIONS
            </Text>
            {[
                {
                    id: 'my_website',
                    label: 'Website Manager',
                    icon: IconWorldWww,
                    link: '',
                    badge: 'Comming Soon',
                },
                {
                    id: 'notifications',
                    label: 'Notifications',
                    icon: IconNotification,
                    link: '',
                    badge: 'Comming Soon',
                },
                {
                    id: 'recent_activities',
                    label: 'Recent Activites',
                    icon: IconLogs,
                    link: '',
                    badge: 'Comming Soon',
                },
                {
                    id: 'account_privacy',
                    label: 'Account & Privacy',
                    icon: IconShield,
                    link: '',
                },
            ].map(({id, label, icon, badge}) => {
                const IconElem = icon;
                return (
                    <Group
                        align="center"
                        justify="space-between"
                        key={id}
                        py="sm"
                        style={{
                            borderBottom: `1px solid ${theme.colors.gray[4]}`,
                        }}
                    >
                        <Group>
                            <IconElem color={theme.colors.gray[5]} />
                            <Text>
                                {label}

                                {badge && (
                                    <Badge
                                        color="yellow"
                                        size="xs"
                                        variant="light"
                                    >
                                        {badge}
                                    </Badge>
                                )}
                            </Text>
                        </Group>

                        <IconChevronRight color={theme.colors.gray[6]} />
                    </Group>
                );
            })}
        </Stack>
    );
};

const LegalLinks: FC<LegalLinksProps> = ({links}) => {
    return (
        <Stack>
            {links.map(({id, label, link}) => {
                return (
                    <Text
                        c="dimmed"
                        component={Link}
                        fw="500"
                        key={id}
                        size="xs"
                        to={link}
                        tt="uppercase"
                    >
                        {label}
                    </Text>
                );
            })}
        </Stack>
    );
};
