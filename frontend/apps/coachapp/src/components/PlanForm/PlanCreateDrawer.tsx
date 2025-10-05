import {Drawer, useDrawersStack} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {useState} from 'react';

import {CreatePlanProps, Plan, PlanDiscipline} from '@/api/plans';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {useCreatePlan} from '@/store/services/plans';

import {PLAN_DISCIPLINES} from '../Configs';
import Header from '../layouts/Header';
import PlanDisciplineSelect from './PlanDisciplineSelect';
import {PlanForm} from './PlanForm';

type ProgramCreateWithTriggerProps = {
    initialPlan?: Partial<Plan>;
    onCreated?: (scheduleId: string) => void;
    stack: ReturnType<typeof useDrawersStack<'create-schedule' | 'select-plan-type' | any>>;
};

export function PlanCreateDrawer({initialPlan, onCreated, stack}: ProgramCreateWithTriggerProps) {
    const [planType, setPlanType] = useState<null | PlanDiscipline>(null);

    const [createPlan] = useCreatePlan();

    const formTitle = planType ? `Create ${PLAN_DISCIPLINES[planType].label} Plan` : 'Create Plan';

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
                                onSelect={(discipline) => {
                                    setPlanType(discipline);
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
                        {planType ? (
                            <PlanForm
                                discipline={planType}
                                onSubmit={async (values) => {
                                    try {
                                        const result = await createPlan(values as CreatePlanProps);
                                        if ('data' in result) {
                                            onCreated?.(result.data.id);
                                        }
                                    } catch (error) {
                                        notifications.show({
                                            color: 'red',
                                            message: 'Failed to create plan',
                                            title: 'Error',
                                        });
                                    }
                                }}
                                plan={{...(initialPlan ?? {}), discipline: planType}}
                                submitText={'Create'}
                            />
                        ) : null}
                    </PaddingContainer>
                </PagePaper>
            </Drawer>
        </>
    );
}
