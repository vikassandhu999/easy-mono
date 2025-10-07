import {useSearchParams} from 'react-router';

import PlanBuilder from '@/components/PlanBuilder/PlanBuilder';

import {PlanCreateDrawer} from './PlanCreateDrawer';

export function PlansListPageDrawers() {
    const [searchParams] = useSearchParams();

    if (searchParams.get('selected_drawer') === 'create_plan') {
        return <PlanCreateDrawer />;
    }

    if (searchParams.get('selected_drawer') === 'plan_builder' && searchParams.get('plan_id')) {
        return <PlanBuilder />;
    }

    return null;
}
