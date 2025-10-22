import {Alert, Box, Button, Card, Group, Stack, Text, ThemeIcon, useMantineTheme} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {
    IconBug,
    IconChevronRight,
    IconHeart,
    IconLogout2,
    IconPhoneCall,
    IconShield,
    IconTable,
} from '@tabler/icons-react';
import {FC, useTransition} from 'react';
import {Link, useNavigate} from 'react-router';

import {useAuth} from '@/providers/AuthProvider';
import {Coach} from '@/store/services/coach';

import {LogoutConfirmModal} from '../LogoutConfirmModal';

const HELP_AND_LEGAL_LINKS = [
    {
        id: 'privacy',
        label: 'Privacy Policy',
        url: 'https://coacheasyapp.com/privacy-policy',
        icon: IconShield,
    },
    {
        id: 'terms',
        label: 'Terms of Service',
        url: 'https://coacheasyapp.com/terms-of-service',
        icon: IconTable,
    },
    {
        id: 'report a bug!',
        label: 'Report a Bug',
        url: 'https://example.com/report-a-bug',
        icon: IconBug,
    },
    {
        id: 'contact',
        label: 'Contact Us',
        url: 'https://example.com/contact-us',
        icon: IconPhoneCall,
    },
];

const OtherTab: FC<{coach: Coach}> = () => {
    const navigate = useNavigate();
    const theme = useMantineTheme();
    const {logout} = useAuth();

    const [logoutModalOpened, {open: openLogoutModal, close: closeLogoutModal}] = useDisclosure(false);
    const [isLoggingOut, startTransition] = useTransition();

    const handleLogout = async () => {
        try {
            await logout();
            closeLogoutModal();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            closeLogoutModal();
        }
    };

    const handleLogoutWithTransition = () => {
        startTransition(() => {
            handleLogout();
        });
    };

    return (
        <Stack gap="lg">
            <Alert
                color="blue"
                icon={<IconHeart />}
                radius="md"
                title="Help us improve!"
                variant="light"
            >
                <Text fs="italic">
                    We are in beta version. Your feedback helps us build a better experience — please share any bugs you
                    encounter or features you'd like to see. ❤️ Thank you for your support!
                </Text>
            </Alert>
            <Card p="lg">
                <Stack gap="md">
                    <Text
                        c="dimmed"
                        fw={600}
                        size="sm"
                        tt="uppercase"
                    >
                        Help & legal
                    </Text>
                    <Stack gap="xs">
                        {HELP_AND_LEGAL_LINKS.map((link, idx) => (
                            <Box
                                component={Link}
                                key={idx}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    textAlign: 'left',
                                    width: '100%',
                                    textDecoration: 'none',
                                    color: theme.colors.gray[6],
                                }}
                                to={link.url}
                                type="button"
                            >
                                <Group
                                    gap="md"
                                    justify="space-between"
                                    p="md"
                                    style={(theme) => ({
                                        borderRadius: theme.radius.sm,
                                        transition: 'background-color 150ms ease',
                                    })}
                                    styles={{
                                        root: {
                                            '&:hover': {
                                                backgroundColor: 'var(--mantine-color-gray-0)',
                                            },
                                        },
                                    }}
                                    wrap="nowrap"
                                >
                                    <Group
                                        gap="md"
                                        wrap="nowrap"
                                    >
                                        <ThemeIcon
                                            color="gray"
                                            radius="md"
                                            size="md"
                                            variant="light"
                                        >
                                            <link.icon size={18} />
                                        </ThemeIcon>
                                        <Text
                                            fw={500}
                                            size="sm"
                                        >
                                            {link.label}
                                        </Text>
                                    </Group>
                                    <IconChevronRight
                                        color="var(--mantine-color-gray-6)"
                                        size={18}
                                    />
                                </Group>
                            </Box>
                        ))}

                        <Button
                            color="red"
                            leftSection={<IconLogout2 size={18} />}
                            onClick={openLogoutModal}
                            size="lg"
                            variant="light"
                        >
                            Logout
                        </Button>
                    </Stack>
                </Stack>
            </Card>

            <LogoutConfirmModal
                loading={isLoggingOut}
                onClose={closeLogoutModal}
                onLogout={handleLogoutWithTransition}
                opened={logoutModalOpened}
            />
        </Stack>
    );
};

export default OtherTab;
