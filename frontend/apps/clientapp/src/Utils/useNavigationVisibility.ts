import {useMemo} from 'react';
import {useLocation} from 'react-router';

import {shouldShowNavigation} from './navigation_config.ts';

export function useNavigationVisibility(): boolean {
    const location = useLocation();

    return useMemo(() => {
        return shouldShowNavigation(location.pathname);
    }, [location.pathname]);
}
