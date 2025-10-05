import {Drawer} from '@mantine/core';
import {notifications} from '@mantine/notifications';

import {CreatePlanProps, Plan, PlanDiscipline} from '@/api/plans';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {DrawerStackRouter, useDrawerData} from '@/hooks/useDrawerStackRouter';
import {useCreatePlan} from '@/store/services/plans';

import {PLAN_DISCIPLINES} from '../Configs';
import Header from '../layouts/Header';
import PlanDisciplineSelect from './PlanDisciplineSelect';
import {PlanForm} from './PlanForm';

type ProgramCreateWithTriggerProps = {
    initialPlan?: Partial<Plan>;
    onCreated?: (scheduleId: string) => void;
    stack: DrawerStackRouter;
};

export function PlanCreateDrawer({initialPlan, onCreated, stack}: ProgramCreateWithTriggerProps) {
    const [createPlan] = useCreatePlan();

    const planDrawerData = useDrawerData<{discipline?: PlanDiscipline}>('create-plan');
    const planType = planDrawerData?.discipline ?? null;

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
                                    stack.openDrawer('create-plan', {discipline});
                                }}
                            />
                        </PaddingContainer>
                    </div>
                </PagePaper>
            </Drawer>
            <Drawer
                {...stack.register('create-plan')}
                withCloseButton={false}
            >
                <PagePaper>
                    <HeadingContainer
                        style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}
                        withBorder={false}
                    >
                        <Header
                            onBack={() => stack.close('create-plan')}
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
