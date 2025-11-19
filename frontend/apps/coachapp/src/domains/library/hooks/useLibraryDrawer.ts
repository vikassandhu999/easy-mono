import useParamsDrawer from '@/hooks/useParamDrawer';

import {LIBRARY_DRAWER_CONFIG} from '../config/drawer';

const useLibraryDrawer = () => {
    return useParamsDrawer({drawer_config: LIBRARY_DRAWER_CONFIG});
};

export default useLibraryDrawer;
