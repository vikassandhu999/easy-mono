import {Drawer} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {useEffect} from 'react';

import {CreatePlanProps, Plan, PlanDiscipline} from '@/api/plans';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import Header from '@/components/layouts/Header';
import {createDrawerRegistry, DrawerComponent} from '@/hooks/drawerRegistry';
import {useCreatePlan} from '@/store/services/plans';

import PlanDisciplineSelect from './PlanDisciplineSelect';
import {PlanForm} from './PlanForm';

export interface PlanDrawerContext {
    onCancel?: () => void;
    onPlanCreated?: (planId: string) => void;
}

export interface SelectPlanTypeData {
    initialPlan?: Partial<Plan>;
}

export interface CreatePlanDrawerData {
    discipline: PlanDiscipline;
    initialPlan?: Partial<Plan>;
}

const SelectDisciplineDrawer: DrawerComponent<PlanDrawerContext, SelectPlanTypeData> = ({context, data, router}) => {
    const handleClose = () => {
        router.close('selectDiscipline');
        context.onCancel?.();
    };

    const handleSelect = (discipline: PlanDiscipline) => {
        router.open('createPlan', {
            discipline,
            initialPlan: data?.initialPlan,
        });
    };

    return (
        <Drawer
            onClose={handleClose}
            opened
            position="right"
            size="sm"
            withCloseButton={false}
        >
            <PagePaper>
                <HeadingContainer
                    style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}
                    withBorder={false}
                >
                    <Header
                        onBack={handleClose}
                        title="Create plan"
                    />
                </HeadingContainer>

                <div style={{flex: 1, overflow: 'auto'}}>
                    <PaddingContainer>
                        <PlanDisciplineSelect onSelect={handleSelect} />
                    </PaddingContainer>
                </div>
            </PagePaper>
        </Drawer>
    );
};

const CreatePlanDrawer: DrawerComponent<PlanDrawerContext, CreatePlanDrawerData> = ({context, data, router}) => {
    const [createPlan] = useCreatePlan();
    const discipline = data?.discipline;

    useEffect(() => {
        if (!discipline) {
            router.close('createPlan');
        }
    }, [discipline, router]);

    if (!discipline) {
        return null;
    }

    const handleBack = () => {
        router.close('createPlan');
    };

    const handleSubmit = async (values: CreatePlanProps) => {
        try {
            const plan = await createPlan(values).unwrap();

            notifications.show({
                color: 'green',
                message: `${plan.name || 'Plan'} created successfully`,
                title: 'Plan Created',
            });

            context.onPlanCreated?.(plan.id);
            router.closeAll();
        } catch (error) {
            console.error('Failed to create plan', error);
            notifications.show({
                color: 'red',
                message: 'Failed to create plan',
                title: 'Error',
            });
        }
    };

    return (
        <Drawer
            onClose={handleBack}
            opened
            position="right"
            size="md"
            title="Create plan"
            withCloseButton={false}
        >
            <PagePaper>
                <HeadingContainer
                    style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}
                    withBorder={false}
                >
                    <Header
                        onBack={handleBack}
                        title="Create plan"
                    />
                </HeadingContainer>

                <PaddingContainer>
                    <PlanForm
                        discipline={discipline}
                        onSubmit={handleSubmit}
                        plan={{...(data?.initialPlan ?? {}), discipline} as Partial<Plan>}
                        submitText="Create plan"
                    />
                </PaddingContainer>
            </PagePaper>
        </Drawer>
    );
};

export const planDrawerRegistry = createDrawerRegistry<PlanDrawerContext>({
    selectDiscipline: {
        path: 'select-discipline',
        component: SelectDisciplineDrawer,
        transition: {type: 'slide'},
    },
    createPlan: {
        path: 'create',
        component: CreatePlanDrawer,
        parent: 'selectDiscipline',
        keepMounted: true,
        transition: {type: 'slide'},
    },
});

export type PlanDrawerId = keyof typeof planDrawerRegistry;
