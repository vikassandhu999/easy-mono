import {Button, Center, Group, Loader, SegmentedControl, Stack, Text, Title} from '@mantine/core';
import {IconSettings, IconUser as IconUserIcon} from '@tabler/icons-react';
import {useState} from 'react';

import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';
import {useGetCoachQuery} from '@/services/coach';

import OtherTab from './tabs/OtherTab';
import ProfileTab from './tabs/ProfileTab';

type TabValue = 'account' | 'profile';

export default function ProfilePage() {
    const {data: coach, isLoading} = useGetCoachQuery();
    const [activeTab, setActiveTab] = useState<TabValue>('profile');

    if (isLoading) {
        return (
            <PagePaper>
                <Center style={{minHeight: '60vh'}}>
                    <Loader size="lg" />
                </Center>
            </PagePaper>
        );
    }

    if (!coach) {
        return (
            <PagePaper>
                <PaddingContainer>
                    <Center style={{minHeight: '60vh'}}>
                        <Stack
                            align="center"
                            gap="md"
                        >
                            <Text
                                c="dimmed"
                                size="lg"
                            >
                                Unable to load profile
                            </Text>
                            <Button
                                onClick={() => window.location.reload()}
                                variant="light"
                            >
                                Retry
                            </Button>
                        </Stack>
                    </Center>
                </PaddingContainer>
            </PagePaper>
        );
    }

    const tabData = [
        {
            label: (
                <Group
                    gap="xs"
                    wrap="nowrap"
                >
                    <IconUserIcon
                        size={18}
                        stroke={1.5}
                    />
                    <span>Personal</span>
                </Group>
            ),
            value: 'profile',
        },
        {
            label: (
                <Group
                    gap="xs"
                    wrap="nowrap"
                >
                    <IconSettings
                        size={18}
                        stroke={1.5}
                    />
                    <span>Settings</span>
                </Group>
            ),
            value: 'account',
        },
    ];

    return (
        <>
            <PagePaper>
                <PaddingContainer>
                    <Stack gap="lg">
                        <Group
                            justify="space-between"
                            mt="md"
                            wrap="nowrap"
                        >
                            <Title
                                order={5}
                                size="h6"
                            >
                                Profile
                            </Title>
                        </Group>

                        <SegmentedControl
                            aria-label="Profile sections"
                            data={tabData}
                            fullWidth
                            onChange={(value) => setActiveTab(value as TabValue)}
                            radius="xl"
                            size="lg"
                            value={activeTab}
                        />

                        {activeTab === 'profile' && <ProfileTab coach={coach} />}

                        {activeTab === 'account' && <OtherTab coach={coach} />}
                    </Stack>
                </PaddingContainer>
            </PagePaper>
        </>
    );
}
