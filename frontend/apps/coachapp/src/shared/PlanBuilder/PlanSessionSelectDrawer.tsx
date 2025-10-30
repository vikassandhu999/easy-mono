import {Drawer} from '@mantine/core';
import {useNavigate, useSearchParams} from 'react-router';

import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import Header from '@/shared/layouts/Header';
import MealSelect from '@/shared/MealSelect/MealSelect';

import {
    PLAN_BUILDER_DRAWER_KEY,
    PLAN_BUILDER_DRAWER_VIEWS,
    PLAN_BUILDER_PARAMS,
    PLAN_SESSION_TYPE_MEAL,
} from './constants';
import {SESSION_TYPE_CONFIG} from './sessionTypes';

function getSessionTypeLabel(sessionType?: 'meal' | 'workout' | null): string {
    if (!sessionType) return 'Session';
    return SESSION_TYPE_CONFIG[sessionType]?.label ?? 'Session';
}

export default function PlanSessionSelectDrawer() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const sessionType = searchParams.get(PLAN_BUILDER_PARAMS.PLAN_DISCIPLINE) as 'meal' | 'workout' | null;

    const handleDrawerClose = () => {
        navigate(-1);
    };

    const handleCreateMeal = () => {
        setSearchParams((prev) => {
            prev.set(PLAN_BUILDER_DRAWER_KEY, PLAN_BUILDER_DRAWER_VIEWS.CREATE_SESSION);
            prev.set(PLAN_BUILDER_PARAMS.PLAN_SESSION_TYPE, PLAN_SESSION_TYPE_MEAL);
            return prev;
        });
    };

    const handleMealSelect = (selected: string | string[]) => {
        // TODO: Implement this
        console.log('Implement please..', selected);
    };

    return (
        <Drawer
            onClose={handleDrawerClose}
            opened={true}
            size="md"
            withCloseButton={false}
        >
            <HeadingContainer>
                <Header
                    onBack={handleDrawerClose}
                    title={`Select ${getSessionTypeLabel(sessionType).toLowerCase()}`}
                />
            </HeadingContainer>

            <PaddingContainer>
                {sessionType === 'meal' ? (
                    <MealSelect
                        multiple={false}
                        onCreateNew={handleCreateMeal}
                        onSelect={handleMealSelect}
                    />
                ) : null}
            </PaddingContainer>
        </Drawer>
    );
}
