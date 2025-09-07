import {Drawer, useDrawersStack} from '@mantine/core';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {notifications} from '@mantine/notifications';
import {ScheduleForm} from '../ScheduleForm/ScheduleForm';
import {CreateScheduleProps, ScheduleCategory, SchedulesAPI} from '@/api/schedules.ts';
import {SCHEDULES_QUERY_KEYS} from '@/hooks/useScheduleQueries';
import {useState} from 'react';
import ScheduleCategorySelect from './ScheduleCategorySelect';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PagePaper from '@/components/containers/PagePaper';
import Header from '../layouts/Header';
import PaddingContainer from '@/components/containers/PaddingContainer';
import {SCHEDULE_CATEGORIES} from '../Configs';

type ProgramCreateWithTriggerProps = {
    stack: ReturnType<typeof useDrawersStack<'create-schedule' | 'select-plan-type' | any>>;
    onCreated?: (scheduleId: string) => void;
};

export function ScheduleCreateDrawer({stack, onCreated}: ProgramCreateWithTriggerProps) {
    const queryClient = useQueryClient();

    const [planType, setPlanType] = useState<ScheduleCategory | null>(null);

    const createSchedule = useMutation({
        mutationFn: async (data: CreateScheduleProps) => {
            const res = await SchedulesAPI.createSchedule(data);
            if (res.isError) {
                throw res.getError();
            }
            return res.getValue();
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({
                queryKey: SCHEDULES_QUERY_KEYS.lists(),
            });
            onCreated?.(result.id);
        },
        onError: (error) => {
            notifications.show({
                title: 'Failed to create schedule',
                message: error.message || 'Something went wrong',
                color: 'red',
            });
        },
    });

    const formTitle = planType ? `Create ${SCHEDULE_CATEGORIES[planType].label} Plan` : 'Create Plan';

    return (
        <>
            <Drawer
                {...stack.register('select-plan-type')}
                withCloseButton={false}
            >
                <PagePaper>
                    <HeadingContainer
                        withBorder={false}
                        style={{paddingInline: 'var(--ce-size-xs)', paddingBlock: 'var(--ce-size-md)'}}
                    >
                        <Header
                            title={'Create plan'}
                            onBack={() => stack.close('select-plan-type')}
                        />
                    </HeadingContainer>
                    <div style={{flex: 1, overflow: 'auto'}}>
                        <PaddingContainer>
                            <ScheduleCategorySelect
                                onSelect={(category) => {
                                    setPlanType(category);
                                    stack.close('select-plan-type');
                                    stack.open('create-schedule');
                                }}
                            />
                        </PaddingContainer>
                    </div>
                </PagePaper>
            </Drawer>
            <Drawer
                {...stack.register('create-schedule')}
                withCloseButton={false}
            >
                <PagePaper>
                    <HeadingContainer
                        withBorder={false}
                        style={{paddingInline: 'var(--ce-size-xs)', paddingBlock: 'var(--ce-size-md)'}}
                    >
                        <Header
                            title={formTitle}
                            onBack={() => stack.close('create-schedule')}
                        />
                    </HeadingContainer>
                    <PaddingContainer>
                        <ScheduleForm
                            submitText={'Create'}
                            schedule={{}}
                            onSubmit={async (values) => {
                                await createSchedule.mutateAsync(values);
                            }}
                            category={planType!}
                        />
                    </PaddingContainer>
                </PagePaper>
            </Drawer>
        </>
    );
}
