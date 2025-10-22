import {Avatar, Badge, Button, Card, Group, Stack, Text} from '@mantine/core';
import {IconBriefcase, IconCalendar, IconInfoCircle, IconMail, IconUser as IconUserIcon} from '@tabler/icons-react';
import {formatDistanceToNow} from 'date-fns';
import {FC} from 'react';

import {Coach} from '@/store/services/coach';

import {InfoRow} from '../InfoRow';

const ProfileTab: FC<{coach: Coach}> = ({coach}) => {
    const memberSince = coach.created_at
        ? formatDistanceToNow(new Date(coach.created_at), {addSuffix: true})
        : 'Unknown';
    return (
        <Stack gap="lg">
            <Group
                justify="space-between"
                px="lg"
                py="sm"
            >
                <Group>
                    <Avatar src={coach.profile_picture_url}>{coach.name[0]}</Avatar>
                    <Stack>
                        <Text lh={0}>{coach.name}</Text>
                        <Badge
                            color="gray"
                            size="xs"
                            variant="light"
                        >
                            Coach
                        </Badge>
                    </Stack>
                </Group>

                <Button
                    size="compact-sm"
                    variant="light"
                >
                    {' '}
                    Edit Profile
                </Button>
            </Group>
            <Card p="lg">
                <Stack gap="md">
                    <Text
                        c="dimmed"
                        fw={600}
                        size="sm"
                        tt="uppercase"
                    >
                        Personal information
                    </Text>

                    <Stack gap="md">
                        <InfoRow
                            icon={IconUserIcon}
                            label="Full name"
                            value={coach.name}
                        />
                        <InfoRow
                            icon={IconMail}
                            label="Email address"
                            value={coach.email}
                        />
                        <InfoRow
                            icon={IconBriefcase}
                            label="Professional title"
                            value={coach.title}
                        />

                        <InfoRow
                            icon={IconBriefcase}
                            label="Specialization"
                            value={coach.specialization}
                        />

                        <InfoRow
                            icon={IconCalendar}
                            label="Years of experience"
                            value={coach.experience_years ? `${coach.experience_years} years` : 'NA'}
                        />

                        <InfoRow
                            icon={IconInfoCircle}
                            label="Bio"
                            value={coach.bio || coach.biography ? `${coach.bio ?? coach.biography} ` : 'NA'}
                        />

                        <InfoRow
                            icon={IconCalendar}
                            label="Qualication"
                            value={coach.qualifications ? `${coach.qualifications}` : 'NA'}
                        />
                    </Stack>
                </Stack>
            </Card>

            <Card p="lg">
                <Stack gap="md">
                    <Text
                        c="dimmed"
                        fw={600}
                        size="sm"
                        tt="uppercase"
                    >
                        OTHERS
                    </Text>

                    <InfoRow
                        icon={IconCalendar}
                        label="Member since"
                        value={memberSince}
                        withoutBorder={true}
                    />
                </Stack>
            </Card>
        </Stack>
    );
};

export default ProfileTab;
