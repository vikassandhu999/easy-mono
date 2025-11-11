import {Group, Stack, Text, useMantineTheme} from '@mantine/core';
import {IconChevronRight, IconLogs, IconNotification, IconShield, IconWorldWww} from '@tabler/icons-react';

const ProfileActionList = () => {
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
                },
                {
                    id: 'my_website',
                    label: 'Notifications',
                    icon: IconNotification,
                    link: '',
                },
                {
                    id: 'my_website',
                    label: 'Recent Activites',
                    icon: IconLogs,
                    link: '',
                },
                {
                    id: 'my_website',
                    label: 'Account & Privacy',
                    icon: IconShield,
                    link: '',
                },
            ].map(({id, label, icon}) => {
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
                            <Text>{label}</Text>
                        </Group>

                        <IconChevronRight color={theme.colors.gray[6]} />
                    </Group>
                );
            })}
        </Stack>
    );
};

export default ProfileActionList;
