import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {useLocation, useNavigate, useSearchParams} from 'react-router';

interface DrawerData {
  [key: string]: any;
}

interface DrawerStackContextValue {
  closeAllDrawers: () => void;
  closeDrawer: (id: string) => void;
  getDrawerData: <T = DrawerData>(id: string) => T | undefined;
  isOpen: (id: string) => boolean;
  openDrawer: (id: string, data?: DrawerData) => void;
  register: (id: string) => {onClose: () => void; opened: boolean; stackId: string};
  replaceDrawer: (id: string, data?: DrawerData) => void;
  setDrawerData: (id: string, data: DrawerData) => void;
  toggle: (id: string, data?: DrawerData) => void;
}

interface DrawerStackRouterOptions {
  baseRoutePath: string;
  drawerIds: string[];
  drawerPaths: Record<string, string[]>;
  onBaseRouteClose?: () => void;
  paramPrefix?: string;
}

interface DrawerState {
  data?: DrawerData;
  id: string;
}

const DrawerStackContext = createContext<DrawerStackContextValue | null>(null);

// Hook to use drawer actions (memoized)
export function useDrawerActions() {
  const context = useContext(DrawerStackContext);
  if (!context) {
    throw new Error('useDrawerActions must be used within a DrawerStackRouter');
  }

  return useMemo(
    () => ({
      closeAllDrawers: context.closeAllDrawers,
      closeDrawer: context.closeDrawer,
      isOpen: context.isOpen,
      openDrawer: context.openDrawer,
      register: context.register,
      replaceDrawer: context.replaceDrawer,
      setDrawerData: context.setDrawerData,
      toggle: context.toggle,
    }),
    [context],
  );
}

// Optimized hook to get drawer data with selector pattern
export function useDrawerData<T = DrawerData>(drawerId: string): T | undefined {
  const context = useContext(DrawerStackContext);
  if (!context) {
    throw new Error('useDrawerData must be used within a DrawerStackRouter');
  }
  return context.getDrawerData<T>(drawerId);
}

const urlCodec = {
  decode: (encoded: string): DrawerState[] => {
    if (!encoded) return [];

    try {
      const payload = JSON.parse(decodeURIComponent(encoded));
      if (!Array.isArray(payload)) return [];

      return payload
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const {id, data} = item as Partial<DrawerState>;
          if (typeof id !== 'string') return null;
          return {
            data: data && typeof data === 'object' ? data : undefined,
            id: id.trim(),
          } satisfies DrawerState;
        })
        .filter(Boolean) as DrawerState[];
    } catch (error) {
      console.error('Failed to decode drawer param', error);
      return [];
    }
  },

  encode: (drawers: DrawerState[]): string => {
    if (drawers.length === 0) return '';

    const payload = drawers.map((drawer) => {
      if (!drawer.data || Object.keys(drawer.data).length === 0) {
        return {id: drawer.id};
      }
      return {data: drawer.data, id: drawer.id};
    });

    return encodeURIComponent(JSON.stringify(payload));
  },
};

// Main hook with integrated drawer stack management
export function useDrawerStackRouter({
  baseRoutePath,
  drawerIds,
  drawerPaths,
  onBaseRouteClose,
  paramPrefix = 'drawer',
}: DrawerStackRouterOptions) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Memoized param key
  const paramKey = useMemo(() => `${paramPrefix}s`, [paramPrefix]);

  // Memoize valid drawer IDs set
  const validDrawerIds = useMemo(() => new Set(drawerIds), [drawerIds]);

  const baseSegments = useMemo(() => baseRoutePath.split('/').filter(Boolean), [baseRoutePath]);

  const buildPathname = useCallback(
    (stack: DrawerState[]) => {
      const segments: string[] = [...baseSegments];
      stack.forEach(({id}) => {
        const pathSegments = drawerPaths[id];
        if (pathSegments && pathSegments.length > 0) {
          segments.push(...pathSegments);
        }
      });

      if (segments.length === 0) {
        return '/';
      }

      return `/${segments.join('/')}`;
    },
    [baseSegments, drawerPaths],
  );

  const parseDrawersFromUrl = useCallback((): DrawerState[] => {
    const decodedData = urlCodec.decode(searchParams.get(paramKey) ?? '');
    const dataById = new Map(decodedData.map((entry) => [entry.id, entry.data]));

    const pathSegments = location.pathname.split('/').filter(Boolean);

    // Ensure base path matches
    for (let index = 0; index < baseSegments.length; index += 1) {
      if (pathSegments[index] !== baseSegments[index]) {
        return [];
      }
    }

    let cursor = baseSegments.length;
    const result: DrawerState[] = [];
    while (cursor < pathSegments.length) {
      const match = drawerIds.find((id) => {
        const pathSegmentsForDrawer = drawerPaths[id] ?? [];
        if (pathSegmentsForDrawer.length === 0) {
          return false;
        }
        if (cursor + pathSegmentsForDrawer.length > pathSegments.length) {
          return false;
        }
        for (let offset = 0; offset < pathSegmentsForDrawer.length; offset += 1) {
          if (pathSegments[cursor + offset] !== pathSegmentsForDrawer[offset]) {
            return false;
          }
        }
        return true;
      });

      if (!match) {
        break;
      }

      result.push({
        data: dataById.get(match),
        id: match,
      });
      cursor += (drawerPaths[match] ?? []).length;
    }

    return result.filter((entry) => validDrawerIds.has(entry.id));
  }, [baseSegments, drawerIds, drawerPaths, location.pathname, paramKey, searchParams, validDrawerIds]);

  // State derived from URL
  const [drawers, setDrawers] = useState<DrawerState[]>(() => parseDrawersFromUrl());

  // Compute open state from drawers
  const openState = useMemo(() => {
    const state: Record<string, boolean> = {};
    drawerIds.forEach((id) => {
      state[id] = drawers.some((d) => d.id === id);
    });
    return state;
  }, [drawers, drawerIds]);

  const applyNavigation = useCallback(
    (nextDrawers: DrawerState[], replaceNavigation = false) => {
      const encoded = nextDrawers.length > 0 ? urlCodec.encode(nextDrawers) : '';
      const newSearchParams = new URLSearchParams(searchParams);
      if (encoded) {
        newSearchParams.set(paramKey, encoded);
      } else {
        newSearchParams.delete(paramKey);
      }

      const pathname = buildPathname(nextDrawers);
      const searchString = newSearchParams.toString();
      const newSearch = searchString ? `?${searchString}` : '';

      if (location.pathname !== pathname || location.search !== newSearch) {
        navigate(
          {
            pathname,
            search: newSearch,
          },
          {replace: replaceNavigation},
        );
      }
    },
    [buildPathname, location.pathname, location.search, navigate, paramKey, searchParams],
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
          newDrawers = current.map((d, i) => (i === existingIndex ? {data, id: drawerId} : d));
        } else {
          newDrawers = [...current, {data, id: drawerId}];
        }
        applyNavigation(newDrawers, existingIndex !== -1);
        return newDrawers;
      });
    },
    [applyNavigation, validDrawerIds],
  );

  const replaceDrawer = useCallback(
    (drawerId: string, data?: DrawerData) => {
      if (!validDrawerIds.has(drawerId)) {
        console.error(`Invalid drawer ID: ${drawerId}`);
        return;
      }

      setDrawers((current) => {
        if (current.length === 0) {
          const next = [{data, id: drawerId}];
          applyNavigation(next, true);
          return next;
        }

        const updated = [...current];
        updated[updated.length - 1] = {data, id: drawerId};
        applyNavigation(updated, true);
        return updated;
      });
    },
    [applyNavigation, validDrawerIds],
  );

  const closeDrawer = useCallback(
    (drawerId: string) => {
      setDrawers((current) => {
        const drawerIndex = current.findIndex((d) => d.id === drawerId);
        if (drawerIndex === -1) return current;
        const remaining = current.slice(0, drawerIndex);
        applyNavigation(remaining, true);
        return remaining;
      });
    },
    [applyNavigation],
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
      applyNavigation([], true);
      if (onBaseRouteClose) {
        onBaseRouteClose();
      }

      return [];
    });
  }, [applyNavigation, onBaseRouteClose]);

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
        applyNavigation(updated, true);
        return updated;
      });
    },
    [applyNavigation],
  );

  const register = useCallback(
    (id: string) => {
      return {
        onClose: () => closeDrawer(id),
        opened: isOpen(id),
        stackId: id,
      };
    },
    [isOpen, closeDrawer],
  );

  const getDrawerData = useCallback(
    <T = DrawerData,>(drawerId: string): T | undefined => {
      const entry = drawers.find((drawer) => drawer.id === drawerId);
      return entry?.data as T | undefined;
    },
    [drawers],
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
      closeAllDrawers,
      closeDrawer,
      getDrawerData,
      isOpen,
      openDrawer,
      register,
      replaceDrawer,
      setDrawerData,
      toggle,
    }),
    [closeAllDrawers, closeDrawer, getDrawerData, isOpen, openDrawer, register, replaceDrawer, setDrawerData, toggle],
  );

  const Provider = useMemo(() => {
    const ProviderComponent = ({children}: {children: React.ReactNode}) => (
      <DrawerStackContext.Provider value={contextValue}>{children}</DrawerStackContext.Provider>
    );
    ProviderComponent.displayName = 'DrawerStackProvider';
    return ProviderComponent;
  }, [contextValue]);

  return useMemo(
    () => ({
      close: closeDrawer,
      closeAll: closeAllDrawers,
      getDrawerData,
      open: openDrawer,
      openDrawer,
      replace: replaceDrawer,
      replaceDrawer,
      Provider,
      setDrawerData,
      register,
      state: openState,
      toggle,
    }),
    [
      Provider,
      closeAllDrawers,
      closeDrawer,
      getDrawerData,
      openDrawer,
      replaceDrawer,
      setDrawerData,
      register,
      openState,
      toggle,
    ],
  );
}

export type DrawerStackRouter = ReturnType<typeof useDrawerStackRouter>;
