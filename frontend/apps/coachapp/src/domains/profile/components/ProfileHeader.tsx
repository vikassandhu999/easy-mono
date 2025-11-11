import {Avatar, Badge, Group, Paper, Stack, Text} from '@mantine/core';
import {FC} from 'react';

import {User} from '@/services/auth';

interface ProfileHeaderProps {
    user: User;
}

const ProfileHeader: FC<ProfileHeaderProps> = ({user}) => {
    // Generate initials from full name
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
                            {getInitials(user.full_name)}
                        </Avatar>
                        <Stack gap={4}>
                            <Text
                                fw={600}
                                size="xl"
                            >
                                {user.full_name}
                            </Text>
                            <Text
                                c="dimmed"
                                size="xs"
                            >
                                {user.email}
                                {user.email_verified ? (
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

export default ProfileHeader;
