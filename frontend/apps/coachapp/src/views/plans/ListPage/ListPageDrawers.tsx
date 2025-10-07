import {useSearchParams} from 'react-router';

import {PlanCreateDrawer} from './PlanCreateDrawer';

export function PlansListPageDrawers() {
    const [searchParams] = useSearchParams();

    if (searchParams.get('selected_drawer') === 'create_plan') {
        return <PlanCreateDrawer />;
    }

    return null;
}
