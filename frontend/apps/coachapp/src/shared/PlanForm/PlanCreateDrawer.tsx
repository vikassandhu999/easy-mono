import {Drawer} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {useMemo} from 'react';

import {PLAN_DISCIPLINES} from '@/shared/Configs';
import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';
import Header from '@/shared/layouts/Header';
import {CreatePlanProps, Plan, PlanDiscipline, useCreatePlan} from '@/services/plans';

import {PlanForm} from './PlanForm';

export type PlanCreationDrawerData = {
    initialDiscipline?: PlanDiscipline;
    initialPlan?: Partial<Plan>;
};

export interface PlanCreationDrawerProps {
    initialDiscipline?: PlanDiscipline;
    initialPlan?: Partial<Plan>;
    onClose: () => void;
    onPlanCreated?: (planId: string) => void;
    opened: boolean;
}

export function PlanCreationDrawer({
    initialPlan,
    initialDiscipline,
    onClose,
    onPlanCreated,
    opened,
}: PlanCreationDrawerProps) {
    const [createPlan, {isLoading: isCreatingPlan}] = useCreatePlan();

    const planDefaults = useMemo(
        () => ({...(initialPlan ?? {}), discipline: initialDiscipline}) as Partial<Plan>,
        [initialPlan, initialDiscipline],
    );

    const handleClose = () => {
        onClose();
    };

    const handleSubmit = async (values: CreatePlanProps) => {
        try {
            const plan = await createPlan(values).unwrap();

            notifications.show({
                color: 'green',
                message: `${plan.name || 'Plan'} created successfully`,
                title: 'Plan Created',
            });

            onPlanCreated?.(plan.id);
            onClose();
        } catch (error) {
            console.error('Failed to create plan', error);
            notifications.show({
                color: 'red',
                message: 'Failed to create plan',
                title: 'Error',
            });
        }
    };

    const drawerTitle = useMemo(() => {
        const label = initialDiscipline ? PLAN_DISCIPLINES[initialDiscipline]?.label : undefined;
        if (!label) {
            return 'Create plan';
        }
        return `Create ${label.toLowerCase()} plan`;
    }, [initialDiscipline]);

    return (
        <Drawer
            onClose={handleClose}
            opened={opened}
            position="right"
            withCloseButton={false}
        >
            <PagePaper>
                <HeadingContainer style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}>
                    <Header
                        onBack={() => {
                            onClose();
                        }}
                        title={drawerTitle}
                    />
                </HeadingContainer>

                <PaddingContainer>
                    <PlanForm
                        discipline={initialDiscipline}
                        onSubmit={handleSubmit}
                        plan={planDefaults}
                        submitText={isCreatingPlan ? 'Creating…' : 'Create plan'}
                    />
                </PaddingContainer>
            </PagePaper>
        </Drawer>
    );
}
