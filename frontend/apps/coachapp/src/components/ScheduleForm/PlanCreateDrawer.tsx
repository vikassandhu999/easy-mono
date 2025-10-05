import {Drawer, useDrawersStack} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {useState} from 'react';

import {ScheduleCategory} from '@/api/schedules.ts';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {useCreateScheduleMutation} from '@/store/services/schedulesApi';

import {SCHEDULE_CATEGORIES} from '../Configs';
import Header from '../layouts/Header';
import PlanDisciplineSelect from './PlanDisciplineSelect';
import {PlanForm} from './PlanForm';

type ProgramCreateWithTriggerProps = {
    onCreated?: (scheduleId: string) => void;
    stack: ReturnType<typeof useDrawersStack<'create-schedule' | 'select-plan-type' | any>>;
};

export function PlanCreateDrawer({onCreated, stack}: ProgramCreateWithTriggerProps) {
    const [planType, setPlanType] = useState<null | ScheduleCategory>(null);

    const [createSchedule] = useCreateScheduleMutation();

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
                            <PlanDisciplineSelect
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
                        <PlanForm
                            category={planType!}
                            onSubmit={async (values) => {
                                try {
                                    const result = await createSchedule(values);
                                    if ('data' in result) {
                                        onCreated?.(result.data.id);
                                    }
                                } catch (error) {
                                    notifications.show({
                                        color: 'red',
                                        message: 'Failed to create schedule',
                                        title: 'Error',
                                    });
                                }
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
