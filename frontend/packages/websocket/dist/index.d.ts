export type WebSocketMessage<T = unknown> = {
    event: string;
    data: T;
};
export type MessageListener = (msg: WebSocketMessage) => void;
export type FirstConnectListener = () => void;
export type ReconnectListener = () => void;
export type MissedMessageListener = () => void;
export type ErrorListener = (event: Event) => void;
export type CloseListener = (connectFailCount: number) => void;
export type AuthToken = {
    token: string;
    user_type: string;
};
export interface SocketImpl {
    new (url: string | URL, protocols?: string | string[]): WebSocket;
}
export declare function setWebSocketImpl(impl: SocketImpl): void;
export declare class WebSocketClient {
    private conn;
    private connectionUrl;
    private token;
    private responseSequence;
    private connectFailCount;
    private responseCallbacks;
    private messageListeners;
    private firstConnectListeners;
    private reconnectListeners;
    private errorListeners;
    private closeListeners;
    constructor();
    initialize(connectionUrl?: string, token?: AuthToken): void;
    handleIncomingFrame(mess: {
        [k: string]: unknown;
    }): void;
    addMessageListener(listener: MessageListener): void;
    removeMessageListener(listener: MessageListener): void;
    addFirstConnectListener(listener: FirstConnectListener): void;
    removeFirstConnectListener(listener: FirstConnectListener): void;
    addReconnectListener(listener: ReconnectListener): void;
    removeReconnectListener(listener: ReconnectListener): void;
    addErrorListener(listener: ErrorListener): void;
    removeErrorListener(listener: ErrorListener): void;
    addCloseListener(listener: CloseListener): void;
    removeCloseListener(listener: CloseListener): void;
    close(): void;
    sendMessage(action: string, data: unknown, responseCallback?: ((msg: unknown) => void) | false): void;
    private shutdown_;
    private sendString_;
}
