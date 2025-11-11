import {Avatar, Badge, Card, Group, Loader, Stack, Text, Title} from '@mantine/core';
import {IconBriefcase, IconMail, IconShieldCheck, IconUser} from '@tabler/icons-react';
import {memo} from 'react';

import {useUser} from '@/providers/UserProvider';

/**
 * Type guard to check if user has a coach profile
 */
function isCoach(user: {coach_profile?: unknown; roles: string[]}): user is {
    coach_profile: NonNullable<typeof user.coach_profile>;
    roles: string[];
} {
    return user.roles.includes('coach') && user.coach_profile !== undefined;
}

/**
 * Type guard to check if user has a client profile
 */
function isClient(user: {client_profile?: unknown; roles: string[]}): user is {
    client_profile: NonNullable<typeof user.client_profile>;
    roles: string[];
} {
    return user.roles.includes('client') && user.client_profile !== undefined;
}

/**
 * UserProfileDisplay component
 * Demonstrates how to access and display user profile data using the useUser hook
 *
 * This component shows:
 * - Loading state handling
 * - Unauthenticated state handling
 * - Basic user information display (name, email, verification status)
 * - Role-specific profile information (coach or client)
 * - Type-safe access to optional profile properties
 *
 * @example
 * ```tsx
 * <UserProfileDisplay />
 * ```
 */
const UserProfileDisplay = memo(() => {
    const {user, isLoading} = useUser();

    // Handle loading state
    if (isLoading) {
        return (
            <Card
                p="xl"
                radius="md"
                shadow="sm"
            >
                <Stack
                    align="center"
                    gap="md"
                >
                    <Loader
                        size="lg"
                        type="dots"
                    />
                    <Text
                        c="dimmed"
                        size="sm"
                    >
                        Loading user profile...
                    </Text>
                </Stack>
            </Card>
        );
    }

    // Handle unauthenticated state
    if (!user) {
        return (
            <Card
                p="xl"
                radius="md"
                shadow="sm"
            >
                <Stack
                    align="center"
                    gap="md"
                >
                    <IconUser
                        color="var(--mantine-color-gray-5)"
                        size={48}
                    />
                    <div style={{textAlign: 'center'}}>
                        <Text
                            fw={500}
                            size="lg"
                        >
                            Not Authenticated
                        </Text>
                        <Text
                            c="dimmed"
                            mt={4}
                            size="sm"
                        >
                            Please log in to view your profile
                        </Text>
                    </div>
                </Stack>
            </Card>
        );
    }

    // Get user initials for avatar
    const initials = user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <Card
            p="xl"
            radius="md"
            shadow="sm"
        >
            <Stack gap="lg">
                {/* User Header */}
                <Group
                    gap="md"
                    wrap="nowrap"
                >
                    <Avatar
                        color="blue"
                        radius="xl"
                        size="xl"
                        variant="light"
                    >
                        {initials}
                    </Avatar>
                    <Stack gap={4}>
                        <Group gap="xs">
                            <Title
                                order={3}
                                size="h4"
                            >
                                {user.full_name}
                            </Title>
                            {user.email_verified && (
                                <IconShieldCheck
                                    color="var(--mantine-color-green-6)"
                                    size={20}
                                />
                            )}
                        </Group>
                        <Group gap="xs">
                            <IconMail
                                color="var(--mantine-color-gray-6)"
                                size={16}
                            />
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                {user.email}
                            </Text>
                        </Group>
                    </Stack>
                </Group>

                {/* Roles */}
                <div>
                    <Text
                        c="dimmed"
                        fw={600}
                        mb="xs"
                        size="xs"
                        tt="uppercase"
                    >
                        Roles
                    </Text>
                    <Group gap="xs">
                        {user.roles.map((role) => (
                            <Badge
                                color="blue"
                                key={role}
                                variant="light"
                            >
                                {role}
                            </Badge>
                        ))}
                    </Group>
                </div>

                {/* Coach Profile Section */}
                {isCoach(user) && (
                    <div>
                        <Text
                            c="dimmed"
                            fw={600}
                            mb="xs"
                            size="xs"
                            tt="uppercase"
                        >
                            Coach Profile
                        </Text>
                        <Stack gap="sm">
                            <Group gap="xs">
                                <IconBriefcase
                                    color="var(--mantine-color-gray-6)"
                                    size={16}
                                />
                                <Text size="sm">
                                    <Text
                                        component="span"
                                        fw={500}
                                    >
                                        Status:
                                    </Text>{' '}
                                    <Badge
                                        color={user.coach_profile.status === 'active' ? 'green' : 'gray'}
                                        size="sm"
                                        variant="light"
                                    >
                                        {user.coach_profile.status}
                                    </Badge>
                                </Text>
                            </Group>
                            {user.coach_profile.business_id && (
                                <Text size="sm">
                                    <Text
                                        component="span"
                                        fw={500}
                                    >
                                        Business ID:
                                    </Text>{' '}
                                    <Text
                                        c="dimmed"
                                        component="span"
                                    >
                                        {user.coach_profile.business_id}
                                    </Text>
                                </Text>
                            )}
                            {user.coach_profile.bio && (
                                <Text size="sm">
                                    <Text
                                        component="span"
                                        fw={500}
                                    >
                                        Bio:
                                    </Text>{' '}
                                    <Text
                                        c="dimmed"
                                        component="span"
                                    >
                                        {user.coach_profile.bio}
                                    </Text>
                                </Text>
                            )}
                            {user.coach_profile.specialties.length > 0 && (
                                <div>
                                    <Text
                                        fw={500}
                                        mb={4}
                                        size="sm"
                                    >
                                        Specialties:
                                    </Text>
                                    <Group gap="xs">
                                        {user.coach_profile.specialties.map((specialty) => (
                                            <Badge
                                                color="teal"
                                                key={specialty}
                                                size="sm"
                                                variant="light"
                                            >
                                                {specialty}
                                            </Badge>
                                        ))}
                                    </Group>
                                </div>
                            )}
                        </Stack>
                    </div>
                )}

                {/* Client Profile Section */}
                {isClient(user) && (
                    <div>
                        <Text
                            c="dimmed"
                            fw={600}
                            mb="xs"
                            size="xs"
                            tt="uppercase"
                        >
                            Client Profile
                        </Text>
                        <Stack gap="sm">
                            <Group gap="xs">
                                <IconUser
                                    color="var(--mantine-color-gray-6)"
                                    size={16}
                                />
                                <Text size="sm">
                                    <Text
                                        component="span"
                                        fw={500}
                                    >
                                        Status:
                                    </Text>{' '}
                                    <Badge
                                        color={user.client_profile.status === 'active' ? 'green' : 'gray'}
                                        size="sm"
                                        variant="light"
                                    >
                                        {user.client_profile.status}
                                    </Badge>
                                </Text>
                            </Group>
                            {user.client_profile.business_id && (
                                <Text size="sm">
                                    <Text
                                        component="span"
                                        fw={500}
                                    >
                                        Business ID:
                                    </Text>{' '}
                                    <Text
                                        c="dimmed"
                                        component="span"
                                    >
                                        {user.client_profile.business_id}
                                    </Text>
                                </Text>
                            )}
                            {user.client_profile.phone && (
                                <Text size="sm">
                                    <Text
                                        component="span"
                                        fw={500}
                                    >
                                        Phone:
                                    </Text>{' '}
                                    <Text
                                        c="dimmed"
                                        component="span"
                                    >
                                        {user.client_profile.phone}
                                    </Text>
                                </Text>
                            )}
                            {user.client_profile.notes && (
                                <Text size="sm">
                                    <Text
                                        component="span"
                                        fw={500}
                                    >
                                        Notes:
                                    </Text>{' '}
                                    <Text
                                        c="dimmed"
                                        component="span"
                                    >
                                        {user.client_profile.notes}
                                    </Text>
                                </Text>
                            )}
                        </Stack>
                    </div>
                )}

                {/* User ID (for debugging) */}
                <div>
                    <Text
                        c="dimmed"
                        size="xs"
                    >
                        User ID: {user.id}
                    </Text>
                </div>
            </Stack>
        </Card>
    );
});

UserProfileDisplay.displayName = 'UserProfileDisplay';

export default UserProfileDisplay;
