import {useDrawersStack} from '@mantine/core';
import React, {createContext, PropsWithChildren} from 'react';

export type DrawerStack<T extends string> = ReturnType<typeof useDrawersStack<T>>;

const drawerkeys = [
    'metrics-picker',
    'content-form',
    'session-form',
    'session-picker',
    'content-picker',
    'tags-picker',
    'create-program',
    'build-schedule',
    'create-schedule-entry',
    'assign-program',
] as const;

type DrawerKeys = (typeof drawerkeys)[number];

type StackContextValue = ReturnType<typeof useDrawersStack<DrawerKeys>>;

const StackContext = createContext<StackContextValue>(null as any);

export const DrawerStackProvider: React.FC<PropsWithChildren> = ({children}) => {
    const stack = useDrawersStack<DrawerKeys>([...drawerkeys]);

    return <StackContext.Provider value={stack}>{children}</StackContext.Provider>;
};

export function useDrawerStack(): StackContextValue {
    const context = React.useContext(StackContext);
    if (context === undefined) {
        throw new Error(`useDrawerStack must be used within a AppProvider`);
    }
    return context;
}
