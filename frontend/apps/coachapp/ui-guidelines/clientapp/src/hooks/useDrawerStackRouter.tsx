import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {useLocation, useNavigate, useSearchParams} from 'react-router';

interface DrawerStackRouterOptions {
    baseRoutePath: string;
    drawerIds: string[];
    onBaseRouteClose?: () => void;
    paramPrefix?: string;
}

interface DrawerData {
    [key: string]: any;
}

interface DrawerState {
    data?: DrawerData;
    id: string;
}

interface DrawerStackContextValue {
    closeAllDrawers: () => void;
    closeDrawer: (id: string) => void;
    isOpen: (id: string) => boolean;
    openDrawer: (id: string, data?: DrawerData) => void;
    register: (id: string) => {opened: boolean; onClose: () => void; stackId: string};
    replaceDrawer: (id: string, data?: DrawerData) => void;
    setDrawerData: (id: string, data: DrawerData) => void;
    toggle: (id: string, data?: DrawerData) => void;
}

const DrawerStackContext = createContext<DrawerStackContextValue | null>(null);

// Optimized hook to get drawer data with selector pattern
export function useDrawerData<T = DrawerData>(drawerId: string): T | undefined {
    const context = useContext(DrawerStackContext);
    if (!context) {
        throw new Error('useDrawerData must be used within a DrawerStackRouter');
    }

    const [searchParams] = useSearchParams();

    // Parse drawer state from URL
    return useMemo(() => {
        const drawersParam = searchParams.get('drawers');
        if (!drawersParam) return undefined;
        const decoded = urlCodec.decode(drawersParam);
        return decoded.find((d) => d.id === drawerId)?.data as any;
    }, [drawerId, searchParams]);
}

// Hook to use drawer actions (memoized)
export function useDrawerActions() {
    const context = useContext(DrawerStackContext);
    if (!context) {
        throw new Error('useDrawerActions must be used within a DrawerStackRouter');
    }

    return useMemo(
        () => ({
            openDrawer: context.openDrawer,
            closeDrawer: context.closeDrawer,
            replaceDrawer: context.replaceDrawer,
            closeAllDrawers: context.closeAllDrawers,
            setDrawerData: context.setDrawerData,
            register: context.register,
            isOpen: context.isOpen,
            toggle: context.toggle,
        }),
        [context],
    );
}

const urlCodec = {
    encode: (drawers: DrawerState[]): string => {
        if (drawers.length === 0) return '';

        // Create a compact representation with id and data
        const encoded = drawers
            .map((d) => {
                if (d.data && Object.keys(d.data).length > 0) {
                    // Encode as id:base64(data)
                    const dataStr = btoa(encodeURIComponent(JSON.stringify(d.data)));
                    return `${d.id}:${dataStr}`;
                }
                // Just the id if no data
                return d.id;
            })
            .join(',');

        return encoded;
    },

    decode: (encoded: string): DrawerState[] => {
        if (!encoded) return [];

        return encoded
            .split(',')
            .filter(Boolean)
            .map((item) => {
                const [id, dataStr] = item.split(':');

                if (dataStr) {
                    try {
                        // Decode the base64 data
                        const decodedData = JSON.parse(decodeURIComponent(atob(dataStr)));
                        return {id: id.trim(), data: decodedData};
                    } catch (e) {
                        console.error('Failed to decode drawer data:', e);
                        return {id: id.trim()};
                    }
                }

                return {id: id.trim()};
            });
    },
};

// Main hook with integrated drawer stack management
export function useDrawerStackRouter({
    baseRoutePath,
    drawerIds,
    onBaseRouteClose,
    paramPrefix = 'drawer',
}: DrawerStackRouterOptions) {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // Memoized param key
    const paramKey = useMemo(() => `${paramPrefix}s`, [paramPrefix]);

    // Memoize valid drawer IDs set
    const validDrawerIds = useMemo(() => new Set(drawerIds), [drawerIds]);

    // Parse drawer state from URL
    const parseDrawersFromUrl = useCallback((): DrawerState[] => {
        const drawersParam = searchParams.get(paramKey);
        if (!drawersParam) return [];
        const decoded = urlCodec.decode(drawersParam);
        return decoded.filter((d) => validDrawerIds.has(d.id));
    }, [searchParams, paramKey, validDrawerIds]);

    // State derived from URL
    const [drawers, setDrawers] = useState<DrawerState[]>(() => parseDrawersFromUrl());

    console.log('Drawers:', drawers);

    // Compute open state from drawers
    const openState = useMemo(() => {
        const state: Record<string, boolean> = {};
        drawerIds.forEach((id) => {
            state[id] = drawers.some((d) => d.id === id);
        });
        return state;
    }, [drawers, drawerIds]);

    // Update URL
    const updateUrl = useCallback(
        (newDrawers: DrawerState[], replace = false) => {
            const newSearchParams = new URLSearchParams(searchParams);
            if (newDrawers.length > 0) {
                newSearchParams.set(paramKey, urlCodec.encode(newDrawers));
            } else {
                newSearchParams.delete(paramKey);
            }
            setSearchParams(newSearchParams, {replace});
        },
        [searchParams, paramKey, setSearchParams],
    );

    // Check if drawer is open
    const isOpen = useCallback(
        (drawerId: string) => {
            return drawers.some((d) => d.id === drawerId);
        },
        [drawers],
    );

    // Drawer operations
    const openDrawer = useCallback(
        (drawerId: string, data?: DrawerData) => {
            if (!validDrawerIds.has(drawerId)) {
                console.error(`Invalid drawer ID: ${drawerId}`);
                return;
            }

            setDrawers((current) => {
                const existingIndex = current.findIndex((d) => d.id === drawerId);
                let newDrawers: DrawerState[];
                if (existingIndex !== -1) {
                    newDrawers = current.map((d, i) => (i === existingIndex ? {id: drawerId, data} : d));
                } else {
                    newDrawers = [...current, {id: drawerId, data}];
                }
                updateUrl(newDrawers);
                return newDrawers;
            });
        },
        [validDrawerIds, updateUrl],
    );

    const replaceDrawer = useCallback(
        (drawerId: string, data?: DrawerData) => {
            if (!validDrawerIds.has(drawerId)) {
                console.error(`Invalid drawer ID: ${drawerId}`);
                return;
            }

            setDrawers((current) => {
                if (current.length === 0) {
                    openDrawer(drawerId, data);
                    return current;
                }

                const updated = [...current];
                updated[updated.length - 1] = {id: drawerId, data};
                updateUrl(updated, true);
                return updated;
            });
        },
        [validDrawerIds, updateUrl, openDrawer],
    );

    const closeDrawer = useCallback(
        (drawerId: string) => {
            setDrawers((current) => {
                const drawerIndex = current.findIndex((d) => d.id === drawerId);
                if (drawerIndex === -1) return current;
                const remaining = current.slice(0, drawerIndex);
                updateUrl(remaining, true);
                return remaining;
            });
        },
        [updateUrl],
    );

    const toggle = useCallback(
        (drawerId: string, data?: DrawerData) => {
            if (isOpen(drawerId)) {
                closeDrawer(drawerId);
            } else {
                openDrawer(drawerId, data);
            }
        },
        [isOpen, openDrawer, closeDrawer],
    );

    const closeAllDrawers = useCallback(() => {
        setDrawers(() => {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete(paramKey);

            if (onBaseRouteClose) {
                onBaseRouteClose();
            } else {
                navigate(
                    {
                        pathname: baseRoutePath,
                        search: newSearchParams.toString(),
                    },
                    {replace: true},
                );
            }

            return [];
        });
    }, [searchParams, paramKey, navigate, baseRoutePath, onBaseRouteClose]);

    const setDrawerData = useCallback(
        (drawerId: string, data: DrawerData) => {
            setDrawers((current) => {
                const drawerIndex = current.findIndex((d) => d.id === drawerId);
                if (drawerIndex === -1) {
                    console.warn(`Cannot set data for non-existent drawer: ${drawerId}`);
                    return current;
                }

                const updated = [...current];
                updated[drawerIndex] = {...updated[drawerIndex], data};
                updateUrl(updated);
                return updated;
            });
        },
        [updateUrl],
    );

    const register = useCallback(
        (id: string) => {
            return {
                opened: isOpen(id),
                onClose: () => closeDrawer(id),
                stackId: id,
            };
        },
        [isOpen, closeDrawer],
    );

    // Sync URL changes with state
    useEffect(() => {
        const currentDrawers = parseDrawersFromUrl();
        setDrawers((prev) => {
            // Only update if the drawers have actually changed
            if (JSON.stringify(prev) !== JSON.stringify(currentDrawers)) {
                return currentDrawers;
            }
            return prev;
        });
    }, [location.search, parseDrawersFromUrl]);

    const contextValue = useMemo<DrawerStackContextValue>(
        () => ({
            openDrawer,
            closeDrawer,
            replaceDrawer,
            closeAllDrawers,
            setDrawerData,
            register,
            isOpen,
            toggle,
        }),
        [openDrawer, closeDrawer, replaceDrawer, closeAllDrawers, setDrawerData, register, isOpen, toggle],
    );

    return {
        Provider: ({children}: {children: React.ReactNode}) => (
            <DrawerStackContext.Provider value={contextValue}>{children}</DrawerStackContext.Provider>
        ),
        register,
        openDrawer,
        state: openState,
        close: closeDrawer,
        open: openDrawer,
        closeAll: closeAllDrawers,
        toggle,
    };
}
