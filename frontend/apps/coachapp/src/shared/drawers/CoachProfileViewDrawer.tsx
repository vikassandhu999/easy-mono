import {
    Anchor,
    Badge,
    Button,
    Divider,
    Group,
    Loader,
    Stack,
    Text,
    ThemeIcon,
} from '@mantine/core';
import {Icon, IconPencil, IconProps} from '@tabler/icons-react';
import {
    IconAward,
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandX,
    IconBrandYoutube,
    IconBriefcase,
    IconExternalLink,
} from '@tabler/icons-react';
import {FC} from 'react';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {useProfileQuery, UserProfileResponse} from '@/services/auth';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';

const CoachProfileViewDrawer = () => {
    const {closeDrawer, openDrawer} = useParamsDrawer({});

    const {data: profile, isLoading: isLoadingProfile} = useProfileQuery();

    const handleEdit = () => {
        openDrawer(DRAWER_KEYS.COACH_PROFILE_EDIT);
    };

    if (isLoadingProfile) {
        return (
            <AutoDrawer
                content={
                    <Stack align="center" justify="center" py="xl">
                        <Loader size="sm" />
                        <Text c="dimmed" size="sm">
                            Loading profile...
                        </Text>
                    </Stack>
                }
                onClose={closeDrawer}
                title="My Profile"
            />
        );
    }

    if (!profile) {
        return (
            <AutoDrawer
                content={
                    <Text c="red" size="sm">
                        Profile not found
                    </Text>
                }
                onClose={closeDrawer}
                title="My Profile"
            />
        );
    }

    return (
        <AutoDrawer
            actions={
                <Group w="100%">
                    <Button
                        color="blue"
                        flex={1}
                        leftSection={<IconPencil size={16} />}
                        onClick={handleEdit}
                        radius="xl"
                        size="sm"
                        variant="filled"
                    >
                        Edit
                    </Button>
                </Group>
            }
            content={<ProfileContent profile={profile} />}
            onClose={closeDrawer}
            title="My Profile"
        />
    );
};

interface ProfileContentProps {
    profile: UserProfileResponse;
}

const ProfileContent: FC<ProfileContentProps> = ({profile}) => {
    const coach = profile.coach;
    const user = profile.user;

    const fullName = `${user.first_name} ${user.last_name}`;
    const hasSpecialties = coach?.specialties && coach.specialties.length > 0;
    const hasCertifications = coach?.certifications && coach.certifications.length > 0;
    const hasSocialLinks =
        coach?.instagram_url || coach?.facebook_url || coach?.youtube_url || coach?.x_url;

    return (
        <Stack gap="lg">
            {/* Personal Info Section */}
            <Section title="Personal Information">
                <InfoRow label="Name" value={fullName} />
                <InfoRow label="Email" value={user.email} />
            </Section>

            <Divider />

            {/* Coach Info Section */}
            <Section title="Coach Profile">
                {coach?.bio ? (
                    <Stack gap={4}>
                        <Text c="dimmed" size="xs">
                            Bio
                        </Text>
                        <Text size="sm" style={{whiteSpace: 'pre-wrap'}}>
                            {coach.bio}
                        </Text>
                    </Stack>
                ) : (
                    <EmptyState text="No bio added yet" />
                )}

                {coach?.years_of_experience !== null && coach?.years_of_experience !== undefined && (
                    <Group gap="xs" mt="sm">
                        <ThemeIcon color="blue" radius="md" size="sm" variant="light">
                            <IconBriefcase size={14} />
                        </ThemeIcon>
                        <Text size="sm">
                            {coach.years_of_experience}{' '}
                            {coach.years_of_experience === 1 ? 'year' : 'years'} of experience
                        </Text>
                    </Group>
                )}
            </Section>

            <Divider />

            {/* Specialties Section */}
            <Section title="Specialties">
                {hasSpecialties ? (
                    <Group gap="xs" wrap="wrap">
                        {coach.specialties.map((specialty) => (
                            <Badge key={specialty} size="lg" variant="light">
                                {specialty}
                            </Badge>
                        ))}
                    </Group>
                ) : (
                    <EmptyState text="No specialties added yet" />
                )}
            </Section>

            <Divider />

            {/* Certifications Section */}
            <Section title="Certifications">
                {hasCertifications ? (
                    <Stack gap="xs">
                        {coach.certifications.map((cert) => (
                            <Group gap="xs" key={cert} wrap="nowrap">
                                <ThemeIcon color="green" radius="md" size="sm" variant="light">
                                    <IconAward size={14} />
                                </ThemeIcon>
                                <Text size="sm">{cert}</Text>
                            </Group>
                        ))}
                    </Stack>
                ) : (
                    <EmptyState text="No certifications added yet" />
                )}
            </Section>

            <Divider />

            {/* Social Links Section */}
            <Section title="Social Links">
                {hasSocialLinks ? (
                    <Stack gap="xs">
                        {coach?.instagram_url && (
                            <SocialLink
                                color="#E4405F"
                                icon={IconBrandInstagram}
                                label="Instagram"
                                url={coach.instagram_url}
                            />
                        )}
                        {coach?.facebook_url && (
                            <SocialLink
                                color="#1877F2"
                                icon={IconBrandFacebook}
                                label="Facebook"
                                url={coach.facebook_url}
                            />
                        )}
                        {coach?.youtube_url && (
                            <SocialLink
                                color="#FF0000"
                                icon={IconBrandYoutube}
                                label="YouTube"
                                url={coach.youtube_url}
                            />
                        )}
                        {coach?.x_url && (
                            <SocialLink
                                color="#000000"
                                icon={IconBrandX}
                                label="X (Twitter)"
                                url={coach.x_url}
                            />
                        )}
                    </Stack>
                ) : (
                    <EmptyState text="No social links added yet" />
                )}
            </Section>
        </Stack>
    );
};

/* Helper Components */

interface SectionProps {
    children: React.ReactNode;
    title: string;
}

const Section: FC<SectionProps> = ({title, children}) => (
    <Stack gap="sm">
        <Text c="dimmed" fw={600} size="xs" tt="uppercase">
            {title}
        </Text>
        {children}
    </Stack>
);

interface InfoRowProps {
    label: string;
    value: string;
}

const InfoRow: FC<InfoRowProps> = ({label, value}) => (
    <Group justify="space-between" wrap="nowrap">
        <Text c="dimmed" size="sm">
            {label}
        </Text>
        <Text fw={500} size="sm">
            {value}
        </Text>
    </Group>
);

interface EmptyStateProps {
    text: string;
}

const EmptyState: FC<EmptyStateProps> = ({text}) => (
    <Text c="dimmed" fs="italic" size="sm">
        {text}
    </Text>
);

interface SocialLinkProps {
    color: string;
    icon: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<Icon>>;
    label: string;
    url: string;
}

const SocialLink: FC<SocialLinkProps> = ({icon: Icon, label, url, color}) => (
    <Group gap="sm" justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
            <ThemeIcon color={color} radius="md" size="sm" variant="light">
                <Icon size={14} />
            </ThemeIcon>
            <Text size="sm">{label}</Text>
        </Group>
        <Anchor
            c="blue"
            href={url}
            size="sm"
            target="_blank"
            style={{
                maxWidth: 180,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}
        >
            <Group gap={4} wrap="nowrap">
                <Text
                    size="xs"
                    style={{
                        maxWidth: 150,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {url.replace(/^https?:\/\//, '')}
                </Text>
                <IconExternalLink size={12} />
            </Group>
        </Anchor>
    </Group>
);

export default CoachProfileViewDrawer;
