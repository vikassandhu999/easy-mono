import {Drawer, useDrawersStack} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import {CreateScheduleProps, ScheduleCategory, SchedulesAPI} from '@/api/schedules.ts';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {SCHEDULES_QUERY_KEYS} from '@/hooks/useScheduleQueries';

import {SCHEDULE_CATEGORIES} from '../Configs';
import Header from '../layouts/Header';
import {ScheduleForm} from '../ScheduleForm/ScheduleForm';
import ScheduleCategorySelect from './ScheduleCategorySelect';

type ProgramCreateWithTriggerProps = {
    onCreated?: (scheduleId: string) => void;
    stack: ReturnType<typeof useDrawersStack<'create-schedule' | 'select-plan-type' | any>>;
};

export function ScheduleCreateDrawer({onCreated, stack}: ProgramCreateWithTriggerProps) {
    const queryClient = useQueryClient();

    const [planType, setPlanType] = useState<null | ScheduleCategory>(null);

    const createSchedule = useMutation({
        mutationFn: async (data: CreateScheduleProps) => {
            const res = await SchedulesAPI.createSchedule(data);
            if (res.isError) {
                throw res.getError();
            }
            return res.getValue();
        },
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: error.message || 'Something went wrong',
                title: 'Failed to create schedule',
            });
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({
                queryKey: SCHEDULES_QUERY_KEYS.lists(),
            });
            onCreated?.(result.id);
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
                        style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}
                        withBorder={false}
                    >
                        <Header
                            onBack={() => stack.close('select-plan-type')}
                            title={'Create plan'}
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
                        style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}
                        withBorder={false}
                    >
                        <Header
                            onBack={() => stack.close('create-schedule')}
                            title={formTitle}
                        />
                    </HeadingContainer>
                    <PaddingContainer>
                        <ScheduleForm
                            category={planType!}
                            onSubmit={async (values) => {
                                await createSchedule.mutateAsync(values);
                            }}
                            schedule={{}}
                            submitText={'Create'}
                        />
                    </PaddingContainer>
                </PagePaper>
            </Drawer>
        </>
    );
}
