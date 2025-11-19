import {useSearchParams} from 'react-router';

export type DrawerConfig = {
    id: string;
    key: string;
    type: string;
    prev_key: null | string;
    values: string[];
};

export type DrawerParams = Record<string, string>;

type UseParamsDrawerProps = {
    drawer_config: DrawerConfig[];
};

const useParamsDrawer = ({drawer_config}: UseParamsDrawerProps) => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Get the configuration for a drawer by key
    const getDrawerConfig = (key: string): DrawerConfig | undefined => {
        return drawer_config.find((config) => config.key === key);
    };

    // Get the currently active drawer key from URL
    const activeDrawerKey = searchParams.get('drawer') || null;

    // Get the active drawer configuration
    const activeDrawer = activeDrawerKey ? getDrawerConfig(activeDrawerKey) : null;

    // Check if a specific drawer is open
    const isDrawerOpen = (key: string): boolean => {
        return activeDrawerKey === key;
    };

    // Get drawer parameters from URL
    const getDrawerParams = (key?: string): DrawerParams => {
        const drawerKey = key || activeDrawerKey;
        if (!drawerKey) return {};

        const config = getDrawerConfig(drawerKey);
        if (!config) return {};

        const params: DrawerParams = {};
        config.values.forEach((paramKey) => {
            const value = searchParams.get(paramKey);
            if (value) {
                params[paramKey] = value;
            }
        });

        return params;
    };

    // Open a drawer with optional parameters
    const openDrawer = (key: string, params?: DrawerParams) => {
        const config = getDrawerConfig(key);

        if (!config) {
            console.warn(`Drawer configuration not found for key: ${key}`);
            return;
        }

        setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);

            // Set the drawer key
            newParams.set('drawer', key);

            // Set drawer-specific parameters
            if (params) {
                Object.entries(params).forEach(([paramKey, value]) => {
                    if (config.values.includes(paramKey)) {
                        newParams.set(paramKey, value);
                    }
                });
            }

            return newParams;
        });
    };

    // Close the current drawer and optionally navigate to previous
    const closeDrawer = () => {
        setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);

            if (activeDrawer) {
                // Remove drawer key
                newParams.delete('drawer');

                // // Remove all drawer-specific parameters
                // activeDrawer.values.forEach((paramKey) => {
                //     newParams.delete(paramKey);
                // });

                // If there's a previous drawer, navigate to it
                if (activeDrawer.prev_key) {
                    newParams.set('drawer', activeDrawer.prev_key);
                }
            }

            return newParams;
        });
    };

    // Close all drawers and clean up params
    const closeAllDrawers = () => {
        setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);

            // Remove drawer key
            newParams.delete('drawer');

            // Remove all possible drawer parameters
            drawer_config.forEach((config) => {
                config.values.forEach((paramKey) => {
                    newParams.delete(paramKey);
                });
            });

            return newParams;
        });
    };

    return {
        activeDrawerKey,
        activeDrawer,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        closeAllDrawers,
        getDrawerParams,
    };
};

export default useParamsDrawer;
