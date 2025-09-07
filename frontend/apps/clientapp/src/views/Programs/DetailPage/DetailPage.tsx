import {useState} from 'react';
import {useParams} from 'react-router';
import {LoadingOverlay, Alert, Tabs, ScrollArea, Group} from '@mantine/core';
import {IconAlertCircle, IconCalendar, IconFileText, IconUsers} from '@tabler/icons-react';
import {useProgram} from '@/Hooks/useProgramQueries';
import PaddingContainer from '@/Components/Containers/PaddingContainer';
import PagePaper from '@/Components/Containers/PagePaper';
import HeadingContainer from '@/Components/Containers/HeaderContainer';
import Header from './Header';
import HeroSection from './HeroSection';
import ScheduleTab from './ScheduleTab/ScheduleTab';
import ContentTab from './tabs/ContentTab';
import ClientsTab from './tabs/ClientsTab';
import {useInViewport, useMediaQuery} from '@mantine/hooks';
import {useContentHeight} from '@easy/hooks';
import ScheduleBuilder from '@/Components/ScheduleBuilder/ScheduleBuilder';
import {useDrawerStackRouter} from '@/Hooks/useDrawerStackRouter';

export default function ProgramDetailPage() {
    const {id} = useParams<{id: string}>();
    const [activeTab, setActiveTab] = useState<string>('schedule');

    const isMobile = useMediaQuery('(max-width: 768px)');

    const {data: program, isLoading, isError, error} = useProgram(id);
    const {ref: titleRef, inViewport: titleInViewport} = useInViewport<HTMLHeadingElement>();

    const {topHeight, useElementRef} = useContentHeight();
    const headerRef = useElementRef('top');

    const stackRouter = useDrawerStackRouter({
        baseRoutePath: `/programs/${id}`,
        drawerIds: [
            'entries-view',
            'select-session',
            'select-session-type',
            'add-entry',
            'create-session',
            'edit-entry',
            'manage-content',
            'add-content-item',
            'session-form',
            'content-select',
        ],
    });

    if (isLoading) {
        return (
            <PaddingContainer>
                <LoadingOverlay visible />
            </PaddingContainer>
        );
    }

    if (isError || !program) {
        return (
            <PaddingContainer>
                <Alert
                    icon={<IconAlertCircle size={16} />}
                    title="Error"
                    color="red"
                >
                    {error?.message || 'Failed to load program'}
                </Alert>
            </PaddingContainer>
        );
    }

    // Mock stats - in real app, fetch from API
    const stats = {
        activeClients: 271,
        totalRevenue: 12450,
        completionRate: 85,
        enrolledCount: 271,
        moduleCount: 13,
    };

    return (
        <PagePaper>
            <HeadingContainer
                ref={headerRef}
                withBorder={false}
                style={{
                    paddingInline: 'var(--ce-size-lg)',
                    paddingBlock: 'var(--ce-size-sm)',
                }}
            >
                <Header
                    program={program}
                    showTitle={!titleInViewport}
                />
            </HeadingContainer>

            <PaddingContainer style={{padding: 'var(--ce-size-lg)'}}>
                <HeroSection
                    titleRef={titleRef}
                    program={program}
                    stats={{
                        activeClients: stats.activeClients,
                        totalRevenue: stats.totalRevenue,
                    }}
                />
            </PaddingContainer>

            <Tabs
                value={activeTab}
                onChange={(value) => setActiveTab(value || 'schedule')}
                variant="default"
                styles={{
                    list: {
                        backgroundColor: 'var(--mantine-color-white)',
                        position: 'sticky',
                        top: topHeight,
                        zIndex: 10,
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    },
                    tab: {
                        fontSize: 'var(--body-font-size)',
                        fontWeight: 400,
                        padding: 'var(--ce-size-md)',
                        lineHeight: 'var(--label-line-height)',
                        whiteSpace: 'nowrap',
                        minWidth: 'auto',
                        '&:hover': {
                            backgroundColor: 'var(--mantine-color-gray-0)',
                        },
                        '&[data-active]': {
                            color: 'var(--mantine-color-blue-6)',
                            borderColor: 'var(--mantine-color-blue-6)',
                        },
                    },
                    panel: {
                        padding: 0,
                    },
                }}
            >
                <PaddingContainer style={{paddingBlock: 0, paddingInline: isMobile ? 0 : 'var(--ce-size-lg)'}}>
                    <ScrollArea
                        type={'never'}
                        scrollbars={'x'}
                        flex={1}
                        style={{width: '100%'}}
                    >
                        <Tabs.List flex={1}>
                            <Group wrap={'nowrap'}>
                                <Tabs.Tab
                                    value="schedule"
                                    leftSection={<IconCalendar size={16} />}
                                >
                                    Schedules
                                </Tabs.Tab>
                                <Tabs.Tab
                                    value="content"
                                    leftSection={<IconFileText size={16} />}
                                >
                                    Contents
                                </Tabs.Tab>
                                <Tabs.Tab
                                    value="clients"
                                    leftSection={<IconUsers size={16} />}
                                >
                                    Clients
                                </Tabs.Tab>
                            </Group>
                        </Tabs.List>
                    </ScrollArea>
                </PaddingContainer>

                <PaddingContainer style={{padding: 'var(--ce-size-lg)', paddingBlock: 'var(--title2-offset)'}}>
                    <Tabs.Panel value="schedule">
                        <ScheduleTab
                            programId={id!}
                            program={program}
                            onScheduleView={(scheduleId) => stackRouter.openDrawer('entries-view', {scheduleId})}
                        />
                    </Tabs.Panel>

                    <Tabs.Panel value="content">
                        <ContentTab
                            programId={id!}
                            program={program}
                        />
                    </Tabs.Panel>

                    <Tabs.Panel value="clients">
                        <ClientsTab
                            programId={id!}
                            program={program}
                        />
                    </Tabs.Panel>
                </PaddingContainer>
            </Tabs>

            <stackRouter.Provider>
                <ScheduleBuilder />
            </stackRouter.Provider>
        </PagePaper>
    );
}
