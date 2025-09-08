import {AuthToken, WebSocketClient} from '@easy/websocket';
import React, {createContext, PropsWithChildren, useCallback, useMemo, useRef} from 'react';

interface AppContextValue {
    initSocket: (connectionUrl: string, token: AuthToken) => void;
    socket: WebSocketClient;
}

export const AppContext = createContext<AppContextValue>({
    initSocket: () => {},
    socket: null,
});

const socket = new WebSocketClient();

socket.addCloseListener((error) => {
    console.log('Websocket error', error);
});

export const AppProvider: React.FC<PropsWithChildren> = ({children}) => {
    const socketInitRef = useRef(false);

    const initSocket = useCallback((connectionUrl: string, token: AuthToken) => {
        if (!socketInitRef.current) {
            socketInitRef.current = true;
            socket.initialize(connectionUrl, token);
        }
    }, []);

    const value = useMemo(() => ({initSocket, socket}), [initSocket]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
    const context = React.useContext(AppContext);
    if (context === undefined) {
        throw new Error(`useApp must be used within a AppProvider`);
    }
    return context;
}
