/* eslint-disable @typescript-eslint/ban-types */
import {
    ComponentType,
    createContext,
    PropsWithChildren,
    ReactNode,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {useLocation, useNavigate, useSearchParams} from 'react-router';

export interface DrawerRouteProps<TContext = any, TData = any> {
    context: TContext;
    data: TData;
    router: DrawerRouterAPI<any, TContext>;
}

export type DrawerComponent<TContext = any, TData = any, TProps extends Record<string, any> = {}> = ComponentType<
    DrawerRouteProps<TContext, TData> & TProps
>;

export interface DrawerDefinition<TContext = any, TData = any, TProps extends Record<string, any> = {}> {
    // Validate if drawer can be opened
    canOpen?: (context: TContext) => boolean | {error: string};

    // Component to render
    component: DrawerComponent<TContext, TData, TProps>;

    // Keep mounted when closed (for form preservation)
    keepMounted?: boolean;

    // Parent drawer ID for multi-step flows
    parent?: string;

    // URL path segment (e.g., "select-type", "create")
    path: string;

    // Transform URL params to component props
    resolveProps?: (params: {
        context: TContext;
        data: TData;
        searchParams: URLSearchParams;
        pathname: string;
    }) => TProps;

    // Animation/transition config
    transition?: {
        duration?: number;
        type?: 'fade' | 'scale' | 'slide';
    };
}

export type DrawerRegistry<TContext = any> = Record<string, DrawerDefinition<TContext, any, any>>;

export function createDrawerRegistry<TContext, TRegistry extends Record<string, DrawerDefinition<TContext, any, any>>>(
    registry: TRegistry,
): TRegistry {
    // Validate registry
    const paths = new Set<string>();
    const parentRefs = new Set<string>();

    Object.entries(registry).forEach(([id, definition]) => {
        if (!definition.path || definition.path.includes('/')) {
            throw new Error(`Drawer "${id}" must have a non-empty path without slashes. Got: "${definition.path}"`);
        }

        if (paths.has(definition.path)) {
            throw new Error(`Duplicate path "${definition.path}" in drawer registry`);
        }

        paths.add(definition.path);

        if (definition.parent) {
            parentRefs.add(definition.parent);
        }
    });

    // Validate parent references
    parentRefs.forEach((parentId) => {
        if (!registry[parentId]) {
            throw new Error(`Parent drawer "${parentId}" not found in registry`);
        }
    });

    return registry;
}

interface DrawerStackEntry {
    data?: any;
    id: string;
}

class DrawerUrlCodec<TRegistry extends DrawerRegistry> {
    // eslint-disable-next-line no-useless-constructor
    constructor(
        private registry: TRegistry,
        private basePath: string,
    ) {}

    encode(stack: DrawerStackEntry[]): {pathname: string; search: string} {
        const segments = this.basePath.split('/').filter(Boolean);
        const searchParams = new URLSearchParams();

        stack.forEach(({id, data}, index) => {
            const definition = this.registry[id];
            if (!definition) return;

            // Add path segment
            segments.push('drawer', definition.path);

            // Encode data as search params with drawer index prefix
            if (data && Object.keys(data).length > 0) {
                searchParams.set(`d${index}`, JSON.stringify(data));
            }
        });

        return {
            pathname: '/' + segments.join('/'),
            search: searchParams.toString(),
        };
    }

    decode(location: {pathname: string; search: string}): DrawerStackEntry[] {
        const segments = location.pathname.split('/').filter(Boolean);
        const searchParams = new URLSearchParams(location.search);
        const baseSegments = this.basePath.split('/').filter(Boolean);

        // Check if we're on the base path
        if (!segments.slice(0, baseSegments.length).every((s, i) => s === baseSegments[i])) {
            return [];
        }

        const stack: DrawerStackEntry[] = [];
        let i = baseSegments.length;
        let drawerIndex = 0;

        while (i < segments.length - 1) {
            if (segments[i] === 'drawer') {
                const pathSegment = segments[i + 1];

                // Find drawer by path
                const [id] = Object.entries(this.registry).find(([, def]) => def.path === pathSegment) || [];

                if (id) {
                    // Decode data from search params
                    const dataParam = searchParams.get(`d${drawerIndex}`);
                    let data: any;

                    if (dataParam) {
                        try {
                            data = JSON.parse(dataParam);
                        } catch {
                            console.warn(`Failed to parse drawer data for index ${drawerIndex}`);
                        }
                    }

                    stack.push({id, data});
                    drawerIndex++;
                }

                i += 2;
            } else {
                break;
            }
        }

        return stack;
    }
}

interface DrawerRouterContextValue<TContext, TRegistry extends DrawerRegistry<TContext>> {
    basePath: string;
    codec: DrawerUrlCodec<TRegistry>;
    context: TContext;
    registry: TRegistry;
    setContext: (context: ((prev: TContext) => TContext) | TContext) => void;
    stack: DrawerStackEntry[];
}

const DrawerRouterContext = createContext<DrawerRouterContextValue<any, any> | null>(null);

export interface DrawerRouterAPI<TRegistry extends DrawerRegistry<any>, TContext> {
    // Close specific drawer (and all children)
    close(id: keyof TRegistry): void;

    // Close all drawers
    closeAll(): void;

    // Get/set context
    context: TContext;

    // Get drawer data
    getData<K extends keyof TRegistry>(
        id: K,
    ): TRegistry[K] extends DrawerDefinition<any, infer D> ? D | undefined : never;

    // Check if drawer is open
    isOpen(id: keyof TRegistry): boolean;

    // Open a drawer
    open<K extends keyof TRegistry>(
        id: K,
        data?: TRegistry[K] extends DrawerDefinition<any, infer D> ? D : never,
    ): void;

    // Replace current drawer
    replace<K extends keyof TRegistry>(
        id: K,
        data?: TRegistry[K] extends DrawerDefinition<any, infer D> ? D : never,
    ): void;

    setContext: (context: ((prev: TContext) => TContext) | TContext) => void;
    // Update drawer data without navigation
    setData<K extends keyof TRegistry>(
        id: K,
        data: TRegistry[K] extends DrawerDefinition<any, infer D> ? D : never,
    ): void;

    // Get current stack
    stack: ReadonlyArray<{id: string; data?: any}>;
}

export interface DrawerRouterProviderProps<TContext, TRegistry extends DrawerRegistry<TContext>>
    extends PropsWithChildren {
    basePath: string;
    initialContext?: TContext;
    onContextChange?: (context: TContext) => void;
    registry: TRegistry;
}

export function DrawerRouterProvider<
    // eslint-disable-next-line @typescript-eslint/ban-types
    TContext extends Record<string, any> = {},
    TRegistry extends DrawerRegistry<TContext> = DrawerRegistry<TContext>,
>({children, registry, basePath, initialContext, onContextChange}: DrawerRouterProviderProps<TContext, TRegistry>) {
    const location = useLocation();
    const codec = useMemo(() => new DrawerUrlCodec(registry, basePath), [registry, basePath]);

    // Context state
    const [context, setContextState] = useState<TContext>(initialContext || ({} as TContext));

    // Notify context changes
    const contextRef = useRef(context);
    useEffect(() => {
        if (contextRef.current !== context && onContextChange) {
            onContextChange(context);
            contextRef.current = context;
        }
    }, [context, onContextChange]);

    // Decode current stack from URL
    const stack = useMemo(() => codec.decode(location), [codec, location.pathname, location.search]);

    // Context value
    const contextValue = useMemo<DrawerRouterContextValue<TContext, TRegistry>>(
        () => ({
            registry,
            context,
            setContext: setContextState,
            stack,
            codec,
            basePath,
        }),
        [registry, context, stack, codec, basePath],
    );

    return <DrawerRouterContext.Provider value={contextValue}>{children}</DrawerRouterContext.Provider>;
}

export function useDrawerRouter<TContext, TRegistry extends DrawerRegistry<TContext>>(): DrawerRouterAPI<
    TRegistry,
    TContext
> {
    const ctx = useContext(DrawerRouterContext) as DrawerRouterContextValue<TContext, TRegistry> | null;

    if (!ctx) {
        throw new Error('useDrawerRouter must be used within DrawerRouterProvider');
    }

    const {registry, context, setContext, stack, codec, basePath} = ctx;
    const navigate = useNavigate();

    const api = useMemo<DrawerRouterAPI<TRegistry, TContext>>(() => {
        const navigateToStack = (newStack: DrawerStackEntry[], options?: {replace?: boolean}) => {
            const {pathname, search} = codec.encode(newStack);
            navigate({pathname, search}, {replace: options?.replace ?? false});
        };

        return {
            open(id, data) {
                const drawerId = String(id);
                const definition = registry[drawerId];

                if (!definition) {
                    console.error(`Drawer "${drawerId}" not found in registry`);
                    return;
                }

                // Check if can open
                if (definition.canOpen) {
                    const result = definition.canOpen(context);
                    if (result === false || (typeof result === 'object' && result.error)) {
                        console.error(
                            `Cannot open drawer "${drawerId}": ${
                                typeof result === 'object' ? result.error : 'Permission denied'
                            }`,
                        );
                        return;
                    }
                }

                // Check if already open
                const existingIndex = stack.findIndex((entry) => entry.id === drawerId);

                if (existingIndex >= 0) {
                    // Update existing drawer
                    const newStack = [...stack];
                    newStack[existingIndex] = {id: drawerId, data};
                    navigateToStack(newStack, {replace: true});
                } else {
                    // Add to stack
                    navigateToStack([...stack, {id: drawerId, data}]);
                }
            },

            replace(id, data) {
                const drawerId = String(id);
                const definition = registry[drawerId];

                if (!definition) {
                    console.error(`Drawer "${drawerId}" not found in registry`);
                    return;
                }

                if (stack.length === 0) {
                    // No drawer to replace, just open
                    this.open(id, data);
                    return;
                }

                const newStack = [...stack];
                newStack[newStack.length - 1] = {id: drawerId, data};
                navigateToStack(newStack, {replace: true});
            },

            close(id) {
                const drawerId = String(id);
                const index = stack.findIndex((entry) => entry.id === drawerId);

                if (index >= 0) {
                    // Close this drawer and all children
                    navigateToStack(stack.slice(0, index), {replace: true});
                }
            },

            closeAll() {
                navigate(basePath, {replace: true});
            },

            isOpen(id) {
                return stack.some((entry) => entry.id === String(id));
            },

            getData(id) {
                const entry = stack.find((e) => e.id === String(id));
                return entry?.data;
            },

            setData(id, data) {
                const drawerId = String(id);
                const index = stack.findIndex((entry) => entry.id === drawerId);

                if (index >= 0) {
                    const newStack = [...stack];
                    newStack[index] = {...newStack[index], data};
                    navigateToStack(newStack, {replace: true});
                }
            },

            context,
            setContext,
            stack,
        };
    }, [registry, context, setContext, stack, codec, basePath, navigate]);

    return api;
}

export function DrawerOutlet<TContext, TRegistry extends DrawerRegistry<TContext>>(): ReactNode {
    const ctx = useContext(DrawerRouterContext) as DrawerRouterContextValue<TContext, TRegistry> | null;

    if (!ctx) {
        throw new Error('DrawerOutlet must be used within DrawerRouterProvider');
    }

    const {registry, context, stack} = ctx;
    const router = useDrawerRouter<TContext, TRegistry>();
    const [searchParams] = useSearchParams();
    const location = useLocation();

    // Track mounted drawers for keepMounted support
    const mountedRef = useRef<Set<string>>(new Set());

    // Update mounted set
    useEffect(() => {
        stack.forEach(({id}) => {
            mountedRef.current.add(id);
        });
    }, [stack]);

    // Render drawers
    const drawers = useMemo(() => {
        const openIds = new Set(stack.map((e) => e.id));
        const toRender: string[] = [];

        // Add currently open drawers
        stack.forEach(({id}) => toRender.push(id));

        // Add keepMounted drawers that were previously mounted
        Object.entries(registry).forEach(([id, definition]) => {
            if (definition.keepMounted && mountedRef.current.has(id) && !openIds.has(id)) {
                toRender.push(id);
            }
        });

        return toRender.map((id) => {
            const definition = registry[id];
            if (!definition) return null;

            const entry = stack.find((e) => e.id === id);
            const data = entry?.data;
            const isOpen = openIds.has(id);

            // Resolve props
            const resolvedProps = definition.resolveProps
                ? definition.resolveProps({
                      context,
                      data,
                      searchParams,
                      pathname: location.pathname,
                  })
                : {};

            const Component = definition.component;

            return (
                <div
                    data-drawer-id={id}
                    data-drawer-open={isOpen}
                    key={id}
                    style={{
                        display: isOpen ? 'block' : 'none',
                    }}
                >
                    <Component
                        context={context}
                        data={data}
                        router={router}
                        {...resolvedProps}
                    />
                </div>
            );
        });
    }, [registry, context, stack, router, searchParams, location.pathname]);

    return <>{drawers}</>;
}

export function createDrawerRoutes<TContext, TRegistry extends DrawerRegistry<TContext>>(
    registry: TRegistry,
    basePath: string,
) {
    // Generate React Router route configuration
    const routes = Object.entries(registry).map(([id, definition]) => {
        const segments = [basePath, 'drawer', definition.path].join('/').replace(/\/+/g, '/');

        return {
            path: segments,
            element: <DrawerOutlet />,
            id: `drawer-${id}`,
        };
    });

    return routes;
}

export function useDrawerContext<TContext>(): TContext {
    const ctx = useContext(DrawerRouterContext) as DrawerRouterContextValue<TContext, any> | null;

    if (!ctx) {
        throw new Error('useDrawerContext must be used within DrawerRouterProvider');
    }

    return ctx.context;
}

export function useDrawerData<TData = any>(drawerId: string): TData | undefined {
    const router = useDrawerRouter();
    return router.getData(drawerId) as TData | undefined;
}

export const DrawerTransition = {
    slide: {
        entering: {transform: 'translateX(100%)'},
        entered: {transform: 'translateX(0%)'},
        exiting: {transform: 'translateX(100%)'},
        exited: {transform: 'translateX(100%)'},
    },
    fade: {
        entering: {opacity: 0},
        entered: {opacity: 1},
        exiting: {opacity: 0},
        exited: {opacity: 0},
    },
    scale: {
        entering: {transform: 'scale(0.95)', opacity: 0},
        entered: {transform: 'scale(1)', opacity: 1},
        exiting: {transform: 'scale(0.95)', opacity: 0},
        exited: {transform: 'scale(0.95)', opacity: 0},
    },
};
